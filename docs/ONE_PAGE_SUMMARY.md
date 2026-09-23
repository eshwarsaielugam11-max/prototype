# Parkinson's Disease Voice Screening Platform
## Executive One-Page Technical Summary

### Overview
The **Parkinson's Disease Voice Screening & Clinical Decision Support Platform (Vocalis)** is an end-to-end, privacy-preserving web application designed for non-invasive acoustic biomarker screening. Built on a hybrid deep learning architecture, the platform extracts high-dimensional self-supervised speech representations from sustained phonation audio using a frozen **WavLM-Base-Plus** foundation model, processes temporal dynamics through a custom **ConvNeXt V2 stem and Transformer Encoder** ($6.42\text{M}$ trainable parameters), and computes millisecond-level temporal explainability via **Attention Rollout**. Predictions are synthesized into structured, non-diagnostic clinical reports using **Retrieval-Augmented Generation (RAG)** over authoritative literature stored in **ChromaDB** with defense-in-depth safety blocklists and **Groq/Qwen** LLM inference.

---

### End-to-End System Pipeline

```
[ User Microphone / Upload ]
             │
             ▼
[ In-Browser PCM WAV Transcoding (AudioContext) ]
             │  POST /api/v1/predict (Multipart WAV)
             ▼
[ Audio Validation & Preprocessing (16kHz, 30dB Trim, 4.0s Segmentation) ]
             │  Standardized Tensor: (1, 64000)
             ▼
[ Frozen Upstream WavLM-Base-Plus Feature Extractor ]
             │  Acoustic Embeddings: (1, 199, 768)
             ▼
[ ConvNeXt V2 Stem (Atto-scale, GRN, 4x Downsampling) ] ───► (1, 50, 256)
             │
             ▼
[ 3-Layer Transformer Encoder (4 Heads, D=256) ]
             │
             ▼
[ Learnable Attention-Pooling Layer ] ──────────────────────► Attention Rollout (199 Frames)
             │  Pooled Embedding: (1, 256)
             ▼
[ MLP Classifier Head ] ────────────────────────────────────► Calibrated Probability & Risk Tier
             │
             ▼
[ SQLite Persistence (test_records — Zero Raw Audio Saved) ]
             │
             ▼  POST /api/v1/report/{id} (On Demand)
[ RAG Dense Retrieval (bge-small-en-v1.5 + ChromaDB, Top-4 Chunks) ]
             │
             ▼
[ Groq / Qwen-27B LLM Synthesis + Safety Blocklist Scan ]
             │
             ▼
[ React + Tailwind Dark Editorial Dashboard (Result.tsx & Report.tsx) ]
```

---

### Core Technology Stack
- **Deep Learning & Audio:** PyTorch (TorchScript), Hugging Face Transformers (`microsoft/wavlm-base-plus`), Librosa, SoundFile.
- **RAG & Embeddings:** ChromaDB (local persistent vector store), Sentence-Transformers (`BAAI/bge-small-en-v1.5`, 384-dim).
- **LLM Synthesis:** Groq Hosted LPU (`qwen/qwen3.8-27b`), Google Gemini (`gemini-2.5-flash`), local Ollama (`qwen2.5:3b-instruct`).
- **Backend API:** FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, SQLite (`backend/app.db`).
- **Frontend UI:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Vitest.

---

### Headline Benchmark Performance (Held-Out Test Set)
- **ROC-AUC:** `0.9645` | **PR-AUC:** `0.9712` | **Expected Calibration Error (ECE):** `0.0533`
- **Accuracy (Threshold 0.55):** `91.67%` ($99/108$ test clips correctly classified on unseen subjects).
- **Sensitivity / Recall:** `92.19%` ($59/64$ Parkinson's phonations detected).
- **Specificity:** `90.91%` ($40/44$ Healthy control phonations correctly identified).
- **Inference Latency:** $< 250\text{ ms}$ on CPU for complete acoustic feature extraction and classification.

---

### Key Technical Limitations & Safety Guardrails
1. **Screening Proxy, Not Diagnosis:** Evaluates vocal acoustic stability only; cannot replace physical MDS-UPDRS motor exams, neurological history, or DaTscan imaging.
2. **Linguistic & Demographic Scope:** Primary training data consists of Italian speakers (IPVS, 65 subjects); cross-dataset English continuous reading (MDVR-KCL) shows domain shift (`ROC-AUC 0.4554`).
3. **Defense-in-Depth Safety:** Multi-tiered protection—system prompt mandates non-diagnostic language, a post-generation blocklist discards forbidden assertions (`"you have parkinson"`, `"diagnosed with"`), and the legal disclaimer is hardcoded as an immutable Python constant.
4. **Zero Audio Persistence:** Raw vocal audio waveforms are held exclusively in volatile RAM during the HTTP request lifecycle and are never written to disk or database.
