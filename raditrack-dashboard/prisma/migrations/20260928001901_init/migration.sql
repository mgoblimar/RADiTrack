-- CreateTable
CREATE TABLE "modalities" (
    "modality_code" TEXT NOT NULL PRIMARY KEY,
    "modality_name" TEXT NOT NULL,
    "department_room" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "examination_statuses" (
    "status_code" TEXT NOT NULL PRIMARY KEY,
    "status_name" TEXT NOT NULL,
    "stage_category" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "radiologists" (
    "radiologist_id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "subspecialty" TEXT,
    "license_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sla_configurations" (
    "sla_id" TEXT NOT NULL PRIMARY KEY,
    "modality_code" TEXT NOT NULL,
    "triage_level" TEXT NOT NULL DEFAULT 'OPD',
    "urgency_level" TEXT NOT NULL DEFAULT 'ROUTINE',
    "target_tat_minutes" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sla_configurations_modality_code_fkey" FOREIGN KEY ("modality_code") REFERENCES "modalities" ("modality_code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "examinations" (
    "exam_id" TEXT NOT NULL PRIMARY KEY,
    "examination_identifier" TEXT NOT NULL,
    "modality_code" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "triage_level" TEXT NOT NULL DEFAULT 'OPD',
    "urgency_level" TEXT NOT NULL DEFAULT 'ROUTINE',
    "study_date" DATETIME NOT NULL,
    "exam_completed_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "examinations_modality_code_fkey" FOREIGN KEY ("modality_code") REFERENCES "modalities" ("modality_code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "examinations_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "examination_statuses" ("status_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "radiology_reports" (
    "report_id" TEXT NOT NULL PRIMARY KEY,
    "exam_id" TEXT NOT NULL,
    "radiologist_id" TEXT,
    "report_started_at" DATETIME,
    "report_signed_at" DATETIME,
    "report_status" TEXT NOT NULL DEFAULT 'FINALIZED',
    "tat_exam_to_sign_minutes" REAL,
    "is_sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "radiology_reports_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "examinations" ("exam_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "radiology_reports_radiologist_id_fkey" FOREIGN KEY ("radiologist_id") REFERENCES "radiologists" ("radiologist_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "radiologists_license_number_key" ON "radiologists"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "sla_configurations_modality_code_triage_level_urgency_level_key" ON "sla_configurations"("modality_code", "triage_level", "urgency_level");

-- CreateIndex
CREATE UNIQUE INDEX "examinations_examination_identifier_key" ON "examinations"("examination_identifier");

-- CreateIndex
CREATE INDEX "examinations_examination_identifier_idx" ON "examinations"("examination_identifier");

-- CreateIndex
CREATE INDEX "examinations_study_date_idx" ON "examinations"("study_date");

-- CreateIndex
CREATE INDEX "examinations_modality_code_triage_level_urgency_level_idx" ON "examinations"("modality_code", "triage_level", "urgency_level");

-- CreateIndex
CREATE INDEX "examinations_status_code_idx" ON "examinations"("status_code");

-- CreateIndex
CREATE INDEX "examinations_exam_completed_at_idx" ON "examinations"("exam_completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_reports_exam_id_key" ON "radiology_reports"("exam_id");

-- CreateIndex
CREATE INDEX "radiology_reports_report_signed_at_idx" ON "radiology_reports"("report_signed_at");

-- CreateIndex
CREATE INDEX "radiology_reports_tat_exam_to_sign_minutes_is_sla_breached_idx" ON "radiology_reports"("tat_exam_to_sign_minutes", "is_sla_breached");
