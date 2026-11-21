using System.Data;

namespace HRMSAPI.AppCode;

/// <summary>
/// High-performance, null-safe ADO.NET DataRow extension methods.
/// Standardizes row-to-model mapping across all repositories and eliminates repetitive DBNull boilerplates.
/// </summary>
public static class DataRowExtensions
{
    public static string? GetStringOrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        var s = Convert.ToString(row[column]);
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    public static string GetStringOrDefault(this DataRow row, string column, string defaultValue = "")
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return defaultValue;
        return Convert.ToString(row[column]) ?? defaultValue;
    }

    public static long? GetInt64OrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Convert.ToInt64(row[column]);
    }

    public static long GetInt64OrDefault(this DataRow row, string column, long defaultValue = 0L)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return defaultValue;
        return Convert.ToInt64(row[column]);
    }

    public static int? GetInt32OrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Convert.ToInt32(row[column]);
    }

    public static int GetInt32OrDefault(this DataRow row, string column, int defaultValue = 0)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return defaultValue;
        return Convert.ToInt32(row[column]);
    }

    public static short? GetInt16OrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Convert.ToInt16(row[column]);
    }

    public static decimal? GetDecimalOrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Convert.ToDecimal(row[column]);
    }

    public static decimal GetDecimalOrDefault(this DataRow row, string column, decimal defaultValue = 0m)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return defaultValue;
        return Convert.ToDecimal(row[column]);
    }

    public static DateOnly? GetDateOnlyOrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return DateOnly.FromDateTime(Convert.ToDateTime(row[column]));
    }

    public static DateTime? GetDateTimeOrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Convert.ToDateTime(row[column]);
    }

    public static bool GetBooleanOrDefault(this DataRow row, string column, bool defaultValue = false)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return defaultValue;
        return Convert.ToBoolean(row[column]);
    }

    public static Guid? GetGuidOrNull(this DataRow row, string column)
    {
        if (!row.Table.Columns.Contains(column) || row[column] is DBNull) return null;
        return Guid.TryParse(Convert.ToString(row[column]), out var g) ? g : null;
    }
}
