# Test Execution & Verification Report

**Project:** Acoustic Voice Biomarker Screening for Parkinson's Disease (Clinical Decision Support Platform)  
**Date:** March 2026  
**Status:** ALL TESTS PASSING (100% Pass Rate)

---

## 1. Executive Summary

A comprehensive automated test suite has been established across all architectural layers of the platform:
- **Backend & ML Suite (`pytest`):** 79 tests covering API endpoints, audio validation, configuration, database repository CRUD, inference service, LLM integration, RAG retrieval, report generation, and neural model / explainability routines.
- **Frontend Suite (`vitest` + React Testing Library):** 36 tests covering API HTTP client, UI components (`AudioRecorder`, `UploadDropzone`, `AttentionHeatmap`, `ReportSection`, `ErrorBoundary`), and application pages (`Home`, `Record`, `Upload`, `Result`, `Report`, `History`).

| Test Suite | Framework | Total Tests | Passed | Failed | Skipped | Pass Rate | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Backend & ML** | `pytest` 9.1.1 | 79 | 79 | 0 | 0 | **100%** | ~71.65s |
| **Frontend** | `vitest` 3.2.4 | 36 | 36 | 0 | 0 | **100%** | ~2.17s |
| **Combined** | — | **115** | **115** | **0** | **0** | **100%** | **~74s** |

---

## 2. Test Execution Commands

One-line runner scripts are provided for both Unix/macOS (`.sh`) and Windows (`.ps1`) environments.

### Backend & ML Tests
```bash
# Unix / macOS
./scripts/run_backend_tests.sh

# Windows PowerShell
.\scripts\run_backend_tests.ps1

# Direct invocation
.venv/bin/pytest -v backend/tests ml/tests
```

### Frontend Tests
```bash
# Unix / macOS
./scripts/run_frontend_tests.sh

# Windows PowerShell
.\scripts\run_frontend_tests.ps1

# Direct invocation
cd frontend && npm run test
```

---

## 3. Backend & ML Test Coverage Breakdown

### `backend/tests/test_api_predict_report_history.py` (8 tests)
- `test_predict_success_with_valid_wav`: End-to-end multipart audio upload, inference, SQLite persistence, and response serialization.
- `test_predict_rejects_invalid_audio_format`: 400 Bad Request rejection on invalid audio types or unparseable headers.
- `test_predict_rejects_invalid_source`: Validation of input modality (`"recording"` | `"upload"`).
- `test_report_generation_when_llm_unavailable`: Graceful 503 response and advisory payload when `LLM_API_KEY` is not configured.
- `test_report_generation_and_caching_with_mocked_llm`: Full grounded synthesis pipeline and DB caching idempotency.
- `test_get_report_returns_404_before_generation`: Clean 404 response for test records before report synthesis.
- `test_history_list_and_detail_endpoints`: Pagination, ordering, and retrieval by ID.
- `test_report_endpoints_nonexistent_record`: 404 response handling for nonexistent screening IDs.

### `backend/tests/test_audio_validation.py` (8 tests)
- `test_valid_audio_file_accepted`: Acceptance and header decoding of standard PCM WAV formats.
- `test_missing_or_invalid_filename_rejected`: Rejection of missing filenames or unknown extensions.
- `test_unsupported_audio_extension_rejected`: Rejection of non-audio files (e.g., `.txt`, `.exe`).
- `test_empty_audio_bytes_rejected`: Immediate rejection of zero-byte uploads.
- `test_oversized_audio_bytes_rejected`: Rejection of files exceeding maximum allowed size limits.
- `test_corrupt_audio_stream_rejected`: Guard against unparseable or corrupted audio headers.
- `test_short_duration_audio_rejected`: Enforcement of minimum phonation length (> 1.0s).
- `test_silent_audio_energy_rejected`: Guard against pure silence or near-zero amplitude input.

### `backend/tests/test_config.py` (3 tests)
- `test_settings_default_values`: Verification of safe defaults and environment schema defaults.
- `test_settings_custom_environment_override`: Dynamic loading and overrides from environment variables.
- `test_get_settings_lru_cached`: Verification of LRU caching for configuration singleton.

### `backend/tests/test_db_repository.py` (4 tests) & `test_repository.py` (3 tests)
- `test_create_and_get_test_record_round_trip`: Full lifecycle persistence of prediction and metadata.
- `test_list_test_records_ordering`: Chronological reverse ordering (most recent first).
- `test_update_and_delete_test_record`: Report JSON attachment and record cleanup.
- `test_medical_safety_prohibits_diagnostic_terms`: Verification that stored prediction labels conform to non-diagnostic taxonomy (`"parkinsons_risk_indicated"` / `"low_risk_indicated"`).
- `test_repository_list_and_pagination`: Offset and limit query verification.
- `test_repository_nonexistent_lookups`: Safe `None` return for missing UUIDs.

### `backend/tests/test_health.py` (4 tests)
- `test_root_index_endpoint`: Root documentation index.
- `test_health_check_endpoint`: Service readiness probe.
- `test_cors_headers`: CORS middleware header verification.
- `test_unhandled_exception_shield`: Global exception shield returning structured error responses without stack leaks.

### `backend/tests/test_inference_service.py` (9 tests)
- `test_inference_service_init`: Neural checkpoint loading and initialization.
- `test_predict_pd_fixture`: Prediction score computation on elevated risk audio fixture.
- `test_predict_healthy_fixture`: Prediction score computation on low risk baseline audio fixture.
- `test_temp_file_cleanup`: Assurance that temporary audio files are purged from disk immediately post-inference.
- Validation path tests: Extension, empty bytes, corrupt data, silence rejection.

