using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.DAL.Login;

public sealed class LoginAuditRepository(PostgreSqlDataAccess dataAccess) : ILoginAuditRepository
{
    public Task WriteAsync(LoginAuditEntry entry, string? ipAddress, string? userAgent, CancellationToken cancellationToken) =>
        dataAccess.ExecuteNonQueryAsync(
            """
            INSERT INTO login.login_audit
                (login_session_id, user_id, user_type, user_role_id, event_type,
                 is_success, failure_reason, event_time, ip_address, user_agent, created_at)
            VALUES
                (@login_session_id, @user_id, @user_type, @user_role_id, @event_type,
                 @is_success, @failure_reason, CURRENT_TIMESTAMP, @ip_address, @user_agent, CURRENT_TIMESTAMP)
            """,
            new Dictionary<string, object?>
            {
                ["login_session_id"] = entry.LoginSessionId,
                ["user_id"] = entry.UserId,
                ["user_type"] = entry.UserType,
                ["user_role_id"] = entry.UserRoleId,
                ["event_type"] = entry.EventType,
                ["is_success"] = entry.IsSuccess,
                ["failure_reason"] = entry.FailureReason,
                ["ip_address"] = ipAddress,
                ["user_agent"] = userAgent
            }, cancellationToken);
}
