# Technology Architecture Decisions

This document serves as the authoritative single source of truth for architectural and technology choices across the Parkinson's Disease Voice Screening & Clinical Decision Support Platform (`parkinsons-voice-platform`). All subsequent implementation phases and prompts must adhere strictly to these decisions.

| Component | Technology Decision | Justification |
| :--- | :--- | :--- |
| **Dataset** | Open-access Parkinson's voice datasets (PC-GITA / Italian PITA sustained vowels) | Provides standardized, peer-reviewed acoustic recordings of sustained phonations and speech tasks from Parkinson's patients and healthy controls under open academic licensing. |
| **Speech Model** | WavLM-Base-Plus (frozen) | Delivers robust upstream self-supervised acoustic representations pre-trained with masked speech denoising while keeping local inference latency low by remaining frozen. |
| **ConvNeXt V2** | ConvNeXt V2 Atto (trained from scratch) | Serves as an ultra-compact convolutional adapter with Global Response Normalization (GRN) to map frame embeddings into localized feature maps with minimal parameter overhead. |
| **Transformer** | Transformer Encoder | Captures long-range temporal dynamics and vocal degradation patterns across acoustic frames via multi-head self-attention. |
| **Explainability Method** | Attention Rollout | Quantifies and visualizes frame-level salience across Transformer layers to provide intuitive, clinically interpretable temporal attribution without gradient computation. |
| **Embedding Model** | BAAI/bge-small-en-v1.5 | Delivers state-of-the-art semantic retrieval performance within a compact 384-dimensional footprint that runs efficiently on local CPU hardware. |
| **Vector DB** | ChromaDB | Operates in-process with local disk persistence, eliminating external database infrastructure while keeping sensitive health queries private and local. |
| **LLM** | Qwen2.5-3B-Instruct (via Ollama) | Runs entirely on-device with low VRAM/RAM overhead while producing structured, clinically grounded natural language summaries and decision support recommendations. |
| **Backend** | FastAPI (Python) | Provides high-performance asynchronous REST endpoints, automatic OpenAPI documentation, and seamless native execution alongside PyTorch and Python data science packages. |
| **Frontend** | React + Vite + TypeScript + Tailwind CSS | Offers a modern, type-safe, and responsive clinical interface with real-time audio capture and interactive spectrogram/explainability visualizations. |
| **Database** | SQLite | Provides a lightweight, zero-configuration local relational database for session metadata, screening records, and audit history. |
