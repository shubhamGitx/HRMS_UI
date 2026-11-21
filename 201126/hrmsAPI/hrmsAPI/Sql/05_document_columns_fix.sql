-- ============================================================
-- Fix: Add ALL missing columns to employee.employee_profile_document
-- AND create the missing document_verification_history table
--
-- Errors fixed:
--   42703: column "document_type_id" does not exist
--   42703: column "file_path" does not exist
--   42703: column "rejection_remarks" does not exist
--   42703: column "verified_by" does not exist
--   42703: column "verified_at" does not exist
--   42P01: relation "document_verification_history" does not exist
--
-- Run this script ONCE in pgAdmin or psql, then restart the API.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add missing columns to employee_profile_document
-- ─────────────────────────────────────────────────────────────
ALTER TABLE employee.employee_profile_document
    ADD COLUMN IF NOT EXISTS document_type_id   bigint                      NULL,
    ADD COLUMN IF NOT EXISTS file_path          character varying(500)      NULL,
    ADD COLUMN IF NOT EXISTS rejection_remarks  character varying(1000)     NULL,
    ADD COLUMN IF NOT EXISTS verified_by        bigint                      NULL,
    ADD COLUMN IF NOT EXISTS verified_at        timestamp with time zone    NULL;

-- Make file_data nullable (new uploads save to disk via file_path)
ALTER TABLE employee.employee_profile_document
    ALTER COLUMN file_data DROP NOT NULL;

-- Index for quick lookup by document type
CREATE INDEX IF NOT EXISTS ix_profile_document_type
    ON employee.employee_profile_document (document_type_id)
    WHERE document_type_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Create the missing document_verification_history table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee.document_verification_history (
    history_id      bigint                   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id     bigint                   NOT NULL,
    previous_status character varying(20)    NOT NULL,
    new_status      character varying(20)    NOT NULL,
    action_by       bigint                   NULL,
    action_by_name  character varying(200)   NULL,
    action_remarks  character varying(1000)  NULL,
    action_date     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_type     character varying(50)    NOT NULL,

    CONSTRAINT fk_doc_verify_history_document
        FOREIGN KEY (document_id)
        REFERENCES employee.employee_profile_document (profile_document_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_doc_verify_history_document
    ON employee.document_verification_history (document_id);
