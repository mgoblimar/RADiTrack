// RIS sync agent: copies exams from the hospital's read-only SQL Server view
// (see docs/ris-integration.md) into RADiTrack. Run it on a PC inside the
// hospital network that can reach both the RIS SQL Server and RADiTrack's DB.
//
//   npm run ris:sync -- --check                 test connection + view columns
//   npm run ris:sync -- --dry-run               show what would change, write nothing
//   npm run ris:sync                            sync once
//   npm run ris:sync -- --watch                 sync every RIS_SYNC_INTERVAL_MINUTES (default 5)
//   npm run ris:sync -- --from-csv export.csv   use a CSV export of the view instead of SQL Server
//   npm run ris:sync -- --full                  ignore the saved position and re-read the lookback window
//
// Settings (.env): RIS_SQL_SERVER, RIS_SQL_PORT, RIS_SQL_DATABASE, RIS_SQL_USER,
// RIS_SQL_PASSWORD, RIS_VIEW, RIS_SQL_ENCRYPT, RIS_SQL_TRUST_SERVER_CERT,
// RIS_SYNC_INTERVAL_MINUTES, RIS_SYNC_LOOKBACK_DAYS.

import "dotenv/config";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sql from "mssql";
import prisma from "@/lib/prisma";
import { parseCsv, parseExamRows, type RawRow } from "@/lib/exam-import";
import { DEFAULT_RIS_VIEW, RIS_COLUMNS, missingColumns, risRowToRawRow } from "@/lib/ris/contract";
import { applyPlan, buildPlan, isTestModeActive } from "@/lib/ris/apply";

const STATE_FILE = path.join(process.cwd(), ".ris-sync-state.json");
const BATCH_SIZE = 2000;
/** Re-read a little before the saved position to tolerate clock differences. */
const OVERLAP_MINUTES = 10;
const MAX_ROWS_PER_RUN = 200_000;

const args = new Set(process.argv.slice(2));
const argValue = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const log = (msg: string) => console.log(`[${new Date().toLocaleString("en-PH")}] ${msg}`);
const env = (name: string, fallback?: string) => process.env[name]?.trim() || fallback;

interface SyncState {
  lastUpdated: string | null;
  lastRunAt: string | null;
}

function readState(): SyncState {
  if (!existsSync(STATE_FILE)) return { lastUpdated: null, lastRunAt: null };
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as SyncState;
}

function saveState(state: SyncState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/** Only allow schema.view style names, then bracket-quote them (no SQL injection via env). */
function quotedViewName(): string {
  const view = env("RIS_VIEW", DEFAULT_RIS_VIEW)!;
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(view)) {
    throw new Error(`RIS_VIEW "${view}" is not a valid name (use schema.view, letters/digits/underscores).`);
  }
  return view.split(".").map((part) => `[${part}]`).join(".");
}

function sqlConfig(): sql.config {
  const missing = ["RIS_SQL_SERVER", "RIS_SQL_DATABASE", "RIS_SQL_USER", "RIS_SQL_PASSWORD"].filter((k) => !env(k));
  if (missing.length) throw new Error(`Missing settings in .env: ${missing.join(", ")}`);
  return {
    server: env("RIS_SQL_SERVER")!,
    port: Number(env("RIS_SQL_PORT", "1433")),
    database: env("RIS_SQL_DATABASE")!,
    user: env("RIS_SQL_USER")!,
    password: env("RIS_SQL_PASSWORD")!,
    connectionTimeout: 15_000,
    requestTimeout: 120_000,
    options: {
      encrypt: env("RIS_SQL_ENCRYPT", "true") === "true",
      trustServerCertificate: env("RIS_SQL_TRUST_SERVER_CERT", "false") === "true",
      readOnlyIntent: true,
      // Treat SQL datetime values as wall-clock times (they have no time zone).
      useUTC: true,
    },
  };
}

/** Start of the window to read: saved position minus overlap, or the lookback window. */
function sinceDate(state: SyncState): Date {
  if (state.lastUpdated && !args.has("--full")) {
    return new Date(new Date(state.lastUpdated).getTime() - OVERLAP_MINUTES * 60_000);
  }
  const days = Number(env("RIS_SYNC_LOOKBACK_DAYS", "430"));
  return new Date(Date.now() - days * 86_400_000);
}

