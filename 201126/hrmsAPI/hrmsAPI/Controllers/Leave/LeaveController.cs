using System.Security.Claims;
using HRMSAPI.BAL.Leave;
using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Leave;

[ApiController]
[Route("api/leave")]
[Authorize]
public sealed class LeaveController(ILeaveService leaveService) : ControllerBase
{
    /// <summary>
    /// Master Data: Active Leave Reasons
    /// Compatible with both /api/leave/reasons and /api/leave-reasons
    /// </summary>
    [HttpGet("reasons")]
    [HttpGet("/api/leave-reasons")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LeaveReasonDto>>>> GetLeaveReasons(CancellationToken cancellationToken)
    {
        var response = await leaveService.GetLeaveReasonsAsync(cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Master Data: Specific Leave Reason by ID
    /// Compatible with both /api/leave/reasons/{id} and /api/leave-reasons/{id}
    /// </summary>
    [HttpGet("reasons/{id:int}")]
    [HttpGet("/api/leave-reasons/{id:int}")]
    public async Task<ActionResult<ApiResponse<LeaveReasonDto>>> GetLeaveReasonById(int id, CancellationToken cancellationToken)
    {
        var response = await leaveService.GetLeaveReasonByIdAsync(id, cancellationToken);
        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Master Data: Official Holiday Calendar
    /// Compatible with both /api/holidays and /api/leave/holidays
    /// </summary>
    [HttpGet("holidays")]
    [HttpGet("/api/holidays")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<HolidayDto>>>> GetHolidays(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var response = await leaveService.GetHolidaysAsync(year, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Centralized Authoritative Leave-Day & Holiday Exclusion Calculator (POST)
    /// </summary>
    [HttpPost("calculate-chargeable-days")]
    public async Task<ActionResult<ApiResponse<ChargeableLeaveBreakdownDto>>> CalculateChargeableDays(
        [FromBody] LeaveCalculationRequest request,
        CancellationToken cancellationToken)
    {
        long employeeId = 0;
        var empClaim = User.FindFirstValue("employeeId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            employeeId = parsedEmp;
        }
        else if (request.EmployeeId.HasValue && request.EmployeeId.Value > 0)
        {
            employeeId = request.EmployeeId.Value;
        }

        var response = await leaveService.CalculateChargeableLeaveDaysAsync(employeeId, request, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Centralized Authoritative Leave-Day & Holiday Exclusion Calculator (GET)
    /// </summary>
    [HttpGet("calculate-chargeable-days")]
    public async Task<ActionResult<ApiResponse<ChargeableLeaveBreakdownDto>>> CalculateChargeableDaysGet(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] long? employeeId,
        [FromQuery] long? leaveTypeId,
        [FromQuery] bool isHalfDay,
        CancellationToken cancellationToken)
    {
        long targetEmp = 0;
        var empClaim = User.FindFirstValue("employeeId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            targetEmp = parsedEmp;
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            targetEmp = employeeId.Value;
        }

        var req = new LeaveCalculationRequest
        {
            EmployeeId = targetEmp,
            FromDate = fromDate,
            ToDate = toDate,
            LeaveTypeId = leaveTypeId ?? 1,
            IsHalfDay = isHalfDay
        };

        var response = await leaveService.CalculateChargeableLeaveDaysAsync(targetEmp, req, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// 1. Insert Leave (Apply Leave by Employee with immediate balance deduction)
    /// </summary>
    [HttpPost("apply")]
    public async Task<ActionResult<ApiResponse<ApplyLeaveResult>>> ApplyLeave(
        [FromBody] ApplyLeaveRequest request,
        CancellationToken cancellationToken)
    {
        long employeeId = 0;
        var empClaim = User.FindFirstValue("employeeId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            employeeId = parsedEmp;
        }
        else if (request.EmployeeId.HasValue && request.EmployeeId.Value > 0)
        {
            employeeId = request.EmployeeId.Value;
        }

        if (employeeId <= 0)
        {
            return BadRequest(new ApiResponse<ApplyLeaveResult>(false, "Employee ID is missing or invalid."));
        }

        if (request.LeaveReasonId <= 0)
        {
            return BadRequest(new ApiResponse<ApplyLeaveResult>(false, "Leave reason is mandatory."));
        }

        var response = await leaveService.ApplyLeaveAsync(employeeId, request, cancellationToken);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// 2. Leave Balance (Live balances with immediate deductions reflected)
    /// </summary>
    [HttpGet("balances")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LeaveBalanceDto>>>> GetLeaveBalances(
        [FromQuery] long? employeeId,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        long targetEmpId = 0;
        var empClaim = User.FindFirstValue("employeeId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            targetEmpId = parsedEmp;
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            targetEmpId = employeeId.Value;
        }

        if (targetEmpId <= 0)
        {
            targetEmpId = 1;
        }

        var response = await leaveService.GetEmployeeLeaveBalancesAsync(targetEmpId, financialYear, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Employee's Leave Applications (Used by calendar to show Pending and Approved dates)
    /// </summary>
    [HttpGet("my-leaves")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeLeaveDto>>>> GetMyLeaves(
        [FromQuery] long? employeeId,
        CancellationToken cancellationToken)
    {
        long targetEmpId = 0;
        var empClaim = User.FindFirstValue("employeeId");
        if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
        {
            targetEmpId = parsedEmp;
        }
        else if (employeeId.HasValue && employeeId.Value > 0)
        {
            targetEmpId = employeeId.Value;
        }

        if (targetEmpId <= 0)
        {
            targetEmpId = 1;
        }

        var response = await leaveService.GetEmployeeLeavesAsync(targetEmpId, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Manager Pending Leave Applications Queue
    /// </summary>
    [HttpGet("pending-applications")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ManagerPendingLeaveDto>>>> GetPendingApplications(
        [FromQuery] long? officialId,
        CancellationToken cancellationToken)
    {
        long targetOfficialId = 0;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            targetOfficialId = parsedOff;
        }
        else if (officialId.HasValue && officialId.Value > 0)
        {
            targetOfficialId = officialId.Value;
        }

        if (targetOfficialId <= 0)
        {
            targetOfficialId = 1;
        }

        var response = await leaveService.GetManagerPendingLeavesAsync(targetOfficialId, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Manager's Subordinates Complete Leave History (Approved, Rejected, Pending, Cancelled)
    /// </summary>
    [HttpGet("manager-history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ManagerLeaveHistoryDto>>>> GetManagerLeaveHistory(
        [FromQuery] long? officialId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        long targetOfficialId = 0;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            targetOfficialId = parsedOff;
        }
        else if (officialId.HasValue && officialId.Value > 0)
        {
            targetOfficialId = officialId.Value;
        }

        if (targetOfficialId <= 0)
        {
            targetOfficialId = 1;
        }

        var response = await leaveService.GetManagerLeaveHistoryAsync(targetOfficialId, status, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Reporting Officer Live Leave Statistics & Quota Utilization (For KPI Cards & Reports)
    /// </summary>
    [HttpGet("manager-stats")]
    public async Task<ActionResult<ApiResponse<ManagerLeaveStatsDto>>> GetManagerLeaveStats(
        [FromQuery] long? officialId,
        CancellationToken cancellationToken)
    {
        long targetOfficialId = 0;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            targetOfficialId = parsedOff;
        }
        else if (officialId.HasValue && officialId.Value > 0)
        {
            targetOfficialId = officialId.Value;
        }

        if (targetOfficialId <= 0)
        {
            targetOfficialId = 1;
        }

        var response = await leaveService.GetManagerLeaveStatsAsync(targetOfficialId, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Reporting Officer Subordinate Leave Register (For Remuneration / Excel Export)
    /// </summary>
    [HttpGet("manager-register")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SubordinateLeaveRegisterDto>>>> GetManagerSubordinateRegister(
        [FromQuery] long? officialId,
        [FromQuery] string? financialYear,
        CancellationToken cancellationToken)
    {
        long targetOfficialId = 0;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            targetOfficialId = parsedOff;
        }
        else if (officialId.HasValue && officialId.Value > 0)
        {
            targetOfficialId = officialId.Value;
        }

        if (targetOfficialId <= 0)
        {
            targetOfficialId = 1;
        }

        var response = await leaveService.GetManagerSubordinateRegisterAsync(targetOfficialId, financialYear, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// 3. Approve, Reject, or Cancel Leave by Reporting Manager
    /// Approval updates status without additional balance deduction.
    /// Rejection restores the deducted balance exactly once.
    /// </summary>
    [HttpPost("action")]
    public async Task<ActionResult<ApiResponse<ActionLeaveResult>>> ActionLeave(
        [FromBody] ActionLeaveRequest request,
        CancellationToken cancellationToken)
    {
        long officialId = 1;
        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            officialId = parsedOff;
        }

        var response = await leaveService.ActionLeaveAsync(officialId, request, cancellationToken);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// 4. Cancel Leave Application (by employee or reporting manager)
    /// Restores leave balance consistently and atomically.
    /// </summary>
    [HttpPost("cancel")]
    public async Task<ActionResult<ApiResponse<CancelLeaveResult>>> CancelLeave(
        [FromBody] CancelLeaveRequest request,
        CancellationToken cancellationToken)
    {
        long userId = 0;
        bool isOfficialOrAdmin = false;

        var offClaim = User.FindFirstValue("officialId");
        if (!string.IsNullOrWhiteSpace(offClaim) && long.TryParse(offClaim, out var parsedOff) && parsedOff > 0)
        {
            userId = parsedOff;
            isOfficialOrAdmin = true;
        }
        else
        {
            var empClaim = User.FindFirstValue("employeeId");
            if (!string.IsNullOrWhiteSpace(empClaim) && long.TryParse(empClaim, out var parsedEmp) && parsedEmp > 0)
            {
                userId = parsedEmp;
            }
        }

        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? User.FindFirstValue("roleCode");
        if (!string.IsNullOrWhiteSpace(roleClaim))
        {
            var r = roleClaim.ToUpperInvariant();
            if (r == "ADMIN" || r == "DADM" || r == "RPO" || r == "MANAGER")
            {
                isOfficialOrAdmin = true;
            }
        }

        if (userId <= 0)
        {
            userId = 1;
        }

        var response = await leaveService.CancelLeaveAsync(userId, isOfficialOrAdmin, request, cancellationToken);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }
}
