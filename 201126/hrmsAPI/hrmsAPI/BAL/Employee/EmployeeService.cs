using HRMSAPI.DAL.Employee;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using HRMSAPI.MODEL.Employee;

namespace HRMSAPI.BAL.Employee;

public sealed class EmployeeService(IEmployeeRepository repository, IWebHostEnvironment env, IConfiguration configuration) : IEmployeeService
{
    public Task<EmployeeMastersResponse> GetMastersAsync(EmployeeUserContext context, CancellationToken token) =>
        repository.GetMastersAsync(context.DepartmentId, context.LangCode, token);

    public Task<IReadOnlyList<EmployeeListItem>> GetListAsync(EmployeeUserContext context, CancellationToken token) =>
        repository.GetListAsync(context.DepartmentId, context.OfficeId, context.RoleCode, context.LangCode, token);
    //risha
    public Task<EmployeePersonalDetailsResponse?> GetPersonalDetailsAsync(
       long employeeId,
       EmployeeUserContext context,
       CancellationToken token) =>
       repository.GetPersonalDetailsAsync(
           employeeId,
           context.DepartmentId,
           context.LangCode,
           token);
    public Task<EmployeeAddressDetailsResponse?> GetAddressDetailsAsync(
    long employeeId,
    EmployeeUserContext context,
    CancellationToken token) =>
    repository.GetAddressDetailsAsync(
        employeeId,
        context.DepartmentId,
        context.LangCode,
        token);

    public Task<EmployeeQualificationDetailsResponse?> GetQualificationDetailsAsync(
    long employeeId,
    EmployeeUserContext context,
    CancellationToken token) =>
    repository.GetQualificationDetailsAsync(
        employeeId,
        context.DepartmentId,
        context.LangCode,
        token);

    public Task<EmployeeBankDetailsResponse?> GetBankDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
 repository.GetBankDetailsAsync(
     employeeId,
     context.DepartmentId,
     context.LangCode,
     token);

    public Task<EmployeeNomineeDetailsResponse?> GetNomineeDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
    repository.GetNomineeDetailsAsync(
        employeeId,
        context.DepartmentId,
        token);
    public Task<EmployeeEmergencyDetailsResponse?> GetEmergencyContactDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
  repository.GetEmergencyContactDetailsAsync(
      employeeId,
      context.DepartmentId,
      token);


    //end risha


    public Task<EmployeeFullProfileResponse?> GetFullProfileAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetFullProfileAsync(employeeId, context.DepartmentId, context.LangCode, token);

    public async Task<EmployeeSaveResult> SavePersonalDetailsAsync(PersonalDetailsRequest request, EmployeeUserContext context, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(request.EmployeeName))
            return new EmployeeSaveResult(false, "Employee name is required.", 0, string.Empty);

        if (context.OfficeId.HasValue && context.OfficeId.Value > 0)
        {
            request.OfficeId = context.OfficeId.Value;
        }

        var (employeeId, contractNo) = await repository.SavePersonalDetailsAsync(
            request, context.DepartmentId, context.ActorId, context.IpAddress, token);

