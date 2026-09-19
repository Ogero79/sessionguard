<div align="center">

# 🛡️ SessionGuard

**AI-powered continuous authentication that detects session hijacking in real time.**

[![CI](https://github.com/Ogero79/sessionguard/actions/workflows/ci.yml/badge.svg)](https://github.com/Ogero79/sessionguard/actions/workflows/ci.yml)
[![Security](https://github.com/Ogero79/sessionguard/actions/workflows/security.yml/badge.svg)](https://github.com/Ogero79/sessionguard/actions/workflows/security.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Quick Start](#-quick-start) · [How It Works](#-how-it-works) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why SessionGuard?

Session hijacking is one of the most damaging attack vectors in web security — stolen session tokens grant full access to authenticated accounts with no alarms raised. Existing solutions are either enterprise-closed (BioCatch, BehavioSec) or limited to static checks.

SessionGuard is the **first open-source** tool that combines:

- 🧠 **Behavioral biometrics** — Continuously analyzes how users type, move their mouse, scroll, and navigate
- 🤖 **ML anomaly detection** — IsolationForest models trained per-session detect behavioral drift in real time
- ⚡ **Adaptive enforcement** — Automatically triggers step-up authentication or revokes sessions based on risk score
- 📊 **Built-in experimentation** — Research-grade framework with attack injection, TP/FP/FN metrics, and CSV export

> No passwords. No CAPTCHAs. Just invisible protection based on *how you interact*.

---

## 🚀 Quick Start

```bash
git clone https://github.com/Ogero79/sessionguard.git
cd sessionguard
docker compose up --build
```

That's it. Open [http://localhost:3000](http://localhost:3000) and log in:

| Email                     | Password  | Role  |
|---------------------------|-----------|-------|
| `admin@sessionguard.dev`  | `admin123`| Admin — full access to Experimentation Lab |
| `demo@sessionguard.dev`   | `demo123` | User  — standard monitored session |

> **Tip:** Seeded accounts use bcrypt-hashed passwords and work out of the box with the normal login flow.

---

## 🧩 Architecture

```mermaid
graph TD
    User([Browser User]) -->|Keystroke, Mouse, Nav events| SDK[Behavioural SDK]
    SDK -->|Batch every 10s| API[Backend API — Express + Prisma]
    API -->|Store telemetry| DB[(PostgreSQL)]
    API -->|Train baseline — 18 packets| ML[ML Service — FastAPI + IsolationForest]
    API -->|Score anomaly| ML
    ML -->|Anomaly score 0-1| API
    API -->|Z-score drift| Drift[Statistical Drift Engine]
    API -->|Combined risk| Policy[Adaptive Policy Engine]
    Policy -->|Low| Silent[Silent monitoring]
    Policy -->|Medium| StepUp[Step-up re-auth modal]
    Policy -->|High| Revoke[Session revocation + forced logout]
```

### Project Structure

```
sessionguard/
├── apps/
│   ├── frontend/          # Next.js 14 + TypeScript + TailwindCSS
│   ├── backend/           # Express + TypeScript + Prisma ORM
│   └── ml-service/        # Python FastAPI + scikit-learn
├── packages/
│   ├── shared-types/      # Common TypeScript interfaces
│   └── behavioural-sdk/   # Browser-side telemetry collection SDK
├── prisma/                # Database schema, migrations & seed
├── .github/               # CI/CD workflows & templates
└── docker-compose.yml     # One-command deployment
```

---

## 🔬 How It Works

### 1. Behavioral Telemetry Collection

The browser SDK captures user interactions in real time:

| Signal | What's Measured |
|--------|----------------|
| ⌨️ Keystroke dynamics | Key hold duration, inter-key interval, typing burst rate |
| 🖱️ Mouse behavior | Velocity, acceleration variance, click frequency |
| 📜 Scroll patterns | Scroll frequency, direction changes |
| 🗺️ Navigation | Route dwell time, transition count, tab focus loss |
| ⏱️ Session activity | Idle ratio, inactivity patterns |

Events are aggregated into **15-dimensional feature vectors** every 10 seconds.

### 2. Baseline Establishment (~3 minutes)

After **18 telemetry packets**, the system:
- Computes per-feature **mean**, **standard deviation**, and **min/max ranges**
- Trains a per-session **IsolationForest** model (100 estimators, contamination 0.05)
- Transitions to `ACTIVE_MONITORING`

### 3. Hybrid Risk Scoring

Every subsequent packet is scored using a weighted combination:

```
risk = 0.7 × IsolationForest(anomaly_score) + 0.3 × Z-score(drift)
```

### 4. Adaptive Policy Engine

| Risk Level | Score Range | Action | User Experience |
|------------|------------|--------|-----------------|
| 🟢 LOW | < 0.40 | None | Silent monitoring continues |
| 🟡 MEDIUM | 0.40 – 0.70 | Step-up auth | Blocking modal requiring password re-entry |
| 🔴 HIGH | ≥ 0.70 | Revoke session | Forced logout with security alert |

Thresholds are configurable at runtime via the Experimentation Lab.

---

## 🧪 Experimentation Lab

SessionGuard includes a built-in research framework for evaluating detection accuracy:

- **Start trials** linked to active sessions with ground truth labels
- **Inject attacks** mid-trial to simulate session hijacking
- **Measure outcomes** — TP/TN/FP/FN, detection accuracy, false positive rate
- **Track latency** — detection and response time in milliseconds
- **Export data** — per-packet score timeseries as CSV
- **Configure thresholds** — adjust risk boundaries in real time

Access the lab at `/internal/experiments` (requires ADMIN role).

---

## 📡 API Reference

<details>
<summary><strong>Auth Endpoints</strong></summary>

| Method | Endpoint                    | Description                                   | Auth |
|--------|-----------------------------|-----------------------------------------------|------|
| POST   | /api/auth/register          | Register new user                             | No   |
| POST   | /api/auth/login             | Login, returns JWT                            | No   |
| POST   | /api/auth/logout            | Terminate session + audit log                 | Yes  |
| GET    | /api/auth/me                | Get current user                              | Yes  |
| POST   | /api/auth/verify-password   | Step-up re-authentication                     | Yes  |
| PATCH  | /api/auth/profile           | Update user display name                      | Yes  |
| GET    | /api/auth/preferences       | Fetch user preferences                        | Yes  |
| PATCH  | /api/auth/preferences       | Update user preferences                       | Yes  |

</details>

<details>
<summary><strong>Session & Telemetry Endpoints</strong></summary>

| Method | Endpoint                          | Description                                      | Auth |
|--------|-----------------------------------|--------------------------------------------------|------|
| POST   | /api/session/start                | Start monitored session                          | Yes  |
| POST   | /api/session/behaviour            | Ingest behaviour packet (10s window)             | Yes  |
| GET    | /api/session/audit/:sessionId     | Get session audit logs                           | Yes  |
| GET    | /api/session/risk-status          | Current risk level / step-up / revoked state     | Yes  |
| GET    | /api/session/telemetry/active     | All active sessions with risk panels             | Yes  |
| POST   | /api/risk/evaluate                | Latest risk assessment for a session             | Yes  |

</details>

<details>
<summary><strong>Experiment Endpoints (Admin only)</strong></summary>

| Method | Endpoint                          | Description                                                       | Auth       |
|--------|-----------------------------------|-------------------------------------------------------------------|------------|
| POST   | /api/experiment/start             | Start a new research trial                                        | Yes (ADMIN)|
| POST   | /api/experiment/inject-attack     | Toggle attack flag mid-trial                                      | Yes (ADMIN)|
| POST   | /api/experiment/end               | End trial, compute metrics                                        | Yes (ADMIN)|
| GET    | /api/experiment/list              | List all experiments                                              | Yes (ADMIN)|
| GET    | /api/experiment/detail/:id        | Full experiment detail with per-packet logs                       | Yes (ADMIN)|
| GET    | /api/experiment/metrics           | Aggregate evaluation metrics                                      | Yes (ADMIN)|
| GET    | /api/experiment/export            | Download CSV                                                      | Yes (ADMIN)|
| GET    | /api/experiment/settings          | Fetch risk threshold settings                                     | Yes (ADMIN)|
| POST   | /api/experiment/settings          | Update thresholds                                                 | Yes (ADMIN)|

</details>

<details>
<summary><strong>ML Service Endpoints</strong></summary>

| Method | Endpoint          | Description                                                  |
|--------|-------------------|--------------------------------------------------------------|
| POST   | /train-baseline   | Train an IsolationForest from baseline feature vectors       |
| POST   | /score-anomaly    | Score a live feature vector → normalized anomaly score 0–1   |
| GET    | /health           | Health check                                                 |

</details>

---

## 🗄️ Database Schema

| Model | Purpose |
|-------|---------|
| **User** | Registered users with bcrypt-hashed passwords and role (USER/ADMIN) |
| **Session** | Tracked sessions with state machine, risk scores, step-up/revocation timestamps |
| **BehaviouralData** | Raw telemetry payloads + extracted 15-dimensional feature vectors |
| **BaselineModel** | Per-session statistical profile + ML model lifecycle (NOT_TRAINED → TRAINED) |
| **RiskAssessment** | Every risk decision with isolation score, drift score, combined score, explanations |
| **AuditLog** | Immutable trail of all system actions (17 event types) |
| **Experiment** | Research trial with ground truth, attack injection, and outcome metrics |
| **ExperimentLog** | Per-packet log within a trial: scores, predictions, ground truth |
| **SystemSettings** | Configurable risk thresholds (medium: 0.4, high: 0.7) |

---

## 🛠️ Manual Setup

<details>
<summary>Click to expand full manual setup instructions</summary>

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)
- **PostgreSQL** >= 14
- **Python** >= 3.10

### 1. Clone & Install

```bash
git clone https://github.com/Ogero79/sessionguard.git
cd sessionguard
cp .env.example .env
pnpm install
```

### 2. Setup PostgreSQL

```sql
CREATE USER sessionguard WITH PASSWORD 'your_password' CREATEDB;
CREATE DATABASE sessionguard OWNER sessionguard;
GRANT ALL PRIVILEGES ON DATABASE sessionguard TO sessionguard;
```

Update `DATABASE_URL` in both `.env` and `prisma/.env`:

```
DATABASE_URL=postgresql://sessionguard:your_password@localhost:5432/sessionguard
```

### 3. Database Migrations & Seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Configure Environment

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

### 6. Start Services

```bash
# Terminal 1 — Backend (http://localhost:4000)
pnpm dev:backend

# Terminal 2 — Frontend (http://localhost:3000)
pnpm dev:frontend

# Terminal 3 — ML Service (http://localhost:8000)
cd apps/ml-service
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

</details>

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup guide
- Code style and commit conventions
- PR process and review expectations

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 🔒 Security

Found a vulnerability? Please report it responsibly via our [Security Policy](SECURITY.md).

**Do not open public issues for security vulnerabilities.**

## 📄 License

Licensed under the [Apache License, Version 2.0](LICENSE).

Copyright 2025 SessionGuard Contributors.
