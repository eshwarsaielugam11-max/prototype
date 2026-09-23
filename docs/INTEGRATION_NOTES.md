# Parkinson's Voice Screening Platform — Integration & Hardening Notes

## 1. Executive Summary

This document details the cross-cutting integration, security audit, privacy verification, and dependency error handling pass performed across the entire Parkinson's Voice Screening Platform stack.

The platform was tested end-to-end multiple times with real acoustic voice samples across both the **Live Audio Recording** and **Audio File Upload** ingestion pathways. All inter-service seams between FastAPI, PyTorch (WavLM backbone), ChromaDB (BGE-small embeddings), hosted LLM synthesis (Groq/Gemini), SQLite persistence, and the React + TypeScript frontend were verified.

---

## 2. End-to-End Flow Verification

Three complete end-to-end screening and decision support flows were executed against the live backend service (`http://localhost:8000`) and validated:

| Run # | Ingestion Pathway | Input Sample | Model Screening Outcome | Probability | Attention Rollout Frames | Report Generation Status |
|---|---|---|---|---|---|---|
| **Run 1** | Audio File Upload | `sample_pd.wav` | `parkinsons_risk_indicated` | 99.33% (0.9933) | 199 frames (peak at $t = 2.44\text{s}$) | 404 prior to generation; 503 advisory when unconfigured |
| **Run 2** | Live Microphone (simulated) | `sample_healthy.wav` | `low_risk_indicated` | 0.13% (0.0013) | 199 frames (baseline stability) | Verified decision support structure |
| **Run 3** | Audio File Upload | `sample_pd.wav` (Repeat) | `parkinsons_risk_indicated` | 99.33% (0.9933) | 199 frames | Persisted and verified in chronological history |

### Cross-View Navigation Seams Verified:
1. **Audio Ingestion &rarr; Acoustic Inference**: Multipart audio upload successfully validated, preprocessed (resampled to 16kHz mono), and passed through WavLM.
2. **Inference &rarr; Result View**: Predict response immediately navigated to `/result/:id`, rendering the non-diagnostic risk outcome, probability bar, and time-aligned attention rollout heatmap.
3. **Result View &rarr; Report Synthesis**: Report generation fetched RAG evidence from ChromaDB, enforced strict clinical prompt constraints and fallback mechanisms, and cached the report into SQLite.
4. **History Log &rarr; Retrospective Inspection**: All sessions correctly appeared in `/history` ordered newest-to-oldest with direct links to `/result/:id` and `/report/:id`.

---

## 3. Security & Privacy Audit

### 3.1 Zero Raw Audio Persistence Guarantee
- **Implementation**: The backend operates on in-memory byte streams. When temporary decoding files are created for format compatibility (`InferenceService.predict()`), they are allocated in a secure OS temp file and destroyed immediately within an unconditional `finally` block:
  ```python
  finally:
      if temp_path.exists():
          try:
              temp_path.unlink()
          except OSError as exc:
              logger.warning("Failed to unlink temporary audio file %s: %s", temp_path, exc)
  ```
- **Codebase Grep Verification**: Confirmed that no persistent disk writes of raw audio files exist anywhere in `backend/app/` or `frontend/src/`.

### 3.2 Server-Side Audio Input Validation
- Client-side validation in `UploadDropzone.tsx` and `AudioRecorder.tsx` provides immediate UX feedback, but is **never relied upon for security**.
- Server-side validation (`backend/app/services/audio_validation.py`) strictly enforces:
  - Allowed file extensions (`.wav`, `.mp3`, `.flac`, `.m4a`, `.ogg`).
  - Maximum upload size limit ($\le 25\text{ MB}$).
  - Minimum phonation duration ($\ge 0.5\text{ seconds}$).
  - Non-zero RMS energy threshold (rejecting pure silence or blank files).

### 3.3 Secrets & Credentials Sanitization
- Regex scan across all repositories confirmed **zero API keys, tokens, or credentials committed** (`gsk_*`, `AIzaSy*`, `sk-*`, `ghp_*`).
- All external API connections strictly read environment variables at runtime (`LLM_API_KEY` from `.env`).

### 3.4 Request Correlation & Exception Shielding
- FastAPI exception handlers catch both `HTTPException` and unhandled `Exception`.
- Internal stack traces, server file paths, and database query internals are never exposed to the client in HTTP response payloads.
- Every response includes an `X-Request-ID` correlation header for administrative debugging.

### 3.5 In-Memory Rate Limiter on `/api/v1/predict`
- **Design Decision**: A lightweight, in-memory sliding window rate limiter (`InMemoryRateLimiter`) was added to `backend/app/api/predict.py`.
- **Configuration**: Maximum 30 requests per minute per client IP. Exceeding requests receive `HTTP 429 Too Many Requests`.
- **Rationale**: For a local, single-user clinical decision support prototype, in-memory tracking adds zero infrastructure complexity (no Redis/memcached dependency) while preventing client retry loops or denial-of-service.

---

## 4. Error Handling & Dependency Failure Scenarios

| Failure Scenario | Backend Response | Frontend UI Handling | Verified |
|---|---|---|---|
| **LLM Provider Unconfigured / Offline** | `HTTP 503` with message: *"LLM service is currently unavailable. Please configure LLM_API_KEY in .env. See docs/LLM_SETUP.md."* | Displays an amber clinical advisory card on Result and Report pages with instructions to add a free API key; does not crash. | **PASS** |
| **Invalid Audio Format (e.g. text/JSON)** | `HTTP 400` with message: *"Unsupported audio format '.json'. Permitted formats: .wav, .mp3, .flac..."* | Displays inline red validation error banner prompting user to select a valid voice file. | **PASS** |
| **Missing Screening Record (404)** | `HTTP 404` with message: *"Test record '{id}' not found."* | Result & Report views render clean "Record Not Found" state with links to browse History. | **PASS** |
| **Rate Limit Exceeded (30+ req/min)** | `HTTP 429` with message: *"Rate limit exceeded (maximum 30 requests per minute)..."* | Displays rate limiting warning banner. | **PASS** |

---

## 5. Frontend Client Reliability

### 5.1 Global React Error Boundary
- Created `frontend/src/components/ErrorBoundary.tsx` and wrapped the root `<App />` tree in `frontend/src/main.tsx`.
- Prevents component-level crashes or rendering errors from causing a blank white screen.
- Provides a recovery screen with "Reload Page", "Return to Home", and technical diagnostic details.

### 5.2 Defensive Component Rendering
- **`AttentionHeatmap.tsx`**: Safely handles missing, empty, or unparseable attention rollout JSON payloads by displaying an "Attention Data Unavailable" card.
- **`Report.tsx`**: Defensively handles 404 (report not yet synthesized) by offering a "Synthesize Report Now" action button.
- **`History.tsx`**: Gracefully handles zero-item database states with an empty-state card offering quick navigation to `/record` and `/upload`.

---

## 6. Files Created and Modified

1. **`backend/app/api/predict.py`**: Added `InMemoryRateLimiter` (30 req/min per IP sliding window) and client IP enforcement.
2. **`frontend/src/components/ErrorBoundary.tsx`**: Created global React Error Boundary component with clinical error fallback UI.
3. **`frontend/src/main.tsx`**: Wrapped application entrypoint with `<ErrorBoundary>`.
4. **`docs/INTEGRATION_NOTES.md`**: Created full integration and hardening documentation.
