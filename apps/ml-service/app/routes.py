from uuid import uuid4

import numpy as np
from fastapi import APIRouter, HTTPException
from sklearn.ensemble import IsolationForest

from app.model_store import StoredModel, model_store, now_utc
from app.schemas import (
    ScoreAnomalyRequest,
    ScoreAnomalyResponse,
    TrainBaselineRequest,
    TrainBaselineResponse,
)

router = APIRouter()

# IsolationForest hyperparameters per SessionGuard methodology.
N_ESTIMATORS = 100
CONTAMINATION = 0.05
RANDOM_STATE = 42


@router.post("/train-baseline", response_model=TrainBaselineResponse)
async def train_baseline(request: TrainBaselineRequest) -> TrainBaselineResponse:
    """
    Train an IsolationForest model from the session's baseline feature vectors.

    The trained model is stored both in-memory and on disk, keyed by session_id.
    """
    matrix = np.asarray(request.feature_vectors, dtype=np.float64)

    if matrix.ndim != 2 or matrix.shape[0] < 2:
        raise HTTPException(
            status_code=400,
            detail="feature_vectors must be a 2-D matrix with at least 2 rows",
        )

    # Sanitize: replace any non-finite values with 0 (defensive)
    matrix = np.nan_to_num(matrix, nan=0.0, posinf=0.0, neginf=0.0)

    model = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    try:
        model.fit(matrix)
    except Exception as exc:  # noqa: BLE001
        return TrainBaselineResponse(
            session_id=request.session_id,
            model_id="",
            status="failed",
            samples_used=int(matrix.shape[0]),
            message=f"Training failed: {exc}",
        )

    # Establish normalization bounds from training distribution.
    # decision_function: higher value = more normal, lower (often negative) = more anomalous.
    train_scores = model.decision_function(matrix)
    raw_min = float(np.min(train_scores))
    raw_max = float(np.max(train_scores))

    model_id = str(uuid4())
    model_store.save(
        request.session_id,
        StoredModel(
            model=model,
            model_id=model_id,
            trained_at=now_utc(),
            raw_score_min=raw_min,
            raw_score_max=raw_max,
        ),
    )

    return TrainBaselineResponse(
        session_id=request.session_id,
        model_id=model_id,
        status="trained",
        samples_used=int(matrix.shape[0]),
        message=f"Model trained successfully on {matrix.shape[0]} samples",
    )


@router.post("/score-anomaly", response_model=ScoreAnomalyResponse)
async def score_anomaly(request: ScoreAnomalyRequest) -> ScoreAnomalyResponse:
    """
    Score a single feature vector against the session's trained IsolationForest model.

    Returns:
      - anomaly_score: 0..1, where 1 = highly anomalous
      - raw_score: raw decision_function value (negative = anomalous, positive = normal)
    """
    stored = model_store.get(request.session_id)
    if stored is None:
        # No trained model yet → return neutral score so caller can decide.
        return ScoreAnomalyResponse(
            session_id=request.session_id,
            anomaly_score=0.0,
            raw_score=0.0,
            model_found=False,
        )

    vector = np.asarray(request.feature_vector, dtype=np.float64).reshape(1, -1)
    vector = np.nan_to_num(vector, nan=0.0, posinf=0.0, neginf=0.0)

    if vector.shape[1] != stored.model.n_features_in_:
        raise HTTPException(
            status_code=400,
            detail=(
                f"feature_vector dimension mismatch: "
                f"got {vector.shape[1]}, model expects {stored.model.n_features_in_}"
            ),
        )

    raw_score = float(stored.model.decision_function(vector)[0])

    # Normalize:
    # - lower raw_score → more anomalous → higher anomaly_score
    # - clamp to [0, 1] using training distribution bounds.
    score_range = stored.raw_score_max - stored.raw_score_min
    if score_range <= 1e-9:
        # Degenerate baseline; fall back to a sigmoid on raw score.
        anomaly_score = 1.0 / (1.0 + float(np.exp(raw_score)))
    else:
        # Linear remap: raw_score == raw_max → 0 (normal), raw_score == raw_min → 1 (anomalous)
        anomaly_score = (stored.raw_score_max - raw_score) / score_range

    anomaly_score = float(np.clip(anomaly_score, 0.0, 1.0))

    return ScoreAnomalyResponse(
        session_id=request.session_id,
        anomaly_score=anomaly_score,
        raw_score=raw_score,
        model_found=True,
    )
