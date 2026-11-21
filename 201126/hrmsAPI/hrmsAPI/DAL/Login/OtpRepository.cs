using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Login;
using Npgsql;

namespace HRMSAPI.DAL.Login;

public sealed class OtpRepository(PostgreSqlDataAccess dataAccess) : IOtpRepository
{
    public Task CreateAsync(string userId, string otpHash, OtpType otpType, DateTimeOffset sentAt, DateTimeOffset validUntil, CancellationToken cancellationToken) =>
        dataAccess.ExecuteInTransactionAsync(async (connection, transaction, token) =>
        {
            await using (var invalidate = PostgreSqlDataAccess.CreateTransactionalCommand(
                "UPDATE otp.login_otp SET is_valid = FALSE WHERE user_id = @user_id AND is_valid = TRUE",
                connection, transaction, new Dictionary<string, object?> { ["user_id"] = userId }))
            {
                await invalidate.ExecuteNonQueryAsync(token);
            }

            await using var insert = PostgreSqlDataAccess.CreateTransactionalCommand(
                """
                INSERT INTO otp.login_otp (user_id, otp_hash, otp_type, otp_sent_at, valid_until, is_valid)
                VALUES (@user_id, @otp_hash, @otp_type, @otp_sent_at, @valid_until, TRUE)
                """, connection, transaction, new Dictionary<string, object?>
                {
                    ["user_id"] = userId,
                    ["otp_hash"] = otpHash,
                    ["otp_type"] = otpType.ToString(),
                    ["otp_sent_at"] = sentAt,
                    ["valid_until"] = validUntil
                });
            await insert.ExecuteNonQueryAsync(token);
            return 0;
        }, cancellationToken);

    public Task<VerifyOtpResult> VerifyAndConsumeAsync(string userId, string otpHash, OtpType otpType, DateTimeOffset now, CancellationToken cancellationToken) =>
        dataAccess.ExecuteInTransactionAsync(async (connection, transaction, token) =>
        {
            const string selectSql = """
                SELECT id, otp_hash, valid_until
                FROM otp.login_otp
                WHERE user_id = @user_id AND otp_type = @otp_type AND is_valid = TRUE
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
                """;
            await using var select = PostgreSqlDataAccess.CreateTransactionalCommand(
                selectSql, connection, transaction, new Dictionary<string, object?>
                {
                    ["user_id"] = userId,
                    ["otp_type"] = otpType.ToString()
                });
            await using var reader = await select.ExecuteReaderAsync(token);
            if (!await reader.ReadAsync(token)) return new VerifyOtpResult(false, "No active OTP found.");

            var id = reader.GetInt64(0);
            var storedHash = reader.GetString(1);
            var validUntil = reader.GetFieldValue<DateTimeOffset>(2);
            await reader.DisposeAsync();

            if (now > validUntil)
            {
                await InvalidateAsync(connection, transaction, id, token);
                return new VerifyOtpResult(false, "OTP has expired.", true);
            }

            if (!string.Equals(storedHash, otpHash, StringComparison.Ordinal))
                return new VerifyOtpResult(false, "Invalid OTP.");

            await InvalidateAsync(connection, transaction, id, token);
            return new VerifyOtpResult(true, null);
        }, cancellationToken);

    private static async Task InvalidateAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, long id, CancellationToken token)
    {
        await using var command = PostgreSqlDataAccess.CreateTransactionalCommand(
            "UPDATE otp.login_otp SET is_valid = FALSE WHERE id = @id",
            connection, transaction, new Dictionary<string, object?> { ["id"] = id });
        await command.ExecuteNonQueryAsync(token);
    }
}
