using System.Data;
using System.Text.Json;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Employee;
using Npgsql;

namespace HRMSAPI.DAL.Employee;

public sealed partial class EmployeeRepository
{
    public async Task<EmployeeMastersResponse> GetMastersAsync(long departmentId, short langCode, CancellationToken token)
    {
        async Task<IReadOnlyList<MasterOption>> Load(string table, string id, string name, string? code = null)
        {
            var selectCode = code is null ? "NULL::varchar AS code" : $"{code} AS code";
            var data = await dataAccess.GetDataTableAsync(
                $"SELECT {id} AS id, {name} AS name, {selectCode} FROM master.{table} WHERE lang_code=@lang ORDER BY {name}",
                new Dictionary<string, object?> { ["lang"] = langCode }, token);
            return data.Rows.Cast<DataRow>()
                .Select(row => new MasterOption(Convert.ToInt64(row["id"]), Convert.ToString(row["name"])!, row["code"] is DBNull ? null : Convert.ToString(row["code"])))
                .ToList();
        }

        var reporting = await dataAccess.GetDataTableAsync("""
            SELECT o.official_id, l.user_id, o.official_name, o.designation
            FROM official.official_master o
            INNER JOIN login.official_login l ON l.official_id=o.official_id
            WHERE o.department_id=@department_id AND o.user_role_id=2 AND o.is_active=TRUE
            ORDER BY o.official_name
            """, new Dictionary<string, object?> { ["department_id"] = departmentId }, token);

        return new EmployeeMastersResponse(
            await Load("gender_master", "gender_id", "gender_name"),
            await Load("blood_group_master", "blood_group_id", "blood_group_name"),
            await Load("category_master", "category_id", "category_name"),
            await Load("employment_status_master", "employment_status_id", "employment_status_name"),
            await Load("employee_type_master", "employee_type_id", "employee_type_name"),
            await Load("office_master", "office_id", "office_name"),
            await Load("designation_master", "designation_id", "designation_name"),
            await Load("id_type_master", "id_type_id", "id_type_name", "id_type_code"),
            await Load("state_master", "state_id", "state_name"),
            await Load("district_master", "district_id", "district_name", "state_id::varchar"),
            await Load("qualification_master", "qualification_id", "qualification_name"),
            await Load("bank_master", "bank_id", "bank_name"),
            await Load("document_master", "document_id", "document_name"),
            reporting.Rows.Cast<DataRow>()
                .Select(row => new ReportingOfficerOption(Convert.ToInt64(row["official_id"]), Convert.ToString(row["user_id"])!, Convert.ToString(row["official_name"])!, row["designation"] is DBNull ? null : Convert.ToString(row["designation"])))
                .ToList());
    }

    public async Task<IReadOnlyList<EmployeeListItem>> GetListAsync(long departmentId, long? officeId, string roleCode, short langCode, CancellationToken token)
    {
        var data = await dataAccess.GetDataTableAsync(
            "SELECT * FROM employee.fn_get_employee_list(@p_department_id, @p_office_id, @p_lang_code)",
            new Dictionary<string, object?>
            {
                ["p_department_id"] = departmentId,
                ["p_office_id"] = officeId,
                ["p_lang_code"] = langCode
            }, token);

        return data.Rows.Cast<DataRow>()
            .Select(r => new EmployeeListItem(
                Convert.ToInt64(r["employee_id"]),
                Convert.ToString(r["contract_no"])!,
                Convert.ToString(r["emp_name"])!,
                NullString(r["office_name"]),
                NullString(r["designation_name"]),
                NullString(r["reporting_name"]),
                Convert.ToString(r["record_status"])!,
                NullString(r["official_mobile"]),
                NullString(r["official_email"]),
                Convert.ToInt32(r["completed_sections"])))
            .ToList();
    }

