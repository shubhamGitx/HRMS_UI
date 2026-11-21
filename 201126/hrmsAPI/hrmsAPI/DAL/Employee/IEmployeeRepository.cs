using HRMSAPI.MODEL.Employee;

namespace HRMSAPI.DAL.Employee;

public interface IEmployeeRepository
{
    Task<EmployeeMastersResponse> GetMastersAsync(long departmentId, short langCode, CancellationToken token);
    Task<IReadOnlyList<EmployeeListItem>> GetListAsync(long departmentId, long? officeId, string roleCode, short langCode, CancellationToken token);

    //risha
    Task<EmployeePersonalDetailsResponse?> GetPersonalDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token);
    Task<EmployeeAddressDetailsResponse?> GetAddressDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token);
    Task<EmployeeQualificationDetailsResponse?> GetQualificationDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token);

    Task<EmployeeBankDetailsResponse?> GetBankDetailsAsync(long employeeId, long departmentId, short langCode, CancellationToken token);
    Task<EmployeeNomineeDetailsResponse?> GetNomineeDetailsAsync(long employeeId, long departmentId, CancellationToken token);
    Task<EmployeeEmergencyDetailsResponse?> GetEmergencyContactDetailsAsync(long employeeId, long departmentId, CancellationToken token);


    //end risha
    Task<EmployeeFullProfileResponse?> GetFullProfileAsync(long employeeId, long departmentId, short langCode, CancellationToken token);
    Task<(long EmployeeId, string ContractNo)> SavePersonalDetailsAsync(PersonalDetailsRequest request, long departmentId, long actorId, string? ipAddress, CancellationToken token);
    Task SaveContactAddressAsync(ContactAddressRequest request, long actorId, string? ipAddress, CancellationToken token);
    Task SaveQualificationExperienceAsync(QualificationExperienceRequest request, long actorId, string? ipAddress, CancellationToken token);
    Task SaveBankDetailsAsync(BankDetailsRequest request, long actorId, string? ipAddress, CancellationToken token);
    Task SaveNomineeEmergencyAsync(NomineeEmergencyRequest request, long actorId, string? ipAddress, CancellationToken token);
    Task<string> FinalSubmitAsync(long employeeId, long departmentId, string currentUserId, long actorId, string? ipAddress, CancellationToken token);

    Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, bool verifiedOnly, CancellationToken token);
    Task<EmployeeDocumentDto?> GetDocumentByIdAsync(long documentId, CancellationToken token);
    Task<long> AddDocumentAsync(long employeeId, long? documentTypeId, string documentName, string category, string originalFileName, string contentType, long fileSize, string filePath, long? uploadedBy, CancellationToken token);
    Task<bool> DeleteDocumentAsync(long employeeId, long documentId, CancellationToken token);
    Task<IReadOnlyList<DocumentTypeDto>> GetDocumentTypesAsync(short langCode, CancellationToken token);
    Task<IReadOnlyList<AdminDocumentListItemDto>> GetDocumentsForVerificationAsync(string? status, long? employeeId, long? departmentId, string? search, CancellationToken token);
    Task<bool> VerifyDocumentAsync(long documentId, long verifiedBy, string? remarks, CancellationToken token);
    Task<bool> RejectDocumentAsync(long documentId, long rejectedBy, string remarks, CancellationToken token);
    Task<IReadOnlyList<DocumentVerificationHistoryDto>> GetDocumentVerificationHistoryAsync(long documentId, CancellationToken token);
    Task<EmployeeDocumentSummaryDto> GetEmployeeDocumentSummaryAsync(long employeeId, CancellationToken token);
    Task<IReadOnlyList<ProfileChangeLogDto>> GetChangeLogsAsync(long employeeId, CancellationToken token);
    Task<ContractDetailsDto?> GetContractDetailsAsync(long employeeId, CancellationToken token);
    Task<IReadOnlyList<RenewalHistoryDto>> GetRenewalHistoryAsync(long employeeId, CancellationToken token);
    Task<IReadOnlyList<AppointmentOrderDto>> GetAppointmentOrdersAsync(long employeeId, CancellationToken token);
    Task<long> SaveContractDetailsAsync(SaveContractRequest request, long actorId, string? ipAddress, CancellationToken token);
    Task<IReadOnlyList<ContractListItemDto>> GetAllContractsAsync(CancellationToken token);
}
