using System.Security.Claims;
using HRMSAPI.BAL.Account;
using HRMSAPI.MODEL.Account;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Account;

[ApiController]
[Authorize]
[Route("api/account")]
public sealed class AccountController(IAccountService accountService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("userId")
        ?? string.Empty;

    private string? GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpGet("info")]
    public async Task<ActionResult<ApiResponse<AccountInfoResponse>>> GetInfo(CancellationToken token)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new ApiResponse<AccountInfoResponse>(false, "User context not identified."));

        var info = await accountService.GetAccountInfoAsync(userId, token);
        return info is null
            ? NotFound(new ApiResponse<AccountInfoResponse>(false, "Account information not found."))
            : Ok(new ApiResponse<AccountInfoResponse>(true, "Account information loaded.", info));
    }

    [HttpPost("change-mobile/request-otp")]
    public async Task<ActionResult<ApiResponse<RequestMobileChangeOtpResponse>>> RequestMobileChangeOtp(
        [FromBody] RequestMobileChangeOtpRequest request, CancellationToken token)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new ApiResponse<RequestMobileChangeOtpResponse>(false, "User context not identified."));

        var result = await accountService.RequestMobileChangeOtpAsync(userId, request, GetIpAddress(), token);
        return result.Success
            ? Ok(new ApiResponse<RequestMobileChangeOtpResponse>(true, result.Message, result))
            : BadRequest(new ApiResponse<RequestMobileChangeOtpResponse>(false, result.Message, result));
    }

    [HttpPost("change-mobile/verify")]
    public async Task<ActionResult<ApiResponse<string>>> VerifyChangeMobile(
        [FromBody] VerifyChangeMobileRequest request, CancellationToken token)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new ApiResponse<string>(false, "User context not identified."));

        var (success, message, newMobile) = await accountService.VerifyChangeMobileAsync(userId, request, GetIpAddress(), token);
        return success
            ? Ok(new ApiResponse<string>(true, message, newMobile))
            : BadRequest(new ApiResponse<string>(false, message));
    }

    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<string>>> ChangePassword(
        [FromBody] ChangePasswordRequest request, CancellationToken token)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new ApiResponse<string>(false, "User context not identified."));

        var (success, message) = await accountService.ChangePasswordAsync(userId, request, GetIpAddress(), token);
        return success
            ? Ok(new ApiResponse<string>(true, message))
            : BadRequest(new ApiResponse<string>(false, message));
    }
}
