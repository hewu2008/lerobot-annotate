"""Standalone CLI runner for the annotated-dataset conversion.

Lets the "Convert to LeRobot" export run manually in the background (e.g.
via nohup / screen) without keeping the web UI open. It mirrors the
server-side behavior of POST /api/convert_to_lerobot:

    python -m backend.convert_cli --dataset-root /path/to/dataset [--output-dir /path/to/out]

Progress events are printed as plain readable lines (flushed immediately),
so `tail -f` on the redirected log file works as a live progress view.
"""

import argparse
import json
import sys
from pathlib import Path
from types import SimpleNamespace

from . import raw_dataset as raw_ds
from .hdf5_exporter import convert_raw_to_lerobot
from .lerobot_converter import process_dataset_with_annotations


def load_annotations(root: Path) -> tuple[dict[int, SimpleNamespace], set[int]]:
    """Load annotations from meta/lerobot_annotations.json (skills.json fallback).

    Mirrors DataManager._load_existing_annotations in app.py.
    """
    annotations: dict[int, SimpleNamespace] = {}
    deleted: set[int] = set()

    ann_path = root / "meta" / "lerobot_annotations.json"
    if ann_path.exists():
        data = json.loads(ann_path.read_text())
        for ep_str, payload in data.get("episodes", {}).items():
            annotations[int(ep_str)] = SimpleNamespace(
                subtasks=payload.get("subtasks", []),
                high_levels=payload.get("high_levels", []),
                tasks=payload.get("tasks", []),
            )
        deleted = {int(e) for e in data.get("deleted_episodes", [])}
        return annotations, deleted

    skills_path = root / "meta" / "skills.json"
    if skills_path.exists():
        data = json.loads(skills_path.read_text())
        for ep_str, payload in data.get("episodes", {}).items():
            subtasks = [
                {"start": s["start"], "end": s["end"], "label": s["name"]}
                for s in payload.get("skills", [])
                if "start" in s and "end" in s
            ]
            annotations[int(ep_str)] = SimpleNamespace(subtasks=subtasks, high_levels=[], tasks=[])
    return annotations, deleted


def print_event(ev: dict) -> None:
    """Render a converter progress event as a single readable log line."""
    t = ev.get("type")
    if t == "phase":
        total = ev.get("total_episodes")
        suffix = f" ({total} episodes)" if total is not None else ""
        print(f"[phase] {ev.get('phase')}{suffix}", flush=True)
    elif t == "episode_skip":
        print(
            f"[ep {ev['ep']}] skipped ({ev['reason']}) — kept {ev['total_kept']} eps,"
            f" {ev['total_frames']} frames",
            flush=True,
        )
    elif t == "episode_done":
        print(
            f"[ep {ev['ep']}] done — kept {ev['kept']}/{ev['ep_len']} frames"
            f" (task: {ev['task']}) — kept {ev['total_kept']} eps, {ev['total_frames']} frames",
            flush=True,
        )
    elif t == "done":
        s = ev.get("summary", {})
        print(
            f"[done] output={s.get('output_dir')} episodes={s.get('total_episodes')}"
            f" frames={s.get('total_frames')} (from {s.get('original_episodes')} original)",
            flush=True,
        )
        tasks = s.get("tasks") or []
        if tasks:
            print(f"[done] tasks: {', '.join(tasks)}", flush=True)
    elif t == "error":
        print(f"[error] {ev.get('detail')}", flush=True)
    else:
        print(json.dumps(ev, ensure_ascii=False), flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert an annotated dataset to the LeRobot standard format"
    )
    parser.add_argument("--dataset-root", required=True, help="Path to the source dataset root")
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Destination directory (default: <dataset>_annotated for raw, <dataset>_processed for LeRobot)",
    )
    args = parser.parse_args()

    root = Path(args.dataset_root).expanduser().resolve()
    if not root.exists():
        print(f"[error] Dataset path not found: {root}", flush=True)
        return 1

    annotations, deleted = load_annotations(root)
    print(f"[info] dataset: {root}", flush=True)
    print(f"[info] annotations: {len(annotations)} episodes, {len(deleted)} deleted", flush=True)

    try:
        if raw_ds.is_raw_collection(root):
            raw_info = raw_ds.scan_raw_dataset(root)
            out_root = (
                Path(args.output_dir).expanduser().resolve()
                if args.output_dir
                else root.parent / f"{root.name}_annotated"
            )
            summary = convert_raw_to_lerobot(
                raw_info=raw_info,
                annotations=annotations,
                deleted_episodes=deleted,
                output_dir=out_root,
                progress_callback=print_event,
            )
        else:
            info_path = root / "meta" / "info.json"
            if not info_path.exists():
                print(f"[error] Missing info.json at {info_path}", flush=True)
                return 1
            info = json.loads(info_path.read_text())
            out_root = (
                Path(args.output_dir).expanduser().resolve()
                if args.output_dir
                else root.parent / f"{root.name}_processed"
            )
            summary = process_dataset_with_annotations(
                dataset_root=root,
                annotations=annotations,
                deleted_episodes=deleted,
                output_dir=out_root,
                info=info,
                progress_callback=print_event,
            )
    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"[error] {e}", flush=True)
        return 1

    print(f"[ok] conversion finished: {summary.get('output_dir', out_root)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
