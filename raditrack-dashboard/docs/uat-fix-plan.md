# RADiTrack UAT fix plan (developer side)

Source: *RADiTrack Test Plan as of 17 Nov 2026* (Defect Log + Calculations + RIS Upload), compared with the developer pre-check of 15 Nov 2026.
Scope: the non-UI defects, plus two additions — **CAL-18 backlog age groups** and **no overwriting of signed-off exams, with audit logs created alongside import logs**.
UI-only defects are listed at the end for the front-end team.

---

## 1. Where each initially failed CAL / UPL test stands now

"Dev result" is the 15 Nov pre-check. "Now" is the Status column in the 17 Nov plan.

### Calculations

| Test | Dev result | Now | Business reply | Developer action |
|---|---|---|---|---|
| CAL-06 week to date | Failed | **Pass** | For Doc Ernie to decide | None unless asked |
| CAL-09 month to date | Failed | **Fail – Def-CAL-01** | Add "as-of date"; default to running 12 months | Phase 4 (data) + UI team (label) |
| CAL-12 percentile | Partly | **Pass** | Not in proposal | None |
| CAL-13 time zone | Failed | **Fail – Def-CAL-02** | Follow Manila time on every device | **Phase 4** |
| CAL-14 amended / excluded | Partly | **Pass** | Doc Ernie to decide on amendments | Covered by Phase 2 rule (signed-off = locked) |
| CAL-15 TAT 0 | Partly | **Pass** | Doc Ernie to decide | None unless asked |
| CAL-18 backlog ageing | Partly | **Pass** | Doc Ernie to decide | **Phase 4 – added by request** |

### RIS Upload

| Test | Dev result | Now | Business reply | Developer action |
|---|---|---|---|---|
| UPL-01 file name / time / user | Partly | **Fail – Def-UPL-01** | For audit trail | **Phase 1** |
| UPL-03 field check | Partly | **Fail – Def-UPL-02** | Add radiologist | **Phase 3** |
| UPL-11 overlapping file | Failed | **Fail – Def-UPL-03** | Accept new + updated unsigned | **Phase 2** |
| UPL-12 pending now signed | Failed | **Fail – Def-UPL-04** | Accept | **Phase 2** |
| UPL-23 "abc" in numbers | Failed | **Fail – Def-UPL-05** | Reject text in date/number columns | **Phase 3** |
| UPL-27 two uploads at once | Partly | **Fail – Def-UPL-06** | Retest with two datasets | **Phase 2** |
| UPL-30 upload screen | Partly | **Fail – Def-UPL-07** | Drag-and-drop, progress bar | UI team |
| UPL-31 messages | Partly | **Fail – Def-UPL-08** | Rejected-rows download; dynamic test-set count | Phase 3 (data) + UI team |
| UPL-32 role check on preview | Partly | **Fail – Def-UPL-09 (High)** | For immediate address | **Phase 0** |
| UPL-41 title rows | Partly | **Fail – Def-UPL-10** | Indicator: row 1 = header | UI team |
| UPL-08, 33 upload history / audit | N/A | **Not run** | To enable and test | **Phase 1** |
| UPL-13 amended record | N/A | **Not run** | To enable and test | **Phase 2** |
| UPL-34 undo an upload | N/A | **Not run** | To enable and test | Phase 5 (after Phase 1) |
| UPL-20, 22, 24 messages | Partly | **Pass** | — | Phase 5 (optional) |
| UPL-25, 52 size limit | Failed | **Pass** | User Guide: file limit | **Phase 5 – recommended** |
| UPL-28 CSV formulas | Failed | **Pass** | User Guide | **Phase 5 – recommended** |
| UPL-40 sheet choice | Partly | **Pass** | User Guide | None |
| UPL-43 DD/MM dates | Failed | **Pass** | Current spec accepted | **Phase 5 – recommended** |
| UPL-44 separate date/time | Failed | **Pass** | User Guide | **Phase 5 – recommended** |
| UPL-47 #N/A cells | Failed | **Pass** | User Guide | Phase 3 (same fix as UPL-23) |

