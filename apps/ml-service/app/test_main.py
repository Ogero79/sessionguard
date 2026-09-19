import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Verify that the health check endpoint returns 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml-service"}

def test_train_baseline_and_score_anomaly():
    """Test training a baseline model and then scoring an anomaly with it."""
    session_id = "test-session-uuid-123"
    
    # 2D list: 5 samples, 15 features each (standard SessionGuard feature dimensionality)
    feature_vectors = [
        [1.0, 0.5, 0.2, 0.1, 0.8, 1.2, 0.3, 0.1, 0.05, 0.4, 0.1, 1.0, 0.0, 0.0, 0.1],
        [1.05, 0.48, 0.22, 0.09, 0.81, 1.18, 0.32, 0.08, 0.06, 0.42, 0.08, 1.05, 0.0, 0.0, 0.12],
        [0.98, 0.52, 0.18, 0.11, 0.79, 1.22, 0.28, 0.12, 0.04, 0.38, 0.12, 0.95, 0.0, 0.0, 0.08],
        [1.02, 0.51, 0.21, 0.10, 0.82, 1.21, 0.31, 0.11, 0.05, 0.41, 0.09, 1.02, 0.0, 0.0, 0.11],
        [1.00, 0.49, 0.19, 0.09, 0.80, 1.19, 0.29, 0.09, 0.05, 0.39, 0.11, 0.98, 0.0, 0.0, 0.09]
    ]

    # 1. Train model
    train_req = {
        "session_id": session_id,
        "feature_vectors": feature_vectors
    }
    train_res = client.post("/train-baseline", json=train_req)
    assert train_res.status_code == 200
    
    data = train_res.json()
    assert data["session_id"] == session_id
    assert data["status"] == "trained"
    assert data["samples_used"] == 5
    assert len(data["model_id"]) > 0

    # 2. Score normal sample (close to mean)
    normal_vector = [1.01, 0.50, 0.20, 0.10, 0.81, 1.20, 0.30, 0.10, 0.05, 0.40, 0.10, 1.00, 0.0, 0.0, 0.10]
    score_req = {
        "session_id": session_id,
        "feature_vector": normal_vector
    }
    score_res = client.post("/score-anomaly", json=score_req)
    assert score_res.status_code == 200
    
    score_data = score_res.json()
    assert score_data["session_id"] == session_id
    assert score_data["model_found"] is True
    assert 0.0 <= score_data["anomaly_score"] <= 1.0

    # 3. Score anomalous sample (highly deviated)
    anomalous_vector = [99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0, 99.0]
    score_req_anomaly = {
        "session_id": session_id,
        "feature_vector": anomalous_vector
    }
    score_res_anomaly = client.post("/score-anomaly", json=score_req_anomaly)
    assert score_res_anomaly.status_code == 200
    
    score_data_anomaly = score_res_anomaly.json()
    assert score_data_anomaly["session_id"] == session_id
    # IsolationForest should classify this extreme deviation as highly anomalous
    assert score_data_anomaly["anomaly_score"] > 0.5

def test_score_anomaly_missing_model():
    """Verify that scoring a session that has not been trained returns neutral 0.0 score."""
    score_req = {
        "session_id": "non-existent-session-id",
        "feature_vector": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    }
    response = client.post("/score-anomaly", json=score_req)
    assert response.status_code == 200
    
    data = response.json()
    assert data["session_id"] == "non-existent-session-id"
    assert data["model_found"] is False
    assert data["anomaly_score"] == 0.0
    assert data["raw_score"] == 0.0

def test_train_baseline_validation_error():
    """Ensure training fails when list dimensions are invalid (e.g. 1-D list)."""
    response = client.post("/train-baseline", json={
        "session_id": "bad-session",
        "feature_vectors": [1.0, 2.0] # 1-D list instead of 2-D matrix
    })
    # FastAPI schema validation error (422 Unprocessable Entity)
    assert response.status_code == 422
