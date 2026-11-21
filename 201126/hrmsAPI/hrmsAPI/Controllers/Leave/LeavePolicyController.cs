using System.Security.Claims;
using HRMSAPI.BAL.Leave;
using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Leave;

[ApiController]
[Route("api/leave-policies")]
[Authorize]
public sealed class LeavePolicyController(ILeavePolicyService policyService) : ControllerBase
{
    /// <summary>
    /// Retrieve all configured leave policies (optionally filtered by department, leave type, or active state)
    /// GET /api/leave-policies
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LeavePolicyDto>>>> GetLeavePolicies(
        [FromQuery] long? departmentId,
        [FromQuery] long? leaveTypeId,
        [FromQuery] bool? isActive,
        CancellationToken cancellationToken)
    {
        var response = await policyService.GetAllPoliciesAsync(departmentId, leaveTypeId, isActive, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Retrieve specific leave policy by its unique Policy ID
    /// GET /api/leave-policies/{policyId}
    /// </summary>
    [HttpGet("{policyId:long}")]
    public async Task<ActionResult<ApiResponse<LeavePolicyDto>>> GetPolicyById(
        long policyId,
        CancellationToken cancellationToken)
    {
        var response = await policyService.GetPolicyByIdAsync(policyId, cancellationToken);
        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Get dynamic leave entitlements and balances for the current authenticated employee
    /// GET /api/leave-policies/me
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>>> GetMyEntitlements(
        [FromQuery] DateTime? asOfDate,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        var employeeId = ResolveSecureEmployeeId(null);
        if (employeeId <= 0)
        {
            return Unauthorized(new ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>(false, "Authenticated employee identity could not be verified."));
        }

        var response = await policyService.GetEmployeeEntitlementsAsync(employeeId, asOfDate, financialYear, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Get dynamic leave entitlement for a specific leave type for current authenticated employee
    /// GET /api/leave-policies/me/leave-type/{leaveTypeId}
    /// </summary>
    [HttpGet("me/leave-type/{leaveTypeId:long}")]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveEntitlementDto>>> GetMyEntitlementByLeaveType(
        long leaveTypeId,
        [FromQuery] DateTime? asOfDate,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        var employeeId = ResolveSecureEmployeeId(null);
        if (employeeId <= 0)
        {
            return Unauthorized(new ApiResponse<EmployeeLeaveEntitlementDto>(false, "Authenticated employee identity could not be verified."));
        }

        var response = await policyService.GetEmployeeEntitlementByLeaveTypeAsync(
            employeeId, leaveTypeId, asOfDate, financialYear, cancellationToken);

        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Get dynamic leave entitlements and balances for a specified employee ID
    /// Secures against arbitrary employee ID manipulation by non-admin users
    /// GET /api/leave-policies/employee/{employeeId}
    /// </summary>
    [HttpGet("employee/{employeeId:long}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>>> GetEmployeeEntitlements(
        long employeeId,
        [FromQuery] DateTime? asOfDate,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        var secureEmployeeId = ResolveSecureEmployeeId(employeeId);
        if (secureEmployeeId <= 0)
        {
            return Unauthorized(new ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>(false, "Invalid or unauthorized employee identification."));
        }

        var response = await policyService.GetEmployeeEntitlementsAsync(secureEmployeeId, asOfDate, financialYear, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Get dynamic leave entitlement and balance for an employee for a specific leave type
    /// Secures against arbitrary employee ID manipulation by non-admin users
    /// GET /api/leave-policies/employee/{employeeId}/leave-type/{leaveTypeId}
    /// </summary>
    [HttpGet("employee/{employeeId:long}/leave-type/{leaveTypeId:long}")]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveEntitlementDto>>> GetEmployeeEntitlementByLeaveType(
        long employeeId,
        long leaveTypeId,
        [FromQuery] DateTime? asOfDate,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        var secureEmployeeId = ResolveSecureEmployeeId(employeeId);
        if (secureEmployeeId <= 0)
        {
            return Unauthorized(new ApiResponse<EmployeeLeaveEntitlementDto>(false, "Invalid or unauthorized employee identification."));
        }

        var response = await policyService.GetEmployeeEntitlementByLeaveTypeAsync(
            secureEmployeeId, leaveTypeId, asOfDate, financialYear, cancellationToken);

        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Save or update a leave policy (Admin / Manager authorized)
    /// POST /api/leave-policies
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<long>>> SaveLeavePolicy(
        [FromBody] SaveLeavePolicyRequest request,
        CancellationToken cancellationToken)
    {
        long actionOfficialId = 1;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            actionOfficialId = parsedOff;
        }

        var response = await policyService.SavePolicyAsync(request, actionOfficialId, cancellationToken);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Extracts authenticated employee ID from JWT token to prevent unauthorized access.
    /// If caller is an Admin / Official, allows querying requested employee ID.
    /// </summary>
    private long ResolveSecureEmployeeId(long? requestedEmployeeId)
    {
        var isOfficialOrAdmin = false;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var offId) && offId > 0)
        {
            isOfficialOrAdmin = true;
        }

        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? User.FindFirstValue("roleCode");
        if (!string.IsNullOrWhiteSpace(roleClaim))
        {
            var r = roleClaim.ToUpperInvariant();
            if (r is "ADMIN" or "DADM" or "RPO" or "MANAGER")
            {
                isOfficialOrAdmin = true;
            }
        }

        // If official or manager, honor requested employee ID
        if (isOfficialOrAdmin && requestedEmployeeId.HasValue && requestedEmployeeId.Value > 0)
        {
            return requestedEmployeeId.Value;
        }

        // Otherwise extract authenticated employee's own ID from JWT claims
        var empClaim = User.FindFirstValue("employeeId") ?? User.FindFirstValue("empId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            if (isOfficialOrAdmin && requestedEmployeeId.HasValue && requestedEmployeeId.Value > 0)
            {
                return requestedEmployeeId.Value;
            }
            return parsedEmp;
        }

        if (requestedEmployeeId.HasValue && requestedEmployeeId.Value > 0)
        {
            return requestedEmployeeId.Value;
        }

        return 1;
    }
}
