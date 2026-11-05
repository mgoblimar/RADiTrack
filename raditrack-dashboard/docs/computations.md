# RADiTrack: Data Computations, Formulas and Definitions

This document explains every number RADiTrack shows on the staff dashboard and in the PDF report: what it means, how it is calculated, and which records are counted. It is the reference for the RADiTrack guide, the user manual and the project paper.

The rules here are taken directly from the application code. They are checked automatically against an independent calculation using the 100-exam validation dataset (see section 9).

---

## 1. Terms

| Term | Definition |
| --- | --- |
| **Examination (exam)** | One imaging study for one patient, identified by its accession number. |
| **Modality** | The imaging service: X-ray, Mammogram, Ultrasound, CT-Scan or MRI (always shown in this order). |
| **Patient category** | Where the patient comes from: **OPD** (outpatient), **Inpatient (IN)** or **Emergency (ER)**. |
| **Study date/time** | When the study was scheduled or started. All date filters use this time. |
| **Exam completed** | When the imaging itself was finished. The turnaround clock starts here. |
| **Report signed** | When the radiologist signed off the report. The turnaround clock stops here. |
| **Finalized** | An exam whose report has been signed. |
| **Pending / reading backlog** | An exam that is completed but whose report is not yet signed. |
| **Cancelled** | An exam with status *Cancelled*. Cancelled exams are excluded from every count and average. |
| **TAT** | Turnaround Time: the time from exam completion to report sign-off. |
| **SLA** | Service Level Agreement: the maximum TAT allowed for a modality and patient category. |
| **SLA breach** | A finalized exam whose TAT is longer than its SLA target. |

## 2. Turnaround Time (TAT)

$$\text{TAT (minutes)} = \text{Report signed} - \text{Exam completed}$$

- Calculated once, at the moment the report is signed, and stored with the report (rounded to 2 decimal places of a minute).
- Displayed in hours: $\text{TAT (hours)} = \text{TAT (minutes)} \div 60$.
- Only **finalized** exams have a TAT. Pending exams are never included in TAT averages or medians.

**Example.** Exam completed 6 Nov 08:10, report signed 7 Nov 09:40.
TAT = 25 h 30 min = 1,530 minutes = 25.5 hours.

## 3. SLA targets and breaches

Each modality has an SLA target per patient category, editable in **Configurations**. Default targets:

| Patient category | Default target |
| --- | --- |
| Emergency (ER) | 48 hours (2,880 minutes) |
| Inpatient (IN) | 48 hours (2,880 minutes) |
| Outpatient (OPD) | 72 hours (4,320 minutes) |

**Breach rule:** a report breaches its SLA when $\text{TAT} > \text{target}$ (strictly greater).

- Exactly on target (for example ER TAT = 2,880 minutes) is **within SLA**.
- One minute over (2,881 minutes) is a **breach**.
- The breach flag is decided at sign-off using the targets in force at that moment.

$$\text{SLA compliance (\%)} = \frac{\text{Finalized} - \text{Breached}}{\text{Finalized}} \times 100$$

Rounded to 1 decimal place. When nothing is finalized in the period, compliance is shown as 100%.

## 4. Averages and medians

**Average TAT** (mean):

$$\text{Average TAT (min)} = \frac{\sum \text{TAT of finalized exams}}{\text{number of finalized exams}}$$

- Rounded to 0.1 minute, then $\text{Average TAT (hours)} = \text{round}(\text{Average TAT (min)} \div 60,\ 0.1)$.
- Shows 0 when there are no finalized exams.

**Median TAT:** sort the TATs of finalized exams; the median is the middle value. With an even number of exams it is the average of the two middle values (2 decimal places). The median is less affected by a few very long reports than the average is.

**Example.** TATs of 600, 1,500, 2,000 and 4,400 minutes:
average = 8,500 ÷ 4 = 2,125 min = 35.4 h; median = (1,500 + 2,000) ÷ 2 = 1,750 min.

## 5. Date windows (time filters)

The filter bar's time window decides which exams are counted, by **study date/time**. Every window also has a comparison ("prior") window of the same kind.

| Time window | Includes study times from … to … | Compared with |
| --- | --- | --- |
| Today | 00:00 today to 23:59:59 today | Yesterday |
| Rolling 7 days | 00:00 six days ago to the end of today (7 calendar days) | The 7 days before that |
| This week | Monday 00:00 to Sunday 23:59:59 of the current week | Last week |
| Last week | Monday to Sunday of the previous week | The week before |
| This month | 1st 00:00 to the last day 23:59:59 of the current month | Last month |
| Last month | The whole previous calendar month | The month before |
| This year | 1 January to 31 December of the current year | Last year |
| Custom | 00:00 of the start date to 23:59:59 of the end date | The same number of days immediately before |
| All time | Every recorded exam | The previous calendar month |

