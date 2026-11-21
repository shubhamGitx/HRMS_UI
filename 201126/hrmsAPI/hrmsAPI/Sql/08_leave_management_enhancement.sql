-- =========================================================================
-- 08_leave_management_enhancement.sql
-- HRMS Leave Management Module Enhancement:
-- 1. Create master.leave_reason_master and seed standard reasons
-- 2. Add leave_reason_id and leave_reason to leave.employee_leave
-- 3. Add cancellation columns to leave.employee_leave
-- 4. Create leave.employee_leave_balance table for persistent balance tracking
-- 5. Create leave.leave_balance_transaction table for audit debits/credits
-- 6. Initialize balances and populate existing records safely
-- 7. Update leave functions to return reason name and handle status changes
-- =========================================================================

-- 1. Create master.leave_reason_master
CREATE TABLE IF NOT EXISTS master.leave_reason_master (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reason_name VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by INTEGER
);

-- Seed predefined leave reasons safely (idempotent)
INSERT INTO master.leave_reason_master (reason_name, description)
VALUES 
    ('Personal Work', 'Personal domestic or administrative errands'),
    ('Medical / Illness', 'Medical leave due to self-illness or medical appointments'),
    ('Family Emergency', 'Urgent unexpected family emergency'),
    ('Family Function', 'Family wedding, festival, or ceremonial event'),
    ('Marriage', 'Self-marriage or immediate dependent marriage'),
    ('Maternity', 'Statutory maternity leave for childbirth and nursing'),
    ('Paternity', 'Paternity leave for newborn child care'),
    ('Child Care', 'Care for infants, sick child, or school requirements'),
    ('Bereavement', 'Demise of a family member or close relative'),
    ('Religious / Festival', 'Observance of religious rituals and festivals'),
    ('Vacation / Travel', 'Planned annual travel or personal rest'),
    ('Examination / Education', 'Appearing for exams or attending educational training'),
    ('Compensatory Leave', 'Leave against additional official duties performed'),
    ('Other', 'Any other reason not covered above')
ON CONFLICT (reason_name) DO NOTHING;

-- 2. Add leave reason and cancellation columns to leave.employee_leave
ALTER TABLE leave.employee_leave 
    ADD COLUMN IF NOT EXISTS leave_reason_id INTEGER REFERENCES master.leave_reason_master(id),
    ADD COLUMN IF NOT EXISTS leave_reason INTEGER REFERENCES master.leave_reason_master(id),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by_id BIGINT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Set default status to 'PENDING' for new leave records
ALTER TABLE leave.employee_leave 
    ALTER COLUMN leave_status SET DEFAULT 'PENDING';

-- Safely update any existing rows from 'APPLIED' to 'PENDING'
UPDATE leave.employee_leave 
SET leave_status = 'PENDING' 
WHERE leave_status = 'APPLIED';

-- Backfill leave_reason_id for existing rows based on their text reason or fallback to 1 (Personal Work)
UPDATE leave.employee_leave
SET 
    leave_reason_id = CASE 
        WHEN lower(COALESCE(reason, '')) LIKE '%medic%' OR lower(COALESCE(reason, '')) LIKE '%doctor%' OR lower(COALESCE(reason, '')) LIKE '%fever%' THEN 2
        WHEN lower(COALESCE(reason, '')) LIKE '%family function%' THEN 4
        WHEN lower(COALESCE(reason, '')) LIKE '%family%' OR lower(COALESCE(reason, '')) LIKE '%emergency%' THEN 3
        ELSE 1
    END,
    leave_reason = CASE 
        WHEN lower(COALESCE(reason, '')) LIKE '%medic%' OR lower(COALESCE(reason, '')) LIKE '%doctor%' OR lower(COALESCE(reason, '')) LIKE '%fever%' THEN 2
        WHEN lower(COALESCE(reason, '')) LIKE '%family function%' THEN 4
        WHEN lower(COALESCE(reason, '')) LIKE '%family%' OR lower(COALESCE(reason, '')) LIKE '%emergency%' THEN 3
        ELSE 1
    END
