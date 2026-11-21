using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Leave;

public sealed class LeaveReasonDto
{
    public int Id { get; set; }
    public string ReasonName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ApplyLeaveRequest
{
    public long? EmployeeId { get; set; }

    [Required(ErrorMessage = "Leave type is required.")]
    public long LeaveTypeId { get; set; }

    [Required(ErrorMessage = "Leave reason is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Please select a valid leave reason.")]
    public int LeaveReasonId { get; set; }

    /// <summary>
    /// Optional alias supporting both leave_reason and leave_reason_id payload conventions
    /// </summary>
    public int? LeaveReason
    {
        get => LeaveReasonId;
        set
        {
            if (value.HasValue && value.Value > 0)
            {
                LeaveReasonId = value.Value;
            }
        }
    }

    [Required(ErrorMessage = "From Date is required.")]
    public DateTime FromDate { get; set; }

    [Required(ErrorMessage = "To Date is required.")]
    public DateTime ToDate { get; set; }

    [StringLength(500, ErrorMessage = "Reason remarks cannot exceed 500 characters.")]
    public string? Reason { get; set; }

    public bool IsHalfDay { get; set; } = false;

    public string FromDayType { get; set; } = "FULL"; // "FULL" or "HALF"
    public string? FromHalfSession { get; set; } // "FIRST_HALF" or "SECOND_HALF"
    public string ToDayType { get; set; } = "FULL"; // "FULL" or "HALF"
    public string? ToHalfSession { get; set; } // "FIRST_HALF" or "SECOND_HALF"
}

public sealed class ApplyLeaveResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long? LeaveId { get; set; }
    public decimal TotalDays { get; set; }
    public decimal RemainingBalance { get; set; }
    public int TotalCalendarDays { get; set; }
    public int HolidayDaysCount { get; set; }
    public int WeeklyOffDaysCount { get; set; }
    public string FinancialYear { get; set; } = string.Empty;
}

public sealed class HolidayDto
{
    public long HolidayId { get; set; }
    public DateTime HolidayDate { get; set; }
    public string HolidayName { get; set; } = string.Empty;
    public string HolidayType { get; set; } = "OFFICIAL";
    public string? Description { get; set; }
}

public sealed class LeaveCalculationRequest
{
    public long? EmployeeId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public long LeaveTypeId { get; set; } = 1;
    public bool IsHalfDay { get; set; } = false;
    public string FromDayType { get; set; } = "FULL";
    public string? FromHalfSession { get; set; }
    public string ToDayType { get; set; } = "FULL";
    public string? ToHalfSession { get; set; }
}

public sealed class ChargeableLeaveBreakdownDto
{
    public decimal ChargeableDays { get; set; }
    public decimal LeaveDays => ChargeableDays;
    public int TotalCalendarDays { get; set; }
    public int HolidayDaysCount { get; set; }
    public int WeeklyOffDaysCount { get; set; }
    public bool IsFromDateHoliday { get; set; }
    public string? FromDateHolidayName { get; set; }
    public bool IsToDateHoliday { get; set; }
    public string? ToDateHolidayName { get; set; }
    public bool IsFromDateWeekend { get; set; }
    public bool IsToDateWeekend { get; set; }
    public bool IsValid { get; set; } = true;
    public string? ValidationMessage { get; set; }
    public List<HolidayDto> ExcludedHolidays { get; set; } = [];
    public List<string> ExcludedWeeklyOffDates { get; set; } = [];
}

public sealed class LeaveBalanceDto
{
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public decimal AnnualAllowed { get; set; } = 10;
    public decimal ConsumedApproved { get; set; }
    public decimal PendingApplied { get; set; }
    public decimal Balance { get; set; } = 10;
}

