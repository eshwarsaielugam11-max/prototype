# Retrieval-Augmented Generation (RAG) Knowledge Base

This directory contains curated educational documents designed to ground the Large Language Model (LLM) clinical decision support and report generation pipeline for the Parkinson's Disease Voice Screening Platform.

---

## Important Medical and Educational Disclaimer

> [!WARNING]
> **FOR GENERAL EDUCATIONAL AND CLINICAL DECISION SUPPORT REFERENCE ONLY.**
> The documents in this knowledge base are intended strictly for educational purposes and non-diagnostic clinical decision support context. They do not constitute formal clinical practice guidelines, do not establish medical standards of care, and are not a substitute for a comprehensive review of peer-reviewed clinical literature or direct evaluation by a licensed physician, neurologist, or speech-language pathologist.

---

## Curation Methodology and Principles

1. **Original Synthesis (Paraphrased & Attributed):**
   In strict compliance with intellectual property ethics, all documents have been authored originally in the project's own words. No content has been scraped or reproduced verbatim from external sources.
2. **Authoritative Medical Grounding:**
   The factual substance reflects consensus findings from leading neurological research institutions (e.g., NIH / NINDS), established patient advocacy organizations (e.g., Parkinson's Foundation), regulatory frameworks (FDA Digital Health Center of Excellence), and peer-reviewed movement disorders literature.
3. **Strict Non-Diagnostic Terminology:**
   In adherence to safe clinical decision support design, documents emphasize that acoustic algorithms provide preliminary risk stratification signals rather than definitive diagnoses.
4. **Structured Metadata Schema:**
   Every Markdown document in this corpus contains complete YAML frontmatter:
   ```yaml
   ---
   title: "Document Title"
   source_name: "Authoritative Source Organization"
   source_url: "https://verified-url.example.org" # Omitted if unverifiable
   topic_tags:
     - "tag1"
     - "tag2"
   ---
   ```

---

## Corpus Inventory

| File | Title | Primary Source | Verified URL |
| :--- | :--- | :--- | :--- |
| [`01_what_is_parkinsons_disease.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/01_what_is_parkinsons_disease.md) | Understanding Parkinson's Disease: Neurological Overview | NIH / NINDS | [ninds.nih.gov/.../parkinsons-disease](https://www.ninds.nih.gov/health-information/disorders/parkinsons-disease) |
| [`02_voice_and_speech_changes_in_pd.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/02_voice_and_speech_changes_in_pd.md) | Vocal and Speech Manifestations of Parkinson's Disease | Parkinson's Foundation | [parkinson.org/.../speech-swallowing](https://www.parkinson.org/understanding-parkinsons/non-movement-symptoms/speech-swallowing) |
| [`03_hypophonia_and_prosodic_flattening.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/03_hypophonia_and_prosodic_flattening.md) | Hypophonia and Monotone Pitch in Parkinsonian Speech | Parkinson's Foundation | [parkinson.org/.../speech-swallowing](https://www.parkinson.org/understanding-parkinsons/non-movement-symptoms/speech-swallowing) |
| [`04_articulation_and_speech_rhythm.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/04_articulation_and_speech_rhythm.md) | Articulatory Precision and Speech Rhythm Changes | Clinical Consensus on Acoustic Dysarthria | *(Peer-reviewed movement disorders consensus)* |
| [`05_ai_voice_screening_capabilities.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/05_ai_voice_screening_capabilities.md) | Capabilities of AI-Assisted Acoustic Voice Screening | Digital Speech Biomarker Research Review | *(Computational acoustics literature)* |
| [`06_ai_voice_screening_limitations.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/06_ai_voice_screening_limitations.md) | Technical and Clinical Limitations of Acoustic AI Screening | FDA Digital Health Center of Excellence | [fda.gov/.../digital-health-center-excellence](https://www.fda.gov/medical-devices/digital-health-center-excellence) |
| [`07_importance_of_clinical_neurological_evaluation.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/07_importance_of_clinical_neurological_evaluation.md) | The Critical Role of Formal Clinical Neurological Evaluation | NIH / NINDS | [ninds.nih.gov/.../parkinsons-disease](https://www.ninds.nih.gov/health-information/disorders/parkinsons-disease) |
| [`08_understanding_screening_probabilities_and_thresholds.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/08_understanding_screening_probabilities_and_thresholds.md) | Interpreting Acoustic Screening Probability Scores and Risk Tiers | Clinical Decision Support & Biostatistics | *(Biostatistical risk stratification principles)* |
| [`09_speech_therapy_and_communication_interventions.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/09_speech_therapy_and_communication_interventions.md) | Speech-Language Pathology and Evidence-Based Voice Therapies | Parkinson's Foundation | [parkinson.org/.../speech-therapy](https://www.parkinson.org/living-with-parkinsons/treatment/speech-therapy) |
| [`10_ethical_and_privacy_principles_in_voice_biomarkers.md`](file:///Users/eshwarsaielugam/Documents/prototype/rag/knowledge_base/10_ethical_and_privacy_principles_in_voice_biomarkers.md) | Ethical Considerations and Data Privacy in Acoustic Health Screening | Digital Health Ethics Guidelines | *(Medical AI data ethics standards)* |

---

## Authoritative References Consulted

1. **National Institute of Neurological Disorders and Stroke (NINDS):**
   - *Parkinson's Disease Information Page*, National Institutes of Health. Available at: `https://www.ninds.nih.gov/health-information/disorders/parkinsons-disease`
2. **Parkinson's Foundation:**
   - *Speech and Swallowing Symptoms in Parkinson's*. Available at: `https://www.parkinson.org/understanding-parkinsons/non-movement-symptoms/speech-swallowing`
   - *Speech Therapy for Parkinson's Disease*. Available at: `https://www.parkinson.org/living-with-parkinsons/treatment/speech-therapy`
3. **U.S. Food and Drug Administration (FDA):**
   - *Digital Health Center of Excellence*, Center for Devices and Radiological Health. Available at: `https://www.fda.gov/medical-devices/digital-health-center-excellence`
4. **Peer-Reviewed Scientific Literature:**
   - Rusz, J., et al. (2021). "Guidelines for speech recording and acoustic analyses in dysarthrias of movement disorders." *Movement Disorders*, 36(4), 803–814.
   - Rusz, J., et al. (2024). "From prodromal stages to clinical trials: The promise of digital speech biomarkers in Parkinson's disease." *Neuroscience & Biobehavioral Reviews*.
   - Duffy, J. R. (2019). *Motor Speech Disorders: Substrates, Differential Diagnosis, and Management* (3rd ed.). Elsevier.
