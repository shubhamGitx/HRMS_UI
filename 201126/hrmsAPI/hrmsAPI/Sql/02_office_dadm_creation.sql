-- 02_office_dadm_creation.sql

-- 1. Ensure department_id exists on master.office_master
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'master' AND table_name = 'office_master' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE master.office_master ADD COLUMN department_id bigint DEFAULT 1;
        UPDATE master.office_master SET department_id = 1 WHERE department_id IS NULL;
    END IF;

    -- Sequence for office_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S' AND n.nspname = 'master' AND c.relname = 'seq_office_id'
    ) THEN
        CREATE SEQUENCE master.seq_office_id START WITH 10;
        PERFORM setval('master.seq_office_id', GREATEST(COALESCE((SELECT MAX(office_id) FROM master.office_master), 1) + 1, 10));
    END IF;
END
$do$;

-- 2. Drop existing function if any
DROP FUNCTION IF EXISTS official.fn_create_department_office_with_dadm;

-- 3. Stored Procedure / Function to create office and immediately provision DADM
CREATE OR REPLACE FUNCTION official.fn_create_department_office_with_dadm(
    p_department_id bigint,
    p_office_name varchar,
    p_office_name_hindi varchar,
    p_admin_name varchar,
    p_admin_phone varchar,
    p_admin_email varchar,
    p_admin_user_id varchar,
    p_admin_password_hash text,
    p_created_by varchar DEFAULT 'SUPERADMIN'
)
RETURNS TABLE (
    success boolean,
    message varchar,
    office_id bigint,
    office_name varchar,
    official_id bigint,
    user_id varchar
)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_office_id bigint;
    v_official_id bigint;
    v_clean_user_id varchar;
    v_role_id bigint := 3; -- DADM (Office Admin)
