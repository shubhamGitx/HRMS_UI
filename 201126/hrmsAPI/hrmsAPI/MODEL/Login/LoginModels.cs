using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Login;

public enum UserRole
{
    Employee,
    Official
}

public enum OtpType
{
    Login,
    ForgotPassword
}

public sealed class LoginRequest
{
    [Required] public string UserId { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
    [Required] public UserRole? UserRole { get; set; }
    [Range(1, 2)] public short LangCode { get; set; } = 1;
}

public sealed class VerifyOtpRequest
{
    [Required] public string UserId { get; set; } = string.Empty;
    [Required, RegularExpression("^[0-9]{6}$")] public string Otp { get; set; } = string.Empty;
    [Required] public OtpType? OtpType { get; set; }
    [Required] public UserRole? UserRole { get; set; }
    [Range(1, 2)] public short LangCode { get; set; } = 1;
}

public sealed class ResendOtpRequest
{
    [Required] public string UserId { get; set; } = string.Empty;
    [Required] public OtpType? OtpType { get; set; }
    [Required] public UserRole? UserRole { get; set; }
    [Range(1, 2)] public short LangCode { get; set; } = 1;
}

public sealed class ForgotPasswordRequest
{
    [Required] public string UserId { get; set; } = string.Empty;
    [Required, RegularExpression("^[0-9]{10}$")] public string MobileNumber { get; set; } = string.Empty;
    [Required] public UserRole? UserRole { get; set; }
}

public sealed class ResetPasswordRequest
{
    [Required] public string UserId { get; set; } = string.Empty;
    [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
    [Required] public string ResetToken { get; set; } = string.Empty;
    [Required] public UserRole? UserRole { get; set; }
}

public sealed record LoginUser(
    string UserId,
    long SubjectId,
    string UserName,
    string PasswordHash,
    UserRole UserRole,
    long? DepartmentId,
    long? OfficeId,
    long RoleId,
    string RoleCode,
    long? ReportingOfficialId,
    string? ReportingOfficialName,
    string? MobileNumber);

public sealed record OtpResult(
    string UserId,
    OtpType OtpType,
    DateTimeOffset ValidUntil,
    int ExpiresInSeconds,
    string? DevelopmentOtp);

public sealed record AuthenticatedUser(
    string UserId,
    long? EmployeeId,
    long? OfficialId,
    string UserName,
    string UserRole,
    long? DepartmentId,
    long? OfficeId,
    long RoleId,
    string RoleCode,
    short LangCode,
    Guid LoginSessionId,
    long? ReportingOfficialId,
    string? ReportingOfficialName);

public sealed record LoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    AuthenticatedUser User,
    string LandingRoute);

public sealed record VerifyOtpResult(bool Success, string? Error, bool Expired = false);

