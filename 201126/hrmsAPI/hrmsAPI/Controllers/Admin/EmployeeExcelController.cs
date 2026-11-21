using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Drawing;
using System.Globalization;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace hrmsAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/employee-excel")]
    public class EmployeeExcelController : ControllerBase
    {
        private readonly string _connectionString;

        public EmployeeExcelController(IConfiguration configuration)
        {
            _connectionString =
                configuration.GetConnectionString("HrmsDatabase")
                ?? throw new InvalidOperationException(
                    "DefaultConnection is missing.");
        }

        // ================= MASTER MODEL =================

        private sealed record MasterItem(
            long Id,
            string Name
        );

        private sealed record OfficeItem(
            long Id,
            string Name,
            long DepartmentId
        );

        // ================= DOWNLOAD EXCEL =================

        [HttpGet("download-format")]
        public async Task<IActionResult> DownloadFormat(
            CancellationToken cancellationToken)
        {
            await using var con =
                new NpgsqlConnection(_connectionString);

            await con.OpenAsync(cancellationToken);

            // ================= LOAD MASTER DATA =================

            async Task<List<MasterItem>> LoadMaster(
                string sql)
            {
                var items = new List<MasterItem>();

                await using var cmd = new NpgsqlCommand(sql, con);

                await using var reader =
                    await cmd.ExecuteReaderAsync(cancellationToken);

                while (await reader.ReadAsync(cancellationToken))
                {
                    items.Add(new MasterItem(
                        reader.GetInt64(0),
                        reader.GetString(1)
                    ));
                }

                return items;
            }

            var genders = await LoadMaster(
                @"SELECT gender_id, gender_name
              FROM master.gender_master
              WHERE lang_code = 1
              ORDER BY gender_name");

            var bloodGroups = await LoadMaster(
                @"SELECT blood_group_id, blood_group_name
              FROM master.blood_group_master
              WHERE lang_code = 1
              ORDER BY blood_group_name");

            var categories = await LoadMaster(
                @"SELECT category_id, category_name
              FROM master.category_master
              WHERE lang_code = 1
              ORDER BY category_name");

            var employmentStatuses = await LoadMaster(
                @"SELECT employment_status_id, employment_status_name
              FROM master.employment_status_master
              WHERE lang_code = 1
              ORDER BY employment_status_name");

            var employeeTypes = await LoadMaster(
                @"SELECT employee_type_id, employee_type_name
              FROM master.employee_type_master
              WHERE lang_code = 1
              ORDER BY employee_type_name");

            var departments = await LoadMaster(
                @"SELECT department_id, department_name
              FROM master.department_master
              WHERE lang_code = 1
                AND is_active = true
              ORDER BY department_name");

            var designations = await LoadMaster(
                @"SELECT designation_id, designation_name
              FROM master.designation_master
              WHERE lang_code = 1
              ORDER BY designation_name");

            var offices = new List<OfficeItem>();

            await using (var cmd = new NpgsqlCommand(
                @"SELECT office_id, office_name, department_id
              FROM master.office_master
              WHERE lang_code = 1
                AND department_id IS NOT NULL
              ORDER BY office_name", con))
            await using (var reader =
                await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    offices.Add(new OfficeItem(
                        reader.GetInt64(0),
                        reader.GetString(1),
                        reader.GetInt64(2)
                    ));
                }
            }

            // ================= CREATE WORKBOOK =================

            using var workbook = new XLWorkbook();

            var sheet = workbook.Worksheets.Add("Employees");

            var masters = workbook.Worksheets.Add("Masters");

            string[] headers =
            {
            "Contract No",
            "Employee Name",
            "Employee Name Hindi",
            "Date of Birth",
            "Gender",
            "Blood Group",
            "Father Name",
            "Mother Name",
            "Category",
            "Joining Date",
            "Employment Status",
            "Employee Type",
            "Department",
            "Office",
            "Designation",
            "ID Name",
            "ID Number",
            "Official Email",
            "Official Mobile",
            "Employee Code"
        };

            for (int i = 0; i < headers.Length; i++)
            {
                sheet.Cell(1, i + 1).Value = headers[i];
            }

            var header = sheet.Range(1, 1, 1, headers.Length);

            header.Style.Font.Bold = true;
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Fill.BackgroundColor = XLColor.DarkBlue;

            sheet.SheetView.FreezeRows(1);

            sheet.Columns(1, headers.Length).Width = 22;

            sheet.Column(2).Width = 30;
            sheet.Column(3).Width = 30;
            sheet.Column(7).Width = 28;
            sheet.Column(8).Width = 28;
            sheet.Column(13).Width = 35;
            sheet.Column(14).Width = 35;
            sheet.Column(15).Width = 30;
            sheet.Column(18).Width = 35;

            // Text columns
            foreach (int column in new[] { 1, 17, 19, 20 })
            {
                sheet.Range(2, column, 501, column)
                    .Style.NumberFormat.Format = "@";
            }

            // Date columns
            foreach (int column in new[] { 4, 10 })
            {
                sheet.Range(2, column, 501, column)
                    .Style.DateFormat.Format = "dd-mm-yyyy";
            }

            // ================= MASTER DROPDOWNS =================

            void AddMasterDropdown(
                string rangeName,
                List<MasterItem> data,
                int masterColumn,
                int excelColumn)
            {
                masters.Cell(1, masterColumn).Value = rangeName;

                int row = 2;

                foreach (var item in data)
                {
                    masters.Cell(row, masterColumn).Value =
                        $"{item.Id} - {item.Name}";

                    row++;
                }

                if (data.Count == 0)
                {
                    masters.Cell(2, masterColumn).Value = "";
                }

                workbook.DefinedNames.Add(
                    rangeName,
                    masters.Range(
                        2,
                        masterColumn,
                        Math.Max(2, row - 1),
                        masterColumn
                    )
                );

                sheet.Range(2, excelColumn, 501, excelColumn)
                    .CreateDataValidation()
                    .List(rangeName);
            }

            AddMasterDropdown(
                "GenderList", genders, 1, 5);

            AddMasterDropdown(
                "BloodGroupList", bloodGroups, 2, 6);

            AddMasterDropdown(
                "CategoryList", categories, 3, 9);

            AddMasterDropdown(
                "EmploymentStatusList", employmentStatuses, 4, 11);

            AddMasterDropdown(
                "EmployeeTypeList", employeeTypes, 5, 12);

            AddMasterDropdown(
                "DepartmentList", departments, 6, 13);

            AddMasterDropdown(
                "DesignationList", designations, 7, 15);

            // ================= DEPARTMENT-WISE OFFICES =================

            int officeColumn = 9;

            foreach (var department in departments)
            {
                string rangeName = "Offices_" + department.Id;

                var departmentOffices = offices
                    .Where(o => o.DepartmentId == department.Id)
                    .ToList();

                masters.Cell(1, officeColumn).Value = rangeName;

                int row = 2;

                foreach (var office in departmentOffices)
                {
                    masters.Cell(row, officeColumn).Value =
                        $"{office.Id} - {office.Name}";

                    row++;
                }

                if (departmentOffices.Count == 0)
                {
                    masters.Cell(2, officeColumn).Value = "";
                }

                workbook.DefinedNames.Add(
                    rangeName,
                    masters.Range(
                        2,
                        officeColumn,
                        Math.Max(2, row - 1),
                        officeColumn
                    )
                );

                officeColumn++;
            }

            // Column M = Department
            // Column N = Office

            sheet.Range("N2:N501")
                .CreateDataValidation()
                .List(
                    "IFERROR(INDIRECT(\"Offices_\"&LEFT(M2,FIND(\" - \",M2)-1)),\"\")"
                );

            // ================= FINAL SETTINGS =================

            masters.Visibility = XLWorksheetVisibility.VeryHidden;

            sheet.Range("A1:T1").SetAutoFilter();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Employee_Bulk_Upload_Template.xlsx"
            );
        }








        //=======================================

        [HttpPost("upload-format")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<IActionResult> UploadFormat(
            IFormFile file,
            CancellationToken cancellationToken)
        {
            // ================= AUTHENTICATION =================

            string? roleClaim = User.FindFirstValue("roleId");

            if (!long.TryParse(roleClaim, out long roleId) || roleId <= 0)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Valid role ID not found in login token."
                });
            }

            // ================= FILE VALIDATION =================

            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Please select an Excel file."
                });
            }

            if (!string.Equals(
                Path.GetExtension(file.FileName),
                ".xlsx",
                StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Only .xlsx files are allowed."
                });
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Maximum Excel file size is 10 MB."
                });
            }

            // ================= OPEN EXCEL =================

            XLWorkbook workbook;

            try
            {
                using var stream = new MemoryStream();

                await file.CopyToAsync(stream, cancellationToken);

                stream.Position = 0;

                workbook = new XLWorkbook(stream);
            }
            catch (Exception ex) when (
                ex is not OperationCanceledException)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or corrupted Excel file."
                });
            }

            using (workbook)
            {
                if (!workbook.TryGetWorksheet("Employees", out var sheet))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Employees worksheet is missing."
                    });
                }

                // ================= CHECK HEADERS =================

                string[] headers =
                {
            "Contract No",
            "Employee Name",
            "Employee Name Hindi",
            "Date of Birth",
            "Gender",
            "Blood Group",
            "Father Name",
            "Mother Name",
            "Category",
            "Joining Date",
            "Employment Status",
            "Employee Type",
            "Department",
            "Office",
            "Designation",
            "ID Name",
            "ID Number",
            "Official Email",
            "Official Mobile",
            "Employee Code"
        };

                for (int col = 1; col <= headers.Length; col++)
                {
                    string actual =
                        sheet.Cell(1, col).GetString().Trim();

                    if (!string.Equals(
                        actual,
                        headers[col - 1],
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message =
                                $"Invalid Excel header in column {col}. " +
                                $"Expected: {headers[col - 1]}"
                        });
                    }
                }

                // ================= HELPER FUNCTIONS =================

                string GetText(int row, int col)
                {
                    return sheet.Cell(row, col).GetString().Trim();
                }

                string? OptionalText(int row, int col)
                {
                    string value = GetText(row, col);

                    return string.IsNullOrWhiteSpace(value)
                        ? null
                        : value;
                }

                long? GetMasterId(int row, int col)
                {
                    string value = GetText(row, col);

                    if (string.IsNullOrWhiteSpace(value))
                        return null;

                    string idText = value.Split(
                        new[] { " - " },
                        2,
                        StringSplitOptions.None)[0].Trim();

                    return long.TryParse(idText, out long id) && id > 0
                        ? id
                        : null;
                }

                DateTime? GetDate(int row, int col)
                {
                    var cell = sheet.Cell(row, col);

                    if (cell.IsEmpty())
                        return null;

                    if (cell.TryGetValue<DateTime>(out var excelDate))
                        return excelDate.Date;

                    string value = cell.GetString().Trim();

                    string[] formats =
                    {
                "dd-MM-yyyy",
                "dd/MM/yyyy",
                "yyyy-MM-dd",
                "dd.MM.yyyy"
            };

                    if (DateTime.TryParseExact(
                        value,
                        formats,
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out var parsedDate))
                    {
                        return parsedDate.Date;
                    }

                    return null;
                }

                bool IsValidLength(string? value, int max)
                {
                    return value == null || value.Length <= max;
                }

                // ================= DATABASE CONNECTION =================

                await using var con =
                    new NpgsqlConnection(_connectionString);

                await con.OpenAsync(cancellationToken);

                async Task<HashSet<long>> LoadIds(string sql)
                {
                    var result = new HashSet<long>();

                    await using var cmd = new NpgsqlCommand(sql, con);

                    await using var reader =
                        await cmd.ExecuteReaderAsync(cancellationToken);

                    while (await reader.ReadAsync(cancellationToken))
                    {
                        result.Add(reader.GetInt64(0));
                    }

                    return result;
                }

                // ================= LOAD MASTER IDS =================

                var genderIds = await LoadIds(
                    @"SELECT gender_id
              FROM master.gender_master
              WHERE lang_code = 1");

                var bloodGroupIds = await LoadIds(
                    @"SELECT blood_group_id
              FROM master.blood_group_master
              WHERE lang_code = 1");

                var categoryIds = await LoadIds(
                    @"SELECT category_id
              FROM master.category_master
              WHERE lang_code = 1");

                var employmentStatusIds = await LoadIds(
                    @"SELECT employment_status_id
              FROM master.employment_status_master
              WHERE lang_code = 1");

                var employeeTypeIds = await LoadIds(
                    @"SELECT employee_type_id
              FROM master.employee_type_master
              WHERE lang_code = 1");

                var departmentIds = await LoadIds(
                    @"SELECT department_id
              FROM master.department_master
              WHERE lang_code = 1
                AND is_active = true");

                var designationIds = await LoadIds(
                    @"SELECT designation_id
              FROM master.designation_master
              WHERE lang_code = 1");

                // Office + Department relationship
                var officeDepartments = new Dictionary<long, long>();

                await using (var cmd = new NpgsqlCommand(
                    @"SELECT office_id, department_id
              FROM master.office_master
              WHERE lang_code = 1
                AND department_id IS NOT NULL", con))
                await using (var reader =
                    await cmd.ExecuteReaderAsync(cancellationToken))
                {
                    while (await reader.ReadAsync(cancellationToken))
                    {
                        officeDepartments[reader.GetInt64(0)] =
                            reader.GetInt64(1);
                    }
                }

                // ================= EXISTING CONTRACTS =================

                var existingContracts = new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

                await using (var cmd = new NpgsqlCommand(
                    "SELECT contract_no FROM employee.employee_master",
                    con))
                await using (var reader =
                    await cmd.ExecuteReaderAsync(cancellationToken))
                {
                    while (await reader.ReadAsync(cancellationToken))
                    {
                        existingContracts.Add(reader.GetString(0));
                    }
                }

                // ================= EMPLOYEE RECORD =================

                var records = new List<(
                    string ContractNo,
                    string EmpName,
                    string? EmpNameHn,
                    DateTime? DateOfBirth,
                    long? GenderId,
                    long? BloodGroupId,
                    string? FatherName,
                    string? MotherName,
                    long? CategoryId,
                    DateTime? JoiningDate,
                    long? EmploymentStatusId,
                    long? EmployeeTypeId,
                    long? DepartmentId,
                    long? OfficeId,
                    long? DesignationId,
                    string? IdName,
                    string? IdNumber,
                    string? OfficialEmail,
                    string? OfficialMobile,
                    string? EmpCode
                )>();

                var errors = new List<string>();

                var uploadedContracts = new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

                int lastRow =
                    sheet.LastRowUsed()?.RowNumber() ?? 1;

                if (lastRow > 501)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Maximum 500 employees are allowed."
                    });
                }

                // ================= READ EXCEL ROWS =================

                for (int row = 2; row <= lastRow; row++)
                {
                    // Skip completely empty rows.
                    if (Enumerable.Range(1, 20)
                        .All(col => string.IsNullOrWhiteSpace(
                            GetText(row, col))))
                    {
                        continue;
                    }

                    var rowErrors = new List<string>();

                    string contractNo = GetText(row, 1);
                    string empName = GetText(row, 2);
                    string? empNameHn = OptionalText(row, 3);

                    DateTime? dob = GetDate(row, 4);

                    long? genderId = GetMasterId(row, 5);
                    long? bloodGroupId = GetMasterId(row, 6);

                    string? fatherName = OptionalText(row, 7);
                    string? motherName = OptionalText(row, 8);

                    long? categoryId = GetMasterId(row, 9);

                    DateTime? joiningDate = GetDate(row, 10);

                    long? employmentStatusId = GetMasterId(row, 11);
                    long? employeeTypeId = GetMasterId(row, 12);
                    long? departmentId = GetMasterId(row, 13);
                    long? officeId = GetMasterId(row, 14);
                    long? designationId = GetMasterId(row, 15);

                    string? idName = OptionalText(row, 16);
                    string? idNumber = OptionalText(row, 17);

                    string? email = OptionalText(row, 18);
                    string? mobile = OptionalText(row, 19);
                    string? empCode = OptionalText(row, 20);

                    // ================= REQUIRED FIELDS =================

                    if (string.IsNullOrWhiteSpace(contractNo))
                        rowErrors.Add("Contract No is required");
                    else if (contractNo.Length > 50)
                        rowErrors.Add("Contract No exceeds 50 characters");

                    if (string.IsNullOrWhiteSpace(empName))
                        rowErrors.Add("Employee Name is required");
                    else if (empName.Length > 150)
                        rowErrors.Add("Employee Name exceeds 150 characters");

                    // ================= DUPLICATE CONTRACT =================

                    if (!string.IsNullOrWhiteSpace(contractNo))
                    {
                        if (!uploadedContracts.Add(contractNo))
                            rowErrors.Add("Duplicate Contract No in Excel");

                        if (existingContracts.Contains(contractNo))
                            rowErrors.Add("Contract No already exists in database");
                    }

                    // ================= DATE VALIDATION =================

                    if (!string.IsNullOrWhiteSpace(GetText(row, 4)) &&
                        dob == null)
                        rowErrors.Add("Invalid Date of Birth");

                    if (!string.IsNullOrWhiteSpace(GetText(row, 10)) &&
                        joiningDate == null)
                        rowErrors.Add("Invalid Joining Date");

                    if (dob.HasValue &&
                        joiningDate.HasValue &&
                        dob.Value >= joiningDate.Value)
                    {
                        rowErrors.Add(
                            "Date of Birth must be before Joining Date");
                    }

                    // ================= MASTER VALIDATION =================

                    void ValidateMaster(
                        int col,
                        long? id,
                        HashSet<long> validIds,
                        string fieldName)
                    {
                        if (!string.IsNullOrWhiteSpace(GetText(row, col)) &&
                            (!id.HasValue || !validIds.Contains(id.Value)))
                        {
                            rowErrors.Add($"Invalid {fieldName}");
                        }
                    }

                    ValidateMaster(5, genderId, genderIds, "Gender");
                    ValidateMaster(6, bloodGroupId, bloodGroupIds, "Blood Group");
                    ValidateMaster(9, categoryId, categoryIds, "Category");
                    ValidateMaster(11, employmentStatusId,
                        employmentStatusIds, "Employment Status");
                    ValidateMaster(12, employeeTypeId,
                        employeeTypeIds, "Employee Type");
                    ValidateMaster(13, departmentId,
                        departmentIds, "Department");
                    ValidateMaster(15, designationId,
                        designationIds, "Designation");

                    // ================= OFFICE VALIDATION =================

                    if (officeId.HasValue)
                    {
                        if (!officeDepartments.TryGetValue(
                            officeId.Value, out long officeDepartmentId))
                        {
                            rowErrors.Add("Invalid Office");
                        }
                        else if (!departmentId.HasValue ||
                                 officeDepartmentId != departmentId.Value)
                        {
                            rowErrors.Add(
                                "Office does not belong to selected Department");
                        }
                    }
                    else if (!string.IsNullOrWhiteSpace(GetText(row, 14)))
                    {
                        rowErrors.Add("Invalid Office");
                    }

                    // ================= TEXT LENGTH VALIDATION =================

                    if (!IsValidLength(empNameHn, 150))
                        rowErrors.Add("Hindi Name exceeds 150 characters");

                    if (!IsValidLength(fatherName, 150))
                        rowErrors.Add("Father Name exceeds 150 characters");

                    if (!IsValidLength(motherName, 150))
                        rowErrors.Add("Mother Name exceeds 150 characters");

                    if (!IsValidLength(idName, 50))
                        rowErrors.Add("ID Name exceeds 50 characters");

                    if (!IsValidLength(idNumber, 100))
                        rowErrors.Add("ID Number exceeds 100 characters");

                    if (!IsValidLength(empCode, 20))
                        rowErrors.Add("Employee Code exceeds 20 characters");

                    // ================= EMAIL VALIDATION =================

                    if (email != null)
                    {
                        if (email.Length > 254 ||
                            !Regex.IsMatch(
                                email,
                                @"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$",
                                RegexOptions.IgnoreCase))
                        {
                            rowErrors.Add("Invalid Official Email");
                        }
                    }

                    // ================= MOBILE VALIDATION =================

                    if (mobile != null)
                    {
                        if (mobile.Length > 15 ||
                            !Regex.IsMatch(mobile, @"^\+?[0-9]{10,14}$"))
                        {
                            rowErrors.Add("Invalid Official Mobile");
                        }
                    }

                    // ================= COLLECT ERRORS =================

                    if (rowErrors.Count > 0)
                    {
                        errors.Add(
                            $"Row {row}: {string.Join("; ", rowErrors)}");

                        continue;
                    }

                    records.Add((
                        contractNo,
                        empName,
                        empNameHn,
                        dob,
                        genderId,
                        bloodGroupId,
                        fatherName,
                        motherName,
                        categoryId,
                        joiningDate,
                        employmentStatusId,
                        employeeTypeId,
                        departmentId,
                        officeId,
                        designationId,
                        idName,
                        idNumber,
                        email,
                        mobile,
                        empCode
                    ));
                }

                // ================= RETURN VALIDATION ERRORS =================

                if (errors.Count > 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message =
                            "Excel validation failed. No employees inserted.",
                        errors
                    });
                }

                if (records.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Excel contains no employee records."
                    });
                }

                // ================= DATABASE TRANSACTION =================

                await using var transaction =
                    await con.BeginTransactionAsync(cancellationToken);

                try
                {
                    const string sql = @"
                INSERT INTO employee.employee_master
                (
                    user_role_id,
                    contract_no,
                    emp_name,
                    emp_name_hn,
                    date_of_birth,
                    gender_id,
                    blood_group_id,
                    father_name,
                    mother_name,
                    category_id,
                    joining_date,
                    employment_status_id,
                    employee_type_id,
                    department_id,
                    office_id,
                    designation_id,
                    reporting_official_id,
                    id_name,
                    id_number,
                    official_email,
                    official_mobile,
                    emp_code,
                    record_status
                )
                VALUES
                (
                    @roleId,
                    @contractNo,
                    @empName,
                    @empNameHn,
                    @dob,
                    @genderId,
                    @bloodGroupId,
                    @fatherName,
                    @motherName,
                    @categoryId,
                    @joiningDate,
                    @employmentStatusId,
                    @employeeTypeId,
                    @departmentId,
                    @officeId,
                    @designationId,
                    NULL,
                    @idName,
                    @idNumber,
                    @email,
                    @mobile,
                    @empCode,
                    'ACTIVE'
                )";

                    foreach (var record in records)
                    {
                        await using var cmd =
                            new NpgsqlCommand(sql, con, transaction);

                        cmd.Parameters.AddWithValue(
                            "roleId", roleId);

                        cmd.Parameters.AddWithValue(
                            "contractNo", record.ContractNo);

                        cmd.Parameters.AddWithValue(
                            "empName", record.EmpName);

                        // Explicit Npgsql types are required for nullable values.
                        void AddText(string name, string? value)
                        {
                            cmd.Parameters.Add(
                                name, NpgsqlTypes.NpgsqlDbType.Varchar
                            ).Value = (object?)value ?? DBNull.Value;
                        }

                        void AddLong(string name, long? value)
                        {
                            cmd.Parameters.Add(
                                name, NpgsqlTypes.NpgsqlDbType.Bigint
                            ).Value = (object?)value ?? DBNull.Value;
                        }

                        void AddDate(string name, DateTime? value)
                        {
                            cmd.Parameters.Add(
                                name, NpgsqlTypes.NpgsqlDbType.Date
                            ).Value = (object?)value?.Date ?? DBNull.Value;
                        }

                        AddText("empNameHn", record.EmpNameHn);
                        AddDate("dob", record.DateOfBirth);
                        AddLong("genderId", record.GenderId);
                        AddLong("bloodGroupId", record.BloodGroupId);
                        AddText("fatherName", record.FatherName);
                        AddText("motherName", record.MotherName);
                        AddLong("categoryId", record.CategoryId);
                        AddDate("joiningDate", record.JoiningDate);
                        AddLong("employmentStatusId",
                            record.EmploymentStatusId);
                        AddLong("employeeTypeId", record.EmployeeTypeId);
                        AddLong("departmentId", record.DepartmentId);
                        AddLong("officeId", record.OfficeId);
                        AddLong("designationId", record.DesignationId);
                        AddText("idName", record.IdName);
                        AddText("idNumber", record.IdNumber);
                        AddText("email", record.OfficialEmail);
                        AddText("mobile", record.OfficialMobile);
                        AddText("empCode", record.EmpCode);

                        await cmd.ExecuteNonQueryAsync(cancellationToken);
                    }

                    await transaction.CommitAsync(cancellationToken);

                    return Ok(new
                    {
                        success = true,
                        message = "Employees uploaded successfully.",
                        insertedCount = records.Count
                    });
                }
                catch (PostgresException ex)
                {
                    await transaction.RollbackAsync(
                        CancellationToken.None);

                    return Conflict(new
                    {
                        success = false,
                        message =
                            "Database rejected the upload. No employees inserted.",
                        databaseErrorCode = ex.SqlState
                    });
                }
                catch (Exception ex) when (
                    ex is not OperationCanceledException)
                {
                    await transaction.RollbackAsync(
                        CancellationToken.None);

                    return StatusCode(500, new
                    {
                        success = false,
                        message =
                            "Employee upload failed. No records inserted."
                    });
                }
            }
        }

    }

}