BEGIN
    -- Validate required fields
    IF p_department_id IS NULL OR p_department_id <= 0 THEN
        RETURN QUERY SELECT false, 'Valid Department ID is required.'::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
        RETURN;
    END IF;

    IF p_office_name IS NULL OR trim(p_office_name) = '' THEN
        RETURN QUERY SELECT false, 'Office name is required.'::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
        RETURN;
    END IF;

    IF p_admin_name IS NULL OR trim(p_admin_name) = '' THEN
        RETURN QUERY SELECT false, 'Office Admin name is required.'::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
        RETURN;
    END IF;

    -- Determine user_id
    IF p_admin_user_id IS NOT NULL AND trim(p_admin_user_id) <> '' THEN
        v_clean_user_id := upper(trim(p_admin_user_id));
    ELSE
        -- Auto-generate based on next office id
        v_clean_user_id := 'DADM_' || lpad((SELECT nextval('master.seq_office_id'))::text, 4, '0');
    END IF;

    -- Check if user_id already exists in official_login
    IF EXISTS (SELECT 1 FROM login.official_login WHERE upper(user_id) = v_clean_user_id) THEN
        RETURN QUERY SELECT false, ('User ID ' || v_clean_user_id || ' is already taken. Please choose another username.')::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
        RETURN;
    END IF;

    -- Check if phone already registered in official_master
    IF p_admin_phone IS NOT NULL AND trim(p_admin_phone) <> '' THEN
        IF EXISTS (SELECT 1 FROM official.official_master WHERE phone = trim(p_admin_phone)) THEN
            RETURN QUERY SELECT false, ('Mobile number ' || p_admin_phone || ' is already registered with another official.')::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
            RETURN;
        END IF;
    END IF;

    -- Check if email already registered in official_master
    IF p_admin_email IS NOT NULL AND trim(p_admin_email) <> '' THEN
        IF EXISTS (SELECT 1 FROM official.official_master WHERE lower(email) = lower(trim(p_admin_email))) THEN
            RETURN QUERY SELECT false, ('Email ' || p_admin_email || ' is already registered with another official.')::varchar, NULL::bigint, NULL::varchar, NULL::bigint, NULL::varchar;
            RETURN;
        END IF;
    END IF;

    -- 1. Generate new Office ID from sequence
    v_office_id := nextval('master.seq_office_id');

    -- Insert English office record (lang_code = 1)
    INSERT INTO master.office_master(office_id, office_name, lang_code, department_id)
    VALUES (v_office_id, trim(p_office_name), 1, p_department_id);

    -- Insert Hindi office record (lang_code = 2) if provided
    IF p_office_name_hindi IS NOT NULL AND trim(p_office_name_hindi) <> '' THEN
        INSERT INTO master.office_master(office_id, office_name, lang_code, department_id)
        VALUES (v_office_id, trim(p_office_name_hindi), 2, p_department_id);
    ELSE
        INSERT INTO master.office_master(office_id, office_name, lang_code, department_id)
        VALUES (v_office_id, trim(p_office_name), 2, p_department_id);
    END IF;

    -- 2. Insert into official.official_master
    INSERT INTO official.official_master (
        user_role_id,
        official_name,
        phone,
        email,
        department_id,
        office_id,
        designation,
        is_active,
        created_date
    )
    VALUES (
        v_role_id,
        trim(p_admin_name),
        NULLIF(trim(p_admin_phone), ''),
        NULLIF(lower(trim(p_admin_email)), ''),
        p_department_id,
        v_office_id,
        'Office Admin',
        true,
        CURRENT_TIMESTAMP
    )
    RETURNING official.official_master.official_id INTO v_official_id;

    -- 3. Insert into login.official_login
    INSERT INTO login.official_login (
        user_id,
        password,
        role_code,
        official_id,
        phone,
        record_status,
        record_created_on,
        record_created_by,
        changed_by
    )
    VALUES (
        v_clean_user_id,
        COALESCE(p_admin_password_hash, '100000.defaultHash.placeHolder'),
        'DADM',
        v_official_id,
        NULLIF(trim(p_admin_phone), ''),
        'A',
        CURRENT_TIMESTAMP,
        p_created_by,
        p_created_by
    );

    -- 4. Return success result
    RETURN QUERY SELECT
        true,
        'Office created and DADM login provisioned successfully.'::varchar,
        v_office_id,
        trim(p_office_name)::varchar,
        v_official_id,
        v_clean_user_id::varchar;

END;
$func$;

-- 4. Function to list all offices of a department with their DADM details
CREATE OR REPLACE FUNCTION official.fn_get_department_offices(p_department_id bigint)
RETURNS TABLE (
    office_id bigint,
    office_name varchar,
    office_name_hindi varchar,
    department_id bigint,
    admin_official_id bigint,
    admin_name varchar,
    admin_phone varchar,
    admin_email varchar,
    admin_user_id varchar,
    total_employees bigint,
    is_active boolean
)
LANGUAGE sql
STABLE
AS $func$
    SELECT 
        o1.office_id,
        o1.office_name,
        COALESCE(o2.office_name, o1.office_name) AS office_name_hindi,
        o1.department_id,
        adm.official_id AS admin_official_id,
        adm.official_name AS admin_name,
        adm.phone AS admin_phone,
        adm.email AS admin_email,
        l.user_id AS admin_user_id,
        (
            SELECT count(*)::bigint 
            FROM employee.employee_master e 
            WHERE e.office_id = o1.office_id
        ) AS total_employees,
        COALESCE(adm.is_active, true) AS is_active
    FROM master.office_master o1
    LEFT JOIN master.office_master o2 
        ON o1.office_id = o2.office_id AND o2.lang_code = 2
    LEFT JOIN official.official_master adm 
        ON adm.office_id = o1.office_id AND adm.user_role_id = 3
    LEFT JOIN login.official_login l 
        ON l.official_id = adm.official_id
    WHERE o1.lang_code = 1
      AND (p_department_id <= 0 OR o1.department_id = p_department_id)
    ORDER BY o1.office_id DESC;
$func$;
