# 🚀 RADiTrack — Supabase (PostgreSQL) Migration Guide

This step-by-step guide walks you through migrating the RADiTrack dashboard from the local SQLite database (`radiology.db`) to a production-ready **Supabase PostgreSQL** database.

> **Current Branch:** `supabase-migration`  
> **Application Path:** `RADiTrack/RADiTrack/raditrack-dashboard`  
> **Current Stack:** Next.js 16 (App Router), React 19, Prisma 7, TypeScript  

---

## 📋 Table of Contents
1. [Overview & Prerequisites](#1-overview--prerequisites)
2. [Step 1: Set Up Supabase Project](#step-1-set-up-supabase-project)
3. [Step 2: Install PostgreSQL Dependencies](#step-2-install-postgresql-dependencies)
4. [Step 3: Configure Environment Variables (`.env`)](#step-3-configure-environment-variables-env)
5. [Step 4: Update Prisma Schema & Prisma 7 Config](#step-4-update-prisma-schema--prisma-7-config)
6. [Step 5: Update the Prisma Client Initializer (`lib/prisma.ts`)](#step-5-update-the-prisma-client-initializer-libprismats)
7. [Step 6: Handle Migrations (Resetting SQLite Lock)](#step-6-handle-migrations-resetting-sqlite-lock)
8. [Step 7: Migrate Existing SQLite Data to Supabase (Optional)](#step-7-migrate-existing-sqlite-data-to-supabase-optional)
9. [Step 8: Run Baseline Seed](#step-8-run-baseline-seed)
10. [Step 9: Supabase Realtime Setup (Optional)](#step-9-supabase-realtime-setup-optional)
11. [Step 10: Verification & Testing](#step-10-verification--testing)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## 1. Overview & Prerequisites

### Why are we changing?
- **SQLite** stores data locally in a single file (`radiology.db`), which does not support multi-user concurrent writes, multi-container deployments, or cloud hosting (e.g., Vercel).
- **Supabase (PostgreSQL)** offers hosted relational storage, connection pooling (via Supavisor), instant API access, role-based security, automated backups, and real-time WebSocket subscriptions.

### Prerequisites
- A [Supabase Account](https://supabase.com).
- Node.js (v20+ or v22+).
- Git branch `supabase-migration` active.

---

## Step 1: Set Up Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. Click **New Project**:
   - **Name:** `raditrack` (or your preferred name)
   - **Database Password:** Enter a strong password and **save it safely**.
   - **Region:** Choose the region closest to your users (e.g., `Southeast Asia (Singapore)`).
3. Once the database is provisioned (takes ~1-2 minutes), navigate to:
   👉 **Project Settings** (gear icon) → **Database** → **Connection parameters** / **Connection Pooling**.
4. Note down two connection strings:
   - **Connection Pooling (`DATABASE_URL`)**:
     - Mode: **Transaction** (Port `6543`).
     - Example format:
       ```
       postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
       ```
   - **Direct Connection (`DIRECT_URL`)**:
     - Mode: **Session** or Direct (Port `5432`).
     - Example format:
       ```
       postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
       ```

> [!IMPORTANT]
> - Always use the **Transaction Pooler (Port 6543)** for `DATABASE_URL` in Next.js Server Components and Server Actions to prevent connection exhaustion.
> - Always use the **Direct Connection (Port 5432)** for `DIRECT_URL` during Prisma schema migrations (`prisma migrate dev` or `prisma db push`).

---

## Step 2: Install PostgreSQL Dependencies

Navigate to the Next.js app directory:

```bash
cd RADiTrack/RADiTrack/raditrack-dashboard
```

Install `@prisma/adapter-pg` and the `pg` driver:

```bash
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg
```

*(You can later remove `@prisma/adapter-better-sqlite3` and `better-sqlite3` once the migration is complete).*

---

## Step 3: Configure Environment Variables (`.env`)

Open or create `raditrack-dashboard/.env`:

```env
# ==============================================================================
# RADiTrack Environment Variables (Supabase PostgreSQL)
# ==============================================================================

# Supabase Transaction Pooler (Port 6543) - used by Next.js app at runtime
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432) - used for Prisma migrations & schema push
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Optional: Supabase Client Credentials (if using Supabase Realtime / Auth)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

> [!WARNING]
> If your database password contains special characters (like `@`, `#`, `:`, `%`, `/`), make sure to **URL-encode** them in the connection strings (e.g., `#` becomes `%23`).

Also update `.env.example` so teammates have the template ready.

---

## Step 4: Update Prisma Schema & Prisma 7 Config

### 1. Edit `prisma/schema.prisma`
Change the datasource block from `sqlite` to `postgresql`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Keep all your models unchanged:
// Modality, ExaminationStatus, Radiologist, SlaConfiguration, Examination, RadiologyReport
```

### 2. Check `prisma7.config.ts`
Ensure the config uses `DIRECT_URL` (preferred for migrations):

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
```

---

## Step 5: Update the Prisma Client Initializer (`lib/prisma.ts`)

Update `raditrack-dashboard/lib/prisma.ts` to use PostgreSQL:

```typescript
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// Configure connection pool for PostgreSQL
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

---

## Step 6: Handle Migrations (Resetting SQLite Lock)

Because the project previously migrated using SQLite (`provider = "sqlite"` in `prisma/migrations/migration_lock.toml`), Prisma cannot apply SQLite migrations to PostgreSQL.

### Option A: Clean Slate (Recommended)
1. Delete or rename the old SQLite migration folder:
   ```bash
   # Windows PowerShell:
   Rename-Item -Path "prisma/migrations" -NewName "prisma/migrations_sqlite_backup"
   ```
2. Generate the new PostgreSQL migration and push to Supabase:
   ```bash
   npx prisma migrate dev --name init_postgresql
   ```
3. Re-generate Prisma Client:
   ```bash
   npx prisma generate
   ```

### Option B: Quick Prototyping (`db push`)
If you want to sync the schema immediately without migration history:
```bash
npx prisma db push
npx prisma generate
```

---

## Step 7: Migrate Existing SQLite Data to Supabase (Optional)

If you already have examination records in `radiology.db` (e.g. 300+ sample examinations) and want to transfer them into Supabase:

1. Create a transfer script `prisma/migrate-sqlite-to-supabase.ts`:
   ```typescript
   import Database from "better-sqlite3";
   import { PrismaClient } from "../generated/prisma/client";
   import { Pool } from "pg";
   import { PrismaPg } from "@prisma/adapter-pg";
   import "dotenv/config";

   const sqlite = new Database("./radiology.db");
   const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
   const adapter = new PrismaPg(pool);
   const prisma = new PrismaClient({ adapter });

   async function transfer() {
     console.log("🚀 Starting data transfer from SQLite to Supabase...");

     // 1. Modalities
     const modalities = sqlite.prepare("SELECT * FROM modalities").all() as any[];
     for (const m of modalities) {
       await prisma.modality.upsert({
         where: { modalityCode: m.modality_code },
         update: {},
         create: {
           modalityCode: m.modality_code,
           modalityName: m.modality_name,
           departmentRoom: m.department_room,
           isActive: Boolean(m.is_active),
         },
       });
     }
     console.log(`✅ Transferred ${modalities.length} modalities.`);

     // 2. Statuses
     const statuses = sqlite.prepare("SELECT * FROM examination_statuses").all() as any[];
     for (const s of statuses) {
       await prisma.examinationStatus.upsert({
         where: { statusCode: s.status_code },
         update: {},
         create: {
           statusCode: s.status_code,
           statusName: s.status_name,
           stageCategory: s.stage_category,
           sequenceOrder: s.sequence_order,
         },
       });
     }
     console.log(`✅ Transferred ${statuses.length} statuses.`);

     // 3. Radiologists
     const radiologists = sqlite.prepare("SELECT * FROM radiologists").all() as any[];
     for (const r of radiologists) {
       await prisma.radiologist.upsert({
         where: { radiologistId: r.radiologist_id },
         update: {},
         create: {
           radiologistId: r.radiologist_id,
           fullName: r.full_name,
           subspecialty: r.subspecialty,
           licenseNumber: r.license_number,
           isActive: Boolean(r.is_active),
           createdAt: new Date(r.created_at),
         },
       });
     }
     console.log(`✅ Transferred ${radiologists.length} radiologists.`);

     // 4. SLA Configurations
     const slas = sqlite.prepare("SELECT * FROM sla_configurations").all() as any[];
     for (const sla of slas) {
       await prisma.slaConfiguration.upsert({
         where: {
           modalityCode_triageLevel_urgencyLevel: {
             modalityCode: sla.modality_code,
             triageLevel: sla.triage_level,
             urgencyLevel: sla.urgency_level,
           },
         },
         update: {},
         create: {
           slaId: sla.sla_id,
           modalityCode: sla.modality_code,
           triageLevel: sla.triage_level,
           urgencyLevel: sla.urgency_level,
           targetTatMinutes: sla.target_tat_minutes,
           createdAt: new Date(sla.created_at),
         },
       });
     }
     console.log(`✅ Transferred ${slas.length} SLA configurations.`);

     // 5. Examinations
     const exams = sqlite.prepare("SELECT * FROM examinations").all() as any[];
     for (const e of exams) {
       await prisma.examination.upsert({
         where: { examinationIdentifier: e.examination_identifier },
         update: {},
         create: {
           examId: e.exam_id,
           examinationIdentifier: e.examination_identifier,
           modalityCode: e.modality_code,
           statusCode: e.status_code,
           triageLevel: e.triage_level,
           urgencyLevel: e.urgency_level,
           studyDate: new Date(e.study_date),
           examCompletedAt: e.exam_completed_at ? new Date(e.exam_completed_at) : null,
           notes: e.notes,
           createdAt: new Date(e.created_at),
           updatedAt: new Date(e.updated_at),
         },
       });
     }
     console.log(`✅ Transferred ${exams.length} examinations.`);

     // 6. Reports
     const reports = sqlite.prepare("SELECT * FROM radiology_reports").all() as any[];
     for (const rep of reports) {
       await prisma.radiologyReport.upsert({
         where: { examId: rep.exam_id },
         update: {},
         create: {
           reportId: rep.report_id,
           examId: rep.exam_id,
           radiologistId: rep.radiologist_id,
           reportStartedAt: rep.report_started_at ? new Date(rep.report_started_at) : null,
           reportSignedAt: rep.report_signed_at ? new Date(rep.report_signed_at) : null,
           reportStatus: rep.report_status,
           tatExamToSignMinutes: rep.tat_exam_to_sign_minutes,
           isSlaBreached: Boolean(rep.is_sla_breached),
           createdAt: new Date(rep.created_at),
           updatedAt: new Date(rep.updated_at),
         },
       });
     }
     console.log(`✅ Transferred ${reports.length} reports.`);

     console.log("🎉 Data transfer completed successfully!");
     await pool.end();
   }

   transfer().catch((err) => {
     console.error("Transfer error:", err);
     process.exit(1);
   });
   ```

2. Run the transfer:
   ```bash
   npx tsx prisma/migrate-sqlite-to-supabase.ts
   ```

---

## Step 8: Run Baseline Seed

If you prefer starting with clean realistic seed data instead of copying SQLite:

Update `prisma/seed.ts` to import `prisma` directly from `../lib/prisma` (instead of using `PrismaBetterSqlite3`):

```typescript
// Replace lines 1-15 in prisma/seed.ts with:
import prisma from "../lib/prisma";
import "dotenv/config";
import {
  ModalityCode,
  ExaminationStatusCode,
  StageCategory,
  TriageLevel,
  UrgencyLevel,
  ReportStatusCode,
} from "../lib/enums";
```

Then run:
```bash
npx prisma db seed
```

---

## Step 9: Supabase Realtime Setup (Optional)

With Supabase, you can listen to database inserts/updates in real-time across multiple client devices without relying only on browser-local `BroadcastChannel`.

1. In Supabase Dashboard:
   - Go to **Database** → **Replication**.
   - Enable replication for `examinations` and `radiology_reports`.
2. Install `@supabase/supabase-js`:
   ```bash
   npm install @supabase/supabase-js
   ```
3. Create `lib/supabaseClient.ts`:
   ```typescript
   import { createClient } from "@supabase/supabase-js";

   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```
4. Subscribe in your real-time viewer components (e.g. `AutoRefresh.tsx` or a custom hook) to refresh on changes:
   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel("realtime-examinations")
       .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "examinations" },
         () => {
           router.refresh();
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [router]);
   ```

---

## Step 10: Verification & Testing

Verify that everything works cleanly before committing:

1. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Production Build**:
   ```bash
   npm run build
   ```
3. **Local Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`:
   - Check the Staff Analytics & Backlog counters.
   - Click **Add Exam** / Log examination and verify it appears.
   - Click **Sign Off** on an in-progress scan and check TAT calculation.
   - Open Supabase Dashboard → **Table Editor** to verify rows are saved directly in Postgres.

4. **Commit & Push Branch**:
   ```bash
   git add .
   git commit -m "feat(database): migrate database from sqlite to supabase postgresql"
   git push -u origin supabase-migration
   ```

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `P1001: Can't reach database server` | Incorrect host or port, or network firewall. | Check `DATABASE_URL` format. Ensure port is `6543` for pooler or `5432` for direct. |
| `SSL connection error` | Missing `sslmode=require`. | Append `?sslmode=require` or `?sslmode=prefer` to connection string. |
| `The provider 'postgresql' does not match 'sqlite'` | Stale `migration_lock.toml`. | Move old SQLite migrations out of `prisma/migrations` or use `prisma db push`. |
| `Connection pool exhausted` | Next.js creating too many direct connections. | Ensure `DATABASE_URL` uses Supavisor transaction pooler (`port 6543` and `?pgbouncer=true`). |
| Password authentication failed | Special characters in password. | URL-encode password (e.g. `P@ss` $\rightarrow$ `P%40ss`). |
