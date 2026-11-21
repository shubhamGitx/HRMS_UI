-- =========================================================================
-- 09_leave_policy_management.sql
-- HRMS Database-Driven Leave Policy Management Schema and Synchronization
-- 1. Create schema leave_mgmt if not exists
-- 2. Create table leave_mgmt.leave_policy
-- 3. Seed default organization-wide and department-specific policies
-- 4. Update leave.employee_leave_balance synchronization with leave_policy
-- 5. Update leave.fn_get_employee_leave_balances to dynamically read leave_policy
-- =========================================================================

-- 1. Create schema leave_mgmt
CREATE SCHEMA IF NOT EXISTS leave_mgmt;

-- 2. Create table leave_mgmt.leave_policy
CREATE TABLE IF NOT EXISTS leave_mgmt.leave_policy (
    policy_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leave_type_id BIGINT NOT NULL,
    department_id BIGINT NULL,
    annual_entitlement NUMERIC(4, 1) NOT NULL,
    max_consecutive_days INTEGER NOT NULL,
    carry_forward_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    max_carry_forward NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    allow_half_day BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_policy_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT ck_policy_annual_entitlement CHECK (annual_entitlement >= 0),
    CONSTRAINT ck_policy_max_consecutive CHECK (max_consecutive_days > 0),
    CONSTRAINT ck_policy_max_carry_forward CHECK (max_carry_forward >= 0)
);

CREATE INDEX IF NOT EXISTS ix_leave_policy_lookup 
ON leave_mgmt.leave_policy(leave_type_id, department_id, is_active, effective_from);

-- 3. Seed Standard Default Policies (General Organization-wide policies where department_id IS NULL)
-- CL: 12 days/yr, max 5 consecutive, no c/f, allow half-day
INSERT INTO leave_mgmt.leave_policy (
    leave_type_id, department_id, annual_entitlement, max_consecutive_days, 
    carry_forward_allowed, max_carry_forward, allow_half_day, effective_from, effective_to, is_active
)
SELECT 1, NULL, 12.0, 5, false, 0.0, true, '2026-01-01', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_mgmt.leave_policy 
    WHERE leave_type_id = 1 AND department_id IS NULL AND is_active = true
);

-- EL: 15 days/yr, max 15 consecutive, c/f allowed up to 30 days, no half-day
INSERT INTO leave_mgmt.leave_policy (
    leave_type_id, department_id, annual_entitlement, max_consecutive_days, 
    carry_forward_allowed, max_carry_forward, allow_half_day, effective_from, effective_to, is_active
)
SELECT 2, NULL, 15.0, 15, true, 30.0, false, '2026-01-01', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_mgmt.leave_policy 
    WHERE leave_type_id = 2 AND department_id IS NULL AND is_active = true
);

-- PL: 10 days/yr, max 7 consecutive, no c/f, no half-day
INSERT INTO leave_mgmt.leave_policy (
    leave_type_id, department_id, annual_entitlement, max_consecutive_days, 
    carry_forward_allowed, max_carry_forward, allow_half_day, effective_from, effective_to, is_active
)
SELECT 3, NULL, 10.0, 7, false, 0.0, false, '2026-01-01', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_mgmt.leave_policy 
    WHERE leave_type_id = 3 AND department_id IS NULL AND is_active = true
);

-- SL: 10 days/yr, max 7 consecutive, no c/f, allow half-day
INSERT INTO leave_mgmt.leave_policy (
    leave_type_id, department_id, annual_entitlement, max_consecutive_days, 
    carry_forward_allowed, max_carry_forward, allow_half_day, effective_from, effective_to, is_active
)
SELECT 4, NULL, 10.0, 7, false, 0.0, true, '2026-01-01', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_mgmt.leave_policy 
    WHERE leave_type_id = 4 AND department_id IS NULL AND is_active = true
);

-- Department-specific override example: Department 2 (RCD) has 14 days of Casual Leave
INSERT INTO leave_mgmt.leave_policy (
    leave_type_id, department_id, annual_entitlement, max_consecutive_days, 
    carry_forward_allowed, max_carry_forward, allow_half_day, effective_from, effective_to, is_active
)
SELECT 1, 2, 14.0, 6, true, 5.0, true, '2026-01-01', NULL, true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_mgmt.leave_policy 
    WHERE leave_type_id = 1 AND department_id = 2 AND is_active = true
);

