-- =========================================================================
-- 07_improve_leave_management.sql
-- Fixes:
-- 1. Support both Reporting Officer (RPO) and District/Office Admin (DADM).
-- 2. Use India Standard Time (Asia/Kolkata) for accurate daily leave stats.
-- 3. Return NULL for action_official_name when leave has not been actioned.
-- =========================================================================

-- 1. Pending Leaves for Reporting Officer or DADM
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
LANGUAGE plpgsql
STABLE
AS $func$
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
        e.contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff')::VARCHAR AS designation_name,
        COALESCE(off.office_name, 'Department Office')::VARCHAR AS office_name,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code)::VARCHAR AS leave_type_name,
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
    WHERE (
        e.reporting_official_id = p_reporting_official_id
        OR (v_role = 'DADM' AND e.office_id = v_office_id)
    )
      AND l.leave_status = 'APPLIED'
    ORDER BY l.applied_date ASC;
END;
$func$;

-- 2. Subordinate Leave History
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
LANGUAGE plpgsql
STABLE
AS $func$
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
        e.contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff')::VARCHAR AS designation_name,
        COALESCE(off.office_name, 'Department Office')::VARCHAR AS office_name,
        l.leave_type_id,
        l.leave_type_code,
        COALESCE(m.leave_type_name, l.leave_type_code)::VARCHAR AS leave_type_name,
        l.from_date,
        l.to_date,
        l.total_days,
        l.financial_year,
        l.reason,
        l.leave_status,
        l.rejection_reason,
        l.applied_date,
        l.action_date,
        om.official_name::VARCHAR AS action_official_name
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN master.leave_types m ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN official.official_master om ON om.official_id = l.action_by_official_id
    WHERE (
        e.reporting_official_id = p_reporting_official_id
        OR (v_role = 'DADM' AND e.office_id = v_office_id)
    )
      AND (p_status IS NULL OR trim(p_status) = '' OR upper(trim(p_status)) = 'ALL' OR l.leave_status = upper(trim(p_status)))
    ORDER BY COALESCE(l.action_date, l.applied_date) DESC;
END;
$func$;

-- 3. Live Stats with accurate India Standard Time (IST)
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
    v_role VARCHAR(20);
    v_office_id BIGINT;
    v_pending BIGINT := 0;
    v_sanctioned_month BIGINT := 0;
    v_on_leave_today BIGINT := 0;
    v_total_subs BIGINT := 0;
    v_today DATE;
BEGIN
    SELECT COALESCE(l.role_code, ''), COALESCE(o.office_id, 0)
    INTO v_role, v_office_id
    FROM official.official_master o
    LEFT JOIN login.official_login l ON l.official_id = o.official_id
    WHERE o.official_id = p_reporting_official_id
    LIMIT 1;

    -- Local IST Date
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;

    -- Total Subordinates reporting to this official or in DADM office
    SELECT COUNT(*) INTO v_total_subs
    FROM employee.employee_master e
    WHERE e.reporting_official_id = p_reporting_official_id
       OR (v_role = 'DADM' AND e.office_id = v_office_id);

    -- Pending Approval
    SELECT COUNT(*) INTO v_pending
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE (e.reporting_official_id = p_reporting_official_id OR (v_role = 'DADM' AND e.office_id = v_office_id))
      AND l.leave_status = 'APPLIED';

    -- Sanctioned This Month
    SELECT COUNT(*) INTO v_sanctioned_month
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE (e.reporting_official_id = p_reporting_official_id OR (v_role = 'DADM' AND e.office_id = v_office_id))
      AND l.leave_status = 'APPROVED'
      AND (
          l.action_date >= date_trunc('month', v_today)
          OR (l.from_date >= date_trunc('month', v_today)::date AND l.from_date < (date_trunc('month', v_today) + interval '1 month')::date)
      );

    -- Staff on Leave Today (using IST today)
    SELECT COUNT(DISTINCT l.employee_id) INTO v_on_leave_today
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    WHERE (e.reporting_official_id = p_reporting_official_id OR (v_role = 'DADM' AND e.office_id = v_office_id))
      AND l.leave_status = 'APPROVED'
      AND v_today BETWEEN l.from_date AND l.to_date;

    RETURN QUERY SELECT v_pending, v_sanctioned_month, v_on_leave_today, v_total_subs;
