"""One-time converter from a raw HDF5 collection to LeRobot v2.1 layout.

Mirrors the semantics of process_dataset_with_annotations in
backend/lerobot_converter.py (same trimming rules and the same SSE event
vocabulary: phase / episode_skip / episode_done) but writes the dataset
files directly instead of going through the LeRobotDataset API:

    meta/info.json, meta/episodes.jsonl, meta/tasks.jsonl,
    meta/subtasks.jsonl, meta/stats.json
    data/chunk-XXX/episode_XXXXXX.parquet
    videos/observation.images.<cam>/chunk-XXX/file-XXXXXX.mp4

Videos are reused from the raw collection's per-episode mp4s (symlinked,
copied when copy_videos=True) and are only ffmpeg-trimmed when the episode
was trimmed by an annotated task range; HDF5 image datasets are skipped
entirely.
"""

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Callable

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from . import raw_dataset as raw_ds
from .raw_dataset import RawDatasetInfo

TRIMMED_EXPORT_VIDEO_CACHE = Path(
    os.environ.get("LEROBOT_ANNOTATE_CACHE", "/tmp/lerobot_annotate_cache")
) / "trimmed_export_videos"

CHUNK_SIZE = 1000
CODEBASE_VERSION = "v2.1"

VECTOR_FEATURES = ("observation.state", "action")
SCALAR_FEATURES = (
    "timestamp",
    "frame_index",
    "episode_index",
    "index",
    "task_index",
    "subtask_index",
    "task_index_high_level",
)


def _get_ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _get_task_time_ranges(ann_tasks: list[dict[str, Any]]) -> list[tuple[float, float]]:
    ranges = []
    for task in ann_tasks:
        start = task.get("start")
        end = task.get("end")
        if start is not None and end is not None and start < end:
            ranges.append((float(start), float(end)))
    return sorted(ranges, key=lambda x: x[0])


def _make_task_key(seg: dict[str, Any]) -> str:
    return "||".join(
        [
            seg.get("user_prompt", ""),
            seg.get("robot_utterance", ""),
            seg.get("skill", ""),
            seg.get("scenario_type", ""),
            seg.get("response_type", ""),
        ]
    )


def _find_segment_index(
    timestamp: float,
    segments: list[dict[str, Any]],
    mapping: dict[str, int],
    label_key: str,
) -> int:
    """Same matching logic as assign_indices_by_segments in app.py."""
    if not segments:
        return -1
    segments_sorted = sorted(segments, key=lambda s: float(s.get("start", 0)))
    for seg_idx, seg in enumerate(segments_sorted):
        start = float(seg.get("start", 0))
        end = float(seg.get("end", 0))
        is_last = seg_idx == len(segments_sorted) - 1
        if (start <= timestamp < end) or (is_last and timestamp <= end):
            label = _make_task_key(seg) if label_key == "task_key" else seg.get(label_key, "")
            return mapping.get(label, -1)
    return -1


