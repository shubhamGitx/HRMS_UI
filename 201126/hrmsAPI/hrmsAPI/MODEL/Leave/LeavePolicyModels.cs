using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Leave;

/// <summary>
/// Model representing the database-driven leave policy from leave_mgmt.leave_policy
/// </summary>
public sealed class LeavePolicyDto
{
    public long PolicyId { get; set; }
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public long? DepartmentId { get; set; }
    public string? DepartmentCode { get; set; }
    public string? DepartmentName { get; set; }
    public decimal AnnualEntitlement { get; set; }
    public int MaxConsecutiveDays { get; set; }
    public bool CarryForwardAllowed { get; set; }
    public decimal MaxCarryForward { get; set; }
    public bool AllowHalfDay { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; }
    public bool IsDepartmentSpecific => DepartmentId.HasValue;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Combined Employee Leave Entitlement & Policy Rule Information
/// Exactly matches the frontend requirement for display and validations
/// </summary>
public sealed class EmployeeLeaveEntitlementDto
{
    public long LeaveTypeId { get; set; }
    public string LeaveTypeCode { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public decimal AnnualEntitlement { get; set; }
    public decimal EligibleCarryForward { get; set; }
    public decimal TotalAllocatedQuota => AnnualEntitlement + EligibleCarryForward;
    public decimal UsedLeaves { get; set; }
    public decimal PendingLeaves { get; set; }
    public decimal AvailableBalance { get; set; }
    public int MaxConsecutiveDays { get; set; }
    public bool CarryForwardAllowed { get; set; }
    public decimal MaxCarryForward { get; set; }
    public bool AllowHalfDay { get; set; }
    public long? PolicyId { get; set; }
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool HasPolicyConflict { get; set; }
    public string? ConflictMessage { get; set; }
}

/// <summary>
/// DTO for creating or updating leave policy
/// </summary>
public sealed class SaveLeavePolicyRequest
{
    public long? PolicyId { get; set; }

    [Required(ErrorMessage = "Leave type is required.")]
    public long LeaveTypeId { get; set; }

    public long? DepartmentId { get; set; }

    [Range(0, 365, ErrorMessage = "Annual entitlement must be between 0 and 365 days.")]
    public decimal AnnualEntitlement { get; set; }

    [Range(1, 365, ErrorMessage = "Max consecutive days must be between 1 and 365 days.")]
    public int MaxConsecutiveDays { get; set; }

    public bool CarryForwardAllowed { get; set; } = false;

    [Range(0, 365, ErrorMessage = "Max carry forward must be between 0 and 365 days.")]
    public decimal MaxCarryForward { get; set; } = 0;

    public bool AllowHalfDay { get; set; } = true;

    [Required(ErrorMessage = "Effective from date is required.")]
    public DateTime EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }

    public bool IsActive { get; set; } = true;
}