END;
$func$;

-- 4. Subordinate Quota Consumption Report
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
    v_role VARCHAR(20);
    v_office_id BIGINT;
    v_total_subs BIGINT := 0;
    v_fy VARCHAR(10);
    v_today DATE;
BEGIN
    SELECT COALESCE(l.role_code, ''), COALESCE(o.office_id, 0)
    INTO v_role, v_office_id
    FROM official.official_master o
    LEFT JOIN login.official_login l ON l.official_id = o.official_id
    WHERE o.official_id = p_reporting_official_id
    LIMIT 1;

    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;

    SELECT COUNT(*) INTO v_total_subs
    FROM employee.employee_master e
    WHERE e.reporting_official_id = p_reporting_official_id
       OR (v_role = 'DADM' AND e.office_id = v_office_id);

    IF v_total_subs = 0 THEN
        v_total_subs := 1;
    END IF;

    IF p_financial_year IS NOT NULL AND trim(p_financial_year) <> '' THEN
        v_fy := trim(p_financial_year);
    ELSE
        IF EXTRACT(MONTH FROM v_today) >= 4 THEN
            v_fy := EXTRACT(YEAR FROM v_today)::text || '-' || (EXTRACT(YEAR FROM v_today) + 1)::text;
        ELSE
            v_fy := (EXTRACT(YEAR FROM v_today) - 1)::text || '-' || EXTRACT(YEAR FROM v_today)::text;
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
       AND l.employee_id IN (
           SELECT e.employee_id 
           FROM employee.employee_master e 
           WHERE e.reporting_official_id = p_reporting_official_id
              OR (v_role = 'DADM' AND e.office_id = v_office_id)
       )
    WHERE m.lang_code = 1
    GROUP BY m.leave_type_id, m.leave_type_code, m.leave_type_name
    ORDER BY m.leave_type_id;
END;
$func$;

-- 5. Subordinate Leave Summary Register
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
    v_role VARCHAR(20);
    v_office_id BIGINT;
    v_fy VARCHAR(10);
    v_today DATE;
BEGIN
    SELECT COALESCE(l.role_code, ''), COALESCE(o.office_id, 0)
    INTO v_role, v_office_id
    FROM official.official_master o
    LEFT JOIN login.official_login l ON l.official_id = o.official_id
    WHERE o.official_id = p_reporting_official_id
    LIMIT 1;

    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;

    IF p_financial_year IS NOT NULL AND trim(p_financial_year) <> '' THEN
        v_fy := trim(p_financial_year);
    ELSE
        IF EXTRACT(MONTH FROM v_today) >= 4 THEN
            v_fy := EXTRACT(YEAR FROM v_today)::text || '-' || (EXTRACT(YEAR FROM v_today) + 1)::text;
        ELSE
            v_fy := (EXTRACT(YEAR FROM v_today) - 1)::text || '-' || EXTRACT(YEAR FROM v_today)::text;
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        e.employee_id,
        e.emp_name,
        COALESCE(e.contract_no, e.emp_code, 'N/A')::VARCHAR AS contract_no,
        COALESCE(desig.designation_name, 'Contractual Staff')::VARCHAR AS designation_name,
        COALESCE(off.office_name, 'Department Office')::VARCHAR AS office_name,
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
       OR (v_role = 'DADM' AND e.office_id = v_office_id)
    GROUP BY e.employee_id, e.emp_name, e.contract_no, e.emp_code, desig.designation_name, off.office_name
    ORDER BY e.emp_name ASC;
END;
$func$;