**Totals in the 17 Nov plan:** Calculations 17 Pass · 2 Fail · 1 N/A. RIS Upload 27 Pass · 10 Fail · 4 Not run · 1 N/A. Open defects 14 (1 High).

---

## 2. Phases

Each phase is one branch and one PR, in this order. Phases 0 and 4 do not depend on the others.

### Phase 0 — Lock the import preview to admins (Def-UPL-09, High)

- `app/actions/dataset.ts` `previewExamImportAction`: move `await requireAdmin()` to the first line; remove it from the `catch`.
- Audit every action in `app/actions/` so `requireAdmin()` / `requireUser()` is the first statement.
- `errorMessage()`: show only messages RADiTrack throws itself; database errors get the plain fallback (also stops raw Prisma text, Def-UPL-06).
- **Retest UPL-32:** replay the preview request (DevTools → Copy as fetch) signed in as a radiologist and signed out → refused; admin → preview works.

**Status: ✅ Done — released to production 19 Nov 2026 (merge `c6e44fd`, tag v0.1.3).**

Retest record (enter into the test plan):

| Sheet | ID | Status | Tester | Date | Remark |
|---|---|---|---|---|---|
| RIS Upload | UPL-32 | Pass | Developer retest | 2026-11-19 | Retested on production (v0.1.3): a signed-in radiologist calling the import preview directly is refused (500, no data returned). Before the fix the same call on production returned the full preview (200 with fileName, totalRows, records). Admin preview still works. |
| Defect Log | Def-UPL-09 | Fixed | — | 2026-11-19 | Admin check moved to the first line of `previewExamImportAction`; also removed a second unauthenticated endpoint (`calculatedMedian`) and hid raw database errors. |

Evidence: production before fix — 200 with `RETEST-001` preview; `main` preview after fix — 500 `digest 1876578928`; production after release — 500 `digest 3503007668`.
Still to check: signed-out direct call (expect redirect or refusal, no data).
Release notes: the first production build of `c6e44fd` failed on a stale Turbopack build cache (Google font resolution); redeploying with the build cache off fixed it. No code change was needed.

### Phase 1 — Upload log and examination audit log (Def-UPL-01, UPL-08, UPL-33, ADD-03)

**Status: ✅ Built on branch `feat/audit-logs` (19 Nov 2026), not yet merged.** `002_audit_logs.sql` is applied to Supabase.
Checked on a throwaway PGlite copy of the schema: 18/18 audit and upload-log checks pass, `test-data:verify` 1406/1406, upload history renders in the Import dialog.
Notes: test-data loads are logged as one batch (no per-exam entries, since test exams are discarded on restore); restoring real data is not itself logged.

New tables, applied with a new SQL file `prisma/sql/002_audit_logs.sql` (same style as `001_user_accounts.sql`, safe to re-run) plus matching Prisma models.

`import_batches` — one row per upload attempt

| Column | Notes |
|---|---|
| batch_id (PK) | UUID |
| file_name, mode (`append` / `test`) | |
| uploaded_by_user_id, uploaded_by_username | username copied so the log survives account changes |
| uploaded_at | |
| rows_in_file, inserted, updated, unchanged, refused, errors | counts shown on screen |
| status (`SUCCESS` / `FAILED`), message | failed attempts are logged too |

`examination_audit_logs` — one row per change to an exam

| Column | Notes |
|---|---|
| audit_id (PK) | UUID |
| exam_id, accession | **no foreign key**, so entries survive delete and test mode |
| action | `CREATE`, `UPDATE`, `SIGN_OFF`, `CANCEL`, `DELETE`, `IMPORT_INSERT`, `IMPORT_UPDATE`, `AMEND`, `AMEND_SKIPPED`, `REFUSED_SIGNED_OFF`, `RADIOLOGIST_ADDED` |
| changes (JSONB) | `{ field: [before, after] }` |
| source | `UI`, `IMPORT`, `SIMULATOR`, `RIS_SYNC` |
| batch_id | set for import rows → links each exam change to its upload |
| actor_user_id, actor_username, created_at | |

