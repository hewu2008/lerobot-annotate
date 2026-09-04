"""Direct-read adapter for raw HDF5 collection folders.

A raw collection is a task folder containing one subfolder per episode:

    <task_folder>/<uid>/episode.hdf5
    <task_folder>/<uid>/episode_meta.json
    <task_folder>/<uid>/videos/<namespace>/<camera>.mp4

This module scans such a folder, builds the episode table used by the web
UI (an episodes DataFrame plus a synthesized info.json-like dict), and
serves per-episode video paths and trajectories straight from the HDF5
files. Nothing is copied or converted here; conversion to the LeRobot
format happens once, on demand, in backend/hdf5_exporter.py.

HDF5 layout (verified with h5py on sample data):
    timestamp/t                      (N,) float64, ms-epoch timestamps, ~1/fps apart
    observation/state/<group>/<kind> (N, d) float64  (position/velocity/torque/...)
    action/<group>/<kind>            (N, d) float64
    observation/images/<ns>/<cam>/color|depth  (N,) object of jpeg bytes (skipped)
Root attrs include control_frequency (fps) and task_name.
"""

import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

try:
    import h5py
except ImportError:  # pragma: no cover - h5py is expected in the runtime env
    h5py = None

EPISODE_FILE = "episode.hdf5"
META_FILE = "episode_meta.json"
DEFAULT_FPS = 30.0

# Leaf-name shortening for trajectory dimension labels: "arm/position[0]"
# -> "arm.pos[0]". Unmapped leaves keep their full name.
_DIM_SHORT = {"position": "pos", "velocity": "vel", "torque": "trq"}


@dataclass
class RawEpisode:
    episode_index: int
    uid: str
    path: Path
    length: int
    fps: float
    task_name: str | None
    task_id: Any
    collection_ts: int | None
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class RawDatasetInfo:
    root: Path
    fps: float
    episodes: list[RawEpisode]
    video_keys: list[str]
    info: dict[str, Any]
    episodes_df: pd.DataFrame
    # Reference state/action schema: union of the per-episode datasets (path,
    # width) with the max width seen, so every episode maps onto one schema;
    # datasets missing from (or empty in) an episode read back as zeros.
    state_specs: list[tuple[str, int]] = field(default_factory=list)
    action_specs: list[tuple[str, int]] = field(default_factory=list)

    def episode(self, episode_index: int) -> RawEpisode:
        return self.episodes[episode_index]


def _require_h5py() -> None:
    if h5py is None:
        raise RuntimeError("h5py is required for raw dataset support (pip install h5py)")


def is_raw_collection(root: Path) -> bool:
    """Detect a raw collection folder: no meta/info.json, child dirs with episode.hdf5."""
    root = Path(root)
    if (root / "meta" / "info.json").exists():
        return False
    try:
        for child in sorted(root.iterdir()):
            if child.is_dir() and (child / EPISODE_FILE).is_file():
                return True
    except OSError:
        return False
    return False


def _length_from_meta(meta: dict[str, Any]) -> int:
    steps = meta.get("step_index") or []
    ends = [int(s.get("end_frame_id", -1)) for s in steps if isinstance(s, dict)]
    return max(ends) + 1 if ends else 0


