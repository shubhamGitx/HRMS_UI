using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Leave;

public interface ILeaveService
{
    Task<ApiResponse<IReadOnlyList<LeaveReasonDto>>> GetLeaveReasonsAsync(CancellationToken cancellationToken);

    Task<ApiResponse<LeaveReasonDto>> GetLeaveReasonByIdAsync(int id, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<HolidayDto>>> GetHolidaysAsync(int? year, CancellationToken cancellationToken);

    Task<ApiResponse<ChargeableLeaveBreakdownDto>> CalculateChargeableLeaveDaysAsync(
        long employeeId,
        LeaveCalculationRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<ApplyLeaveResult>> ApplyLeaveAsync(
        long employeeId,
        ApplyLeaveRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<LeaveBalanceDto>>> GetEmployeeLeaveBalancesAsync(
        long employeeId,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<EmployeeLeaveDto>>> GetEmployeeLeavesAsync(
        long employeeId,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<ManagerPendingLeaveDto>>> GetManagerPendingLeavesAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken);

    Task<ApiResponse<ActionLeaveResult>> ActionLeaveAsync(
        long officialId,
        ActionLeaveRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<CancelLeaveResult>> CancelLeaveAsync(
        long userId,
        bool isOfficialOrAdmin,
        CancelLeaveRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<ManagerLeaveHistoryDto>>> GetManagerLeaveHistoryAsync(
        long reportingOfficialId,
        string? status,
        CancellationToken cancellationToken);

    Task<ApiResponse<ManagerLeaveStatsDto>> GetManagerLeaveStatsAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<SubordinateLeaveRegisterDto>>> GetManagerSubordinateRegisterAsync(
        long reportingOfficialId,
        string? financialYear,
        CancellationToken cancellationToken);
}
