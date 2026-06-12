"""
Per-session IsolationForest model storage.

Models are kept in memory (fast scoring path) and also persisted to disk so
that the ML service can survive restarts without losing trained baselines.
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
from sklearn.ensemble import IsolationForest


MODELS_DIR = Path(os.environ.get("ML_MODELS_DIR", "./models")).resolve()
MODELS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class StoredModel:
    model: IsolationForest
    model_id: str
    trained_at: datetime
    raw_score_min: float  # used for normalization (most anomalous training sample)
    raw_score_max: float  # used for normalization (most normal training sample)


class ModelStore:
    """Thread-safe per-session IsolationForest model store with disk persistence."""

    def __init__(self) -> None:
        self._cache: dict[str, StoredModel] = {}
        self._lock = threading.RLock()

    # ──────────────────── public API ────────────────────

    def save(self, session_id: str, stored: StoredModel) -> None:
        with self._lock:
            self._cache[session_id] = stored
            self._persist_to_disk(session_id, stored)

    def get(self, session_id: str) -> Optional[StoredModel]:
        with self._lock:
            cached = self._cache.get(session_id)
            if cached is not None:
                return cached
            return self._load_from_disk(session_id)

    def has(self, session_id: str) -> bool:
        return self.get(session_id) is not None

    # ──────────────────── disk helpers ────────────────────

    def _model_path(self, session_id: str) -> Path:
        # session_id is a UUID, safe for filename use
        return MODELS_DIR / f"{session_id}.joblib"

    def _persist_to_disk(self, session_id: str, stored: StoredModel) -> None:
        try:
            joblib.dump(
                {
                    "model": stored.model,
                    "model_id": stored.model_id,
                    "trained_at": stored.trained_at.isoformat(),
                    "raw_score_min": stored.raw_score_min,
                    "raw_score_max": stored.raw_score_max,
                },
                self._model_path(session_id),
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[model_store] failed to persist model for {session_id}: {exc}")

    def _load_from_disk(self, session_id: str) -> Optional[StoredModel]:
        path = self._model_path(session_id)
        if not path.exists():
            return None
        try:
            blob = joblib.load(path)
            stored = StoredModel(
                model=blob["model"],
                model_id=blob["model_id"],
                trained_at=datetime.fromisoformat(blob["trained_at"]),
                raw_score_min=float(blob["raw_score_min"]),
                raw_score_max=float(blob["raw_score_max"]),
            )
            self._cache[session_id] = stored
            return stored
        except Exception as exc:  # noqa: BLE001
            print(f"[model_store] failed to load model for {session_id}: {exc}")
            return None


# Singleton store
model_store = ModelStore()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
