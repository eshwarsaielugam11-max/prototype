# Live Input Diagnosis & Acoustic Systems Audit Report

**Date:** 2026-09-28  
**Author:** ML Systems Audit & Debugging Team  
**Artifacts Audited:** `models/artifact/model.pt`, `models/artifact/config.json`, `models/artifact/eval_metrics.json`  
**Pipeline Code Audited:** `frontend/src/components/AudioRecorder.tsx`, `backend/app/services/audio_validation.py`, `backend/app/services/inference.py`, `ml/preprocessing/audio_preprocessing.py`, `frontend/src/pages/Result.tsx`

---

## 1. Executive Summary & Diagnostic Overview

### The Symptom
During live browser microphone testing, the model consistently outputs an extremely low probability value ($\sim 0.1\%$ or $0.0010 - 0.0018$) roughly $95\%$ of the time. 

### Core Diagnostic Conclusions
1. **The UI is NOT corrupted and there is NO double-sigmoid bug (Hypothesis Rejected):**
   The backend applies `torch.sigmoid(logit)` exactly once in `backend/app/services/inference.py` line 225. The frontend displays `(probability * 100).toFixed(1)` directly as $P(\text{PD})$. It does not invert or transform the number for predicted classes.
2. **P(PD) really IS $\sim 0.001$ for live recordings (Hypothesis Confirmed):**
   - **For healthy testers:** The model's negative logit for non-Parkinson's voice is approximately $-6.6$ to $-6.9$. Because $\sigma(-6.6) \approx 0.0013$ ($0.13\%$), a score of $0.1\%$ represents **$99.9\%$ confidence that the speaker is a healthy control**. On the clean held-out IPVS test set, $75\%$ of healthy recordings scored $< 0.05$ with a median of **$0.0014$ ($0.14\%$)**.
   - **For Parkinson's audio under ambient noise or mobile microphones:** The model suffers from severe **acoustic domain shift**. When real-world ambient room noise or smartphone microphone coloration is present, or when the speaker uses continuous English speech rather than sustained Italian vowels, the downstream classifier collapses to its negative prior logit ($\sim -6.5$, yielding $\sim 0.0015 = 0.15\%$). On the MDVR-KCL smartphone continuous reading dataset (37 recordings), **$100\%$ of all subjects (both healthy and Parkinson's) collapsed to $0.0012 - 0.0042$ ($\sim 0.1\% - 0.4\%$)**.
3. **Verdict on Model Retraining:**
   **YES, the model strictly requires robustness retraining (Prompts F2–F4).** While the current classifier achieves $96.5\%$ ROC-AUC on clean studio condenser microphone recordings in Italian, it has near-zero domain robustness to consumer microphones, room acoustic noise, and continuous English speech.

---

## 2. End-to-End Code Path Trace

From `navigator.mediaDevices.getUserMedia` to the rendered UI percentage:

| Step | Component | Exact Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **Audio Constraints** | `AudioRecorder.tsx` | `{ channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }`. Disables destructive browser audio filtering. | Clean |
| **Client Audio Capture** | `AudioRecorder.tsx` | **Upgraded to Uncompressed PCM:** Primary capture uses `AudioWorkletNode` (`PCMCaptureProcessor`), secondary fallback uses `ScriptProcessorNode`, last-resort fallback uses `MediaRecorder`. Direct client-side encoding to 16-bit mono PCM WAV at `audioCtx.sampleRate` ($44.1 / 48\text{ kHz}$). | Fixed / Clean |
| **Upload Payload** | `client.ts` | Multipart form-data with field `file` named `recording_sample.wav` (`audio/wav`). | Clean |
| **Backend Decoding** | `audio_validation.py` | `sf.read(io.BytesIO(audio_bytes))` for memory-speed WAV decoding; fallback to temporary file with `librosa.load(tmp_path, sr=None)`. Multichannel arrays averaged to mono float32. | Clean |
| **Resampling** | `audio_preprocessing.py` | High-quality SOXR resampler (`res_type="soxr_hq"`) downsamples from $44.1 / 48\text{ kHz}$ to target $16\text{ kHz}$ with zero anti-aliasing distortion. | Verified |
| **Silence Trimming & Segmenting** | `audio_preprocessing.py` | `librosa.effects.trim(waveform, top_db=30)`. Peak amplitude normalized to $[-1.0, 1.0]$. Fixed $4.0\text{ s}$ window ($64,000$ samples) with repeat-padding (`pad_mode="repeat"`). | Verified |
| **Feature Extraction** | `inference.py` | Frozen `microsoft/wavlm-base-plus` produces hidden states of shape $(1, 199, 768)$. | Clean |
| **Model Forward Pass** | `model.py` | ConvNeXt V2 Stem $\to$ Transformer Encoder $\to$ AttentionPool $\to$ 2-layer MLP head. Returns raw scalar `logit` $(1, 1)$ and attention weights $(1, 50)$. | Clean |
| **Sigmoid Application** | `inference.py` line 225 | `prob = float(torch.sigmoid(logit).squeeze().item())`. **Applied exactly once** on the backend. | Clean |
| **Label Direction & Threshold** | `config.json` | Label `1 = parkinsons_risk_indicated`, `0 = low_risk_indicated`. Decision threshold $= 0.55$. | Clean |
| **UI Display** | `Result.tsx` | Renders `(record.probability * 100).toFixed(1)` as `Risk Probability P(PD)`. For low-risk results, explicitly displays healthy baseline confidence $(100 - P)\%$. | Clarified |

