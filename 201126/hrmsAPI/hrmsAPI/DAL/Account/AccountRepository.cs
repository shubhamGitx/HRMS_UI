using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Account;

namespace HRMSAPI.DAL.Account;

public sealed class AccountRepository(PostgreSqlDataAccess dataAccess) : IAccountRepository
{
    public async Task<AccountInfoResponse?> GetAccountInfoAsync(string userId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(
            "SELECT * FROM official.fn_get_official_account_info(@p_user_id)",
            new Dictionary<string, object?> { ["p_user_id"] = userId }, token);

        if (dt.Rows.Count == 0)
        {
            var empDt = await dataAccess.GetDataTableAsync("""
                SELECT 
                    e.employee_id AS official_id,
                    COALESCE(e.emp_code, e.contract_no, @p_user_id) AS user_id,
                    e.emp_name AS official_name,
                    COALESCE(e.official_mobile, e.personal_mobile, '') AS phone,
                    COALESCE(e.official_email, e.personal_email, '') AS email,
                    COALESCE(desig.designation_name, 'Contractual Staff') AS designation,
                    COALESCE(e.office_id, 1) AS office_id,
                    COALESCE(m.office_name, 'State Secretariat') AS office_name
                FROM employee.employee_master e
                LEFT JOIN master.designation_master desig ON desig.designation_id = e.designation_id
                LEFT JOIN master.office_master m ON m.office_id = e.office_id AND m.lang_code = 1
                WHERE UPPER(TRIM(e.emp_code)) = UPPER(TRIM(@p_user_id))
                   OR UPPER(TRIM(e.contract_no)) = UPPER(TRIM(@p_user_id))
                   OR e.employee_id = (SELECT employee_id FROM login.employee_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@p_user_id)) LIMIT 1)
                LIMIT 1
                """, new Dictionary<string, object?> { ["p_user_id"] = userId }, token);

            if (empDt.Rows.Count == 0) return null;
            dt = empDt;
        }

        var row = dt.Rows[0];
        return new AccountInfoResponse
        {
            OfficialId = Convert.ToInt64(row["official_id"]),
            UserId = Convert.ToString(row["user_id"]) ?? string.Empty,
            OfficialName = Convert.ToString(row["official_name"]) ?? string.Empty,
            Phone = Convert.ToString(row["phone"]) ?? string.Empty,
            Email = Convert.ToString(row["email"]) ?? string.Empty,
            Designation = Convert.ToString(row["designation"]) ?? string.Empty,
            OfficeId = Convert.ToInt64(row["office_id"]),
            OfficeName = Convert.ToString(row["office_name"]) ?? string.Empty
        };
    }

    public async Task<string?> GetPasswordHashAsync(string userId, CancellationToken token)
    {
        var result = await dataAccess.ExecuteScalarAsync<string>(
            "SELECT password FROM login.official_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id))",
            new Dictionary<string, object?> { ["user_id"] = userId }, token);

        if (string.IsNullOrWhiteSpace(result))
        {
            result = await dataAccess.ExecuteScalarAsync<string>("""
                SELECT password FROM login.employee_login 
                WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id))
                   OR employee_id = (SELECT employee_id FROM employee.employee_master WHERE UPPER(TRIM(emp_code)) = UPPER(TRIM(@user_id)) OR UPPER(TRIM(contract_no)) = UPPER(TRIM(@user_id)) LIMIT 1)
                LIMIT 1
                """, new Dictionary<string, object?> { ["user_id"] = userId }, token);
        }

        return result;
    }

