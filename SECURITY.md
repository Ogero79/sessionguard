# Security Policy

SessionGuard is an AI-driven continuous identity protection system designed to detect and mitigate session hijacking in real time. Because SessionGuard operates as a critical security control safeguarding authenticated web applications, maintaining the integrity and security of SessionGuard itself is our highest priority.

We take all security reports seriously and appreciate the contributions of security researchers and community members who help protect our users.

---

## Scope

This security policy applies to all active repositories and production-ready components within the SessionGuard monorepo:

| Component | Path | In Scope | Description |
|-----------|------|:--------:|-------------|
| **Core Backend** | `apps/backend` | Yes | Express API, JWT authentication, risk policy engine, session lifecycle management, telemetry ingestion |
| **Behavioural SDK** | `packages/behavioural-sdk` | Yes | Browser-side event collection SDK, telemetry serialization, tampering resistance |
| **ML Inference Service** | `apps/ml-service` | Yes | Python FastAPI service, scikit-learn IsolationForest model training/scoring, model deserialization (`joblib`) |
| **Shared Types & Contracts** | `packages/shared-types` | Yes | Telemetry schemas, API request/response validation types |
| **Database & ORM** | `prisma` | Yes | Prisma schema definitions, database migrations, access control constraints |
| **Frontend Application** | `apps/frontend` | Yes | Next.js 14 dashboard, step-up challenge modals, session state synchronization |
| **Deployment Assets** | `docker-compose.yml`, `Dockerfile` | Yes | Container isolation, exposed ports, service orchestration configurations |

### Supported Versions

Only the latest release and the current `main` branch receive security patches:

| Version / Branch | Supported |
|------------------|-----------|
| `main`           | :white_check_mark: |
| Latest Release   | :white_check_mark: |
| Older Releases   | :x: |

### Out of Scope

The following areas are explicitly excluded from vulnerability reports:

* Attacks requiring physical access to an already compromised or unlocked user device.
* Volumetric Distributed Denial of Service (DDoS) against test, demonstration, or local instances.
* Social engineering, phishing, or physical attacks targeting SessionGuard maintainers or contributors.
* Issues in upstream third-party dependencies (Node.js, Python, PostgreSQL, Next.js, FastAPI) unless an exploitable path exists within SessionGuard's implementation.
* Reports from automated vulnerability scanners without a validated, reproducible proof of concept demonstrating practical exploitability.
* Missing best-practice HTTP security headers or cookie flags on non-production local development configurations (`localhost`).

---

## Reporting a Vulnerability

> [!IMPORTANT]
> **DO NOT** report security vulnerabilities via public GitHub issues, discussions, pull requests, or public social channels.

If you believe you have discovered a vulnerability or security flaw in SessionGuard, please disclose it privately by sending an email to:

**[security@sessionguard.dev](mailto:security@sessionguard.dev)**

### What to Include in Your Report

To help us triage and resolve the issue quickly, please provide as much detail as possible:

1. **Title & Summary**: A brief summary of the vulnerability and the component affected (`apps/backend`, `packages/behavioural-sdk`, `apps/ml-service`, etc.).
2. **Vulnerability Type**: Classification (e.g., Authentication Bypass, Remote Code Execution, Deserialization Flaw, SQL/NoSQL Injection, Telemetry Spoofing / Replay Attack, Insecure Direct Object Reference, Cross-Site Scripting).
3. **Severity & Impact Assessment**: Your assessment of the potential impact (including estimated CVSS v3.1/v4.0 score or vector string if available).
4. **Step-by-Step Reproduction**: Detailed, reproducible steps explaining how to trigger the vulnerability. Include:
   * System environment (OS, Node.js version, Python version, browser, PostgreSQL version).
   * Exact HTTP requests, curl commands, or script snippets.
   * Telemetry packets or mock attack payloads used.
5. **Proof of Concept (PoC)**: Minimal, non-destructive PoC code demonstrating the security risk.
6. **Proposed Fix**: Any suggestions, code patches, or configuration changes you believe mitigate the issue.
7. **Disclosure History**: Let us know if you have disclosed or plan to disclose this issue to any other party.

---

## Response Timeline & SLAs

Our security response team adheres to the following service level targets for reported vulnerabilities:

| Stage | SLA Target | Description |
|-------|:----------:|-------------|
| **Initial Acknowledgement** | **Within 48 hours** | We acknowledge receipt of your submission and assign a security coordinator. |
| **Initial Triage & Assessment** | **Within 7 days** | We validate the vulnerability, verify reproducibility, and confirm severity rating. |
| **Status Updates** | **Every 7–10 days** | We provide periodic progress updates while designing and testing a patch. |
| **Critical / High Patch Release** | **Within 30 days** | We release an emergency patch and security advisory for critical severity flaws. |
| **Medium / Low Patch Release** | **Within 60–90 days** | Non-critical vulnerabilities are scheduled for remediation in standard release cycles. |
| **Public Advisory** | **Coordinated** | Coordinated disclosure via GitHub Security Advisory (GHSA) and CVE assignment. |

---

## Responsible Disclosure Policy & Safe Harbor

We believe in responsible, coordinated disclosure to protect end users. We ask that reporters:

