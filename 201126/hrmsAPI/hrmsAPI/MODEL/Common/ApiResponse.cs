global using HRMSAPI.MODEL.Common;

namespace HRMSAPI.MODEL.Common;

/// <summary>
/// Universal standard API response contract for all HRMS API endpoints.
/// </summary>
/// <typeparam name="T">Payload data type</typeparam>
public sealed record ApiResponse<T>(bool Success, string Message, T? Data = default)
{
    public static ApiResponse<T> Ok(T? data, string message = "Success") =>
        new(true, message, data);

    public static ApiResponse<T> Fail(string message, T? data = default) =>
        new(false, message, data);
}

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T? data, string message = "Success") =>
        new(true, message, data);

    public static ApiResponse<T> Fail<T>(string message, T? data = default) =>
        new(false, message, data);
}
