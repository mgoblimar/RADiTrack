# RADiTrack User Manual

How to use RADiTrack in the Department of Radiology's daily routine. Each section is a step-by-step flow for one task.

> **Draft.** The interface is still being finalized. Screens are marked with placeholders like this one:
>
> **[SCREENSHOT: name of the screen]**
>
> Replace each placeholder with a screenshot once the UI is final. For how each number is calculated, see [computations.md](computations.md). The same information is in the app under **Configurations → RADiTrack Guide**.

---

## 1. What RADiTrack does

RADiTrack measures how long each radiology report takes, from the moment the scan is completed to the radiologist's sign-off: the **Turnaround Time (TAT)**. It also shows whether reports meet the hospital's targets (**SLA**). It uses no patient names or identifying details; exams are tracked by accession number only.

| Who | Uses RADiTrack to… | Main screens | Sign-in |
| --- | --- | --- | --- |
| Radiologists and Residents | See the backlog, sign off reports, monitor TAT and SLA compliance, produce reports | Dashboard, Examinations, Generate report | Own account |
| RADiTrack Administrator | Everything above, plus accounts, SLA targets, rooms, imports, test data and the RIS Simulator | Configurations, Examinations, RIS Simulator | Own account |
| Patients (waiting area) | See how busy each imaging service is | Patient TV display | None |

Radiologists and Residents have the **same access**. Each account has one or more **assigned modalities**; the dashboard and backlog start on the first one, and you can switch to any modality at any time. Accounts only set your starting view: RADiTrack never ranks or scores individual doctors.

## 2. Getting started

### 2.1 Opening RADiTrack

1. Open a web browser (Chrome or Edge recommended) on a computer, tablet or phone connected to the hospital network.
2. Go to the RADiTrack address given by the IT/RADiTrack team. **[TO CONFIRM: final address]**
3. On the **Sign in** page, enter the **username** and **password** from your administrator.
4. **First sign-in:** you are asked to **Set your password**. Enter the temporary password, then a new one (at least 8 characters, with a letter and a number).
5. The **Dashboard** opens on your first assigned modality. Use the **Your modalities** buttons under the filter bar to switch between your modalities, or **All modalities** for the whole department.

> **[SCREENSHOT: Sign in page]**
> **[SCREENSHOT: Dashboard, desktop, first view with "Your modalities"]**

**Forgot your password?** Ask the administrator to reset it; you will get a new temporary password.
After 5 wrong passwords in a row, the account pauses for 5 minutes.
**Signing out:** press **Log out** at the bottom of the menu.
**Settings** (next to Log out) shows your account details and assigned modalities, and lets you **change your password**. You stay signed in on that device; your other devices are signed out.

> **[SCREENSHOT: Settings page]**

### 2.2 Moving around

- **Computer:** use the menu on the left: **Dashboard**, **Examinations**, **Configurations**, and under Tools, **Patient TV Display** and **RIS Simulator**. The arrow button at the top of the menu collapses it to icons.
- **Tablet or phone:** tap the **☰ menu button** at the top right to open the same menu.

> **[SCREENSHOT: Sidebar menu (desktop) and the phone menu]**

The numbers refresh by themselves every few seconds, so there is no need to reload the page.

## 3. Daily routine

### 3.1 Administrator (prototype only): logging a completed exam

When RADiTrack is connected to the hospital RIS, completed exams appear automatically within about 5 minutes and you can skip this section. Until then, an administrator logs exams for testing and demos:

1. Open **RIS Simulator** from the menu.
2. Under **Log Examination**, press **Generate ID** or type the **Accession ID**.
3. Choose the **Modality** (X-ray, Mammogram, Ultrasound, CT-Scan, MRI) and the **Patient Category** (Emergency, Outpatient, Inpatient).
4. Add **Clinical notes** if needed (optional; never enter patient names).
5. Press **Log Completed Scan**. The exam now appears in the reading backlog with its waiting time starting at zero.

> **[SCREENSHOT: RIS Simulator → Log Examination form]**

**Correcting a mistake (administrators):** go to **Examinations → Backlog**, find the exam, and use the ✏️ **edit** or 🗑 **delete** button on its row (on tablets and phones these are on the exam's card).

### 3.2 Radiologists and Residents: working through the backlog

1. Open **Examinations**. The **Backlog** tab lists every completed exam that is not yet signed, oldest first. It starts filtered to your assigned modalities; use **Filters** to see others.
2. Check each exam's **Waiting** time and **SLA target**:
   - **Waiting** (orange): still within its target.
   - **Past SLA** (red): already waiting longer than the target. Read these first.
3. After reading the images, press **Sign** (or **Sign report** on a tablet or phone).
4. RADiTrack records the sign-off time, calculates the TAT, and checks it against the SLA target. The exam moves to **Finalized** as **Met SLA** or **Signed late**.

> **[SCREENSHOT: Examinations → Backlog, desktop table]**
> **[SCREENSHOT: Examinations → Backlog, phone card view]**

**Tip:** use **Search accession ID** to find one exam, or **Filters** to show only certain dates, modalities or patient categories. The tab counts always add up: **All = Finalized + Backlog** for the filters you chose.

### 3.3 Radiologists and Residents: checking performance

1. Open the **Dashboard**. It starts with the **Rolling 7 days**, your first assigned modality and all patient categories.
2. Read the four **KPI cards**:
   - **Total scans** in the period, with the split by modality.
   - **Average Turnaround Time**, with the **median** underneath.
   - **SLA compliance**: the share of signed reports that met their target.
   - **Reading backlog**: exams still waiting to be signed.

   Each card also compares with the previous period (for example "30% faster").
3. Narrow the view with the **filter bar** at the top. One filter controls the whole page:
   - **Time window:** Today, Rolling 7 days, This/Last week, This/Last month, This year, All time, or **Custom** (choose dates, then **Apply**).
   - **Modality** and **Patient category**.
4. Scroll down for the detail:
   - **Turnaround Time by modality:** average TAT per modality. Choose a patient category to see each modality's SLA target; red bars are over target.
   - **7-day table:** exams per day with the OPD/IN/ER split, signed, pending and average TAT. Press **Compare previous 7 days** to see the week before alongside it.
   - **12-month trend:** monthly average TAT. Hover over (or tap) a month to see the previous month and the same month last year. **View** switches between the rolling 12 months and a calendar year.

> **[SCREENSHOT: Dashboard filter bar and KPI cards]**
> **[SCREENSHOT: Turnaround Time by modality with a patient category selected]**
> **[SCREENSHOT: 7-day table with "Compare previous 7 days" on]**
> **[SCREENSHOT: 12-month trend tooltip]**

## 4. Producing a PDF report

1. On the Dashboard, press **Generate report** (next to the filter bar).
2. Fill in the report builder. It starts from the dashboard's current filters:
   - **Report title** and **Prepared by** (optional).
   - **Time frame** (or **Custom range** with start and end dates).
   - **Modality** and **Patient category**.
   - **Sections to include:** Executive summary, Turnaround Time by modality, SLA compliance by modality, Daily breakdown, 12-month trend.
   - **Notes or remarks** (optional; shown under the report header).
3. Press **Preview report**. The report opens in a new tab.
4. Check the preview, then press **Download PDF** and choose **Save as PDF** as the printer.

> **[SCREENSHOT: Generate report dialog]**
> **[SCREENSHOT: Report preview (A4)]**

If the report shows a **Test data** notice, it was produced while the validation dataset was loaded. Do not use it as a real report.

## 5. Managing examination records

### 5.1 Importing exams from a spreadsheet

1. Open **Examinations** and press **Import exams**.
2. Choose an Excel file (sheet named **Exams**) or a CSV file. Download the template from the same dialog if needed.
3. Check the preview: rows in the file, rows ready to import, and any **problems listed by row number**. Fix those rows in the file and upload it again.
4. Choose **Add to current data** (keeps existing exams; accession numbers must be new), then press **Import**.

> **[SCREENSHOT: Import exams dialog with preview]**

### 5.2 Exporting exams

Press **Export CSV** on the Examinations tab to download all examinations (de-identified) for audits or checking against the RIS.

## 6. Configuration (Administrator)

Doctors can open **Configurations** to read the SLA targets, rooms and the RADiTrack Guide; only administrators can change them.

### 6.0 Accounts

1. Open **Configurations → Accounts** and press **Add account**.
2. Enter the **Full name**, a **Username** (lowercase, e.g. `msantos`) and the **Role** (Radiologist, Resident or Administrator).
3. Under **Assigned modalities**, click the doctor's modalities **in order of priority**; the number on each shows the order, and **1** is where their dashboard starts. Leave empty to start on all modalities.
4. Press **Create account**. A **temporary password** is shown **once**: copy it and give it to the doctor privately. They must replace it at first sign-in.

Other actions on each account:
- **Edit:** change the name, username, role or modalities. A role change signs the person out.
- **Reset password:** signs them out and shows a new temporary password.
- **Deactivate / Activate:** a deactivated account can't sign in. Accounts are never deleted.

You can't deactivate or demote your own account, and at least one active administrator is always kept.

**First administrator:** the RADiTrack team creates it once with `npm run auth:create-admin` (username and password come from environment variables).

> **[SCREENSHOT: Configurations → Accounts]**
> **[SCREENSHOT: Temporary password card]**

### 6.1 SLA targets

1. Open **Configurations → SLA Benchmarks**.
2. Each modality shows its target for Emergency, Outpatient and Inpatient. Press the ✏️ button to change one.
3. **Reset SLA defaults** restores the hospital standards (ER and Inpatient 48 hours, Outpatient 72 hours).

New targets apply to reports signed **after** the change; reports already signed keep their original result.

> **[SCREENSHOT: SLA Benchmarks]**

### 6.2 Modality rooms

In **Configurations → Modality Rooms**, use **Edit room** to set the room or suite. Use **Set maintenance / Set online** when a machine is out of service.

> **[SCREENSHOT: Modality Rooms]**

### 6.3 RADiTrack Guide

**Configurations → RADiTrack Guide** explains the daily routine, every term, how each number is calculated (with examples), the current SLA targets and the time windows. Point new staff here first.

## 7. Checking that the numbers are correct (Administrator)

Use this when presenting results or after any change to the system.

1. Tell colleagues that testing is starting: exams logged by others during the test are discarded afterwards.
2. Open **RIS Simulator** and press **Load 100-exam test dataset** (after 00:30), then confirm. A **TEST DATA ACTIVE** banner appears on every staff screen.
3. Press **Test workbook (.xlsx)** and open it in Excel. Its **Expected** sheets show what each card and chart should read today.
4. Compare the dashboard with the workbook. The RADiTrack team can also run `npm run test-data:verify` for an automatic PASS/FAIL report.
5. Back in **RIS Simulator**, press **Restore real data**. The banner disappears and all real exams return.

> **[SCREENSHOT: RIS Simulator → Test data panel]**
> **[SCREENSHOT: TEST DATA ACTIVE banner]**

## 8. Automatic data from the hospital RIS (Administrator / IT)

When connected, a small **RIS sync agent** on a hospital PC copies new and changed exams from the RIS every 5 minutes. Exams are matched by accession number, so a report signed later in the RIS also shows as signed in RADiTrack. It pauses while test data is loaded. Setup is described in [ris-integration.md](ris-integration.md). **[TO CONFIRM: once the hospital connection is live]**

## 9. Patient TV display

Open **Patient TV Display** from the menu on the waiting-area screen. For each imaging service it shows how many exams were handled today compared with yesterday, plus a chart of today's mix. It contains **no patient information** and refreshes by itself.

> **[SCREENSHOT: Patient TV display]**

## 10. Using RADiTrack on a tablet or phone

- Every staff screen works on tablets and phones. Wide tables become cards, and buttons are sized for fingers.
- On the RADiTrack Guide, swipe the row of topics under the top bar to jump between sections.
- **[TO CONFIRM: final address for mobile access]**

> **[SCREENSHOT: Dashboard on a phone]**

## 11. Troubleshooting

| What you see | What to do |
| --- | --- |
| "Incorrect username or password." | Check the username (lowercase) and password. After 5 tries the account pauses for 5 minutes; an administrator can reset it. |
| You were sent back to **Sign in** | Your session ended (after 12 hours, a password change or reset, or a role change). Sign in again. |
| No **RIS Simulator** in the menu, or no edit/delete buttons | Those are administrator tools. |
| Numbers look different from yesterday's report | Check the **time window** in the filter bar; "Rolling 7 days" moves every day. |
| A **TEST DATA ACTIVE** banner | Someone is testing. Do not use these numbers; ask the administrator to **Restore real data**. |
| An exam is missing | Check the **Filters** and the **All** tab on Examinations; with RIS sync, wait up to 5 minutes. |
| Import says a row has a problem | Fix that row (row numbers match Excel) and upload again; nothing is saved until the file is clean. |
| "Load test dataset" fails just after midnight | Try again after 00:30; today's test exams finish by then. |
| Average TAT shows "—" or 0 | No reports were signed in the chosen period or filter. |
| The page does not open on a tablet or phone | Make sure the device is on the hospital network; contact the RADiTrack team. |

## 12. Terms

See [computations.md](computations.md#1-terms) or **Configurations → RADiTrack Guide → Terms** for the full list (TAT, SLA, breach, backlog, median and more).
