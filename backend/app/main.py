"""FastAPI Application Main Entrypoint.

Configures CORS middleware, structured logging, request correlation IDs,
app-level exception shields, database auto-initialization, and wires the /api/v1 router tree.
"""

from contextlib import asynccontextmanager
import logging
import time
import uuid
from typing import Callable

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.health import router as health_router
from backend.app.config import Settings, get_settings
from backend.app.db.init_db import init_db
from backend.app.services.inference import InferenceService
from backend.app.services.llm import LLMService
from backend.app.services.rag import RAGService


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured logging format for standard streams."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    log_format = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    date_format = "%Y-%m-%dT%H:%M:%S"

    logging.basicConfig(
        level=numeric_level,
        format=log_format,
        datefmt=date_format,
        force=True,
    )


logger = logging.getLogger("parkinsons_platform.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan managing startup and shutdown hooks."""
    # Startup: Auto-create database tables
    logger.info("Running application startup lifecycle...")
    try:
        init_db()
    except Exception as e:
        logger.error("Failed to initialize database on startup: %s", e, exc_info=True)
        raise

    # Initialize InferenceService singleton
    try:
        logger.info("Initializing acoustic ML InferenceService...")
        app.state.inference_service = InferenceService()
        logger.info("Acoustic ML InferenceService successfully initialized and mounted on app.state.")
    except Exception as e:
        logger.warning(
            "InferenceService initialization skipped or failed during startup: %s. "
            "Inference endpoints will require models/artifact/ to be available.",
            e,
        )
        app.state.inference_service = None

    # Initialize RAGService singleton
    try:
        logger.info("Initializing RAG retrieval service...")
        app.state.rag_service = RAGService()
        logger.info("RAG retrieval service successfully initialized and mounted on app.state.")
    except Exception as e:
        logger.warning(
            "RAGService initialization skipped or failed during startup: %s. "
            "RAG retrieval endpoints will require knowledge base ingestion ('python -m rag.ingestion.ingest').",
            e,
        )
        app.state.rag_service = None

    # Initialize LLMService and perform non-fatal availability check
    try:
        logger.info("Checking local Ollama LLM availability...")
        llm_service = LLMService()
        is_available, status_msg = llm_service.check_availability()
        app.state.llm_service = llm_service
        app.state.llm_available = is_available
        if is_available:
            logger.info("Ollama LLM is operational: %s", status_msg)
        else:
            logger.warning(
                "Ollama LLM is currently unavailable: %s. "
                "Clinical report synthesis endpoints will degrade gracefully with an advisory notice.",
                status_msg,
            )
    except Exception as e:
        logger.warning(
            "Unexpected error while verifying Ollama LLM availability: %s. Setting app.state.llm_available = False.",
            e,
        )
        app.state.llm_service = None
        app.state.llm_available = False

    yield

    # Shutdown
    logger.info("Running application shutdown lifecycle...")


def create_app() -> FastAPI:
    """Construct and configure FastAPI application instance."""
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(
        title="Parkinson's Disease Voice Screening Platform API",
        description=(
            "Clinical Decision Support & Acoustic Screening Platform backend service. "
            "RESEARCH / SCREENING TOOL — NOT A DIAGNOSTIC DEVICE."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. Request ID and Request Logging Middleware with Exception Shield
    @app.middleware("http")
    async def request_correlation_middleware(request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(
                "Unhandled server error on %s %s (%.2f ms) [req_id=%s]: %s",
                request.method,
                request.url.path,
                duration_ms,
                request_id,
                str(exc),
                exc_info=True,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred. Please contact support or check server logs.",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %d (%.2f ms) [req_id=%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response

    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # 3. App-level Unhandled Exception Shield (for route handler exceptions)
    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(
            "Unhandled exception handler caught error on %s %s [req_id=%s]: %s",
            request.method,
            request.url.path,
            request_id,
            str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred. Please contact support or check server logs.",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )

    # 4. App-level HTTPException Handler
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "Request Error",
                "detail": exc.detail,
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )

    # 5. Wire Routers
    api_v1_prefix = "/api/v1"
    app.include_router(health_router, prefix=api_v1_prefix)

    # 6. Root Index Endpoint
    @app.get("/", tags=["Root"])
    def root_index():
        return {
            "name": "Parkinson's Disease Voice Screening Platform API",
            "version": "1.0.0",
            "disclaimer": "Research and clinical screening tool only. Not a diagnostic device.",
            "docs": "/docs",
            "health": f"{api_v1_prefix}/health",
        }

    return app


app = create_app()