def _probe_video(path: Path) -> dict[str, Any] | None:
    ffprobe = _get_ffmpeg_exe()
    ffprobe = ffprobe.replace("ffmpeg", "ffprobe") if "ffmpeg" in ffprobe else "ffprobe"
    try:
        result = subprocess.run(
            [
                ffprobe,
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=r_frame_rate,width,height,codec_name,pix_fmt",
                "-of", "json",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return None
        streams = json.loads(result.stdout).get("streams") or []
        if not streams:
            return None
        s = streams[0]
        num, denom = (s.get("r_frame_rate") or "30/1").split("/")
        fps = float(num) / float(denom or 1)
        return {
            "video.fps": fps,
            "video.height": int(s.get("height", 0)),
            "video.width": int(s.get("width", 0)),
            "video.channels": 3,
            "video.codec": s.get("codec_name", "h264"),
            "video.pix_fmt": s.get("pix_fmt", "yuv420p"),
            "video.is_depth_map": False,
            "has_audio": False,
        }
    except Exception as e:
        print(f"[Export] ffprobe failed for {path}: {e}")
        return None


def _trimmed_video_cache_path(video_path: Path, start_time: float, end_time: float) -> Path:
    key = f"{video_path}_{start_time:.3f}_{end_time:.3f}"
    hash_key = hashlib.md5(key.encode()).hexdigest()[:16]
    return TRIMMED_EXPORT_VIDEO_CACHE / f"{video_path.stem}_{hash_key}.mp4"


def _video_start_time(path: Path) -> float:
    try:
        ffprobe = _get_ffmpeg_exe()
        ffprobe = ffprobe.replace("ffmpeg", "ffprobe") if "ffmpeg" in ffprobe else "ffprobe"
        result = subprocess.run(
            [
                ffprobe,
                "-v", "error",
                "-show_entries", "format=start_time",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip() not in ("", "N/A"):
            return float(result.stdout.strip())
    except Exception:
        pass
    return 0.0


def _trim_video_for_export(src: Path, start: float, end: float, fps: float) -> Path | None:
    """Produce a frame-aligned trim of [start, end] seconds in the export cache.

    A stream-copy trim is instant but only aligns when the source has frequent
    keyframes; long-GOP sources (single keyframe at t=0) come out with a
    shifted timeline, so the result is verified and re-encoded when needed.
    Returns the cached trimmed file, or None if trimming failed entirely.
    """
    TRIMMED_EXPORT_VIDEO_CACHE.mkdir(parents=True, exist_ok=True)
    cache_path = _trimmed_video_cache_path(src, start, end)
    tolerance = 0.5 / fps if fps else 0.017
    if cache_path.exists() and _video_start_time(cache_path) <= tolerance:
        return cache_path

    from .app import trim_video_with_ffmpeg

    if (
        trim_video_with_ffmpeg(src, cache_path, start, end)
        and _video_start_time(cache_path) <= tolerance
    ):
        return cache_path

    ffmpeg_exe = _get_ffmpeg_exe()
    tmp_path = cache_path.with_name(cache_path.name + ".tmp.mp4")
    try:
        result = subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-ss", str(start),
                "-i", str(src),
                "-t", str(end - start),
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-an",
                str(tmp_path),
            ],
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            print(f"[Export] FFmpeg re-encode error: {result.stderr[-500:]}")
        elif tmp_path.exists() and _video_start_time(tmp_path) <= tolerance:
            tmp_path.replace(cache_path)
            return cache_path
    except Exception as e:
        print(f"[Export] FFmpeg re-encode failed for {src}: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    return cache_path if cache_path.exists() else None


def _write_episode_parquet(path: Path, columns: dict[str, np.ndarray], n_state: int, n_action: int) -> None:
    schema = pa.schema(
        [
            ("observation.state", pa.list_(pa.float32())),
            ("action", pa.list_(pa.float32())),
            ("timestamp", pa.list_(pa.float32())),
            ("frame_index", pa.list_(pa.int64())),
            ("episode_index", pa.list_(pa.int64())),
            ("index", pa.list_(pa.int64())),
            ("task_index", pa.list_(pa.int64())),
            ("subtask_index", pa.list_(pa.int64())),
            ("task_index_high_level", pa.list_(pa.int64())),
        ]
    )
    arrays = {
        "observation.state": pa.array(list(columns["observation.state"]), type=pa.list_(pa.float32())),
        "action": pa.array(list(columns["action"]), type=pa.list_(pa.float32())),
    }
    for name in SCALAR_FEATURES:
        elem_type = pa.float32() if name == "timestamp" else pa.int64()
        arrays[name] = pa.array(list(columns[name].reshape(-1, 1)), type=pa.list_(elem_type))
    table = pa.Table.from_pydict(arrays, schema=schema)
    pq.write_table(table, path, compression="snappy")


class _StatsAccumulator:
    """Streaming per-dimension mean/std/min/max over kept frames."""

    def __init__(self) -> None:
        self.count = 0
        self.sums: dict[str, np.ndarray] = {}
        self.sumsqs: dict[str, np.ndarray] = {}
        self.mins: dict[str, np.ndarray] = {}
        self.maxs: dict[str, np.ndarray] = {}

    def update(self, name: str, arr: np.ndarray) -> None:
        arr = np.asarray(arr, dtype=np.float64).reshape(-1, 1) if arr.ndim == 1 else np.asarray(arr, dtype=np.float64)
        if name not in self.sums:
            self.sums[name] = np.zeros(arr.shape[1])
            self.sumsqs[name] = np.zeros(arr.shape[1])
            self.mins[name] = np.full(arr.shape[1], np.inf)
            self.maxs[name] = np.full(arr.shape[1], -np.inf)
        self.count += arr.shape[0]
        self.sums[name] += arr.sum(axis=0)
        self.sumsqs[name] += (arr**2).sum(axis=0)
        self.mins[name] = np.minimum(self.mins[name], arr.min(axis=0))
        self.maxs[name] = np.maximum(self.maxs[name], arr.max(axis=0))

    def finalize(self) -> dict[str, Any]:
        stats: dict[str, Any] = {}
        for name in self.sums:
            count = max(self.count, 1)
            mean = self.sums[name] / count
            var = np.maximum(self.sumsqs[name] / count - mean**2, 0.0)
            std = np.sqrt(var)

            def as_stat(values: np.ndarray) -> Any:
                return [float(v) for v in values] if values.size > 1 else float(values[0])

            stats[name] = {
                "mean": as_stat(mean),
                "std": as_stat(std),
                "min": as_stat(self.mins[name]),
                "max": as_stat(self.maxs[name]),
            }
        return stats


def convert_raw_to_lerobot(
    raw_info: RawDatasetInfo,
    annotations: dict[int, Any],
    deleted_episodes: set[int],
    output_dir: Path,
    copy_videos: bool = False,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Convert a raw HDF5 collection into a LeRobot v2.1 dataset on disk.

    Args:
        raw_info: Scanned raw collection (see raw_dataset.scan_raw_dataset).
        annotations: Dict mapping episode_index to EpisodeAnnotations.
        deleted_episodes: Set of episode indices to delete entirely.
        output_dir: Destination dataset root (created fresh).
        copy_videos: Copy mp4 files instead of symlinking them.
        progress_callback: Receives the SSE-compatible progress events.

    Returns:
        Summary dict with totals (same keys as the LeRobot converter).
    """
    output_dir = Path(output_dir)

    def _emit(ev: dict[str, Any]) -> None:
        if progress_callback is not None:
            try:
                progress_callback(ev)
            except Exception:
                pass

    episodes = raw_info.episodes
    fps = float(raw_info.fps)
    _emit({"type": "phase", "phase": "loading"})

    # Label -> index maps, mirroring build_*_dataframe in app.py.
    subtask_map = {
        label: idx
        for idx, label in enumerate(
            sorted(
                {
                    seg["label"]
                    for ann in annotations.values()
                    for seg in (ann.subtasks if ann else [])
                    if seg.get("label")
                }
            )
        )
    }
    task_map = {
        name: idx
        for idx, name in enumerate(
            sorted(
                {
                    seg["name"]
                    for ann in annotations.values()
                    for seg in (ann.tasks if ann else [])
                    if seg.get("name")
                }
            )
        )
    }
    high_level_map: dict[str, int] = {}
    for ann in annotations.values():
        for seg in (ann.high_levels if ann else []):
            key = _make_task_key(seg)
            if key not in high_level_map:
                high_level_map[key] = len(high_level_map)

    if not episodes:
        raise RuntimeError("Raw collection has no episodes")

    # Reference state/action schema from the scan (union across episodes;
    # missing or zero-width datasets read back as zeros so all parquets share
    # one schema).
    state_specs = raw_info.state_specs
    action_specs = raw_info.action_specs
    state_names = raw_ds.spec_dims(state_specs)
    action_names = raw_ds.spec_dims(action_specs)
    n_state = len(state_names)
    n_action = len(action_names)

    # Video features: raw keys like 'rs/cam_high' become LeRobot keys
    # 'observation.images.rs_cam_high' (no '/' allowed in feature names).
    video_keys = raw_info.video_keys
    lerobot_video_keys = {vk: "observation.images." + vk.replace("/", "_") for vk in video_keys}
    video_infos: dict[str, dict[str, Any]] = {}
    for vk, lr_key in lerobot_video_keys.items():
        info = None
        for ep in episodes:
            try:
                src = raw_ds.get_episode_video_path(raw_info, ep.episode_index, vk)
            except (FileNotFoundError, IndexError):
                continue
            info = _probe_video(src)
            break
        video_infos[lr_key] = info or {
            "video.fps": fps,
            "video.height": 0,
            "video.width": 0,
            "video.channels": 3,
            "video.codec": "h264",
            "video.pix_fmt": "yuv420p",
            "video.is_depth_map": False,
            "has_audio": False,
        }

    if output_dir.exists():
        print(f"[Export] Removing existing output dir {output_dir}")
        shutil.rmtree(output_dir)
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True)
    meta_dir = output_dir / "meta"
    meta_dir.mkdir(parents=True)

    stats_acc = _StatsAccumulator()
    episodes_records: list[dict[str, Any]] = []
    episode_tasks: set[str] = set()
    kept_episodes = 0
    total_frames = 0
    videos_written = 0
    global_index = 0

    _emit({"type": "phase", "phase": "processing", "total_episodes": len(episodes)})

    for ep in episodes:
        ep_idx = ep.episode_index
        ep_len = ep.length
        if ep_idx in deleted_episodes:
            print(f"[Export] Skipping deleted episode {ep_idx}")
            _emit(
                {
                    "type": "episode_skip",
                    "ep": int(ep_idx),
                    "reason": "deleted",
                    "total_kept": kept_episodes,
                    "total_frames": total_frames,
                }
            )
            continue

        ann = annotations.get(int(ep_idx))
        ann_tasks = ann.tasks if ann and ann.tasks else []
        time_ranges = _get_task_time_ranges(ann_tasks)
        episode_task = next((t["name"] for t in ann_tasks if t.get("name")), None) or ep.task_name or "default"

        state, action, n_frames = raw_ds.read_state_action_with_count(
            ep.path, state_specs, action_specs
        )
        kept_ids = [
            fi
            for fi in range(n_frames)
            if not time_ranges or any(s <= fi / fps <= e for s, e in time_ranges)
        ]
        if not kept_ids:
            print(f"[Export] Warning: Episode {ep_idx} empty after trimming, skipping")
            _emit(
                {
                    "type": "episode_skip",
                    "ep": int(ep_idx),
                    "reason": "empty",
                    "total_kept": kept_episodes,
                    "total_frames": total_frames,
                }
            )
            continue

        new_ep = kept_episodes
        chunk = new_ep // CHUNK_SIZE
        kept_count = len(kept_ids)

        # Annotation indices use the original (pre-trim) frame timestamps so
        # they match the segments drawn in the UI; the written timestamps are
        # re-indexed from zero, matching the LeRobot converter behavior.
        orig_ts = np.asarray(kept_ids, dtype=np.float64) / fps
        subtask_index = np.asarray(
            [_find_segment_index(t, ann.subtasks if ann else [], subtask_map, "label") for t in orig_ts],
            dtype=np.int64,
        )
        task_index = np.asarray(
            [_find_segment_index(t, ann.tasks if ann else [], task_map, "name") for t in orig_ts],
            dtype=np.int64,
        )
        task_index_high_level = np.asarray(
            [
                _find_segment_index(t, ann.high_levels if ann else [], high_level_map, "task_key")
                for t in orig_ts
            ],
            dtype=np.int64,
        )

        kept_state = state[kept_ids]
        kept_action = action[kept_ids]
        timestamp = (np.arange(kept_count, dtype=np.float64) / fps).astype(np.float32)
        index = np.arange(global_index, global_index + kept_count, dtype=np.int64)

        columns = {
            "observation.state": kept_state,
            "action": kept_action,
            "timestamp": timestamp,
            "frame_index": np.arange(kept_count, dtype=np.int64),
            "episode_index": np.full(kept_count, new_ep, dtype=np.int64),
            "index": index,
            "task_index": task_index,
            "subtask_index": subtask_index,
            "task_index_high_level": task_index_high_level,
        }

        parquet_rel = f"data/chunk-{chunk:03d}/episode_{new_ep:06d}.parquet"
        parquet_path = output_dir / parquet_rel
        parquet_path.parent.mkdir(parents=True, exist_ok=True)
        _write_episode_parquet(parquet_path, columns, n_state, n_action)

        # Videos: reuse the source mp4; trim only when the episode was trimmed.
        ep_record: dict[str, Any] = {
            "episode_index": new_ep,
            "tasks": [episode_task],
            "length": kept_count,
        }
        for vk, lr_key in lerobot_video_keys.items():
            try:
                src = raw_ds.get_episode_video_path(raw_info, ep_idx, vk)
            except FileNotFoundError:
                print(f"[Export] Warning: missing video {vk} for episode {ep_idx}")
                continue
            if _probe_video(src) is None:
                print(f"[Export] Warning: unreadable/corrupt video {src}, skipping")
                continue
            must_materialize = False
            if time_ranges:
                start = min(s for s, _ in time_ranges)
                end = max(e for _, e in time_ranges)
                trimmed = _trim_video_for_export(src, start, end, fps)
                if trimmed is not None:
                    # Trimmed files live in a cache dir that may be evicted,
                    # so they are always copied into the output dataset.
                    src_use = trimmed
                    must_materialize = True
                else:
                    print(f"[Export] Warning: trim failed for {src}, using full video")
                    src_use = src
            else:
                src_use = src

            dst_dir = output_dir / "videos" / lr_key / f"chunk-{chunk:03d}"
            dst_dir.mkdir(parents=True, exist_ok=True)
            dst = dst_dir / f"file-{new_ep:06d}.mp4"
            if copy_videos or must_materialize:
                shutil.copy2(src_use, dst)
            else:
                try:
                    os.symlink(src_use.resolve(), dst)
                except OSError:
                    shutil.copy2(src_use, dst)
            ep_record[f"videos/{lr_key}/chunk_index"] = chunk
            ep_record[f"videos/{lr_key}/file_index"] = new_ep
            videos_written += 1

        episodes_records.append(ep_record)
        episode_tasks.add(episode_task)
        kept_episodes += 1
        total_frames += kept_count
        global_index += kept_count

        stats_acc.update("observation.state", kept_state)
        stats_acc.update("action", kept_action)
        stats_acc.update("timestamp", timestamp)
        for name in ("frame_index", "episode_index", "index", "task_index", "subtask_index", "task_index_high_level"):
            stats_acc.update(name, columns[name])

        print(
            f"[Export] Episode {ep_idx} -> new ep {new_ep} "
            f"({kept_count}/{ep_len} frames kept, task='{episode_task}')"
        )
        _emit(
            {
                "type": "episode_done",
                "ep": int(ep_idx),
                "new_ep": int(new_ep),
                "kept": int(kept_count),
                "ep_len": int(ep_len),
                "task": episode_task,
                "total_kept": kept_episodes,
                "total_frames": total_frames,
            }
        )

    if kept_episodes == 0:
        raise RuntimeError("All episodes were deleted or resulted in empty data after trimming")

    _emit({"type": "phase", "phase": "consolidating"})
    print("[Export] Writing metadata and computing statistics...")

    # tasks.jsonl: annotation task names get the indices used by the per-frame
    # task_index column; episode-level tasks (HDF5 task_name / 'default') are
    # appended after them.
    task_rows = [{"task": name, "task_index": idx} for name, idx in task_map.items()]
    next_task_index = len(task_map)
    for name in sorted(episode_tasks):
        if name not in task_map:
            task_rows.append({"task": name, "task_index": next_task_index})
            next_task_index += 1

    with open(meta_dir / "tasks.jsonl", "w") as f:
        for rec in task_rows:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    with open(meta_dir / "episodes.jsonl", "w") as f:
        for rec in episodes_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    if subtask_map:
        with open(meta_dir / "subtasks.jsonl", "w") as f:
            for label, idx in subtask_map.items():
                f.write(json.dumps({"subtask": label, "subtask_index": idx}, ensure_ascii=False) + "\n")

    features: dict[str, Any] = {
        "observation.state": {"dtype": "float32", "shape": [n_state], "names": state_names},
        "action": {"dtype": "float32", "shape": [n_action], "names": action_names},
        "timestamp": {"dtype": "float32", "shape": [1], "names": None},
        "frame_index": {"dtype": "int64", "shape": [1], "names": None},
        "episode_index": {"dtype": "int64", "shape": [1], "names": None},
        "index": {"dtype": "int64", "shape": [1], "names": None},
        "task_index": {"dtype": "int64", "shape": [1], "names": None},
        "subtask_index": {"dtype": "int64", "shape": [1], "names": None},
        "task_index_high_level": {"dtype": "int64", "shape": [1], "names": None},
    }
    for vk, lr_key in lerobot_video_keys.items():
        vinfo = video_infos[lr_key]
        shape = [vinfo.get("video.height", 0), vinfo.get("video.width", 0), 3]
        features[lr_key] = {"dtype": "video", "shape": shape, "names": None, "info": vinfo}

    info = {
        "codebase_version": CODEBASE_VERSION,
        "robot_type": None,
        "total_episodes": kept_episodes,
        "total_frames": total_frames,
        "total_tasks": len(task_rows),
        "total_videos": videos_written,
        "total_chunks": (kept_episodes - 1) // CHUNK_SIZE + 1,
        "chunks_size": CHUNK_SIZE,
        "fps": int(fps) if fps.is_integer() else fps,
        "splits": {"train": f"0:{kept_episodes}"},
        "data_path": "data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet",
        "video_path": "videos/{video_key}/chunk-{episode_chunk:03d}/file-{episode_index:06d}.mp4",
        "features": features,
    }
    (meta_dir / "info.json").write_text(json.dumps(info, indent=2))

    (meta_dir / "stats.json").write_text(json.dumps(stats_acc.finalize(), indent=2))

    task_names_sorted = sorted(t["task"] for t in task_rows)
    summary = {
        "output_dir": str(output_dir),
        "total_episodes": kept_episodes,
        "total_frames": total_frames,
        "total_tasks": len(task_names_sorted),
        "tasks": task_names_sorted,
        "total_subtasks": len(subtask_map),
        "total_high_level_tasks": len(high_level_map),
        "deleted_episodes": sorted(deleted_episodes),
        "original_episodes": len(episodes),
        "kept_episodes": kept_episodes,
    }
    print("[Export] Raw conversion complete!")
    print(f"  Original: {summary['original_episodes']} episodes")
    print(f"  Deleted: {len(deleted_episodes)} episodes")
    print(
        f"  Result: {kept_episodes} episodes, {total_frames} frames, "
        f"{len(task_names_sorted)} tasks"
    )
    return summary
