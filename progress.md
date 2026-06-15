# SessionGuard Project Progress

SessionGuard is an AI-driven continuous identity protection system designed to detect session hijacking in authenticated web applications. It implements an end-to-end continuous authentication pipeline: browser behavioral telemetry collection, statistical baseline profile generation, IsolationForest-based anomaly detection, and an adaptive policy engine.

---

## 🏗️ Architecture & Component Overview

The codebase is organized as a monorepo structured as follows:

- **`apps/frontend`**: Next.js 14 Web Application (TypeScript, TailwindCSS)
  - Features real-time session status monitoring, settings, and behavioral capture forms.
  - Implements a global step-up verification modal to challenge users upon medium-risk detection.
  - **Core pages**: `/login`, `/register`, `/forgot-password` (simulated), `/dashboard`, `/profile`, `/settings`, `/form`.
  - **`/form`**: A multi-field form page with text inputs, dropdowns, sliders, and text areas. Its sole purpose is to generate rich, realistic keystroke and mouse telemetry during the baseline collection window (~18 packets / 3 minutes).
  - **Simulated workspace pages** (`/tasks`, `/notes`, `/requests`, `/activity`, `/help`): Static mock-UI pages that exist to produce realistic multi-route navigation telemetry. They are not backed by real APIs beyond the behavioural SDK.
  - **Internal pages** (ADMIN role only):
    - `/internal/session-monitor`: Live telemetry dashboard showing all active sessions with risk level gauges, ML model status, and the last 10 risk assessments per session.
    - `/internal/experiments`: **Experimentation Lab** — the primary researcher interface. Allows administrators to: start a new trial linked to an active session, inject a simulated attack mid-trial, end a trial and compute TP/TN/FP/FN/accuracy/FPR/latency metrics, view per-packet score timeseries charts with configurable risk threshold overlay lines, and download experiment logs as CSV.
  - **Sidebar**: Role-adaptive navigation — the "Researcher Lab" section (Experiment Lab, Telemetry Monitor) is only rendered for `ADMIN` users.
  - > **Branding note**: The frontend UI carries residual "TaskFlow" branding (logo text, page titles). This is intentional — it simulates a real-world SaaS application that SessionGuard would protect, keeping participants focused on normal work behaviour rather than the security layer.
- **`apps/backend`**: Express Application (TypeScript, Prisma ORM)
  - Manages session state machine, telemetry ingestion, baseline profile calculation, and risk evaluation.
- **`apps/ml-service`**: FastAPI Service (Python, scikit-learn)
  - Trains per-session `IsolationForest` models from baseline behavioral vectors.
  - Computes real-time anomaly scores for ingested telemetry packets.
- **`packages/behavioural-sdk`**: Browser-side telemetry collection library.
  - Tracks keystroke timing, mouse movements/clicks, scrolls, navigation events, and window focus/blur.
  - Groups events into 10-second batches and POSTs them to the backend ingestion endpoint.
- **`packages/shared-types`**: Shared TypeScript contracts, metrics, and API payloads used across the workspace.
- **`prisma/`**: Prisma Schema (`schema.prisma`) defining relational database models: `User`, `Session`, `BehaviouralData`, `BaselineModel`, `RiskAssessment`, and `AuditLog`.

---

## 🛠️ Diagnostics & Compatibility Fixes Applied

To get the project into a fully compile-ready state, the following dependencies and integration fixes were implemented:

1. **Workspace Dependency Restoration**:
   - Reinstalled and linked workspace packages using `pnpm install`.
2. **Prisma Client Synchronisation**:
   - Ran `pnpm db:generate` to compile database schemas and sync types. This resolved multiple Prisma model type mismatches (e.g. `BaselineModel` properties, `RiskAssessment` model) in the backend.