    public async Task<(bool Success, string Message, long? RequestId, string? OldMobile)> RequestMobileChangeOtpAsync(
        string userId, string newMobile, string oldOtpHash, string newOtpHash, DateTimeOffset expiresAt, string? ipAddress, CancellationToken token)
    {
        var isOfficial = await dataAccess.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM login.official_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id)))",
            new Dictionary<string, object?> { ["user_id"] = userId }, token);

        if (isOfficial)
        {
            var dt = await dataAccess.GetDataTableAsync("""
                SELECT * FROM official.fn_request_mobile_change_otp(
                    @p_user_id, @p_new_mobile, @p_old_otp_hash, @p_new_otp_hash, @p_expires_at, @p_ip_address
                )
                """, new Dictionary<string, object?>
            {
                ["p_user_id"] = userId,
                ["p_new_mobile"] = newMobile.Trim(),
                ["p_old_otp_hash"] = oldOtpHash,
                ["p_new_otp_hash"] = newOtpHash,
                ["p_expires_at"] = expiresAt,
                ["p_ip_address"] = ipAddress
            }, token);

            if (dt.Rows.Count == 0)
                return (false, "Failed to request mobile change OTP.", null, null);

            var row = dt.Rows[0];
            var success = Convert.ToBoolean(row["success"]);
            var message = Convert.ToString(row["message"]) ?? string.Empty;
            var requestId = row["request_id"] is DBNull ? (long?)null : Convert.ToInt64(row["request_id"]);
            var oldMobile = row["old_mobile"] is DBNull ? null : Convert.ToString(row["old_mobile"]);

            return (success, message, requestId, oldMobile);
        }
        else
        {
            var empMobileDt = await dataAccess.GetDataTableAsync("""
                SELECT employee_id, COALESCE(official_mobile, personal_mobile, '') AS phone
                FROM employee.employee_master
                WHERE UPPER(TRIM(emp_code)) = UPPER(TRIM(@user_id))
                   OR UPPER(TRIM(contract_no)) = UPPER(TRIM(@user_id))
                   OR employee_id = (SELECT employee_id FROM login.employee_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id)) LIMIT 1)
                LIMIT 1
                """, new Dictionary<string, object?> { ["user_id"] = userId }, token);

            if (empMobileDt.Rows.Count == 0)
                return (false, "Employee user record not found.", null, null);

            var empId = Convert.ToInt64(empMobileDt.Rows[0]["employee_id"]);
            var currentPhone = Convert.ToString(empMobileDt.Rows[0]["phone"]) ?? string.Empty;

            if (currentPhone == newMobile.Trim())
                return (false, "New mobile number cannot be the same as current registered mobile number.", null, null);

            await dataAccess.ExecuteNonQueryAsync("""
                UPDATE official.mobile_change_request
                SET is_completed = false, expires_at = CURRENT_TIMESTAMP
                WHERE user_id = @user_id AND is_completed = false
                """, new Dictionary<string, object?> { ["user_id"] = userId }, token);

            var reqDt = await dataAccess.GetDataTableAsync("""
                INSERT INTO official.mobile_change_request(
                    user_id, official_id, old_mobile, new_mobile,
                    old_mobile_otp_hash, new_mobile_otp_hash,
                    expires_at, ip_address
                )
                VALUES (
                    @user_id, @emp_id, @old_mobile, @new_mobile,
                    @old_hash, @new_hash, @expires_at, CAST(NULLIF(@ip, '') AS inet)
                )
                RETURNING request_id
                """, new Dictionary<string, object?>
            {
                ["user_id"] = userId,
                ["emp_id"] = empId,
                ["old_mobile"] = currentPhone,
                ["new_mobile"] = newMobile.Trim(),
                ["old_hash"] = oldOtpHash,
                ["new_hash"] = newOtpHash,
                ["expires_at"] = expiresAt,
                ["ip"] = ipAddress
            }, token);

            var reqId = reqDt.Rows.Count > 0 ? Convert.ToInt64(reqDt.Rows[0]["request_id"]) : (long?)null;
            return (true, "OTP generated successfully.", reqId, currentPhone);
        }
    }

    public async Task<(bool Success, string Message, string? NewMobile)> VerifyAndUpdateMobileAsync(
        string userId, string oldOtpHash, string newOtpHash, string? ipAddress, CancellationToken token)
    {
        var isOfficial = await dataAccess.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM login.official_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id)))",
            new Dictionary<string, object?> { ["user_id"] = userId }, token);

        if (isOfficial)
        {
            var dt = await dataAccess.GetDataTableAsync("""
                SELECT * FROM official.fn_verify_and_update_mobile(
                    @p_user_id, @p_old_otp_hash, @p_new_otp_hash, @p_ip_address
                )
                """, new Dictionary<string, object?>
            {
                ["p_user_id"] = userId,
                ["p_old_otp_hash"] = oldOtpHash,
                ["p_new_otp_hash"] = newOtpHash,
                ["p_ip_address"] = ipAddress
            }, token);

            if (dt.Rows.Count == 0)
                return (false, "Failed to verify and update mobile number.", null);

            var row = dt.Rows[0];
            var success = Convert.ToBoolean(row["success"]);
            var message = Convert.ToString(row["message"]) ?? string.Empty;
            var newMobile = row["new_mobile"] is DBNull ? null : Convert.ToString(row["new_mobile"]);

            return (success, message, newMobile);
        }
        else
        {
            var reqDt = await dataAccess.GetDataTableAsync("""
                SELECT request_id, new_mobile, official_id
                FROM official.mobile_change_request
                WHERE user_id = @user_id
                  AND old_mobile_otp_hash = @old_hash
                  AND new_mobile_otp_hash = @new_hash
                  AND is_completed = false
                  AND expires_at > CURRENT_TIMESTAMP
                ORDER BY request_id DESC LIMIT 1
                """, new Dictionary<string, object?>
            {
                ["user_id"] = userId,
                ["old_hash"] = oldOtpHash,
                ["new_hash"] = newOtpHash
            }, token);

            if (reqDt.Rows.Count == 0)
                return (false, "Invalid or expired OTPs. Please try again.", null);

            var reqId = Convert.ToInt64(reqDt.Rows[0]["request_id"]);
            var newMobile = Convert.ToString(reqDt.Rows[0]["new_mobile"])!;
            var empId = Convert.ToInt64(reqDt.Rows[0]["official_id"]);

            await dataAccess.ExecuteNonQueryAsync("""
                UPDATE official.mobile_change_request SET is_completed = true WHERE request_id = @req_id;
                UPDATE employee.employee_master SET official_mobile = @new_mobile WHERE employee_id = @emp_id;
                """, new Dictionary<string, object?>
            {
                ["req_id"] = reqId,
                ["new_mobile"] = newMobile,
                ["emp_id"] = empId
            }, token);

            return (true, "Mobile number updated successfully.", newMobile);
        }
    }

    public async Task<(bool Success, string Message)> ChangePasswordAsync(
        string userId, string newPasswordHash, string? ipAddress, CancellationToken token)
    {
        var isOfficial = await dataAccess.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM login.official_login WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id)))",
            new Dictionary<string, object?> { ["user_id"] = userId }, token);

        if (isOfficial)
        {
            var dt = await dataAccess.GetDataTableAsync("""
                SELECT * FROM official.fn_change_official_password(
                    @p_user_id, @p_new_password_hash, @p_ip_address
                )
                """, new Dictionary<string, object?>
            {
                ["p_user_id"] = userId,
                ["p_new_password_hash"] = newPasswordHash,
                ["p_ip_address"] = ipAddress
            }, token);

            if (dt.Rows.Count == 0)
                return (false, "Failed to change password.");

            var row = dt.Rows[0];
            var success = Convert.ToBoolean(row["success"]);
            var message = Convert.ToString(row["message"]) ?? string.Empty;

            return (success, message);
        }
        else
        {
            var affected = await dataAccess.ExecuteNonQueryAsync("""
                UPDATE login.employee_login
                SET password = @new_hash,
                    password_change_dt = CURRENT_DATE,
                    record_updated_on = CURRENT_TIMESTAMP
                WHERE UPPER(TRIM(user_id)) = UPPER(TRIM(@user_id))
                   OR employee_id = (SELECT employee_id FROM employee.employee_master WHERE UPPER(TRIM(emp_code)) = UPPER(TRIM(@user_id)) OR UPPER(TRIM(contract_no)) = UPPER(TRIM(@user_id)) LIMIT 1)
                """, new Dictionary<string, object?>
            {
                ["user_id"] = userId,
                ["new_hash"] = newPasswordHash
            }, token);

            return affected > 0 ? (true, "Password changed successfully.") : (false, "Employee user record not found.");
        }
    }
}