-- 4. Function to resolve effective policy for an employee and leave type
CREATE OR REPLACE FUNCTION leave_mgmt.fn_get_applicable_policy(
    p_leave_type_id BIGINT,
    p_department_id BIGINT DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    policy_id BIGINT,
    leave_type_id BIGINT,
    department_id BIGINT,
    annual_entitlement NUMERIC,
    max_consecutive_days INTEGER,
    carry_forward_allowed BOOLEAN,
    max_carry_forward NUMERIC,
    allow_half_day BOOLEAN,
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN,
    is_department_specific BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
    v_eff_date DATE := COALESCE(p_effective_date, CURRENT_DATE);
    v_dept_count INTEGER := 0;
    v_gen_count INTEGER := 0;
BEGIN
    -- Check for department-specific policy count if department is provided
    IF p_department_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_dept_count
        FROM leave_mgmt.leave_policy p
        WHERE p.leave_type_id = p_leave_type_id
          AND p.department_id = p_department_id
          AND p.is_active = true
          AND p.effective_from <= v_eff_date
          AND (p.effective_to IS NULL OR p.effective_to >= v_eff_date);
    END IF;

    -- If department-specific policy exists, return it (raising conflict if more than 1)
    IF v_dept_count = 1 THEN
        RETURN QUERY
        SELECT 
            p.policy_id,
            p.leave_type_id,
            p.department_id,
            p.annual_entitlement,
            p.max_consecutive_days,
            p.carry_forward_allowed,
            p.max_carry_forward,
            p.allow_half_day,
            p.effective_from,
            p.effective_to,
            p.is_active,
            true AS is_department_specific
        FROM leave_mgmt.leave_policy p
        WHERE p.leave_type_id = p_leave_type_id
          AND p.department_id = p_department_id
          AND p.is_active = true
          AND p.effective_from <= v_eff_date
          AND (p.effective_to IS NULL OR p.effective_to >= v_eff_date)
        LIMIT 1;
        RETURN;
    ELSIF v_dept_count > 1 THEN
        RAISE EXCEPTION 'Policy conflict: Multiple active department policies exist for leave type % and department %', p_leave_type_id, p_department_id;
    END IF;

    -- Otherwise check organization-wide (general) policies
    SELECT COUNT(*) INTO v_gen_count
    FROM leave_mgmt.leave_policy p
    WHERE p.leave_type_id = p_leave_type_id
      AND p.department_id IS NULL
      AND p.is_active = true
      AND p.effective_from <= v_eff_date
      AND (p.effective_to IS NULL OR p.effective_to >= v_eff_date);

    IF v_gen_count = 1 THEN
        RETURN QUERY
        SELECT 
            p.policy_id,
            p.leave_type_id,
            p.department_id,
            p.annual_entitlement,
            p.max_consecutive_days,
            p.carry_forward_allowed,
            p.max_carry_forward,
            p.allow_half_day,
            p.effective_from,
            p.effective_to,
            p.is_active,
            false AS is_department_specific
        FROM leave_mgmt.leave_policy p
        WHERE p.leave_type_id = p_leave_type_id
          AND p.department_id IS NULL
          AND p.is_active = true
          AND p.effective_from <= v_eff_date
          AND (p.effective_to IS NULL OR p.effective_to >= v_eff_date)
        LIMIT 1;
        RETURN;
    ELSIF v_gen_count > 1 THEN
        RAISE EXCEPTION 'Policy conflict: Multiple active general policies exist for leave type %', p_leave_type_id;
    END IF;

    -- If no policy found, return empty set
    RETURN;
END;
$func$;

-- 5. Updated Function: leave.fn_get_employee_leave_balances
-- Uses leave_mgmt.leave_policy to dynamically allocate and return balances
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
AS $func$
DECLARE
    v_fy VARCHAR(10);
    v_emp_dept BIGINT;
    v_rec RECORD;
    v_entitlement NUMERIC;
    v_cf_allowed BOOLEAN;
    v_max_cf NUMERIC;
    v_prev_fy VARCHAR(10);
    v_prev_bal NUMERIC;
    v_eligible_cf NUMERIC;
    v_total_quota NUMERIC;
BEGIN
    -- Determine Financial Year
    IF p_financial_year IS NOT NULL AND trim(p_financial_year) <> '' THEN
        v_fy := trim(p_financial_year);
    ELSE
        IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
            v_fy := EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text;
        ELSE
            v_fy := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::text || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::text;
        END IF;
    END IF;

    -- Get Employee Department
    SELECT department_id INTO v_emp_dept
    FROM employee.employee_master
    WHERE employee_id = p_employee_id;

    -- Calculate previous Financial Year for carry forward
    BEGIN
        v_prev_fy := (split_part(v_fy, '-', 1)::integer - 1)::text || '-' || split_part(v_fy, '-', 1);
    EXCEPTION WHEN OTHERS THEN
        v_prev_fy := NULL;
    END;

    -- Ensure balances are synchronized for each leave type
    FOR v_rec IN 
        SELECT m.leave_type_id, m.leave_type_code, m.leave_type_name
        FROM master.leave_types m
        WHERE m.lang_code = 1
        ORDER BY m.leave_type_id
    LOOP
        -- Resolve policy entitlement
        v_entitlement := 10.0;
        v_cf_allowed := false;
        v_max_cf := 0.0;
        v_eligible_cf := 0.0;

        SELECT 
            p.annual_entitlement, p.carry_forward_allowed, p.max_carry_forward
        INTO 
            v_entitlement, v_cf_allowed, v_max_cf
        FROM leave_mgmt.fn_get_applicable_policy(v_rec.leave_type_id, v_emp_dept, CURRENT_DATE) p
        LIMIT 1;

        v_entitlement := COALESCE(v_entitlement, 10.0);

        -- Check carry forward from previous financial year if allowed
        IF v_cf_allowed = true AND v_prev_fy IS NOT NULL THEN
            SELECT b.current_balance INTO v_prev_bal
            FROM leave.employee_leave_balance b
            WHERE b.employee_id = p_employee_id
              AND b.leave_type_id = v_rec.leave_type_id
              AND b.financial_year = v_prev_fy;

            IF v_prev_bal IS NOT NULL AND v_prev_bal > 0 THEN
                v_eligible_cf := LEAST(v_prev_bal, COALESCE(v_max_cf, 0.0));
            END IF;
        END IF;

        v_total_quota := v_entitlement + v_eligible_cf;

        -- Upsert into employee_leave_balance
        INSERT INTO leave.employee_leave_balance (
            employee_id, leave_type_id, financial_year, annual_quota, consumed_approved, pending_applied, current_balance
        )
        VALUES (
            p_employee_id, v_rec.leave_type_id, v_fy, v_total_quota, 0.0, 0.0, v_total_quota
        )
        ON CONFLICT ON CONSTRAINT uq_employee_leave_bal DO UPDATE SET
            annual_quota = EXCLUDED.annual_quota,
            current_balance = GREATEST(0.0, EXCLUDED.annual_quota - leave.employee_leave_balance.consumed_approved - leave.employee_leave_balance.pending_applied),
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;

    RETURN QUERY
    SELECT 
        m.leave_type_id,
        m.leave_type_code::VARCHAR,
        m.leave_type_name::VARCHAR,
        COALESCE(b.annual_quota, 10.0)::NUMERIC AS annual_allowed,
        COALESCE(b.consumed_approved, 0.0)::NUMERIC AS consumed_approved,
        COALESCE(b.pending_applied, 0.0)::NUMERIC AS pending_applied,
        COALESCE(b.current_balance, 10.0)::NUMERIC AS balance
    FROM master.leave_types m
    LEFT JOIN leave.employee_leave_balance b 
        ON b.leave_type_id = m.leave_type_id 
       AND b.employee_id = p_employee_id 
       AND b.financial_year = v_fy
    WHERE m.lang_code = 1
    ORDER BY m.leave_type_id;
END;
$func$;
