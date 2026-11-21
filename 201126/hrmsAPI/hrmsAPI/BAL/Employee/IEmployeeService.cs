using HRMSAPI.MODEL.Employee;

namespace HRMSAPI.BAL.Employee;

public interface IEmployeeService
{
    Task<EmployeeMastersResponse> GetMastersAsync(EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<EmployeeListItem>> GetListAsync(EmployeeUserContext context, CancellationToken token);
    //risha
    Task<EmployeePersonalDetailsResponse?> GetPersonalDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeAddressDetailsResponse?> GetAddressDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeQualificationDetailsResponse?> GetQualificationDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeBankDetailsResponse?> GetBankDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeNomineeDetailsResponse?> GetNomineeDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeEmergencyDetailsResponse?> GetEmergencyContactDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    //end risha
    Task<EmployeeFullProfileResponse?> GetFullProfileAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> SavePersonalDetailsAsync(PersonalDetailsRequest request, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> SaveContactAddressAsync(ContactAddressRequest request, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> SaveQualificationExperienceAsync(QualificationExperienceRequest request, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> SaveBankDetailsAsync(BankDetailsRequest request, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> SaveNomineeEmergencyAsync(NomineeEmergencyRequest request, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeSaveResult> FinalSubmitAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, bool verifiedOnly, EmployeeUserContext context, CancellationToken token);
    Task<(byte[] Bytes, string ContentType, string FileName)?> GetDocumentFileAsync(long? employeeId, long documentId, EmployeeUserContext context, CancellationToken token);
    Task<long> UploadDocumentAsync(long employeeId, string documentName, string category, Microsoft.AspNetCore.Http.IFormFile file, EmployeeUserContext context, CancellationToken token);
    Task<long> UploadDocumentAsync(long employeeId, long? documentTypeId, string documentName, string category, Microsoft.AspNetCore.Http.IFormFile file, EmployeeUserContext context, CancellationToken token);
    Task<bool> DeleteDocumentAsync(long employeeId, long documentId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<DocumentTypeDto>> GetDocumentTypesAsync(short langCode, CancellationToken token);
    Task<IReadOnlyList<AdminDocumentListItemDto>> GetDocumentsForVerificationAsync(string? status, long? employeeId, long? departmentId, string? search, EmployeeUserContext context, CancellationToken token);
    Task<bool> VerifyDocumentAsync(long documentId, string? remarks, EmployeeUserContext context, CancellationToken token);
    Task<bool> RejectDocumentAsync(long documentId, string remarks, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<DocumentVerificationHistoryDto>> GetDocumentVerificationHistoryAsync(long documentId, EmployeeUserContext context, CancellationToken token);
    Task<EmployeeDocumentSummaryDto> GetEmployeeDocumentSummaryAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<ProfileChangeLogDto>> GetChangeLogsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<ContractDetailsDto?> GetContractDetailsAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<RenewalHistoryDto>> GetRenewalHistoryAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<AppointmentOrderDto>> GetAppointmentOrdersAsync(long employeeId, EmployeeUserContext context, CancellationToken token);
    Task<long> SaveContractDetailsAsync(SaveContractRequest request, EmployeeUserContext context, CancellationToken token);
    Task<IReadOnlyList<ContractListItemDto>> GetAllContractsAsync(EmployeeUserContext context, CancellationToken token);
}
