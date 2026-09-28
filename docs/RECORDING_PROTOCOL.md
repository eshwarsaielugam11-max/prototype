# Clinical Acoustic Recording Protocol: 10-Second Parkinson's Screening

> **CLINICAL NOTICE:** This protocol outlines standard operating procedures (SOP) for acoustic voice sample collection in clinical and decentralized research settings. The Parkinson's Voice Screening platform is a clinical decision support and risk stratification tool, **not** an autonomous diagnostic device.

---

## 1. Objectives & Scope

This protocol establishes the standardized procedure for acquiring, quality-controlling, and processing 10-second vocal recordings for the hybrid **WavLM + ConvNeXt V2 + Transformer** Parkinson's screening model.

Adherence to this protocol minimizes acoustic variability caused by hardware differences, room acoustics, and subject distance, ensuring that extracted acoustic features reflect phonatory and articulatory neuropathology rather than environmental artifacts.

---

## 2. Target Vocal Tasks (10-Second Modalities)

The multi-task training corpus incorporates three standardized speech production modalities:

### 2.1 Sustained Vowels (`/a/`, `/e/`, `/i/`, `/o/`, `/u/`)
* **Objective:** Isolates phonatory stability, vocal cord adduction regularity, tremor, shimmer, jitter, and harmonic-to-noise ratio (HNR) free from articulatory transitions.
* **Instruction to Subject:**
  > *"Take a deep breath and produce the sound 'ahhh' (or 'eee', 'ooo') steadily at your normal, comfortable pitch and loudness for at least 8 to 10 seconds until I say stop."*
* **Target Minimum:** At least **8 to 10 seconds** of sustained phonation.

### 2.2 Syllable Diadochokinesia (DDK) (`/pa-ta-ka/`)
* **Objective:** Assesses rapid alternating movements, articulatory precision, syllable sequencing, coordination of lips, tongue tip, and soft palate, and hypokinetic dysarthric decay.
* **Instruction to Subject:**
  > *"Take a deep breath and repeat the syllable sequence 'PA-TA-KA' (or 'PA-PA-PA') as clearly and evenly as you can at a rapid, steady pace for 10 seconds."*
* **Target Minimum:** At least **8 to 10 seconds** of continuous repetition.

### 2.3 Continuous Paragraph Reading
* **Objective:** Captures natural conversational prosody, fundamental frequency ($F_0$) variation, monopitch, monoloudness, speech rate, pausing architecture, and respiratory phrasing.
* **Standardized Passages:**
  - **English (MDVR-KCL standard):** Grandfather Passage or Rainbow Passage (~150 seconds, segmented into 10.0s sliding windows with 5.0s stride).
  - **Italian (IPVS standard):** *"Il brano"* standard reading passage.
* **Instruction to Subject:**
  > *"Please read the printed passage aloud at your normal speaking rate and volume."*
* **Target Duration:** Read continuously for the entire passage duration ($\ge 10$ seconds).

---

## 3. Recording Environment & Acoustic Conditions

To prevent signal degradation and misclassification due to ambient confounders:

| Parameter | Clinical Specification | Rationale |
| :--- | :--- | :--- |
| **Ambient Noise** | $< 40\text{ dB SPL}$ (Quiet Room) | High background noise corrupts WavLM frame-level representations. |
| **Room Acoustics** | Minimal reverberation (carpeted, furnished) | Echoes blur fine formant transitions and high-frequency harmonics. |
| **Airflow & HVAC** | No direct fans, AC drafts, or open windows | Air turbulence on microphone diaphragm creates false low-frequency energy. |
| **Distractions** | Zero background chatter, music, or pets | Extraneous speech corrupts acoustic attention heatmaps. |

---

## 4. Hardware & Microphone Placement Protocol

Proper microphone positioning prevents clipping, breath pops, and proximity effect:

```
          [Participant]
               \
                \  10 - 15 cm (4 - 6 inches)
                 \
                  v
              [Microphone]  <--- Angled at 45° off-axis
```

