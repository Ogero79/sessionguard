-- CreateEnum
CREATE TYPE "MLModelStatus" AS ENUM ('NOT_TRAINED', 'TRAINING', 'TRAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskAction" AS ENUM ('NONE', 'STEP_UP_REQUIRED', 'SESSION_REVOKED');

-- CreateEnum
CREATE TYPE "BaselineStatus" AS ENUM ('COLLECTING', 'ESTABLISHED', 'FAILED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'STEP_UP_REQUIRED';
ALTER TYPE "AuditAction" ADD VALUE 'STEP_UP_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'ML_MODEL_TRAINED';
ALTER TYPE "AuditAction" ADD VALUE 'ML_TRAINING_FAILED';

-- AlterEnum
ALTER TYPE "SessionState" ADD VALUE 'INITIALIZING_BASELINE';
ALTER TYPE "SessionState" ADD VALUE 'ACTIVE_MONITORING';
ALTER TYPE "SessionState" ADD VALUE 'STEP_UP_REQUIRED';
ALTER TYPE "SessionState" ADD VALUE 'REVOKED';

-- DropIndex
DROP INDEX "behavioural_data_timestamp_idx";

-- AlterTable
ALTER TABLE "baseline_models" DROP COLUMN "model_type",
DROP COLUMN "parameters",
DROP COLUMN "version",
ADD COLUMN     "baseline_status" "BaselineStatus" NOT NULL DEFAULT 'COLLECTING',
ADD COLUMN     "established_at" TIMESTAMP(3),
ADD COLUMN     "feature_means" JSONB,
ADD COLUMN     "feature_ranges" JSONB,
ADD COLUMN     "feature_std" JSONB,
ADD COLUMN     "ml_model_id" TEXT,
ADD COLUMN     "ml_model_status" "MLModelStatus" NOT NULL DEFAULT 'NOT_TRAINED',
ADD COLUMN     "ml_model_trained_at" TIMESTAMP(3),
ADD COLUMN     "ml_training_error" TEXT,
ADD COLUMN     "packets_used" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "behavioural_data" DROP COLUMN "packet_type",
DROP COLUMN "payload",
DROP COLUMN "timestamp",
ADD COLUMN     "current_route" TEXT,
ADD COLUMN     "feature_summary" JSONB NOT NULL,
ADD COLUMN     "feature_vector" JSONB,
ADD COLUMN     "keystroke_metrics" JSONB NOT NULL,
ADD COLUMN     "mouse_metrics" JSONB NOT NULL,
ADD COLUMN     "navigation_metrics" JSONB NOT NULL,
ADD COLUMN     "packet_id" TEXT NOT NULL,
ADD COLUMN     "packet_sequence" INTEGER NOT NULL,
ADD COLUMN     "packet_window_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "packet_window_start" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "current_route" TEXT,
ADD COLUMN     "is_monitoring_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "last_combined_score" DOUBLE PRECISION,
ADD COLUMN     "last_drift_score" DOUBLE PRECISION,
ADD COLUMN     "last_isolation_score" DOUBLE PRECISION,
ADD COLUMN     "last_risk_evaluated_at" TIMESTAMP(3),
ADD COLUMN     "packet_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "step_up_required" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "isolation_score" DOUBLE PRECISION NOT NULL,
    "drift_score" DOUBLE PRECISION NOT NULL,
    "combined_score" DOUBLE PRECISION NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "action" "RiskAction" NOT NULL DEFAULT 'NONE',
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "explanations" JSONB,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "ground_truth" TEXT NOT NULL,
    "attack_injected" BOOLEAN NOT NULL DEFAULT false,
    "attack_injected_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "session_id" TEXT,
    "true_positive" BOOLEAN,
    "true_negative" BOOLEAN,
    "false_positive" BOOLEAN,
    "false_negative" BOOLEAN,
    "detection_accuracy" DOUBLE PRECISION,
    "false_positive_rate" DOUBLE PRECISION,
    "detection_latency_ms" INTEGER,
    "response_latency_ms" INTEGER,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_logs" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "packet_sequence" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anomaly_score" DOUBLE PRECISION NOT NULL,
    "drift_score" DOUBLE PRECISION NOT NULL,
    "combined_score" DOUBLE PRECISION NOT NULL,
    "predicted_label" TEXT NOT NULL,
    "ground_truth" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "explanations" JSONB,

    CONSTRAINT "experiment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "medium_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "high_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_assessments_session_id_idx" ON "risk_assessments"("session_id");

-- CreateIndex
CREATE INDEX "risk_assessments_evaluated_at_idx" ON "risk_assessments"("evaluated_at");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_models_session_id_key" ON "baseline_models"("session_id");

-- CreateIndex
CREATE INDEX "behavioural_data_received_at_idx" ON "behavioural_data"("received_at");

-- CreateIndex
CREATE INDEX "behavioural_data_packet_sequence_idx" ON "behavioural_data"("packet_sequence");

-- CreateIndex
CREATE INDEX "sessions_state_idx" ON "sessions"("state");

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_logs" ADD CONSTRAINT "experiment_logs_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
