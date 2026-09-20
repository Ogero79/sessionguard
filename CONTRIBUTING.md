# Contributing to SessionGuard

Thank you for your interest in contributing to **SessionGuard**! :tada:

SessionGuard is an open-source, AI-driven continuous identity protection system designed to detect and mitigate session hijacking in authenticated web applications. By establishing baseline behavioural biometric profiles (keystroke dynamics, mouse kinematics, navigation patterns) and continuously evaluating anomaly drift using machine learning (`IsolationForest`), SessionGuard protects users from stolen session cookies and unauthorized account access in real time.

Whether you are fixing a bug, adding new telemetry collectors, refining ML anomaly detection models, enhancing the researcher experiment lab, or improving our documentation, your contributions make the project better for everyone.

> [!IMPORTANT]
> **Reporting Security Vulnerabilities**: If you discover a potential security vulnerability, please **DO NOT** create a public GitHub issue or pull request. Refer to our [SECURITY.md](file:///home/ogero/Documents/dev/sessionguard/SECURITY.md) and email [brianogero704@gmail.com](mailto:brianogero704@gmail.com) for coordinated private disclosure.

All contributors are expected to uphold our [Code of Conduct](file:///home/ogero/Documents/dev/sessionguard/CODE_OF_CONDUCT.md). Please read it before participating.

---

## Table of Contents

- [Repository Architecture](#repository-architecture)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
  - [1. Fork and Clone](#1-fork-and-clone)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Setup Local PostgreSQL Database](#4-setup-local-postgresql-database)
  - [5. Run Prisma Migrations and Seed](#5-run-prisma-migrations-and-seed)
  - [6. Build Shared Packages](#6-build-shared-packages)
  - [7. Run the Services](#7-run-the-services)
  - [Docker Compose Alternative](#docker-compose-alternative)
- [Running Tests](#running-tests)
  - [TypeScript Test Suite (Jest)](#typescript-test-suite-jest)
  - [Python ML Service Test Suite (pytest)](#python-ml-service-test-suite-pytest)
- [Code Style and Quality Standards](#code-style-and-quality-standards)
  - [TypeScript and JavaScript (ESLint & Prettier)](#typescript-and-javascript-eslint--prettier)
  - [Python (ruff)](#python-ruff)
  - [Prisma Schema Formatting](#prisma-schema-formatting)
- [Git Workflow and Branch Naming](#git-workflow-and-branch-naming)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
  - [Reporting Bugs](#reporting-bugs)
  - [Proposing Feature Requests](#proposing-feature-requests)
- [Code Review Expectations](#code-review-expectations)

---

## Repository Architecture

SessionGuard is organized as a monorepo powered by **pnpm workspaces**:

```
sessionguard/
├── apps/
│   ├── backend/            # Express + TypeScript + Prisma ORM (core API, risk policy engine, session management)
│   ├── frontend/           # Next.js 14 App Router + TypeScript + Tailwind CSS (dashboard, experiment lab, step-up modal)
│   └── ml-service/         # Python FastAPI + scikit-learn (IsolationForest baseline training & anomaly inference)
├── packages/
│   ├── behavioural-sdk/    # Client-side behavioural biometric telemetry collection SDK
│   └── shared-types/       # Shared TypeScript interfaces, risk schemas, and event payload contracts
├── prisma/                 # Database schema, migrations, and seed scripts
├── docker-compose.yml      # Orchestration for PostgreSQL, ML service, backend, and frontend
├── package.json            # Root workspace configuration and scripts
├── pnpm-workspace.yaml     # Monorepo workspace package definitions
├── CONTRIBUTING.md         # Contribution guidelines (this document)
├── CODE_OF_CONDUCT.md      # Contributor Covenant v2.1 code of conduct
└── SECURITY.md             # Responsible vulnerability disclosure policy
```

---

## Prerequisites

Ensure you have installed the following development tools:

- **Node.js**: `>= 18.0.0` (LTS recommended)
- **pnpm**: `>= 8.0.0` (pnpm `9.x` recommended: `npm install -g pnpm`)
- **Python**: `>= 3.10`
- **PostgreSQL**: `>= 14.0` (or Docker for running PostgreSQL locally)
- **Docker & Docker Compose**: (Optional, for containerized local development)

---

## Local Development Setup

Follow these steps to set up your local development environment:

### 1. Fork and Clone

Fork the repository to your own GitHub account, then clone it locally:

```bash
git clone https://github.com/<your-username>/sessionguard.git
cd sessionguard
```

Add the upstream remote to stay synchronized with the main project:

```bash
git remote add upstream https://github.com/ogero79/sessionguard.git
```

### 2. Environment Configuration

Copy the root `.env.example` file to `.env`:

```bash
cp .env.example .env
```

If you wish to configure package-specific variables, copy the individual environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

> [!TIP]
> For local development, the default database URL in `.env.example` is `postgresql://sessionguard:sessionguard_secret@localhost:5432/sessionguard`. Always set a custom, random `JWT_SECRET` in `apps/backend/.env`.

### 3. Install Dependencies

Install all root and workspace dependencies using `pnpm`:

```bash
pnpm install
```

### 4. Setup Local PostgreSQL Database

If you have PostgreSQL installed locally, create the role and database:

```sql
CREATE USER sessionguard WITH PASSWORD 'sessionguard_secret' CREATEDB;
CREATE DATABASE sessionguard OWNER sessionguard;
GRANT ALL PRIVILEGES ON DATABASE sessionguard TO sessionguard;
```

Alternatively, you can run just the PostgreSQL container via Docker:

```bash
docker compose up -d postgres
```

### 5. Run Prisma Migrations and Seed

Generate the Prisma client, run database migrations, and seed demo accounts:

```bash
# Generate Prisma Client
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Seed database with demo accounts
pnpm db:seed
```

Seeded credentials for testing:
- **Researcher / Administrator**: `admin@sessionguard.dev` / `admin123` (Access to Experiment Lab and Session Monitor)
- **Standard User**: `demo@sessionguard.dev` / `demo123`

### 6. Build Shared Packages

The workspace packages (`@sessionguard/shared-types` and `@sessionguard/behavioural-sdk`) must be built before starting the backend or frontend:

```bash
pnpm --filter @sessionguard/shared-types build
pnpm --filter @sessionguard/behavioural-sdk build
```

### 7. Run the Services

You can run each service in separate terminal windows:

#### Terminal 1 — Backend (Port 4000)
```bash
pnpm dev:backend
```
*Health check:* [http://localhost:4000/api/health](http://localhost:4000/api/health)

#### Terminal 2 — Frontend (Port 3000)
```bash
pnpm dev:frontend
```
*Application UI:* [http://localhost:3000](http://localhost:3000)

#### Terminal 3 — ML Service (Port 8000)
```bash
cd apps/ml-service
python -m venv .venv
source .venv/bin/activate       # On Linux/macOS
# .venv\Scripts\activate        # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*ML Service health check:* [http://localhost:8000/health](http://localhost:8000/health)

---

### Docker Compose Alternative

To run the entire stack (PostgreSQL, ML service, Backend, and Frontend) simultaneously with a single command:

```bash
docker compose up --build
```

The backend container will automatically run database migrations and seeds on startup.

---

## Running Tests

All pull requests must pass existing test suites and include tests for new functionality.

### TypeScript Test Suite (Jest)

To run the Jest test suite across all TypeScript packages and applications in the workspace:

```bash
pnpm test
```

To run tests for a specific workspace package:

```bash
# Test backend services, auth, and risk engine
pnpm --filter @sessionguard/backend test

# Test behavioural telemetry SDK
pnpm --filter @sessionguard/behavioural-sdk test
```

### Python ML Service Test Suite (pytest)

The ML service uses `pytest` and `httpx` (`TestClient`) to test IsolationForest baseline training, anomaly scoring, and boundary validation:

```bash
cd apps/ml-service
source .venv/bin/activate
pytest -v
```

You can also run specific test modules directly:

```bash
pytest app/test_main.py -v
```

---

## Code Style and Quality Standards

### TypeScript and JavaScript (ESLint & Prettier)

- We enforce strict typing (`typescript >= 5.4`). Avoid `any`; use specific interfaces or generics defined in `packages/shared-types`.
- Run the linter across all workspaces:
  ```bash
  pnpm lint
  ```
- Linting for specific packages:
  ```bash
  pnpm --filter @sessionguard/backend lint
  pnpm --filter @sessionguard/frontend lint
  ```

### Python (ruff)

For `apps/ml-service`, we use **Ruff** for high-performance linting and code formatting:

```bash
cd apps/ml-service
# Check linting rules
ruff check .

# Fix auto-fixable lint issues
ruff check --fix .

# Check formatting
ruff format --check .

# Apply code formatting
ruff format .
```

Ensure all functions have explicit type annotations and docstrings explaining input/output schemas.

### Prisma Schema Formatting

When modifying `prisma/schema.prisma`, format the schema before committing:

```bash
pnpm --filter @sessionguard/prisma exec prisma format
```

---

## Git Workflow and Branch Naming

We use a standard feature-branch workflow. Create focused branches branched from the latest `upstream/main`.

### Branch Naming Conventions

Prefix your branch name with one of the following categories:

| Prefix | Description | Example |
|--------|-------------|---------|
| `feat/` | A new feature or enhancement | `feat/mouse-jitter-detection` |
| `fix/` | A bug fix | `fix/session-expiry-race-condition` |
| `docs/` | Documentation changes only | `docs/update-architecture-diagram` |
| `refactor/` | Code refactoring without behavioral changes | `refactor/extract-risk-policy-matrix` |
| `test/` | Adding or improving tests | `test/ml-boundary-zscore-cases` |
| `perf/` | Performance optimizations | `perf/telemetry-batch-buffering` |
| `chore/` | Tooling, dependencies, or maintenance | `chore/bump-prisma-dependencies` |

Example:
```bash
git checkout main
git pull upstream main
git checkout -b feat/keystroke-flight-time-feature
```

---

## Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This enables clean changelog generation and clear git history.

### Commit Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation improvements
- `style`: Formatting, missing semicolons, no code change
- `refactor`: Refactoring code without altering functionality
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Tooling, workflow, dependencies, or build tasks
- `ci`: CI configuration changes

### Scopes

Use the affected component as the scope:
- `backend`
- `frontend`
- `ml-service`
- `sdk`
- `types`
- `prisma`
- `docker`
- `docs`

### Examples

:white_check_mark: **Good commit messages**:
- `feat(sdk): capture scroll velocity and directional acceleration`
- `fix(backend): correct false positive step-up challenge trigger on tab focus switch`
- `test(ml-service): add unit tests for IsolationForest contaminated training vectors`
- `docs(readme): add troubleshooting section for local PostgreSQL connections`

:x: **Avoid vague commit messages**:
- `fix stuff`
- `update backend`
- `WIP`
- `bugfix`

---

## Pull Request Process

1. **Keep Pull Requests Focused**: Each PR should address a single concern or feature. Avoid combining unrelated fixes or style changes.
2. **Synchronize with Upstream**: Rebase your branch onto the latest `upstream/main` before opening the PR:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
3. **Verify Quality Checks Locally**:
   - Run linter: `pnpm lint`
   - Run tests: `pnpm test` and `cd apps/ml-service && pytest`
   - Ensure build passes: `pnpm build`
4. **Submit PR Against `main`**:
   - Fill out the PR template with a clear description of the problem, the solution, and verification steps.
   - Reference related issues (e.g., `Closes #42` or `Fixes #18`).
   - If UI changes were made, attach screenshots or a brief screen recording.
5. **Address Feedback**:
   - Engage with reviewer feedback respectfully.
   - Push follow-up commits to your branch; GitHub will update the PR automatically.
   - Avoid force-pushing while an active review is underway unless requested.

---

## Issue Guidelines

### Reporting Bugs

Before creating a bug report, search existing issues to see if it has already been reported.

When opening a new bug report, include:
- **Clear Title**: Concise summary of the defect.
- **Environment**:
  - Operating System (Linux / macOS / Windows)
  - Node.js & pnpm versions
  - Python version
  - Browser name and version (for SDK or frontend issues)
  - PostgreSQL version
- **Steps to Reproduce**: Minimal, numbered steps to trigger the bug.
- **Expected Behavior**: What you expected to happen.
- **Actual Behavior**: What actually happened.
- **Logs / Screenshots**: Terminal logs, browser console output, or stack traces (**ensure all tokens and passwords are redacted**).

### Proposing Feature Requests

We welcome ideas for improving SessionGuard! When proposing a new feature:
- Describe the **use case** and problem you are trying to solve.
- Explain your **proposed technical solution** or architecture changes.
- Discuss any **alternatives** you considered.
- Detail any **security or privacy implications** (especially critical when dealing with behavioural telemetry and machine learning).

---

## Code Review Expectations

All contributions are reviewed by maintainers before merging. During code review, we evaluate:

- **Correctness & Safety**: Does the code perform as expected without introducing security flaws or race conditions?
- **Test Coverage**: Are unit and integration tests present and thorough?
- **Architecture & Maintainability**: Does the design align with the existing monorepo structure and shared packages?
- **Documentation**: Are new APIs, environment variables, or endpoints documented?
- **Empathy & Respect**: Code review is a collaborative learning process. We ask both reviewers and authors to remain constructive, polite, and open-minded.

---

## Community & Questions

- **Code of Conduct**: [CODE_OF_CONDUCT.md](file:///home/ogero/Documents/dev/sessionguard/CODE_OF_CONDUCT.md)
- **Security Inquiries**: [brianogero704@gmail.com](mailto:brianogero704@gmail.com)
- **Code of Conduct Inquiries**: [brianogero704@gmail.com](mailto:brianogero704@gmail.com)

Thank you for helping us make session security continuous, intelligent, and open! :shield:
