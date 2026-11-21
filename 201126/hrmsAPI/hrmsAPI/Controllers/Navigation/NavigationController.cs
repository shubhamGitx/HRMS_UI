using System.Security.Claims;
using HRMSAPI.BAL.Navigation;
using HRMSAPI.MODEL.Login;
using HRMSAPI.MODEL.Navigation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Navigation;

[ApiController]
[Authorize]
[Route("api/navigation")]
public sealed class NavigationController(INavigationService navigationService) : ControllerBase
{
    [HttpGet("my-menu")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MenuItemResponse>>>> GetMyMenu([FromQuery] short? lang, CancellationToken cancellationToken)
    {
        var roleCode = User.FindFirstValue("roleCode");
        if (string.IsNullOrWhiteSpace(roleCode))
            return Unauthorized(new ApiResponse<IReadOnlyList<MenuItemResponse>>(false, "Valid role is missing from the login token."));

        short langCode = 1;
        if (lang.HasValue && lang.Value is >= 1 and <= 2)
        {
            langCode = lang.Value;
        }
        else
        {
            var languageClaim = User.FindFirstValue("langCode");
            if (short.TryParse(languageClaim, out var parsed) && parsed is >= 1 and <= 2)
                langCode = parsed;
        }

        var menu = await navigationService.GetMenuAsync(roleCode, langCode, cancellationToken);
        return Ok(new ApiResponse<IReadOnlyList<MenuItemResponse>>(true, "Menu loaded successfully.", menu));
    }
}