def _load_episode(path: Path) -> tuple[RawEpisode, list[tuple[str, int]], list[tuple[str, int]]]:
    meta_path = path / META_FILE
    meta: dict[str, Any] = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
        except Exception as e:
            print(f"[RawDataset] Failed to read {meta_path}: {e}")

    length = None
    fps = DEFAULT_FPS
    task_name = meta.get("task_name")
    task_id = meta.get("task_id")
    state_specs: list[tuple[str, int]] = []
    action_specs: list[tuple[str, int]] = []
    try:
        with h5py.File(path / EPISODE_FILE, "r") as f:
            if "timestamp/t" in f:
                length = int(f["timestamp/t"].shape[0])
            freq = f.attrs.get("control_frequency")
            if freq:
                fps = float(freq)
            task_name = task_name or f.attrs.get("task_name")
            if task_id is None:
                task_id = f.attrs.get("task_id")
            state_specs = _collect_datasets(f, "observation/state", length)
            action_specs = _collect_datasets(f, "action", length)
    except Exception as e:
        print(f"[RawDataset] Failed to read {path / EPISODE_FILE}: {e}")

    if length is None:
        length = _length_from_meta(meta)

    episode = RawEpisode(
        episode_index=0,
        uid=path.name,
        path=path,
        length=int(length),
        fps=fps,
        task_name=str(task_name) if task_name else None,
        task_id=task_id,
        collection_ts=meta.get("collection_ts"),
        meta=meta,
    )
    return episode, state_specs, action_specs


def _discover_video_keys(episodes: list[RawEpisode]) -> list[str]:
    keys: set[str] = set()
    for ep in episodes:
        videos_dir = ep.path / "videos"
        if not videos_dir.is_dir():
            continue
        for mp4 in videos_dir.rglob("*.mp4"):
            rel = mp4.relative_to(videos_dir).as_posix()
            if rel.endswith(".mp4"):
                rel = rel[: -len(".mp4")]
            keys.add(rel)
    return sorted(keys)


def scan_raw_dataset(root: Path) -> RawDatasetInfo:
    """Scan a raw collection folder and build the episodes table + info dict.

    Episodes are ordered by episode_meta.json collection_ts (ms epoch)
    ascending, tie-broken by folder UID; episode_index is assigned 0..N-1.
    """
    _require_h5py()
    root = Path(root)
    episode_dirs = sorted(d for d in root.iterdir() if d.is_dir() and (d / EPISODE_FILE).is_file())
    if not episode_dirs:
        raise FileNotFoundError(f"No episode subfolders with {EPISODE_FILE} found in {root}")

    loaded = [_load_episode(d) for d in episode_dirs]
    episodes = [ep for ep, _, _ in loaded]
    # Drop episodes that could not be read at all (e.g. truncated/aborted
    # recordings with no usable HDF5, no meta, and no videos).
    skipped = [ep for ep in episodes if ep.length <= 0]
    for ep in skipped:
        print(f"[RawDataset] Skipping unreadable episode folder: {ep.uid}")
    episodes = [ep for ep in episodes if ep.length > 0]
    if not episodes:
        raise FileNotFoundError(f"No readable episodes found in {root}")
    episodes.sort(
        key=lambda e: (e.collection_ts if e.collection_ts is not None else float("inf"), e.uid)
    )
    for i, ep in enumerate(episodes):
        ep.episode_index = i

    # Reference schema: union of dataset paths with the max width seen (some
    # episodes record zero-width action datasets, e.g. an unused base).
    def merge_specs(entries) -> list[tuple[str, int]]:
        widths: dict[str, int] = {}
        for _, state_specs, action_specs in entries:
            for name, width in state_specs:
                widths[f"s/{name}"] = max(widths.get(f"s/{name}", 0), width)
            for name, width in action_specs:
                widths[f"a/{name}"] = max(widths.get(f"a/{name}", 0), width)
        state = sorted(
            (k[2:], w) for k, w in widths.items() if k.startswith("s/") and w > 0
        )
        action = sorted(
            (k[2:], w) for k, w in widths.items() if k.startswith("a/") and w > 0
        )
        return state, action

    state_specs, action_specs = merge_specs(loaded)

    fps_counts = Counter(ep.fps for ep in episodes)
    fps = fps_counts.most_common(1)[0][0]
    video_keys = _discover_video_keys(episodes)

    state_names = spec_dims(state_specs)
    action_names = spec_dims(action_specs)

    info: dict[str, Any] = {
        "codebase_version": "v2.0",
        "fps": int(fps) if float(fps).is_integer() else float(fps),
        "features": {
            "observation.state": {"dtype": "float32", "shape": [len(state_names)], "names": state_names},
            "action": {"dtype": "float32", "shape": [len(action_names)], "names": action_names},
        },
        "data_path": "data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet",
        "video_path": "videos/{video_key}/chunk-{episode_chunk:03d}/file-{episode_index:06d}.mp4",
    }
    for vk in video_keys:
        info["features"][vk] = {"dtype": "video", "shape": [0, 0, 3], "names": None}

    records = [
        {
            "episode_index": ep.episode_index,
            "length": ep.length,
            "uid": ep.uid,
            "path": str(ep.path),
            "task": ep.task_name,
            "task_name": ep.task_name,
            "task_id": ep.task_id,
            "collection_ts": ep.collection_ts,
            "tasks": [ep.task_name] if ep.task_name else [],
        }
        for ep in episodes
    ]
    episodes_df = pd.DataFrame(records)

    return RawDatasetInfo(
        root=root,
        fps=fps,
        episodes=episodes,
        video_keys=video_keys,
        info=info,
        episodes_df=episodes_df,
        state_specs=state_specs,
        action_specs=action_specs,
    )


