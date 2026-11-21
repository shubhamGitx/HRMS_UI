using System.Data;
using Dapper;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Leave;

namespace HRMSAPI.DAL.Leave;

public sealed class LeaveRepository(PostgreSqlDataAccess dataAccess, ILeavePolicyRepository policyRepository) : ILeaveRepository
{
    public async Task<IReadOnlyList<LeaveReasonDto>> GetLeaveReasonsAsync(CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                id AS Id,
                reason_name AS ReasonName,
                description AS Description,
                is_active AS IsActive
            FROM master.leave_reason_master
            WHERE is_active = true
            ORDER BY id;
            """;

        var command = new CommandDefinition(sql, cancellationToken: cancellationToken);
        var results = await connection.QueryAsync<LeaveReasonDto>(command);
        return results.AsList();
    }

    public async Task<LeaveReasonDto?> GetLeaveReasonByIdAsync(int id, CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                id AS Id,
                reason_name AS ReasonName,
                description AS Description,
                is_active AS IsActive
            FROM master.leave_reason_master
            WHERE id = @Id;
            """;

        var command = new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<LeaveReasonDto>(command);
    }

    public async Task<IReadOnlyList<HolidayDto>> GetHolidaysAsync(int? year, CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                holiday_id AS HolidayId,
                holiday_date AS HolidayDate,
                holiday_name AS HolidayName,
                holiday_type AS HolidayType,
                description AS Description
            FROM master.holiday_master
            WHERE is_active = true
              AND (@Year IS NULL OR EXTRACT(YEAR FROM holiday_date) = @Year)
            ORDER BY holiday_date ASC;
            """;

        var list = await connection.QueryAsync<HolidayDto>(new CommandDefinition(
            sql, new { Year = year }, cancellationToken: cancellationToken));

        return list.ToList().AsReadOnly();
    }

    public async Task<ChargeableLeaveBreakdownDto> CalculateChargeableLeaveDaysAsync(
        long employeeId,
        DateTime fromDate,
        DateTime toDate,
        long leaveTypeId,
        bool isHalfDay,
        string fromDayType,
        string? fromHalfSession,
        string toDayType,
        string? toHalfSession,
        CancellationToken cancellationToken)
    {
        var start = fromDate.Date;
        var end = toDate.Date;

        fromDayType = string.Equals(fromDayType, "HALF", StringComparison.OrdinalIgnoreCase) ? "HALF" : "FULL";
        toDayType = string.Equals(toDayType, "HALF", StringComparison.OrdinalIgnoreCase) ? "HALF" : "FULL";

        if (start == end)
        {
            if (isHalfDay || fromDayType == "HALF" || toDayType == "HALF")
            {
                fromDayType = "HALF";
                toDayType = "HALF";
                isHalfDay = true;
            }
        }
        else
        {
            isHalfDay = fromDayType == "HALF" || toDayType == "HALF";
        }

        if (end < start)
        {
            return new ChargeableLeaveBreakdownDto
            {
                IsValid = false,
                ValidationMessage = "To Date cannot be earlier than From Date."
            };
        }

        var totalCalendarDays = (end - start).Days + 1;

        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        // 1. Fetch official holidays in date range
        const string holidaySql = """
            SELECT 
                holiday_id AS HolidayId,
                holiday_date AS HolidayDate,
                holiday_name AS HolidayName,
                holiday_type AS HolidayType,
                description AS Description
            FROM master.holiday_master
            WHERE is_active = true
              AND holiday_date >= @StartDate AND holiday_date <= @EndDate
            ORDER BY holiday_date ASC;
            """;

        var holidaysInRange = (await connection.QueryAsync<HolidayDto>(new CommandDefinition(
            holidaySql,
            new { StartDate = start, EndDate = end },
            cancellationToken: cancellationToken))).ToList();

        var holidayDict = holidaysInRange.ToDictionary(h => h.HolidayDate.Date, h => h);

        var result = new ChargeableLeaveBreakdownDto
        {
            TotalCalendarDays = totalCalendarDays
        };

        // 2. Validate Single Date vs Range boundaries (Holidays and Weekends - Saturday & Sunday)
        if (start == end)
        {
            if (holidayDict.TryGetValue(start, out var singleHoliday))
            {
                result.IsFromDateHoliday = true;
                result.IsToDateHoliday = true;
                result.FromDateHolidayName = singleHoliday.HolidayName;
                result.ToDateHolidayName = singleHoliday.HolidayName;
                result.IsValid = false;
                result.ValidationMessage = $"Selected date ({start:dd-MMM-yyyy}) is an official holiday ('{singleHoliday.HolidayName}'). Leave cannot be applied on a holiday.";
            }
            else if (start.DayOfWeek == DayOfWeek.Saturday || start.DayOfWeek == DayOfWeek.Sunday)
            {
                result.IsFromDateWeekend = true;
                result.IsToDateWeekend = true;
                result.IsValid = false;
                result.ValidationMessage = $"Selected date ({start:dd-MMM-yyyy}) is a weekend ({start.DayOfWeek}). Leave cannot be applied on a weekend.";
            }
        }
        else
        {
            // Range: Validate Start Date is not a holiday or weekend
            if (holidayDict.TryGetValue(start, out var startHoliday))
            {
                result.IsFromDateHoliday = true;
                result.FromDateHolidayName = startHoliday.HolidayName;
                result.IsValid = false;
                result.ValidationMessage = $"Start Date ({start:dd-MMM-yyyy}) is an official holiday ('{startHoliday.HolidayName}'). Leaves cannot start on a holiday.";
            }
            else if (start.DayOfWeek == DayOfWeek.Saturday || start.DayOfWeek == DayOfWeek.Sunday)
            {
                result.IsFromDateWeekend = true;
                result.IsValid = false;
                result.ValidationMessage = $"Start Date ({start:dd-MMM-yyyy}) is a weekend ({start.DayOfWeek}). Leaves cannot start on a weekend.";
            }

            // Range: Validate End Date is not a holiday or weekend
            if (holidayDict.TryGetValue(end, out var endHoliday))
            {
                result.IsToDateHoliday = true;
                result.ToDateHolidayName = endHoliday.HolidayName;
                result.IsValid = false;
                result.ValidationMessage = $"End Date ({end:dd-MMM-yyyy}) is an official holiday ('{endHoliday.HolidayName}'). Leaves cannot end on a holiday.";
            }
            else if (end.DayOfWeek == DayOfWeek.Saturday || end.DayOfWeek == DayOfWeek.Sunday)
            {
                result.IsToDateWeekend = true;
                result.IsValid = false;
                result.ValidationMessage = $"End Date ({end:dd-MMM-yyyy}) is a weekend ({end.DayOfWeek}). Leaves cannot end on a weekend.";
            }
        }

        // 3. Calculate working leave days excluding official holidays and weekend offs (Saturday & Sunday)
        decimal chargeableDays = 0m;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (holidayDict.TryGetValue(d, out var hol))
            {
                result.HolidayDaysCount++;
                if (!result.ExcludedHolidays.Any(h => h.HolidayId == hol.HolidayId))
                {
                    result.ExcludedHolidays.Add(hol);
                }
            }
            else if (d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday)
            {
                result.WeeklyOffDaysCount++;
                result.ExcludedWeeklyOffDates.Add(d.ToString("yyyy-MM-dd"));
            }
            else
            {
                if (start == end)
                {
                    chargeableDays += (fromDayType == "HALF" ? 0.5m : 1.0m);
                }
                else
                {
                    if (d == start && fromDayType == "HALF")
                    {
                        chargeableDays += 0.5m;
                    }
                    else if (d == end && toDayType == "HALF")
                    {
                        chargeableDays += 0.5m;
                    }
                    else
                    {
                        chargeableDays += 1.0m;
                    }
                }
            }
        }

        result.ChargeableDays = chargeableDays;

        if (chargeableDays <= 0 && result.IsValid)
        {
            result.IsValid = false;
            result.ValidationMessage = "The requested period contains only official holidays or weekends. Leave days cannot be zero.";
        }

        // 4. Proactive Validation against applicable Database Leave Policy
        if (result.IsValid && employeeId > 0 && leaveTypeId > 0)
        {
            try
            {
                const string empDeptSql = "SELECT department_id FROM employee.employee_master WHERE employee_id = @EmployeeId;";
                var empDept = await connection.QuerySingleOrDefaultAsync<long?>(
                    new CommandDefinition(empDeptSql, new { EmployeeId = employeeId }, cancellationToken: cancellationToken));

                var policy = await policyRepository.ResolveApplicablePolicyAsync(
                    leaveTypeId, empDept, start, cancellationToken);

                var hasAnyHalfDay = fromDayType == "HALF" || toDayType == "HALF" || isHalfDay;
                if (policy is not null)
                {
                    if (hasAnyHalfDay && !policy.AllowHalfDay)
                    {
                        result.IsValid = false;
                        result.ValidationMessage = $"Half-day leave is not permitted for {policy.LeaveTypeCode} under the applicable leave policy.";
                    }
                    else if (chargeableDays > policy.MaxConsecutiveDays)
                    {
                        result.IsValid = false;
                        result.ValidationMessage = $"Requested duration ({chargeableDays} day(s)) exceeds the maximum consecutive limit of {policy.MaxConsecutiveDays} day(s) allowed for {policy.LeaveTypeCode}.";
                    }
                }
            }
            catch (InvalidOperationException opEx)
            {
                result.IsValid = false;
                result.ValidationMessage = opEx.Message;
            }
        }

        return result;
    }

    public async Task<ApplyLeaveResult> ApplyLeaveAsync(
        long employeeId,
        long leaveTypeId,
        int leaveReasonId,
        DateTime fromDate,
        DateTime toDate,
        string? reason,
        bool isHalfDay,
        string fromDayType,
        string? fromHalfSession,
        string toDayType,
        string? toHalfSession,
        CancellationToken cancellationToken)
    {
        fromDayType = string.Equals(fromDayType, "HALF", StringComparison.OrdinalIgnoreCase) ? "HALF" : "FULL";
        toDayType = string.Equals(toDayType, "HALF", StringComparison.OrdinalIgnoreCase) ? "HALF" : "FULL";

        if (fromDate.Date == toDate.Date)
        {
            if (isHalfDay || fromDayType == "HALF" || toDayType == "HALF")
            {
                fromDayType = "HALF";
                toDayType = "HALF";
                fromHalfSession = string.IsNullOrWhiteSpace(fromHalfSession) ? "FIRST_HALF" : fromHalfSession;
                toHalfSession = fromHalfSession;
                isHalfDay = true;
            }
        }
        else
        {
            if (fromDayType != "HALF") fromHalfSession = null;
            if (toDayType != "HALF") toHalfSession = null;
            isHalfDay = fromDayType == "HALF" || toDayType == "HALF";
        }

        // 1. Authoritative Centralized Calculation of chargeable days and holiday validation
        var breakdown = await CalculateChargeableLeaveDaysAsync(
            employeeId, fromDate, toDate, leaveTypeId, isHalfDay, fromDayType, fromHalfSession, toDayType, toHalfSession, cancellationToken);

        if (!breakdown.IsValid)
        {
            return new ApplyLeaveResult
            {
                Success = false,
                Message = breakdown.ValidationMessage ?? "Invalid leave dates requested."
            };
        }

        var totalDays = breakdown.ChargeableDays;

        var fy = fromDate.Month >= 4
            ? $"{fromDate.Year}-{fromDate.Year + 1}"
            : $"{fromDate.Year - 1}-{fromDate.Year}";

        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        try
        {
            // 1. Validate employee exists and is active
            const string empSql = "SELECT employee_id, record_status FROM employee.employee_master WHERE employee_id = @EmployeeId;";
            var emp = await connection.QuerySingleOrDefaultAsync<(long employee_id, string record_status)?>(
                new CommandDefinition(empSql, new { EmployeeId = employeeId }, transaction, cancellationToken: cancellationToken));

            if (emp is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = "Employee record not found." };
            }

            if (!string.Equals(emp.Value.record_status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = "Employee account is not active." };
            }

            // 2. Validate leave type
            const string leaveTypeSql = "SELECT leave_type_code FROM master.leave_types WHERE leave_type_id = @LeaveTypeId AND lang_code = 1;";
            var leaveTypeCode = await connection.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition(leaveTypeSql, new { LeaveTypeId = leaveTypeId }, transaction, cancellationToken: cancellationToken));

            if (string.IsNullOrWhiteSpace(leaveTypeCode))
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = "Invalid leave type selected." };
            }

            // 3. Validate leave reason from master
            const string reasonSql = "SELECT id, reason_name, is_active FROM master.leave_reason_master WHERE id = @LeaveReasonId;";
            var reasonRow = await connection.QuerySingleOrDefaultAsync<(int id, string reason_name, bool is_active)?>(
                new CommandDefinition(reasonSql, new { LeaveReasonId = leaveReasonId }, transaction, cancellationToken: cancellationToken));

            if (reasonRow is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = "Selected leave reason does not exist." };
            }

            if (!reasonRow.Value.is_active)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = "Selected leave reason is inactive. Please choose an active reason." };
            }

            // 3.5. Authoritative Validation against applicable Database Leave Policy
            const string deptSql = "SELECT department_id FROM employee.employee_master WHERE employee_id = @EmployeeId;";
            var empDeptId = await connection.QuerySingleOrDefaultAsync<long?>(
                new CommandDefinition(deptSql, new { EmployeeId = employeeId }, transaction, cancellationToken: cancellationToken));

            LeavePolicyDto? policy;
            try
            {
                policy = await policyRepository.ResolveApplicablePolicyAsync(
                    leaveTypeId, empDeptId, fromDate, cancellationToken);
            }
            catch (InvalidOperationException opEx)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult { Success = false, Message = opEx.Message };
            }

            if (policy is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"No active leave policy found for {leaveTypeCode} applicable to your department as of {fromDate:dd-MMM-yyyy}."
                };
            }

            if (!policy.IsActive)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"The leave policy for {leaveTypeCode} is currently inactive."
                };
            }

            // Validate policy effective date window
            if (fromDate.Date < policy.EffectiveFrom.Date || (policy.EffectiveTo.HasValue && toDate.Date > policy.EffectiveTo.Value.Date))
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"Requested leave dates ({fromDate:dd-MMM-yyyy} to {toDate:dd-MMM-yyyy}) fall outside the policy validity period ({policy.EffectiveFrom:dd-MMM-yyyy} to {(policy.EffectiveTo.HasValue ? policy.EffectiveTo.Value.ToString("dd-MMM-yyyy") : "Open")})."
                };
            }

            // Validate max consecutive days allowed
            if (totalDays > policy.MaxConsecutiveDays)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"Requested duration ({totalDays} day(s)) exceeds the maximum consecutive limit of {policy.MaxConsecutiveDays} day(s) allowed for {leaveTypeCode}."
                };
            }

            // Validate half-day policy rule
            var hasAnyHalf = isHalfDay || fromDayType == "HALF" || toDayType == "HALF";
            if (hasAnyHalf && !policy.AllowHalfDay)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"Half-day leave is not permitted for {leaveTypeCode} under the applicable policy."
                };
            }

            // 4. Ensure balance row exists with quota from leave policy + eligible carry-forward
            decimal eligibleCarryForward = 0m;
            if (policy.CarryForwardAllowed)
            {
                var parts = fy.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[0], out var startY) && int.TryParse(parts[1], out var endY))
                {
                    var prevFy = $"{startY - 1}-{endY - 1}";
                    const string prevBalSql = """
                        SELECT current_balance 
                        FROM leave.employee_leave_balance 
                        WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @PrevFy;
                        """;
                    var prevBal = await connection.QuerySingleOrDefaultAsync<decimal?>(
                        new CommandDefinition(prevBalSql, new { EmployeeId = employeeId, LeaveTypeId = leaveTypeId, PrevFy = prevFy }, transaction, cancellationToken: cancellationToken));

                    if (prevBal.HasValue && prevBal.Value > 0)
                    {
                        eligibleCarryForward = Math.Min(prevBal.Value, policy.MaxCarryForward);
                    }
                }
            }

            var totalQuota = policy.AnnualEntitlement + eligibleCarryForward;

            const string ensureBalSql = """
                INSERT INTO leave.employee_leave_balance (
                    employee_id, leave_type_id, financial_year, annual_quota, consumed_approved, pending_applied, current_balance
                )
                VALUES (@EmployeeId, @LeaveTypeId, @FinancialYear, @TotalQuota, 0.0, 0.0, @TotalQuota)
                ON CONFLICT ON CONSTRAINT uq_employee_leave_bal DO UPDATE SET
                    annual_quota = EXCLUDED.annual_quota,
                    updated_at = CURRENT_TIMESTAMP;
                """;

            await connection.ExecuteAsync(new CommandDefinition(
                ensureBalSql,
                new { EmployeeId = employeeId, LeaveTypeId = leaveTypeId, FinancialYear = fy, TotalQuota = totalQuota },
                transaction,
                cancellationToken: cancellationToken));

            const string lockBalSql = """
                SELECT balance_id, annual_quota, consumed_approved, pending_applied, current_balance
                FROM leave.employee_leave_balance
                WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear
                FOR UPDATE;
                """;

            var balanceRow = await connection.QuerySingleOrDefaultAsync<(long balance_id, decimal annual_quota, decimal consumed_approved, decimal pending_applied, decimal current_balance)?>(
                new CommandDefinition(lockBalSql, new { EmployeeId = employeeId, LeaveTypeId = leaveTypeId, FinancialYear = fy }, transaction, cancellationToken: cancellationToken));

            var currentBalance = balanceRow?.current_balance ?? 0m;
            if (currentBalance < totalDays)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"Insufficient leave balance for {leaveTypeCode}. Available: {currentBalance} day(s), Requested: {totalDays} day(s)."
                };
            }

            // 5. Overlap validation: NewStartDate <= ExistingEndDate AND NewEndDate >= ExistingStartDate
            // Pending and Approved are blocked; Rejected and Cancelled are allowed
            const string overlapSql = """
                SELECT leave_id, leave_status, from_date, to_date
                FROM leave.employee_leave
                WHERE employee_id = @EmployeeId
                  AND leave_status IN ('PENDING', 'APPLIED', 'APPROVED')
                  AND @FromDate <= to_date AND @ToDate >= from_date
                LIMIT 1;
                """;

            var overlapping = await connection.QuerySingleOrDefaultAsync<(long leave_id, string leave_status, DateTime from_date, DateTime to_date)?>(
                new CommandDefinition(overlapSql, new { EmployeeId = employeeId, FromDate = fromDate.Date, ToDate = toDate.Date }, transaction, cancellationToken: cancellationToken));

            if (overlapping.HasValue)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ApplyLeaveResult
                {
                    Success = false,
                    Message = $"Leave application overlaps with an existing {overlapping.Value.leave_status} application from {overlapping.Value.from_date:dd MMM yyyy} to {overlapping.Value.to_date:dd MMM yyyy}."
                };
            }

            // 6. Insert leave application with status 'PENDING'
            const string insertLeaveSql = """
                INSERT INTO leave.employee_leave (
                    employee_id,
                    leave_type_id,
                    leave_type_code,
                    leave_reason_id,
                    leave_reason,
                    from_date,
                    to_date,
                    total_days,
                    total_calendar_days,
                    holiday_days,
                    weekly_off_days,
                    financial_year,
                    reason,
                    leave_status,
                    applied_date,
                    is_half_day,
                    half_day_session,
                    from_day_type,
                    from_half_session,
                    to_day_type,
                    to_half_session
                )
                VALUES (
                    @EmployeeId,
                    @LeaveTypeId,
                    @LeaveTypeCode,
                    @LeaveReasonId,
                    @LeaveReasonId,
                    @FromDate,
                    @ToDate,
                    @TotalDays,
                    @TotalCalendarDays,
                    @HolidayDaysCount,
                    @WeeklyOffDaysCount,
                    @FinancialYear,
                    @Reason,
                    'PENDING',
                    CURRENT_TIMESTAMP,
                    @IsHalfDay,
                    @HalfDaySession,
                    @FromDayType,
                    @FromHalfSession,
                    @ToDayType,
                    @ToHalfSession
                )
                RETURNING leave_id;
                """;

            var newLeaveId = await connection.ExecuteScalarAsync<long>(new CommandDefinition(
                insertLeaveSql,
                new
                {
                    EmployeeId = employeeId,
                    LeaveTypeId = leaveTypeId,
                    LeaveTypeCode = leaveTypeCode,
                    LeaveReasonId = leaveReasonId,
                    FromDate = fromDate.Date,
                    ToDate = toDate.Date,
                    TotalDays = totalDays,
                    TotalCalendarDays = breakdown.TotalCalendarDays,
                    HolidayDaysCount = breakdown.HolidayDaysCount,
                    WeeklyOffDaysCount = breakdown.WeeklyOffDaysCount,
                    FinancialYear = fy,
                    Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
                    IsHalfDay = isHalfDay,
                    HalfDaySession = fromDayType == "HALF" ? fromHalfSession : (toDayType == "HALF" ? toHalfSession : null),
                    FromDayType = fromDayType,
                    FromHalfSession = fromDayType == "HALF" ? fromHalfSession : null,
                    ToDayType = toDayType,
                    ToHalfSession = toDayType == "HALF" ? toHalfSession : null
                },
                transaction,
                cancellationToken: cancellationToken));

            // 7. Deduct balance immediately
            const string deductBalSql = """
                UPDATE leave.employee_leave_balance
                SET current_balance = current_balance - @TotalDays,
                    pending_applied = pending_applied + @TotalDays,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear;
                """;

            await connection.ExecuteAsync(new CommandDefinition(
                deductBalSql,
                new { TotalDays = totalDays, EmployeeId = employeeId, LeaveTypeId = leaveTypeId, FinancialYear = fy },
                transaction,
                cancellationToken: cancellationToken));

            // 8. Record audit DEBIT in leave_balance_transaction
            const string auditDebitSql = """
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
                VALUES (
                    @EmployeeId,
                    @LeaveId,
                    @LeaveTypeId,
                    'DEBIT',
                    @TotalDays,
                    CURRENT_TIMESTAMP,
                    'Immediate balance deduction on leave application submission',
                    @EmployeeId,
                    @FinancialYear
                );
                """;

            await connection.ExecuteAsync(new CommandDefinition(
                auditDebitSql,
                new
                {
                    EmployeeId = employeeId,
                    LeaveId = newLeaveId,
                    LeaveTypeId = leaveTypeId,
                    TotalDays = totalDays,
                    FinancialYear = fy
                },
                transaction,
                cancellationToken: cancellationToken));

            await transaction.CommitAsync(cancellationToken);

            return new ApplyLeaveResult
            {
                Success = true,
                Message = $"Leave application submitted successfully for {totalDays} chargeable day(s)" +
                          (breakdown.HolidayDaysCount > 0 ? $" ({breakdown.HolidayDaysCount} holiday(s) excluded)" : "") +
                          (breakdown.WeeklyOffDaysCount > 0 ? $" ({breakdown.WeeklyOffDaysCount} weekly off(s) excluded)" : "") +
                          ". Balance deducted immediately.",
                LeaveId = newLeaveId,
                TotalDays = totalDays,
                RemainingBalance = currentBalance - totalDays,
                TotalCalendarDays = breakdown.TotalCalendarDays,
                HolidayDaysCount = breakdown.HolidayDaysCount,
                WeeklyOffDaysCount = breakdown.WeeklyOffDaysCount,
                FinancialYear = fy
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new ApplyLeaveResult
            {
                Success = false,
                Message = $"Transaction failed: {ex.Message}"
            };
        }
    }

    public async Task<ActionLeaveResult> ActionLeaveAsync(
        long leaveId,
        long officialId,
        string action,
        string? rejectionReason,
        CancellationToken cancellationToken)
    {
        var actionUpper = action.Trim().ToUpperInvariant();
        if (actionUpper != "APPROVE" && actionUpper != "REJECT" && actionUpper != "CANCEL")
        {
            return new ActionLeaveResult { Success = false, Message = "Action must be APPROVE, REJECT, or CANCEL." };
        }

        if (actionUpper == "CANCEL")
        {
            var cancelRes = await CancelLeaveAsync(leaveId, officialId, true, rejectionReason, cancellationToken);
            return new ActionLeaveResult
            {
                Success = cancelRes.Success,
                Message = cancelRes.Message,
                LeaveId = cancelRes.LeaveId,
                NewStatus = cancelRes.NewStatus
            };
        }

        if (actionUpper == "REJECT" && string.IsNullOrWhiteSpace(rejectionReason))
        {
            return new ActionLeaveResult
            {
                Success = false,
                Message = "Rejection reason is mandatory when rejecting a leave application."
            };
        }

        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        try
        {
            // 1. Lock leave row
            const string lockLeaveSql = """
                SELECT leave_id, employee_id, leave_type_id, total_days, financial_year, leave_status
                FROM leave.employee_leave
                WHERE leave_id = @LeaveId
                FOR UPDATE;
                """;

            var leaveRow = await connection.QuerySingleOrDefaultAsync<(long leave_id, long employee_id, long leave_type_id, decimal total_days, string financial_year, string leave_status)?>(
                new CommandDefinition(lockLeaveSql, new { LeaveId = leaveId }, transaction, cancellationToken: cancellationToken));

            if (leaveRow is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ActionLeaveResult { Success = false, Message = "Leave application not found." };
            }

            var currentStatus = leaveRow.Value.leave_status.ToUpperInvariant();
            if (currentStatus != "PENDING" && currentStatus != "APPLIED")
            {
                await transaction.RollbackAsync(cancellationToken);
                return new ActionLeaveResult
                {
                    Success = false,
                    Message = $"Leave application is already {currentStatus}. Only pending applications can be approved or rejected.",
                    LeaveId = leaveId,
                    NewStatus = currentStatus
                };
            }

            if (actionUpper == "APPROVE")
            {
                // Update status to APPROVED
                const string updateApproveSql = """
                    UPDATE leave.employee_leave
                    SET leave_status = 'APPROVED',
                        action_by_official_id = @OfficialId,
                        action_date = CURRENT_TIMESTAMP,
                        rejection_reason = NULL
                    WHERE leave_id = @LeaveId;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    updateApproveSql,
                    new { OfficialId = officialId, LeaveId = leaveId },
                    transaction,
                    cancellationToken: cancellationToken));

                // Balance was already deducted at application time.
                // Shift days from pending_applied to consumed_approved; do not deduct balance again!
                const string updateBalSql = """
                    UPDATE leave.employee_leave_balance
                    SET pending_applied = GREATEST(0.0, pending_applied - @TotalDays),
                        consumed_approved = consumed_approved + @TotalDays,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    updateBalSql,
                    new
                    {
                        TotalDays = leaveRow.Value.total_days,
                        EmployeeId = leaveRow.Value.employee_id,
                        LeaveTypeId = leaveRow.Value.leave_type_id,
                        FinancialYear = leaveRow.Value.financial_year
                    },
                    transaction,
                    cancellationToken: cancellationToken));

                await transaction.CommitAsync(cancellationToken);

                return new ActionLeaveResult
                {
                    Success = true,
                    Message = "Leave application approved successfully. Balance was already deducted at application.",
                    LeaveId = leaveId,
                    NewStatus = "APPROVED"
                };
            }
            else // REJECT
            {
                // Check whether refund credit was already processed (critical protection against duplicate restoration)
                const string checkRefundSql = """
                    SELECT 1 FROM leave.leave_balance_transaction 
                    WHERE leave_id = @LeaveId AND transaction_type = 'CREDIT';
                    """;

                var alreadyRefunded = await connection.ExecuteScalarAsync<int?>(
                    new CommandDefinition(checkRefundSql, new { LeaveId = leaveId }, transaction, cancellationToken: cancellationToken));

                if (alreadyRefunded.HasValue)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return new ActionLeaveResult
                    {
                        Success = false,
                        Message = "Leave balance has already been restored for this application.",
                        LeaveId = leaveId,
                        NewStatus = currentStatus
                    };
                }

                // Update status to REJECTED
                const string updateRejectSql = """
                    UPDATE leave.employee_leave
                    SET leave_status = 'REJECTED',
                        action_by_official_id = @OfficialId,
                        action_date = CURRENT_TIMESTAMP,
                        rejection_reason = @RejectionReason
                    WHERE leave_id = @LeaveId;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    updateRejectSql,
                    new
                    {
                        OfficialId = officialId,
                        LeaveId = leaveId,
                        RejectionReason = rejectionReason!.Trim()
                    },
                    transaction,
                    cancellationToken: cancellationToken));

                // Restore deducted balance
                const string restoreBalSql = """
                    UPDATE leave.employee_leave_balance
                    SET current_balance = current_balance + @TotalDays,
                        pending_applied = GREATEST(0.0, pending_applied - @TotalDays),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    restoreBalSql,
                    new
                    {
                        TotalDays = leaveRow.Value.total_days,
                        EmployeeId = leaveRow.Value.employee_id,
                        LeaveTypeId = leaveRow.Value.leave_type_id,
                        FinancialYear = leaveRow.Value.financial_year
                    },
                    transaction,
                    cancellationToken: cancellationToken));

                // Record audit CREDIT
                const string auditCreditSql = """
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
                    VALUES (
                        @EmployeeId,
                        @LeaveId,
                        @LeaveTypeId,
                        'CREDIT',
                        @TotalDays,
                        CURRENT_TIMESTAMP,
                        @Remarks,
                        @OfficialId,
                        @FinancialYear
                    );
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    auditCreditSql,
                    new
                    {
                        EmployeeId = leaveRow.Value.employee_id,
                        LeaveId = leaveId,
                        LeaveTypeId = leaveRow.Value.leave_type_id,
                        TotalDays = leaveRow.Value.total_days,
                        Remarks = $"Leave balance restored upon rejection: {rejectionReason.Trim()}",
                        OfficialId = officialId,
                        FinancialYear = leaveRow.Value.financial_year
                    },
                    transaction,
                    cancellationToken: cancellationToken));

                await transaction.CommitAsync(cancellationToken);

                return new ActionLeaveResult
                {
                    Success = true,
                    Message = $"Leave rejected successfully and {leaveRow.Value.total_days} day(s) restored to employee balance.",
                    LeaveId = leaveId,
                    NewStatus = "REJECTED"
                };
            }
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new ActionLeaveResult
            {
                Success = false,
                Message = $"Transaction failed: {ex.Message}"
            };
        }
    }

    public async Task<CancelLeaveResult> CancelLeaveAsync(
        long leaveId,
        long userId,
        bool isOfficialOrAdmin,
        string? cancellationReason,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        try
        {
            // 1. Lock leave row
            const string lockLeaveSql = """
                SELECT leave_id, employee_id, leave_type_id, total_days, financial_year, leave_status
                FROM leave.employee_leave
                WHERE leave_id = @LeaveId
                FOR UPDATE;
                """;

            var leaveRow = await connection.QuerySingleOrDefaultAsync<(long leave_id, long employee_id, long leave_type_id, decimal total_days, string financial_year, string leave_status)?>(
                new CommandDefinition(lockLeaveSql, new { LeaveId = leaveId }, transaction, cancellationToken: cancellationToken));

            if (leaveRow is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new CancelLeaveResult { Success = false, Message = "Leave application not found." };
            }

            var currentStatus = leaveRow.Value.leave_status.ToUpperInvariant();

            // 2. State & duplicate prevention checks
            if (currentStatus == "CANCELLED")
            {
                await transaction.RollbackAsync(cancellationToken);
                return new CancelLeaveResult
                {
                    Success = false,
                    Message = "Leave application is already cancelled. No additional balance restoration possible.",
                    LeaveId = leaveId,
                    NewStatus = "CANCELLED"
                };
            }

            if (currentStatus == "REJECTED")
            {
                await transaction.RollbackAsync(cancellationToken);
                return new CancelLeaveResult
                {
                    Success = false,
                    Message = "Leave application was rejected. Balance has already been restored.",
                    LeaveId = leaveId,
                    NewStatus = "REJECTED"
                };
            }

            // If leave is approved, only authorized official or admin may cancel
            if (currentStatus == "APPROVED" && !isOfficialOrAdmin)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new CancelLeaveResult
                {
                    Success = false,
                    Message = "Approved leave applications require Reporting Officer or Admin authorization to cancel.",
                    LeaveId = leaveId,
                    NewStatus = currentStatus
                };
            }

            // 3. Ensure balance has not already been restored
            const string checkRefundSql = """
                SELECT 1 FROM leave.leave_balance_transaction 
                WHERE leave_id = @LeaveId AND transaction_type = 'CREDIT';
                """;

            var alreadyRefunded = await connection.ExecuteScalarAsync<int?>(
                new CommandDefinition(checkRefundSql, new { LeaveId = leaveId }, transaction, cancellationToken: cancellationToken));

            if (alreadyRefunded.HasValue)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new CancelLeaveResult
                {
                    Success = false,
                    Message = "Leave balance has already been restored for this application.",
                    LeaveId = leaveId,
                    NewStatus = currentStatus
                };
            }

            // 4. Update status to CANCELLED
            const string updateCancelSql = """
                UPDATE leave.employee_leave
                SET leave_status = 'CANCELLED',
                    cancellation_reason = @CancellationReason,
                    cancelled_by_id = @UserId,
                    cancelled_at = CURRENT_TIMESTAMP
                WHERE leave_id = @LeaveId;
                """;

            var reasonText = string.IsNullOrWhiteSpace(cancellationReason) ? "Cancelled by user" : cancellationReason.Trim();

            await connection.ExecuteAsync(new CommandDefinition(
                updateCancelSql,
                new { CancellationReason = reasonText, UserId = userId, LeaveId = leaveId },
                transaction,
                cancellationToken: cancellationToken));

            // 5. Restore deducted leave balance
            if (currentStatus == "APPROVED")
            {
                const string restoreApprovedBalSql = """
                    UPDATE leave.employee_leave_balance
                    SET current_balance = current_balance + @TotalDays,
                        consumed_approved = GREATEST(0.0, consumed_approved - @TotalDays),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    restoreApprovedBalSql,
                    new
                    {
                        TotalDays = leaveRow.Value.total_days,
                        EmployeeId = leaveRow.Value.employee_id,
                        LeaveTypeId = leaveRow.Value.leave_type_id,
                        FinancialYear = leaveRow.Value.financial_year
                    },
                    transaction,
                    cancellationToken: cancellationToken));
            }
            else // PENDING or APPLIED
            {
                const string restorePendingBalSql = """
                    UPDATE leave.employee_leave_balance
                    SET current_balance = current_balance + @TotalDays,
                        pending_applied = GREATEST(0.0, pending_applied - @TotalDays),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE employee_id = @EmployeeId AND leave_type_id = @LeaveTypeId AND financial_year = @FinancialYear;
                    """;

                await connection.ExecuteAsync(new CommandDefinition(
                    restorePendingBalSql,
                    new
                    {
                        TotalDays = leaveRow.Value.total_days,
                        EmployeeId = leaveRow.Value.employee_id,
                        LeaveTypeId = leaveRow.Value.leave_type_id,
                        FinancialYear = leaveRow.Value.financial_year
                    },
                    transaction,
                    cancellationToken: cancellationToken));
            }

            // 6. Record audit CREDIT entry
            const string auditCreditSql = """
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
                VALUES (
                    @EmployeeId,
                    @LeaveId,
                    @LeaveTypeId,
                    'CREDIT',
                    @TotalDays,
                    CURRENT_TIMESTAMP,
                    @Remarks,
                    @UserId,
                    @FinancialYear
                );
                """;

            await connection.ExecuteAsync(new CommandDefinition(
                auditCreditSql,
                new
                {
                    EmployeeId = leaveRow.Value.employee_id,
                    LeaveId = leaveId,
                    LeaveTypeId = leaveRow.Value.leave_type_id,
                    TotalDays = leaveRow.Value.total_days,
                    Remarks = $"Leave balance restored upon cancellation: {reasonText}",
                    UserId = userId,
                    FinancialYear = leaveRow.Value.financial_year
                },
                transaction,
                cancellationToken: cancellationToken));

            await transaction.CommitAsync(cancellationToken);

            return new CancelLeaveResult
            {
                Success = true,
                Message = $"Leave application cancelled successfully. {leaveRow.Value.total_days} day(s) restored to available balance.",
                LeaveId = leaveId,
                RestoredDays = leaveRow.Value.total_days,
                NewStatus = "CANCELLED"
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new CancelLeaveResult
            {
                Success = false,
                Message = $"Transaction failed: {ex.Message}"
            };
        }
    }

    public async Task<IReadOnlyList<LeaveBalanceDto>> GetEmployeeLeaveBalancesAsync(
        long employeeId,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                leave_type_id AS LeaveTypeId,
                leave_type_code AS LeaveTypeCode,
                leave_type_name AS LeaveTypeName,
                annual_allowed AS AnnualAllowed,
                consumed_approved AS ConsumedApproved,
                pending_applied AS PendingApplied,
                balance AS Balance
            FROM leave.fn_get_employee_leave_balances(@EmployeeId, @FinancialYear);
            """;

        var command = new CommandDefinition(
            sql,
            new { EmployeeId = employeeId, FinancialYear = string.IsNullOrWhiteSpace(financialYear) ? null : financialYear.Trim() },
            cancellationToken: cancellationToken);

        var list = await connection.QueryAsync<LeaveBalanceDto>(command);
        return list.AsList();
    }

    public async Task<IReadOnlyList<EmployeeLeaveDto>> GetEmployeeLeavesAsync(
        long employeeId,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                leave_id AS LeaveId,
                leave_type_id AS LeaveTypeId,
                leave_type_code AS LeaveTypeCode,
                leave_type_name AS LeaveTypeName,
                leave_reason_id AS LeaveReasonId,
                reason_name AS ReasonName,
                from_date AS FromDate,
                to_date AS ToDate,
                total_days AS TotalDays,
                financial_year AS FinancialYear,
                reason AS Reason,
                leave_status AS LeaveStatus,
                rejection_reason AS RejectionReason,
                cancellation_reason AS CancellationReason,
                applied_date AS AppliedDate,
                action_date AS ActionDate,
                cancelled_at AS CancelledAt,
                is_half_day AS IsHalfDay,
                half_day_session AS HalfDaySession,
                from_day_type AS FromDayType,
                from_half_session AS FromHalfSession,
                to_day_type AS ToDayType,
                to_half_session AS ToHalfSession
            FROM leave.fn_get_employee_leaves(@EmployeeId);
            """;

        var command = new CommandDefinition(sql, new { EmployeeId = employeeId }, cancellationToken: cancellationToken);
        var list = await connection.QueryAsync<EmployeeLeaveDto>(command);
        return list.AsList();
    }

    public async Task<IReadOnlyList<ManagerPendingLeaveDto>> GetManagerPendingLeavesAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                leave_id AS LeaveId,
                employee_id AS EmployeeId,
                emp_name AS EmpName,
                contract_no AS ContractNo,
                designation_name AS DesignationName,
                office_name AS OfficeName,
                leave_type_id AS LeaveTypeId,
                leave_type_code AS LeaveTypeCode,
                leave_type_name AS LeaveTypeName,
                leave_reason_id AS LeaveReasonId,
                reason_name AS ReasonName,
                from_date AS FromDate,
                to_date AS ToDate,
                total_days AS TotalDays,
                financial_year AS FinancialYear,
                reason AS Reason,
                leave_status AS LeaveStatus,
                applied_date AS AppliedDate,
                is_half_day AS IsHalfDay,
                half_day_session AS HalfDaySession,
                from_day_type AS FromDayType,
                from_half_session AS FromHalfSession,
                to_day_type AS ToDayType,
                to_half_session AS ToHalfSession
            FROM leave.fn_get_manager_pending_leaves(@ReportingOfficialId);
            """;

        var command = new CommandDefinition(sql, new { ReportingOfficialId = reportingOfficialId }, cancellationToken: cancellationToken);
        var list = await connection.QueryAsync<ManagerPendingLeaveDto>(command);
        return list.AsList();
    }

    public async Task<IReadOnlyList<ManagerLeaveHistoryDto>> GetManagerLeaveHistoryAsync(
        long reportingOfficialId,
        string? status,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                leave_id AS LeaveId,
                employee_id AS EmployeeId,
                emp_name AS EmpName,
                contract_no AS ContractNo,
                designation_name AS DesignationName,
                office_name AS OfficeName,
                leave_type_id AS LeaveTypeId,
                leave_type_code AS LeaveTypeCode,
                leave_type_name AS LeaveTypeName,
                leave_reason_id AS LeaveReasonId,
                reason_name AS ReasonName,
                from_date AS FromDate,
                to_date AS ToDate,
                total_days AS TotalDays,
                financial_year AS FinancialYear,
                reason AS Reason,
                leave_status AS LeaveStatus,
                rejection_reason AS RejectionReason,
                cancellation_reason AS CancellationReason,
                applied_date AS AppliedDate,
                action_date AS ActionDate,
                action_official_name AS ActionOfficialName
            FROM leave.fn_get_manager_leave_history(@ReportingOfficialId, @Status);
            """;

        var command = new CommandDefinition(
            sql,
            new { ReportingOfficialId = reportingOfficialId, Status = string.IsNullOrWhiteSpace(status) ? null : status.Trim() },
            cancellationToken: cancellationToken);

        var list = await connection.QueryAsync<ManagerLeaveHistoryDto>(command);
        return list.AsList();
    }

    public async Task<ManagerLeaveStatsDto> GetManagerLeaveStatsAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string statsSql = """
            SELECT 
                pending_approval_count AS PendingApprovalCount,
                sanctioned_this_month_count AS SanctionedThisMonthCount,
                staff_on_leave_today_count AS StaffOnLeaveTodayCount,
                total_subordinates_count AS TotalSubordinatesCount
            FROM leave.fn_get_manager_leave_stats(@ReportingOfficialId);
            """;

        var stats = await connection.QuerySingleOrDefaultAsync<ManagerLeaveStatsDto>(
            new CommandDefinition(statsSql, new { ReportingOfficialId = reportingOfficialId }, cancellationToken: cancellationToken))
            ?? new ManagerLeaveStatsDto();

        const string quotaSql = """
            SELECT 
                leave_type_id AS LeaveTypeId,
                leave_type_code AS LeaveTypeCode,
                leave_type_name AS LeaveTypeName,
                total_sanctioned_days AS TotalSanctionedDays,
                total_allocated_days AS TotalAllocatedDays,
                utilization_percentage AS UtilizationPercentage
            FROM leave.fn_get_manager_quota_reports(@ReportingOfficialId, NULL);
            """;

        var quota = await connection.QueryAsync<ManagerQuotaReportDto>(
            new CommandDefinition(quotaSql, new { ReportingOfficialId = reportingOfficialId }, cancellationToken: cancellationToken));

        stats.QuotaUtilization = quota.AsList();
        return stats;
    }

    public async Task<IReadOnlyList<SubordinateLeaveRegisterDto>> GetManagerSubordinateRegisterAsync(
        long reportingOfficialId,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        await using var connection = dataAccess.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT 
                employee_id AS EmployeeId,
                emp_name AS EmpName,
                contract_no AS ContractNo,
                designation_name AS DesignationName,
                office_name AS OfficeName,
                cl_days AS ClDays,
                el_days AS ElDays,
                pl_days AS PlDays,
                sl_days AS SlDays,
                total_days AS TotalDays
            FROM leave.fn_get_manager_subordinate_register(@ReportingOfficialId, @FinancialYear);
            """;

        var command = new CommandDefinition(
            sql,
            new { ReportingOfficialId = reportingOfficialId, FinancialYear = string.IsNullOrWhiteSpace(financialYear) ? null : financialYear.Trim() },
            cancellationToken: cancellationToken);

        var list = await connection.QueryAsync<SubordinateLeaveRegisterDto>(command);
        return list.AsList();
    }
}
