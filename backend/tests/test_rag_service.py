"""Unit and integration tests for RAGService, ingestion pipeline, and knowledge base retrieval."""

from pathlib import Path
import pytest

from backend.app.config import get_settings
from backend.app.services.rag import (
    COLLECTION_NAME,
    RAGService,
    RetrievedChunk,
    get_rag_service,
)
from rag.ingestion.ingest import ingest_knowledge_base


@pytest.fixture(scope="session")
def populated_rag_service():
    """Shared RAGService fixture backed by the ingested ChromaDB knowledge base."""
    # Ensure knowledge base is ingested
    ingest_knowledge_base()
    service = RAGService()
    return service


def test_rag_service_initialization(populated_rag_service):
    """Verify RAGService loads the persistent collection and sentence-transformers embedder."""
    assert populated_rag_service.collection is not None
    assert populated_rag_service.collection.count() == 21
    assert populated_rag_service.embedder is not None
    assert populated_rag_service.collection_name == COLLECTION_NAME


def test_rag_retrieve_pitch_voice_changes(populated_rag_service):
    """Verify semantic retrieval returns relevant chunks for voice pitch and loudness changes."""
    query = "voice changes in Parkinson's pitch"
    results = populated_rag_service.retrieve(query=query, top_k=4)

    assert len(results) == 4
    for chunk in results:
        assert isinstance(chunk, RetrievedChunk)
        assert len(chunk.text.strip()) > 0
        assert len(chunk.source_name.strip()) > 0
        assert 0.0 <= chunk.similarity_score <= 1.0

    # Top hit should have high cosine similarity (> 0.75) for this domain-aligned query
    top_hit = results[0]
    assert top_hit.similarity_score >= 0.75
    # The top chunks should mention hypophonia, pitch, or speech manifestations
    combined_texts = " ".join([c.text.lower() for c in results])
    assert any(term in combined_texts for term in ["pitch", "hypophonia", "voice", "speech"])


def test_rag_retrieve_screening_limitations(populated_rag_service):
    """Verify semantic retrieval accurately retrieves technical limitations when queried."""
    query = "What are the limitations of AI voice screening and false positives?"
    results = populated_rag_service.retrieve(query=query, top_k=3)

    assert len(results) == 3
    combined_texts = " ".join([c.text.lower() for c in results])
    assert any(term in combined_texts for term in ["limitation", "diagnostic", "false positive", "confounding"])


def test_rag_retrieve_empty_query(populated_rag_service):
    """Verify empty or whitespace queries cleanly return an empty list without error."""
    assert populated_rag_service.retrieve("") == []
    assert populated_rag_service.retrieve("   ") == []


def test_rag_retrieve_custom_top_k(populated_rag_service):
    """Verify top_k parameter bounds the number of returned chunks."""
    results_2 = populated_rag_service.retrieve("neurological clinical evaluation", top_k=2)
    assert len(results_2) == 2

    results_1 = populated_rag_service.retrieve("neurological clinical evaluation", top_k=1)
    assert len(results_1) == 1


def test_ingest_idempotency():
    """Verify re-running ingestion does not duplicate chunks in ChromaDB."""
    count_first = ingest_knowledge_base()
    count_second = ingest_knowledge_base()

    assert count_first == 21
    assert count_second == 21


def test_empty_collection_raises_error(tmp_path):
    """Verify RAGService fails loudly when initialized against a non-existent or empty collection."""
    class MockSettings:
        chroma_persist_dir = str(tmp_path / "empty_chroma")

    with pytest.raises(RuntimeError) as exc_info:
        RAGService(settings=MockSettings(), collection_name="missing_col")
    assert "not found" in str(exc_info.value).lower() or "empty" in str(exc_info.value).lower()


def test_get_rag_service_dependency():
    """Verify FastAPI dependency retrieves RAGService from app.state."""
    class DummyApp:
        class State:
            rag_service = "mock_rag_instance"
        state = State()

    class DummyRequest:
        app = DummyApp()

    res = get_rag_service(DummyRequest())
    assert res == "mock_rag_instance"

    # Verify exception when uninitialized
    DummyRequest.app.state.rag_service = None
    with pytest.raises(RuntimeError) as exc_info:
        get_rag_service(DummyRequest())
    assert "RAGService is not initialized" in str(exc_info.value)
