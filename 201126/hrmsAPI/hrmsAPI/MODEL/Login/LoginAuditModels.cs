namespace HRMSAPI.MODEL.Login;

public static class LoginAuditEvents
{
    public const string CredentialFailed = "LOGIN_CREDENTIAL_FAILED";
    public const string OtpGenerated = "LOGIN_OTP_GENERATED";
    public const string OtpResent = "LOGIN_OTP_RESENT";
    public const string OtpMismatch = "LOGIN_OTP_MISMATCH";
    public const string OtpExpired = "LOGIN_OTP_EXPIRED";
    public const string LoginSuccess = "LOGIN_SUCCESS";
    public const string LogoutSuccess = "LOGOUT_SUCCESS";
}

public sealed record LoginAuditEntry(
    string UserId,
    string UserType,
    string EventType,
    bool IsSuccess,
    string? FailureReason = null,
    long? UserRoleId = null,
    Guid? LoginSessionId = null);
