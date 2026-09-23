#!/usr/bin/env python3
"""Batch evaluation script for Parkinson's Voice Screening platform test dataset.

Runs all curated test samples through the running FastAPI prediction endpoint
and outputs an evaluation performance table.
"""

import csv
import os
import sys
import time
import requests

API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000/api/v1/predict")
MANIFEST_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "test_samples",
    "manifest.csv",
)
BASE_DIR = os.path.dirname(MANIFEST_PATH)


def check_api_online():
    """Verify backend API is reachable."""
    health_url = API_URL.rsplit("/", 1)[0] + "/health"
    try:
        r = requests.get(health_url, timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def run_evaluation():
    print("=" * 115)
    print("Parkinson's Disease Voice Screening — Test Dataset Evaluation")
    print("=" * 115)

    if not check_api_online():
        print(f"\n[ERROR] Backend service is not reachable at {API_URL}.")
        print("Please start the backend server with: .venv/bin/uvicorn backend.app.main:app --port 8000\n")
        sys.exit(1)

    if not os.path.exists(MANIFEST_PATH):
        print(f"\n[ERROR] Manifest not found at: {MANIFEST_PATH}\n")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        samples = list(reader)

    print(f"\nFound {len(samples)} curated evaluation samples in {BASE_DIR}.\n")
    header_fmt = "{:<35} | {:<32} | {:<22} | {:<22} | {:<8} | {:<6}"
    row_fmt = "{:<35} | {:<32} | {:<22} | {:<22} | {:<8.4f} | {:<6}"
    
    print(header_fmt.format("Sample File", "Task / Cohort", "Expected Outcome", "Model Prediction", "Score", "Result"))
    print("-" * 135)

    correct_count = 0
    start_time = time.perf_counter()

    for item in samples:
        rel_path = item["filename"]
        abs_path = os.path.join(BASE_DIR, rel_path)
        expected = item["expected_outcome"]

        if not os.path.exists(abs_path):
            print(f"[MISSING] {rel_path}")
            continue

        with open(abs_path, "rb") as audio_file:
            response = requests.post(
                API_URL,
                files={"file": (os.path.basename(abs_path), audio_file, "audio/wav")},
                data={"source": "upload", "test_id": f"EVAL-{os.path.basename(rel_path)}"},
                timeout=10.0,
            )

        if response.status_code != 200:
            print(f"[ERROR {response.status_code}] {rel_path}: {response.text}")
            continue

        res_data = response.json()
        prediction = res_data.get("prediction", "unknown")
        probability = res_data.get("probability", 0.0)

        is_match = prediction == expected
        if is_match:
            correct_count += 1

        match_label = "PASS" if is_match else "FAIL"
        cohort_summary = f"{item['group'][:18]} ({item['task_type'][:10]})"
        print(row_fmt.format(rel_path, cohort_summary, expected, prediction, probability, match_label))

    total_time = time.perf_counter() - start_time
    accuracy = (correct_count / len(samples)) * 100.0 if samples else 0.0

    print("-" * 135)
    print(f"Summary: {correct_count}/{len(samples)} predictions matched ground truth.")
    print(f"Benchmark Test Accuracy: {accuracy:.1f}% | Total Evaluation Time: {total_time:.2f}s ({total_time/len(samples):.2f}s/sample)")
    print("=" * 115)


if __name__ == "__main__":
    run_evaluation()
