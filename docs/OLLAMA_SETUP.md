# Local Ollama LLM Setup Guide

This guide documents how to install, configure, and operate the local Large Language Model (LLM) service powering clinical decision support report generation in the **Parkinson's Disease Voice Screening Platform**.

---

## 1. Overview and Privacy Guarantee

In strict compliance with medical data privacy and non-diagnostic safety principles:
- **100% Local Inference:** All report generation runs locally on your machine via [Ollama](https://ollama.com).
- **No Third-Party APIs:** No patient transcripts, acoustic scores, or prompt texts are ever transmitted over the public internet to external AI providers.
- **No API Keys Required:** Operating Ollama is completely free, open-source, and does not require credit card registration or subscription tokens.

---

## 2. Installation

Download and install Ollama for your operating system from the official website:

👉 **[Download Ollama from Official Site (ollama.com/download)](https://ollama.com/download)**

### macOS
1. Download the `Ollama-darwin.zip` archive.
2. Unzip and drag `Ollama.app` into your `/Applications` directory.
3. Launch Ollama once to initialize command-line tools (`/usr/local/bin/ollama`).

### Linux
Run the official installation script:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
Download and execute `OllamaSetup.exe` from the official download portal.

---

## 3. Starting the Ollama Service

By default on macOS and Windows, Ollama runs in the background as a menu bar / system tray service.

If running in headless Linux or from the terminal:
```bash
ollama serve
```

Verify that the local server is listening on port `11434`:
```bash
curl http://localhost:11434/
# Output: "Ollama is running"
```

---

## 4. Downloading the Recommended Model

The platform is optimized for **Qwen 2.5 (3B Instruct)**, which delivers strong instruction following, structured markdown synthesis, and factual grounding within a compact ~1.9 GB memory footprint.

Pull the model by executing:
```bash
ollama pull qwen2.5:3b-instruct
```
*(Alternatively, `ollama pull qwen2.5:3b` installs the same weights).*

Verify the model is installed:
```bash
ollama list
# Output should list:
# NAME                   ID           SIZE    MODIFIED
# qwen2.5:3b-instruct    ...          1.9 GB  ...
```

---

## 5. Low-RAM Fallback: Microsoft Phi-3.5 Mini

If running on machines with limited RAM (e.g., 8 GB unified memory or older laptops), the platform supports **Microsoft Phi-3.5 Mini (3.8B)** as an efficient fallback:

1. Pull the Phi-3.5 model:
   ```bash
   ollama pull phi3.5
   ```
2. Update your `.env` configuration file in the project root:
   ```env
   OLLAMA_MODEL=phi3.5
   ```
3. Restart the FastAPI backend server.

---

## 6. Environment Configuration Reference

The following environment variables control LLM connectivity in `.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `OLLAMA_HOST` | `http://localhost:11434` | Base HTTP endpoint where the local Ollama daemon listens. |
| `OLLAMA_MODEL` | `qwen2.5:3b-instruct` | Target model tag passed to `ollama.Client.chat()`. |

---

## 7. Graceful Degradation Behavior

If Ollama is not installed or the server is stopped:
- The FastAPI backend **will still boot successfully** and serve health check, acoustic feature extraction, and screening inference endpoints.
- During startup, the server logs a clear, non-fatal advisory notice:
  ```
  WARNING | Ollama server is reachable, but model 'qwen2.5:3b-instruct' is not pulled...
  ```
- The application sets `app.state.llm_available = False`.
- Endpoints requesting LLM report synthesis will return a transparent HTTP 503 error instructing the user to start Ollama and pull the model, rather than crashing or freezing.

---

## 8. Verification Command

To verify complete end-to-end connectivity between Python and Ollama:
```bash
.venv/bin/python -c "
from backend.app.services.llm import LLMService
service = LLMService()
available, msg = service.check_availability()
print('Status:', available)
print('Message:', msg)
if available:
    print('Test completion:', service.generate('You are an assistant.', 'Respond with: System operational.'))
"
```
