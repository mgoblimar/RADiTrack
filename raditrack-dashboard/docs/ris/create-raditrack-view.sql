/* =============================================================================
   RADiTrack read-only access for Microsoft SQL Server (RIS database)
   -----------------------------------------------------------------------------
   Run as a database administrator in the RIS database. It creates:
     1. a schema "raditrack" for RADiTrack's objects,
     2. the view raditrack.vw_exams (EDIT the FROM/JOIN part for your RIS),
     3. a login + user that can SELECT from that one view and nothing else.
   RADiTrack never writes to this database and reads no patient names, IDs,
   or report text. See docs/ris-integration.md for details.
   ============================================================================= */

-- 1. Schema (owned by dbo so the view can read the RIS tables via ownership chaining)
IF SCHEMA_ID(N'raditrack') IS NULL
    EXEC (N'CREATE SCHEMA raditrack AUTHORIZATION dbo');
GO

-- 2. The view. Keep the column names and types on the LEFT exactly as shown;
--    replace the table and column names on the RIGHT with your RIS ones.
CREATE OR ALTER VIEW raditrack.vw_exams
AS
SELECT
    CAST(o.AccessionNumber   AS varchar(64))  AS accession_number,        -- unique exam id (no patient id)
    CAST(o.Modality          AS varchar(16))  AS modality_code,           -- CR/DX/XR, MG, US, CT, MR
    CAST(v.PatientClass      AS varchar(16))  AS patient_class,           -- O/OPD, I/IN, E/ER
    CAST(o.StudyDateTime     AS datetime2(0)) AS study_datetime,
    CAST(o.ExamEndDateTime   AS datetime2(0)) AS exam_completed_datetime, -- NULL if not completed
    CAST(r.FinalSignedAt     AS datetime2(0)) AS report_signed_datetime,  -- NULL if not signed
    CAST(o.OrderStatus       AS varchar(32))  AS exam_status,             -- must read CANCELLED/CANCELED/CA when cancelled
    CAST(
        CASE WHEN r.LastModified > o.LastModified THEN r.LastModified ELSE o.LastModified END
        AS datetime2(0))                      AS last_updated             -- latest change to the exam or its report
FROM dbo.RadiologyOrders AS o                                             -- <-- EDIT
LEFT JOIN dbo.Visits AS v ON v.VisitId = o.VisitId                        -- <-- EDIT
LEFT JOIN dbo.Reports AS r ON r.OrderId = o.OrderId AND r.Status = 'FINAL' -- <-- EDIT
WHERE o.Modality IN ('CR', 'DX', 'XR', 'MG', 'US', 'CT', 'MR');           -- the five services RADiTrack tracks
GO

-- 3. Read-only login for the RADiTrack sync agent (set a strong password).
IF SUSER_ID(N'raditrack_reader') IS NULL
    CREATE LOGIN raditrack_reader WITH PASSWORD = N'<CHANGE-ME-strong-password>', CHECK_POLICY = ON;
GO
IF USER_ID(N'raditrack_reader') IS NULL
    CREATE USER raditrack_reader FOR LOGIN raditrack_reader;
GO
GRANT SELECT ON OBJECT::raditrack.vw_exams TO raditrack_reader;   -- the ONLY permission granted
GO

-- 4. Recommended: an index on the "last modified" columns used by last_updated,
--    so the 5-minute "what changed since…" query stays fast. Example:
-- CREATE INDEX IX_RadiologyOrders_LastModified ON dbo.RadiologyOrders (LastModified);
-- CREATE INDEX IX_Reports_LastModified        ON dbo.Reports (LastModified);

-- 5. Quick check, run as raditrack_reader:
-- SELECT TOP (10) * FROM raditrack.vw_exams ORDER BY last_updated DESC;
