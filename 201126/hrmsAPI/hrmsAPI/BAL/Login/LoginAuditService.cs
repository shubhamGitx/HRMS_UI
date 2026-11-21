using HRMSAPI.DAL.Login;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Login;

public sealed class LoginAuditService(
    ILoginAuditRepository repository,
    IHttpContextAccessor httpContextAccessor) : ILoginAuditService
{
    public Task WriteAsync(LoginAuditEntry entry, CancellationToken cancellationToken)
    {
        var request = httpContextAccessor.HttpContext?.Request;
        var forwardedFor = request?.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        var ipAddress = string.IsNullOrWhiteSpace(forwardedFor)
            ? httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString()
            : forwardedFor;
        var userAgent = request?.Headers.UserAgent.ToString();
        if (userAgent?.Length > 500) userAgent = userAgent[..500];
        return repository.WriteAsync(entry, ipAddress, userAgent, cancellationToken);
    }
}
