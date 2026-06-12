# SessionGuard — Codebase Architecture & Technical Guide

SessionGuard is an AI-driven continuous identity protection system that detects session hijacking by analyzing behavioral telemetry in real-time. This guide details how the system works end-to-end.

---

## 1. System Architecture Overview

SessionGuard is built as a monorepo featuring a browser event collection SDK, a Node.js/Express backend acting as the telemetry ingestion and policy enforcement engine, a PostgreSQL database for state and audit logging, and a Python FastAPI microservice that trains and runs IsolationForest models.

```mermaid
graph TD
    User([Browser User / Attacker]) -->|1. Events: Key, Mouse, Nav| SDK[Behavioural SDK]
    SDK -->|2. Batch Ingest Packet (10s)| API[Backend API: Express]
    API -->|3. Save Telemetry / Audits| DB[(PostgreSQL / Prisma)]
    API -->|4. Train Baseline (18 vectors)| ML[ML Service: FastAPI]
    API -->|5. Score Anomaly| ML
    ML -->|6. Anomaly Score (IsolationForest)| API
    API -->|7. Z-Score Statistical Drift| Drift[Drift Service]
    API -->|8. Evaluate Policy| Policy[Adaptive Policy Engine]
    Policy -->|9a. Low Risk| API
    Policy -->|9b. Medium Risk: Step-Up Re-Auth| SDK
    Policy -->|9c. High Risk: Revoke JWT| SDK
```

