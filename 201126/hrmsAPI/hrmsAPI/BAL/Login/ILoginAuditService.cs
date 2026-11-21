using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Login;

public interface ILoginAuditService
{
    Task WriteAsync(LoginAuditEntry entry, CancellationToken cancellationToken);
}
