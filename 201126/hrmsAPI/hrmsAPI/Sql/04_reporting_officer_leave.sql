-- ===================================================
-- 04_reporting_officer_leave.sql
-- Reporting Officer Leave Management APIs & Routines
-- Strict filtering on e.reporting_official_id = p_reporting_official_id
-- ===================================================

-- 1. Strictly filter Pending Leaves for Subordinates of the Reporting Officer
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
        COALESCE(off.office_name, 'Department Office') AS office_name,
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
    WHERE e.reporting_official_id = p_reporting_official_id
      AND l.leave_status = 'APPLIED'
    ORDER BY l.applied_date ASC;
$func$;

-- 2. Function: Get Subordinates Leave History (Approved, Rejected, Applied)
DROP FUNCTION IF EXISTS leave.fn_get_manager_leave_history(BIGINT, VARCHAR);
CREATE OR REPLACE FUNCTION leave.fn_get_manager_leave_history(
    p_reporting_official_id BIGINT,
    p_status VARCHAR DEFAULT NULL
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
    rejection_reason TEXT,
    applied_date TIMESTAMP WITH TIME ZONE,
    action_date TIMESTAMP WITH TIME ZONE,
    action_official_name VARCHAR
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
        COALESCE(off.office_name, 'Department Office') AS office_name,
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
        l.action_date,
        COALESCE(om.official_name, 'Reporting Officer') AS action_official_name
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN master.leave_types m ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN official.official_master om ON om.official_id = l.action_by_official_id
    WHERE e.reporting_official_id = p_reporting_official_id
      AND (p_status IS NULL OR trim(p_status) = '' OR upper(trim(p_status)) = 'ALL' OR l.leave_status = upper(trim(p_status)))
    ORDER BY COALESCE(l.action_date, l.applied_date) DESC;
$func$;

-- 3. Function: Live Stats for Reporting Officer (KPI cards)
DROP FUNCTION IF EXISTS leave.fn_get_manager_leave_stats(BIGINT);
CREATE OR REPLACE FUNCTION leave.fn_get_manager_leave_stats(
    p_reporting_official_id BIGINT
)
RETURNS TABLE (
    pending_approval_count BIGINT,
    sanctioned_this_month_count BIGINT,
    staff_on_leave_today_count BIGINT,
    total_subordinates_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    v_pending BIGINT := 0;
    v_sanctioned_month BIGINT := 0;
    v_on_leave_today BIGINT := 0;
    v_total_subs BIGINT := 0;
BEGIN
    -- Total Subordinates reporting to this official
    SELECT COUNT(*) INTO v_total_subs
    FROM employee.employee_master e
    WHERE e.reporting_official_id = p_reporting_official_id;

    -- Pending Approval
    SELECT COUNT(*) INTO v_pending
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE e.reporting_official_id = p_reporting_official_id
      AND l.leave_status = 'APPLIED';

    -- Sanctioned This Month
    SELECT COUNT(*) INTO v_sanctioned_month
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE e.reporting_official_id = p_reporting_official_id
      AND l.leave_status = 'APPROVED'
      AND (
          l.action_date >= date_trunc('month', CURRENT_DATE)
          OR (l.from_date >= date_trunc('month', CURRENT_DATE)::date AND l.from_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)
      );

    -- Staff on Leave Today
    SELECT COUNT(DISTINCT l.employee_id) INTO v_on_leave_today
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE e.reporting_official_id = p_reporting_official_id
      AND l.leave_status = 'APPROVED'
      AND CURRENT_DATE BETWEEN l.from_date AND l.to_date;

    RETURN QUERY SELECT v_pending, v_sanctioned_month, v_on_leave_today, v_total_subs;
END;
$func$;

-- 4. Function: Live Quota Consumption Report for Reporting Officer
DROP FUNCTION IF EXISTS leave.fn_get_manager_quota_reports(BIGINT, VARCHAR);
CREATE OR REPLACE FUNCTION leave.fn_get_manager_quota_reports(
    p_reporting_official_id BIGINT,
    p_financial_year VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    leave_type_id BIGINT,
    leave_type_code VARCHAR,
    leave_type_name VARCHAR,
    total_sanctioned_days NUMERIC,
    total_allocated_days NUMERIC,
    utilization_percentage NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    v_total_subs BIGINT := 0;
    v_fy VARCHAR(10);
BEGIN
    SELECT COUNT(*) INTO v_total_subs
    FROM employee.employee_master e
    WHERE e.reporting_official_id = p_reporting_official_id;

    IF v_total_subs = 0 THEN
        v_total_subs := 1;
    END IF;

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
        COALESCE(SUM(l.total_days), 0)::NUMERIC AS total_sanctioned_days,
        (v_total_subs * 10)::NUMERIC AS total_allocated_days,
        ROUND((COALESCE(SUM(l.total_days), 0) / (v_total_subs * 10.0)) * 100.0, 1)::NUMERIC AS utilization_percentage
    FROM master.leave_types m
    LEFT JOIN leave.employee_leave l 
        ON l.leave_type_id = m.leave_type_id 
       AND l.leave_status = 'APPROVED'
       AND l.financial_year = v_fy
       AND l.employee_id IN (SELECT e.employee_id FROM employee.employee_master e WHERE e.reporting_official_id = p_reporting_official_id)
    WHERE m.lang_code = 1
    GROUP BY m.leave_type_id, m.leave_type_code, m.leave_type_name
    ORDER BY m.leave_type_id;
END;
$func$;

-- 5. Function: Subordinate Leave Register for Remuneration / Export
DROP FUNCTION IF EXISTS leave.fn_get_manager_subordinate_register(BIGINT, VARCHAR);
CREATE OR REPLACE FUNCTION leave.fn_get_manager_subordinate_register(
    p_reporting_official_id BIGINT,
    p_financial_year VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    employee_id BIGINT,
    emp_name VARCHAR,
    contract_no VARCHAR,
    designation_name VARCHAR,
    office_name VARCHAR,
    cl_days NUMERIC,
    el_days NUMERIC,
    pl_days NUMERIC,
    sl_days NUMERIC,
    total_days NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    v_fy VARCHAR(10);
BEGIN
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
        e.employee_id,
        e.emp_name,
        e.contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff') AS designation_name,
        COALESCE(off.office_name, 'Department Office') AS office_name,
        COALESCE(SUM(CASE WHEN l.leave_type_code = 'CL' THEN l.total_days ELSE 0 END), 0)::NUMERIC AS cl_days,
        COALESCE(SUM(CASE WHEN l.leave_type_code = 'EL' THEN l.total_days ELSE 0 END), 0)::NUMERIC AS el_days,
        COALESCE(SUM(CASE WHEN l.leave_type_code = 'PL' THEN l.total_days ELSE 0 END), 0)::NUMERIC AS pl_days,
        COALESCE(SUM(CASE WHEN l.leave_type_code = 'SL' THEN l.total_days ELSE 0 END), 0)::NUMERIC AS sl_days,
        COALESCE(SUM(l.total_days), 0)::NUMERIC AS total_days
    FROM employee.employee_master e
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN leave.employee_leave l 
        ON l.employee_id = e.employee_id 
       AND l.leave_status = 'APPROVED'
       AND l.financial_year = v_fy
    WHERE e.reporting_official_id = p_reporting_official_id
    GROUP BY e.employee_id, e.emp_name, e.contract_no, desig.designation_name, off.office_name
    ORDER BY e.emp_name ASC;
END;
$func$;

-- 6. Insert additional sample applied leaves for testing if not already present
DO $$
BEGIN
    -- Rahul Sharma (1001) applied leave
    IF NOT EXISTS (SELECT 1 FROM leave.employee_leave WHERE employee_id = 1001) THEN
        INSERT INTO leave.employee_leave (employee_id, leave_type_id, leave_type_code, from_date, to_date, total_days, financial_year, reason, leave_status)
        VALUES (1001, 1, 'CL', CURRENT_DATE + interval '2 days', CURRENT_DATE + interval '4 days', 3.0, '2026-2027', 'Family function at home village', 'APPLIED');
    END IF;

    -- Mr. Bassi (1006) applied leave
    IF NOT EXISTS (SELECT 1 FROM leave.employee_leave WHERE employee_id = 1006) THEN
        INSERT INTO leave.employee_leave (employee_id, leave_type_id, leave_type_code, from_date, to_date, total_days, financial_year, reason, leave_status)
        VALUES (1006, 4, 'SL', CURRENT_DATE + interval '1 day', CURRENT_DATE + interval '2 days', 2.0, '2026-2027', 'Doctor appointment and fever rest', 'APPLIED');
    END IF;

    -- Mr. Aditya (1008) rejected past leave
    IF NOT EXISTS (SELECT 1 FROM leave.employee_leave WHERE employee_id = 1008) THEN
        INSERT INTO leave.employee_leave (employee_id, leave_type_id, leave_type_code, from_date, to_date, total_days, financial_year, reason, leave_status, rejection_reason, action_by_official_id, action_date)
        VALUES (1008, 1, 'CL', CURRENT_DATE - interval '10 days', CURRENT_DATE - interval '8 days', 3.0, '2026-2027', 'Personal domestic work', 'REJECTED', 'Audit in progress; leave not sanctioned during audit week', 1, CURRENT_TIMESTAMP - interval '10 days');
    END IF;
END $$;
