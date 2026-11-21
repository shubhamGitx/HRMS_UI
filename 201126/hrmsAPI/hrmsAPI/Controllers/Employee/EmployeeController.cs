using System.Security.Claims;
using HRMSAPI.BAL.Employee;
using HRMSAPI.MODEL.Employee;
using HRMSAPI.MODEL.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HRMSAPI.Controllers.Employee;

[ApiController]
[Authorize]
//[Route("api/employee")]
[Route("api/employees")]
public sealed class EmployeeController(IEmployeeService employeeService) : ControllerBase
{
    [HttpGet("masters")]
    public async Task<ActionResult<ApiResponse<EmployeeMastersResponse>>> GetMasters(CancellationToken token)
    {
        var result = await employeeService.GetMastersAsync(GetContext(), token);
        return Ok(new ApiResponse<EmployeeMastersResponse>(true, "Employee masters loaded.", result));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeListItem>>>> GetList(CancellationToken token)
    {
        var result = await employeeService.GetListAsync(GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<EmployeeListItem>>(true, "Employees loaded.", result));
    }

    [HttpGet("{employeeId:long}/personal-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeePersonalDetailsResponse>>> GetPersonalDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetPersonalDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeePersonalDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeePersonalDetailsResponse>(true, "Employee personal details loaded.", result));
    }

    [HttpGet("{employeeId:long}/address-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeeAddressDetailsResponse>>> GetAddressDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetAddressDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeeAddressDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeAddressDetailsResponse>(true, "Employee address details loaded.", result));
    }

    [HttpGet("{employeeId:long}/qualification-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeeQualificationDetailsResponse>>> GetQualificationDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetQualificationDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeeQualificationDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeQualificationDetailsResponse>(true, "Employee qualification details loaded.", result));
    }

    [HttpGet("{employeeId:long}/bank-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeeBankDetailsResponse>>> GetBankDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetBankDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeeBankDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeBankDetailsResponse>(true, "Employee bank details loaded.", result));
    }
    [HttpGet("{employeeId:long}/Nominee-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeeNomineeDetailsResponse>>> GetNomineeEmergencyDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetNomineeDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeeNomineeDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeNomineeDetailsResponse>(true, "Employee nominee details loaded.", result));
    }

    [HttpGet("{employeeId:long}/EmergencyContact-details-risha")]
    public async Task<ActionResult<ApiResponse<EmployeeEmergencyDetailsResponse>>> GetEmergencyContactDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetEmergencyContactDetailsAsync(employeeId, GetContext(), token);

        return result is null
            ? NotFound(new ApiResponse<EmployeeEmergencyDetailsResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeEmergencyDetailsResponse>(true, "Employee emergency contact details loaded.", result));
    }



    [HttpGet("{employeeId:long}")]
    public async Task<ActionResult<ApiResponse<EmployeeFullProfileResponse>>> GetFullProfile(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetFullProfileAsync(employeeId, GetContext(), token);
        return result is null
            ? NotFound(new ApiResponse<EmployeeFullProfileResponse>(false, "Employee not found in your department."))
            : Ok(new ApiResponse<EmployeeFullProfileResponse>(true, "Employee profile loaded.", result));
    }

    /// <summary>
    /// Step 1: Personal Details (creates draft employee if ID is 0 or null, or updates existing)
    /// </summary>
    [HttpPost("personal-details")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> SavePersonalDetails(
        [FromBody] PersonalDetailsRequest request, CancellationToken token)
    {
        var result = await employeeService.SavePersonalDetailsAsync(request, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }

    /// <summary>
    /// Step 2: Contact & Address
    /// </summary>
    [HttpPost("contact-address")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> SaveContactAddress(
        [FromBody] ContactAddressRequest request, CancellationToken token)
    {
        var result = await employeeService.SaveContactAddressAsync(request, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }

    /// <summary>
    /// Step 3: Qualification & Experience
    /// </summary>
    [HttpPost("qualification-experience")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> SaveQualificationExperience(
        [FromBody] QualificationExperienceRequest request, CancellationToken token)
    {
        var result = await employeeService.SaveQualificationExperienceAsync(request, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }

    /// <summary>
    /// Step 4: Bank Details
    /// </summary>
    [HttpPost("bank-details")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> SaveBankDetails(
        [FromBody] BankDetailsRequest request, CancellationToken token)
    {
        var result = await employeeService.SaveBankDetailsAsync(request, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }

    /// <summary>
    /// Step 5: Nominee & Emergency Contacts
    /// </summary>
    [HttpPost("nominee-emergency")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> SaveNomineeEmergency(
        [FromBody] NomineeEmergencyRequest request, CancellationToken token)
    {
        var result = await employeeService.SaveNomineeEmergencyAsync(request, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }

    /// <summary>
    /// Final Step: Activate Employee and create login credentials
    /// </summary>
    [HttpPost("{employeeId:long}/final-submit")]
    public async Task<ActionResult<ApiResponse<EmployeeSaveResult>>> FinalSubmit(long employeeId, CancellationToken token)
    {
        var result = await employeeService.FinalSubmitAsync(employeeId, GetContext(), token);
        return result.Success
            ? Ok(new ApiResponse<EmployeeSaveResult>(true, result.Message, result))
            : BadRequest(new ApiResponse<EmployeeSaveResult>(false, result.Message));
    }


    [HttpGet("{employeeId:long}/documents")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDocumentDto>>>> GetDocuments(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetDocumentsAsync(employeeId, GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<EmployeeDocumentDto>>(true, "Employee documents loaded.", result));
    }

        [HttpGet("{employeeId:long}/documents/{documentId:long}/view")]
    public async Task<IActionResult> ViewDocument(long employeeId, long documentId, CancellationToken token)
    {
        var file = await employeeService.GetDocumentFileAsync(employeeId, documentId, GetContext(), token);
        if (file is null) return NotFound(new ApiResponse<string>(false, "Document file not found on server."));
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{file.Value.FileName}\"";
        return File(file.Value.Bytes, file.Value.ContentType);
    }

    [HttpGet("{employeeId:long}/documents/{documentId:long}/download")]
    public async Task<IActionResult> DownloadDocument(long employeeId, long documentId, CancellationToken token)
    {
        var file = await employeeService.GetDocumentFileAsync(employeeId, documentId, GetContext(), token);
        if (file is null) return NotFound(new ApiResponse<string>(false, "Document file not found on server."));
        return File(file.Value.Bytes, file.Value.ContentType, file.Value.FileName);
    }

    [HttpPost("{employeeId:long}/documents/upload")]
    public async Task<ActionResult<ApiResponse<long>>> UploadDocument(
        long employeeId,
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
        var docName = !string.IsNullOrWhiteSpace(documentName) 
            ? documentName 
            : Request.Query["documentName"].ToString();
        if (string.IsNullOrWhiteSpace(docName))
        {
            docName = Path.GetFileNameWithoutExtension(file.FileName);
        }
        var cat = !string.IsNullOrWhiteSpace(category) 
            ? category 
            : Request.Query["category"].ToString();
        if (string.IsNullOrWhiteSpace(cat))
        {
            cat = "Identity";
        }

        try
        {
            var docId = await employeeService.UploadDocumentAsync(employeeId, documentTypeId, docName, cat, file, GetContext(), token);
            return Ok(new ApiResponse<long>(true, "Document uploaded successfully and submitted for Admin verification.", docId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiResponse<long>(false, ex.Message));
        }
    }

    [HttpDelete("{employeeId:long}/documents/{documentId:long}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDocument(long employeeId, long documentId, CancellationToken token)
    {
        try
        {
            var success = await employeeService.DeleteDocumentAsync(employeeId, documentId, GetContext(), token);
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

    [HttpGet("{employeeId:long}/history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProfileChangeLogDto>>>> GetHistory(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetChangeLogsAsync(employeeId, GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<ProfileChangeLogDto>>(true, "Employee change history loaded.", result));
    }

    [HttpGet("{employeeId:long}/contract-details")]
    public async Task<ActionResult<ApiResponse<ContractDetailsDto>>> GetContractDetails(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetContractDetailsAsync(employeeId, GetContext(), token);
        return result is null
            ? NotFound(new ApiResponse<ContractDetailsDto>(false, "Contract details not found."))
            : Ok(new ApiResponse<ContractDetailsDto>(true, "Employee contract details loaded.", result));
    }

    [HttpGet("{employeeId:long}/renewal-history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RenewalHistoryDto>>>> GetRenewalHistory(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetRenewalHistoryAsync(employeeId, GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<RenewalHistoryDto>>(true, "Employee renewal history loaded.", result));
    }

    [HttpGet("{employeeId:long}/appointment-orders")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentOrderDto>>>> GetAppointmentOrders(long employeeId, CancellationToken token)
    {
        var result = await employeeService.GetAppointmentOrdersAsync(employeeId, GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<AppointmentOrderDto>>(true, "Employee appointment orders loaded.", result));
    }

    [HttpPost("contracts")]
    public async Task<ActionResult<ApiResponse<long>>> SaveContract([FromBody] SaveContractRequest request, CancellationToken token)
    {
        var contractId = await employeeService.SaveContractDetailsAsync(request, GetContext(), token);
        return Ok(new ApiResponse<long>(true, "Contract agreement recorded and activated successfully.", contractId));
    }

    [HttpGet("contracts")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ContractListItemDto>>>> GetAllContracts(CancellationToken token)
    {
        var list = await employeeService.GetAllContractsAsync(GetContext(), token);
        return Ok(new ApiResponse<IReadOnlyList<ContractListItemDto>>(true, "Active contracts loaded.", list));
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
