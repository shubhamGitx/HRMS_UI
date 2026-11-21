using HRMSAPI.MODEL.Office;

namespace HRMSAPI.DAL.Office;

public interface IOfficeRepository
{
    Task<OfficeCreatedResult> CreateOfficeWithDadmAsync(
        long departmentId,
        string officeName,
        string? officeNameHindi,
        string adminName,
        string? adminPhone,
        string? adminEmail,
        string? adminUserId,
        string adminPasswordHash,
        string createdBy,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DepartmentOfficeDto>> GetDepartmentOfficesAsync(
        long departmentId,
        CancellationToken cancellationToken);
}