- One helper, `lib/audit.ts` `recordExamChange(tx, …)`, called **inside the same transaction** as the change, so a log can never exist without its change or vice versa.
- Wire it into: import commit, `createExaminationAction`, `signOffReportAction`, `updateExaminationAction`, `cancelExaminationAction`, `deleteExaminationAction`, both simulator actions.
- Commit result returns the batch (file name, time, user, counts) → the success message shows them (UPL-01).
- New admin action `listImportBatchesAction()` for the upload history (UPL-08). A plain table is enough; the UI team can style it.
- Test mode: test loads are logged with `mode = test`; restore leaves the logs alone.
- The same SQL file also adds what Phase 2 needs: `app_settings` (amendment window, default 7 days) and `radiology_reports.last_amended_at`.
- Applying the SQL to the shared Supabase database: **approved** (19 Nov).

### Phase 2 — Re-upload rules and the signed-off lock (Def-UPL-03, Def-UPL-04, Def-UPL-06, UPL-13, added case)

**Status: ✅ Built on branch `feat/reupload-rules` (on top of `feat/audit-logs`), 19 Nov 2026, not yet merged.** No database change (uses the Phase 1 tables).
Checked on a throwaway PGlite database: planner unit checks 15/15, end-to-end checks 23/23 (UPL-11, UPL-12, UPL-15, UPL-16, UPL-27, window setting, signed-off lock incl. two simultaneous sign-offs), `test-data:verify` 1406/1406.
Checked in Chrome on a local server with the throwaway database: first upload (4 new, success message with file / time / user), re-upload preview (1 new, 1 updated, 1 unchanged, 1 amendment, 1 refused), amendment tick box applied, upload history counts, and Configuration → Amendment window saved and kept after reload. No console errors.
Extra rule found while building: a cancelled exam is never changed by a file (listed as refused) unless the file matches it.

**Rule (business reply on UPL-11, decisions of 19 Nov):** unsigned exams can be updated freely; a signed-off exam can be **amended for 7 days after its first sign-off**, only when the admin confirms; after that it is final. TAT always uses the **first** sign-off.

| Row in file | Exam in database | Result |
|---|---|---|
| New accession | — | **Insert** |
| Existing accession | Not signed off; file changes any field (incl. adding a sign-off) | **Update**; TAT and SLA computed exactly like sign-off |
| Existing accession | Any; same values | **Unchanged** (skipped) |
| Existing accession | **Signed off ≤ 7 days ago**; different values | **Amendment**: listed in the preview as before → after; applied only if the admin ticks *Apply amendments*, otherwise skipped. Logged as `AMEND` or `AMEND_SKIPPED` |
| Existing accession | **Signed off > 7 days ago**; different values | **Refused**, listed in the preview, logged as `REFUSED_SIGNED_OFF` |

Amendment details:
- A new sign-off time does **not** change TAT: `report_signed_at` keeps the first sign-off; the new time goes to a new column `radiology_reports.last_amended_at` and to the audit log.
- If an amendment changes modality or category, the SLA target changes, so `is_sla_breached` is recomputed from the **first-sign-off TAT**.
- The window (default **7 days**, counted from the first sign-off to the time of import) is stored in a new `app_settings` table and editable in Configuration.

- `lib/import-plan.ts` (pure, no database): compares file records with existing exams and returns `{ insert, update, unchanged, amend, refused }`. Used by the preview (counts shown before saving) and again inside the commit transaction (the database may have changed since the preview).
- Row errors still block the whole file (all-or-nothing stays as designed). Existing accessions no longer block.
- `pg_advisory_xact_lock` at the start of every import transaction → two uploads run one after the other: no race, no database error (Def-UPL-06; needed anyway now that imports update rows).
- Duplicate-key errors (P2002) are translated to a plain message.

**Signed-off lock outside the import (the added test case).** Today a signed-off exam can still be overwritten:

| Path | Today | Change |
|---|---|---|
| `signOffReportAction` | Signing again **overwrites** sign-off time, TAT and SLA (upsert) | Refuse if already signed |
| `cancelExaminationAction` | Can cancel a signed-off exam | Refuse if signed |
| `deleteExaminationAction` | Can hard-delete a signed-off exam, no trace | Refuse if signed |
| `updateExaminationAction` | Already refuses | Keep; add audit entry |
| Import (append) | Refused whole file | Per row (table above): amend within 7 days with confirmation, otherwise refused |

