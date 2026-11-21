using System.Security.Claims;
using HRMSAPI.BAL.Dashboard;
using HRMSAPI.MODEL.Dashboard;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Dashboard;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<DashboardStatsResponse>>> GetStats(CancellationToken cancellationToken)
    {
        long officeId = long.TryParse(User.FindFirstValue("officeId"), out var parsedOfficeId) ? parsedOfficeId : 0;
        long? officialId = long.TryParse(User.FindFirstValue("officialId"), out var parsedOfficialId) ? parsedOfficialId : null;

        var stats = await dashboardService.GetDadmStatsAsync(officeId, officialId, cancellationToken);
        return Ok(new ApiResponse<DashboardStatsResponse>(true, "Dashboard stats loaded successfully.", stats));
    }

    [HttpGet("employee-stats")]
    public async Task<ActionResult<ApiResponse<EmployeeDashboardStatsResponse>>> GetEmployeeStats(CancellationToken cancellationToken)
    {
        long employeeId = long.TryParse(User.FindFirstValue("employeeId"), out var parsedEmpId) ? parsedEmpId : 1;
        var stats = await dashboardService.GetEmployeeStatsAsync(employeeId, cancellationToken);
        return Ok(new ApiResponse<EmployeeDashboardStatsResponse>(true, "Employee dashboard stats loaded successfully.", stats));
    }
}