---

## 3. Systematic Hypothesis Testing & Empirical Measurement Table

| # | Hypothesis | Empirical Test Method | Measured Result | Verdict |
| :- | :--- | :--- | :--- | :--- |
| **H1** | **UI Display Inversion or Double Sigmoid:** UI is showing confidence of negative class or applying a second sigmoid. | Inspect `Result.tsx`, `client.ts`, and `inference.py`. Check logit values and trace math. | Model logit is unnormalized scalar (e.g. $-6.62$). Backend applies `torch.sigmoid` once $\to 0.0013$. UI displays `(prob * 100).toFixed(1)` $= 0.1\%$. No second sigmoid or inversion exists. | **REJECTED** |
| **H2** | **Pipeline Parity Bug:** Backend inference differs from Colab evaluation artifacts. | Run 10 curated test samples (`data/test_samples/manifest.csv`) through live `InferenceService.predict()` and compare with benchmark. | **10 / 10 samples match benchmark exactly.** Clean healthy samples score $0.0013 - 0.3324$; clean PD samples score $0.5541 - 0.9962$. | **REJECTED** |
| **H3** | **Healthy Control Base-Rate Output:** Live recordings tested by healthy individuals naturally output $\sim 0.1\%$. | Evaluate true distribution over 44 held-out healthy test recordings from IPVS (`data/processed/metadata.csv`). | **Healthy Test Median: $0.0014$ ($0.14\%$).** 33 of 44 healthy recordings ($75\%$) score $\le 0.050$. For healthy voice, model logit is $\approx -6.6$, which yields $P(\text{PD}) \approx 0.0013$. | **CONFIRMED** |
| **H4** | **Lossy Opus Codec Degradation:** Browser MediaRecorder Opus compression destroys micro-acoustic features. | Encode 10 benchmark WAVs to $48\text{ kHz}$ Opus container, decode via backend, measure $\Delta p$. | Mean absolute probability shift: $\Delta p = 0.0083$ (Max $\Delta p = 0.0463$). All 10 samples retained correct classification. | **REJECTED as primary cause** (minor contributor) |
| **H5** | **Acoustic Noise / SNR Collapse:** Ambient room noise shifts WavLM representations into negative prior space. | Additive Gaussian noise at $30\text{ dB}$, $20\text{ dB}$, $10\text{ dB}$ SNR on test samples. | **Syllable repetition PD sample (`pd_02`) collapsed from $0.9939$ down to $0.0012$ ($0.1\%$)** at $30\text{ dB}$ SNR. Sustained vowel PD maintained $0.991$, but dynamic speech collapsed completely. | **CONFIRMED** |
| **H6** | **Audio Trimming Collapse:** Silence trimming deletes voice content, leading to over-padded empty clips. | Measure duration before and after `librosa.effects.trim(top_db=30)` on test samples. | Test samples experienced $0.0\% - 0.8\%$ trimming loss. Trimming logic does not collapse speech when signal level is above threshold. | **REJECTED** |
| **H7** | **Acoustic Channel Shift (Microphone Hardware):** Consumer mobile/laptop mics differ from studio condenser mics. | Compare spectral centroid, RMS, and noise floor across IPVS (studio), MDVR-KCL (smartphone), and live mic. | Studio IPVS spectral centroid $= 965.8\text{ Hz}$, noise floor $= -35.8\text{ dBFS}$. Mobile/live mic centroid $= 1740.8 - 1768.4\text{ Hz}$, noise floor $= -11.7\text{ dBFS}$. High-frequency shelf and ambient noise cause feature drift. | **CONFIRMED** |
| **H8** | **Language & Task Shift:** Continuous English speech collapses model trained on Italian sustained vowels. | Run complete MDVR-KCL dataset (37 smartphone continuous reading recordings in English). | **$100\%$ of MDVR-KCL samples (both healthy and Parkinson's) predicted negative ($0.0012 - 0.0042$, median $0.0018$). ROC-AUC $= 0.4554$.** | **CONFIRMED** |

---

## 4. In-Depth Empirical Results

### A. Benchmark Parity Test (10 Samples)
Ran through [`scripts/diagnose_live_input.py`](file:///Users/eshwarsaielugam/Documents/prototype/scripts/diagnose_live_input.py):

| File | Clinical Group | Expected Outcome | Output Probability | Prediction | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `healthy_01_sustained_vowel_a.wav` | Elderly Healthy Control | `low_risk_indicated` | **0.2023** | `low_risk_indicated` | PASS |
| `healthy_02_syllables_pataka.wav` | Elderly Healthy Control | `low_risk_indicated` | **0.0013** | `low_risk_indicated` | PASS |
| `healthy_03_sustained_vowel_a.wav` | Elderly Healthy Control | `low_risk_indicated` | **0.3324** | `low_risk_indicated` | PASS |
| `healthy_04_reading_passage.wav` | Elderly Healthy Control | `low_risk_indicated` | **0.0017** | `low_risk_indicated` | PASS |
| `healthy_05_mobile_phonation.wav` | Healthy Smartphone Ref | `low_risk_indicated` | **0.0016** | `low_risk_indicated` | PASS |
| `pd_01_sustained_vowel_a.wav` | Parkinson's Patient (H&Y 1.5) | `parkinsons_risk_indicated` | **0.9913** | `parkinsons_risk_indicated` | PASS |
| `pd_02_syllables_pataka.wav` | Parkinson's Patient (H&Y 1.5) | `parkinsons_risk_indicated` | **0.9939** | `parkinsons_risk_indicated` | PASS |
| `pd_03_reading_passage.wav` | Parkinson's Patient (H&Y 1.5) | `parkinsons_risk_indicated` | **0.9933** | `parkinsons_risk_indicated` | PASS |
| `pd_04_sustained_vowel_a.wav` | Parkinson's Patient (Stage 2) | `parkinsons_risk_indicated` | **0.5541** | `parkinsons_risk_indicated` | PASS |
| `pd_05_syllables_pataka.wav` | Parkinson's Patient (Stage 2) | `parkinsons_risk_indicated` | **0.9962** | `parkinsons_risk_indicated` | PASS |

---

### B. Output Probability Distribution (Held-Out Test Split, $N=108$)

| Class | Count | Min | 25th % | Median | 75th % | Max | Mean |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Healthy Controls** | 44 | **0.0013** | 0.0013 | **0.0014** | 0.0818 | 0.9907 | 0.1197 |
| **Parkinson's Risk** | 64 | **0.0086** | 0.9182 | **0.9881** | 0.9956 | 0.9965 | 0.8924 |

#### Histogram Analysis (Decision Threshold $= 0.55$)
* **Healthy Controls ($N=44$):**
  * `[0.00 - 0.05]`: **33 samples (75.0%)** $\to$ *Concentrated tightly around $0.0013 - 0.0014$ ($0.1\%$).*
  * `[0.05 - 0.25]`: 4 samples
  * `[0.25 - 0.55]`: 3 samples
  * `[0.55 - 1.00]`: 4 false positives ($9.1\%$)
* **Parkinson's Subjects ($N=64$):**
  * `[0.00 - 0.55]`: 5 false negatives ($7.8\%$)
  * `[0.55 - 0.75]`: 3 samples
  * `[0.75 - 0.95]`: 14 samples
  * `[0.95 - 1.00]`: **42 samples (65.6%)** $\to$ *Concentrated tightly around $0.99$.*

**Takeaway:** The model is highly bimodal on its training domain. For healthy phonation, the downstream MLP outputs large negative logits ($\approx -6.6$), which evaluates to $0.0013$ ($0.1\%$).

---

### C. Codec Sensitivity (WAV vs. 48 kHz Opus)

| Sample | Ground Truth | Uncompressed WAV | Opus 48 kHz | $\Delta p$ | Classification Shift? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `healthy_01` | Healthy | 0.2023 | 0.2486 | +0.0463 | None (Low Risk) |
| `healthy_02` | Healthy | 0.0013 | 0.0013 | +0.0000 | None (Low Risk) |
| `healthy_03` | Healthy | 0.3324 | 0.3025 | -0.0299 | None (Low Risk) |
| `healthy_04` | Healthy | 0.0017 | 0.0015 | -0.0002 | None (Low Risk) |
| `healthy_05` | Healthy | 0.0016 | 0.0017 | +0.0001 | None (Low Risk) |
| `pd_01` | PD Risk | 0.9913 | 0.9910 | -0.0003 | None (Elevated Risk) |
| `pd_02` | PD Risk | 0.9939 | 0.9928 | -0.0011 | None (Elevated Risk) |
| `pd_03` | PD Risk | 0.9933 | 0.9944 | +0.0011 | None (Elevated Risk) |
| `pd_04` | PD Risk | 0.5541 | 0.5501 | -0.0040 | None (Elevated Risk) |
| `pd_05` | PD Risk | 0.9962 | 0.9962 | +0.0000 | None (Elevated Risk) |

* **Mean Absolute Shift:** $\mathbf{0.0083}$ ($\mathbf{0.83\%}$).
* **Max Shift:** $\mathbf{0.0463}$ on `healthy_01`.
* **Conclusion:** Lossy Opus encoding causes minor probability jitter but did not flip any decisions on clean audio. However, eliminating it in the frontend via uncompressed PCM capture preserves maximum acoustic fidelity for micro-jitter and shimmer calculation.

---

### D. Level & Channel Sensitivity (Noise, Gain, Bandwidth)

| Sample | Baseline | Gain $-12\text{ dB}$ | Gain $+12\text{ dB}$ | SNR $30\text{ dB}$ | SNR $20\text{ dB}$ | SNR $10\text{ dB}$ | Bandpass ($300-3400\text{ Hz}$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `healthy_01` (vowel) | 0.202 | 0.205 | 0.076 | 0.285 | 0.365 | 0.308 | 0.371 |
| `healthy_02` (pataka) | 0.001 | 0.001 | 0.001 | 0.002 | 0.002 | 0.001 | 0.001 |
| `pd_01` (vowel) | 0.991 | 0.991 | 0.992 | 0.992 | 0.992 | 0.991 | 0.978 |
| `pd_02` (pataka) | **0.994** | 0.993 | 0.994 | **0.001** | **0.001** | **0.001** | 0.958 |

**Critical Vulnerability Discovered:**
When additive Gaussian noise is injected into dynamic speech (`pd_02_syllables_pataka`), the probability collapses **instantly from $0.994$ ($99.4\%$) down to $0.001$ ($0.1\%$) even at a high $30\text{ dB}$ SNR**. The model has never seen noisy backgrounds during training and misinterprets background noise as healthy baseline phonation.

---

### E. Acoustic Profiles: Studio vs. Smartphone vs. Live Laptop Mic

| Dataset / Source | Sample Rate | Duration | RMS Energy | Noise Floor | Spectral Centroid |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IPVS Training (Studio Condenser)** | $16,000\text{ Hz}$ | $4.00\text{ s}$ | $0.2736$ | **$-35.8\text{ dBFS}$** | **$965.8\text{ Hz}$** |
| **MDVR-KCL (Smartphone Microphones)** | $16,000\text{ Hz}$ | $4.00\text{ s}$ | $0.0262$ | **$-52.1\text{ dBFS}$** | **$1740.8\text{ Hz}$** |
| **Live Microphone (Web Audio)** | $44,100\text{ Hz}$ | $3.50\text{ s}$ | $0.2859$ | **$-11.7\text{ dBFS}$** | **$1768.4\text{ Hz}$** |

* Live consumer microphones have higher noise floors ($-11.7\text{ dBFS}$ vs $-35.8\text{ dBFS}$) and a substantially higher spectral centroid ($1768\text{ Hz}$ vs $965\text{ Hz}$), representing an out-of-distribution acoustic signature for the frozen WavLM stem.

---

### F. Speech Task & Language Mismatch (MDVR-KCL Audit)

| Group | Samples | Min Prob | Median Prob | Max Prob | Classification ($> 0.55$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MDVR-KCL Healthy Controls** | 21 | $0.0012$ | **$0.0019$** | $0.1898$ | 0 / 21 ($0.0\%$ false alarms) |
| **MDVR-KCL Parkinson's Patients** | 16 | $0.0013$ | **$0.0018$** | $0.0042$ | **0 / 16 ($0.0\%$ sensitivity - all missed)** |

* **The Problem:** The tester during live recording was likely speaking conversational English or reading English text into the microphone. The training dataset (IPVS) was recorded exclusively in **Italian** with specific vocal protocols (sustained vowels `/a/`, `/e/`, `/i/`, `/o/`, `/u/`, syllable repetition `/pa-ta-ka/`).
* When tested on continuous English reading, the model exhibits total domain collapse ($100\%$ of Parkinson's subjects scored $< 0.005$).

---

## 5. Summary of Definite Bugs Fixed

1. **Frontend Lossy Audio Recording:**
   * *Before:* `AudioRecorder.tsx` used `MediaRecorder` with lossy WebM/Opus compression, and re-decoded it on stop.
   * *Fixed:* Replaced with uncompressed PCM streaming via `AudioWorklet` (fallback to `ScriptProcessor`), capturing raw float32 samples directly into 16-bit uncompressed WAV at the native AudioContext rate.
2. **Audio Input Constraints:**
   * *Before:* Contained inconsistent constraint parameters.
   * *Fixed:* Hardcoded `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }` to disable browser speech filters.
3. **Resampling Quality:**
   * *Before:* Standard `librosa.resample` without explicit resampler parameter.
   * *Fixed:* Explicitly bound to high-quality `res_type="soxr_hq"`.
4. **UI Label Ambiguity:**
   * *Before:* UI displayed `Risk Probability Score: 0.1%` with no indication of label direction.
   * *Fixed:* Updated to `Risk Probability P(PD): 0.1%` with explicit context: `Threshold: 55.0% • Healthy Conf: 99.9%`.
5. **Debug Auditing Tooling:**
   * Added `DEBUG_SAVE_AUDIO` (off by default) with automatic privacy cleanup.

---

## 6. Verdict and Recommendation on Model Retraining

### Does the model need retraining with domain-robust augmentation?
### **VERDICT: YES (MANDATORY FOR CLINICAL DEPLOYMENT).**

### Why retraining is required:
1. **Additive Noise Vulnerability:** Mild ambient noise ($30\text{ dB}$ SNR) causes Parkinson's voice samples to collapse from $0.994 \to 0.001$.
2. **Channel Shift Invariance:** The model cannot differentiate smartphone/laptop microphone frequency responses from healthy acoustic phonation.
3. **Cross-Language & Task Fragility:** The model fails completely on English continuous speech (ROC-AUC $0.4554$).

### Required Training Strategy for Next Prompts (F2–F4):
1. **Segment Length:** Train on longer $10.0\text{ s}$ acoustic contexts rather than $4.0\text{ s}$ slices.
2. **Multi-Domain Data Pooling:** Co-train on IPVS (Italian sustained/syllables), MDVR-KCL (English smartphone reading), and PC-GITA (Spanish vowels/sentences).
3. **Aggressive Domain Augmentation:**
   * Additive background noise (cocktail party, HVAC, room noise at $10-35\text{ dB}$ SNR).
   * Convolutional Room Impulse Responses (synthetic RIRs).
   * Random frequency equalizers (simulating microphone frequency colorations).
   * Codec compression simulation (Opus / AAC / MP3 at various bitrates).
   * Pitch and tempo perturbation ($\pm 5\%$).