        return new EmployeeSaveResult(true, "Personal details saved successfully.", employeeId, contractNo);
    }

    public async Task<EmployeeSaveResult> SaveContactAddressAsync(ContactAddressRequest request, EmployeeUserContext context, CancellationToken token)
    {
        if (request.EmployeeId <= 0)
            return new EmployeeSaveResult(false, "Valid employee ID is required.", 0, string.Empty);

        await repository.SaveContactAddressAsync(request, context.ActorId, context.IpAddress, token);
        return new EmployeeSaveResult(true, "Contact and address saved successfully.", request.EmployeeId, string.Empty);
    }

    public async Task<EmployeeSaveResult> SaveQualificationExperienceAsync(QualificationExperienceRequest request, EmployeeUserContext context, CancellationToken token)
    {
        if (request.EmployeeId <= 0)
            return new EmployeeSaveResult(false, "Valid employee ID is required.", 0, string.Empty);

        await repository.SaveQualificationExperienceAsync(request, context.ActorId, context.IpAddress, token);
        return new EmployeeSaveResult(true, "Qualification and experience saved successfully.", request.EmployeeId, string.Empty);
    }

    public async Task<EmployeeSaveResult> SaveBankDetailsAsync(BankDetailsRequest request, EmployeeUserContext context, CancellationToken token)
    {
        if (request.EmployeeId <= 0)
            return new EmployeeSaveResult(false, "Valid employee ID is required.", 0, string.Empty);

        await repository.SaveBankDetailsAsync(request, context.ActorId, context.IpAddress, token);
        return new EmployeeSaveResult(true, "Bank details saved successfully.", request.EmployeeId, string.Empty);
    }

    public async Task<EmployeeSaveResult> SaveNomineeEmergencyAsync(NomineeEmergencyRequest request, EmployeeUserContext context, CancellationToken token)
    {
        if (request.EmployeeId <= 0)
            return new EmployeeSaveResult(false, "Valid employee ID is required.", 0, string.Empty);

        await repository.SaveNomineeEmergencyAsync(request, context.ActorId, context.IpAddress, token);
        return new EmployeeSaveResult(true, "Nominee and emergency contacts saved successfully.", request.EmployeeId, string.Empty);
    }

    public async Task<EmployeeSaveResult> FinalSubmitAsync(long employeeId, EmployeeUserContext context, CancellationToken token)
    {
        if (employeeId <= 0)
            return new EmployeeSaveResult(false, "Valid employee ID is required.", 0, string.Empty);

        var contractNo = await repository.FinalSubmitAsync(
            employeeId, context.DepartmentId, context.UserId, context.ActorId, context.IpAddress, token);

        return new EmployeeSaveResult(true, $"Employee {contractNo} has been activated and login account created successfully.", employeeId, contractNo);
    }

    public Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, EmployeeUserContext context, CancellationToken token)
    {
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase) && context.EmployeeId.HasValue && context.EmployeeId.Value > 0)
        {
            employeeId = context.EmployeeId.Value;
        }
        return repository.GetDocumentsAsync(employeeId, verifiedOnly: false, token);
    }

    public Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, bool verifiedOnly, EmployeeUserContext context, CancellationToken token)
    {
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase) && context.EmployeeId.HasValue && context.EmployeeId.Value > 0)
        {
            employeeId = context.EmployeeId.Value;
        }
        return repository.GetDocumentsAsync(employeeId, verifiedOnly, token);
    }

        private string GetUploadsRootPath()
    {
        var configured = configuration["Storage:UploadsPath"];
        if (!string.IsNullOrWhiteSpace(configured) && Directory.Exists(configured))
            return configured;

        if (Directory.Exists(Path.Combine(env.ContentRootPath, "Uploads")))
            return Path.Combine(env.ContentRootPath, "Uploads");

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "Uploads");
            if (Directory.Exists(candidate))
                return candidate;

            var nested = Path.Combine(dir.FullName, "hrmsAPI", "Uploads");
            if (Directory.Exists(nested))
                return nested;

            dir = dir.Parent;
        }

        return Path.Combine(env.ContentRootPath, "Uploads");
    }

    private string? ResolveFilePath(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return null;

        if (Path.IsPathRooted(filePath) && File.Exists(filePath))
            return filePath;

        var relative = filePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var relativeWithoutUploads = relative.StartsWith("Uploads" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            ? relative.Substring(8)
            : relative;

        var uploadsRoot = GetUploadsRootPath();
        var candidate1 = Path.Combine(uploadsRoot, relativeWithoutUploads);
        if (File.Exists(candidate1)) return candidate1;

        var candidate2 = Path.Combine(Directory.GetParent(uploadsRoot)?.FullName ?? uploadsRoot, relative);
        if (File.Exists(candidate2)) return candidate2;

        var candidate3 = Path.Combine(env.ContentRootPath, relative);
        if (File.Exists(candidate3)) return candidate3;

        var candidate4 = Path.Combine(AppContext.BaseDirectory, relative);
        if (File.Exists(candidate4)) return candidate4;

        var candidate5 = Path.Combine(Directory.GetCurrentDirectory(), relative);
        if (File.Exists(candidate5)) return candidate5;

        return null;
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)?> GetDocumentFileAsync(long? employeeId, long documentId, EmployeeUserContext context, CancellationToken token)
    {
        var doc = await repository.GetDocumentByIdAsync(documentId, token);
        if (doc is null) return null;

        // Security check: Employee can only access their own documents
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase) && context.EmployeeId.HasValue && context.EmployeeId.Value > 0)
        {
            if (doc.EmployeeId != context.EmployeeId.Value) return null;
        }
        else if (employeeId.HasValue && employeeId.Value > 0 && doc.EmployeeId != employeeId.Value)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(doc.FilePath))
        {
            var fullPath = ResolveFilePath(doc.FilePath);
            if (fullPath != null && File.Exists(fullPath))
            {
                var bytes = await File.ReadAllBytesAsync(fullPath, token);
                return (bytes, doc.ContentType, doc.FileName);
            }
        }

        if (doc.FileData != null && doc.FileData.Length > 0)
        {
            return (doc.FileData, doc.ContentType, doc.FileName);
        }

        return null;
    }

    public Task<long> UploadDocumentAsync(long employeeId, string documentName, string category, Microsoft.AspNetCore.Http.IFormFile file, EmployeeUserContext context, CancellationToken token) =>
        UploadDocumentAsync(employeeId, null, documentName, category, file, context, token);

    public async Task<long> UploadDocumentAsync(long employeeId, long? documentTypeId, string documentName, string category, Microsoft.AspNetCore.Http.IFormFile file, EmployeeUserContext context, CancellationToken token)
    {
        // Enforce authenticated employee ID if employee is uploading
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase) && context.EmployeeId.HasValue && context.EmployeeId.Value > 0)
        {
            employeeId = context.EmployeeId.Value;
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new ArgumentException("Only PDF, JPG, JPEG, and PNG files are allowed.");
        }
        if (file.Length > 5 * 1024 * 1024)
        {
            throw new ArgumentException("File size exceeds maximum allowed limit of 5 MB.");
        }

        var safeDocName = string.Join("_", documentName.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
        var uploadsRoot = GetUploadsRootPath();
        var baseDir = Path.Combine(uploadsRoot, "Documents", employeeId.ToString(), safeDocName);
        Directory.CreateDirectory(baseDir);

        var safeFileName = Path.GetFileName(file.FileName);
        var fullPath = Path.Combine(baseDir, safeFileName);
        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, token);
        }

        var relativePath = $"Uploads/Documents/{employeeId}/{safeDocName}/{safeFileName}";
        var uploadedBy = context.ActorId > 0 ? context.ActorId : employeeId;
        return await repository.AddDocumentAsync(employeeId, documentTypeId, documentName, category, safeFileName, file.ContentType, file.Length, relativePath, uploadedBy, token);
    }

    public async Task<bool> DeleteDocumentAsync(long employeeId, long documentId, EmployeeUserContext context, CancellationToken token)
    {
        if (context.RoleCode.Equals("EMP", StringComparison.OrdinalIgnoreCase) && context.EmployeeId.HasValue && context.EmployeeId.Value > 0)
        {
            employeeId = context.EmployeeId.Value;
        }

        return await repository.DeleteDocumentAsync(employeeId, documentId, token);
    }

    public Task<IReadOnlyList<DocumentTypeDto>> GetDocumentTypesAsync(short langCode, CancellationToken token) =>
        repository.GetDocumentTypesAsync(langCode, token);

    public Task<IReadOnlyList<AdminDocumentListItemDto>> GetDocumentsForVerificationAsync(string? status, long? employeeId, long? departmentId, string? search, EmployeeUserContext context, CancellationToken token) =>
        repository.GetDocumentsForVerificationAsync(status, employeeId, departmentId, search, token);

    public Task<bool> VerifyDocumentAsync(long documentId, string? remarks, EmployeeUserContext context, CancellationToken token)
    {
        var verifiedBy = context.OfficialId ?? context.ActorId;
        return repository.VerifyDocumentAsync(documentId, verifiedBy, remarks, token);
    }

    public Task<bool> RejectDocumentAsync(long documentId, string remarks, EmployeeUserContext context, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(remarks))
        {
            throw new ArgumentException("Rejection remarks are mandatory.");
        }
        var rejectedBy = context.OfficialId ?? context.ActorId;
        return repository.RejectDocumentAsync(documentId, rejectedBy, remarks.Trim(), token);
    }

    public Task<IReadOnlyList<DocumentVerificationHistoryDto>> GetDocumentVerificationHistoryAsync(long documentId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetDocumentVerificationHistoryAsync(documentId, token);

    public Task<EmployeeDocumentSummaryDto> GetEmployeeDocumentSummaryAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetEmployeeDocumentSummaryAsync(employeeId, token);


    public Task<IReadOnlyList<ProfileChangeLogDto>> GetChangeLogsAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetChangeLogsAsync(employeeId, token);

    public Task<ContractDetailsDto?> GetContractDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetContractDetailsAsync(employeeId, token);

    public Task<IReadOnlyList<RenewalHistoryDto>> GetRenewalHistoryAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetRenewalHistoryAsync(employeeId, token);

    public Task<IReadOnlyList<AppointmentOrderDto>> GetAppointmentOrdersAsync(long employeeId, EmployeeUserContext context, CancellationToken token) =>
        repository.GetAppointmentOrdersAsync(employeeId, token);

    public Task<long> SaveContractDetailsAsync(SaveContractRequest request, EmployeeUserContext context, CancellationToken token) =>
        repository.SaveContractDetailsAsync(request, context.ActorId, context.IpAddress, token);

    public Task<IReadOnlyList<ContractListItemDto>> GetAllContractsAsync(EmployeeUserContext context, CancellationToken token) =>
        repository.GetAllContractsAsync(token);
}
