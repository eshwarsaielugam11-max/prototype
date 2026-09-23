# Parkinson's Voice Screening — Curated Test Evaluation Dataset

This directory contains a curated benchmark test dataset of **10 standardized acoustic recordings** derived from the Italian Parkinson's Voice Dataset (IPVS) and the King's College London Mobile Device Voice Recordings Dataset (MDVR-KCL).

It is specifically designed for testing both the **Web UI** (via the [Upload Page](http://localhost:5173/upload)) and the **REST API** (`POST /api/v1/predict`).

---

## 1. Directory Structure

```
data/test_samples/
├── manifest.csv                       # Complete metadata with expected outcomes & tasks
├── README.md                          # Documentation and usage guide
├── healthy_controls/                  # 5 baseline recordings from healthy individuals
│   ├── healthy_01_sustained_vowel_a.wav
│   ├── healthy_02_syllables_pataka.wav
│   ├── healthy_03_sustained_vowel_a.wav
│   ├── healthy_04_reading_passage.wav
│   └── healthy_05_mobile_phonation.wav
└── parkinsons_risk/                   # 5 recordings from clinically staged Parkinson's participants
    ├── pd_01_sustained_vowel_a.wav
    ├── pd_02_syllables_pataka.wav
    ├── pd_03_reading_passage.wav
    ├── pd_04_sustained_vowel_a.wav
    └── pd_05_syllables_pataka.wav
```

---

## 2. Test Manifest & Benchmark Accuracy

| File | Clinical Cohort | Acoustic Task | Duration | Sample Rate | Expected Screening Outcome | Probability Range |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `healthy_controls/healthy_01_sustained_vowel_a.wav` | Elderly Healthy Control | Sustained Phonation `/a/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `low_risk_indicated` | $< 0.35$ |
| `healthy_controls/healthy_02_syllables_pataka.wav` | Elderly Healthy Control | Diadochokinesis `/pa-ta-ka/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `low_risk_indicated` | $< 0.05$ |
| `healthy_controls/healthy_03_sustained_vowel_a.wav` | Elderly Healthy Control | Sustained Phonation `/a/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `low_risk_indicated` | $< 0.35$ |
| `healthy_controls/healthy_04_reading_passage.wav` | Elderly Healthy Control | Continuous Reading Passage | $4.00\text{ s}$ | $16\text{ kHz}$ | `low_risk_indicated` | $< 0.05$ |
| `healthy_controls/healthy_05_mobile_phonation.wav` | Healthy Smartphone Ref | Smartphone Microphone | $4.00\text{ s}$ | $16\text{ kHz}$ | `low_risk_indicated` | $< 0.05$ |
| `parkinsons_risk/pd_01_sustained_vowel_a.wav` | Parkinson's (H&Y 1.5) | Sustained Phonation `/a/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `parkinsons_risk_indicated` | $> 0.95$ |
| `parkinsons_risk/pd_02_syllables_pataka.wav` | Parkinson's (H&Y 1.5) | Diadochokinesis `/pa-ta-ka/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `parkinsons_risk_indicated` | $> 0.95$ |
| `parkinsons_risk/pd_03_reading_passage.wav` | Parkinson's (H&Y 1.5) | Continuous Reading Passage | $4.00\text{ s}$ | $16\text{ kHz}$ | `parkinsons_risk_indicated` | $> 0.95$ |
| `parkinsons_risk/pd_04_sustained_vowel_a.wav` | Parkinson's (Stage 2) | Sustained Phonation `/a/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `parkinsons_risk_indicated` | $> 0.55$ |
| `parkinsons_risk/pd_05_syllables_pataka.wav` | Parkinson's (Stage 2) | Diadochokinesis `/pa-ta-ka/` | $4.00\text{ s}$ | $16\text{ kHz}$ | `parkinsons_risk_indicated` | $> 0.95$ |

---

## 3. How to Test

### Method A: Via the Web Application (Visual UI)
1. Open **[http://localhost:5173/upload](http://localhost:5173/upload)** in your browser.
2. Drag and drop any `.wav` file from `data/test_samples/healthy_controls/` or `data/test_samples/parkinsons_risk/`.
3. Click **"Run Acoustic Screening"**.
4. Observe the neural risk score, time-aligned attention heatmap, and click **"Generate Full Decision Support Report"** to inspect AI explanation citations.

### Method B: Automated Batch CLI Evaluation
Run the automated evaluation script:
```bash
.venv/bin/python scripts/evaluate_test_dataset.py
```
This will send all 10 audio samples through the FastAPI screening pipeline and print an execution report with prediction accuracy, probability scores, and latency metrics.
