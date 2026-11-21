using System.Net.Mime;
using System.Text.Json;
using HRMSAPI.MODEL.Common;

namespace HRMSAPI.AppCode;

/// <summary>
/// Catches unhandled exceptions across the ASP.NET Core pipeline, logs details,
/// and returns a standardized, predictable ApiResponse error payload to clients.
/// </summary>
public sealed class GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogInformation("Request to {Path} was canceled by client.", context.Request.Path);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception processing request {Method} {Path}", context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.ContentType = MediaTypeNames.Application.Json;

        int statusCode;
        string message;

        switch (exception)
        {
            case ArgumentException argEx:
                statusCode = StatusCodes.Status400BadRequest;
                message = argEx.Message;
                break;
            case InvalidOperationException invEx:
                statusCode = StatusCodes.Status400BadRequest;
                message = invEx.Message;
                break;
            case UnauthorizedAccessException:
                statusCode = StatusCodes.Status401Unauthorized;
                message = "Access is denied.";
                break;
            case KeyNotFoundException:
                statusCode = StatusCodes.Status404NotFound;
                message = "Requested resource was not found.";
                break;
            default:
                statusCode = StatusCodes.Status500InternalServerError;
                message = "An unexpected server error occurred. Please contact system administrator.";
                break;
        }

        context.Response.StatusCode = statusCode;
        var response = new ApiResponse<object>(false, message, null);
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }
}

public static class GlobalExceptionHandlerMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app) =>
        app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
}
