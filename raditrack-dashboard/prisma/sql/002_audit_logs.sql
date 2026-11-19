-- RADiTrack upload log, examination audit log and app settings (UAT Phase 1).
-- Adds three tables and one nullable column; changes no existing data.
-- Apply with: npx prisma db execute --config prisma7.config.ts --file prisma/sql/002_audit_logs.sql
-- Safe to re-run: every statement checks whether it is already applied.

-- One row per upload attempt (successful or failed).
CREATE TABLE IF NOT EXISTS "import_batches" (
    "batch_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,                       -- append | test
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_by_username" TEXT NOT NULL,       -- copied so the log survives account changes
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rows_in_file" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "amended" INTEGER NOT NULL DEFAULT 0,
    "refused" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,                     -- SUCCESS | FAILED
    "message" TEXT,
    "test_mode" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("batch_id")
);
CREATE INDEX IF NOT EXISTS "import_batches_uploaded_at_idx" ON "import_batches"("uploaded_at");

-- One row per change to an examination. exam_id has no foreign key on purpose:
-- entries must survive deletes and the test-data switch.
CREATE TABLE IF NOT EXISTS "examination_audit_logs" (
    "audit_id" TEXT NOT NULL,
    "exam_id" TEXT,
    "accession" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,                     -- MANUAL | IMPORT | SIMULATOR | RIS_SYNC
    "changes" JSONB,                            -- { "field": [before, after] }
    "batch_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "actor_username" TEXT NOT NULL,
    "test_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examination_audit_logs_pkey" PRIMARY KEY ("audit_id")
);
CREATE INDEX IF NOT EXISTS "examination_audit_logs_accession_idx" ON "examination_audit_logs"("accession");
CREATE INDEX IF NOT EXISTS "examination_audit_logs_exam_id_idx" ON "examination_audit_logs"("exam_id");
CREATE INDEX IF NOT EXISTS "examination_audit_logs_batch_id_idx" ON "examination_audit_logs"("batch_id");
CREATE INDEX IF NOT EXISTS "examination_audit_logs_created_at_idx" ON "examination_audit_logs"("created_at");

DO $$ BEGIN
    ALTER TABLE "examination_audit_logs"
        ADD CONSTRAINT "examination_audit_logs_batch_id_fkey"
        FOREIGN KEY ("batch_id") REFERENCES "import_batches"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Small key/value settings edited by administrators (Phase 2: amendment window).
CREATE TABLE IF NOT EXISTS "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
INSERT INTO "app_settings" ("key", "value") VALUES ('amendment_window_days', '7')
ON CONFLICT ("key") DO NOTHING;

-- Phase 2: an amended sign-off time is kept apart from the first sign-off (TAT stays on the first).
ALTER TABLE "radiology_reports" ADD COLUMN IF NOT EXISTS "last_amended_at" TIMESTAMP(3);
