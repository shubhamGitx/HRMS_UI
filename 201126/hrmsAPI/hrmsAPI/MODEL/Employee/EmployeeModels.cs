using System.ComponentModel.DataAnnotations;

namespace HRMSAPI.MODEL.Employee;

public static class EmployeeRecordStatus
{
    public const string Draft = "DRAFT";
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";
}

#region Step 1: Personal Details Request

public sealed class PersonalDetailsRequest
{
    public long? EmployeeId { get; set; }
    [MaxLength(50)] public string? ContractNo { get; set; }
    [Required, MaxLength(150)] public string EmployeeName { get; set; } = string.Empty;
    [MaxLength(150)] public string? EmployeeNameHindi { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public long? GenderId { get; set; }
    public string? GenderName { get; set; }
    public long? BloodGroupId { get; set; }
    public string? BloodGroupName { get; set; }
    [MaxLength(150)] public string? FatherName { get; set; }
    [MaxLength(150)] public string? MotherName { get; set; }
    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public DateOnly? JoiningDate { get; set; }
    public long? EmploymentStatusId { get; set; }
    public string? EmploymentStatusName { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string? EmployeeTypeName { get; set; }
    public long? OfficeId { get; set; }
    public string? OfficeName { get; set; }
    public long? DesignationId { get; set; }
    public string? DesignationName { get; set; }
    public long? ReportingOfficialId { get; set; }
    public string? ReportingOfficialName { get; set; }
    [MaxLength(100)] public string? IdName { get; set; }
    [MaxLength(100)] public string? IdNumber { get; set; }
    [EmailAddress, MaxLength(150)] public string? OfficialEmail { get; set; }
    [RegularExpression("^[0-9]{10}$"), MaxLength(10)] public string? OfficialMobile { get; set; }
    public string? Photo { get; set; }
}

#endregion

#region Step 2: Contact & Address Request

public sealed class AddressItemRequest
{
    [Required] public string AddressType { get; set; } = "PERMANENT"; // "PERMANENT" or "CURRENT"
    [Required, MaxLength(250)] public string AddressLine1 { get; set; } = string.Empty;
    [MaxLength(250)] public string? AddressLine2 { get; set; }
    [MaxLength(150)] public string? Landmark { get; set; }
    [Required] public long StateId { get; set; }
    public string? StateName { get; set; }
    [Required] public long DistrictId { get; set; }
    public string? DistrictName { get; set; }
    [Required, MaxLength(100)] public string CityName { get; set; } = string.Empty;
    [Required, RegularExpression("^[1-9][0-9]{5}$")] public string Pincode { get; set; } = string.Empty;
    [RegularExpression("^[0-9]{10}$")] public string? AlternateMobile { get; set; }
}

public sealed class ContactAddressRequest
{
    [Required] public long EmployeeId { get; set; }
    [EmailAddress, MaxLength(150)] public string? OfficialEmail { get; set; }
    [RegularExpression("^[0-9]{10}$")] public string? OfficialMobile { get; set; }
    public List<AddressItemRequest> Addresses { get; set; } = [];
}

#endregion

#region Step 3: Qualification & Experience Request

public sealed class QualificationItemRequest
{
    [Required] public long QualificationId { get; set; }
    public string? QualificationName { get; set; }
    [Required, MaxLength(200)] public string InstitutionName { get; set; } = string.Empty;
    public short? PassingYear { get; set; }
    [MaxLength(100)] public string? RollNumber { get; set; }
    [MaxLength(100)] public string? RegistrationNumber { get; set; }
    public decimal? MarksPercentage { get; set; }
    [MaxLength(20)] public string? Grade { get; set; }
    public bool IsHighestQualification { get; set; }
    public long? DocumentId { get; set; }
}

public sealed class ExperienceItemRequest
{
    [Required, MaxLength(200)] public string Organisation { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string Designation { get; set; } = string.Empty;
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    [MaxLength(500)] public string? Responsibilities { get; set; }
}

public sealed class QualificationExperienceRequest
{
    [Required] public long EmployeeId { get; set; }
    public List<QualificationItemRequest> Qualifications { get; set; } = [];
    public List<ExperienceItemRequest> Experiences { get; set; } = [];
}

#endregion

#region Step 4: Bank Details Request

public sealed class BankDetailsRequest
{
    [Required] public long EmployeeId { get; set; }
    [Required] public long BankId { get; set; }

    public string? BankName { get; set; }
    [Required, MaxLength(150)] public string BranchName { get; set; } = string.Empty;
    [Required, RegularExpression("^[A-Za-z0-9]{6,34}$")] public string AccountNumber { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string AccountHolderName { get; set; } = string.Empty;
    [Required, RegularExpression("^[A-Z]{4}0[A-Z0-9]{6}$")] public string IfscCode { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string AccountType { get; set; } = "SAVINGS";
    public string? BankDocument { get; set; }
}

#endregion

#region Step 5: Nominee & Emergency Contacts Request

public sealed class NomineeItemRequest
{
    [Required, MaxLength(150)] public string NomineeName { get; set; } = string.Empty;
    [Required, MaxLength(60)] public string Relationship { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    [Range(0, 100)] public decimal SharePercentage { get; set; }
    [MaxLength(500)] public string? Address { get; set; }
}

public sealed class EmergencyContactItemRequest
{
    [Required, MaxLength(150)] public string ContactName { get; set; } = string.Empty;
    [Required, MaxLength(60)] public string Relationship { get; set; } = string.Empty;
    [Required, RegularExpression("^[0-9]{10}$")] public string Mobile { get; set; } = string.Empty;
    [MaxLength(500)] public string? Address { get; set; }
}

public sealed class NomineeEmergencyRequest
{
    [Required] public long EmployeeId { get; set; }
    public List<NomineeItemRequest> Nominees { get; set; } = [];
    public List<EmergencyContactItemRequest> EmergencyContacts { get; set; } = [];
}

#endregion

#region Full Profile & List Models

public sealed class EmployeeFullProfileResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public PersonalDetailsRequest PersonalDetails { get; set; } = new();
    public ContactAddressRequest ContactAddress { get; set; } = new();
    public QualificationExperienceRequest QualificationExperience { get; set; } = new();
    public BankDetailsRequest? BankDetails { get; set; }
    public NomineeEmergencyRequest NomineeEmergency { get; set; } = new();
}

public sealed record EmployeeListItem(
    long EmployeeId,
    string ContractNo,
    string EmployeeName,
    string? OfficeName,
    string? DesignationName,
    string? ReportingName,
    string RecordStatus,
    string? OfficialMobile,
    string? OfficialEmail,
    int CompletedSections);

public sealed record MasterOption(long Id, string Name, string? Code = null);

public sealed record ReportingOfficerOption(long OfficialId, string UserId, string OfficialName, string? Designation);

public sealed record EmployeeMastersResponse(
    IReadOnlyList<MasterOption> Genders,
    IReadOnlyList<MasterOption> BloodGroups,
    IReadOnlyList<MasterOption> Categories,
    IReadOnlyList<MasterOption> EmploymentStatuses,
    IReadOnlyList<MasterOption> EmployeeTypes,
    IReadOnlyList<MasterOption> Offices,
    IReadOnlyList<MasterOption> Designations,
    IReadOnlyList<MasterOption> IdTypes,
    IReadOnlyList<MasterOption> States,
    IReadOnlyList<MasterOption> Districts,
    IReadOnlyList<MasterOption> Qualifications,
    IReadOnlyList<MasterOption> Banks,
    IReadOnlyList<MasterOption> Documents,
    IReadOnlyList<ReportingOfficerOption> ReportingOfficers);

public sealed record EmployeeSaveResult(
    bool Success,
    string Message,
    long EmployeeId,
    string ContractNo);

public sealed record EmployeeUserContext(
    long DepartmentId,
    string RoleCode,
    long? EmployeeId,
    long? OfficialId,
    short LangCode,
    long ActorId,
    string? IpAddress,
    string UserId,
    long? OfficeId = null);

#endregion

public sealed class EmployeePersonalDetailsResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public PersonalDetailsRequest PersonalDetails { get; set; } = new();
}
public sealed class EmployeeAddressDetailsResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public ContactAddressRequest ContactAddress { get; set; } = new();
}
public sealed class EmployeeQualificationDetailsResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public QualificationExperienceRequest QualificationExperience { get; set; } = new();
}

public sealed class BankDetailsItemResponse
{
    public long EmployeeId { get; set; }

    public long BankId { get; set; }

    public string? BankName { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    public string AccountHolderName { get; set; } = string.Empty;

    public string IfscCode { get; set; } = string.Empty;

    public string AccountType { get; set; } = "SAVINGS";

    public string? BankDocument { get; set; }
}
public sealed class NomineeItemResponse
{
    public string NomineeName { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public decimal SharePercentage { get; set; }
    public string? Address { get; set; }
}
public sealed class EmergencyContactItemResponse
{
    public string ContactName { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Address { get; set; }
}

public sealed class EmployeeBankDetailsResponse
{
    public long EmployeeId { get; set; }

    public string ContractNo { get; set; } = string.Empty;

    public string RecordStatus { get; set; } =
        EmployeeRecordStatus.Draft;

    public BankDetailsItemResponse? BankDetails { get; set; }
}
public sealed class EmployeeNomineeDetailsResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public List<NomineeItemResponse> Nominees { get; set; } = [];
}
public sealed class EmployeeEmergencyDetailsResponse
{
    public long EmployeeId { get; set; }
    public string ContractNo { get; set; } = string.Empty;
    public string RecordStatus { get; set; } = EmployeeRecordStatus.Draft;
    public List<EmergencyContactItemResponse> EmergencyContacts { get; set; } = [];
}

public sealed class EmployeeDocumentDto
{
    public long DocumentId { get; set; }
    public long EmployeeId { get; set; }
    public long DepartmentId { get; set; }
    public long? DocumentTypeId { get; set; }
    public int DocumentNumber { get; set; }
    public int VersionNumber { get; set; } = 1;
    public string? StorageFileName { get; set; }
    public string? Checksum { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string SizeFormatted { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public string UploadedOn { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public byte[]? FileData { get; set; }
    public string? RejectionRemarks { get; set; }
    public long? VerifiedBy { get; set; }
    public string? VerifiedAt { get; set; }
}

public sealed class DocumentTypeDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class DocumentVerificationRequest
{
    public string? Remarks { get; set; }
}

public sealed class DocumentRejectionRequest
{
    public string Remarks { get; set; } = string.Empty;
}

public sealed class DocumentVerificationHistoryDto
{
    public long HistoryId { get; set; }
    public long DocumentId { get; set; }
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public long? ActionBy { get; set; }
    public string ActionByName { get; set; } = string.Empty;
    public string? ActionRemarks { get; set; }
    public string ActionDate { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
}

public sealed class AdminDocumentListItemDto
{
    public long DocumentId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public long DepartmentId { get; set; }
    public int DocumentNumber { get; set; }
    public int VersionNumber { get; set; } = 1;
    public string? StorageFileName { get; set; }
    public string? Checksum { get; set; }
    public long? DocumentTypeId { get; set; }
    public string DocumentName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string SizeFormatted { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public string UploadedOn { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public byte[]? FileData { get; set; }
    public string? RejectionRemarks { get; set; }
    public long? VerifiedBy { get; set; }
    public string? VerifiedAt { get; set; }
}

public sealed class EmployeeDocumentSummaryDto
{
    public int TotalDocuments { get; set; }
    public int PendingCount { get; set; }
    public int VerifiedCount { get; set; }
    public int RejectedCount { get; set; }
}


public sealed class ProfileChangeLogDto
{
    public long Id { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public string Change { get; set; } = string.Empty;
    public string By { get; set; } = string.Empty;
    public string Status { get; set; } = "Approved";
}

public sealed class ContractTermClauseDto
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}

public sealed class ContractDetailsDto
{
    public string ContractId { get; set; } = string.Empty;
    public string ContractNo { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string OfficeLocation { get; set; } = string.Empty;
    public string ContractType { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public decimal MonthlyConsolidatedPay { get; set; }
    public string PayStructure { get; set; } = string.Empty;
    public string SanctionOrderNo { get; set; } = string.Empty;
    public string SanctionOrderDate { get; set; } = string.Empty;
    public string ReportingOfficer { get; set; } = string.Empty;
    public string ReportingOfficerDesignation { get; set; } = string.Empty;
    public string PostingUnit { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public int TotalDays { get; set; }
    public int RemainingDays { get; set; }
    public int PassedDays { get; set; }
    public List<ContractTermClauseDto> TermsAndConditions { get; set; } = [];
}

public sealed class RenewalHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string RenewalPhase { get; set; } = string.Empty;
    public string ContractNo { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int DurationMonths { get; set; }
    public decimal MonthlyPay { get; set; }
    public decimal IncrementPercentage { get; set; }
    public string SanctionOrderNo { get; set; } = string.Empty;
    public string SanctionOrderDate { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string Remarks { get; set; } = string.Empty;
    public string DocumentRef { get; set; } = string.Empty;
    public string PerformanceGrade { get; set; } = "A";
}

public sealed class AppointmentOrderDto
{
    public string Id { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public string Category { get; set; } = "Initial Appointment";
    public string MemoNumber { get; set; } = string.Empty;
    public string IssueDate { get; set; } = string.Empty;
    public string EffectiveDate { get; set; } = string.Empty;
    public string IssuingAuthority { get; set; } = string.Empty;
    public string FileSize { get; set; } = "316 KB";
    public string FileType { get; set; } = "PDF";
    public string DownloadUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsLatest { get; set; } = true;
}



public sealed class SaveContractRequest
{
    public long EmployeeId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public long ContractTypeId { get; set; } = 1;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public decimal MonthlyPay { get; set; } = 45000;
    public string? AppointingAuthority { get; set; }
    public string? AppointmentOrderNo { get; set; }
    public string? AppointmentOrderDate { get; set; }
    public string ContractStatus { get; set; } = "ACTIVE";
    public string? Remarks { get; set; }
}

public sealed class ContractListItemDto
{
    public long ContractId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string ContractNumber { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public decimal MonthlyPay { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string OrderDate { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}
