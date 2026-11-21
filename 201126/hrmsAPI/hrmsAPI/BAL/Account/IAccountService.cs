using HRMSAPI.MODEL.Account;

namespace HRMSAPI.BAL.Account;

public interface IAccountService
{
    Task<AccountInfoResponse?> GetAccountInfoAsync(string userId, CancellationToken token);
    Task<RequestMobileChangeOtpResponse> RequestMobileChangeOtpAsync(
        string userId, RequestMobileChangeOtpRequest request, string? ipAddress, CancellationToken token);
    Task<(bool Success, string Message, string? NewMobile)> VerifyChangeMobileAsync(
        string userId, VerifyChangeMobileRequest request, string? ipAddress, CancellationToken token);
    Task<(bool Success, string Message)> ChangePasswordAsync(
        string userId, ChangePasswordRequest request, string? ipAddress, CancellationToken token);
}
