"""Knowledge base ingestion and indexing pipeline for Parkinson's Voice Platform.

This is a standalone, on-demand ingestion script (executed manually or via CI/CD,
NEVER on routine server startup) that:
1. Parses markdown documents in rag/knowledge_base/*.md (excluding README.md).
2. Extracts YAML frontmatter (title, source_name, source_url, topic_tags).
3. Chunks document bodies using a sentence-boundary-aware splitter (~160 words / ~220 tokens
   with ~15-20% overlap), preserving semantic coherence across paragraphs.
4. Generates dense vector embeddings using BAAI/bge-small-en-v1.5 via sentence-transformers.
5. Upserts chunks idempotently into a persistent ChromaDB collection ('pd_knowledge_base')
   configured with cosine similarity space at Settings.CHROMA_PERSIST_DIR.
"""

from pathlib import Path
import hashlib
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import chromadb
from sentence_transformers import SentenceTransformer
import yaml

from backend.app.config import Settings, get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("parkinsons_platform.rag.ingestion")

COLLECTION_NAME = "pd_knowledge_base"
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences while respecting markdown paragraphs and punctuation boundaries.

    Implementation rationale:
    Instead of relying on heavy third-party text splitters (like langchain), this custom
    lightweight sentence splitter segments on standard sentence terminals (. ! ?) followed
    by whitespace while preserving markdown lists and paragraph integrity.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    sentences: List[str] = []

    for para in paragraphs:
        # Regex split on sentence endings followed by space or newline
        raw_sents = re.split(r"(?<=[.!?])\s+", para)
        for s in raw_sents:
            s_clean = s.strip()
            if s_clean:
                sentences.append(s_clean)

    return sentences


def chunk_text_sentence_aware(
    text: str,
    target_words: int = 160,
    overlap_words: int = 25,
) -> List[str]:
    """Chunk text into cohesive passages with sentence-level boundaries and semantic overlap.

    Args:
        text: Raw markdown body text to segment.
        target_words: Target maximum word count per chunk (~160 words ≈ ~220-250 tokens).
        overlap_words: Target word overlap from previous chunk (~15-20%).

    Returns:
        List of chunk strings.
    """
    sentences = split_into_sentences(text)
    if not sentences:
        return []

    chunks: List[str] = []
    curr_chunk: List[str] = []
    curr_words = 0

    for sent in sentences:
        sent_words = len(sent.split())

        # If adding this sentence exceeds target size and current chunk is non-empty
        if curr_words + sent_words > target_words and curr_chunk:
            chunks.append(" ".join(curr_chunk))

            # Build overlap from the end of curr_chunk
            overlap: List[str] = []
            overlap_cnt = 0
            for s in reversed(curr_chunk):
                s_len = len(s.split())
                if overlap_cnt + s_len <= overlap_words or not overlap:
                    overlap.insert(0, s)
                    overlap_cnt += s_len
                else:
                    break

            curr_chunk = list(overlap)
            curr_words = overlap_cnt

        curr_chunk.append(sent)
        curr_words += sent_words

    if curr_chunk:
        chunks.append(" ".join(curr_chunk))

    return chunks


def parse_markdown_document(file_path: Path) -> Tuple[Dict[str, Any], str]:
    """Parse YAML frontmatter and markdown body from document.

    Args:
        file_path: Absolute or relative Path to markdown file.

    Returns:
        Tuple of (metadata_dict, body_text).
    """
    content = file_path.read_text(encoding="utf-8")
    if not content.startswith("---"):
        raise ValueError(f"Document {file_path.name} does not start with YAML frontmatter delimiter '---'")

    parts = content.split("---", 2)
    if len(parts) < 3:
        raise ValueError(f"Document {file_path.name} does not contain valid YAML frontmatter delimiters.")

    raw_yaml = parts[1]
    body = parts[2].strip()

    metadata = yaml.safe_load(raw_yaml) or {}
    return metadata, body


