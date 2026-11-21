using HRMSAPI.AppCode;
using HRMSAPI.DAL.Office;
using HRMSAPI.MODEL.Login;
using HRMSAPI.MODEL.Office;

namespace HRMSAPI.BAL.Office;

public sealed class OfficeService(IOfficeRepository officeRepository) : IOfficeService
{
    private const string DefaultInitialPassword = "Admin@123";

    public async Task<ApiResponse<OfficeCreatedResult>> CreateOfficeAsync(
        long departmentId,
        string superAdminUserId,
        CreateOfficeRequest request,
        CancellationToken cancellationToken)
    {
        if (departmentId <= 0)
        {
            return new ApiResponse<OfficeCreatedResult>(false, "Invalid department context for Super Admin.");
        }

        var plainPassword = string.IsNullOrWhiteSpace(request.AdminPassword)
            ? DefaultInitialPassword
            : request.AdminPassword.Trim();

        var passwordHash = PasswordUtility.Hash(plainPassword);

        var result = await officeRepository.CreateOfficeWithDadmAsync(
            departmentId,
            request.OfficeName,
            request.OfficeNameHindi,
            request.AdminName,
            request.AdminPhone,
            request.AdminEmail,
            request.AdminUserId,
            passwordHash,
            superAdminUserId,
            cancellationToken);

        if (!result.Success)
        {
            return new ApiResponse<OfficeCreatedResult>(false, result.Message);
        }

        result.DefaultPassword = plainPassword;
        return new ApiResponse<OfficeCreatedResult>(
            true,
            $"Office '{result.OfficeName}' created successfully and DADM account ({result.UserId}) provisioned.",
            result);
    }

    public async Task<ApiResponse<IReadOnlyList<DepartmentOfficeDto>>> GetDepartmentOfficesAsync(
        long departmentId,
        CancellationToken cancellationToken)
    {
        var offices = await officeRepository.GetDepartmentOfficesAsync(departmentId, cancellationToken);
        return new ApiResponse<IReadOnlyList<DepartmentOfficeDto>>(
            true,
            "Offices retrieved successfully.",
            offices);
    }
}
