using HRMSAPI.MODEL.Account;

namespace HRMSAPI.DAL.Account;

public interface IAccountRepository
{
    Task<AccountInfoResponse?> GetAccountInfoAsync(string userId, CancellationToken token);
    Task<string?> GetPasswordHashAsync(string userId, CancellationToken token);
    Task<(bool Success, string Message, long? RequestId, string? OldMobile)> RequestMobileChangeOtpAsync(
        string userId, string newMobile, string oldOtpHash, string newOtpHash, DateTimeOffset expiresAt, string? ipAddress, CancellationToken token);
    Task<(bool Success, string Message, string? NewMobile)> VerifyAndUpdateMobileAsync(
        string userId, string oldOtpHash, string newOtpHash, string? ipAddress, CancellationToken token);
    Task<(bool Success, string Message)> ChangePasswordAsync(
        string userId, string newPasswordHash, string? ipAddress, CancellationToken token);
}
