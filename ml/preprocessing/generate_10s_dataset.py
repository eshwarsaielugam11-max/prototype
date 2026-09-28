"""Generate 10-Second Windows, Metadata, and Feature Tensors for IPVS & MDVR-KCL.

Implements the multi-task 10-second data pipeline:
- Windowing: 10.0s sliding windows with 5.0s stride for trimmed >= 10.0s
- Repeat-pad: For 8.0s <= trimmed < 10.0s (max padding <= 20%)
- Filtering: Excludes recordings with trimmed duration < 8.0s
- Subject-level stratified splits (IPVS from split_manifest.json, MDVR-KCL seed 42)
- Zero subject overlap between train, val, and test splits
- Frozen WavLM-Base-Plus float16 feature caching ((499, 768))
- Strict metadata schema:
  window_path, feature_path, subject_id, dataset, task_type, label, split, window_start_sec, padded_fraction
"""

import argparse
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd
import soundfile as sf
import torch
from tqdm import tqdm
from transformers import WavLMModel

from ml.preprocessing.audio_preprocessing import PreprocessConfig, extract_windows

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ten_second_data")

# Fixed Subject Splitting Definition for MDVR-KCL (seed 42 stratified by subject)
MDVR_SPLITS: Dict[str, List[str]] = {
    "train": [
        # 15 Healthy Control
        "ID00", "ID28", "ID25", "ID01", "ID12", "ID09", "ID19", "ID05", "ID31", "ID26", "ID22", "ID03", "ID14", "ID36", "ID08",
        # 11 Parkinson's Disease
        "ID18", "ID32", "ID27", "ID07", "ID34", "ID17", "ID06", "ID30", "ID20", "ID16", "ID24"
    ],
    "val": [
        # 3 Healthy Control
        "ID21", "ID11", "ID15",
        # 2 Parkinson's Disease
        "ID33", "ID02"
    ],
    "test": [
        # 3 Healthy Control
        "ID23", "ID35", "ID10",
        # 3 Parkinson's Disease
        "ID13", "ID29", "ID04"
    ]
}


def load_ipvs_split_manifest(manifest_path: Path) -> Dict[str, str]:
    """Load existing subject-to-split mapping for IPVS."""
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    split_map = {}
    for split_name in ["train", "val", "test"]:
        for sid in data[split_name]:
            split_map[sid] = split_name
    return split_map


def get_mdvr_split_map() -> Dict[str, str]:
    """Get subject-to-split mapping for MDVR-KCL."""
    split_map = {}
    for split_name, sids in MDVR_SPLITS.items():
        for sid in sids:
            split_map[sid] = split_name
    return split_map


def discover_ipvs_recordings(ipvs_dir: Path, split_map: Dict[str, str], project_root: Path) -> List[Dict]:
    """Discover and parse IPVS audio files."""
    records = []
    wav_files = sorted(list(ipvs_dir.rglob("*.wav")))
    for wav_path in wav_files:
        parts = wav_path.parts
        try:
            group_idx = next(i for i, p in enumerate(parts) if any(k in p for k in ["Young", "Elderly", "Parkinson"]))
        except StopIteration:
            continue
        group_str = parts[group_idx]
        fname = wav_path.name
        if "Young" in group_str:
            label = 0
            sub_name = parts[group_idx + 1].strip().replace(" ", "_")
            subject_id = f"yhc_{sub_name}"
        elif "Elderly" in group_str:
            label = 0
            sub_name = parts[group_idx + 1].strip().replace(" ", "_")
            subject_id = f"ehc_{sub_name}"
        elif "Parkinson" in group_str:
            label = 1
            batch = parts[group_idx + 1].strip().replace(" ", "_")
            sub_name = parts[group_idx + 2].strip().replace(" ", "_")
            subject_id = f"pd_{batch}_{sub_name}"
        else:
            continue

        fname_upper = fname.upper()
        if fname_upper.startswith(("VA", "VE", "VI", "VO", "VU")):
            task_type = "vowel_sustain"
        elif fname_upper.startswith("PR"):
            task_type = "reading_passage"
        elif fname_upper.startswith(("B1", "B2", "D1", "D2", "FB1")):
            task_type = "syllable_repetition"
        else:
            task_type = "syllable_repetition"

        if subject_id not in split_map:
            continue

        records.append({
            "source_path": wav_path,
            "subject_id": subject_id,
            "dataset": "ipvs",
            "task_type": task_type,
            "label": label,
            "split": split_map[subject_id],
            "file_stem": wav_path.stem
        })
    return records


def discover_mdvr_recordings(mdvr_read_text_dir: Path, split_map: Dict[str, str], project_root: Path) -> List[Dict]:
    """Discover and parse MDVR-KCL ReadText recordings (excluding SpontaneousDialogue)."""
    records = []
    for cls_folder, label in [("HC", 0), ("PD", 1)]:
        folder = mdvr_read_text_dir / cls_folder
        if not folder.exists():
            continue
        for wav_path in sorted(list(folder.glob("*.wav"))):
            sid = wav_path.stem.split("_")[0]
            if sid not in split_map:
                logger.warning("MDVR subject %s not found in split map, skipping.", sid)
                continue
            records.append({
                "source_path": wav_path,
                "subject_id": sid,
                "dataset": "mdvr_kcl",
                "task_type": "reading_passage",
                "label": label,
                "split": split_map[sid],
                "file_stem": wav_path.stem
            })
    return records


