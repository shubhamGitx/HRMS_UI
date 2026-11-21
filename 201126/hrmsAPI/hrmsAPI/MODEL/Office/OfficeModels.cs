using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Office;

public sealed class CreateOfficeRequest
{
    [Required(ErrorMessage = "Office name is required.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "Office name must be between 3 and 150 characters.")]
    public string OfficeName { get; set; } = string.Empty;

    public string? OfficeNameHindi { get; set; }

    [Required(ErrorMessage = "Office Admin name is required.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "Admin name must be between 3 and 150 characters.")]
    public string AdminName { get; set; } = string.Empty;

    [RegularExpression(@"^[6-9]\d{9}$", ErrorMessage = "Please enter a valid 10-digit Indian mobile number.")]
    public string? AdminPhone { get; set; }

    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    public string? AdminEmail { get; set; }

    [RegularExpression(@"^[a-zA-Z0-9_]{3,30}$", ErrorMessage = "User ID must be 3-30 characters (letters, numbers, underscore only).")]
    public string? AdminUserId { get; set; }

    public string? AdminPassword { get; set; }
}

public sealed class OfficeCreatedResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long OfficeId { get; set; }
    public string OfficeName { get; set; } = string.Empty;
    public long OfficialId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string DefaultPassword { get; set; } = string.Empty;
}

public sealed class DepartmentOfficeDto
{
    public long OfficeId { get; set; }
    public string OfficeName { get; set; } = string.Empty;
    public string? OfficeNameHindi { get; set; }
    public long DepartmentId { get; set; }
    public long? AdminOfficialId { get; set; }
    public string? AdminName { get; set; }
    public string? AdminPhone { get; set; }
    public string? AdminEmail { get; set; }
    public string? AdminUserId { get; set; }
    public long TotalEmployees { get; set; }
    public bool IsActive { get; set; }
}
