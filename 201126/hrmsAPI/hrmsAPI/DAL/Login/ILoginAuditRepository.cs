using HRMSAPI.MODEL.Login;

namespace HRMSAPI.DAL.Login;

public interface ILoginAuditRepository
{
    Task WriteAsync(LoginAuditEntry entry, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
}
