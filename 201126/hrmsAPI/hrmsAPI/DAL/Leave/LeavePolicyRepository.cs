using System.Data;
using Dapper;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Leave;

namespace HRMSAPI.DAL.Leave;

public sealed class LeavePolicyRepository(PostgreSqlDataAccess dataAccess) : ILeavePolicyRepository
{
    public async Task<IReadOnlyList<LeavePolicyDto>> GetAllPoliciesAsync(
        long? departmentId,
        long? leaveTypeId,
        bool? isActive,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                p.policy_id AS PolicyId,
                p.leave_type_id AS LeaveTypeId,
                COALESCE(lt.leave_type_code, '') AS LeaveTypeCode,
                COALESCE(lt.leave_type_name, '') AS LeaveTypeName,
                p.department_id AS DepartmentId,
                d.department_code AS DepartmentCode,
                d.department_name AS DepartmentName,
                p.annual_entitlement AS AnnualEntitlement,
                p.max_consecutive_days AS MaxConsecutiveDays,
                p.carry_forward_allowed AS CarryForwardAllowed,
                p.max_carry_forward AS MaxCarryForward,
                p.allow_half_day AS AllowHalfDay,
                p.effective_from AS EffectiveFrom,
                p.effective_to AS EffectiveTo,
                p.is_active AS IsActive,
                p.created_at AS CreatedAt,
                p.updated_at AS UpdatedAt
            FROM leave_mgmt.leave_policy p
            LEFT JOIN master.leave_types lt 
                ON lt.leave_type_id = p.leave_type_id AND lt.lang_code = 1
            LEFT JOIN master.department_master d 
                ON d.department_id = p.department_id AND d.lang_code = 1
            WHERE (@DepartmentId IS NULL OR p.department_id = @DepartmentId OR (@DepartmentId = 0 AND p.department_id IS NULL))
              AND (@LeaveTypeId IS NULL OR p.leave_type_id = @LeaveTypeId)
              AND (@IsActive IS NULL OR p.is_active = @IsActive)
            ORDER BY p.leave_type_id, p.department_id NULLS LAST, p.effective_from DESC;
            """;

        var command = new CommandDefinition(
            sql,
            new { DepartmentId = departmentId, LeaveTypeId = leaveTypeId, IsActive = isActive },
            cancellationToken: cancellationToken);

        var list = await connection.QueryAsync<LeavePolicyDto>(command);
        return list.AsList();
    }

    public async Task<LeavePolicyDto?> GetPolicyByIdAsync(long policyId, CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                p.policy_id AS PolicyId,
                p.leave_type_id AS LeaveTypeId,
                COALESCE(lt.leave_type_code, '') AS LeaveTypeCode,
                COALESCE(lt.leave_type_name, '') AS LeaveTypeName,
                p.department_id AS DepartmentId,
                d.department_code AS DepartmentCode,
                d.department_name AS DepartmentName,
                p.annual_entitlement AS AnnualEntitlement,
                p.max_consecutive_days AS MaxConsecutiveDays,
                p.carry_forward_allowed AS CarryForwardAllowed,
                p.max_carry_forward AS MaxCarryForward,
                p.allow_half_day AS AllowHalfDay,
                p.effective_from AS EffectiveFrom,
                p.effective_to AS EffectiveTo,
                p.is_active AS IsActive,
                p.created_at AS CreatedAt,
                p.updated_at AS UpdatedAt
            FROM leave_mgmt.leave_policy p
            LEFT JOIN master.leave_types lt 
                ON lt.leave_type_id = p.leave_type_id AND lt.lang_code = 1
            LEFT JOIN master.department_master d 
                ON d.department_id = p.department_id AND d.lang_code = 1
            WHERE p.policy_id = @PolicyId;
            """;

        var command = new CommandDefinition(sql, new { PolicyId = policyId }, cancellationToken: cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<LeavePolicyDto>(command);
    }

    public async Task<LeavePolicyDto?> ResolveApplicablePolicyAsync(
        long leaveTypeId,
        long? departmentId,
        DateTime effectiveDate,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                p.policy_id AS PolicyId,
                p.leave_type_id AS LeaveTypeId,
                COALESCE(lt.leave_type_code, '') AS LeaveTypeCode,
                COALESCE(lt.leave_type_name, '') AS LeaveTypeName,
                p.department_id AS DepartmentId,
                d.department_code AS DepartmentCode,
                d.department_name AS DepartmentName,
                p.annual_entitlement AS AnnualEntitlement,
                p.max_consecutive_days AS MaxConsecutiveDays,
                p.carry_forward_allowed AS CarryForwardAllowed,
                p.max_carry_forward AS MaxCarryForward,
                p.allow_half_day AS AllowHalfDay,
                p.effective_from AS EffectiveFrom,
                p.effective_to AS EffectiveTo,
                p.is_active AS IsActive,
                p.created_at AS CreatedAt,
                p.updated_at AS UpdatedAt
            FROM leave_mgmt.leave_policy p
            LEFT JOIN master.leave_types lt 
                ON lt.leave_type_id = p.leave_type_id AND lt.lang_code = 1
            LEFT JOIN master.department_master d 
                ON d.department_id = p.department_id AND d.lang_code = 1
            WHERE p.leave_type_id = @LeaveTypeId
              AND p.is_active = true
              AND p.effective_from <= @EffectiveDate
              AND (p.effective_to IS NULL OR p.effective_to >= @EffectiveDate)
              AND (p.department_id IS NULL OR p.department_id = @DepartmentId);
            """;

        var command = new CommandDefinition(
            sql,
            new { LeaveTypeId = leaveTypeId, DepartmentId = departmentId, EffectiveDate = effectiveDate.Date },
            cancellationToken: cancellationToken);

        var matchingPolicies = (await connection.QueryAsync<LeavePolicyDto>(command)).AsList();

        // 1. Department-specific policies take priority
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            var deptPolicies = matchingPolicies.Where(p => p.DepartmentId == departmentId.Value).ToList();
            if (deptPolicies.Count > 1)
            {
                throw new InvalidOperationException(
                    $"Policy Conflict: Multiple active department-specific policies ({deptPolicies.Count}) are configured for Leave Type {leaveTypeId} and Department {departmentId.Value}.");
            }

            if (deptPolicies.Count == 1)
            {
                return deptPolicies[0];
            }
        }

        // 2. Fall back to organization-wide general policy (where department_id IS NULL)
        var generalPolicies = matchingPolicies.Where(p => !p.DepartmentId.HasValue).ToList();
        if (generalPolicies.Count > 1)
        {
            throw new InvalidOperationException(
                $"Policy Conflict: Multiple active organization-wide policies ({generalPolicies.Count}) are configured for Leave Type {leaveTypeId}.");
        }

        return generalPolicies.FirstOrDefault();
    }

    public async Task<IReadOnlyList<EmployeeLeaveEntitlementDto>> GetEmployeeEntitlementsAsync(
        long employeeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        var targetDate = (asOfDate ?? DateTime.Today).Date;

        // Indian Financial Year (April 1 to March 31)
        var fy = !string.IsNullOrWhiteSpace(financialYear)
            ? financialYear.Trim()
            : targetDate.Month >= 4
                ? $"{targetDate.Year}-{targetDate.Year + 1}"
                : $"{targetDate.Year - 1}-{targetDate.Year}";

        string? prevFy = null;
        var parts = fy.Split('-');
        if (parts.Length == 2 && int.TryParse(parts[0], out var startYear) && int.TryParse(parts[1], out var endYear))
        {
            prevFy = $"{startYear - 1}-{endYear - 1}";
        }

        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        // 1. Get Employee details (department_id, name)
        const string empSql = """
            SELECT e.employee_id, e.department_id, d.department_name
            FROM employee.employee_master e
            LEFT JOIN master.department_master d 
                ON d.department_id = e.department_id AND d.lang_code = 1
            WHERE e.employee_id = @EmployeeId;
            """;

        var emp = await connection.QuerySingleOrDefaultAsync<(long employee_id, long? department_id, string? department_name)?>(
            new CommandDefinition(empSql, new { EmployeeId = employeeId }, cancellationToken: cancellationToken));

        var deptId = emp?.department_id;
        var deptName = emp?.department_name;

        // 2. Get all leave types in English
        const string typesSql = """
            SELECT leave_type_id AS LeaveTypeId, leave_type_code AS LeaveTypeCode, leave_type_name AS LeaveTypeName
            FROM master.leave_types
            WHERE lang_code = 1
            ORDER BY leave_type_id;
            """;

        var leaveTypes = (await connection.QueryAsync<(long LeaveTypeId, string LeaveTypeCode, string LeaveTypeName)>(
            new CommandDefinition(typesSql, cancellationToken: cancellationToken))).ToList();

        // 3. Get employee's approved and pending leave counts in this FY
        const string leaveUsageSql = """
            SELECT 
                leave_type_id,
                COALESCE(SUM(CASE WHEN leave_status = 'APPROVED' THEN total_days ELSE 0 END), 0) AS used_leaves,
                COALESCE(SUM(CASE WHEN leave_status IN ('PENDING', 'APPLIED') THEN total_days ELSE 0 END), 0) AS pending_leaves
            FROM leave.employee_leave
            WHERE employee_id = @EmployeeId
              AND financial_year = @FinancialYear
              AND leave_status IN ('APPROVED', 'PENDING', 'APPLIED')
            GROUP BY leave_type_id;
            """;

        var usageDict = (await connection.QueryAsync<(long leave_type_id, decimal used_leaves, decimal pending_leaves)>(
            new CommandDefinition(leaveUsageSql, new { EmployeeId = employeeId, FinancialYear = fy }, cancellationToken: cancellationToken)))
            .ToDictionary(x => x.leave_type_id, x => (x.used_leaves, x.pending_leaves));

        // 4. Get previous FY balances for carry-forward if applicable
        Dictionary<long, decimal> prevBalDict = [];
        if (!string.IsNullOrWhiteSpace(prevFy))
        {
            const string prevBalSql = """
                SELECT leave_type_id, current_balance
                FROM leave.employee_leave_balance
                WHERE employee_id = @EmployeeId AND financial_year = @PrevFinancialYear;
                """;

            prevBalDict = (await connection.QueryAsync<(long leave_type_id, decimal current_balance)>(
                new CommandDefinition(prevBalSql, new { EmployeeId = employeeId, PrevFinancialYear = prevFy }, cancellationToken: cancellationToken)))
                .ToDictionary(x => x.leave_type_id, x => x.current_balance);
        }

        // 5. Fetch all candidate active policies matching either this dept or general
        const string candidatePoliciesSql = """
            SELECT 
                p.policy_id AS PolicyId,
                p.leave_type_id AS LeaveTypeId,
                COALESCE(lt.leave_type_code, '') AS LeaveTypeCode,
                COALESCE(lt.leave_type_name, '') AS LeaveTypeName,
                p.department_id AS DepartmentId,
                d.department_code AS DepartmentCode,
                d.department_name AS DepartmentName,
                p.annual_entitlement AS AnnualEntitlement,
                p.max_consecutive_days AS MaxConsecutiveDays,
                p.carry_forward_allowed AS CarryForwardAllowed,
                p.max_carry_forward AS MaxCarryForward,
                p.allow_half_day AS AllowHalfDay,
                p.effective_from AS EffectiveFrom,
                p.effective_to AS EffectiveTo,
                p.is_active AS IsActive
            FROM leave_mgmt.leave_policy p
            LEFT JOIN master.leave_types lt 
                ON lt.leave_type_id = p.leave_type_id AND lt.lang_code = 1
            LEFT JOIN master.department_master d 
                ON d.department_id = p.department_id AND d.lang_code = 1
            WHERE p.is_active = true
              AND p.effective_from <= @EffectiveDate
              AND (p.effective_to IS NULL OR p.effective_to >= @EffectiveDate)
              AND (p.department_id IS NULL OR p.department_id = @DepartmentId);
            """;

        var allMatchingPolicies = (await connection.QueryAsync<LeavePolicyDto>(
            new CommandDefinition(
                candidatePoliciesSql,
                new { DepartmentId = deptId, EffectiveDate = targetDate },
                cancellationToken: cancellationToken))).ToList();

        var results = new List<EmployeeLeaveEntitlementDto>();

        foreach (var lt in leaveTypes)
        {
            usageDict.TryGetValue(lt.LeaveTypeId, out var usage);
            var used = usage.used_leaves;
            var pending = usage.pending_leaves;

            var matchingForType = allMatchingPolicies.Where(p => p.LeaveTypeId == lt.LeaveTypeId).ToList();

            var deptPolicies = deptId.HasValue ? matchingForType.Where(p => p.DepartmentId == deptId.Value).ToList() : [];
            var genPolicies = matchingForType.Where(p => !p.DepartmentId.HasValue).ToList();

            LeavePolicyDto? selectedPolicy = null;
            var hasConflict = false;
            string? conflictMsg = null;

            if (deptPolicies.Count > 1)
            {
                hasConflict = true;
                conflictMsg = $"Policy Conflict: {deptPolicies.Count} active department-specific policies configured for {lt.LeaveTypeCode}.";
                selectedPolicy = deptPolicies[0];
            }
            else if (deptPolicies.Count == 1)
            {
                selectedPolicy = deptPolicies[0];
            }
            else if (genPolicies.Count > 1)
            {
                hasConflict = true;
                conflictMsg = $"Policy Conflict: {genPolicies.Count} active general policies configured for {lt.LeaveTypeCode}.";
                selectedPolicy = genPolicies[0];
            }
            else if (genPolicies.Count == 1)
            {
                selectedPolicy = genPolicies[0];
            }

            var annualEntitlement = selectedPolicy?.AnnualEntitlement ?? 10m;
            var maxConsecutive = selectedPolicy?.MaxConsecutiveDays ?? 5;
            var carryForwardAllowed = selectedPolicy?.CarryForwardAllowed ?? false;
            var maxCarryForward = selectedPolicy?.MaxCarryForward ?? 0m;
            var allowHalfDay = selectedPolicy?.AllowHalfDay ?? true;

            decimal eligibleCarryForward = 0m;
            if (carryForwardAllowed && prevBalDict.TryGetValue(lt.LeaveTypeId, out var prevBal) && prevBal > 0m)
            {
                eligibleCarryForward = Math.Min(prevBal, maxCarryForward);
            }

            // Calculation: Available Balance = Annual Entitlement + Eligible Carry Forward - Used (Approved) - Pending
            var availableBalance = Math.Max(0m, annualEntitlement + eligibleCarryForward - used - pending);

            results.Add(new EmployeeLeaveEntitlementDto
            {
                LeaveTypeId = lt.LeaveTypeId,
                LeaveTypeCode = lt.LeaveTypeCode,
                LeaveTypeName = lt.LeaveTypeName,
                AnnualEntitlement = annualEntitlement,
                EligibleCarryForward = eligibleCarryForward,
                UsedLeaves = used,
                PendingLeaves = pending,
                AvailableBalance = availableBalance,
                MaxConsecutiveDays = maxConsecutive,
                CarryForwardAllowed = carryForwardAllowed,
                MaxCarryForward = maxCarryForward,
                AllowHalfDay = allowHalfDay,
                PolicyId = selectedPolicy?.PolicyId,
                DepartmentId = selectedPolicy?.DepartmentId ?? deptId,
                DepartmentName = selectedPolicy?.DepartmentName ?? deptName,
                EffectiveFrom = selectedPolicy?.EffectiveFrom,
                EffectiveTo = selectedPolicy?.EffectiveTo,
                HasPolicyConflict = hasConflict,
                ConflictMessage = conflictMsg
            });
        }

        return results;
    }

    public async Task<EmployeeLeaveEntitlementDto?> GetEmployeeEntitlementByLeaveTypeAsync(
        long employeeId,
        long leaveTypeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        var entitlements = await GetEmployeeEntitlementsAsync(employeeId, asOfDate, financialYear, cancellationToken);
        return entitlements.FirstOrDefault(e => e.LeaveTypeId == leaveTypeId);
    }

    public async Task<long> SavePolicyAsync(
        SaveLeavePolicyRequest request,
        long actionByOfficialId,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        if (request.PolicyId.HasValue && request.PolicyId.Value > 0)
        {
            const string updateSql = """
                UPDATE leave_mgmt.leave_policy
                SET leave_type_id = @LeaveTypeId,
                    department_id = @DepartmentId,
                    annual_entitlement = @AnnualEntitlement,
                    max_consecutive_days = @MaxConsecutiveDays,
                    carry_forward_allowed = @CarryForwardAllowed,
                    max_carry_forward = @MaxCarryForward,
                    allow_half_day = @AllowHalfDay,
                    effective_from = @EffectiveFrom,
                    effective_to = @EffectiveTo,
                    is_active = @IsActive,
                    updated_at = CURRENT_TIMESTAMP
                WHERE policy_id = @PolicyId
                RETURNING policy_id;
                """;

            var command = new CommandDefinition(updateSql, request, cancellationToken: cancellationToken);
            return await connection.ExecuteScalarAsync<long>(command);
        }
        else
        {
            const string insertSql = """
                INSERT INTO leave_mgmt.leave_policy (
                    leave_type_id, department_id, annual_entitlement, max_consecutive_days,
                    carry_forward_allowed, max_carry_forward, allow_half_day,
                    effective_from, effective_to, is_active, created_at, updated_at
                )
                VALUES (
                    @LeaveTypeId, @DepartmentId, @AnnualEntitlement, @MaxConsecutiveDays,
                    @CarryForwardAllowed, @MaxCarryForward, @AllowHalfDay,
                    @EffectiveFrom, @EffectiveTo, @IsActive, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING policy_id;
                """;

            var command = new CommandDefinition(insertSql, request, cancellationToken: cancellationToken);
            return await connection.ExecuteScalarAsync<long>(command);
        }
    }
}
