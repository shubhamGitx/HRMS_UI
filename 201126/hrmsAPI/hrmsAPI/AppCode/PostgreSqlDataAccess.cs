using System.Data;
using Npgsql;

namespace HRMSAPI.AppCode;

public sealed class PostgreSqlDataAccess(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("HrmsDatabase")
        ?? throw new InvalidOperationException("Connection string 'HrmsDatabase' is not configured.");

    public NpgsqlConnection CreateConnection() => new(_connectionString);
    public string ConnectionString => _connectionString;

    #region Get DataTable Without Parameters

    public Task<DataTable> GetDataTableAsync(string query, CancellationToken cancellationToken = default) =>
        GetDataTableInternalAsync(query, null, cancellationToken);

    #endregion

    #region Insert Update Delete

    public async Task<int> ExecuteNonQueryAsync(
        string query,
        IReadOnlyDictionary<string, object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateCommand(query, connection, parameters);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<T?> ExecuteScalarAsync<T>(
        string query,
        IReadOnlyDictionary<string, object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = CreateCommand(query, connection, parameters);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        if (value is null or DBNull) return default;
        return (T)Convert.ChangeType(value, typeof(T));
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<NpgsqlConnection, NpgsqlTransaction, CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            var result = await operation(connection, transaction, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public static NpgsqlCommand CreateTransactionalCommand(
        string query,
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        IReadOnlyDictionary<string, object?>? parameters = null)
    {
        var command = CreateCommand(query, connection, parameters);
        command.Transaction = transaction;
        return command;
    }

    #endregion

    #region Get DataTable With Parameters

    public Task<DataTable> GetDataTableAsync(
        string query,
        IReadOnlyDictionary<string, object?> parameters,
        CancellationToken cancellationToken = default) =>
        GetDataTableInternalAsync(query, parameters, cancellationToken);

    #endregion

    #region PostgreSQL Execution

    private async Task<DataTable> GetDataTableInternalAsync(
        string query,
        IReadOnlyDictionary<string, object?>? parameters,
        CancellationToken cancellationToken)
    {
        try
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(query);

            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = CreateCommand(query, connection, parameters);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            var dataTable = new DataTable();
            dataTable.Load(reader);
            return dataTable;
        }
        catch (Exception ex)
        {
            // Re-throw so callers get the real PostgreSQL error instead of a silent NullReferenceException
            throw new InvalidOperationException($"Database query failed: {ex.Message}", ex);
        }
       
    }

    private static NpgsqlCommand CreateCommand(
        string query,
        NpgsqlConnection connection,
        IReadOnlyDictionary<string, object?>? parameters)
    {
        var command = new NpgsqlCommand(query, connection);
        if (parameters is null) return command;
        foreach (var parameter in parameters)
        {
            var parameterName = parameter.Key.StartsWith('@') ? parameter.Key : $"@{parameter.Key}";
            command.Parameters.AddWithValue(parameterName, parameter.Value ?? DBNull.Value);
        }
        return command;
    }

    #endregion
}