New test cases for the plan:
- **UPL-15** *Re-upload a signed-off exam more than 7 days after sign-off with different values, or try to sign / cancel / delete it again* → **Refused with a message; data unchanged; refusal in the audit log.**
- **UPL-16** *Re-upload a signed-off exam within 7 days with a later sign-off time and a corrected category* → preview shows the amendment; skipped unless confirmed; when confirmed, category changes, **TAT stays at the first sign-off**, SLA re-checked, amendment in the audit log.

### Phase 3 — Import validation and radiologist (Def-UPL-05, Def-UPL-02, UPL-47, Def-UPL-08 data part)

**Status: ✅ Built on branch `feat/import-validation` (on top of `feat/reupload-rules`), 19 Nov 2026, not yet merged.** No database change.
Checked on a throwaway PGlite database: Phase 3 checks 17/17, Phase 2 regression 23/23, planner 15/15, `test-data:verify` 1406/1406; the client's UPL-23 and UPL-47 files are now flagged; the unknown-radiologist box and "Add as new radiologist" checked in Chrome.
Also done here: CSV export quotes every cell and neutralises formulas (most of UPL-28), and adds a Radiologist column.
Rule chosen: the radiologist is stored on signed reports only; a file without the column never erases it; changing it on a signed exam is an amendment like any other field.

**New bug found while testing (not fixed yet):** a sign-in cookie that is still valid but whose account was deleted, deactivated or had its password reset causes an endless redirect between `/` and `/login` ("too many redirects"), so that person cannot reach the sign-in page until the cookie expires. Fix: send such requests to a small route that clears the cookie, then to `/login`.

- `lib/exam-import.ts`: a cell that is **filled but not a valid number/date** is a row error (today `"abc"` in `TAT_Min` silently becomes "pending" and in `Completed_After_Min` becomes 0).
- `lib/spreadsheet-rows.ts`: Excel error cells (`#N/A`, `#REF!`, `#VALUE!`) become row errors, not blanks.
- Optional `Radiologist` column → matched to an active radiologist by name (case and spacing ignored) → stored on the report. Unknown name = row error; the preview lists each unknown name once (with its row count) and offers **Add as new radiologist**, which creates it (logged) and makes those rows valid. Added to the CSV export and the template.
- Preview returns rejected rows in a form the UI can offer as a CSV download (escaped, see Phase 5).
- Test-mode banner count: pass `activeCount` instead of the fixed "100-exam" text (one prop; UI team can do it if preferred).

### Phase 4 — Calculations (CAL-18, Def-CAL-02, Def-CAL-01 data part)

**CAL-18 backlog age groups.** Age = now − exam completed time (24-hour days, Manila clock). Only completed, unsigned, not-cancelled exams.

| Group | Rule |
|---|---|
| < 1 day | age < 24 h |
| 1 to < 3 days | 24 h ≤ age < 72 h |
| 3 to < 7 days | 72 h ≤ age < 168 h |
| 7 to < 15 days | 168 h ≤ age < 360 h |
| 15 to < 30 days | 360 h ≤ age < 720 h |
| 30 days and over | age ≥ 720 h |

- `lib/backlog-age.ts` (pure): one bucketing function used everywhere.
- Returned by the Examinations summary (`fetchFilteredExaminationsAction`) and the dashboard KPI action, following the modality / category filters.
- Reference calculator + `npm run test-data:verify` gain backlog-age checks; the test dataset gets pending exams in every group, including exact boundaries (24 h, 72 h, … 720 h).
- Display: a small grouped count next to the backlog figures (team can restyle).

**Def-CAL-02 Manila time on every device.** About 10 browser-side places use the viewer's clock (`DashboardShell.tsx` ×3, `DateRangeFilter.tsx` ×3, `ExaminationsHub.tsx`, `SevenDayTatTable.tsx`, `TwelveMonthTrendChart.tsx` ×2). Add `manilaNow()` / `manilaTodayIso()` to `lib/app-time-zone.ts` (via `Intl.DateTimeFormat` with `Asia/Manila`) and use it in all of them. **Retest CAL-13** with DevTools set to Kiritimati, London and New York: label, chart, trend and date pickers match the KPI cards.