async function readFromView(since: Date): Promise<Record<string, unknown>[]> {
  const pool = await new sql.ConnectionPool(sqlConfig()).connect();
  try {
    const columns = RIS_COLUMNS.map((c) => `[${c.name}]`).join(", ");
    const result = await pool
      .request()
      .input("since", sql.DateTime2, since)
      .query(`SELECT TOP (${MAX_ROWS_PER_RUN}) ${columns} FROM ${quotedViewName()} WHERE [last_updated] > @since ORDER BY [last_updated]`);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

function readFromCsv(file: string): Record<string, unknown>[] {
  return parseCsv(readFileSync(file, "utf8"));
}

async function check() {
  const config = sqlConfig(); // fails early with a clear message if settings are missing
  log(`Connecting to ${config.server}:${config.port} / ${config.database} as ${config.user} (read-only intent)…`);
  const pool = await new sql.ConnectionPool(config).connect();
  try {
    const view = quotedViewName();
    const sample = await pool.request().query(`SELECT TOP (5) * FROM ${view} ORDER BY [last_updated] DESC`);
    const count = await pool.request().query(`SELECT COUNT_BIG(*) AS n FROM ${view}`);
    log(`Connected. ${view} has ${count.recordset[0].n} rows.`);
    if (sample.recordset.length === 0) return log("The view is empty; cannot check its columns yet.");
    const missing = missingColumns(sample.recordset[0]);
    log(missing.length ? `MISSING required columns: ${missing.join(", ")}` : "All required columns are present.");
    const { records, errors } = parseExamRows(sample.recordset.map(risRowToRawRow));
    log(`Sample of ${sample.recordset.length}: ${records.length} valid, ${errors.length} with problems.`);
    for (const e of errors) log(`  row ${e.rowNumber - 1}: ${e.message}`);
  } finally {
    await pool.close();
  }
}

async function syncOnce(dryRun: boolean) {
  if (await isTestModeActive()) {
    log("Skipped: test data is loaded in RADiTrack. Restore real data first (RIS Simulator).");
    return;
  }

  const csv = argValue("--from-csv");
  const state = readState();
  const since = sinceDate(state);
  const rows = csv ? readFromCsv(csv) : await readFromView(since);
  log(`${csv ? `Read ${csv}` : `Fetched rows changed since ${since.toLocaleString("en-PH")}`}: ${rows.length} rows.`);
  if (rows.length === MAX_ROWS_PER_RUN) log(`Reached the ${MAX_ROWS_PER_RUN}-row limit; the next run continues from here.`);

  const totals = { valid: 0, skipped: 0, added: 0, updated: 0, unchanged: 0 };
  let newest = state.lastUpdated;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const raw: RawRow[] = batch.map(risRowToRawRow);
    const { records, errors } = parseExamRows(raw);
    totals.valid += records.length;
    totals.skipped += errors.length;
    for (const e of errors.slice(0, 10)) log(`  skipped row ${start + e.rowNumber - 1}: ${e.message}`);

    const plan = await buildPlan(records);
    totals.added += plan.creates.length;
    totals.updated += plan.updates.length;
    totals.unchanged += plan.unchanged;
    for (const u of plan.updates.slice(0, 5)) log(`  update ${u.record.examinationIdentifier}: ${u.changes.join(", ")}`);

    if (!dryRun) await applyPlan(plan);

    const lastInBatch = batch[batch.length - 1]?.last_updated;
    if (lastInBatch instanceof Date) newest = lastInBatch.toISOString();
  }

  log(`${dryRun ? "DRY RUN (nothing written): would add" : "Added"} ${totals.added}, ${dryRun ? "update" : "updated"} ${totals.updated}, unchanged ${totals.unchanged}, skipped ${totals.skipped} invalid row(s).`);
  if (!dryRun && !csv) saveState({ lastUpdated: newest, lastRunAt: new Date().toISOString() });
}

async function main() {
  if (args.has("--check")) return check();
  const dryRun = args.has("--dry-run");
  if (!args.has("--watch")) return syncOnce(dryRun);

  const minutes = Math.max(1, Number(env("RIS_SYNC_INTERVAL_MINUTES", "5")));
  log(`Watching: syncing every ${minutes} minute(s). Press Ctrl+C to stop.`);
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; log("Stopping after the current run…"); });
  while (!stopping) {
    try {
      await syncOnce(dryRun);
    } catch (error) {
      log(`Sync failed (will retry next round): ${error instanceof Error ? error.message : String(error)}`);
    }
    for (let waited = 0; waited < minutes * 60 && !stopping; waited++) await new Promise((r) => setTimeout(r, 1000));
  }
}

main()
  .catch((error) => {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