* Make a good-faith effort to avoid privacy violations, data loss, destruction of data, or disruption of services.
* Provide us a reasonable window of time (pursuant to our SLAs above) to remediate the vulnerability before publicly disclosing details.
* Do not access, modify, or exfiltrate user data beyond what is strictly necessary to establish a proof of concept.
* Do not demand financial compensation or ransoms as a condition of disclosing vulnerabilities.

### Safe Harbor

If you conduct vulnerability research in compliance with this policy:
* We consider your security research to be **authorized** and lawful.
* We will not pursue legal action against you regarding your research activities.
* We will collaborate openly with you to understand and remediate the issue promptly.
* We will give you proper public credit in our **Security Hall of Fame** (unless you prefer anonymity).

---

## Security Best Practices for Deployers

SessionGuard is designed to be resilient, but real-world security depends on proper deployment hygiene. All operators and deployers must adhere to the following hardening practices:

### 1. Rotate JWT Secrets Immediately
* **Risk**: The repository ships with a placeholder `JWT_SECRET` in `.env.example` (`replace-with-a-strong-random-secret-min-32-chars`). If left unchanged, an attacker can forge administrative JWT tokens and bypass authentication entirely.
* **Hardening**: Generate a high-entropy secret (minimum 256 bits) prior to production deployment:
  ```bash
  openssl rand -base64 48
  ```
  Set this value in `apps/backend/.env` or your production secret store (`JWT_SECRET`).

### 2. Strong PostgreSQL Credentials & Isolation
* **Risk**: Using default database credentials (`sessionguard_secret`) or exposing port `5432` to the public internet allows unauthorized access to raw telemetry, audit logs, and user credentials.
* **Hardening**:
  * Set strong, randomized passwords for `POSTGRES_PASSWORD` in production.
  * Restrict PostgreSQL connections strictly to the internal Docker network or VPC; bind only to `127.0.0.1` if hosted locally.
  * Ensure least-privilege role assignments for production application users.

### 3. Restrict CORS & Origin Validation
* **Risk**: Overly permissive Cross-Origin Resource Sharing (CORS) configurations allow malicious web pages to forge telemetry submissions or interact with authenticated session endpoints.
* **Hardening**:
  * Explicitly set `CORS_ORIGIN` to the exact production domain(s) of your frontend (e.g., `https://app.example.com`).
  * Never set `CORS_ORIGIN=*` in production environments.

### 4. Mandatory TLS Termination & Transport Security
* **Risk**: Unencrypted HTTP traffic exposes JWT authorization tokens and behavioural biometric telemetry (keystroke dynamics, mouse paths) to passive network eavesdropping and tampering.
* **Hardening**:
  * Enforce TLS 1.3 via reverse proxies (e.g., Nginx, Caddy, Cloudflare, Traefik, or AWS ALB).
  * Configure HTTP Strict Transport Security (`HSTS`) with `includeSubDomains; preload`.

### 5. ML Service Isolation & Model Security
* **Risk**: The ML service (`apps/ml-service`) serializes and loads scikit-learn models using `joblib`. Deserialization of untrusted files can lead to arbitrary code execution.
* **Hardening**:
  * Keep the ML service on an internal network (`http://ml-service:8000`) accessible **only** to the backend service. Do not expose port 8000 to the public internet.
  * Restrict write permissions on the `models/` directory so only the ML service container process can create or modify `.joblib` model artifacts.

### 6. Telemetry Privacy & Data Minimization
* **Risk**: Inadvertently capturing sensitive inputs (such as passwords, credit card numbers, or personal identifying information) violates data privacy regulations (GDPR, CCPA).
* **Hardening**:
  * The `@sessionguard/behavioural-sdk` measures timing and physical dynamics (dwell times, flight times, velocity, acceleration), **not** the characters typed.
  * Verify that input fields with sensitive data types (`type="password"`, `inputmode="numeric"`, or elements with `data-sg-ignore` attributes) are properly ignored by telemetry collectors.

### 7. Production Container Hardening
* **Risk**: Running containers with root privileges or writable root filesystems increases blast radius if a container escape occurs.
* **Hardening**:
  * Use unprivileged service accounts inside containers.
  * Use read-only root filesystems where practical, using explicit volume mounts only for persistent state (`postgres_data`, `ml_models`).
  * Use Docker Secrets, AWS Secrets Manager, or HashiCorp Vault instead of committing plain `.env` files.

---

## Bug Bounty Notice

> [!NOTE]
> **SessionGuard does NOT currently operate a paid bug bounty program.**
>
> We are an open-source security project and currently cannot offer monetary rewards or bounties for vulnerability reports. We hope to establish a funded bug bounty program in the future as the project matures.
>
> In the meantime, we deeply value and publicly acknowledge all researchers who help keep SessionGuard secure via our **Security Hall of Fame**.

---

## Security Hall of Fame

We extend our sincere gratitude to the following security researchers who have responsibly disclosed vulnerabilities in accordance with this policy:

| Researcher | Vulnerability / Component | Date | Link / Handle |
|------------|---------------------------|:----:|---------------|
| *Your Name Here* | *Reserved for first responsible disclosure* | — | — |

If you report a confirmed vulnerability and would like to be credited in our Hall of Fame, please let us know your preferred name, handle, or website link in your disclosure email.
