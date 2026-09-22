# Parkinson's Disease Voice Screening & Clinical Decision Support Platform

The Parkinson's Disease Voice Screening & Clinical Decision Support Platform is a local-first, privacy-preserving research application designed to evaluate acoustic vocal biomarkers for early screening indicators of Parkinson's Disease. Leveraging a hybrid deep learning architecture—combining frozen WavLM-Base-Plus speech representations with a lightweight ConvNeXt V2 Atto convolutional adapter and a Transformer Encoder with attention-rollout explainability—alongside local Retrieval-Augmented Generation (ChromaDB + BAAI/bge-small-en-v1.5) and local LLM report synthesis (Qwen2.5-3B-Instruct via Ollama), the platform delivers interpretable screening metrics and grounded clinical summaries without transmitting patient data to external cloud services. **This is a research screening tool, not a diagnostic device.**

## Project Structure

```
parkinsons-voice-platform/
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
├── config/
├── data/
│   ├── processed/
│   └── raw/
├── docs/
│   └── DECISIONS.md
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   └── tests/
├── ml/
│   ├── explainability/
│   ├── model_def/
│   └── preprocessing/
├── models/
│   └── artifact/
├── rag/
│   ├── ingestion/
│   └── knowledge_base/
├── scripts/
│   ├── setup_env.ps1
│   └── setup_env.sh
└── training/
    └── notebooks/
```

## Architecture & Design Decisions

All technology selections, model design choices, and tooling justifications are documented in [docs/DECISIONS.md](file:///Users/eshwarsaielugam/Documents/prototype/docs/DECISIONS.md), which serves as the single source of truth for the platform.

## Getting Started

### Environment Setup

Set up the Python virtual environment (.venv) using the appropriate script:

- **macOS / Linux:**
  ```bash
  ./scripts/setup_env.sh
  ```
- **Windows (PowerShell):**
  ```powershell
  .\scripts\setup_env.ps1
  ```

Copy the example environment configuration:
```bash
cp .env.example .env
```
