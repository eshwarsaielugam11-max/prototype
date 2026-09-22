---
title: "Interpreting Acoustic Screening Probability Scores and Risk Tiers"
source_name: "Principles of Clinical Decision Support and Biostatistics"
topic_tags:
  - "probability-scores"
  - "decision-thresholds"
  - "risk-stratification"
  - "clinical-decision-support"
---

# Interpreting Acoustic Screening Probability Scores and Risk Tiers

When an acoustic screening model evaluates an audio recording, its output is typically expressed as a continuous probability score between 0.0 and 1.0, often mapped to stratified risk tiers (such as minimal, low, moderate, or high risk). Understanding the statistical meaning of these metrics is essential to avoid misinterpretation.

A model output probability does not indicate the percentage likelihood that a patient has a disease. Instead, it reflects the statistical degree of similarity between the mathematical feature patterns extracted from the uploaded voice sample and the acoustic patterns learned from individuals diagnosed with Parkinson's in the model's training dataset.

Key concepts in interpreting screening metrics include:
- **Decision Threshold:** In machine learning, a classification threshold (such as 0.55) is an operational cutoff selected to balance sensitivity (detecting true cases) and specificity (minimizing false alarms). If a score equals or exceeds the threshold, the system flags the result as "risk indicated"; otherwise, it indicates "low risk."
- **Stratified Risk Tiers:** Rather than relying solely on a binary flag, risk tiers provide granular context:
  - *Minimal Risk (0.00 – 0.24):* Acoustic features align closely with typical normative voice baselines.
  - *Low Risk (0.25 – 0.54):* Minor vocal variations or slight instability detected, but below the screening alert cutoff.
  - *Moderate Risk (0.55 – 0.74):* Acoustic characteristics display notable resemblance to parkinsonian dysarthria profiles; clinical follow-up is prudent if symptoms persist.
  - *High Risk (0.75 – 1.00):* Pronounced acoustic alterations present across multiple speech dimensions; formal neurological consultation is strongly advised.

Regardless of tier, an elevated score is an indicator for clinical inquiry, never a standalone medical diagnosis.