WHERE leave_reason_id IS NULL;

-- 3. Create persistent employee leave balance table
CREATE TABLE IF NOT EXISTS leave.employee_leave_balance (
    balance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee.employee_master(employee_id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    annual_quota NUMERIC(4, 1) NOT NULL DEFAULT 10.0,
    consumed_approved NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    pending_applied NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    current_balance NUMERIC(4, 1) NOT NULL DEFAULT 10.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_leave_bal UNIQUE (employee_id, leave_type_id, financial_year)
);

CREATE INDEX IF NOT EXISTS ix_employee_leave_balance_lookup 
ON leave.employee_leave_balance(employee_id, leave_type_id, financial_year);

-- 4. Create immutable audit transaction ledger
CREATE TABLE IF NOT EXISTS leave.leave_balance_transaction (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee.employee_master(employee_id) ON DELETE CASCADE,
    leave_id BIGINT NOT NULL REFERENCES leave.employee_leave(leave_id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL,
    transaction_type VARCHAR(10) NOT NULL, -- 'DEBIT' or 'CREDIT'
    days NUMERIC(4, 1) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    created_by BIGINT,
    financial_year VARCHAR(10) NOT NULL,
    CONSTRAINT ck_transaction_type CHECK (transaction_type IN ('DEBIT', 'CREDIT'))
);

CREATE INDEX IF NOT EXISTS ix_leave_balance_trans_leave 
ON leave.leave_balance_transaction(leave_id, transaction_type);

CREATE INDEX IF NOT EXISTS ix_leave_balance_trans_emp 
ON leave.leave_balance_transaction(employee_id, financial_year);

-- 5. Seed / Synchronize Leave Balances for existing employees
DO $$
DECLARE
    v_fy VARCHAR(10);
    v_rec RECORD;
    v_approved NUMERIC;
    v_pending NUMERIC;
    v_current_bal NUMERIC;
BEGIN
    IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
        v_fy := EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text;
    ELSE
        v_fy := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::text || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::text;
    END IF;

    FOR v_rec IN 
        SELECT e.employee_id, m.leave_type_id
        FROM employee.employee_master e
        CROSS JOIN master.leave_types m
        WHERE m.lang_code = 1
    LOOP
        -- Calculate approved & pending for this employee & leave type in current FY
        SELECT 
            COALESCE(SUM(CASE WHEN l.leave_status = 'APPROVED' THEN l.total_days ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN l.leave_status IN ('PENDING', 'APPLIED') THEN l.total_days ELSE 0 END), 0)
        INTO v_approved, v_pending
        FROM leave.employee_leave l
        WHERE l.employee_id = v_rec.employee_id
          AND l.leave_type_id = v_rec.leave_type_id
          AND l.financial_year = v_fy
          AND l.leave_status IN ('APPROVED', 'PENDING', 'APPLIED');

        -- Under immediate deduction, current balance is 10 - approved - pending
        v_current_bal := GREATEST(0.0, 10.0 - (v_approved + v_pending));

        INSERT INTO leave.employee_leave_balance (
            employee_id,
            leave_type_id,
            financial_year,
            annual_quota,
            consumed_approved,
            pending_applied,
            current_balance
        )
        VALUES (
            v_rec.employee_id,
            v_rec.leave_type_id,
            v_fy,
            10.0,
            v_approved,
            v_pending,
            v_current_bal
        )
        ON CONFLICT (employee_id, leave_type_id, financial_year) 
        DO UPDATE SET
            consumed_approved = EXCLUDED.consumed_approved,
            pending_applied = EXCLUDED.pending_applied,
            current_balance = EXCLUDED.current_balance,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
END;
$$;

-- Populate initial DEBIT audit entries for existing active applications if not present
INSERT INTO leave.leave_balance_transaction (
    employee_id,
    leave_id,
    leave_type_id,
    transaction_type,
    days,
    transaction_date,
    remarks,
    created_by,
    financial_year
)
SELECT 
    l.employee_id,
    l.leave_id,
    l.leave_type_id,
    'DEBIT',
    l.total_days,
    l.applied_date,
    'Initial balance deduction on leave application',
    l.employee_id,
    l.financial_year
FROM leave.employee_leave l
WHERE l.leave_status IN ('PENDING', 'APPLIED', 'APPROVED')
  AND NOT EXISTS (
      SELECT 1 FROM leave.leave_balance_transaction t 
      WHERE t.leave_id = l.leave_id AND t.transaction_type = 'DEBIT'
  );

-- 6. Updated Function: Get Employee Leave Balances
-- Returns live balance from employee_leave_balance (with immediate deduction reflected)
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

    -- Ensure balances exist for this employee and FY
    INSERT INTO leave.employee_leave_balance (
        employee_id, leave_type_id, financial_year, annual_quota, consumed_approved, pending_applied, current_balance
    )
    SELECT p_employee_id, m.leave_type_id, v_fy, 10.0, 0.0, 0.0, 10.0
    FROM master.leave_types m
    WHERE m.lang_code = 1
    ON CONFLICT ON CONSTRAINT uq_employee_leave_bal DO NOTHING;

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

-- 7. Updated Function: Get Employee Leaves (Includes reason name from master and cancellation details)
DROP FUNCTION IF EXISTS leave.fn_get_employee_leaves(BIGINT);
CREATE OR REPLACE FUNCTION leave.fn_get_employee_leaves(
    p_employee_id BIGINT
)
RETURNS TABLE (
    leave_id BIGINT,
    leave_type_id BIGINT,
    leave_type_code VARCHAR,
    leave_type_name VARCHAR,
    leave_reason_id INT,
    reason_name VARCHAR,
    from_date DATE,
    to_date DATE,
    total_days NUMERIC,
    financial_year VARCHAR,
    reason TEXT,
    leave_status VARCHAR,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    applied_date TIMESTAMP WITH TIME ZONE,
    action_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $func$
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
        l.cancelled_at
    FROM leave.employee_leave l
    LEFT JOIN master.leave_types m 
        ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN master.leave_reason_master r
        ON r.id = l.leave_reason_id
    WHERE l.employee_id = p_employee_id
    ORDER BY l.applied_date DESC;
$func$;

-- 8. Updated Function: Manager Pending Leaves (With Leave Reason Name)
DROP FUNCTION IF EXISTS leave.fn_get_manager_pending_leaves(BIGINT);
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
    leave_reason_id INT,
    reason_name VARCHAR,
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
        l.applied_date
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
$func$;

-- 9. Updated Function: Manager Subordinates Leave History (With Leave Reason Name & Cancellation details)
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
    leave_reason_id INT,
    reason_name VARCHAR,
    from_date DATE,
    to_date DATE,
    total_days NUMERIC,
    financial_year VARCHAR,
    reason TEXT,
    leave_status VARCHAR,
    rejection_reason TEXT,
    cancellation_reason TEXT,
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
        l.rejection_reason,
        l.cancellation_reason,
        l.applied_date,
        l.action_date,
        om.official_name::VARCHAR AS action_official_name
    FROM leave.employee_leave l
    JOIN employee.employee_master e ON e.employee_id = l.employee_id
    LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
    LEFT JOIN master.office_master off ON off.office_id = e.office_id AND off.lang_code = 1
    LEFT JOIN master.leave_types m ON m.leave_type_id = l.leave_type_id AND m.lang_code = 1
    LEFT JOIN master.leave_reason_master r ON r.id = l.leave_reason_id
    LEFT JOIN official.official_master om ON om.official_id = l.action_by_official_id
    WHERE (
        e.reporting_official_id = p_reporting_official_id
        OR (v_role = 'DADM' AND e.office_id = v_office_id)
    )
      AND (
          p_status IS NULL 
          OR trim(p_status) = '' 
          OR upper(trim(p_status)) = 'ALL' 
          OR (upper(trim(p_status)) = 'PENDING' AND l.leave_status IN ('PENDING', 'APPLIED'))
          OR l.leave_status = upper(trim(p_status))
      )
    ORDER BY COALESCE(l.action_date, l.applied_date) DESC;
END;
$func$;
