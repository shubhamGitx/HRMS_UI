using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Login;

public interface ILoginService
{
    Task<(bool Success, string Message, OtpResult? Data)> RequestOtpAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<(bool Success, string Message, OtpResult? Data)> ResendOtpAsync(ResendOtpRequest request, CancellationToken cancellationToken);
    Task<(bool Success, string Message, LoginResponse? Data)> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(string userId, string userType, long? roleId, Guid loginSessionId, CancellationToken cancellationToken);
}
