using System.Security.Claims;
using HRMSAPI.BAL.Login;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Login;

[ApiController]
[Route("api/login")]
public sealed class LoginController(ILoginService loginService) : ControllerBase
{
    [HttpPost("request-otp")]
    public async Task<ActionResult<ApiResponse<OtpResult>>> RequestOtp(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await loginService.RequestOtpAsync(request, cancellationToken);
        return result.Success
            ? Ok(new ApiResponse<OtpResult>(true, result.Message, result.Data))
            : Unauthorized(new ApiResponse<OtpResult>(false, result.Message));
    }

    [HttpPost("resend-otp")]
    public async Task<ActionResult<ApiResponse<OtpResult>>> ResendOtp(ResendOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await loginService.ResendOtpAsync(request, cancellationToken);
        return result.Success
            ? Ok(new ApiResponse<OtpResult>(true, result.Message, result.Data))
            : NotFound(new ApiResponse<OtpResult>(false, result.Message));
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await loginService.VerifyOtpAsync(request, cancellationToken);
        return result.Success
            ? Ok(new ApiResponse<LoginResponse>(true, result.Message, result.Data))
            : BadRequest(new ApiResponse<LoginResponse>(false, result.Message));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var sessionClaim = User.FindFirstValue("loginSessionId");
        if (string.IsNullOrWhiteSpace(userId) || !Guid.TryParse(sessionClaim, out var loginSessionId))
            return Unauthorized(new ApiResponse<object>(false, "Valid login session is missing from the token."));

        long? roleId = long.TryParse(User.FindFirstValue("roleId"), out var parsedRoleId) ? parsedRoleId : null;
        var userType = User.HasClaim(claim => claim.Type == "employeeId") ? "Employee" : "Official";
        await loginService.LogoutAsync(userId, userType, roleId, loginSessionId, cancellationToken);
        return Ok(new ApiResponse<object>(true, "Logout recorded successfully."));
    }
}
