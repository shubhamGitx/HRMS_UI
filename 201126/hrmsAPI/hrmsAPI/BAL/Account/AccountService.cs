using HRMSAPI.AppCode;
using HRMSAPI.DAL.Account;
using HRMSAPI.MODEL.Account;

namespace HRMSAPI.BAL.Account;

public sealed class AccountService(
    IAccountRepository repository,
    IHostEnvironment environment) : IAccountService
{
    public Task<AccountInfoResponse?> GetAccountInfoAsync(string userId, CancellationToken token) =>
        repository.GetAccountInfoAsync(userId, token);

    public async Task<RequestMobileChangeOtpResponse> RequestMobileChangeOtpAsync(
        string userId, RequestMobileChangeOtpRequest request, string? ipAddress, CancellationToken token)
    {
        var oldOtp = OtpUtility.Generate();
        var newOtp = OtpUtility.Generate();
        var oldOtpHash = OtpUtility.Hash(oldOtp);
        var newOtpHash = OtpUtility.Hash(newOtp);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(10);

        var (success, message, _, oldMobile) = await repository.RequestMobileChangeOtpAsync(
            userId, request.NewMobile.Trim(), oldOtpHash, newOtpHash, expiresAt, ipAddress, token);

        if (!success)
        {
            return new RequestMobileChangeOtpResponse
            {
                Success = false,
                Message = message
            };
        }

        var isDev = environment.IsDevelopment();
        return new RequestMobileChangeOtpResponse
        {
            Success = true,
            Message = "Verification OTPs generated for registered and new mobile numbers.",
            CurrentMobileMasked = MaskMobile(oldMobile),
            NewMobileMasked = MaskMobile(request.NewMobile.Trim()),
            TestCurrentOtp = isDev ? oldOtp : null,
            TestNewOtp = isDev ? newOtp : null,
            ExpiresInSeconds = 600
        };
    }

    public Task<(bool Success, string Message, string? NewMobile)> VerifyChangeMobileAsync(
        string userId, VerifyChangeMobileRequest request, string? ipAddress, CancellationToken token)
    {
        var oldOtpHash = OtpUtility.Hash(request.OldMobileOtp.Trim());
        var newOtpHash = OtpUtility.Hash(request.NewMobileOtp.Trim());

        return repository.VerifyAndUpdateMobileAsync(userId, oldOtpHash, newOtpHash, ipAddress, token);
    }

    public async Task<(bool Success, string Message)> ChangePasswordAsync(
        string userId, ChangePasswordRequest request, string? ipAddress, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            return (false, "Current password is required.");

        if (string.IsNullOrWhiteSpace(request.NewPassword))
            return (false, "New password is required.");

        if (request.NewPassword != request.ConfirmPassword)
            return (false, "New password and confirmation password do not match.");

        if (request.CurrentPassword == request.NewPassword)
            return (false, "New password cannot be the same as your current password.");

        var storedHash = await repository.GetPasswordHashAsync(userId, token);
        if (storedHash is null || !PasswordUtility.Verify(request.CurrentPassword, storedHash))
        {
            return (false, "Current password does not match our records.");
        }

        var newHash = PasswordUtility.Hash(request.NewPassword);
        return await repository.ChangePasswordAsync(userId, newHash, ipAddress, token);
    }

    private static string MaskMobile(string? mobile)
    {
        if (string.IsNullOrWhiteSpace(mobile) || mobile.Length < 10) return "******" + (mobile?.Length >= 4 ? mobile[^4..] : "");
        var digits = mobile.Trim();
        return $"{digits[..2]}******{digits[^2..]}";
    }
}