**Def-CAL-01 data part.** KPI result gains `isPartialPeriod` and `asOfDate` for This Week / This Month / This Year, so the UI can show "Month to date, as of 19 Nov 2026". The **12-month trend chart defaults to the running 12 months** (the 12 months ending this month) instead of a calendar year; calendar years stay selectable.

### Phase 5 — Recommended although marked Pass

These were accepted with a User Guide note, but they either crash or **silently change data** — which the Defect Severity sheet itself rates *Critical* ("Wrong TAT/SLA figures").

| Test | Why fix | Change | Size |
|---|---|---|---|
| UPL-44 | A signed exam with separate date/time columns imports as **in progress** — wrong backlog and TAT, no warning | Combine `*_date` + `*_time` columns; list ignored columns in the preview | M |
| UPL-43 | `03/04/2026` silently becomes **4 March** — wrong month's TAT | Read `DD/MM/YYYY` explicitly; drop the guessing fallback | S |
| UPL-25 / 52 | Files over ~1 MB / ~3,800 rows give a **crash page** (contradicts TECH-06) | `bodySizeLimit: "4mb"`, 4 MB app limit, browser size check, catch errors | S |
| UPL-28 | CSV export carries `=formulas`; commas break columns | Escape every cell; reject accessions starting with `= + - @` | S |
| *(new)* export dates | CSV `Study_Date` uses UTC → exams before 08:00 show the **previous day** | Format export dates in Manila time | S |
| UPL-34 | Business asked to enable undo | Undo a batch using Phase 1 logs (only if none of its exams changed since) | M |
| UPL-20 / 22 / 24 | Technical messages; missing column not named | Friendly messages; name the missing column | S |

---

## 3. Decisions (all made 19 Nov 2026)

1. **Signed-off exam with different values in a re-upload:** amendment window of **7 days** after the first sign-off (editable in Configuration); the preview lists each amendment and the admin applies or skips; older ones are refused. All logged.
2. **New sign-off time in an amendment:** TAT keeps the **first** sign-off; the amended time is stored separately and logged.
3. **Unsigned exam in a re-upload:** the file may change all fields.
4. **Delete or cancel of a signed-off exam:** refused completely.
5. **Unknown radiologist name:** row error, with **Add as new radiologist** in the preview.
6. **Backlog groups:** only completed, unsigned exams, aged from completion; exactly 30 days counts as "30 days and over".
7. **Def-CAL-01 running 12 months:** applies to the **12-month trend chart**.
8. **Database:** approved — apply `002_audit_logs.sql` (adds `import_batches`, `examination_audit_logs`, `app_settings` and the column `radiology_reports.last_amended_at`) to the shared Supabase database when Phase 1 is ready.

## 4. Testing

- Pure functions (`import-plan`, `backlog-age`, date parsing, Manila date helpers, CSV escaping) get unit tests (add Vitest; no test runner exists today).
- `npm run test-data:verify` must stay 100% and gains the backlog-age checks (TECH-09 regression).
- Every retest runs on a **Vercel preview deployment**, then the defect is marked *Fixed* in the Defect Log with the date.

## 5. For the front-end team (not in this plan)

| Defect | Test | Work |
|---|---|---|
| Def-UI-01 | UI-04 | Modality names cut off in the distribution chart |
| Def-UI-02 | UI-33 | Patient TV: "CT-Scan" and "MRI" truncated |
| Def-UPL-07 | UPL-30 | Drag-and-drop and progress bar |
| Def-UPL-10 | UPL-41 | Note that row 1 must be the header row |
| Def-UPL-08 (UI part) | UPL-31 | "Download rejected rows" button (data from Phase 3) |
| Def-CAL-01 (UI part) | CAL-09 | "As of" / "to date" label (data from Phase 4) |
| New screens | — | Upload history (Phase 1), re-upload preview counts (Phase 2), backlog groups (Phase 4): developers ship plain versions; team restyles |
