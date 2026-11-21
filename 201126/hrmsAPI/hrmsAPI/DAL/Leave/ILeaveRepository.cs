using HRMSAPI.MODEL.Leave;

namespace HRMSAPI.DAL.Leave;

public interface ILeaveRepository
{
    Task<IReadOnlyList<LeaveReasonDto>> GetLeaveReasonsAsync(CancellationToken cancellationToken);

    Task<LeaveReasonDto?> GetLeaveReasonByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<HolidayDto>> GetHolidaysAsync(int? year, CancellationToken cancellationToken);

    Task<ChargeableLeaveBreakdownDto> CalculateChargeableLeaveDaysAsync(
        long employeeId,
        DateTime fromDate,
        DateTime toDate,
        long leaveTypeId,
        bool isHalfDay,
        string fromDayType,
        string? fromHalfSession,
        string toDayType,
        string? toHalfSession,
        CancellationToken cancellationToken);

    Task<ApplyLeaveResult> ApplyLeaveAsync(
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
        CancellationToken cancellationToken);

    Task<IReadOnlyList<LeaveBalanceDto>> GetEmployeeLeaveBalancesAsync(
        long employeeId,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<EmployeeLeaveDto>> GetEmployeeLeavesAsync(
        long employeeId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ManagerPendingLeaveDto>> GetManagerPendingLeavesAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken);

    Task<ActionLeaveResult> ActionLeaveAsync(
        long leaveId,
        long officialId,
        string action,
        string? rejectionReason,
        CancellationToken cancellationToken);

    Task<CancelLeaveResult> CancelLeaveAsync(
        long leaveId,
        long userId,
        bool isOfficialOrAdmin,
        string? cancellationReason,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ManagerLeaveHistoryDto>> GetManagerLeaveHistoryAsync(
        long reportingOfficialId,
        string? status,
        CancellationToken cancellationToken);

    Task<ManagerLeaveStatsDto> GetManagerLeaveStatsAsync(
        long reportingOfficialId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<SubordinateLeaveRegisterDto>> GetManagerSubordinateRegisterAsync(
        long reportingOfficialId,
        string? financialYear,
        CancellationToken cancellationToken);
}
