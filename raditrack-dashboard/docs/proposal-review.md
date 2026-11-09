# RADiTrack: Proposal vs. Current System

This document compares the client's project proposal ("QCGH – RADiTrack") with `main` at commit `1a42da5` (PR #21). It has three parts:

1. Whether each specification in the proposal is followed.
2. Features we built that the proposal does not mention.
3. The parts of the proposal that are marked in red and need our input, with draft text.

---

## 1. Are the proposal's specifications followed?

✅ = done  ·  🟡 = partly done or done differently  ·  ❌ = not done yet

### Objectives (Section V) and core features (Section XVII)

| # | Proposal item | Status | Where / notes |
| --- | --- | --- | --- |
| V.1 | Web-based dashboard for exam activity | ✅ | Staff dashboard (`/`) |
| V.2, XVII.1 | Integrate with the RIS or an approved RIS data source | 🟡 | The RIS sync agent (read-only SQL Server view, every 5 min) is on branch `ris-sync-agent`, **not merged to main**. On main, exams come from the RIS Simulator or a spreadsheet import. |
| V.3 | Automatically retrieve exam and reporting data | 🟡 | Same as above: automatic once the sync agent is merged and connected. |
| V.4, XVII.3 | Total exams performed today | ✅ | Patient TV display; dashboard with the "Today" window |
| V.5, XVII.4 | Modality breakdown of daily activity | ✅ | Patient TV display, KPI cards, TAT by modality |
| V.6, XVII.6 | Automatically calculate TAT | ✅ | TAT = signed − completed, saved when the report is signed |
| V.7 | Analyze the previous 7 days | ✅ | 7-day table (rolling 7 days or Mon–Sun week) |
| V.8, XVII.10 | Monitor exams waiting for finalization | ✅ | Reading backlog KPI; Examinations → Backlog tab with "past SLA" flags |
| V.9 | Trends in volume and TAT | ✅ | 12-month trend, previous 7 days comparison, change vs. previous period on the KPI cards |
| V.10 | Reduce manual preparation of statistics | ✅ | Automatic figures plus the PDF report |
| V.11 | Information for workload and resource planning | ✅ | Dashboard and PDF report |
| V.12, V.13 | Simple, non-identifiable public view | ✅ | Patient TV display shows only counts; no names, IDs or individual exams |
| XVII.2 | Automatic exam counting | ✅ | |
| XVII.5 | Seven-day exam volume | ✅ | |
| XVII.7 | Average TAT | ✅ | |
| XVII.8 | Median TAT | 🟡 | Shown on the Average TAT KPI card and in the PDF. **Not shown per modality** (the proposal's Section XI table uses median per modality; we show the average). |
| XVII.9 | TAT by modality | ✅ | Bar chart with SLA targets |
| XVII.11 | Seven-day TAT trend | ✅ | |
| XVII.12 | Automatic / near-real-time updating | ✅ | Screens refresh every few seconds; the RIS sync runs every 5 min (on its branch) |
| XVII.13 | Historical data storage | ✅ | All exams are kept; 12-month trend and "All time" window |
| XVII.14 | Role-based dashboard views | 🟡 | There are separate public and staff views, but **no login**, so staff and management see the same dashboard. |
| XVII.15 | Privacy and security controls | 🟡 | The public view is aggregate-only and the RIS connection is read-only. **Staff screens have no access control yet** (Section XXI says they "will use appropriate access controls"). |

### Definition of TAT (Sections VII and VIII)

| Proposal rule | Status |
| --- | --- |
| TAT = report finalization − exam completion | ✅ |
| TAT only for exams that reached finalization | ✅ |
| Pending exams are "pending workload" and are excluded from average TAT | ✅ (also excluded from the median) |
| Timestamps may be adjusted to the RIS's actual fields | ✅ The RIS sync agent maps the RIS's completed and signed times; the mapping can be changed in its view. |

### Public display (Section IX)

| Proposal | Status | Notes |
| --- | --- | --- |
| Title, current date and "As of [time]" | ✅ | Date plus "Live · [time]" |
| Per modality: Today and Yesterday | ✅ | |
| OPD / IN / ER split under each modality | ✅ | Shown as columns (OPD, IN, ER for today and yesterday) instead of sub-rows |
| Total | ✅ | "Total Examinations" at the top, plus a "Compared with Yesterday" difference |
| Updated automatically (24-hour coverage) | ✅ | Auto-refresh every 10 s; "today" runs from midnight to midnight |
| Does not show names, hospital numbers, diagnoses, individual exams, individual TAT, pending patient names, clinical info or images | ✅ | |

### Seven-day TAT dashboard (Section X)

| Proposal | Status | Notes |
| --- | --- | --- |
| One table per modality (X-ray, Ultrasound, CT, MRI, Mammography) | ✅ | Chosen with the modality filter, plus an "All" view |
| Columns: date, examinations, finalized, pending, average TAT | ✅ | "Finalized" is labelled **Signed** |
| OPD / IN / ER sub-rows for each day | 🟡 | We split the **exam count** by OPD / IN / ER. The proposal's sub-rows also have finalized, pending and average TAT per category; we don't show those per category in the table (the patient-category filter gives them one category at a time). |
| "Total average of the week" | ✅ | Totals row with the weighted average TAT |
| Note: "longer / shorter (_%) TAT than the previous week (average _ hours)" | 🟡 | The **Compare previous 7 days** switch shows last week's table side by side, and the KPI card shows the % change. The table has no one-line note with the % change. |
| Graphs to show trends | ✅ | TAT by modality chart and 12-month trend |

### TAT by modality (Section XI)

| Proposal | Status | Notes |
| --- | --- | --- |
| Per modality: number of examinations | 🟡 | Counts are on the "Scans and pending by modality" KPI card, not in the TAT chart. |
| Per modality: **median** TAT | ❌ | The chart shows **average** TAT. |
| OPD / IN / ER per modality | 🟡 | Available through the patient-category filter (which also shows the SLA target), but not as a breakdown table. |

### Daily volume, users, ethics (Sections XII, XIII, XVI)

| Proposal | Status | Notes |
| --- | --- | --- |
| Keep at least 7 days of volume and compare workload and TAT | ✅ | All history is kept |
| Public view: today's total, modality breakdown, general activity | ✅ | |
| Staff view: workload, pending, 7-day TAT, modality TAT, volume | ✅ | |
| Management view: trends, backlog, modality workload, **% meeting TAT targets** | ✅ | SLA compliance KPI and SLA compliance by modality in the PDF |
| Not used to rank individual radiologists | ✅ | No per-radiologist statistics anywhere |

### Testing items (Section XXII, Phase 5)

| Proposal test | How we can show it |
| --- | --- |
| Exam count accuracy | 100-exam test dataset + Excel workbook with expected values + `npm run test-data:verify` (PASS/FAIL report) |
| TAT calculation | Same test dataset; [computations.md](computations.md) |
| Pending exam identification | Test dataset includes pending exams and exams past their SLA |
| Modality classification | Import validation; RIS code mapping (DX/CR → X-ray, MG → Mammogram, etc.) |
| Automatic updating | Auto-refresh; RIS sync `--watch` |
| Duplicate prevention | Accession numbers are unique in the database; import rejects existing accessions; the RIS sync updates exams instead of adding them again |
| Dashboard usability | Phone, tablet and desktop layouts; still needs a user test (see Part 3) |
| Security and privacy | Public view checked for PII; staff login still missing |

### Summary of gaps against the proposal

1. **RIS integration is not on main yet.** Merge `ris-sync-agent` after testing.
2. ~~No login or access control for staff screens (Sections XIII, XVII.14–15, XXI).~~ **Built on branch `login-accounts`:** per-doctor accounts (Radiologist, Resident, Administrator), each starting on their assigned modalities; server-side role checks on every action; the Patient TV stays public.
3. ~~TAT by modality uses average, not median, and does not show the exam count (Section XI).~~ **Fixed on branch `proposal-gaps`:** a table under the chart lists exams, signed, pending, average and median TAT per modality (the tooltip shows them too).
4. ~~7-day table: no per-category finalized, pending and TAT sub-rows, and no "% longer/shorter than last week" note (Section X).~~ **Fixed on branch `proposal-gaps`:** a **Show OPD / IN / ER rows** switch adds "a. OPD / b. IN / c. ER" sub-rows under each day, and a note under the table gives the % longer or shorter than the previous 7 days.

---

## 2. Features we built that the proposal does not mention

Suggested text for a new section such as "**Additional Features**":

**Monitoring and analytics**
- **SLA (Service Level Agreement) targets and compliance:** configurable TAT targets per modality and patient category (default 48 h for ER and Inpatient, 72 h for Outpatient), a compliance % KPI, and a "breached" flag on every late report.
- **Exams past their SLA:** unsigned exams that have already waited longer than their target are marked in red in the backlog so radiologists can read them first.
- **One filter bar:** time window (Today, Rolling 7 days, This/Last week, This/Last month, This year, All time, Custom range), modality and patient category, applied to the whole dashboard.
- **Comparison with the previous period:** each KPI card shows the change from the previous period of the same length.
- **12-month TAT trend:** monthly average TAT, overall or per modality, with the previous month and the same month last year in the tooltip, and an optional comparison with the prior 12 months.
- **Previous 7 days comparison:** last week's table beside this week's.

**Reports and records**
- **PDF report generator:** choose the period, filters and sections; prints an A4 report with KPIs, TAT and SLA compliance by modality, daily breakdown and 12-month trend.
- **Examinations module:** Backlog, Finalized and All tabs with search, filters, sign-off, edit and delete.
- **Import from Excel or CSV:** validates every row before saving and lists problems by row number.
- **CSV export:** de-identified list of all exams.

**Configuration**
- **SLA Benchmarks:** edit or reset the targets.
- **Modality rooms:** room names and maintenance status.
- **In-app RADiTrack Guide:** explains the terms, how each number is calculated and the daily routine.

**Testing and accuracy**
- **Validation dataset:** a 100-exam test dataset that temporarily replaces the real data (the real data is backed up and restored), with a "TEST DATA ACTIVE" banner.
- **Expected-values workbook and automatic check:** an Excel workbook of expected figures and a script that compares them with RADiTrack's output (PASS/FAIL).
- **RIS Simulator:** logs completed exams and sign-offs without a live RIS, for demos and training.

**Access and devices**
- **Phone and tablet layouts** for all staff screens.
- **RIS sync agent design:** a read-only SQL Server view, so RADiTrack never writes to the RIS. Exams are matched by accession number, so changes in the RIS (late sign-off, corrected category, cancellation) are applied in RADiTrack.

**Documentation**
- User manual, computations document, use-case and activity diagrams, ERD, data flow and architecture diagrams.

---

## 3. Parts of the proposal that need our input

These are the parts in red in the proposal, each with draft text you can adapt.

### 3.1 Section XVIII: System Requirements → Software (marked "????")

> **Software**
> - **Operating system:** Windows 10/11 or Linux for the dashboard server; any OS with a modern browser for users
> - **Web browser:** Google Chrome or Microsoft Edge (latest versions) for staff computers, tablets, phones and the waiting-area TV
> - **Application:** RADiTrack web application built with Next.js (React, TypeScript) running on Node.js
> - **Database:** PostgreSQL (stores RADiTrack's copy of exam and report data and the SLA settings)
> - **RIS connection:** RADiTrack RIS Sync Agent (Node.js) with read-only access to a SQL Server view provided by hospital IT
> - **Existing RIS:** Microsoft SQL Server database (no changes to the RIS are required)
> - **Office software (optional):** Microsoft Excel for importing exams and reviewing the test workbook; a PDF reader for reports

**Needs confirming:** where the database will be hosted. It is currently a cloud PostgreSQL (Supabase) database; the hospital may require it on a local server.

### 3.2 Section XIX: RIS Integration → "Possible approaches include ---????"

> Possible approaches include:
> 1. **Read-only database view (recommended and implemented):** Hospital IT creates a SQL Server view containing only the fields RADiTrack needs (accession number, modality, patient category, study / completed / signed times, status, last updated) and a login that can only read that view. A sync agent inside the hospital network checks the view every 5 minutes and copies new or changed exams to RADiTrack. The RIS is never modified.
> 2. **API / web service** provided by the RIS vendor, if one is available.
> 3. **HL7 messages** (for example ORM/ORU) sent by the RIS when exams are completed and reports are finalized.
> 4. **Scheduled file export** (CSV or Excel) from the RIS, imported automatically or with RADiTrack's import function. This is the fallback if direct access is not approved.

### 3.3 Section XXI: Data Privacy → "Staff and management dashboards will use appropriate access controls"

This is not marked red, but **we need to decide on it**, because the system has no login yet. Options:
- add staff login (username and password per user, or one shared department account), or
- restrict access to the hospital network only (intranet) and state that in the proposal.

### 3.4 Section XXII: Phase 2 – System Analysis (marked "???")

> **Phase 2 – System Analysis**
> - Analyze the information gathered from the radiology workflow and interviews.
> - Map the RIS data fields to the information RADiTrack needs (exam completion time, report finalization time, modality, patient category, status).
> - Define how TAT, pending workload, SLA compliance and the 7-day and 12-month windows are computed.
> - Identify the users (patients and companions, radiologic technologists, radiologists, department head) and what each needs to see.
> - Document the requirements using use-case and activity diagrams.

### 3.5 Section XXII: Phase 3 – System Design (marked "???")

> **Phase 3 – System Design**
> - Design the system architecture: RIS → read-only view → sync agent → RADiTrack database → public display and staff dashboard.
> - Design the database (entity-relationship diagram) and the data flow.
> - Design the user interface of the public display and the staff dashboard for computers, tablets and phones.
> - Define the privacy design: aggregate-only public display, read-only RIS access, no patient identifiers.

### 3.6 Section XXII: Phase 4 – Development ("Develop the web-based dashboard and data-processing components????")

> **Phase 4 – Development**
> - Develop the web-based public display and staff dashboard.
> - Develop the data-processing components that calculate exam counts, TAT (average and median), pending workload and SLA compliance.
> - Develop the RIS sync agent that reads the approved RIS view.
> - Develop supporting features: examination records, import and export, SLA settings and the PDF report.
> - Development follows short iterations, with each feature reviewed with the department before the next.

### 3.7 Section XXII: Phase 5 – "How will we know that the count is accurate?"

> Accuracy will be verified in two ways:
> 1. **Validation dataset:** a prepared set of 100 examinations with known completion and finalization times, covering pending exams, exams finalized exactly at the SLA target and exams on window boundaries. The expected counts and TAT values are calculated independently in an Excel workbook and by a verification script, then compared with RADiTrack's figures. Every value must match (PASS/FAIL report).
> 2. **Comparison with the RIS:** for selected days, the counts and TAT in RADiTrack are compared with a manual count or report from the RIS for the same day and modality.

### 3.8 Section XXII: Phase 6 – "What evaluation tool will be used?"

> The system will be evaluated using:
> - **ISO/IEC 25010 software quality questionnaire** (Likert scale 1–5), covering functional suitability (accuracy), usability, reliability and performance efficiency (update speed), answered by radiologists, radiologic technologists and the department head.
> - **System Usability Scale (SUS)** for usability and user satisfaction.
> - **Accuracy test results** from Phase 5 (% of values that match).
> - **Update speed:** time from an exam being recorded in the RIS to appearing in RADiTrack (target: within 5 minutes).
> - **Reduction in manual work:** time staff spend preparing the weekly TAT statistics before and after using RADiTrack.

**Needs confirming:** whether your course or adviser requires a specific evaluation tool (ISO 25010 and SUS are common choices).