Charts that need a fixed shape (the 7-day table and the 12-month trend) end on the window's **end date**, capped at today so they never show empty future days.

## 6. Staff dashboard

### 6.1 KPI cards

| Card | Formula |
| --- | --- |
| **Total scans** | Number of non-cancelled exams in the window (matching the modality and patient-category filters). |
| **Average Turnaround Time** | Average TAT of finalized exams in the window (section 4), with the median underneath. |
| **SLA compliance** | (Finalized − Breached) ÷ Finalized × 100 for the window. |
| **Reading backlog** | Exams in the window that are not yet signed. For *All time*: every completed, unsigned, non-cancelled exam. |

**Change vs prior period:**

$$\text{Change (\%)} = \frac{\text{current} - \text{prior}}{\text{prior}} \times 100$$

For TAT, a negative change means reports are **faster**; a positive change means **longer**. No change is shown when either period has no data.

### 6.2 Turnaround Time by modality

For each modality: average TAT (hours) of finalized exams in the window. When a patient category is selected, the chart also shows that category's SLA target per modality, and bars over target are drawn in red. The modality chosen in the filter bar is outlined.

### 6.3 7-day Turnaround Time table

One row per day for the 7 days ending on the window's end date. Rolling = the 7 calendar days up to that date; Monday–Sunday = the calendar week containing it.

| Column | Formula |
| --- | --- |
| Exams | Non-cancelled exams with a study time on that day |
| OPD / IN / ER | The same exams split by patient category |
| Signed | Exams from that day whose report is signed |
| Pending | Exams − Signed |
| Average TAT | Average TAT of that day's signed exams |

*Compare previous 7 days* shows the same table for the 7 days immediately before.

### 6.4 12-month trend

One point per calendar month (rolling 12 months ending on the window's end month, or a chosen calendar year). Each month counts finalized, non-cancelled exams whose study date falls in that month.

- **Average TAT (month)** = average TAT of that month's finalized exams, in hours.
- **Change vs previous month (%)** = (this month − previous month) ÷ previous month × 100.
- **Change vs same month last year (%)** = (this month − same month one year earlier) ÷ that month × 100.

The tooltip shows both changes for the overall line and for each modality.

## 7. PDF report

The report uses the same calculations as the dashboard, for the time window, modality and patient category chosen in the report builder:

| Section | Source |
| --- | --- |
| Executive summary | KPI cards (6.1) with the prior-period comparison |
| TAT by modality | Section 6.2, plus a table of finalized count, average TAT and target |
| SLA compliance by modality | Average TAT vs SLA target per modality: difference (hours) and *Within target* / *Over target* |
| Daily breakdown | 7-day table (6.3) ending on the report's end date |
| 12-month trend | Section 6.4, with previous-month and same-month-last-year changes |

Reports generated while test data is loaded carry a *Test data* notice.

## 8. Rounding summary

| Value | Rounding |
| --- | --- |
| Stored TAT | 2 decimal places of a minute |
| Average TAT | 0.1 minute, then hours to 0.1 |
| Median TAT | 2 decimal places of a minute (only when averaging the two middle values) |
| Percentages (SLA compliance, changes) | 1 decimal place |

## 9. Validation dataset and automatic verification

RADiTrack ships with a 100-exam validation dataset (`data/test-dataset.ts`, also downloadable as `raditrack-test-dataset.xlsx`). Its dates are relative to the day it is loaded, so every time window has data. It deliberately includes:

- pending exams (not counted in TAT averages, counted in the backlog),
- reports exactly on the SLA target (within SLA) and one minute over (breach),
- boundary times: 00:00 and 23:59 at the edges of today, the rolling 7 days, the week and the month,
- 14 months of data for the 12-month, previous-month and same-month-last-year comparisons.

**Checking the numbers**

1. RIS Simulator → **Load 100-exam test dataset** (real data is backed up first).
2. Open the workbook in Excel: the *Expected* sheets recalculate every figure from the raw rows with Excel formulas.
3. Run `npm run test-data:verify`. It recomputes every expected value independently and compares it with RADiTrack's own functions (KPI cards, TAT by modality, 7-day table, 12-month trend), writing PASS/FAIL per value into the *Verification* sheet of `docs/test-data/verification-<date>.xlsx`.
4. RIS Simulator → **Restore real data**.

While test data is loaded, a banner appears on every staff screen. Exams added by other users during that time are discarded when the real data is restored, so keep test sessions short.
