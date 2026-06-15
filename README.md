# SessionGuard

**AI-driven continuous identity protection system for detecting session hijacking in authenticated web applications.**

A research prototype monorepo that demonstrates end-to-end continuous authentication: behavioural telemetry collection in the browser, statistical baseline establishment, IsolationForest-based anomaly detection, and an adaptive policy engine that issues step-up challenges or revokes sessions in real time.

---

## Project Status

| Phase | Scope                                                          | Status |
|------:|----------------------------------------------------------------|:------:|
| 1     | Monorepo, JWT auth, baseline schema, demo app                  | ✅ Done |
| 2     | Behavioural SDK (keystroke / mouse / navigation) + ingestion   | ✅ Done |
| 3     | Per-session statistical baseline (means, std, ranges)          | ✅ Done |
| 4     | IsolationForest + Z-score drift, step-up + revocation, monitor | ✅ Done |

---

## Architecture

```
sessionguard/
├── apps/
│   ├── frontend          # Next.js 14 + TypeScript + TailwindCSS
│   ├── backend           # Express + TypeScript + Prisma
│   └── ml-service        # Python FastAPI + scikit-learn IsolationForest
├── packages/
│   ├── shared-types      # Common TypeScript interfaces
│   └── behavioural-sdk   # Browser-side event collection SDK
├── prisma/               # Prisma schema + seed
├── pnpm-workspace.yaml
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)
- **PostgreSQL** >= 14 (installed locally)
- **Python** >= 3.10 (for ML service)

---

## Docker Quick Start

The fastest way to spin up the entire SessionGuard ecosystem (Postgres, Backend, Frontend, and ML Service) is using Docker Compose:

1. **Prerequisites**: Ensure you have [Docker](https://www.docker.com/) and Docker Compose installed.
2. **Start the environment**:
   * **For Single-Machine Testing (localhost)**:
     ```bash
     docker compose up --build
     ```
   * **For Local Network Testing (Multi-Device/Colleague)**:
     Find your server machine's local IP address (e.g., `192.168.1.50`) and compile with it:
     ```bash
     CORS_ORIGIN=http://192.168.1.50:3000 NEXT_PUBLIC_API_URL=http://192.168.1.50:4000 docker compose up --build
     ```
3. **Seeding**: The backend container automatically runs migrations and seeds the database on startup.
4. **Accessing the applications**:
   - **Frontend**: [http://localhost:3000](http://localhost:3000) (or `http://<YOUR_LOCAL_IP>:3000` from another device on the network)
   - **Backend API**: [http://localhost:4000](http://localhost:4000)
   - **ML Service**: [http://localhost:8000](http://localhost:8000)

Seeded demo credentials:
- **Researcher (Admin)**: `admin@sessionguard.dev` / `admin123`
- **Standard User**: `demo@sessionguard.dev` / `demo123`

---

## Quick Start (Manual Setup)

### 1. Clone & Install

```bash
cd sessionguard
cp .env.example .env
pnpm install
```

### 2. Setup Local PostgreSQL

Create the database and user in your local PostgreSQL:

```sql
CREATE USER sessionguard WITH PASSWORD 'your_password' CREATEDB;
CREATE DATABASE sessionguard OWNER sessionguard;
GRANT ALL PRIVILEGES ON DATABASE sessionguard TO sessionguard;
```

Then update `DATABASE_URL` in both `.env` and `prisma/.env`:

```
DATABASE_URL=postgresql://sessionguard:your_password@localhost:5432/sessionguard
```

### 3. Setup Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Configure Environment

Copy `.env.example` files in `apps/backend/` and `apps/frontend/`:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/backend/.env` and set a strong `JWT_SECRET`.

### 5. Build Shared Packages

```bash
pnpm --filter @sessionguard/shared-types build
pnpm --filter @sessionguard/behavioural-sdk build
```

### 6. Start Backend

```bash
pnpm dev:backend
```

Backend runs at **http://localhost:4000**.

### 7. Start Frontend

```bash
pnpm dev:frontend
```

Frontend runs at **http://localhost:3000**.

### 8. Start ML Service (required for Phase 4 features)

```bash
cd apps/ml-service
python -m venv .venv
.venv/Scripts/activate    # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

ML service runs at **http://localhost:8000**. Trained models are persisted as `.joblib` files under `apps/ml-service/models/` (one per session UUID) so the service can be restarted without losing baselines.

Set `ML_SERVICE_URL` in `apps/backend/.env` (defaults to `http://localhost:8000`).

---

## API Endpoints

### Health
| Method | Endpoint      | Description              | Auth Required |
|--------|---------------|--------------------------|---------------|
| GET    | /api/health   | Backend liveness check   | No            |

### Auth
| Method | Endpoint                    | Description                                   | Auth Required |
|--------|-----------------------------|-----------------------------------------------|---------------|
| POST   | /api/auth/register          | Register new user                             | No            |
| POST   | /api/auth/login             | Login, returns JWT                            | No            |
| POST   | /api/auth/logout            | Terminate session + record audit log          | Yes           |
| GET    | /api/auth/me                | Get current user                              | Yes           |
| POST   | /api/auth/verify-password   | Step-up re-authentication (clears STEP_UP)    | Yes           |
| PATCH  | /api/auth/profile           | Update user display name                      | Yes           |
| GET    | /api/auth/preferences       | Fetch user preferences                        | Yes           |
| PATCH  | /api/auth/preferences       | Update/merge user preferences                 | Yes           |

### Session
| Method | Endpoint                          | Description                                      | Auth Required |
|--------|-----------------------------------|--------------------------------------------------|---------------|
| POST   | /api/session/start                | Start monitored session                          | Yes           |
| POST   | /api/session/behaviour            | Ingest behaviour packet (10 s window)            | Yes           |
| GET    | /api/session/audit/:sessionId     | Get session audit logs                           | Yes           |
| GET    | /api/session/risk-status          | Current state / risk level / step-up / revoked  | Yes           |
| GET    | /api/session/telemetry/active     | Internal: all active sessions with risk panels   | Yes           |

### Risk
| Method | Endpoint              | Description                                                | Auth Required |
|--------|-----------------------|------------------------------------------------------------|---------------|
| POST   | /api/risk/evaluate    | Returns the latest persisted risk assessment for a session | Yes           |

### Experiment (Admin/Researcher only)
| Method | Endpoint                          | Description                                                       | Auth Required |
|--------|-----------------------------------|-------------------------------------------------------------------|---------------|
| POST   | /api/experiment/start             | Start a new research trial linked to a session                    | Yes (ADMIN)   |
| POST   | /api/experiment/inject-attack     | Toggle attackInjected flag mid-trial                              | Yes (ADMIN)   |
| POST   | /api/experiment/end               | End trial, compute TP/TN/FP/FN and latency metrics                | Yes (ADMIN)   |
| GET    | /api/experiment/list              | List all experiments (newest first)                               | Yes (ADMIN)   |
| GET    | /api/experiment/detail/:id        | Full experiment detail including per-packet logs                  | Yes (ADMIN)   |
| GET    | /api/experiment/metrics           | Global aggregate evaluation metrics across all completed trials   | Yes (ADMIN)   |
| GET    | /api/experiment/export            | Download experiment data as CSV (one experiment or full summary)  | Yes (ADMIN)   |
| GET    | /api/experiment/settings          | Fetch current risk threshold settings                             | Yes (ADMIN)   |
| POST   | /api/experiment/settings          | Update mediumThreshold / highThreshold                            | Yes (ADMIN)   |

### ML Service
| Method | Endpoint          | Description                                                  |
|--------|-------------------|--------------------------------------------------------------|
| POST   | /train-baseline   | Train an IsolationForest from baseline feature vectors       |
| POST   | /score-anomaly    | Score a live feature vector → normalized anomaly score 0–1   |
| GET    | /health           | Health check                                                 |

---

## Frontend Pages

### Core Application Pages
| Route                       | Description                                                                  |
|-----------------------------|------------------------------------------------------------------------------|
| /login                      | JWT authentication. Shows revocation banner on `?reason=session_revoked`.    |
| /register                   | New user registration                                                        |
| /forgot-password            | Password reset UI (simulated — no email backend in the prototype)            |
| /dashboard                  | Session status, risk level, baseline progress, and recent risk assessments   |
| /profile                    | User profile information (display name, email, preferences)                  |
| /settings                   | Toggle notifications, tracking intensity, and alert preferences              |
| /form                       | Sample form used for typing/mouse behaviour capture during baseline building  |

### Simulated Workspace Pages (behavioural telemetry targets)
The following pages exist to provide realistic multi-route navigation for behavioural capture. They contain static/mock UI and are not functionally connected to the backend beyond telemetry.

| Route          | Description                          |
|----------------|--------------------------------------|
| /tasks         | Simulated task management view       |
| /notes         | Simulated notes view                 |
| /requests      | Simulated service request list       |
| /activity      | Simulated activity feed              |
| /help          | Simulated help & resources page      |

### Internal / Researcher Pages (ADMIN role required)
| Route                       | Description                                                               |
|-----------------------------|----------------------------------------------------------------------------|
| /internal/session-monitor   | Live risk panels, ML status, last 10 risk assessments per active session  |
| /internal/experiments       | Experimentation Lab: run trials, inject attacks, download CSV results, configure risk thresholds |

A global **step-up modal** is rendered on top of every authenticated page whenever the risk engine flags the active session — the user must re-enter their password or sign out.

The sidebar navigation adapts to the user's role: the **Researcher Lab** section (Experiment Lab and Telemetry Monitor links) is only visible to users with the `ADMIN` role.

---

## How It Works

### Data pipeline

1. User registers and logs in — JWT token stored in `localStorage`.
2. A **monitored session** is created via `/api/session/start` (state = `INITIALIZING_BASELINE`).
3. The **behavioural-sdk** captures keystroke timing, mouse movements, clicks, scrolls, and navigation events in the browser.
4. Every 10 s, captured events are batched into a `BehaviourPacket` and POSTed to `/api/session/behaviour`.
5. The backend extracts a numeric **feature vector** (`featureExtractionService`) and stores raw + derived data.

### Baseline establishment

6. After **18 packets** (~3 minutes), the backend computes per-feature mean, std, and min/max ranges → persists a `BaselineProfile`.
7. The same feature matrix is shipped to the ML service which trains an `IsolationForest` (100 estimators, contamination 0.05) and persists the model to `apps/ml-service/models/<sessionId>.joblib`.
8. Session state transitions to `ACTIVE_MONITORING`.

### Continuous risk evaluation

For every packet after the baseline is established, the backend runs the **risk engine**:

| Signal              | Source                              | Weight |
|---------------------|-------------------------------------|:------:|
| Anomaly score       | IsolationForest `decision_function` (normalized to 0–1) | 0.70 |
| Statistical drift   | Mean abs Z-score vs baseline, normalized | 0.30 |

```
combined = 0.7 · isolation + 0.3 · drift
```

Classification thresholds: `LOW < 0.40 ≤ MEDIUM < 0.70 ≤ HIGH / CRITICAL`.

The `CRITICAL` risk level is treated identically to `HIGH` by the policy engine (both trigger `SESSION_REVOKED`). Thresholds are stored in the `SystemSettings` table and configurable at runtime via the Experimentation Lab.

### Adaptive policy

| Risk level       | Action            | Session state          | Frontend effect                                  |
|------------------|-------------------|------------------------|--------------------------------------------------|
| LOW              | `NONE`            | `ACTIVE_MONITORING`    | Silent — telemetry continues                     |
| MEDIUM           | `STEP_UP_REQUIRED`| `STEP_UP_REQUIRED`     | Blocking step-up modal demanding password        |
| HIGH / CRITICAL  | `SESSION_REVOKED` | `REVOKED`              | Forced logout → `/login?reason=session_revoked`  |

Every decision is persisted as a `RiskAssessment` row plus an entry in `AuditLog` (`RISK_EVALUATED`, `STEP_UP_REQUIRED`, `STEP_UP_VERIFIED`, `RISK_ESCALATED`, `SESSION_REVOKED`).

The frontend `RiskContext` polls `/api/session/risk-status` every 6 s to drive the modal and the forced-logout flow.

---

## Database Schema

- **User** — registered users with bcrypt-hashed passwords.
- **Session** — tracked sessions with `state` enum (`INITIALIZING_BASELINE` / `ACTIVE_MONITORING` / `STEP_UP_REQUIRED` / `REVOKED` / `ACTIVE` / `SUSPICIOUS` / `TERMINATED` / `EXPIRED`), `riskLevel`, `stepUpRequired`, last-known risk scores, `revokedAt`, `endedAt`.
  - `TERMINATED` — set when the user explicitly logs out.
  - `EXPIRED` — set when a session has been inactive for > 30 minutes (enforced at ingestion time and during risk-status polling).
- **BehaviouralData** — raw behavioural payloads + extracted feature vector per packet.
- **BaselineModel** — per-session statistical profile (means / std / ranges) plus ML model lifecycle status (`NOT_TRAINED` / `TRAINING` / `TRAINED` / `FAILED`) and `mlModelId`.
- **RiskAssessment** — every risk decision: `isolationScore`, `driftScore`, `combinedScore`, `riskLevel`, `action`, `evaluatedAt`, per-feature `explanations` (Z-score, contribution).
- **AuditLog** — immutable audit trail of all system actions (`LOGIN`, `LOGOUT`, `REGISTER`, `SESSION_START`, `SESSION_END`, `BEHAVIOUR_INGESTED`, `RISK_EVALUATED`, `RISK_ESCALATED`, `BASELINE_CREATED`, `BASELINE_UPDATED`, `SETTINGS_CHANGED`, `STEP_UP_REQUIRED`, `STEP_UP_VERIFIED`, `SESSION_REVOKED`, `ML_MODEL_TRAINED`, `ML_TRAINING_FAILED`).
- **Experiment** — a research trial record linked to a session. Stores ground truth label (`BENIGN` / `HIJACKED`), `attackInjected` flag + timestamp, and outcome metrics (TP/TN/FP/FN, detection accuracy, false positive rate, detection/response latency in ms).
- **ExperimentLog** — per-packet log within a trial: anomaly score, drift score, combined score, predicted label, ground truth, enforced action, and per-feature drift explanations.
- **SystemSettings** — singleton row (`id = "global"`) storing the configurable `mediumThreshold` (default 0.4) and `highThreshold` (default 0.7) used by the risk engine.

---

## Demo Credentials (after seeding)

| Email                     | Password  | Role  |
|---------------------------|-----------|-------|
| demo@sessionguard.dev     | demo123   | USER  |
| admin@sessionguard.dev    | admin123  | ADMIN |

> **Note:** The database seed uses SHA-256 password hashing for speed. The backend auth service uses bcrypt. These seeded credentials therefore **cannot be used to log in** through the normal auth flow. Register a new user via the UI or API (`POST /api/auth/register`) for a bcrypt-compatible account.

> **Admin access:** To access the Experimentation Lab and Telemetry Monitor, register a new account and then manually update the user's `role` column to `ADMIN` in the database, or use the seed `admin@sessionguard.dev` account after re-hashing the password with bcrypt.

---

## License

Research prototype — not licensed for production use.