def verify_subject_leakage(train_subjs: Set[str], val_subjs: Set[str], test_subjs: Set[str]) -> None:
    """Verify strictly zero subject overlap across splits."""
    tv_overlap = train_subjs & val_subjs
    tt_overlap = train_subjs & test_subjs
    vt_overlap = val_subjs & test_subjs

    assert len(tv_overlap) == 0, f"Subject leakage detected between Train and Val: {tv_overlap}"
    assert len(tt_overlap) == 0, f"Subject leakage detected between Train and Test: {tt_overlap}"
    assert len(vt_overlap) == 0, f"Subject leakage detected between Val and Test: {vt_overlap}"
    logger.info("PASS: Zero subject leakage across all splits.")


def process_audio_windows(
    recordings: List[Dict],
    config: PreprocessConfig,
    output_audio_dir: Path,
    output_features_dir: Path,
    project_root: Path,
    skip_existing: bool = True
) -> pd.DataFrame:
    """Extract 10s audio windows and construct metadata dataframe."""
    output_audio_dir.mkdir(parents=True, exist_ok=True)
    output_features_dir.mkdir(parents=True, exist_ok=True)

    metadata_rows = []
    excluded_count = 0

    for rec in tqdm(recordings, desc="Extracting 10s Windows"):
        try:
            audio, sr = sf.read(str(rec["source_path"]))
        except Exception as e:
            logger.warning("Failed to read %s: %s", rec["source_path"], e)
            continue

        windows = extract_windows(audio, sr, config)
        if not windows:
            excluded_count += 1
            continue

        subj_dir = output_audio_dir / rec["split"] / rec["subject_id"]
        feat_subj_dir = output_features_dir / rec["split"] / rec["subject_id"]
        subj_dir.mkdir(parents=True, exist_ok=True)
        feat_subj_dir.mkdir(parents=True, exist_ok=True)

        for idx, (win_arr, start_sec, pad_frac) in enumerate(windows):
            win_name = f"{rec['file_stem']}_w{idx:03d}_{start_sec:.1f}s.wav"
            feat_name = f"{rec['file_stem']}_w{idx:03d}_{start_sec:.1f}s.npy"

            win_path = subj_dir / win_name
            feat_path = feat_subj_dir / feat_name

            rel_win_path = win_path.relative_to(project_root).as_posix()
            rel_feat_path = feat_path.relative_to(project_root).as_posix()

            if not (skip_existing and win_path.exists()):
                sf.write(str(win_path), win_arr, config.target_sr, subtype="PCM_16")

            metadata_rows.append({
                "window_path": rel_win_path,
                "feature_path": rel_feat_path,
                "subject_id": rec["subject_id"],
                "dataset": rec["dataset"],
                "task_type": rec["task_type"],
                "label": rec["label"],
                "split": rec["split"],
                "window_start_sec": round(float(start_sec), 2),
                "padded_fraction": round(float(pad_frac), 4)
            })

    logger.info("Extracted %d total 10s windows (excluded %d files < %.1fs).",
                len(metadata_rows), excluded_count, config.min_valid_seconds)

    df_meta = pd.DataFrame(metadata_rows)
    return df_meta


def extract_cached_features(
    df_meta: pd.DataFrame,
    project_root: Path,
    device_str: Optional[str] = None,
    batch_size: int = 16,
    skip_existing: bool = True
) -> None:
    """Extract and cache WavLM float16 features for all windowed audio."""
    if device_str is not None:
        device = torch.device(device_str)
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")

    use_autocast = (device.type == "cuda")
    logger.info("Extracting WavLM features on device: %s (autocast=%s, batch_size=%d)", device, use_autocast, batch_size)

    # Filter for windows that need feature extraction
    pending_indices = []
    for idx, row in df_meta.iterrows():
        feat_p = project_root / row["feature_path"]
        if not (skip_existing and feat_p.exists()):
            pending_indices.append(idx)

    logger.info("Total windows: %d, Already cached: %d, Pending extraction: %d",
                len(df_meta), len(df_meta) - len(pending_indices), len(pending_indices))

    if not pending_indices:
        logger.info("All features already cached. Skipping extraction.")
        return

    # Load frozen WavLM-Base-Plus model
    model_name = "microsoft/wavlm-base-plus"
    logger.info("Loading %s...", model_name)
    model = WavLMModel.from_pretrained(model_name)
    model.to(device)
    model.eval()
    model.requires_grad_(False)

    for i in tqdm(range(0, len(pending_indices), batch_size), desc="Extracting WavLM Features"):
        batch_idx = pending_indices[i : i + batch_size]
        batch_audio = []
        batch_paths = []

        for b_i in batch_idx:
            row = df_meta.iloc[b_i]
            win_p = project_root / row["window_path"]
            feat_p = project_root / row["feature_path"]
            audio_arr, _ = sf.read(str(win_p))
            batch_audio.append(torch.from_numpy(audio_arr).float())
            batch_paths.append(feat_p)

        stacked_audio = torch.stack(batch_audio, dim=0).to(device)

        with torch.no_grad():
            if use_autocast:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    out = model(stacked_audio).last_hidden_state
            else:
                out = model(stacked_audio).last_hidden_state

        feats_np = out.detach().cpu().to(torch.float16).numpy()

        for feat_arr, feat_p in zip(feats_np, batch_paths):
            assert feat_arr.shape == (499, 768), f"Unexpected feature shape: {feat_arr.shape}"
            feat_p.parent.mkdir(parents=True, exist_ok=True)
            np.save(str(feat_p), feat_arr)

    logger.info("Completed feature extraction.")
