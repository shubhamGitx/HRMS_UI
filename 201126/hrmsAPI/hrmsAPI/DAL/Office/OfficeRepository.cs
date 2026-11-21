using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Office;

namespace HRMSAPI.DAL.Office;

public sealed class OfficeRepository(PostgreSqlDataAccess dataAccess) : IOfficeRepository
{
    public async Task<OfficeCreatedResult> CreateOfficeWithDadmAsync(
        long departmentId,
        string officeName,
        string? officeNameHindi,
        string adminName,
        string? adminPhone,
        string? adminEmail,
        string? adminUserId,
        string adminPasswordHash,
        string createdBy,
        CancellationToken cancellationToken)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["p_department_id"] = departmentId,
            ["p_office_name"] = officeName.Trim(),
            ["p_office_name_hindi"] = string.IsNullOrWhiteSpace(officeNameHindi) ? null : officeNameHindi.Trim(),
            ["p_admin_name"] = adminName.Trim(),
            ["p_admin_phone"] = string.IsNullOrWhiteSpace(adminPhone) ? null : adminPhone.Trim(),
            ["p_admin_email"] = string.IsNullOrWhiteSpace(adminEmail) ? null : adminEmail.Trim().ToLowerInvariant(),
            ["p_admin_user_id"] = string.IsNullOrWhiteSpace(adminUserId) ? null : adminUserId.Trim(),
            ["p_admin_password_hash"] = adminPasswordHash,
            ["p_created_by"] = createdBy
        };

        var dt = await dataAccess.GetDataTableAsync("""
            SELECT * FROM official.fn_create_department_office_with_dadm(
                @p_department_id,
                @p_office_name,
                @p_office_name_hindi,
                @p_admin_name,
                @p_admin_phone,
                @p_admin_email,
                @p_admin_user_id,
                @p_admin_password_hash,
                @p_created_by
            );
            """, parameters, cancellationToken);

        if (dt.Rows.Count == 0)
        {
            return new OfficeCreatedResult
            {
                Success = false,
                Message = "Database operation did not return any result."
            };
        }

        var row = dt.Rows[0];
        return new OfficeCreatedResult
        {
            Success = Convert.ToBoolean(row["success"]),
            Message = Convert.ToString(row["message"]) ?? string.Empty,
            OfficeId = row["office_id"] == DBNull.Value ? 0 : Convert.ToInt64(row["office_id"]),
            OfficeName = Convert.ToString(row["office_name"]) ?? string.Empty,
            OfficialId = row["official_id"] == DBNull.Value ? 0 : Convert.ToInt64(row["official_id"]),
            UserId = Convert.ToString(row["user_id"]) ?? string.Empty
        };
    }

    public async Task<IReadOnlyList<DepartmentOfficeDto>> GetDepartmentOfficesAsync(
        long departmentId,
        CancellationToken cancellationToken)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["p_department_id"] = departmentId
        };

        var dt = await dataAccess.GetDataTableAsync("""
            SELECT * FROM official.fn_get_department_offices(@p_department_id);
            """, parameters, cancellationToken);

        var list = new List<DepartmentOfficeDto>(dt.Rows.Count);
        foreach (DataRow row in dt.Rows)
        {
            list.Add(new DepartmentOfficeDto
            {
                OfficeId = Convert.ToInt64(row["office_id"]),
                OfficeName = Convert.ToString(row["office_name"]) ?? string.Empty,
                OfficeNameHindi = row["office_name_hindi"] == DBNull.Value ? null : Convert.ToString(row["office_name_hindi"]),
                DepartmentId = row["department_id"] == DBNull.Value ? 0 : Convert.ToInt64(row["department_id"]),
                AdminOfficialId = row["admin_official_id"] == DBNull.Value ? null : Convert.ToInt64(row["admin_official_id"]),
                AdminName = row["admin_name"] == DBNull.Value ? null : Convert.ToString(row["admin_name"]),
                AdminPhone = row["admin_phone"] == DBNull.Value ? null : Convert.ToString(row["admin_phone"]),
                AdminEmail = row["admin_email"] == DBNull.Value ? null : Convert.ToString(row["admin_email"]),
                AdminUserId = row["admin_user_id"] == DBNull.Value ? null : Convert.ToString(row["admin_user_id"]),
                TotalEmployees = row["total_employees"] == DBNull.Value ? 0 : Convert.ToInt64(row["total_employees"]),
                IsActive = row["is_active"] == DBNull.Value || Convert.ToBoolean(row["is_active"])
            });
        }

        return list;
    }
}
