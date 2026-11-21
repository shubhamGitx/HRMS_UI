using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.DAL.Login;

public sealed class LoginRepository(PostgreSqlDataAccess dataAccess) : ILoginRepository
{
    public async Task<LoginUser?> GetUserAsync(string userId, UserRole role, CancellationToken cancellationToken)
    {
        var data = await dataAccess.GetDataTableAsync(
            "SELECT * FROM login.fn_get_user(@user_id, @user_role)",
            new Dictionary<string, object?>
            {
                ["user_id"] = userId,
                ["user_role"] = role.ToString()
            }, cancellationToken);

        if (data.Rows.Count == 0) return null;
        var row = data.Rows[0];
        return new LoginUser(
            Convert.ToString(row["user_id"])!,
            Convert.ToInt64(row["subject_id"]),
            Convert.ToString(row["user_name"])!,
            Convert.ToString(row["password"])!,
            role,
            row["department_id"] is DBNull ? null : Convert.ToInt64(row["department_id"]),
            row["office_id"] is DBNull ? null : Convert.ToInt64(row["office_id"]),
            Convert.ToInt64(row["user_role_id"]),
            Convert.ToString(row["role_code"])!,
            row["reporting_official_id"] is DBNull ? null : Convert.ToInt64(row["reporting_official_id"]),
            row["reporting_official_name"] is DBNull ? null : Convert.ToString(row["reporting_official_name"]),
            row["mobile_number"] is DBNull ? null : Convert.ToString(row["mobile_number"]));
    }

    public Task UpdatePasswordAsync(string userId, UserRole role, string passwordHash, string changedBy, CancellationToken cancellationToken)
    {
        if (role == UserRole.Employee)
        {
            return dataAccess.ExecuteNonQueryAsync(
                "UPDATE login.employee_login SET password = @password, password_change_dt = CURRENT_DATE, record_updated_by = @changed_by, record_updated_on = CURRENT_TIMESTAMP WHERE user_id = @user_id",
                new Dictionary<string, object?>
                {
                    ["password"] = passwordHash,
                    ["changed_by"] = changedBy,
                    ["user_id"] = userId
                }, cancellationToken);
        }

        return dataAccess.ExecuteNonQueryAsync(
            "UPDATE login.official_login SET password = @password, last_password_change_date = CURRENT_TIMESTAMP, changed_by = @changed_by, record_updated_by = @changed_by, record_updated_on = CURRENT_TIMESTAMP WHERE user_id = @user_id",
            new Dictionary<string, object?>
            {
                ["password"] = passwordHash,
                ["changed_by"] = changedBy,
                ["user_id"] = userId
            }, cancellationToken);
    }
}
