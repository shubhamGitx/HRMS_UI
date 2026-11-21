using HRMSAPI.DAL.Leave;
using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Leave;

public sealed class LeaveService(ILeaveRepository leaveRepository) : ILeaveService
{
    public async Task<ApiResponse<IReadOnlyList<LeaveReasonDto>>> GetLeaveReasonsAsync(CancellationToken cancellationToken)
    {
        var reasons = await leaveRepository.GetLeaveReasonsAsync(cancellationToken);
        return new ApiResponse<IReadOnlyList<LeaveReasonDto>>(true, "Leave reasons retrieved successfully.", reasons);
    }

    public async Task<ApiResponse<LeaveReasonDto>> GetLeaveReasonByIdAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0)
        {
            return new ApiResponse<LeaveReasonDto>(false, "Invalid leave reason ID.");
        }

        var reason = await leaveRepository.GetLeaveReasonByIdAsync(id, cancellationToken);
        if (reason is null)
        {
            return new ApiResponse<LeaveReasonDto>(false, "Leave reason not found.");
        }

        return new ApiResponse<LeaveReasonDto>(true, "Leave reason retrieved successfully.", reason);
    }

    public async Task<ApiResponse<IReadOnlyList<HolidayDto>>> GetHolidaysAsync(int? year, CancellationToken cancellationToken)
    {
        var holidays = await leaveRepository.GetHolidaysAsync(year, cancellationToken);
        return new ApiResponse<IReadOnlyList<HolidayDto>>(true, "Official holidays retrieved successfully.", holidays);
    }

    public async Task<ApiResponse<ChargeableLeaveBreakdownDto>> CalculateChargeableLeaveDaysAsync(
        long employeeId,
        LeaveCalculationRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ToDate.Date < request.FromDate.Date)
        {
            return new ApiResponse<ChargeableLeaveBreakdownDto>(false, "To Date cannot be earlier than From Date.");
        }

        var isHalfDay = request.IsHalfDay || request.FromDayType == "HALF" || request.ToDayType == "HALF";

        var breakdown = await leaveRepository.CalculateChargeableLeaveDaysAsync(
            employeeId,
            request.FromDate,
            request.ToDate,
            request.LeaveTypeId,
            isHalfDay,
            request.FromDayType,
            request.FromHalfSession,
            request.ToDayType,
            request.ToHalfSession,
            cancellationToken);

        return breakdown.IsValid
            ? new ApiResponse<ChargeableLeaveBreakdownDto>(true, "Leave duration calculated successfully.", breakdown)
            : new ApiResponse<ChargeableLeaveBreakdownDto>(false, breakdown.ValidationMessage ?? "Invalid date range.", breakdown);
    }

    public async Task<ApiResponse<ApplyLeaveResult>> ApplyLeaveAsync(
        long employeeId,
        ApplyLeaveRequest request,
        CancellationToken cancellationToken)
    {
        if (employeeId <= 0)
        {
            return new ApiResponse<ApplyLeaveResult>(false, "Valid employee identification is required.");
        }

        if (request.LeaveReasonId <= 0)
        {
            return new ApiResponse<ApplyLeaveResult>(false, "Leave reason must be selected from the predefined list.");
        }

        if (request.ToDate.Date < request.FromDate.Date)
        {
            return new ApiResponse<ApplyLeaveResult>(false, "To Date cannot be before From Date.");
        }

        var isHalfDay = request.IsHalfDay || request.FromDayType == "HALF" || request.ToDayType == "HALF";

        var result = await leaveRepository.ApplyLeaveAsync(
            employeeId,
            request.LeaveTypeId,
            request.LeaveReasonId,
            request.FromDate,
            request.ToDate,
            request.Reason,
            isHalfDay,
            request.FromDayType,
            request.FromHalfSession,
            request.ToDayType,
            request.ToHalfSession,
            cancellationToken);

        return result.Success
            ? new ApiResponse<ApplyLeaveResult>(true, result.Message, result)
            : new ApiResponse<ApplyLeaveResult>(false, result.Message);
    }

    public async Task<ApiResponse<IReadOnlyList<LeaveBalanceDto>>> GetEmployeeLeaveBalancesAsync(
        long employeeId,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        var list = await leaveRepository.GetEmployeeLeaveBalancesAsync(employeeId, financialYear, cancellationToken);
        return new ApiResponse<IReadOnlyList<LeaveBalanceDto>>(true, "Leave balances retrieved successfully.", list);
    }

    public async Task<ApiResponse<IReadOnlyList<EmployeeLeaveDto>>> GetEmployeeLeavesAsync(
        long employeeId,
        CancellationToken cancellationToken)
    {
        var list = await leaveRepository.GetEmployeeLeavesAsync(employeeId, cancellationToken);
        return new ApiResponse<IReadOnlyList<EmployeeLeaveDto>>(true, "Employee leaves retrieved successfully.", list);
    }

    public async Task<ApiResponse<IReadOnlyList<ManagerPendingLeaveDto>>> GetManagerPendingLeavesAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken)
    {
        var list = await leaveRepository.GetManagerPendingLeavesAsync(reportingOfficialId, cancellationToken);
        return new ApiResponse<IReadOnlyList<ManagerPendingLeaveDto>>(true, "Pending leave applications retrieved successfully.", list);
    }

    public async Task<ApiResponse<ActionLeaveResult>> ActionLeaveAsync(
        long officialId,
        ActionLeaveRequest request,
        CancellationToken cancellationToken)
    {
        var actionUpper = request.Action?.Trim().ToUpperInvariant() ?? string.Empty;
        if (actionUpper != "APPROVE" && actionUpper != "REJECT" && actionUpper != "CANCEL")
        {
            return new ApiResponse<ActionLeaveResult>(false, "Action must be APPROVE, REJECT, or CANCEL.");
        }

        if (actionUpper == "REJECT" && string.IsNullOrWhiteSpace(request.RejectionReason))
        {
            return new ApiResponse<ActionLeaveResult>(false, "Rejection reason is mandatory when rejecting a leave application.");
        }

        var result = await leaveRepository.ActionLeaveAsync(
            request.LeaveId,
            officialId,
            actionUpper,
            actionUpper == "CANCEL" ? request.CancellationReason ?? request.RejectionReason : request.RejectionReason,
            cancellationToken);

        return result.Success
            ? new ApiResponse<ActionLeaveResult>(true, result.Message, result)
            : new ApiResponse<ActionLeaveResult>(false, result.Message);
    }

    public async Task<ApiResponse<CancelLeaveResult>> CancelLeaveAsync(
        long userId,
        bool isOfficialOrAdmin,
        CancelLeaveRequest request,
        CancellationToken cancellationToken)
    {
        if (request.LeaveId <= 0)
        {
            return new ApiResponse<CancelLeaveResult>(false, "Valid leave ID is required.");
        }

        var result = await leaveRepository.CancelLeaveAsync(
            request.LeaveId,
            userId,
            isOfficialOrAdmin,
            request.CancellationReason,
            cancellationToken);

        return result.Success
            ? new ApiResponse<CancelLeaveResult>(true, result.Message, result)
            : new ApiResponse<CancelLeaveResult>(false, result.Message);
    }

    public async Task<ApiResponse<IReadOnlyList<ManagerLeaveHistoryDto>>> GetManagerLeaveHistoryAsync(
        long reportingOfficialId,
        string? status,
        CancellationToken cancellationToken)
    {
        if (reportingOfficialId <= 0)
        {
            return new ApiResponse<IReadOnlyList<ManagerLeaveHistoryDto>>(false, "Reporting official ID must be greater than zero.");
        }

        var history = await leaveRepository.GetManagerLeaveHistoryAsync(reportingOfficialId, status, cancellationToken);
        return new ApiResponse<IReadOnlyList<ManagerLeaveHistoryDto>>(true, "Manager subordinate leave history retrieved successfully.", history);
    }

    public async Task<ApiResponse<ManagerLeaveStatsDto>> GetManagerLeaveStatsAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken)
    {
        if (reportingOfficialId <= 0)
        {
            return new ApiResponse<ManagerLeaveStatsDto>(false, "Reporting official ID must be greater than zero.");
        }

        var stats = await leaveRepository.GetManagerLeaveStatsAsync(reportingOfficialId, cancellationToken);
        return new ApiResponse<ManagerLeaveStatsDto>(true, "Manager leave statistics retrieved successfully.", stats);
    }

    public async Task<ApiResponse<IReadOnlyList<SubordinateLeaveRegisterDto>>> GetManagerSubordinateRegisterAsync(
        long reportingOfficialId,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        if (reportingOfficialId <= 0)
        {
            return new ApiResponse<IReadOnlyList<SubordinateLeaveRegisterDto>>(false, "Reporting official ID must be greater than zero.");
        }

        var register = await leaveRepository.GetManagerSubordinateRegisterAsync(reportingOfficialId, financialYear, cancellationToken);
        return new ApiResponse<IReadOnlyList<SubordinateLeaveRegisterDto>>(true, "Subordinate leave register retrieved successfully.", register);
    }
}
