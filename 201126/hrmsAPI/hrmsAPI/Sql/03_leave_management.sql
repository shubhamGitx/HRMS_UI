-- ===================================================
-- 03_leave_management.sql
-- Leave Management Schema, Masters, and Functions
-- ===================================================

-- 1. Insert Leave Types Master (CL, EL, PL, SL) for lang_code 1 & 2
DELETE FROM master.leave_types WHERE leave_type_code IN ('CL', 'EL', 'PL', 'SL');

-- Reset sequence if needed
SELECT setval('master.leave_types_leave_type_id_seq', 1, false);

-- Lang 1 (English)
INSERT INTO master.leave_types (leave_type_id, leave_type_code, leave_type_name, lang_code, annual_quota, is_encashable) VALUES
(1, 'CL', 'Casual Leave', 1, 10, false),
(2, 'EL', 'Earned Leave', 1, 10, true),
(3, 'PL', 'Privilege Leave', 1, 10, false),
(4, 'SL', 'Sick / Medical Leave', 1, 10, false);

-- Lang 2 (Hindi)
INSERT INTO master.leave_types (leave_type_id, leave_type_code, leave_type_name, lang_code, annual_quota, is_encashable) VALUES
(1, 'CL', 'आकस्मिक अवकाश (CL)', 2, 10, false),
(2, 'EL', 'अर्जित अवकाश (EL)', 2, 10, true),
(3, 'PL', 'विशेषाधिकार अवकाश (PL)', 2, 10, false),
(4, 'SL', 'चिकित्सा अवकाश (SL)', 2, 10, false);

-- 2. Create Schema 'leave' if not exists
CREATE SCHEMA IF NOT EXISTS leave;

