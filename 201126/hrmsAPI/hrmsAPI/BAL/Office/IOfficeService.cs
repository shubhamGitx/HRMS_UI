using HRMSAPI.MODEL.Login;
using HRMSAPI.MODEL.Office;

namespace HRMSAPI.BAL.Office;

public interface IOfficeService
{
    Task<ApiResponse<OfficeCreatedResult>> CreateOfficeAsync(
        long departmentId,
        string superAdminUserId,
        CreateOfficeRequest request,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<DepartmentOfficeDto>>> GetDepartmentOfficesAsync(
        long departmentId,
        CancellationToken cancellationToken);
}