public sealed class EmployeeLeaveDto
{
    public long LeaveId { get; set; }
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public int? LeaveReasonId { get; set; }
    public string? ReasonName { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalDays { get; set; }
    public string FinancialYear { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string LeaveStatus { get; set; } = string.Empty; // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    public string? RejectionReason { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime AppliedDate { get; set; }
    public DateTime? ActionDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    public bool IsHalfDay { get; set; }
    public string? HalfDaySession { get; set; }
    public string FromDayType { get; set; } = "FULL";
    public string? FromHalfSession { get; set; }
    public string ToDayType { get; set; } = "FULL";
    public string? ToHalfSession { get; set; }
}

public sealed class ManagerPendingLeaveDto
{
    public long LeaveId { get; set; }
    public long EmployeeId { get; set; }
    public string EmpName { get; set; } = string.Empty;
    public string ContractNo { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public string OfficeName { get; set; } = string.Empty;
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public int? LeaveReasonId { get; set; }
    public string? ReasonName { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalDays { get; set; }
    public string FinancialYear { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string LeaveStatus { get; set; } = string.Empty;
    public DateTime AppliedDate { get; set; }
    public bool IsHalfDay { get; set; }
    public string? HalfDaySession { get; set; }
    public string FromDayType { get; set; } = "FULL";
    public string? FromHalfSession { get; set; }
    public string ToDayType { get; set; } = "FULL";
    public string? ToHalfSession { get; set; }
}

public sealed class ActionLeaveRequest
{
    [Required(ErrorMessage = "Leave ID is required.")]
    public long LeaveId { get; set; }

    [Required(ErrorMessage = "Action is required. Must be 'APPROVE', 'REJECT', or 'CANCEL'.")]
    public string Action { get; set; } = string.Empty; // 'APPROVE', 'REJECT', 'CANCEL'

    public string? RejectionReason { get; set; }
    public string? CancellationReason { get; set; }
}

public sealed class ActionLeaveResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long? LeaveId { get; set; }
    public string NewStatus { get; set; } = string.Empty;
}

public sealed class CancelLeaveRequest
{
    [Required(ErrorMessage = "Leave ID is required.")]
    public long LeaveId { get; set; }

    [StringLength(500, ErrorMessage = "Cancellation remarks cannot exceed 500 characters.")]
    public string? CancellationReason { get; set; }
}

public sealed class CancelLeaveResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long? LeaveId { get; set; }
    public decimal RestoredDays { get; set; }
    public string NewStatus { get; set; } = string.Empty;
}

public sealed class ManagerLeaveHistoryDto
{
    public long LeaveId { get; set; }
    public long EmployeeId { get; set; }
    public string EmpName { get; set; } = string.Empty;
    public string ContractNo { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public string OfficeName { get; set; } = string.Empty;
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public int? LeaveReasonId { get; set; }
    public string? ReasonName { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalDays { get; set; }
    public string FinancialYear { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string LeaveStatus { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime AppliedDate { get; set; }
    public DateTime? ActionDate { get; set; }
    public string ActionOfficialName { get; set; } = string.Empty;
}

public sealed class ManagerLeaveStatsDto
{
    public long PendingApprovalCount { get; set; }
    public long SanctionedThisMonthCount { get; set; }
    public long StaffOnLeaveTodayCount { get; set; }
    public long TotalSubordinatesCount { get; set; }
    public List<ManagerQuotaReportDto> QuotaUtilization { get; set; } = new();
}

public sealed class ManagerQuotaReportDto
{
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public decimal TotalSanctionedDays { get; set; }
    public decimal TotalAllocatedDays { get; set; }
    public decimal UtilizationPercentage { get; set; }
}

public sealed class SubordinateLeaveRegisterDto
{
    public long EmployeeId { get; set; }
    public string EmpName { get; set; } = string.Empty;
    public string ContractNo { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public string OfficeName { get; set; } = string.Empty;
    public decimal ClDays { get; set; }
    public decimal ElDays { get; set; }
    public decimal PlDays { get; set; }
    public decimal SlDays { get; set; }
    public decimal TotalDays { get; set; }
}