def get_episode_video_path(raw: RawDatasetInfo, episode_index: int, video_key: str) -> Path:
    """Path of the per-episode mp4 for a raw video key like 'rs/cam_high'."""
    ep = raw.episodes[episode_index]  # IndexError on out-of-range index
    path = ep.path / "videos" / f"{video_key}.mp4"
    if not path.is_file():
        raise FileNotFoundError(f"Video file not found: {path}")
    return path


def _collect_datasets(f: "h5py.File", prefix: str, n_frames: int | None) -> list[tuple[str, int]]:
    """Collect (relative path, width) of 2D numeric datasets under *prefix*.

    Only datasets whose first dimension matches the frame count are kept, so
    the jpeg-encoded image datasets (1D object arrays) and any unrelated
    entries are excluded defensively.
    """
    base = f.get(prefix)
    if base is None:
        return []
    found: list[tuple[str, tuple[int, ...]]] = []

    def visit(name: str, obj) -> None:
        if isinstance(obj, h5py.Dataset) and obj.dtype.kind in "fiub" and obj.ndim == 2:
            found.append((name, tuple(obj.shape)))

    base.visititems(visit)
    if n_frames is None:
        if not found:
            return []
        n_frames = max(shape[0] for _, shape in found)
    return sorted((name, shape[1]) for name, shape in found if shape[0] == n_frames)


def _frame_count(f: "h5py.File") -> int | None:
    if "timestamp/t" in f:
        return int(f["timestamp/t"].shape[0])
    return None


def get_state_action_specs(ep_path: Path) -> tuple[list[tuple[str, int]], list[tuple[str, int]], int]:
    """Dataset specs for the state/action vectors of one episode.

    Returns (state_specs, action_specs, n_frames) where each spec is
    (dataset_path_relative_to_group, width).
    """
    _require_h5py()
    with h5py.File(ep_path / EPISODE_FILE, "r") as f:
        n = _frame_count(f)
        state_specs = _collect_datasets(f, "observation/state", n)
        action_specs = _collect_datasets(f, "action", n)
        if n is None:
            n = 0
    return state_specs, action_specs, n


def spec_to_name(spec_path: str) -> str:
    """Human-readable dimension label for a dataset spec path.

    'arm/position' -> 'arm.pos', 'cameras/head_camera_pose' ->
    'cameras.head_camera_pose'. Callers append '[i]' per dimension.
    """
    parts = spec_path.split("/")
    leaf = parts[-1]
    parts = parts[:-1] + [_DIM_SHORT.get(leaf, leaf)]
    return ".".join(parts)


