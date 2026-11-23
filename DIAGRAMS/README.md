# RADiTrack diagrams

PlantUML sources, matching release **v0.2.2**. Open them with the PlantUML extension in VS Code, or render with `java -jar plantuml.jar -tpng *.puml`.

| # | File | Diagram | Shows |
|---|---|---|---|
| 01 | `01_System_Context.puml` | System context | Where RADiTrack sits between the RIS and its two views (SRS 2.1) |
| 02 | `02_System_Architecture.puml` | Architecture / components | Pages, server actions, shared logic and database tables |
| 03 | `03_Use_Case.puml` | Use cases | What doctors, administrators, the public and the RIS do with the system |
| 04 | `04_Entity_Relationship.puml` | Entity-relationship | Database tables, fields and relationships (Appendix B) |
| 05 | `05_Sequence_Data_Flow.puml` | Sequence | How data moves from intake to TAT calculation to the dashboard |
| 06 | `06_Activity_Examination_Lifecycle.puml` | Activity | An exam from completion to sign-off, TAT and SLA, and the signed-off lock |
| 07 | `07_Activity_Import_Examinations.puml` | Activity | Importing a spreadsheet: add, update, amend or refuse each row |
| 08 | `08_Activity_Audit_Log_and_Undo_Upload.puml` | Activity | Reviewing the audit log and undoing an upload |
| 09 | `09_Activity_Dashboard_and_Report.puml` | Activity | Reviewing turnaround time and generating the PDF report |

`archive/` keeps diagrams that are not part of the current system description:

- `Activity_RIS_Sync_Planned.puml`: the planned RIS sync agent (not deployed; waits for hospital approval of RIS access).
- `Activity_Test_Data_Verification.puml`: the developers' calculation check with the validation dataset.
