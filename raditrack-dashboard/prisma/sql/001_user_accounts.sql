-- RADiTrack staff sign-in accounts (adds one table; changes nothing else).
-- Apply with: npx prisma db execute --config prisma7.config.ts --file prisma/sql/001_user_accounts.sql
-- Safe to re-run: every statement checks whether it is already applied.

CREATE TABLE IF NOT EXISTS "user_accounts" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'RADIOLOGIST',
    "password_hash" TEXT NOT NULL,
    "assigned_modalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_username_key" ON "user_accounts"("username");
