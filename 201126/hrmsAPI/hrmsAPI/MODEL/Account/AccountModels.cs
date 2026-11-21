using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Account;

public sealed class AccountInfoResponse
{
    public long OfficialId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string OfficialName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public long OfficeId { get; set; }
    public string OfficeName { get; set; } = string.Empty;
}

public sealed class RequestMobileChangeOtpRequest
{
    [Required, RegularExpression(@"^[6-9]\d{9}$", ErrorMessage = "Please enter a valid 10-digit mobile number.")]
    public string NewMobile { get; set; } = string.Empty;
}

public sealed class RequestMobileChangeOtpResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? CurrentMobileMasked { get; set; }
    public string? NewMobileMasked { get; set; }
    public string? TestCurrentOtp { get; set; }
    public string? TestNewOtp { get; set; }
    public int ExpiresInSeconds { get; set; } = 600;
}

public sealed class VerifyChangeMobileRequest
{
    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Current mobile OTP must be 6 digits.")]
    public string OldMobileOtp { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "New mobile OTP must be 6 digits.")]
    public string NewMobileOtp { get; set; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    [Required(ErrorMessage = "Current password is required.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "New password is required.")]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Confirm password is required.")]
    [Compare(nameof(NewPassword), ErrorMessage = "New password and confirmation password do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