-- 3. Create Table 'leave.employee_leave'
CREATE TABLE IF NOT EXISTS leave.employee_leave (
    leave_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee.employee_master(employee_id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL,
    leave_type_code VARCHAR(10) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    reason TEXT,
    leave_status VARCHAR(20) NOT NULL DEFAULT 'APPLIED', -- 'APPLIED', 'APPROVED', 'REJECTED'
    rejection_reason TEXT,
    applied_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_by_official_id BIGINT,
    action_date TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_leave_dates CHECK (to_date >= from_date),
    CONSTRAINT ck_total_days CHECK (total_days > 0)
);

CREATE INDEX IF NOT EXISTS ix_employee_leave_emp_status ON leave.employee_leave(employee_id, leave_status);
CREATE INDEX IF NOT EXISTS ix_employee_leave_dates ON leave.employee_leave(from_date, to_date);

-- 4. Function: Get Employee Leave Balances
-- Returns hardcoded 10 allowed per leave type for now, and calculates balance
CREATE OR REPLACE FUNCTION leave.fn_get_employee_leave_balances(
    p_employee_id BIGINT,
    p_financial_year VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    leave_type_id BIGINT,
    leave_type_code VARCHAR,
    leave_type_name VARCHAR,
    annual_allowed NUMERIC,
    consumed_approved NUMERIC,
    pending_applied NUMERIC,
    balance NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    v_fy VARCHAR(10);
BEGIN
    -- Determine current Indian Financial Year (Apr to Mar)
    IF p_financial_year IS NOT NULL AND trim(p_financial_year) <> '' THEN
        v_fy := trim(p_financial_year);
    ELSE
        IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
            v_fy := EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text;
        ELSE
            v_fy := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::text || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::text;
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        m.leave_type_id,
        m.leave_type_code::VARCHAR,
        m.leave_type_name::VARCHAR,
        10.0::NUMERIC AS annual_allowed, -- Hardcoded 10 as specified by user
        COALESCE(
            SUM(CASE WHEN l.leave_status = 'APPROVED' THEN l.total_days ELSE 0 END), 
            0
        )::NUMERIC AS consumed_approved,
        COALESCE(
            SUM(CASE WHEN l.leave_status = 'APPLIED' THEN l.total_days ELSE 0 END), 
            0
        )::NUMERIC AS pending_applied,
        (10.0 - COALESCE(
            SUM(CASE WHEN l.leave_status = 'APPROVED' THEN l.total_days ELSE 0 END), 
            0
        ))::NUMERIC AS balance
    FROM master.leave_types m
    LEFT JOIN leave.employee_leave l 
        ON l.leave_type_id = m.leave_type_id 
       AND l.employee_id = p_employee_id 
       AND l.financial_year = v_fy
       AND l.leave_status IN ('APPLIED', 'APPROVED')
    WHERE m.lang_code = 1
    GROUP BY m.leave_type_id, m.leave_type_code, m.leave_type_name
    ORDER BY m.leave_type_id;
END;
$func$;

-- 5. Function: Apply Leave
CREATE OR REPLACE FUNCTION leave.fn_apply_leave(
    p_employee_id BIGINT,
    p_leave_type_id BIGINT,
    p_from_date DATE,
    p_to_date DATE,
    p_reason TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR,
    leave_id BIGINT,
    total_days NUMERIC,
    financial_year VARCHAR
)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_code VARCHAR(10);
    v_days NUMERIC(4, 1);
    v_fy VARCHAR(10);
    v_new_leave_id BIGINT;
BEGIN
    -- Validate employee exists
    IF NOT EXISTS (SELECT 1 FROM employee.employee_master WHERE employee_id = p_employee_id) THEN
        RETURN QUERY SELECT false, 'Employee record not found.'::VARCHAR, NULL::BIGINT, 0::NUMERIC, ''::VARCHAR;
        RETURN;
    END IF;

    -- Validate leave type
    SELECT leave_type_code INTO v_code 
    FROM master.leave_types 
    WHERE leave_type_id = p_leave_type_id AND lang_code = 1;

    IF v_code IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid leave type selected.'::VARCHAR, NULL::BIGINT, 0::NUMERIC, ''::VARCHAR;
        RETURN;
    END IF;

    IF p_from_date IS NULL OR p_to_date IS NULL THEN
        RETURN QUERY SELECT false, 'From Date and To Date are required.'::VARCHAR, NULL::BIGINT, 0::NUMERIC, ''::VARCHAR;
        RETURN;
    END IF;

    IF p_to_date < p_from_date THEN
        RETURN QUERY SELECT false, 'To Date cannot be before From Date.'::VARCHAR, NULL::BIGINT, 0::NUMERIC, ''::VARCHAR;
        RETURN;
    END IF;

    -- Calculate total days (inclusive)
    v_days := (p_to_date - p_from_date) + 1;

    -- Determine Indian Financial Year
    IF EXTRACT(MONTH FROM p_from_date) >= 4 THEN
        v_fy := EXTRACT(YEAR FROM p_from_date)::text || '-' || (EXTRACT(YEAR FROM p_from_date) + 1)::text;
    ELSE
        v_fy := (EXTRACT(YEAR FROM p_from_date) - 1)::text || '-' || EXTRACT(YEAR FROM p_from_date)::text;
    END IF;

    -- Check for overlapping active leaves
    IF EXISTS (
        SELECT 1 FROM leave.employee_leave 
        WHERE employee_id = p_employee_id 
          AND leave_status IN ('APPLIED', 'APPROVED')
          AND NOT (p_to_date < from_date OR p_from_date > to_date)
    ) THEN
        RETURN QUERY SELECT false, 'Leave already applied or approved for overlapping dates.'::VARCHAR, NULL::BIGINT, 0::NUMERIC, ''::VARCHAR;
        RETURN;
    END IF;

    -- Insert leave application
    INSERT INTO leave.employee_leave (
        employee_id,
        leave_type_id,
        leave_type_code,
        from_date,
        to_date,
        total_days,
        financial_year,
        reason,
        leave_status,
        applied_date
    )
    VALUES (
        p_employee_id,
        p_leave_type_id,
        v_code,
        p_from_date,
        p_to_date,
        v_days,
        v_fy,
        trim(p_reason),
        'APPLIED',
        CURRENT_TIMESTAMP
    )
    RETURNING leave.employee_leave.leave_id INTO v_new_leave_id;

    RETURN QUERY SELECT 
        true, 
        ('Leave application submitted successfully for ' || v_days::text || ' day(s).')::VARCHAR,
        v_new_leave_id,
        v_days,
        v_fy;
END;
$func$;

-- 6. Function: Get Employee Leaves (For Calendar & History)
CREATE OR REPLACE FUNCTION leave.fn_get_employee_leaves(
    p_employee_id BIGINT
)
RETURNS TABLE (
    leave_id BIGINT,
    leave_type_id BIGINT,
    leave_type_code VARCHAR,
    leave_type_name VARCHAR,
    from_date DATE,
    to_date DATE,
    total_days NUMERIC,
    financial_year VARCHAR,
    reason TEXT,
    leave_status VARCHAR,
    rejection_reason TEXT,
    applied_date TIMESTAMP WITH TIME ZONE,
    action_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $func$
    SELECT 
        l.leave_id,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code) AS leave_type_name,
        l.from_date,
        l.to_date,
        l.total_days,
        l.financial_year,
        l.reason,
        l.leave_status,
        l.rejection_reason,
        l.applied_date,
        l.action_date
    FROM leave.employee_leave l
    LEFT JOIN master.leave_types m 
        ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    WHERE l.employee_id = p_employee_id
    ORDER BY l.applied_date DESC;
$func$;

-- 7. Function: Get Manager Pending Leaves
CREATE OR REPLACE FUNCTION leave.fn_get_manager_pending_leaves(
    p_reporting_official_id BIGINT
)
RETURNS TABLE (
    leave_id BIGINT,
    employee_id BIGINT,
    emp_name VARCHAR,
    contract_no VARCHAR,
    designation_name VARCHAR,
    office_name VARCHAR,
    leave_type_id BIGINT,
    leave_type_code VARCHAR,
    leave_type_name VARCHAR,
    from_date DATE,
    to_date DATE,
    total_days NUMERIC,
    financial_year VARCHAR,
    reason TEXT,
    leave_status VARCHAR,
    applied_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $func$
    SELECT 
        l.leave_id,
        e.employee_id,
        e.emp_name,
        e.contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff') AS designation_name,
        COALESCE(off.office_name, 'BRDS Office') AS office_name,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code) AS leave_type_name,
        l.from_date,
        l.to_date,
        l.total_days,
        l.financial_year,
        l.reason,
        l.leave_status,
        l.applied_date
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN master.leave_types m ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    WHERE (p_reporting_official_id <= 0 OR e.reporting_official_id = p_reporting_official_id)
      AND l.leave_status = 'APPLIED'
    ORDER BY l.applied_date ASC;
$func$;

-- 8. Function: Manager Action (Approve / Reject)
DROP FUNCTION IF EXISTS leave.fn_action_leave(BIGINT, BIGINT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION leave.fn_action_leave(
    p_leave_id BIGINT,
    p_official_id BIGINT,
    p_action VARCHAR(20), -- 'APPROVE' or 'REJECT'
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR,
    out_leave_id BIGINT,
    new_status VARCHAR
)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_current_status VARCHAR;
    v_upper_action VARCHAR := upper(trim(p_action));
BEGIN
    SELECT el.leave_status INTO v_current_status 
    FROM leave.employee_leave el 
    WHERE el.leave_id = p_leave_id;

    IF v_current_status IS NULL THEN
        RETURN QUERY SELECT false, 'Leave application not found.'::VARCHAR, NULL::BIGINT, ''::VARCHAR;
        RETURN;
    END IF;

    IF v_current_status <> 'APPLIED' THEN
        RETURN QUERY SELECT false, ('Leave application is already ' || v_current_status || '.')::VARCHAR, p_leave_id, v_current_status;
        RETURN;
    END IF;

    IF v_upper_action = 'APPROVE' THEN
        UPDATE leave.employee_leave el
        SET leave_status = 'APPROVED',
            action_by_official_id = p_official_id,
            action_date = CURRENT_TIMESTAMP,
            rejection_reason = NULL
        WHERE el.leave_id = p_leave_id;

        RETURN QUERY SELECT true, 'Leave approved successfully.'::VARCHAR, p_leave_id, 'APPROVED'::VARCHAR;
        RETURN;
    ELSIF v_upper_action = 'REJECT' THEN
        IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
            RETURN QUERY SELECT false, 'Rejection reason is mandatory when rejecting a leave application.'::VARCHAR, p_leave_id, 'APPLIED'::VARCHAR;
            RETURN;
        END IF;

        UPDATE leave.employee_leave el
        SET leave_status = 'REJECTED',
            action_by_official_id = p_official_id,
            action_date = CURRENT_TIMESTAMP,
            rejection_reason = trim(p_rejection_reason)
        WHERE el.leave_id = p_leave_id;

        RETURN QUERY SELECT true, 'Leave rejected with reason recorded.'::VARCHAR, p_leave_id, 'REJECTED'::VARCHAR;
        RETURN;
    ELSE
        RETURN QUERY SELECT false, 'Invalid action specified. Must be APPROVE or REJECT.'::VARCHAR, p_leave_id, v_current_status;
        RETURN;
    END IF;
END;
$func$;