### Directory Structure
- [packages/behavioural-sdk](file:///c:/dev/sessionguard/packages/behavioural-sdk): The browser-side tracker. Captures, throttles, aggregates, and transmits telemetry.
- [packages/shared-types](file:///c:/dev/sessionguard/packages/shared-types): Common interfaces and data models shared between the frontend, backend, and SDK.
- [apps/backend](file:///c:/dev/sessionguard/apps/backend): Telemetry pipeline ingestion, database sync (Prisma), statistical calculations, and authentication control.
- [apps/frontend](file:///c:/dev/sessionguard/apps/frontend): React Next.js application representing both the standard protected portal and the admin researcher dashboard.
- [apps/ml-service](file:///c:/dev/sessionguard/apps/ml-service): Python FastAPI microservice that manages per-session `IsolationForest` models.

---

## 2. Browser Telemetry Collection ([behavioural-sdk](file:///c:/dev/sessionguard/packages/behavioural-sdk))

Telemetry collection starts in the browser. The [BehaviouralTracker](file:///c:/dev/sessionguard/packages/behavioural-sdk/src/tracker.ts) class hooks into global window and document listeners to capture user interaction events:

1. **Keyboard Events**: Captures `keydown` and `keyup` to calculate:
   - **Key Hold Duration**: How long a key remains pressed.
   - **Flight Time / Inter-Key Interval**: The time interval between keypresses.
2. **Mouse Movement Events**: Throttled (every 50ms) to capture coordinate locations, instantaneous velocity, and acceleration.
3. **Mouse Clicks**: Capture coordinates, click-target DOM tag/ID, and button clicked.
4. **Scroll Events**: Monitors scroll directions and scroll speed velocities.
5. **Page Navigation & Focus**: Tracks active page routes, tab focus swaps (`blur` / `focus`), and session inactivity.

### Packet Aggregation ([batcher.ts](file:///c:/dev/sessionguard/packages/behavioural-sdk/src/batcher.ts))
Rather than streaming events individually, the SDK buffers them. Every **10 seconds** (configurable), the `PacketBatcher` aggregates the raw event buffer into a `FeatureSummary` packet, calculating statistical aggregates (averages, counts, variances, and pauses) before calling `BehaviourSender` to POST the data.

---

## 3. Ingestion & Feature Extraction ([apps/backend](file:///c:/dev/sessionguard/apps/backend))

The backend exposes `POST /api/session/behaviour` to accept telemetry packets. 

```typescript
// apps/backend/src/services/session.service.ts
const featureVector = featureExtractionService.extract(packet.features, windowDurationMs);
```

The [FeatureExtractionService](file:///c:/dev/sessionguard/apps/backend/src/services/feature-extraction.service.ts) transforms the aggregated metrics into a standardized **16-dimensional ML-ready feature vector** (`BehaviouralFeatureVector`):

```typescript
// 16 key dimensions analyzed for anomaly detection
export const FEATURE_KEYS = [
  "avgInterKeyInterval", "stdInterKeyInterval", "avgHoldDuration", "typingBurstRate", "typingIdleRatio",
  "avgMouseVelocity", "mouseAccelerationVariance", "clickFrequency", "scrollFrequency", "idleMouseRatio",
  "avgRouteDwellTime", "routeTransitionCount", "tabFocusLossCount", "inactivityRatio", "sessionElapsedRatio"
];
```

---

## 4. The Lifecycle of a Session

When a session starts, it cycles through three major security states:

```
[INITIALIZING_BASELINE] (First 3 minutes / 18 packets)
         │
         ▼ (Calculates Statistical Means & Trains IsolationForest Model)
[ACTIVE_MONITORING] (Running live hybrid risk scoring)
    ┌────┴────┐
    ▼         ▼
[SUSPICIOUS] [REVOKED] (Forced sign-out/redirect)
(Step-Up Re-Auth)
```

### Phase 1: Baseline Establishment ([baseline.service.ts](file:///c:/dev/sessionguard/apps/backend/src/services/baseline.service.ts))
During the initial `INITIALIZING_BASELINE` state (requiring 18 packets, equivalent to ~3 minutes of active usage), the backend collects the feature vectors without assessing risk. 

Once 18 packets are collected, it computes:
1. **Feature Means**: The average value for each of the 16 features.
2. **Standard Deviations**: The variation of each feature.
3. **Acceptable Ranges**: Tolerances defined as `Mean ± 2 * StdDev`.

### Phase 2: ML Model Training
Once statistical profiling is complete, the backend triggers model training on the Python ML service via `POST /train-baseline`.
The FastAPI service trains a custom **IsolationForest** model (`scikit-learn`) on the 18 feature vectors. The model is saved to disk as a `.joblib` file keyed by the session UUID, enabling the service to remain stateless/restartable without losing baseline data.

---

## 5. Hybrid Risk Scoring Pipeline ([risk.service.ts](file:///c:/dev/sessionguard/apps/backend/src/services/risk.service.ts))

Once the baseline is established, the session transitions to `ACTIVE_MONITORING`. Every new 10-second telemetry packet triggers a hybrid risk assessment:

### A. Machine Learning Anomaly Score (70% Weight)
The backend calls `POST /score-anomaly` on the Python ML service. 
- The ML service runs the feature vector through the session's custom `IsolationForest` model.
- It extracts the raw anomaly decision score (`decision_function`) and normalizes it to a `[0, 1]` range (where 1.0 is highly anomalous) using min-max bounds derived during the baseline training distribution.

### B. Statistical Z-Score Drift (30% Weight)
The backend evaluates statistical deviation ([drift.service.ts](file:///c:/dev/sessionguard/apps/backend/src/services/drift.service.ts)) against the user's initial baseline:
$$Z = \frac{|Observed - Mean|}{StdDev}$$
The mean absolute Z-score across all 16 dimensions is normalized by a factor of 3.0 (i.e., a sustained deviation of 3 standard deviations indicates high drift, remapped to 1.0).

### C. Combined Risk Score
The final combined risk score is calculated as:
$$\text{Combined Risk} = (0.7 \times \text{Anomaly Score}) + (0.3 \times \text{Drift Score})$$

---

## 6. Adaptive Enforcement & Policy Engine

The system maps the combined risk score against configurable thresholds (default: Medium = 0.4, High = 0.7) to decide immediate actions:

| Risk Level | Combined Score | Session State | Enforced Action |
|:---|:---|:---|:---|
| **LOW** | `< 0.4` | `ACTIVE_MONITORING` | **None** (Silently logs telemetry and `RISK_EVALUATED` audit trail). |
| **MEDIUM** | `0.4` to `0.7` | `STEP_UP_REQUIRED` | **Step-Up Authentication** (The user is prompted with a password verification modal that locks their screen. Succeeding restores status; failing or ignoring locks them out). |
| **HIGH** | `>= 0.7` | `REVOKED` | **Session Revocation** (The JWT is invalidated on the backend, the database session state is set to `REVOKED`, and the frontend forcibly redirects the client to the login screen with a security alert). |

---

## 7. Developer Cheat Sheet

### Common Development Tasks

- **How to edit thresholds**: Go to the **Settings** panel on the frontend, or send a `POST /api/experiment/settings` request to change `mediumThreshold` and `highThreshold`.
- **How to simulate hijacking / anomaly**: Start an experiment on the Researcher Dashboard and inject an "attack" state. This will spoof features and trigger step-up or revocation automatically, showing latency and accuracy metrics.
- **Troubleshooting client/server JWT issues**: If a JWT expires, the API client helper ([api.ts](file:///c:/dev/sessionguard/apps/frontend/src/lib/api.ts)) will detect a 401/403 response, dispatch an `auth:expired` event, and trigger a clean login redirection banner (`/login?reason=session_expired`).