3. **Backend Type Portability Resolution**:
   - Added `"declaration": false` and `"declarationMap": false` overrides inside [tsconfig.json](file:///home/ogero/Documents/dev/sessionguard/apps/backend/tsconfig.json) for the backend application, resolving type serialization issues (`TS2742`).
4. **Next.js CSR Prerendering Bailout Fix**:
   - Extracted the login search parameter check in [page.tsx](file:///home/ogero/Documents/dev/sessionguard/apps/frontend/src/app/login/page.tsx) and wrapped the form component inside a React `<Suspense>` boundary. This resolved the Next.js static prerender compilation error.
5. **Active Session Reuse and Synchronization**:
   - Fixed a critical vulnerability and session-drift bug in [session.service.ts](file:///home/ogero/Documents/dev/sessionguard/apps/backend/src/services/session.service.ts). Previously, page refreshes or token imports (such as in hijacking) started new baseline sessions, bypassing risk checks. Now, the backend reuses active sessions within the 30-minute inactivity window, forcing correct telemetry sharing.
6. **Administrator Tracking Exclusions**:
   - Resolved a conflict where the admin's own activity triggered step-up challenges. Disabled monitored session creation and risk polling for the `ADMIN` role in [session-context.tsx](file:///home/ogero/Documents/dev/sessionguard/apps/frontend/src/lib/session-context.tsx) and [risk-context.tsx](file:///home/ogero/Documents/dev/sessionguard/apps/frontend/src/lib/risk-context.tsx).
7. **Cross-Browser Option Styling Fix**:
   - Addressed invisible text inside dropdown lists on Linux web browsers by explicitly applying background and text classes (`className="bg-gray-900 text-white"`) to the select options in [page.tsx](file:///home/ogero/Documents/dev/sessionguard/apps/frontend/src/app/internal/experiments/page.tsx).

As a result of these changes, running **`docker compose up --build`** compiles the entire monorepo and enables flawless multi-browser session hijacking demonstrations.

---

## 🚦 Ingest & Evaluation Pipeline Status

- **Initialization Phase**:
  - Telemetry collection captures raw user telemetry for the first **18 packets** (~3 minutes).
  - Backend aggregates these packets to generate a `BaselineProfile` (means, standard deviations, and ranges).
  - ML service fits an `IsolationForest` estimator and persists it on disk as a `.joblib` model file unique to the session.
- **Continuous Monitoring**:
  - Raw telemetry is continuously batched and ingested every 10s.
  - The risk engine evaluates each vector using a combined weighted formula:
    $$\text{Combined Score} = 0.7 \times \text{Isolation Forest Anomaly Score} + 0.3 \times \text{Z-score Drift}$$
- **Adaptive Remediation Engine**:
  - Automatically assesses incoming telemetry against active configuration thresholds.
  - **LOW Risk** ($\text{Score} < \text{Medium Threshold}$): Telemetry continues silently.
  - **MEDIUM Risk** ($\text{Medium Threshold} \le \text{Score} < \text{High Threshold}$): Triggers a step-up credential challenge blocking UI interactions.
  - **HIGH Risk** ($\text{Score} \ge \text{High Threshold}$): Instantly revokes the session and redirects the user to the login page.

---

## 🔒 Research-Readiness Hardening & Lifecycle Controls

To support controlled participant testing, evaluation frameworks, and simulated session hijacking experiments, the following security hardening measures have been implemented:

1. **Explicit Session State Lifecycle**:
   - Integrated `TERMINATED` and `EXPIRED` states into the `SessionState` enum.
   - User logouts actively set session state to `TERMINATED` and record the termination timestamp (`endedAt`).
   - Inactivity checks flag sessions idle for more than 30 minutes as `EXPIRED` during telemetry ingestion or client-side status polling, disabling active monitoring.
2. **Comprehensive Audit Logs**:
   - Automated auditing records `REGISTER`, `LOGIN`, `LOGOUT`, `SESSION_END`, and `SETTINGS_CHANGED` actions.
   - Audit logs capture details including IP addresses, user-agents, and previous/updated values when settings are adjusted.
3. **Dynamic Risk Threshold Configuration**:
   - Replaced hardcoded risk boundaries with values queried dynamically from the database (`SystemSettings` model).
   - Added a **System Configuration** dashboard panel to the **Experimentation Lab** page (`/internal/experiments`) allowing administrators to adjust and save thresholds (defaults: Medium `0.4`, High `0.7`) on-the-fly.
   - Dynamically propagates active thresholds to the evaluation engine and matches the horizontal warning guidelines on the timeseries charts.
4. **Experimentation Lab** (`/internal/experiments`):
   - Full research trial lifecycle: start → collect baseline → optionally inject attack → end → review metrics.
   - Per-packet `ExperimentLog` rows written by `risk.service.ts` during every evaluation while a trial is `RUNNING`.
   - Outcome metrics computed by `experiment.service.ts` on trial end: TP/TN/FP/FN, packet-level detection accuracy, false positive rate, detection latency (ms from `attackInjectedAt` to first alarm), and response latency.
   - CSV export available for both individual experiment logs and an aggregate summary of all experiments.
   - Global evaluation metrics endpoint (`GET /api/experiment/metrics`) aggregates TP/TN/FP/FN and averages across all completed trials.

---

## 🚀 Recommended Next Steps

1. **Local Database Provisioning**:
   - Spin up a local PostgreSQL instance as described in the `README.md`.
   - Run migrations (`pnpm db:migrate`) and seed database credentials (`pnpm db:seed`).
2. **Service Verification**:
   - Start the ML service (`apps/ml-service`), backend (`pnpm dev:backend`), and frontend (`pnpm dev:frontend`).
   - Register a new user via `/register` (bcrypt-compatible credentials required — seeded accounts use SHA-256 and cannot log in through the normal flow).
3. **Baseline Establishment**:
   - After login, the session auto-starts and behavioural tracking begins.
   - Navigate to `/form` and interact with the form fields (typing, mouse movement) for approximately **3 minutes** (18 × 10-second packets) to build the initial baseline profile.
   - The Dashboard will show baseline progress and transition to "Active Monitoring" once sufficient data is collected.
4. **End-to-End Simulation & Evaluation** (ADMIN role required):
   - Navigate to `/internal/experiments` (Experimentation Lab).
   - Start a new trial, selecting a monitored session and ground truth label (`BENIGN` or `HIJACKED`).
   - Optionally click **Inject Attack** mid-trial to toggle the `attackInjected` flag (this causes subsequent experiment log rows to carry `groundTruth = ATTACK`).
   - Continue generating telemetry via `/form` or the simulated workspace pages.
   - Click **End Trial** to compute and view TP/TN/FP/FN metrics and per-packet score timeseries.
   - Adjust risk thresholds via the **System Configuration** panel and re-run trials to evaluate sensitivity.
   - Download results as CSV from the **Export** button.
5. **Telemetry Monitoring**:
   - Use `/internal/session-monitor` to observe live risk assessments for all active sessions in real time.
