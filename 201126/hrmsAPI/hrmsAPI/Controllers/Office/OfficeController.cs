using System.Security.Claims;
using HRMSAPI.BAL.Office;
using HRMSAPI.MODEL.Login;
using HRMSAPI.MODEL.Office;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Office;

[ApiController]
[Route("api/office")]
[Authorize]
public sealed class OfficeController(IOfficeService officeService) : ControllerBase
{
    [HttpPost("create")]
    public async Task<ActionResult<ApiResponse<OfficeCreatedResult>>> CreateOffice(
        [FromBody] CreateOfficeRequest request,
        CancellationToken cancellationToken)
    {
        var roleCode = User.FindFirstValue("roleCode");
        var roleIdStr = User.FindFirstValue("roleId");

        // Allow Department Super Admin (roleCode SUP or roleId 4) or DADM
        var isSuperAdmin = string.Equals(roleCode, "SUP", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(roleIdStr, "4", StringComparison.OrdinalIgnoreCase);

        // Resolve Department ID
        long departmentId = 1;
        var deptClaim = User.FindFirstValue("departmentId");
        if (!string.IsNullOrWhiteSpace(deptClaim) && long.TryParse(deptClaim, out var parsedDept) && parsedDept > 0)
        {
            departmentId = parsedDept;
        }

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "SUPERADMIN";

        var response = await officeService.CreateOfficeAsync(
            departmentId,
            currentUserId,
            request,
            cancellationToken);

        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpGet("list")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DepartmentOfficeDto>>>> GetDepartmentOffices(
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        long targetDeptId = 0;
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            targetDeptId = departmentId.Value;
        }
        else
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!string.IsNullOrWhiteSpace(deptClaim) && long.TryParse(deptClaim, out var parsedDept) && parsedDept > 0)
            {
                targetDeptId = parsedDept;
            }
        }

        var response = await officeService.GetDepartmentOfficesAsync(targetDeptId, cancellationToken);
        return Ok(response);
    }
}