### `backend/tests/test_llm_service.py` (11 tests)
- Provider selection tests: Groq (OpenAI-compatible), OpenRouter, Gemini Studio.
- Availability checks: Handling valid keys, missing keys, and default placeholder keys.
- Network resilience: Auth errors (401), rate limits (429), timeouts, and graceful degradation.

### `backend/tests/test_rag_service.py` (8 tests)
- Ingestion & idempotency: Vector index construction from clinical literature chunks.
- Semantic similarity retrieval: Relevant chunk retrieval for pitch perturbations, dysphonia, and screening limitations.
- Top-K parameterization and empty query edge cases.

### `backend/tests/test_report_service.py` (9 tests)
- `test_generate_report_pd_risk_indicated`: Complete report generation workflow for risk-indicated cases.
- `test_generate_report_low_risk_indicated`: Complete report generation workflow for low-risk cases.
- `test_clinical_disclaimer_is_byte_identical_regardless_of_llm_output`: **Critical Medical Safety Test** verifying the legal clinical disclaimer cannot be altered or omitted by the LLM.
- `test_safety_blocklist_catches_forbidden_diagnostic_phrases`: Automated scrubbing/rejection if LLM outputs forbidden diagnostic terms (e.g., *"diagnosed with Parkinson's"*, *"confirmed diagnosis"*).
- `test_defensive_parsing_*`: Robust parsing of JSON markdown fences, retry mechanisms, and fallback defaults.

### `ml/tests/test_explainability.py` & `test_model_shapes.py` (9 tests)
- Attention rollout mathematical correctness, frame alignment, and bounds [0, 1].
- Integrated gradients tensor shapes.
- Backbone transformer parameter budget and tensor shape integrity on forward and backward passes.

---

## 4. Frontend Component & Integration Test Coverage Breakdown

### `frontend/src/api/client.test.ts` (8 tests)
- `predictAudio`: Multipart form data packaging and response deserialization.
- `getHistoryItem`, `listHistory`, `getReport`, `generateReport`: Typed API interactions.
- `ApiError`: HTTP error handling with status codes and structured detail extraction.

### `frontend/src/components/AudioRecorder.test.tsx` (3 tests)
- Standby state and microphone permission acquisition.
- Media permission denial with accessible error messaging.
- Start and stop recording lifecycle transitions and preview generation.

### `frontend/src/components/UploadDropzone.test.tsx` (5 tests)
- File format guidance display (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`).
- File selection and drag-and-drop file processing.
- Rejection of unsupported extensions.
- Rejection of oversized files (> 25 MB limit).

### `frontend/src/components/AttentionHeatmap.test.tsx` (2 tests)
- Time-aligned bar chart rendering and peak salience marker.
- Graceful fallback when attention data is absent or unparseable.

### `frontend/src/components/ReportSection.test.tsx` (2 tests)
- Structured card rendering with badge variants.
- Mandatory amber disclaimer card styling.

### `frontend/src/components/ErrorBoundary.test.tsx` (2 tests)
- Normal child component rendering.
- Graceful UI fallback catching render exceptions.

### Application Page Tests (14 tests across 6 pages)
- `Home.test.tsx`: Landing page rendering, feature introduction, screening pipeline explanation, and prominent clinical disclaimer.
- `Record.test.tsx`: Microphone protocol instructions, vowel phonation `/a/` guidance, and recorder integration.
- `Upload.test.tsx`: Audio file upload workflow and validation instructions.
- `Result.test.tsx`: Parameter loading, elevated risk vs. low risk outcome badges, probability metric display, time-aligned heatmap integration, and navigation into report generation.
- `Report.test.tsx`: Complete four-part report presentation (Model Prediction, Authoritative Evidence, Clinical Explanation, Disclaimer), ungenerated 404 state handling with synthesis CTA, and clipboard export.
- `History.test.tsx`: History table rendering, real-time client-side search filtering by patient ID, outcome filtering, empty state, and pagination controls.

---

## 5. Medical Safety & Compliance Verification

| Safety Requirement | Verification Method | Status |
| :--- | :--- | :--- |
| **Strict Non-Diagnostic Language** | Blocklist enforcement in `ReportService` (`test_safety_blocklist_catches_forbidden_diagnostic_phrases`) and DB constraint checks (`test_medical_safety_prohibits_diagnostic_terms`). | **PASSED** |
| **Disclaimer Immutability** | Byte-identical disclaimer verification (`test_clinical_disclaimer_is_byte_identical_regardless_of_llm_output`). | **PASSED** |
| **Data Privacy & Ephemeral Audio** | Zero audio retention test (`test_temp_file_cleanup`). Audio files are unlinked immediately post-inference. | **PASSED** |
| **Explainability Integrity** | Time-aligned attention rollout verification against frame lengths and normalization bounds (`test_compute_time_aligned_attention_shapes_and_bounds`). | **PASSED** |
| **Zero-Credential Resilience** | Graceful degradation to 503 advisory when `LLM_API_KEY` is not present, allowing full acoustic inference to function without external dependencies. | **PASSED** |

---

## 6. Conclusion

The testing infrastructure is complete, hermetic, and verifiable. All 115 tests across the full stack execute cleanly with zero errors.
