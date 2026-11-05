# Connecting RADiTrack to the hospital RIS (Microsoft SQL Server)

This page is for the hospital's IT team and the RADiTrack developers. It explains what RADiTrack needs from the RIS database, why it is safe, and how the connection works.

## In one sentence

The hospital creates **one read-only view** in the RIS database and a **login that can only read that view**; a small **RADiTrack sync agent** on a hospital PC reads new and changed rows every 5 minutes and copies them into RADiTrack.

## What RADiTrack reads (and nothing else)

The view `raditrack.vw_exams` must have exactly these columns:

| Column | Type | Required | Meaning |
| --- | --- | --- | --- |
| `accession_number` | varchar(64) | yes | Unique exam identifier. **No patient name or patient ID.** |
| `modality_code` | varchar(16) | yes | `CR`/`DX`/`XR` (X-ray), `MG` (Mammography), `US`, `CT`, `MR` (MRI) |
| `patient_class` | varchar(16) | yes | `O`/`OPD` outpatient, `I`/`IN` inpatient, `E`/`ER` emergency |
| `study_datetime` | datetime2 | yes | When the study took place (local hospital time) |
| `exam_completed_datetime` | datetime2 | no | When imaging finished; NULL if not completed |
| `report_signed_datetime` | datetime2 | no | When the final report was signed; NULL if pending |
| `exam_status` | varchar(32) | no | Must read `CANCELLED` (or `CANCELED`/`CA`) for cancelled exams |
| `last_updated` | datetime2 | yes | When the row last changed (exam or its report) |

RADiTrack **never** reads patient names, birth dates, patient numbers, report text, images, or any other table.

## What IT needs to do

1. **Create the view and the read-only login.** Edit and run [`docs/ris/create-raditrack-view.sql`](ris/create-raditrack-view.sql): only the `FROM`/`JOIN` part needs your RIS table names. The login `raditrack_reader` is granted `SELECT` on the view and nothing else.
2. **Pick the PC that runs the sync agent.** Any always-on Windows PC or server inside the hospital network that can reach:
   - the RIS SQL Server (TCP 1433 by default), and
   - RADiTrack's database on the internet (outbound HTTPS/PostgreSQL, ports 5432/6543).
3. **Share the connection details** with the RADiTrack team privately (not by email in plain text): server name, port, database name, the `raditrack_reader` password, and whether the server uses a self-signed certificate.
4. (Recommended) **Index the "last modified" columns** behind `last_updated` so the 5-minute check stays fast.

## Security

- **Least privilege:** the login can only `SELECT` from one view. It cannot see the underlying tables or change anything.
- **Read-only connection:** the agent connects with `ApplicationIntent=ReadOnly`.
- **Encrypted:** the connection uses TLS (`RIS_SQL_ENCRYPT=true`).
- **De-identified data:** only accession numbers, modality, patient class, times and status leave the RIS.
- **Credentials** live in a `.env` file on the agent PC only; they are never committed to the code repository.

## How the sync works

1. Every 5 minutes the agent asks the view for rows whose `last_updated` is newer than the last run (minus a 10-minute overlap, so clock differences cannot cause gaps).
2. Each row is checked with the same rules as the Import exams screen (valid modality, category and times). Invalid rows are skipped and logged; the rest continue.
3. Rows are matched to RADiTrack exams by **accession number**:
   - new accession → the exam is **added**;
   - existing accession with any difference → the exam is **updated** to match the RIS (the RIS is the source of truth);
   - no difference → left alone.
4. When a report is signed, RADiTrack calculates **TAT** (signed − completed) and the **SLA breach** flag with the SLA targets in Configurations, exactly as when a report is signed inside RADiTrack. If the RIS removes a sign-off, RADiTrack removes its report too.
5. Each batch is written in **one database transaction**: either all its changes land or none do.
6. The agent **does nothing while test data is loaded** in RADiTrack (RIS Simulator → test data), so real RIS data is never mixed into test data.

The first run reads about 14 months back (`RIS_SYNC_LOOKBACK_DAYS=430`) so the 12-month trend is complete.

## Running the agent (RADiTrack team)

On the agent PC, with the RADiTrack code and `npm install` done, fill in the `RIS_…` settings in `.env` (see `.env.example`), then:

```bash
npm run ris:sync -- --check
```
Tests the connection, counts rows, checks the columns and validates a sample.

```bash
npm run ris:sync -- --dry-run
```
Shows what would be added or updated, writing nothing.

```bash
npm run ris:sync -- --watch
```
Syncs now and every 5 minutes. To keep it running after restarts, add this command to **Windows Task Scheduler** ("At startup", "Run whether user is logged on or not").

Other options: `--full` re-reads the whole lookback window, and `--from-csv export.csv` loads a CSV export of the view instead of connecting. That second option is useful if IT can only provide periodic exports.

The agent remembers its position in `.ris-sync-state.json` next to the code. Delete that file (or use `--full`) to start over.

## Questions to confirm with hospital IT

- [ ] Which SQL Server version, and is the RIS database on the hospital network only?
- [ ] Which tables/columns hold accession, modality, patient class, study time, exam end time, final sign-off time, status and last-modified time?
- [ ] Which codes does the RIS use for modality, patient class and cancelled status?
- [ ] Are times stored in Philippine local time? (RADiTrack assumes local time.)
- [ ] Which PC can run the agent, and is outbound internet allowed from it?
- [ ] Self-signed certificate on the SQL Server? (decides `RIS_SQL_TRUST_SERVER_CERT`)
- [ ] If a direct connection is not allowed: can they provide a scheduled CSV export with the same columns instead?