1. **Distance:** Maintain strictly **10 to 15 cm (4 to 6 inches)** between the mouth and the microphone capsule.
2. **Angle:** Place the microphone at a **45-degree off-axis angle** (not directly in front of the mouth). This avoids plosive aerodynamic bursts (breath pops on `/p/`, `/t/`, `/k/`) from saturating the diaphragm.
3. **Mounting:** Use a stationary desk stand, boom arm, or securely positioned headset. **Avoid hand-held operation** to eliminate friction noise and involuntary hand tremor artifacts.
4. **Smartphone Guidelines (Decentralized Testing):**
   - Place smartphone on a stable tabletop propped at 45 degrees, 15 cm from mouth.
   - Ensure the protective phone case does not obstruct the bottom primary microphone port.
   - Keep hands off the device during active recording.

---

## 5. Subject Posture & Preparation

1. **Posture:** Subject should sit upright with shoulders relaxed and back supported against a straight chair. An upright posture ensures unrestricted diaphragmatic excursion.
2. **Hydration:** Participant should take a sip of room-temperature water 2 minutes before recording to prevent vocal fry caused by dry mucosal vocal fold surfaces.
3. **Medication Timing:** In clinical notes, always record the exact time elapsed since the last dose of dopaminergic medication (e.g., L-Dopa **ON-state** vs. **OFF-state**).

---

## 6. Preprocessing & Quality Assurance Pipeline

Every audio capture passes through an automated validation and windowing pipeline:

```
[Raw Audio Capture]
        │
        ▼
[Audio Validation: Format, Channels, Amplitude Checks]
        │
        ▼
[Resample to 16,000 Hz (soxr_hq)]
        │
        ▼
[Trim Silence: librosa.effects.trim(top_db=30)]
        │
        ├────────────────────────┬────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
  Trimmed < 8.0s           8.0s ≤ Trimmed < 10.0s    Trimmed ≥ 10.0s
[REJECT / EXCLUDE]        [Repeat-Pad to 10.0s]     [Sliding Windows]
Prompt user to re-record   (padded_fraction ≤ 20%)   (10.0s win, 5.0s stride)
                                 │                        │
                                 └───────────┬────────────┘
                                             │
                                             ▼
                                  [Normalized Peak Energy]
                                  [Tensor: 160,000 samples]
                                             │
                                             ▼
                                  [WavLM Base+ Embedding]
                                  [Shape: (499, 768), FP16]
```

### 6.1 Quality Control Rejection Thresholds
* **Duration Filter:** Any recording with $< 8.0\text{ seconds}$ of trimmed speech is rejected immediately (`duration_rejected`). The participant is instructed to repeat the task.
* **Repeat-Padding Contract:** For recordings between $8.0\text{s}$ and $10.0\text{s}$, repeat-padding preserves cyclic acoustic properties while strictly capping padded fraction at $\le 20\%$.
* **Clipping Guard:** Signals with peak amplitude $> 0.99$ are flagged for potential digital saturation.
* **Zero-Crossing & Silence Guard:** Signals consisting predominantly of silence ($> 60\%$ energy trimmed away) prompt an environmental noise warning.

---

## 7. Step-by-Step Operator Checklist

1. [ ] Verify room quietness ($< 40\text{ dB}$).
2. [ ] Seat participant upright with microphone 10–15 cm away at a 45° angle.
3. [ ] Explain the specific task (Vowel sustain, DDK, or Reading passage).
4. [ ] Have participant perform a brief 2-second warm-up phonation.
5. [ ] Press **Record** in the application interface.
6. [ ] Count down: *"3, 2, 1, start"*.
7. [ ] Monitor the live waveform visualizer; verify non-clipping, healthy amplitude levels.
8. [ ] Allow recording to run for at least **11–12 seconds** before stopping to ensure $\ge 10$s after silence trimming.
9. [ ] Confirm the system displays: **"Audio Validation Passed: 10.0s segment processed"**.
10. [ ] Review the predicted screening risk tier and temporal attention heatmap.
