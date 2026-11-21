using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Employee;
using Npgsql;

namespace HRMSAPI.DAL.Employee;

/// <summary>
/// Data Access Repository for Employee operations.
/// Modularised via partial classes across domains:
/// - Core Profile & Masters: EmployeeRepository.Profile.cs
/// - Documents & Verification: EmployeeRepository.Documents.cs
/// - Contracts & History: EmployeeRepository.Contracts.cs
/// </summary>
public sealed partial class EmployeeRepository(PostgreSqlDataAccess dataAccess) : IEmployeeRepository
{
    #region Shared Helper Methods

    private static async Task<long> NextId(NpgsqlConnection c, NpgsqlTransaction t, string table, string column, CancellationToken token)
    {
        await Execute(c, t, $"LOCK TABLE {table} IN EXCLUSIVE MODE", null, token);
        await using var cmd = PostgreSqlDataAccess.CreateTransactionalCommand($"SELECT COALESCE(MAX({column}),0)+1 FROM {table}", c, t);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync(token));
    }

    private static async Task Execute(NpgsqlConnection c, NpgsqlTransaction t, string sql, Dictionary<string, object?>? p, CancellationToken token)
    {
        await using var cmd = PostgreSqlDataAccess.CreateTransactionalCommand(sql, c, t, p);
        await cmd.ExecuteNonQueryAsync(token);
    }

    private static string? NullString(object v) => v is DBNull ? null : Convert.ToString(v);
    private static long? LongValue(object v) => v is DBNull ? null : Convert.ToInt64(v);
    private static short? ShortValue(object v) => v is DBNull ? null : Convert.ToInt16(v);
    private static decimal? DecimalValue(object v) => v is DBNull ? null : Convert.ToDecimal(v);
    private static DateOnly? DateOnlyValue(object v) => v is DBNull ? null : DateOnly.FromDateTime(Convert.ToDateTime(v));

    #endregion
}
