using HRMSAPI.MODEL.Login;

namespace HRMSAPI.DAL.Login;

public interface IOtpRepository
{
    Task CreateAsync(string userId, string otpHash, OtpType otpType, DateTimeOffset sentAt, DateTimeOffset validUntil, CancellationToken cancellationToken);
    Task<VerifyOtpResult> VerifyAndConsumeAsync(string userId, string otpHash, OtpType otpType, DateTimeOffset now, CancellationToken cancellationToken);
}
