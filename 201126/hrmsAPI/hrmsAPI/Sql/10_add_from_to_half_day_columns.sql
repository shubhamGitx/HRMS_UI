-- =========================================================================
-- 10_add_from_to_half_day_columns.sql
-- Add separate From Date / To Date Half-Day & Session Tracking columns
-- =========================================================================

-- 1. Add columns to leave.employee_leave
ALTER TABLE leave.employee_leave 
    ADD COLUMN IF NOT EXISTS from_day_type VARCHAR(10) NOT NULL DEFAULT 'FULL',
    ADD COLUMN IF NOT EXISTS from_half_session VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS to_day_type VARCHAR(10) NOT NULL DEFAULT 'FULL',
    ADD COLUMN IF NOT EXISTS to_half_session VARCHAR(20) NULL;

-- 2. Add check constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_employee_leave_from_day_type') THEN
        ALTER TABLE leave.employee_leave
            ADD CONSTRAINT ck_employee_leave_from_day_type 
            CHECK (from_day_type IN ('FULL', 'HALF'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_employee_leave_from_half_session') THEN
        ALTER TABLE leave.employee_leave
            ADD CONSTRAINT ck_employee_leave_from_half_session 
            CHECK (from_half_session IS NULL OR from_half_session IN ('FIRST_HALF', 'SECOND_HALF'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_employee_leave_to_day_type') THEN
        ALTER TABLE leave.employee_leave
            ADD CONSTRAINT ck_employee_leave_to_day_type 
            CHECK (to_day_type IN ('FULL', 'HALF'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_employee_leave_to_half_session') THEN
        ALTER TABLE leave.employee_leave
            ADD CONSTRAINT ck_employee_leave_to_half_session 
            CHECK (to_half_session IS NULL OR to_half_session IN ('FIRST_HALF', 'SECOND_HALF'));
    END IF;
END $$;

-- 3. Backfill existing half-day records if any
UPDATE leave.employee_leave
SET from_day_type = CASE WHEN is_half_day = true THEN 'HALF' ELSE 'FULL' END,
    from_half_session = CASE WHEN is_half_day = true THEN COALESCE(half_day_session, 'FIRST_HALF') ELSE NULL END,
    to_day_type = CASE WHEN is_half_day = true THEN 'HALF' ELSE 'FULL' END,
    to_half_session = CASE WHEN is_half_day = true THEN COALESCE(half_day_session, 'FIRST_HALF') ELSE NULL END
WHERE from_day_type = 'FULL' AND is_half_day = true;

-- 4. Update function leave.fn_get_employee_leaves
DROP FUNCTION IF EXISTS leave.fn_get_employee_leaves(bigint);
CREATE OR REPLACE FUNCTION leave.fn_get_employee_leaves(p_employee_id bigint)
 RETURNS TABLE(
     leave_id bigint, 
     leave_type_id bigint, 
     leave_type_code character varying, 
     leave_type_name character varying, 
     leave_reason_id integer, 
     reason_name character varying, 
     from_date date, 
     to_date date, 
     total_days numeric, 
     financial_year character varying, 
     reason text, 
     leave_status character varying, 
     rejection_reason text, 
     cancellation_reason text, 
     applied_date timestamp with time zone, 
     action_date timestamp with time zone, 
     cancelled_at timestamp with time zone, 
     is_half_day boolean, 
     half_day_session character varying,
     from_day_type character varying,
     from_half_session character varying,
     to_day_type character varying,
     to_half_session character varying
 )
 LANGUAGE sql
 STABLE
AS $function$
    SELECT 
        l.leave_id,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code)::VARCHAR AS leave_type_name,
        l.leave_reason_id,
        COALESCE(r.reason_name, 'Other')::VARCHAR AS reason_name,
        l.from_date,
        l.to_date,
        l.total_days,
        l.financial_year,
        l.reason,
        l.leave_status,
        l.rejection_reason,
        l.cancellation_reason,
        l.applied_date,
        l.action_date,
        l.cancelled_at,
        COALESCE(l.is_half_day, false) AS is_half_day,
        l.half_day_session::VARCHAR AS half_day_session,
        COALESCE(l.from_day_type, 'FULL')::VARCHAR AS from_day_type,
        l.from_half_session::VARCHAR AS from_half_session,
        COALESCE(l.to_day_type, 'FULL')::VARCHAR AS to_day_type,
        l.to_half_session::VARCHAR AS to_half_session
    FROM leave.employee_leave l
    LEFT JOIN master.leave_types m 
        ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN master.leave_reason_master r 
        ON r.id = l.leave_reason_id
    WHERE l.employee_id = p_employee_id
    ORDER BY l.applied_date DESC;
$function$;

-- 5. Update function leave.fn_get_manager_pending_leaves
DROP FUNCTION IF EXISTS leave.fn_get_manager_pending_leaves(bigint);
CREATE OR REPLACE FUNCTION leave.fn_get_manager_pending_leaves(p_reporting_official_id bigint)
 RETURNS TABLE(
     leave_id bigint, 
     employee_id bigint, 
     emp_name character varying, 
     contract_no character varying, 
     designation_name character varying, 
     office_name character varying, 
     leave_type_id bigint, 
     leave_type_code character varying, 
     leave_type_name character varying, 
     leave_reason_id integer, 
     reason_name character varying, 
     from_date date, 
     to_date date, 
     total_days numeric, 
     financial_year character varying, 
     reason text, 
     leave_status character varying, 
     applied_date timestamp with time zone, 
     is_half_day boolean, 
     half_day_session character varying,
     from_day_type character varying,
     from_half_session character varying,
     to_day_type character varying,
     to_half_session character varying
 )
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_role VARCHAR(20);
    v_office_id BIGINT;
BEGIN
    SELECT COALESCE(l.role_code, ''), COALESCE(o.office_id, 0)
    INTO v_role, v_office_id
    FROM official.official_master o
    LEFT JOIN login.official_login l ON l.official_id = o.official_id
    WHERE o.official_id = p_reporting_official_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        l.leave_id,
        e.employee_id,
        e.emp_name,
        COALESCE(e.contract_no, e.emp_code, 'N/A')::VARCHAR AS contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff')::VARCHAR AS designation_name,
        COALESCE(off.office_name, 'Department Office')::VARCHAR AS office_name,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code)::VARCHAR AS leave_type_name,
        l.leave_reason_id,
        COALESCE(r.reason_name, 'Other')::VARCHAR AS reason_name,
        l.from_date,
        l.to_date,
        l.total_days,
        l.financial_year,
        l.reason,
        l.leave_status,
        l.applied_date,
        COALESCE(l.is_half_day, false) AS is_half_day,
        l.half_day_session::VARCHAR AS half_day_session,
        COALESCE(l.from_day_type, 'FULL')::VARCHAR AS from_day_type,
        l.from_half_session::VARCHAR AS from_half_session,
        COALESCE(l.to_day_type, 'FULL')::VARCHAR AS to_day_type,
        l.to_half_session::VARCHAR AS to_half_session
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN master.leave_types m ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN master.leave_reason_master r ON r.id = l.leave_reason_id
    WHERE (
        e.reporting_official_id = p_reporting_official_id
        OR (v_role = 'DADM' AND e.office_id = v_office_id)
    )
      AND l.leave_status IN ('PENDING', 'APPLIED')
    ORDER BY l.applied_date ASC;
END;
$function$;