    //risha
    public async Task<EmployeePersonalDetailsResponse?> GetPersonalDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT e.*,
                   g.gender_name,
                   b.blood_group_name,
                   c.category_name,
                   es.employment_status_name,
                   et.employee_type_name,
                   o.office_name,
                   d.designation_name,
                   ro.official_name AS reporting_official_name
            FROM employee.employee_master e
            LEFT JOIN master.gender_master g ON g.gender_id = e.gender_id AND g.lang_code = @lang
            LEFT JOIN master.blood_group_master b ON b.blood_group_id = e.blood_group_id AND b.lang_code = @lang
            LEFT JOIN master.category_master c ON c.category_id = e.category_id AND c.lang_code = @lang
            LEFT JOIN master.employment_status_master es ON es.employment_status_id = e.employment_status_id AND es.lang_code = @lang
            LEFT JOIN master.employee_type_master et ON et.employee_type_id = e.employee_type_id AND et.lang_code = @lang
            LEFT JOIN master.office_master o ON o.office_id = e.office_id AND o.lang_code = @lang
            LEFT JOIN master.designation_master d ON d.designation_id = e.designation_id AND d.lang_code = @lang
            LEFT JOIN official.official_master ro ON ro.official_id = e.reporting_official_id
            WHERE e.employee_id = @id AND (@dept <= 0 OR e.department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId,
                ["lang"] = langCode <= 0 ? (short)1 : langCode
            },
            token);

        if (dt.Rows.Count == 0)
            return null;

        var r = dt.Rows[0];

        var response = new EmployeePersonalDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,

            PersonalDetails = new PersonalDetailsRequest
            {
                EmployeeId = employeeId,
                ContractNo = Convert.ToString(r["contract_no"]),
                EmployeeName = Convert.ToString(r["emp_name"])!,
                EmployeeNameHindi = NullString(r["emp_name_hn"]),
                DateOfBirth = DateOnlyValue(r["date_of_birth"]),
                GenderId = LongValue(r["gender_id"]),
                GenderName = NullString(r["gender_name"]),
                BloodGroupId = LongValue(r["blood_group_id"]),
                BloodGroupName = NullString(r["blood_group_name"]),
                FatherName = NullString(r["father_name"]),
                MotherName = NullString(r["mother_name"]),
                CategoryId = LongValue(r["category_id"]),
                CategoryName = NullString(r["category_name"]),
                JoiningDate = DateOnlyValue(r["joining_date"]),
                EmploymentStatusId = LongValue(r["employment_status_id"]),
                EmploymentStatusName = NullString(r["employment_status_name"]),
                EmployeeTypeId = LongValue(r["employee_type_id"]),
                EmployeeTypeName = NullString(r["employee_type_name"]),
                OfficeId = LongValue(r["office_id"]),
                OfficeName = NullString(r["office_name"]),
                DesignationId = LongValue(r["designation_id"]),
                DesignationName = NullString(r["designation_name"]),
                ReportingOfficialId = LongValue(r["reporting_official_id"]),
                ReportingOfficialName = NullString(r["reporting_official_name"]),
                IdName = NullString(r["id_name"]),
                IdNumber = NullString(r["id_number"]),
                OfficialEmail = NullString(r["official_email"]),
                OfficialMobile = NullString(r["official_mobile"]),
                Photo = NullString(r["photo"])
            }
        };

        return response;
    }

    public async Task<EmployeeAddressDetailsResponse?> GetAddressDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token)
    {
        var employeeDt = await dataAccess.GetDataTableAsync(@"SELECT employee_id, contract_no, record_status,official_email, official_mobile FROM employee.employee_master WHERE employee_id = @id AND (@dept <= 0 OR department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId
            },
            token);

        if (employeeDt.Rows.Count == 0)
            return null;

        var r = employeeDt.Rows[0];

        var addDt = await dataAccess.GetDataTableAsync(@"
            SELECT a.*,
                   s.state_name,
                   d.district_name
            FROM employee.employee_address a
            LEFT JOIN master.state_master s ON s.state_id = a.state_id AND s.lang_code = @lang
            LEFT JOIN master.district_master d ON d.district_id = a.district_id AND d.lang_code = @lang
            WHERE a.employee_id = @id AND a.is_current_add = TRUE
            ORDER BY a.employee_address_id",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["lang"] = langCode <= 0 ? (short)1 : langCode
            },
            token);

        return new EmployeeAddressDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,

            ContactAddress = new ContactAddressRequest
            {
                EmployeeId = employeeId,
                OfficialEmail = NullString(r["official_email"]),
                OfficialMobile = NullString(r["official_mobile"]),

                Addresses = addDt.Rows.Cast<DataRow>()
                    .Select(ar => new AddressItemRequest
                    {
                        AddressType = Convert.ToString(ar["address_type"])!,
                        AddressLine1 = Convert.ToString(ar["address_line1"])!,
                        AddressLine2 = NullString(ar["address_line2"]),
                        Landmark = NullString(ar["landmark"]),
                        StateId = Convert.ToInt64(ar["state_id"]),
                        StateName = NullString(ar["state_name"]),
                        DistrictId = Convert.ToInt64(ar["district_id"]),
                        DistrictName = NullString(ar["district_name"]),
                        CityName = Convert.ToString(ar["city_name"])!,
                        Pincode = Convert.ToString(ar["pincode"])!.Trim(),
                        AlternateMobile = NullString(ar["alternate_mobile"])
                    })
                    .ToList()
            }
        };
    }

    public async Task<EmployeeQualificationDetailsResponse?> GetQualificationDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token)
    {
        var employeeDt = await dataAccess.GetDataTableAsync(
            @"SELECT employee_id, contract_no, record_status
       FROM employee.employee_master
       WHERE employee_id = @id
         AND (@dept <= 0 OR department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId
            },
            token);

        if (employeeDt.Rows.Count == 0)
            return null;

        var r = employeeDt.Rows[0];

        var qualDt = await dataAccess.GetDataTableAsync(
            @"SELECT q.*,
                     qm.qualification_name
       FROM employee.emp_qualification q
       LEFT JOIN master.qualification_master qm ON qm.qualification_id = q.qualification_id AND qm.lang_code = @lang
       WHERE q.employee_id = @id
       ORDER BY q.employee_qualification_id",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["lang"] = langCode <= 0 ? (short)1 : langCode
            },
            token);


        var expDt = await dataAccess.GetDataTableAsync(
            @"SELECT *
       FROM employee.employee_work_experience
       WHERE employee_id = @id
         AND is_active = TRUE
       ORDER BY work_experience_id",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId
            },
            token);

        var response = new EmployeeQualificationDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,

            QualificationExperience = new QualificationExperienceRequest
            {
                EmployeeId = employeeId,

                Qualifications = qualDt.Rows.Cast<DataRow>()
                    .Select(qr => new QualificationItemRequest
                    {
                        QualificationId = Convert.ToInt64(qr["qualification_id"]),
                        QualificationName = NullString(qr["qualification_name"]),
                        InstitutionName = Convert.ToString(qr["institution_name"])!,
                        PassingYear = ShortValue(qr["passing_year"]),
                        RollNumber = NullString(qr["roll_number"]),
                        RegistrationNumber = NullString(qr["registration_number"]),
                        MarksPercentage = DecimalValue(qr["marks_percentage"]),
                        Grade = NullString(qr["grade"]),
                        IsHighestQualification =
                            Convert.ToBoolean(qr["is_highest_qualification"]),
                        DocumentId = LongValue(qr["document_id"])
                    })
                    .ToList(),

                Experiences = expDt.Rows.Cast<DataRow>()
                    .Select(er => new ExperienceItemRequest
                    {
                        Organisation = Convert.ToString(er["organisation"])!,
                        Designation = Convert.ToString(er["designation"])!,
                        FromDate = DateOnlyValue(er["from_date"]),
                        ToDate = DateOnlyValue(er["to_date"]),
                        Responsibilities = NullString(er["responsibilities"])
                    })
                    .ToList()
            }
        };

        return response;
    }
    public async Task<EmployeeBankDetailsResponse?> GetBankDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token)
    {
        var employeeDt = await dataAccess.GetDataTableAsync(
            @"SELECT employee_id, contract_no, record_status
          FROM employee.employee_master
          WHERE employee_id = @id
            AND (@dept <= 0 OR department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId
            },
            token);

        if (employeeDt.Rows.Count == 0)
            return null;

        var r = employeeDt.Rows[0];

        var bankDt = await dataAccess.GetDataTableAsync(
            @"SELECT b.bank_id, b.branch_name, b.account_number,
                 b.account_holder_name, ifsc_code,
                 b.account_type, b.bank_document,
                 bm.bank_name
          FROM employee.employee_bank_details b
          LEFT JOIN master.bank_master bm ON bm.bank_id = b.bank_id AND bm.lang_code = @lang
          WHERE b.employee_id = @id
            AND b.is_primary = TRUE
          ORDER BY b.employee_bank_id DESC
          LIMIT 1",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["lang"] = langCode <= 0 ? (short)1 : langCode
            },
            token);

        BankDetailsItemResponse? bankDetails = null;

        if (bankDt.Rows.Count > 0)
        {
            var b = bankDt.Rows[0];

            bankDetails = new BankDetailsItemResponse
            {
                EmployeeId = employeeId,
                BankId = Convert.ToInt64(b["bank_id"]),
                BankName = NullString(b["bank_name"]),
                BranchName = Convert.ToString(b["branch_name"])!,
                AccountNumber = Convert.ToString(b["account_number"])!,
                AccountHolderName =
                    Convert.ToString(b["account_holder_name"])!,
                IfscCode = Convert.ToString(b["ifsc_code"])!.Trim(),
                AccountType = Convert.ToString(b["account_type"])!,
                BankDocument = NullString(b["bank_document"])
            };
        }

        return new EmployeeBankDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,
            BankDetails = bankDetails
        };
    }

    public async Task<EmployeeNomineeDetailsResponse?> GetNomineeDetailsAsync(long employeeId, long departmentId, CancellationToken token)
    {
        var employeeDt = await dataAccess.GetDataTableAsync(
            @"SELECT employee_id, contract_no, record_status
          FROM employee.employee_master
          WHERE employee_id = @id
            AND (@dept <= 0 OR department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId
            },
            token);

        if (employeeDt.Rows.Count == 0)
            return null;

        var r = employeeDt.Rows[0];

        var nomDt = await dataAccess.GetDataTableAsync(
            @"SELECT *
          FROM employee.employee_nominee
          WHERE employee_id = @id
            AND is_active = TRUE
          ORDER BY nominee_id",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId
            },
            token);

        return new EmployeeNomineeDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,

            Nominees = nomDt.Rows.Cast<DataRow>()
                .Select(nr => new NomineeItemResponse
                {
                    NomineeName = Convert.ToString(
                        nr["nominee_name"])!,

                    Relationship = Convert.ToString(
                        nr["relationship"])!,

                    DateOfBirth = DateOnlyValue(
                        nr["date_of_birth"]),

                    SharePercentage = Convert.ToDecimal(
                        nr["share_percentage"]),

                    Address = NullString(nr["address"])
                })
                .ToList()
        };
    }

    public async Task<EmployeeEmergencyDetailsResponse?> GetEmergencyContactDetailsAsync(long employeeId, long departmentId, CancellationToken token)
    {
        var employeeDt = await dataAccess.GetDataTableAsync(
            @"SELECT employee_id, contract_no, record_status
          FROM employee.employee_master
          WHERE employee_id = @id
            AND (@dept <= 0 OR department_id = @dept)",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId,
                ["dept"] = departmentId
            },
            token);

        if (employeeDt.Rows.Count == 0)
            return null;

        var r = employeeDt.Rows[0];

        var emgDt = await dataAccess.GetDataTableAsync(
            @"SELECT *
          FROM employee.employee_emergency_contact
          WHERE employee_id = @id
            AND is_active = TRUE
          ORDER BY emergency_contact_id",
            new Dictionary<string, object?>
            {
                ["id"] = employeeId
            },
            token);

        return new EmployeeEmergencyDetailsResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,

            EmergencyContacts = emgDt.Rows.Cast<DataRow>()
                .Select(emr => new EmergencyContactItemResponse
                {
                    ContactName = Convert.ToString(
                        emr["contact_name"])!,

                    Relationship = Convert.ToString(
                        emr["relationship"])!,

                    Mobile = Convert.ToString(
                        emr["mobile"])!,

                    Address = NullString(emr["address"])
                })
                .ToList()
        };
    }


    //end risha



    public async Task<EmployeeFullProfileResponse?> GetFullProfileAsync(long employeeId, long departmentId, short langCode, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT e.*,
                   g.gender_name,
                   b.blood_group_name,
                   c.category_name,
                   es.employment_status_name,
                   et.employee_type_name,
                   o.office_name,
                   d.designation_name,
                   ro.official_name AS reporting_official_name
            FROM employee.employee_master e
            LEFT JOIN master.gender_master g ON g.gender_id = e.gender_id AND g.lang_code = @lang
            LEFT JOIN master.blood_group_master b ON b.blood_group_id = e.blood_group_id AND b.lang_code = @lang
            LEFT JOIN master.category_master c ON c.category_id = e.category_id AND c.lang_code = @lang
            LEFT JOIN master.employment_status_master es ON es.employment_status_id = e.employment_status_id AND es.lang_code = @lang
            LEFT JOIN master.employee_type_master et ON et.employee_type_id = e.employee_type_id AND et.lang_code = @lang
            LEFT JOIN master.office_master o ON o.office_id = e.office_id AND o.lang_code = @lang
            LEFT JOIN master.designation_master d ON d.designation_id = e.designation_id AND d.lang_code = @lang
            LEFT JOIN official.official_master ro ON ro.official_id = e.reporting_official_id
            WHERE e.employee_id=@id AND (@dept <= 0 OR e.department_id=@dept)",
            new Dictionary<string, object?> { ["id"] = employeeId, ["dept"] = departmentId, ["lang"] = langCode <= 0 ? (short)1 : langCode }, token);

        if (dt.Rows.Count == 0) return null;
        var r = dt.Rows[0];

        var response = new EmployeeFullProfileResponse
        {
            EmployeeId = employeeId,
            ContractNo = Convert.ToString(r["contract_no"])!,
            RecordStatus = Convert.ToString(r["record_status"])!,
            PersonalDetails = new PersonalDetailsRequest
            {
                EmployeeId = employeeId,
                ContractNo = Convert.ToString(r["contract_no"]),
                EmployeeName = Convert.ToString(r["emp_name"])!,
                EmployeeNameHindi = NullString(r["emp_name_hn"]),
                DateOfBirth = DateOnlyValue(r["date_of_birth"]),
                GenderId = LongValue(r["gender_id"]),
                GenderName = NullString(r["gender_name"]),
                BloodGroupId = LongValue(r["blood_group_id"]),
                BloodGroupName = NullString(r["blood_group_name"]),
                FatherName = NullString(r["father_name"]),
                MotherName = NullString(r["mother_name"]),
                CategoryId = LongValue(r["category_id"]),
                CategoryName = NullString(r["category_name"]),
                JoiningDate = DateOnlyValue(r["joining_date"]),
                EmploymentStatusId = LongValue(r["employment_status_id"]),
                EmploymentStatusName = NullString(r["employment_status_name"]),
                EmployeeTypeId = LongValue(r["employee_type_id"]),
                EmployeeTypeName = NullString(r["employee_type_name"]),
                OfficeId = LongValue(r["office_id"]),
                OfficeName = NullString(r["office_name"]),
                DesignationId = LongValue(r["designation_id"]),
                DesignationName = NullString(r["designation_name"]),
                ReportingOfficialId = LongValue(r["reporting_official_id"]),
                ReportingOfficialName = NullString(r["reporting_official_name"]),
                IdName = NullString(r["id_name"]),
                IdNumber = NullString(r["id_number"]),
                OfficialEmail = NullString(r["official_email"]),
                OfficialMobile = NullString(r["official_mobile"]),
                Photo = NullString(r["photo"])
            }
        };

        // Load Addresses
        var addDt = await dataAccess.GetDataTableAsync(@"
            SELECT a.*,
                   s.state_name,
                   d.district_name
            FROM employee.employee_address a
            LEFT JOIN master.state_master s ON s.state_id = a.state_id AND s.lang_code = @lang
            LEFT JOIN master.district_master d ON d.district_id = a.district_id AND d.lang_code = @lang
            WHERE a.employee_id=@id AND a.is_current_add=TRUE
            ORDER BY a.employee_address_id",
            new Dictionary<string, object?> { ["id"] = employeeId, ["lang"] = langCode <= 0 ? (short)1 : langCode }, token);
        response.ContactAddress = new ContactAddressRequest
        {
            EmployeeId = employeeId,
            OfficialEmail = response.PersonalDetails.OfficialEmail,
            OfficialMobile = response.PersonalDetails.OfficialMobile,
            Addresses = addDt.Rows.Cast<DataRow>().Select(ar => new AddressItemRequest
            {
                AddressType = Convert.ToString(ar["address_type"])!,
                AddressLine1 = Convert.ToString(ar["address_line1"])!,
                AddressLine2 = NullString(ar["address_line2"]),
                Landmark = NullString(ar["landmark"]),
                StateId = Convert.ToInt64(ar["state_id"]),
                StateName = NullString(ar["state_name"]),
                DistrictId = Convert.ToInt64(ar["district_id"]),
                DistrictName = NullString(ar["district_name"]),
                CityName = Convert.ToString(ar["city_name"])!,
                Pincode = Convert.ToString(ar["pincode"])!.Trim(),
                AlternateMobile = NullString(ar["alternate_mobile"])
            }).ToList()
        };

        // Load Qualifications & Experiences
        var qualDt = await dataAccess.GetDataTableAsync(@"
            SELECT q.*,
                   qm.qualification_name
            FROM employee.emp_qualification q
            LEFT JOIN master.qualification_master qm ON qm.qualification_id = q.qualification_id AND qm.lang_code = @lang
            WHERE q.employee_id=@id
            ORDER BY q.employee_qualification_id",
            new Dictionary<string, object?> { ["id"] = employeeId, ["lang"] = langCode <= 0 ? (short)1 : langCode }, token);
        var expDt = await dataAccess.GetDataTableAsync(
            "SELECT * FROM employee.employee_work_experience WHERE employee_id=@id AND is_active=TRUE ORDER BY work_experience_id",
            new Dictionary<string, object?> { ["id"] = employeeId }, token);
        response.QualificationExperience = new QualificationExperienceRequest
        {
            EmployeeId = employeeId,
            Qualifications = qualDt.Rows.Cast<DataRow>().Select(qr => new QualificationItemRequest
            {
                QualificationId = Convert.ToInt64(qr["qualification_id"]),
                QualificationName = NullString(qr["qualification_name"]),
                InstitutionName = Convert.ToString(qr["institution_name"])!,
                PassingYear = ShortValue(qr["passing_year"]),
                RollNumber = NullString(qr["roll_number"]),
                RegistrationNumber = NullString(qr["registration_number"]),
                MarksPercentage = DecimalValue(qr["marks_percentage"]),
                Grade = NullString(qr["grade"]),
                IsHighestQualification = Convert.ToBoolean(qr["is_highest_qualification"]),
                DocumentId = LongValue(qr["document_id"])
            }).ToList(),
            Experiences = expDt.Rows.Cast<DataRow>().Select(er => new ExperienceItemRequest
            {
                Organisation = Convert.ToString(er["organisation"])!,
                Designation = Convert.ToString(er["designation"])!,
                FromDate = DateOnlyValue(er["from_date"]),
                ToDate = DateOnlyValue(er["to_date"]),
                Responsibilities = NullString(er["responsibilities"])
            }).ToList()
        };

        // Load Bank
        var bankDt = await dataAccess.GetDataTableAsync(@"
            SELECT b.*,
                   bm.bank_name
            FROM employee.employee_bank_details b
            LEFT JOIN master.bank_master bm ON bm.bank_id = b.bank_id AND bm.lang_code = @lang
            WHERE b.employee_id=@id AND b.is_primary=TRUE
            ORDER BY b.employee_bank_id DESC
            LIMIT 1",
            new Dictionary<string, object?> { ["id"] = employeeId, ["lang"] = langCode <= 0 ? (short)1 : langCode }, token);
        if (bankDt.Rows.Count > 0)
        {
            var br = bankDt.Rows[0];
            response.BankDetails = new BankDetailsRequest
            {
                EmployeeId = employeeId,
                BankId = Convert.ToInt64(br["bank_id"]),
                BankName = NullString(br["bank_name"]),
                BranchName = Convert.ToString(br["branch_name"])!,
                AccountNumber = Convert.ToString(br["account_number"])!,
                AccountHolderName = Convert.ToString(br["account_holder_name"])!,
                IfscCode = Convert.ToString(br["ifsc_code"])!.Trim(),
                AccountType = Convert.ToString(br["account_type"])!,
                BankDocument = NullString(br["bank_document"])
            };
        }

        // Load Nominees & Emergency Contacts
        var nomDt = await dataAccess.GetDataTableAsync(
            "SELECT * FROM employee.employee_nominee WHERE employee_id=@id AND is_active=TRUE ORDER BY nominee_id",
            new Dictionary<string, object?> { ["id"] = employeeId }, token);
        var emgDt = await dataAccess.GetDataTableAsync(
            "SELECT * FROM employee.employee_emergency_contact WHERE employee_id=@id AND is_active=TRUE ORDER BY emergency_contact_id",
            new Dictionary<string, object?> { ["id"] = employeeId }, token);
        response.NomineeEmergency = new NomineeEmergencyRequest
        {
            EmployeeId = employeeId,
            Nominees = nomDt.Rows.Cast<DataRow>().Select(nr => new NomineeItemRequest
            {
                NomineeName = Convert.ToString(nr["nominee_name"])!,
                Relationship = Convert.ToString(nr["relationship"])!,
                DateOfBirth = DateOnlyValue(nr["date_of_birth"]),
                SharePercentage = Convert.ToDecimal(nr["share_percentage"]),
                Address = NullString(nr["address"])
            }).ToList(),
            EmergencyContacts = emgDt.Rows.Cast<DataRow>().Select(emr => new EmergencyContactItemRequest
            {
                ContactName = Convert.ToString(emr["contact_name"])!,
                Relationship = Convert.ToString(emr["relationship"])!,
                Mobile = Convert.ToString(emr["mobile"])!,
                Address = NullString(emr["address"])
            }).ToList()
        };

        return response;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<(long EmployeeId, string ContractNo)> SavePersonalDetailsAsync(
        PersonalDetailsRequest request, long departmentId, long actorId, string? ipAddress, CancellationToken token)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["p_employee_id"] = request.EmployeeId,
            ["p_contract_no"] = request.ContractNo,
            ["p_emp_name"] = request.EmployeeName?.Trim(),
            ["p_emp_name_hn"] = request.EmployeeNameHindi?.Trim(),
            ["p_dob"] = request.DateOfBirth,
            ["p_gender_id"] = request.GenderId,
            ["p_blood_group_id"] = request.BloodGroupId,
            ["p_father_name"] = request.FatherName?.Trim(),
            ["p_mother_name"] = request.MotherName?.Trim(),
            ["p_category_id"] = request.CategoryId,
            ["p_joining_date"] = request.JoiningDate,
            ["p_employment_status_id"] = request.EmploymentStatusId,
            ["p_employee_type_id"] = request.EmployeeTypeId,
            ["p_department_id"] = departmentId,
            ["p_office_id"] = request.OfficeId,
            ["p_designation_id"] = request.DesignationId,
            ["p_reporting_official_id"] = request.ReportingOfficialId,
            ["p_id_name"] = request.IdName?.Trim(),
            ["p_id_number"] = request.IdNumber?.Trim(),
            ["p_official_email"] = request.OfficialEmail?.Trim(),
            ["p_official_mobile"] = request.OfficialMobile?.Trim(),
            ["p_photo"] = request.Photo,
            ["p_actor_id"] = actorId,
            ["p_ip_address"] = ipAddress
        };

        var dt = await dataAccess.GetDataTableAsync("""
            SELECT employee_id, contract_no
            FROM employee.fn_save_personal_details(
                @p_employee_id, @p_contract_no, @p_emp_name, @p_emp_name_hn, @p_dob,
                @p_gender_id, @p_blood_group_id, @p_father_name, @p_mother_name, @p_category_id,
                @p_joining_date, @p_employment_status_id, @p_employee_type_id, @p_department_id,
                @p_office_id, @p_designation_id, @p_reporting_official_id, @p_id_name,
                @p_id_number, @p_official_email, @p_official_mobile, @p_photo,
                @p_actor_id, @p_ip_address
            )
            """, parameters, token);

        if (dt.Rows.Count == 0)
        {
            throw new InvalidOperationException("Failed to save personal details.");
        }

        var row = dt.Rows[0];
        return (Convert.ToInt64(row["employee_id"]), Convert.ToString(row["contract_no"])!);
    }

    public async Task SaveContactAddressAsync(ContactAddressRequest request, long actorId, string? ipAddress, CancellationToken token)
    {
        var addressesJson = JsonSerializer.Serialize(request.Addresses, JsonOptions);

        await dataAccess.ExecuteScalarAsync<bool>("""
            SELECT employee.fn_save_contact_address(
                @p_employee_id,
                @p_official_email,
                @p_official_mobile,
                CAST(@p_addresses_json AS jsonb),
                @p_actor_id,
                @p_ip_address
            )
            """, new Dictionary<string, object?>
        {
            ["p_employee_id"] = request.EmployeeId,
            ["p_official_email"] = request.OfficialEmail?.Trim(),
            ["p_official_mobile"] = request.OfficialMobile?.Trim(),
            ["p_addresses_json"] = addressesJson,
            ["p_actor_id"] = actorId,
            ["p_ip_address"] = ipAddress
        }, token);
    }

    public async Task SaveQualificationExperienceAsync(QualificationExperienceRequest request, long actorId, string? ipAddress, CancellationToken token)
    {
        var qualificationsJson = JsonSerializer.Serialize(request.Qualifications, JsonOptions);
        var experiencesJson = JsonSerializer.Serialize(request.Experiences, JsonOptions);

        await dataAccess.ExecuteScalarAsync<bool>("""
            SELECT employee.fn_save_qualification_experience(
                @p_employee_id,
                CAST(@p_qualifications_json AS jsonb),
                CAST(@p_experiences_json AS jsonb),
                @p_actor_id,
                @p_ip_address
            )
            """, new Dictionary<string, object?>
        {
            ["p_employee_id"] = request.EmployeeId,
            ["p_qualifications_json"] = qualificationsJson,
            ["p_experiences_json"] = experiencesJson,
            ["p_actor_id"] = actorId,
            ["p_ip_address"] = ipAddress
        }, token);
    }

    public async Task SaveBankDetailsAsync(BankDetailsRequest request, long actorId, string? ipAddress, CancellationToken token)
    {
        await dataAccess.ExecuteScalarAsync<bool>("""
            SELECT employee.fn_save_bank_details(
                @p_employee_id,
                @p_bank_id,
                @p_branch_name,
                @p_account_number,
                @p_account_holder_name,
                @p_ifsc_code,
                @p_account_type,
                @p_bank_document,
                @p_actor_id,
                @p_ip_address
            )
            """, new Dictionary<string, object?>
        {
            ["p_employee_id"] = request.EmployeeId,
            ["p_bank_id"] = request.BankId,
            ["p_branch_name"] = request.BranchName?.Trim(),
            ["p_account_number"] = request.AccountNumber?.Trim(),
            ["p_account_holder_name"] = request.AccountHolderName?.Trim(),
            ["p_ifsc_code"] = request.IfscCode?.Trim(),
            ["p_account_type"] = request.AccountType?.Trim(),
            ["p_bank_document"] = request.BankDocument,
            ["p_actor_id"] = actorId,
            ["p_ip_address"] = ipAddress
        }, token);
    }

    public async Task SaveNomineeEmergencyAsync(NomineeEmergencyRequest request, long actorId, string? ipAddress, CancellationToken token)
    {
        var nomineesJson = JsonSerializer.Serialize(request.Nominees, JsonOptions);
        var emergencyJson = JsonSerializer.Serialize(request.EmergencyContacts, JsonOptions);

        await dataAccess.ExecuteScalarAsync<bool>("""
            SELECT employee.fn_save_nominee_emergency(
                @p_employee_id,
                CAST(@p_nominees_json AS jsonb),
                CAST(@p_emergency_json AS jsonb),
                @p_actor_id,
                @p_ip_address
            )
            """, new Dictionary<string, object?>
        {
            ["p_employee_id"] = request.EmployeeId,
            ["p_nominees_json"] = nomineesJson,
            ["p_emergency_json"] = emergencyJson,
            ["p_actor_id"] = actorId,
            ["p_ip_address"] = ipAddress
        }, token);
    }
    public Task<string> FinalSubmitAsync(long employeeId, long departmentId, string currentUserId, long actorId, string? ipAddress, CancellationToken token) =>
        dataAccess.ExecuteInTransactionAsync(async (connection, transaction, ct) =>
        {
            var dt = await dataAccess.GetDataTableAsync(
                "SELECT employee_id, contract_no, office_id, reporting_official_id, record_status, joining_date, employee_type_id FROM employee.employee_master WHERE employee_id=@id AND department_id=@dept",
                new Dictionary<string, object?> { ["id"] = employeeId, ["dept"] = departmentId }, ct);

            if (dt.Rows.Count == 0)
                throw new InvalidOperationException("Employee record not found in your department.");

            var row = dt.Rows[0];
            var contractNo = Convert.ToString(row["contract_no"])!;
            var officeId = row["office_id"] is DBNull ? (long?)null : Convert.ToInt64(row["office_id"]);
            var reportingId = row["reporting_official_id"] is DBNull ? (long?)null : Convert.ToInt64(row["reporting_official_id"]);

            var currentStatus = Convert.ToString(row["record_status"]);
            if (string.Equals(currentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                return contractNo;
            }

            // 1. Activate employee master
            await Execute(connection, transaction, """
                UPDATE employee.employee_master SET
                    record_status = 'ACTIVE',
                    updated_by = @actor,
                    updated_date = CURRENT_TIMESTAMP,
                    ip_address = CAST(@ip AS inet)
                WHERE employee_id = @id
                """, new Dictionary<string, object?>
                {
                    ["id"] = employeeId,
                    ["actor"] = actorId,
                    ["ip"] = ipAddress
                }, ct);

            // 2. Ensure login credentials exist in login.employee_login
            var loginDt = await dataAccess.GetDataTableAsync(
                "SELECT user_id FROM login.employee_login WHERE employee_id = @id OR user_id = @uid",
                new Dictionary<string, object?> { ["id"] = employeeId, ["uid"] = contractNo }, ct);

            if (loginDt.Rows.Count == 0)
            {
                var srno = await NextId(connection, transaction, "login.employee_login", "user_srno", ct);
                var defaultPasswordHash = PasswordUtility.Hash("Test@123");

                await Execute(connection, transaction, """
                    INSERT INTO login.employee_login(
                        user_srno, employee_id, user_id, password, office_cd, supervisor_cd,
                        user_type, user_status, password_status, act_status, record_status,
                        record_created_on, record_created_by, password_change_dt, role_code
                    )
                    VALUES(
                        @srno, @id, @uid, @pwd, @office, @supervisor,
                        1, 'A', 'ACTIVE', 'A', 'A',
                        CURRENT_TIMESTAMP, @createdBy, CURRENT_DATE, 'EMP'
                    )
                    """, new Dictionary<string, object?>
                    {
                        ["srno"] = srno,
                        ["id"] = employeeId,
                        ["uid"] = contractNo,
                        ["pwd"] = defaultPasswordHash,
                        ["office"] = officeId,
                        ["supervisor"] = reportingId?.ToString(),
                        ["createdBy"] = currentUserId
                    }, ct);
            }
            else
            {
                await Execute(connection, transaction, """
                    UPDATE login.employee_login SET
                        user_status = 'A',
                        act_status = 'A',
                        record_status = 'A',
                        record_updated_by = @updater,
                        record_updated_on = CURRENT_TIMESTAMP
                    WHERE employee_id = @id OR user_id = @uid
                    """, new Dictionary<string, object?>
                    {
                        ["id"] = employeeId,
                        ["uid"] = contractNo,
                        ["updater"] = currentUserId
                    }, ct);
            }

            // 3. Ensure contract record exists in employee.employee_contract_details
            var contractDt = await dataAccess.GetDataTableAsync(
                "SELECT contract_id FROM employee.employee_contract_details WHERE employee_id = @id LIMIT 1",
                new Dictionary<string, object?> { ["id"] = employeeId }, ct);

            if (contractDt.Rows.Count == 0)
            {
                var joiningDt = row["joining_date"] == DBNull.Value ? DateTime.Today : Convert.ToDateTime(row["joining_date"]);
                var empTypeVal = row["employee_type_id"] == DBNull.Value ? 1L : Convert.ToInt64(row["employee_type_id"]);
                await Execute(connection, transaction, """
                    INSERT INTO employee.employee_contract_details(
                        employee_id, contract_number, contract_type_id,
                        contract_start_date, contract_end_date, initial_salary,
                        appointing_authority, appointment_order_no, appointment_order_date,
                        contract_status, remarks, created_by, created_date, ip_address
                    )
                    VALUES(
                        @id, @cno, @ctype,
                        @start_date, @end_date, 45000.00,
                        'DADM Administration', 'BRDS/HR/' || @cno, @start_date,
                        'ACTIVE', 'Contract registered at DADM portal',
                        @actor, CURRENT_TIMESTAMP, CAST(NULLIF(@ip, '') AS inet)
                    )
                    """, new Dictionary<string, object?>
                    {
                        ["id"] = employeeId,
                        ["cno"] = contractNo,
                        ["ctype"] = empTypeVal,
                        ["start_date"] = joiningDt,
                        ["end_date"] = joiningDt.AddYears(1),
                        ["actor"] = actorId,
                        ["ip"] = ipAddress
                    }, ct);
            }

            return contractNo;
        }, token);

}