def ingest_knowledge_base(
    kb_dir: Optional[Path] = None,
    settings: Optional[Settings] = None,
    collection_name: str = COLLECTION_NAME,
    embedding_model_name: str = DEFAULT_EMBEDDING_MODEL,
) -> int:
    """Read knowledge base documents, chunk, embed, and upsert into ChromaDB.

    This function is strictly idempotent: re-running it with unchanged documents
    will upsert identical chunk IDs and leave collection count unchanged.

    Args:
        kb_dir: Directory containing knowledge base markdown files. Defaults to rag/knowledge_base.
        settings: Application settings singleton.
        collection_name: ChromaDB collection identifier.
        embedding_model_name: Hugging Face model identifier for embeddings.

    Returns:
        Total number of chunks indexed in the collection.
    """
    settings = settings or get_settings()
    persist_dir = Path(settings.chroma_persist_dir).resolve()
    persist_dir.mkdir(parents=True, exist_ok=True)

    if kb_dir is None:
        kb_dir = Path(__file__).resolve().parent.parent / "knowledge_base"

    logger.info("Scanning knowledge base directory: %s", kb_dir)
    md_files = sorted(
        [f for f in kb_dir.glob("*.md") if f.name.lower() != "readme.md"]
    )

    if not md_files:
        raise FileNotFoundError(f"No knowledge base markdown files found in {kb_dir}")

    logger.info("Found %d markdown documents to process.", len(md_files))

    # 1. Initialize ChromaDB client and collection with cosine space
    logger.info("Connecting to persistent ChromaDB at: %s", persist_dir)
    chroma_client = chromadb.PersistentClient(path=str(persist_dir))
    collection = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # 2. Initialize embedding model
    logger.info("Loading sentence-transformers embedding model: %s...", embedding_model_name)
    embedder = SentenceTransformer(embedding_model_name)

    all_chunk_ids: List[str] = []
    all_chunk_texts: List[str] = []
    all_chunk_metadatas: List[Dict[str, Any]] = []

    # 3. Process each document
    for file_path in md_files:
        meta, body = parse_markdown_document(file_path)
        stem = file_path.stem
        title = meta.get("title", stem.replace("_", " ").title())
        source_name = meta.get("source_name", "Authoritative Medical Reference")
        source_url = meta.get("source_url") or ""
        topic_tags = meta.get("topic_tags", [])
        tags_str = ", ".join(topic_tags) if isinstance(topic_tags, list) else str(topic_tags)

        chunks = chunk_text_sentence_aware(body)
        logger.info(
            "Document '%s': %d words -> %d chunks",
            file_path.name,
            len(body.split()),
            len(chunks),
        )

        for idx, chunk_text in enumerate(chunks):
            # Deterministic ID based on filename stem and chunk index for idempotency
            chunk_id = f"{stem}_chunk_{idx:02d}"

            chunk_meta = {
                "title": str(title),
                "source_name": str(source_name),
                "source_url": str(source_url),
                "chunk_index": int(idx),
                "total_chunks": int(len(chunks)),
                "doc_name": str(file_path.name),
                "topic_tags": str(tags_str),
            }

            all_chunk_ids.append(chunk_id)
            all_chunk_texts.append(chunk_text)
            all_chunk_metadatas.append(chunk_meta)

    logger.info(
        "Total chunks to index: %d. Computing embeddings with %s...",
        len(all_chunk_texts),
        embedding_model_name,
    )

    # 4. Generate normalized dense embeddings
    embeddings = embedder.encode(
        all_chunk_texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    # 5. Upsert into ChromaDB
    logger.info("Upserting %d chunks into Chroma collection '%s'...", len(all_chunk_ids), collection_name)
    collection.upsert(
        ids=all_chunk_ids,
        documents=all_chunk_texts,
        embeddings=embeddings.tolist(),
        metadatas=all_chunk_metadatas,
    )

    total_count = collection.count()
    logger.info(
        "Ingestion completed successfully! Total indexed chunks in '%s': %d",
        collection_name,
        total_count,
    )
    return total_count


if __name__ == "__main__":
    count = ingest_knowledge_base()
    print(f"\n✓ Knowledge base ingestion complete. Total indexed chunks: {count}")
