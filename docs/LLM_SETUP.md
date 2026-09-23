# Hosted LLM Setup Guide (Free-Tier API)

This guide documents how to obtain a 100% free API key and configure the Large Language Model (LLM) service powering clinical decision support report generation in the **Parkinson's Disease Voice Screening Platform**.

---

## 1. Why a Hosted Free-Tier API?

To eliminate the need for heavy local GPU hardware, large gigabyte-scale model downloads, and high RAM usage on personal computers, the platform uses **hosted, ultra-fast inference APIs** with generous free tiers:
- **No credit card required** for signup.
- **Fast response times** (~$500\text{–}1,000\text{ ms}$ report generation on Groq LPUs).
- **Single-user research quota** (sufficient for development, testing, and clinical prototyping).

> [!NOTE]
> **Privacy Architecture:**
> The API key is read solely from your local `.env` file into memory. It is **never logged, committed, or transmitted** anywhere other than the direct HTTPS endpoint of your chosen provider. Only structured acoustic metrics and relevant educational knowledge base excerpts are sent in report generation prompts—raw audio is **never** sent to the LLM.

---

## 2. Primary Provider: Groq (Recommended)

[Groq](https://groq.com) provides near-instant inference over open-source models using custom LPU (Language Processing Unit) accelerators.

### Step 1: Create a Free Account
1. Visit **[https://console.groq.com](https://console.groq.com)**.
2. Sign in with GitHub or Google (no credit card or billing details required).

### Step 2: Generate an API Key
1. Navigate to **API Keys** in the left sidebar (or go directly to [console.groq.com/keys](https://console.groq.com/keys)).
2. Click **Create API Key**.
3. Name it (e.g., `parkinsons-voice-platform`) and copy the key (starts with `gsk_...`).

### Step 3: Configure `.env`
In your project root `.env` file, set:
```env
LLM_PROVIDER=groq
LLM_API_KEY=gsk_your_actual_key_here
LLM_MODEL=llama-3.3-70b-versatile
LLM_BASE_URL=https://api.groq.com/openai/v1
```
*(Alternatively, you can set `LLM_MODEL=llama-3.1-8b-instant` for even faster responses).*

### Free-Tier Rate Limits (Groq)
- **30 Requests per Minute (RPM)**
- **1,000 Requests per Day (RPD)**
- *Note:* This quota is more than sufficient for screening research and clinical decision support evaluations.

---

## 3. Fallback Provider: Google Gemini (AI Studio)

If you prefer Google's Gemini models or hit temporary rate limits on Groq:

### Step 1: Get a Gemini API Key
1. Visit **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**.
2. Sign in with your Google account.
3. Click **Create API key** (no credit card required).

### Step 2: Configure `.env`
```env
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-2.5-flash
```

### Free-Tier Rate Limits (Gemini AI Studio)
- **15 Requests per Minute (RPM)**
- **1,500 Requests per Day (RPD)**

---

## 4. Alternative Provider: OpenRouter

[OpenRouter](https://openrouter.ai) aggregates multiple model providers with OpenAI-compatible endpoints:
1. Create a free account at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Configure `.env`:
   ```env
   LLM_PROVIDER=openrouter
   LLM_API_KEY=sk-or-your_openrouter_key
   LLM_MODEL=meta-llama/llama-3.3-70b-instruct
   LLM_BASE_URL=https://openrouter.ai/api/v1
   ```

---

## 5. Offline Fallback: Local Ollama (Optional)

If running in a completely air-gapped environment without internet access:
1. Install Ollama from [ollama.com/download](https://ollama.com/download).
2. Run `ollama pull qwen2.5:3b-instruct` and `ollama serve`.
3. Configure `.env`:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:3b-instruct
   ```

---

## 6. Startup & Graceful Degradation

- When the FastAPI backend boots, it checks whether `LLM_API_KEY` is present.
- **Zero Quota Usage on Startup:** The server does *not* make test network calls on boot, preserving your free-tier quota.
- If `LLM_API_KEY` is missing or contains placeholder text, the backend logs an advisory warning and sets `app.state.llm_available = False`.
- All other features (audio uploading, acoustic feature extraction, neural classifier inference, and RAG retrieval) continue to operate normally.
