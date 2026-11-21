using System.Security.Claims;
using HRMSAPI.BAL.Employee;
using HRMSAPI.MODEL.Employee;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Employee;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminDocumentController(IEmployeeService employeeService) : ControllerBase
{
    [HttpGet("documents")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdminDocumentListItemDto>>>> GetDocumentsForVerification(
        [FromQuery] string? status,
        [FromQuery] long? employeeId,
        [FromQuery] long? departmentId,
        [FromQuery] string? search,
        CancellationToken token)
    {
        var context = GetContext();
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var docs = await employeeService.GetDocumentsForVerificationAsync(status, employeeId, departmentId, search, context, token);
        return Ok(new ApiResponse<IReadOnlyList<AdminDocumentListItemDto>>(true, "Documents for verification loaded.", docs));
    }

    [HttpPut("documents/{documentId:long}/verify")]
    public async Task<ActionResult<ApiResponse<bool>>> VerifyDocument(
        long documentId,
        [FromBody] DocumentVerificationRequest? request,
        CancellationToken token)
    {
        var context = GetContext();
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var success = await employeeService.VerifyDocumentAsync(documentId, request?.Remarks, context, token);
        if (!success)
        {
            return BadRequest(new ApiResponse<bool>(false, "Document not found or could not be verified."));
        }
        return Ok(new ApiResponse<bool>(true, "Document has been verified and approved successfully.", true));
    }

    [HttpPut("documents/{documentId:long}/reject")]
    public async Task<ActionResult<ApiResponse<bool>>> RejectDocument(
        long documentId,
        [FromBody] DocumentRejectionRequest request,
        CancellationToken token)
    {
        var context = GetContext();
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request?.Remarks))
        {
            return BadRequest(new ApiResponse<bool>(false, "Rejection remarks are mandatory."));
        }

        try
        {
            var success = await employeeService.RejectDocumentAsync(documentId, request.Remarks, context, token);
            if (!success)
            {
                return BadRequest(new ApiResponse<bool>(false, "Document not found or could not be rejected."));
            }
            return Ok(new ApiResponse<bool>(true, "Document has been rejected with remarks.", true));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiResponse<bool>(false, ex.Message));
        }
    }

    [HttpGet("documents/{documentId:long}/history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DocumentVerificationHistoryDto>>>> GetDocumentHistory(
        long documentId,
        CancellationToken token)
    {
        var context = GetContext();
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var history = await employeeService.GetDocumentVerificationHistoryAsync(documentId, context, token);
        return Ok(new ApiResponse<IReadOnlyList<DocumentVerificationHistoryDto>>(true, "Document verification history loaded.", history));
    }

    [HttpGet("employees/{employeeId:long}/documents/summary")]
    public async Task<ActionResult<ApiResponse<EmployeeDocumentSummaryDto>>> GetEmployeeDocumentSummary(
        long employeeId,
        CancellationToken token)
    {
        var context = GetContext();
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var summary = await employeeService.GetEmployeeDocumentSummaryAsync(employeeId, context, token);
        return Ok(new ApiResponse<EmployeeDocumentSummaryDto>(true, "Employee document summary loaded.", summary));
    }

    private EmployeeUserContext GetContext()
    {
        long Parse(string claim) => long.TryParse(User.FindFirstValue(claim), out var v) ? v : 0;
        long? Optional(string claim) => long.TryParse(User.FindFirstValue(claim), out var v) ? v : null;

        var roleCode = User.FindFirstValue("roleCode") ?? string.Empty;
        var employeeId = Optional("employeeId");
        var officialId = Optional("officialId");
        var officeId = Optional("officeId");
        var actorId = officialId ?? employeeId ?? 0;
        var langCode = short.TryParse(User.FindFirstValue("langCode"), out var lang) && lang == 2 ? (short)2 : (short)1;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

        return new EmployeeUserContext(
            Parse("departmentId"),
            roleCode,
            employeeId,
            officialId,
            langCode,
            actorId,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            userId,
            officeId);
    }
}