def spec_dims(specs: list[tuple[str, int]]) -> list[str]:
    """Expand specs into one label per vector dimension, e.g. 'arm.pos[0]'."""
    names: list[str] = []
    for path, width in specs:
        base = spec_to_name(path)
        if width == 1:
            names.append(base)
        else:
            names.extend(f"{base}[{i}]" for i in range(width))
    return names


def spec_total_width(specs: list[tuple[str, int]]) -> int:
    return sum(width for _, width in specs)


def read_state_action_with_count(
    ep_path: Path,
    state_specs: list[tuple[str, int]],
    action_specs: list[tuple[str, int]],
) -> tuple[np.ndarray, np.ndarray, int]:
    """Read state/action using reference specs, sized by this episode's own
    frame count (defensive against episodes with a different length).

    Datasets that are missing, shorter than the frame count, 1D, or narrower
    than the reference width leave zeros in the output matrix (or are
    truncated when wider than the reference).
    """
    _require_h5py()
    with h5py.File(ep_path / EPISODE_FILE, "r") as f:
        n = _frame_count(f) or 0

        def stack(specs: list[tuple[str, int]], prefix: str) -> np.ndarray:
            total = sum(width for _, width in specs)
            out = np.zeros((n, total), dtype=np.float32)
            col = 0
            for name, width in specs:
                if width <= 0:
                    continue
                ds = f.get(f"{prefix}/{name}")
                if ds is not None:
                    values = np.asarray(ds[: min(n, ds.shape[0])], dtype=np.float32)
                    if values.ndim == 1:
                        values = values.reshape(-1, 1)
                    w = min(width, values.shape[1])
                    out[: values.shape[0], col : col + w] = values[:, :w]
                col += width
            return out

        state = stack(state_specs, "observation/state")
        action = stack(action_specs, "action")
    return state, action, n


def read_state_action(
    ep_path: Path,
    n_frames: int,
    state_specs: list[tuple[str, int]],
    action_specs: list[tuple[str, int]],
) -> tuple[np.ndarray, np.ndarray]:
    """Read the state and action vectors of one episode into (N, D) float32 matrices."""
    _require_h5py()
    with h5py.File(ep_path / EPISODE_FILE, "r") as f:
        def stack(specs: list[tuple[str, int]], prefix: str) -> np.ndarray:
            total = sum(width for _, width in specs)
            out = np.zeros((n_frames, total), dtype=np.float32)
            col = 0
            for name, width in specs:
                ds = f.get(f"{prefix}/{name}")
                if ds is not None:
                    out[:, col : col + width] = np.asarray(ds[:], dtype=np.float32)
                col += width
            return out

        state = stack(state_specs, "observation/state")
        action = stack(action_specs, "action")
    return state, action


def get_episode_trajectory(raw: RawDatasetInfo, episode_index: int) -> dict[str, Any]:
    """Trajectory JSON with the same shape as the parquet trajectory endpoint.

    Timestamps are episode-relative seconds (frame_index / fps) so they line
    up with the video timeline and the annotation segments drawn in the UI.
    Dimensions follow the dataset-wide reference schema, so every episode
    reports the same dim names (missing datasets read as zeros).
    """
    _require_h5py()
    ep = raw.episodes[episode_index]  # IndexError on out-of-range index
    fps = float(ep.fps) or DEFAULT_FPS
    state, action, n = read_state_action_with_count(ep.path, raw.state_specs, raw.action_specs)

    action_data = {
        name: [float(v) for v in action[:, i]]
        for i, name in enumerate(spec_dims(raw.action_specs))
    }
    state_data = {
        name: [float(v) for v in state[:, i]]
        for i, name in enumerate(spec_dims(raw.state_specs))
    }

    duration = n / fps if fps else 0.0
    return {
        "episode_index": episode_index,
        "fps": fps,
        "num_frames": n,
        "duration": duration,
        "action": action_data,
        "state": state_data,
        "has_action": bool(action_data),
        "has_state": bool(state_data),
        "columns": ["timestamp", "observation.state", "action"],
    }
