using System.Security.Claims;
using HRMSAPI.BAL.Employee;
using HRMSAPI.MODEL.Employee;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Employee;

[ApiController]
[Authorize]
[Route("api/employee")]
public sealed class EmployeeDocumentsController(IEmployeeService employeeService) : ControllerBase
{
    [HttpGet("document-types")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DocumentTypeDto>>>> GetDocumentTypes(CancellationToken token)
    {
        var context = GetContext();
        var types = await employeeService.GetDocumentTypesAsync(context.LangCode, token);
        return Ok(new ApiResponse<IReadOnlyList<DocumentTypeDto>>(true, "Document types loaded.", types));
    }

    [HttpGet("documents")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDocumentDto>>>> GetDocuments(
        [FromQuery] long? employeeId,
        [FromQuery] bool? verifiedOnly,
        CancellationToken token)
    {
        var context = GetContext();
        long targetId = context.EmployeeId ?? employeeId ?? 1;
        var docs = await employeeService.GetDocumentsAsync(targetId, verifiedOnly: verifiedOnly ?? false, context, token);
        return Ok(new ApiResponse<IReadOnlyList<EmployeeDocumentDto>>(true, "Employee documents loaded.", docs));
    }

    [HttpPost("documents/upload")]
    public async Task<ActionResult<ApiResponse<long>>> UploadDocument(
        [FromForm] long? documentTypeId,
        [FromForm] string? documentName,
        [FromForm] string? category,
        Microsoft.AspNetCore.Http.IFormFile? file,
        CancellationToken token)
    {
        file ??= Request.Form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ApiResponse<long>(false, "File cannot be empty."));
        }

        var context = GetContext();
        long targetEmpId = context.EmployeeId ?? 1;

        var docName = !string.IsNullOrWhiteSpace(documentName) 
            ? documentName.Trim() 
            : Request.Query["documentName"].ToString();
        if (string.IsNullOrWhiteSpace(docName))
        {
            docName = Path.GetFileNameWithoutExtension(file.FileName);
        }

        var cat = !string.IsNullOrWhiteSpace(category) 
            ? category.Trim() 
            : Request.Query["category"].ToString();
        if (string.IsNullOrWhiteSpace(cat))
        {
            cat = "Identity";
        }

        try
        {
            var docId = await employeeService.UploadDocumentAsync(targetEmpId, documentTypeId, docName, cat, file, context, token);
            return Ok(new ApiResponse<long>(true, "Document uploaded successfully and submitted for Admin verification.", docId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiResponse<long>(false, ex.Message));
        }
    }

    [HttpGet("documents/{documentId:long}/view")]
    public async Task<IActionResult> ViewDocument(long documentId, CancellationToken token)
    {
        var context = GetContext();
        var file = await employeeService.GetDocumentFileAsync(context.EmployeeId, documentId, context, token);
        if (file is null)
        {
            return NotFound(new ApiResponse<string>(false, "Document file not found on server or access denied."));
        }

        Response.Headers["Content-Disposition"] = $"inline; filename=\"{file.Value.FileName}\"";
        return File(file.Value.Bytes, file.Value.ContentType);
    }

    [HttpGet("documents/{documentId:long}/download")]
    public async Task<IActionResult> DownloadDocument(long documentId, CancellationToken token)
    {
        var context = GetContext();
        var file = await employeeService.GetDocumentFileAsync(context.EmployeeId, documentId, context, token);
        if (file is null)
        {
            return NotFound(new ApiResponse<string>(false, "Document file not found on server or access denied."));
        }

        return File(file.Value.Bytes, file.Value.ContentType, file.Value.FileName);
    }

    [HttpDelete("documents/{documentId:long}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDocument(long documentId, CancellationToken token)
    {
        var context = GetContext();
        long targetId = context.EmployeeId ?? 1;
        try
        {
            var success = await employeeService.DeleteDocumentAsync(targetId, documentId, context, token);
            if (!success)
            {
                return NotFound(new ApiResponse<bool>(false, "Document not found or already deleted."));
            }
            return Ok(new ApiResponse<bool>(true, "Document deleted successfully.", true));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<bool>(false, ex.Message));
        }
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