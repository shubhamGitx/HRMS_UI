using HRMSAPI.AppCode;
using HRMSAPI.DAL.Login;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Login;

public sealed class LoginService(
    ILoginRepository loginRepository,
    IOtpRepository otpRepository,
    ILoginAuditService auditService,
    IJwtService jwtService,
    IConfiguration configuration,
    IHostEnvironment environment) : ILoginService
{
    public async Task<(bool Success, string Message, OtpResult? Data)> RequestOtpAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var role = request.UserRole!.Value;
        var user = await loginRepository.GetUserAsync(request.UserId.Trim(), role, cancellationToken);
        if (user is null || !PasswordUtility.Verify(request.Password, user.PasswordHash))
        {
            await auditService.WriteAsync(new LoginAuditEntry(
                request.UserId.Trim(), role.ToString(), LoginAuditEvents.CredentialFailed, false,
                "INVALID_CREDENTIALS"), cancellationToken);
            return (false, "Invalid user ID or password.", null);
        }

        var otp = await GenerateOtpAsync(user.UserId, OtpType.Login, cancellationToken);
        await auditService.WriteAsync(new LoginAuditEntry(
            user.UserId, role.ToString(), LoginAuditEvents.OtpGenerated, true,
            UserRoleId: user.RoleId), cancellationToken);
        return (true, "OTP generated successfully.", otp);
    }

    public async Task<(bool Success, string Message, OtpResult? Data)> ResendOtpAsync(ResendOtpRequest request, CancellationToken cancellationToken)
    {
        var role = request.UserRole!.Value;
        var user = await loginRepository.GetUserAsync(request.UserId.Trim(), role, cancellationToken);
        if (user is null) return (false, "User not found.", null);
        var otp = await GenerateOtpAsync(user.UserId, request.OtpType!.Value, cancellationToken);
        await auditService.WriteAsync(new LoginAuditEntry(
            user.UserId, role.ToString(), LoginAuditEvents.OtpResent, true,
            UserRoleId: user.RoleId), cancellationToken);
        return (true, "A new OTP has been generated.", otp);
    }

    public async Task<(bool Success, string Message, LoginResponse? Data)> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        if (request.OtpType != OtpType.Login)
            return (false, "This endpoint currently verifies login OTP only.", null);

        var role = request.UserRole!.Value;
        var user = await loginRepository.GetUserAsync(request.UserId.Trim(), role, cancellationToken);
        if (user is null) return (false, "User not found.", null);

        var verified = await otpRepository.VerifyAndConsumeAsync(
            user.UserId, OtpUtility.Hash(request.Otp), request.OtpType.Value, DateTimeOffset.UtcNow, cancellationToken);
        if (!verified.Success)
        {
            var eventType = verified.Expired ? LoginAuditEvents.OtpExpired : LoginAuditEvents.OtpMismatch;
            var failureReason = verified.Expired ? "OTP_EXPIRED" : "INVALID_OTP";
            await auditService.WriteAsync(new LoginAuditEntry(
                user.UserId, role.ToString(), eventType, false, failureReason, user.RoleId), cancellationToken);
            return (false, verified.Error!, null);
        }

        var loginSessionId = Guid.NewGuid();
        var authenticatedUser = new AuthenticatedUser(
            user.UserId,
            role == UserRole.Employee ? user.SubjectId : null,
            role == UserRole.Official ? user.SubjectId : null,
            user.UserName, role.ToString(), user.DepartmentId, user.OfficeId, user.RoleId, user.RoleCode,
            request.LangCode,
            loginSessionId,
            user.ReportingOfficialId, user.ReportingOfficialName);
        var (token, expiresAt) = jwtService.CreateToken(authenticatedUser);
        await auditService.WriteAsync(new LoginAuditEntry(
            user.UserId, role.ToString(), LoginAuditEvents.LoginSuccess, true,
            UserRoleId: user.RoleId, LoginSessionId: loginSessionId), cancellationToken);
        var landingRoute = role == UserRole.Employee ? "/dashboard?role=employee" : "/dashboard?role=admin";
        return (true, "Login successful.", new LoginResponse(token, expiresAt, authenticatedUser, landingRoute));
    }

    public Task LogoutAsync(string userId, string userType, long? roleId, Guid loginSessionId, CancellationToken cancellationToken) =>
        auditService.WriteAsync(new LoginAuditEntry(
            userId, userType, LoginAuditEvents.LogoutSuccess, true,
            UserRoleId: roleId, LoginSessionId: loginSessionId), cancellationToken);

    private async Task<OtpResult> GenerateOtpAsync(string userId, OtpType otpType, CancellationToken cancellationToken)
    {
        var otp = OtpUtility.Generate();
        var sentAt = DateTimeOffset.UtcNow;
        var validUntil = sentAt.AddMinutes(configuration.GetSection("Otp").GetValue<int>("ValidityMinutes", 5));
        await otpRepository.CreateAsync(userId, OtpUtility.Hash(otp), otpType, sentAt, validUntil, cancellationToken);
        return new OtpResult(userId, otpType, validUntil,
            Math.Max(0, (int)(validUntil - sentAt).TotalSeconds), configuration.GetValue<bool>("Otp:ExposeOtpInResponse", true) || environment.IsDevelopment() ? otp : null);
    }
}
