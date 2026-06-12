import type {
  MLScoreAnomalyRequest,
  MLScoreAnomalyResponse,
  MLTrainBaselineRequest,
  MLTrainBaselineResponse,
} from "@sessionguard/shared-types";
import { env } from "../config/env";

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Typed HTTP client for the Python ML microservice.
 *
 * Translates between snake_case (Python/FastAPI) and camelCase (Node/TS).
 * All methods are safe-to-fail: callers always get a structured response,
 * never a thrown network error.
 */
export class MLClientService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.ML_SERVICE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async trainBaseline(
    req: MLTrainBaselineRequest
  ): Promise<MLTrainBaselineResponse> {
    try {
      const response = await this.post("/train-baseline", {
        session_id: req.sessionId,
        feature_vectors: req.featureVectors,
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          sessionId: req.sessionId,
          modelId: "",
          status: "failed",
          samplesUsed: req.featureVectors.length,
          message: `ML service returned ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      const body = (await response.json()) as {
        session_id: string;
        model_id: string;
        status: "trained" | "failed";
        samples_used: number;
        message?: string;
      };

      return {
        sessionId: body.session_id,
        modelId: body.model_id,
        status: body.status,
        samplesUsed: body.samples_used,
        message: body.message,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown ML error";
      return {
        sessionId: req.sessionId,
        modelId: "",
        status: "failed",
        samplesUsed: req.featureVectors.length,
        message: `ML service unreachable: ${message}`,
      };
    }
  }

  async scoreAnomaly(
    req: MLScoreAnomalyRequest
  ): Promise<MLScoreAnomalyResponse> {
    try {
      const response = await this.post("/score-anomaly", {
        session_id: req.sessionId,
        feature_vector: req.featureVector,
      });

      if (!response.ok) {
        return {
          sessionId: req.sessionId,
          anomalyScore: 0,
          rawScore: 0,
          modelFound: false,
        };
      }

      const body = (await response.json()) as {
        session_id: string;
        anomaly_score: number;
        raw_score: number;
        model_found: boolean;
      };

      return {
        sessionId: body.session_id,
        anomalyScore: body.anomaly_score,
        rawScore: body.raw_score,
        modelFound: body.model_found,
      };
    } catch {
      return {
        sessionId: req.sessionId,
        anomalyScore: 0,
        rawScore: 0,
        modelFound: false,
      };
    }
  }

  private async post(path: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const mlClientService = new MLClientService();
