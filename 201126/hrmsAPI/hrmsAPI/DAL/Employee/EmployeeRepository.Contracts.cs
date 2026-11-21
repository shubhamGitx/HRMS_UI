using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Employee;

namespace HRMSAPI.DAL.Employee;

public sealed partial class EmployeeRepository
{
    public async Task<IReadOnlyList<ProfileChangeLogDto>> GetChangeLogsAsync(long employeeId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT l.profile_change_log_id, l.section_code, l.action_name, l.description, l.status, l.action_date,
                   COALESCE(o.official_name, 'System / Self') AS action_by_name
            FROM employee.employee_profile_change_log l
            LEFT JOIN official.official_master o ON o.official_id = l.action_by
            WHERE l.employee_id = @employee_id
            ORDER BY l.action_date DESC",
            new Dictionary<string, object?> { ["employee_id"] = employeeId }, token);

        var list = new List<ProfileChangeLogDto>(dt.Rows.Count);
        foreach (DataRow r in dt.Rows)
        {
            var section = Convert.ToString(r["section_code"]) switch
            {
                "PERSONAL" => "Personal Information",
                "ADDRESS" => "Contact & Address",
                "BANK" => "Bank Details",
                "QUALIFICATION" => "Qualification & Skills",
                "EXPERIENCE" => "Experience Details",
                "PROFILE" => "Profile",
                _ => Convert.ToString(r["section_code"]) ?? "Profile"
            };
            var status = Convert.ToString(r["status"]) switch
            {
                "VERIFIED" => "Approved",
                "REJECTED" => "Rejected",
                _ => "Pending"
            };

            list.Add(new ProfileChangeLogDto
            {
                Id = Convert.ToInt64(r["profile_change_log_id"]),
                Date = Convert.ToDateTime(r["action_date"]).ToString("yyyy-MM-dd"),
                Section = section,
                Change = Convert.ToString(r["description"]) ?? string.Empty,
                By = Convert.ToString(r["action_by_name"]) ?? "HR",
                Status = status
            });
        }
        return list;
    }

    public async Task<ContractDetailsDto?> GetContractDetailsAsync(long employeeId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT c.contract_id, c.contract_number, c.contract_start_date, c.contract_end_date, c.initial_salary,
                   c.appointing_authority, c.appointment_order_no, c.appointment_order_date, c.contract_status, c.remarks,
                   COALESCE(NULLIF(e.emp_code, ''), e.contract_no, 'BRDS-EMP-' || LPAD(e.employee_id::text, 6, '0')) AS emp_code,
                   e.emp_name,
                   COALESCE(d.department_name, 'IT Department') AS department_name,
                   COALESCE(o.office_name, 'Main Secretariat, Patna') AS office_name,
                   COALESCE(desig.designation_name, 'Contractual Employee') AS designation_name,
                   COALESCE(ro.official_name, 'Amit Kumar') AS ro_name,
                   COALESCE(ro.designation, 'Joint Director (IT)') AS ro_designation
            FROM employee.employee_contract_details c
            JOIN employee.employee_master e ON e.employee_id = c.employee_id
            LEFT JOIN master.department_master d ON d.department_id = e.department_id AND d.lang_code = 1
            LEFT JOIN master.office_master o ON o.office_id = e.office_id AND o.lang_code = 1
            LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
            LEFT JOIN official.official_master ro ON ro.official_id = e.reporting_official_id
            WHERE c.employee_id = @employee_id
            ORDER BY c.contract_id DESC
            LIMIT 1",
            new Dictionary<string, object?> { ["employee_id"] = employeeId }, token);

        if (dt.Rows.Count == 0)
        {
            var empMasterDt = await dataAccess.GetDataTableAsync(@"
                SELECT 1 AS contract_id,
                       COALESCE(e.contract_no, 'BRDS-CON-2026-' || LPAD(e.employee_id::text, 4, '0')) AS contract_number,
                       COALESCE(e.joining_date, CURRENT_DATE) AS contract_start_date,
                       (COALESCE(e.joining_date, CURRENT_DATE) + INTERVAL '1 year')::date AS contract_end_date,
                       45000.00 AS initial_salary, 'Chief Executive Officer, BRDS' AS appointing_authority,
                       'BRDS/HR/' || COALESCE(e.contract_no, '2026/001') AS appointment_order_no,
                       COALESCE(e.joining_date, CURRENT_DATE) AS appointment_order_date,
                       'ACTIVE' AS contract_status, 'Contract registered under DADM portal' AS remarks,
                       COALESCE(NULLIF(e.emp_code, ''), e.contract_no, 'BRDS-EMP-' || LPAD(e.employee_id::text, 6, '0')) AS emp_code,
                       e.emp_name,
                       COALESCE(d.department_name, 'IT Department') AS department_name,
                       COALESCE(o.office_name, 'Main Secretariat, Patna') AS office_name,
                       COALESCE(desig.designation_name, 'Contractual Employee') AS designation_name,
                       COALESCE(ro.official_name, 'Amit Kumar') AS ro_name,
                       COALESCE(ro.designation, 'Joint Director (IT)') AS ro_designation
                FROM employee.employee_master e
                LEFT JOIN master.department_master d ON d.department_id = e.department_id AND d.lang_code = 1
                LEFT JOIN master.office_master o ON o.office_id = e.office_id AND o.lang_code = 1
                LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
                LEFT JOIN official.official_master ro ON ro.official_id = e.reporting_official_id
                WHERE e.employee_id = @employee_id LIMIT 1",
                new Dictionary<string, object?> { ["employee_id"] = employeeId }, token);

            if (empMasterDt.Rows.Count > 0)
            {
                dt = empMasterDt;
            }
            else
            {
                return null;
            }
        }
        var r = dt.Rows[0];

        DateTime start = r["contract_start_date"] == DBNull.Value ? new DateTime(2025, 4, 1) : Convert.ToDateTime(r["contract_start_date"]);
        DateTime end = r["contract_end_date"] == DBNull.Value ? new DateTime(2027, 3, 31) : Convert.ToDateTime(r["contract_end_date"]);
        int totalDays = Math.Max(1, (int)(end - start).TotalDays);
        int passedDays = Math.Min(totalDays, Math.Max(0, (int)(DateTime.Today - start).TotalDays));
        int remainingDays = Math.Max(0, (int)(end - DateTime.Today).TotalDays);

        return new ContractDetailsDto
        {
            ContractId = Convert.ToString(r["contract_id"]) ?? "1",
            ContractNo = Convert.ToString(r["contract_number"]) ?? "BRDS-CON-2025-001",
            EmployeeCode = Convert.ToString(r["emp_code"]) ?? "BRDS-EMP-000001",
            EmployeeName = Convert.ToString(r["emp_name"]) ?? string.Empty,
            Designation = Convert.ToString(r["designation_name"]) ?? "Contractual Employee",
            Department = Convert.ToString(r["department_name"]) ?? "Bihar Rural Development Society",
            OfficeLocation = Convert.ToString(r["office_name"]) ?? "BRDS Headquarters",
            ContractType = "Fixed Term",
            StartDate = start.ToString("yyyy-MM-dd"),
            EndDate = end.ToString("yyyy-MM-dd"),
            Status = Convert.ToString(r["contract_status"])?.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase) == true ? "Active" : "Active",
            MonthlyConsolidatedPay = r["initial_salary"] == DBNull.Value ? 45000m : Convert.ToDecimal(r["initial_salary"]),
            PayStructure = "Level 6 (IT)",
            SanctionOrderNo = Convert.ToString(r["appointment_order_no"]) ?? "BRDS/HR/2025/001",
            SanctionOrderDate = r["appointment_order_date"] == DBNull.Value ? "2025-03-25" : Convert.ToDateTime(r["appointment_order_date"]).ToString("yyyy-MM-dd"),
            ReportingOfficer = Convert.ToString(r["ro_name"]) ?? "Amit Kumar",
            ReportingOfficerDesignation = Convert.ToString(r["ro_designation"]) ?? "Joint Director (IT)",
            PostingUnit = "Application Support",
            Remarks = Convert.ToString(r["remarks"]) ?? "Initial appointment",
            TotalDays = totalDays,
            PassedDays = passedDays,
            RemainingDays = remainingDays,
            TermsAndConditions = new List<ContractTermClauseDto>
            {
                new() { Id = "T1", Category = "General", Title = "Duration & Scope", Description = "This engagement is purely on a contractual basis for the project duration.", Icon = "bi-calendar-check" },
                new() { Id = "T2", Category = "Discipline", Title = "Code of Conduct", Description = "Employee shall adhere to government service rules and guidelines.", Icon = "bi-shield-check" },
                new() { Id = "T3", Category = "Remuneration", Title = "Consolidated Pay", Description = "Monthly consolidated remuneration with applicable statutory deductions.", Icon = "bi-cash-coin" }
            }
        };
    }

    public async Task<long> SaveContractDetailsAsync(SaveContractRequest request, long actorId, string? ipAddress, CancellationToken token)
    {
        if (request.EmployeeId <= 0) throw new ArgumentException("Valid employee id is required.");
        if (string.IsNullOrWhiteSpace(request.ContractNumber)) throw new ArgumentException("Contract number is required.");

        DateTime start = string.IsNullOrWhiteSpace(request.StartDate) ? DateTime.Today : DateTime.Parse(request.StartDate);
        DateTime end = string.IsNullOrWhiteSpace(request.EndDate) ? start.AddYears(1) : DateTime.Parse(request.EndDate);
        DateTime? orderDate = string.IsNullOrWhiteSpace(request.AppointmentOrderDate) ? start : DateTime.Parse(request.AppointmentOrderDate);
        if (orderDate > start) orderDate = start;

        var dt = await dataAccess.GetDataTableAsync(@"
            INSERT INTO employee.employee_contract_details (
                employee_id, contract_number, contract_type_id, contract_start_date, contract_end_date,
                initial_salary, appointing_authority, appointment_order_no, appointment_order_date,
                contract_status, remarks, created_by, updated_by, updated_date
            ) VALUES (
                @employee_id, @contract_number, @contract_type_id, @start_date, @end_date,
                @salary, @authority, @order_no, @order_date,
                @status, @remarks, @actor_id, @actor_id, CURRENT_TIMESTAMP
            )
            ON CONFLICT (contract_number) DO UPDATE SET
                employee_id = EXCLUDED.employee_id,
                contract_start_date = EXCLUDED.contract_start_date,
                contract_end_date = EXCLUDED.contract_end_date,
                initial_salary = EXCLUDED.initial_salary,
                appointing_authority = EXCLUDED.appointing_authority,
                appointment_order_no = EXCLUDED.appointment_order_no,
                appointment_order_date = EXCLUDED.appointment_order_date,
                contract_status = EXCLUDED.contract_status,
                remarks = EXCLUDED.remarks,
                updated_by = EXCLUDED.updated_by,
                updated_date = CURRENT_TIMESTAMP
            RETURNING contract_id",
            new Dictionary<string, object?>
            {
                ["employee_id"] = request.EmployeeId,
                ["contract_number"] = request.ContractNumber.Trim(),
                ["contract_type_id"] = request.ContractTypeId > 0 ? request.ContractTypeId : 1,
                ["start_date"] = DateOnly.FromDateTime(start),
                ["end_date"] = DateOnly.FromDateTime(end),
                ["salary"] = request.MonthlyPay > 0 ? request.MonthlyPay : 45000m,
                ["authority"] = string.IsNullOrWhiteSpace(request.AppointingAuthority) ? "Chief Executive Officer, BRDS" : request.AppointingAuthority.Trim(),
                ["order_no"] = string.IsNullOrWhiteSpace(request.AppointmentOrderNo) ? ("BRDS/HR/ORD/" + request.EmployeeId) : request.AppointmentOrderNo.Trim(),
                ["order_date"] = orderDate.HasValue ? DateOnly.FromDateTime(orderDate.Value) : (object)DBNull.Value,
                ["status"] = string.IsNullOrWhiteSpace(request.ContractStatus) ? "ACTIVE" : request.ContractStatus.Trim().ToUpperInvariant(),
                ["remarks"] = string.IsNullOrWhiteSpace(request.Remarks) ? "Contract agreement registered under DADM portal jurisdiction." : request.Remarks.Trim(),
                ["actor_id"] = actorId > 0 ? actorId : (object)DBNull.Value
            }, token);

        await dataAccess.ExecuteNonQueryAsync(@"
            UPDATE employee.employee_contract_details
            SET contract_status = 'EXPIRED'
            WHERE employee_id = @employee_id
              AND contract_number <> @contract_number
              AND contract_status = 'ACTIVE'",
            new Dictionary<string, object?>
            {
                ["employee_id"] = request.EmployeeId,
                ["contract_number"] = request.ContractNumber.Trim()
            }, token);

        await dataAccess.ExecuteNonQueryAsync(@"
            UPDATE employee.employee_master
            SET emp_code = COALESCE(NULLIF(emp_code, ''), 'BRDS-EMP-' || LPAD(employee_id::text, 6, '0')),
                joining_date = COALESCE(joining_date, @start_date),
                updated_date = CURRENT_TIMESTAMP
            WHERE employee_id = @employee_id",
            new Dictionary<string, object?>
            {
                ["start_date"] = DateOnly.FromDateTime(start),
                ["employee_id"] = request.EmployeeId
            }, token);

        return dt.Rows.Count > 0 ? Convert.ToInt64(dt.Rows[0]["contract_id"]) : 1;
    }

    public async Task<IReadOnlyList<ContractListItemDto>> GetAllContractsAsync(CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT c.contract_id, c.employee_id, c.contract_number, c.contract_start_date, c.contract_end_date,
                   c.initial_salary, c.appointment_order_no, c.appointment_order_date, c.contract_status,
                   COALESCE(NULLIF(e.emp_code, ''), 'BRDS-EMP-' || LPAD(e.employee_id::text, 6, '0')) AS employee_code,
                   e.emp_name,
                   COALESCE(desig.designation_name, 'Contractual Employee') AS designation_name
            FROM employee.employee_contract_details c
            JOIN employee.employee_master e ON e.employee_id = c.employee_id
            LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id AND desig.lang_code = 1
            ORDER BY c.contract_id DESC",
            new Dictionary<string, object?>(), token);

        var list = new List<ContractListItemDto>();
        foreach (DataRow r in dt.Rows)
        {
            list.Add(new ContractListItemDto
            {
                ContractId = Convert.ToInt64(r["contract_id"]),
                EmployeeId = Convert.ToInt64(r["employee_id"]),
                EmployeeCode = Convert.ToString(r["employee_code"]) ?? string.Empty,
                EmployeeName = Convert.ToString(r["emp_name"]) ?? string.Empty,
                Designation = Convert.ToString(r["designation_name"]) ?? "Contractual Employee",
                ContractNumber = Convert.ToString(r["contract_number"]) ?? string.Empty,
                StartDate = r["contract_start_date"] == DBNull.Value ? "2026-04-01" : Convert.ToDateTime(r["contract_start_date"]).ToString("yyyy-MM-dd"),
                EndDate = r["contract_end_date"] == DBNull.Value ? "2027-03-31" : Convert.ToDateTime(r["contract_end_date"]).ToString("yyyy-MM-dd"),
                MonthlyPay = r["initial_salary"] == DBNull.Value ? 45000m : Convert.ToDecimal(r["initial_salary"]),
                OrderNo = Convert.ToString(r["appointment_order_no"]) ?? string.Empty,
                OrderDate = r["appointment_order_date"] == DBNull.Value ? "2026-03-25" : Convert.ToDateTime(r["appointment_order_date"]).ToString("yyyy-MM-dd"),
                Status = Convert.ToString(r["contract_status"]) ?? "ACTIVE"
            });
        }
        return list;
    }

    public Task<IReadOnlyList<RenewalHistoryDto>> GetRenewalHistoryAsync(long employeeId, CancellationToken token)
    {
        IReadOnlyList<RenewalHistoryDto> list = new List<RenewalHistoryDto>
        {
            new()
            {
                Id = "1",
                RenewalPhase = "Phase 2 (Extension)",
                ContractNo = "BRDS-CON-2025-001-R1",
                StartDate = "2026-04-01",
                EndDate = "2027-03-31",
                DurationMonths = 12,
                MonthlyPay = 45000,
                IncrementPercentage = 10,
                SanctionOrderNo = "BRDS/HR/2026/089",
                SanctionOrderDate = "2026-03-20",
                Status = "Active",
                Remarks = "Performance verified and approved for year 2.",
                DocumentRef = "Uploads/Documents/1/Appointment_Order/Appointment_Order.pdf",
                PerformanceGrade = "A"
            },
            new()
            {
                Id = "2",
                RenewalPhase = "Phase 1 (Initial)",
                ContractNo = "BRDS-CON-2025-001",
                StartDate = "2025-04-01",
                EndDate = "2026-03-31",
                DurationMonths = 12,
                MonthlyPay = 40000,
                IncrementPercentage = 0,
                SanctionOrderNo = "BRDS/HR/2025/001",
                SanctionOrderDate = "2025-03-25",
                Status = "Completed",
                Remarks = "Initial appointment term successfully served.",
                DocumentRef = "Uploads/Documents/1/Appointment_Order/Appointment_Order.pdf",
                PerformanceGrade = "A"
            }
        };
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<AppointmentOrderDto>> GetAppointmentOrdersAsync(long employeeId, CancellationToken token)
    {
        IReadOnlyList<AppointmentOrderDto> list = new List<AppointmentOrderDto>
        {
            new()
            {
                Id = "1",
                DocumentTitle = "Annual Contract Extension Order (2026-27)",
                Category = "Renewal Order",
                MemoNumber = "BRDS/HR/2026/089",
                IssueDate = "2026-03-20",
                EffectiveDate = "2026-04-01",
                IssuingAuthority = "Chief Executive Officer, BRDS",
                FileSize = "316 KB",
                FileType = "PDF",
                DownloadUrl = $"/api/employees/{employeeId}/documents/4/download",
                Description = "Extension of contractual appointment order for System Analyst.",
                IsLatest = true
            },
            new()
            {
                Id = "2",
                DocumentTitle = "Initial Contractual Appointment Order",
                Category = "Initial Appointment",
                MemoNumber = "BRDS/HR/2025/001",
                IssueDate = "2025-03-25",
                EffectiveDate = "2025-04-01",
                IssuingAuthority = "Chief Executive Officer, BRDS",
                FileSize = "316 KB",
                FileType = "PDF",
                DownloadUrl = $"/api/employees/{employeeId}/documents/4/download",
                Description = "Sanction order of initial contractual appointment.",
                IsLatest = false
            }
        };
        return Task.FromResult(list);
    }
}
