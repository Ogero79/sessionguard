from pydantic import BaseModel, Field
from typing import Optional, Literal


class TrainBaselineRequest(BaseModel):
    """Backend sends collected feature vectors after baseline initialization."""
    session_id: str = Field(..., description="Session identifier")
    feature_vectors: list[list[float]] = Field(
        ...,
        description="2-D matrix: rows = packets, cols = features",
        min_length=2,
    )


class TrainBaselineResponse(BaseModel):
    session_id: str
    model_id: str
    status: Literal["trained", "failed"]
    samples_used: int
    message: Optional[str] = None


class ScoreAnomalyRequest(BaseModel):
    """Backend sends a single feature vector for live anomaly evaluation."""
    session_id: str
    feature_vector: list[float] = Field(..., min_length=1)


class ScoreAnomalyResponse(BaseModel):
    session_id: str
    anomaly_score: float = Field(..., description="0-1 normalized, higher = more anomalous")
    raw_score: float = Field(..., description="Raw IsolationForest decision_function output")
    model_found: bool
