# SessionGuard: Supervisor Presentation & Live Demo Guide

This guide is a comprehensive script and technical resource designed to help you present **SessionGuard** to a supervisor, professor, or technical panel. It provides a structured 10-to-15 minute walkthrough, detailed explanations of architectural design decisions, and an anticipated Q&A section addressing advanced security and machine learning questions.

---

## Part 1: The Presentation Script (Step-by-Step)

### Slide 0 / Intro: The Pitch (What to say)
> *"Hello. Today I am presenting SessionGuard, an AI-driven continuous identity protection system. Traditional authentication mechanisms like passwords and Multi-Factor Authentication (MFA) only verify identity at the **front gate** (during login). Once a session is established and a JSON Web Token (JWT) is stored in the browser, that token is vulnerable to theft via Cross-Site Scripting (XSS), malware, or phishing. If an attacker steals that JWT, they hijack the session, and traditional servers have no way to distinguish the attacker from the legitimate user.*
>
> *SessionGuard solves this by implementing **Continuous Authentication**. It silently monitors browser-side behavioral biometrics—specifically typing rhythm, mouse kinetics, and routing patterns—to verify the user's identity *throughout* the session. If behavior drifts from the established baseline, the system automatically intervenes."*

---

### Step 1: Demo Setup (Do this before the presentation)
1. **Launch the Docker containers**:
   ```bash
   CORS_ORIGIN=http://192.168.1.50:3000 NEXT_PUBLIC_API_URL=http://192.168.1.50:4000 docker compose up --build
   ```
   *(Ensure you use your machine's actual local IP address so it binds to the network).*
2. **Open two browser windows side-by-side**:
   * **Left Window**: Standard browser (Chrome) - representing **Alice**, the legitimate user.
   * **Right Window**: Incognito/Private browser (Chrome Incognito) - representing **Eve**, the attacker.

---

### Step 2: Act I - Registration & Baseline Building (3 minutes)
1. **Register Alice**: In the **Left Window**, go to [http://192.168.1.50:3000/register](http://192.168.1.50:3000/register). Register an account (`alice@example.com` / `password123`).
2. **Show the Dashboard**: Point to the status badge on the **User Dashboard** ([http://192.168.1.50:3000/dashboard](http://192.168.1.50:3000/dashboard)). Point out it says **"Initializing Baseline (0/18 packets)"**.
   * **What to say**: *"Upon logging in, the system starts a monitored session. It does not evaluate risk yet. Instead, it enters a 3-minute training phase. The browser-side Behavioral SDK captures events and batches them every 10 seconds into a telemetry packet."*
3. **Build the Baseline**: Navigate to the **Data Capture Form** ([http://192.168.1.50:3000/form](http://192.168.1.50:3000/form)) and type/mouse around naturally. Do this until the counter reaches `18/18`.
4. **Transition to Active Monitoring**: Refresh Alice's User Dashboard. Show the state change to **"Active Monitoring"**.
   * **What to say**: *"Now, the backend has calculated Alice's statistical baseline (means and standard deviations for 15 behavioral features) and trained a custom IsolationForest model on the Python ML service, saved as a serialised `.joblib` file specific to Alice's session."*

---

### Step 3: Act II - Simulating the Session Hijack (The Theft)
1. **Expose the Stolen Token**:
   * In Alice's window (**Left**), press `F12` -> Go to **Application** (or **Storage**) -> **Local Storage** -> `http://192.168.1.50:3000`.
   * Double-click the value for **`tf_token`**, copy it, and close DevTools.
2. **Perform the Attack**:
   * In Eve's window (**Right / Incognito**), go to [http://192.168.1.50:3000/dashboard](http://192.168.1.50:3000/dashboard) (it redirects to login).
   * Press `F12` -> Go to **Application/Storage** -> **Local Storage** -> `http://192.168.1.50:3000`.
   * Create a new key named `tf_token` and paste the copied token. Close DevTools and **Refresh**.
   * **Observe**: Eve is immediately logged into Alice's account without entering credentials.
   * **Explain to the audience**: *"Eve has successfully hijacked Alice's session. To standard servers, Eve is indistinguishable from Alice because they share the exact same cryptographic JWT token. But watch what happens when Eve tries to use the system."*

---

### Step 4: Act III - Anomaly Detection & Adaptive Remediation
1. **Eve Interacts**: In Eve's window (**Right**), click the **Data Capture Form** and start typing erratically, mashing keys, or moving the mouse erratically.
2. **Observe step-up challenge**: Within 10-20 seconds (1-2 packets), a blocking **Step-Up Verification Modal** will overlay Eve's screen.
   * **What to say**: *"The backend risk engine calculated the combined anomaly score of the incoming packets. It detected a significant statistical drift. The adaptive policy immediately triggered a Step-Up challenge. Since Eve only stole the token and does not know Alice's password, she is completely blocked from performing actions."*
3. **Observe session revocation**: Keep generating erratic telemetry in Eve's window. Once the risk score crosses the high threshold (`0.7`):
   * Eve is logged out and redirected to [http://192.168.1.50:3000/login?reason=session_revoked](http://192.168.1.50:3000/login?reason=session_revoked).
   * Go to Alice's window (**Left**), click a link or refresh. Alice is **also** logged out!
   * **What to say**: *"Once risk crossed the high-critical boundary, the engine revoked the session. The backend updated the session state to `REVOKED` in the database, invalidating the token globally. When Alice refreshed, she was booted out as well, successfully containing the hijack."*

---

## Part 2: Under-the-Hood Architecture

To demonstrate deep understanding, be ready to explain the architecture using these details:

### 1. The 15-Dimensional Feature Vector
From each 10-second packet, [feature-extraction.service.ts](file:///home/ogero/Documents/dev/sessionguard/apps/backend/src/services/feature-extraction.service.ts) extracts a standardized behavioral feature vector:
1. **Keystroke Dynamics**: `avgInterKeyInterval`, `stdInterKeyInterval` (timing between keys), `avgHoldDuration` (key press duration), `typingBurstRate`, and `typingIdleRatio`.
2. **Mouse Kinetics**: `avgMouseVelocity`, `mouseAccelerationVariance`, `clickFrequency`, `scrollFrequency`, and `idleMouseRatio`.
3. **Navigation & Application State**: `avgRouteDwellTime` (average time on a page), `routeTransitionCount`, `tabFocusLossCount` (tab switching), `inactivityRatio`, and `sessionElapsedRatio`.

### 2. The Hybrid Risk Scoring Formula
The risk engine [risk.service.ts](file:///home/ogero/Documents/dev/sessionguard/apps/backend/src/services/risk.service.ts) scores each incoming packet using a weighted combination:
$$\text{Combined Score} = (0.7 \times \text{ML Anomaly Score}) + (0.3 \times \text{Z-Score Drift})$$

* **ML Anomaly Score (70%)**: Evaluated using the session's custom `IsolationForest` model. An outlier features vector yields a raw anomaly score which is normalized from `0` to `1`.
* **Z-Score Drift (30%)**: Evaluated by comparing the features against the user's initial baseline mean ($\mu$) and standard deviation ($\sigma$):
  $$Z = \frac{|Observed - \mu|}{\sigma}$$
  The mean absolute Z-score across all 15 dimensions is remapped to `[0, 1]` (with a threshold of 3.0 standard deviations remapped to `1.0` drift).

---

## Part 3: Anticipated Q&A (Think Outside the Box)

Here are technical questions your supervisor is likely to ask, along with precise, professional answers.

#### Q1: Why did you choose a hybrid risk scoring model instead of relying 100% on Machine Learning?
> **Answer**: *"Relying purely on machine learning introduces a 'black box' problem—it is highly sensitive to non-linear anomalies but hard to debug and explain. By combining it with a deterministic Z-Score drift algorithm (30% weight), we gain three advantages:
> 1. **Explainability**: We can calculate feature-level contributions and say exactly *why* a session was flagged (e.g., 'Mouse acceleration deviated by 4.2 standard deviations').
> 2. **Bootstrapping**: Z-score drift acts as a safety guardrail. If an ML service is briefly unreachable or fails to train, the statistical drift fallback ensures the system is still protected.
> 3. **Linear Baselines**: Some features are strictly linear and drift can be identified more reliably by simple standard deviation margins than by a fitted tree."*

#### Q2: IsolationForest is an unsupervised algorithm. Why use it instead of supervised algorithms like Random Forests or SVMs?
> **Answer**: *"Supervised models require labeled training data for both classes: normal behavior (benign) and hijacked behavior (attacks). In a real deployment, we cannot ask a legitimate user to 'act like an attacker' during registration to train a supervised model. 
> 
> IsolationForest isolates anomalies instead of profiling normal points. It constructs isolation trees; anomalies are isolated closer to the root of the tree, requiring fewer splits. This makes it ideal for one-class anomalies like session hijacking, where we only have baseline data for the legitimate user."*

#### Q3: Since telemetry is posted every 10 seconds, does this introduce a significant performance overhead? How does the server scale?
> **Answer**: *"To prevent performance degradation, the architecture enforces three optimizations:
> 1. **Batching**: Telemetry events (keystrokes, mouse moves) are aggregated and summarized *on the client-side* in the browser-side SDK. We only send a tiny 10-second summary packet, reducing network payload size to under 1KB.
> 2. **Asynchronous Execution**: In [session.service.ts](file:///home/ogero/Documents/dev/sessionguard/apps/backend/src/services/session.service.ts#L149), the backend triggers the risk evaluation asynchronously (`void riskService.evaluatePacket(...)`). Ingestion completes and returns a `200 OK` instantly, meaning the user experience is never blocked by the risk calculation.
> 3. **Microservice Isolation**: Heavy ML model training and scoring are offloaded to a FastAPI service. In production, the ML service can scale horizontally independently from the Express backend."*

#### Q4: If the JWT token is stolen, the attacker is using it on a different browser/IP. Why doesn't the backend block the request immediately based on IP or User-Agent, instead of waiting for behavioral telemetry?
> **Answer**: *"In a real-world SaaS, users frequently switch networks (e.g., walking out of an office and connecting to cellular data) or update their browsers, causing legitimate IP and User-Agent shifts. Relying strictly on IP/User-Agent restrictions results in high false-positive rates and severe user friction. 
> 
> SessionGuard uses IP and User-Agent as secondary audit markers but relies primarily on behavioral biometrics because physical typing rhythms and mouse dynamics cannot be spoofed, copied, or replayed, even if the attacker is using the exact same connection and user-agent string."*

#### Q5: What happens if an attacker captures the telemetry packet stream and replays old packets to fool the server?
> **Answer**: *"The system prevents replay attacks in two ways:
> 1. **Sequence Verification**: Each behavioral packet contains an incrementing `packetSequence` number. The backend database uses a unique composite index. If an attacker replays a packet, the database rejects it because that sequence has already been consumed.
> 2. **TLS & Session Binding**: In a production environment, telemetry packets are sent over secure HTTPS and are session-bound. Replaying a telemetry packet outside the active websocket/POST connection yields invalid authentication."*

#### Q6: How does the system handle temporary changes in user behavior, such as if the user gets tired, is eating, or injures their hand?
> **Answer**: *"This is a classic challenge in biometrics. In SessionGuard, this is handled by the **Adaptive Policy Engine**:
> * A temporary deviation might push the risk score into the Medium range (0.4 to 0.7), triggering a Step-Up challenge.
> * The user simply inputs their password to verify it is still them.
> * Once verified, the session is reset to `ACTIVE_MONITORING`. 
> * In a commercial deployment, this step-up verification would trigger a **running baseline update**, adjusting the statistical means and standard deviations to incorporate their current state (e.g., slower typing speed due to fatigue), allowing the model to adapt over time."*
