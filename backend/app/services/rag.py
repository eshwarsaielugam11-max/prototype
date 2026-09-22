"""Retrieval-Augmented Generation (RAG) Service for Parkinson's Voice Platform.

Singleton retrieval service connecting to the persistent local ChromaDB knowledge base
embedded with BAAI/bge-small-en-v1.5. Provides grounded educational evidence chunks
for LLM clinical decision support and patient reporting.

MEDICAL SAFETY NOTICE:
Retrieved knowledge base content is strictly educational and non-diagnostic.
This service never generates or asserts diagnostic conclusions.
"""

from pathlib import Path
import logging
from typing import Any, List, Optional

import chromadb
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from backend.app.config import Settings, get_settings

logger = logging.getLogger("parkinsons_platform.rag")

COLLECTION_NAME = "pd_knowledge_base"
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"


class RetrievedChunk(BaseModel):
    """Structured educational knowledge base passage returned by RAG retrieval."""

    text: str = Field(
        ...,
        description="Text content of the retrieved knowledge base passage",
    )
    source_name: str = Field(
        ...,
        description="Authoritative source organization or publication",
    )
    source_url: Optional[str] = Field(
        default=None,
        description="Verifiable reference URL if available, otherwise None",
    )
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score between query and retrieved chunk [0.0, 1.0]",
    )


class RAGService:
    """Singleton RAG retrieval engine querying the persistent ChromaDB collection."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        collection_name: str = COLLECTION_NAME,
        embedding_model_name: str = DEFAULT_EMBEDDING_MODEL,
    ):
        """Initialize ChromaDB client, verify collection population, and load embedding model.

        Args:
            settings: Application settings singleton.
            collection_name: Target Chroma collection name.
            embedding_model_name: Sentence-transformers embedding model identifier.

        Raises:
            RuntimeError: If collection is missing or empty, instructing operator to run ingest.py.
        """
        self.settings = settings or get_settings()
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model_name

        persist_dir = self.settings.chroma_persist_dir
        resolved_path = Path(persist_dir).resolve()
        logger.info("Initializing RAGService with ChromaDB at: %s", resolved_path)

        if not resolved_path.exists():
            raise RuntimeError(
                f"ChromaDB persist directory not found at {resolved_path}. "
                "Please run 'python -m rag.ingestion.ingest' to populate the knowledge base index."
            )

        self.client = chromadb.PersistentClient(path=str(resolved_path))

        try:
            self.collection = self.client.get_collection(name=self.collection_name)
        except Exception as exc:
            raise RuntimeError(
                f"Chroma collection '{self.collection_name}' not found at {resolved_path}. "
                "Please run 'python -m rag.ingestion.ingest' to index the knowledge base."
            ) from exc

        count = self.collection.count()
        if count == 0:
            raise RuntimeError(
                f"Chroma collection '{self.collection_name}' at {resolved_path} is empty (0 chunks). "
                "Please run 'python -m rag.ingestion.ingest' to index the knowledge base."
            )

        logger.info(
            "Found %d indexed chunks in collection '%s'. Loading embedder %s...",
            count,
            self.collection_name,
            self.embedding_model_name,
        )
        self.embedder = SentenceTransformer(self.embedding_model_name)
        logger.info("RAGService successfully initialized.")

    def retrieve(self, query: str, top_k: int = 4) -> List[RetrievedChunk]:
        """Retrieve top_k most semantically relevant knowledge base passages for a query.

        Args:
            query: Natural language search string or clinical topic description.
            top_k: Maximum number of relevant chunks to return (default: 4).

        Returns:
            List of RetrievedChunk instances ordered by descending similarity score.
        """
        cleaned_query = query.strip() if query else ""
        if not cleaned_query:
            logger.debug("Empty query passed to RAGService.retrieve; returning empty list.")
            return []

        total_available = self.collection.count()
        if total_available == 0:
            raise RuntimeError(
                f"Chroma collection '{self.collection_name}' is empty. "
                "Please run 'python -m rag.ingestion.ingest' to index the knowledge base."
            )

        n_results = min(max(1, top_k), total_available)

        # Generate dense query embedding with unit-norm normalization
        query_embedding = self.embedder.encode(
            [cleaned_query],
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

        # Query persistent Chroma index
        raw_results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        retrieved_chunks: List[RetrievedChunk] = []

        docs_list = raw_results.get("documents", [[]])[0]
        meta_list = raw_results.get("metadatas", [[]])[0]
        dist_list = raw_results.get("distances", [[]])[0]

        for text, meta, dist in zip(docs_list, meta_list, dist_list):
            # In Chroma with cosine space, distance is cosine distance in [0, 2]
            # Cosine similarity = 1.0 - distance
            cos_sim = max(0.0, min(1.0, 1.0 - float(dist)))

            raw_url = meta.get("source_url")
            source_url = str(raw_url).strip() if raw_url and str(raw_url).strip() else None

            chunk = RetrievedChunk(
                text=str(text),
                source_name=str(meta.get("source_name", "Authoritative Reference")),
                source_url=source_url,
                similarity_score=round(cos_sim, 4),
            )
            retrieved_chunks.append(chunk)

        logger.debug(
            "Query '%s' retrieved %d chunks (top score: %.4f)",
            cleaned_query[:40],
            len(retrieved_chunks),
            retrieved_chunks[0].similarity_score if retrieved_chunks else 0.0,
        )
        return retrieved_chunks


def get_rag_service(request: Any) -> RAGService:
    """FastAPI dependency yielding the application-level RAGService singleton."""
    service = getattr(request.app.state, "rag_service", None)
    if service is None:
        raise RuntimeError(
            "RAGService is not initialized on app.state. "
            "Ensure the FastAPI lifespan startup event executed successfully and ChromaDB is populated."
        )
    return service
