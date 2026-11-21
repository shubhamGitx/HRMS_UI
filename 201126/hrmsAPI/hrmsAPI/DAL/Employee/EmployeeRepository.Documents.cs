using System.Data;
using HRMSAPI.AppCode;
using HRMSAPI.MODEL.Employee;

namespace HRMSAPI.DAL.Employee;

public sealed partial class EmployeeRepository
{
    public async Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(long employeeId, bool verifiedOnly, CancellationToken token)
    {
        var statusClause = verifiedOnly ? " AND verification_status = 'VERIFIED'" : "";
        var dt = await dataAccess.GetDataTableAsync($@"
            SELECT profile_document_id, employee_id, document_type_id, document_name, category, original_file_name, content_type,
                   file_size, verification_status, created_date, file_path, rejection_remarks, verified_by, verified_at, file_data
            FROM employee.employee_profile_document
            WHERE employee_id = @employee_id AND is_active = true{statusClause}
            ORDER BY profile_document_id ASC",
            new Dictionary<string, object?> { ["employee_id"] = employeeId }, token);

        var list = new List<EmployeeDocumentDto>(dt.Rows.Count);
        foreach (DataRow r in dt.Rows)
        {
            long size = Convert.ToInt64(r["file_size"]);
            string sizeStr = size >= 1048576 
                ? $"{(size / 1048576.0):0.1} MB" 
                : $"{(size / 1024.0):0.1} KB";

            DateTime dtVal = Convert.ToDateTime(r["created_date"]);
            list.Add(new EmployeeDocumentDto
            {
                DocumentId = Convert.ToInt64(r["profile_document_id"]),
                EmployeeId = Convert.ToInt64(r["employee_id"]),
                DocumentTypeId = r["document_type_id"] == DBNull.Value ? null : Convert.ToInt64(r["document_type_id"]),
                Name = Convert.ToString(r["document_name"]) ?? string.Empty,
                Category = Convert.ToString(r["category"]) ?? string.Empty,
                FileName = Convert.ToString(r["original_file_name"]) ?? string.Empty,
                ContentType = Convert.ToString(r["content_type"]) ?? "application/pdf",
                FileSize = size,
                SizeFormatted = sizeStr,
                Status = Convert.ToString(r["verification_status"]) switch
                {
                    "VERIFIED" => "Verified",
                    "REJECTED" => "Rejected",
                    _ => "Pending"
                },
                UploadedOn = dtVal.ToString("yyyy-MM-dd"),
                FilePath = r["file_path"] == DBNull.Value ? null : Convert.ToString(r["file_path"]),
                FileData = r["file_data"] == DBNull.Value ? null : (byte[])r["file_data"],
                RejectionRemarks = r["rejection_remarks"] == DBNull.Value ? null : Convert.ToString(r["rejection_remarks"]),
                VerifiedBy = r["verified_by"] == DBNull.Value ? null : Convert.ToInt64(r["verified_by"]),
                VerifiedAt = r["verified_at"] == DBNull.Value ? null : Convert.ToDateTime(r["verified_at"]).ToString("yyyy-MM-dd HH:mm")
            });
        }
        return list;
    }

    public async Task<EmployeeDocumentDto?> GetDocumentByIdAsync(long documentId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT profile_document_id, employee_id, document_type_id, document_name, category, original_file_name, content_type,
                   file_size, verification_status, created_date, file_path, rejection_remarks, verified_by, verified_at, file_data
            FROM employee.employee_profile_document
            WHERE profile_document_id = @id AND is_active = true",
            new Dictionary<string, object?> { ["id"] = documentId }, token);

        if (dt.Rows.Count == 0) return null;
        var r = dt.Rows[0];
        long size = Convert.ToInt64(r["file_size"]);
        return new EmployeeDocumentDto
        {
            DocumentId = Convert.ToInt64(r["profile_document_id"]),
            EmployeeId = Convert.ToInt64(r["employee_id"]),
            DocumentTypeId = r["document_type_id"] == DBNull.Value ? null : Convert.ToInt64(r["document_type_id"]),
            Name = Convert.ToString(r["document_name"]) ?? string.Empty,
            Category = Convert.ToString(r["category"]) ?? string.Empty,
            FileName = Convert.ToString(r["original_file_name"]) ?? string.Empty,
            ContentType = Convert.ToString(r["content_type"]) ?? "application/pdf",
            FileSize = size,
            SizeFormatted = size >= 1048576 ? $"{(size / 1048576.0):0.1} MB" : $"{(size / 1024.0):0.1} KB",
            Status = Convert.ToString(r["verification_status"]) switch
            {
                "VERIFIED" => "Verified",
                "REJECTED" => "Rejected",
                _ => "Pending"
            },
            UploadedOn = Convert.ToDateTime(r["created_date"]).ToString("yyyy-MM-dd"),
            FilePath = r["file_path"] == DBNull.Value ? null : Convert.ToString(r["file_path"]),
            FileData = r["file_data"] == DBNull.Value ? null : (byte[])r["file_data"],
            RejectionRemarks = r["rejection_remarks"] == DBNull.Value ? null : Convert.ToString(r["rejection_remarks"]),
            VerifiedBy = r["verified_by"] == DBNull.Value ? null : Convert.ToInt64(r["verified_by"]),
            VerifiedAt = r["verified_at"] == DBNull.Value ? null : Convert.ToDateTime(r["verified_at"]).ToString("yyyy-MM-dd HH:mm")
        };
    }

    public async Task<long> AddDocumentAsync(long employeeId, long? documentTypeId, string documentName, string category, string originalFileName, string contentType, long fileSize, string filePath, long? uploadedBy, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            INSERT INTO employee.employee_profile_document (
                employee_id, document_type_id, document_name, category, original_file_name, content_type, file_size, verification_status, is_active, created_by, created_date, file_path
            ) VALUES (
                @employee_id, @document_type_id, @document_name, @category, @original_file_name, @content_type, @file_size, 'PENDING', true, @uploaded_by, CURRENT_TIMESTAMP, @file_path
            ) RETURNING profile_document_id",
            new Dictionary<string, object?>
            {
                ["employee_id"] = employeeId,
                ["document_type_id"] = documentTypeId.HasValue ? documentTypeId.Value : DBNull.Value,
                ["document_name"] = documentName,
                ["category"] = category,
                ["original_file_name"] = originalFileName,
                ["content_type"] = contentType,
                ["file_size"] = fileSize,
                ["uploaded_by"] = uploadedBy.HasValue ? uploadedBy.Value : DBNull.Value,
                ["file_path"] = filePath
            }, token);

        long docId = dt.Rows.Count > 0 ? Convert.ToInt64(dt.Rows[0][0]) : 0;
        if (docId > 0)
        {
            await dataAccess.ExecuteNonQueryAsync(@"
                INSERT INTO employee.document_verification_history (
                    document_id, previous_status, new_status, action_by, action_by_name, action_remarks, action_date, action_type
                ) VALUES (
                    @document_id, 'NONE', 'PENDING', @action_by, 'Employee Upload', 'Document submitted for verification', CURRENT_TIMESTAMP, 'UPLOAD'
                )",
                new Dictionary<string, object?>
                {
                    ["document_id"] = docId,
                    ["action_by"] = uploadedBy.HasValue ? uploadedBy.Value : DBNull.Value
                }, token);
        }
        return docId;
    }

    public async Task<bool> DeleteDocumentAsync(long employeeId, long documentId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT profile_document_id, verification_status, file_path
            FROM employee.employee_profile_document
            WHERE profile_document_id = @doc_id AND employee_id = @emp_id AND is_active = true",
            new Dictionary<string, object?> { ["doc_id"] = documentId, ["emp_id"] = employeeId }, token);

        if (dt.Rows.Count == 0) return false;
        var status = Convert.ToString(dt.Rows[0]["verification_status"]);
        if (status == "VERIFIED")
        {
            throw new InvalidOperationException("Verified documents cannot be deleted without administrative approval.");
        }

        await dataAccess.ExecuteNonQueryAsync(@"
            UPDATE employee.employee_profile_document
            SET is_active = false, updated_date = CURRENT_TIMESTAMP
            WHERE profile_document_id = @doc_id AND employee_id = @emp_id",
            new Dictionary<string, object?> { ["doc_id"] = documentId, ["emp_id"] = employeeId }, token);

        await dataAccess.ExecuteNonQueryAsync(@"
            INSERT INTO employee.document_verification_history (
                document_id, previous_status, new_status, action_by, action_by_name, action_remarks, action_date, action_type
            ) VALUES (
                @doc_id, @prev_status, 'DELETED', @action_by, 'Employee', 'Document deleted by employee', CURRENT_TIMESTAMP, 'DELETE'
            )",
            new Dictionary<string, object?>
            {
                ["doc_id"] = documentId,
                ["prev_status"] = status,
                ["action_by"] = employeeId
            }, token);

        return true;
    }

    public async Task<IReadOnlyList<DocumentTypeDto>> GetDocumentTypesAsync(short langCode, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT document_id, document_name
            FROM master.document_master
            WHERE lang_code = @lang_code
            ORDER BY document_id ASC",
            new Dictionary<string, object?> { ["lang_code"] = langCode }, token);

        var list = new List<DocumentTypeDto>(dt.Rows.Count);
        foreach (DataRow r in dt.Rows)
        {
            list.Add(new DocumentTypeDto
            {
                Id = Convert.ToInt64(r["document_id"]),
                Name = Convert.ToString(r["document_name"]) ?? string.Empty
            });
        }
        return list;
    }

    public async Task<IReadOnlyList<AdminDocumentListItemDto>> GetDocumentsForVerificationAsync(string? status, long? employeeId, long? departmentId, string? search, CancellationToken token)
    {
        var query = @"
            SELECT d.profile_document_id, d.employee_id, COALESCE(e.emp_code, e.contract_no, 'EMP001') AS employee_code, e.emp_name, COALESCE(dep.department_name, 'IT Department') AS department_name,
                   d.document_type_id, d.document_name, d.category, d.original_file_name, d.content_type, d.file_size,
                   d.verification_status, d.created_date, d.file_path, d.rejection_remarks, d.verified_by, d.verified_at
            FROM employee.employee_profile_document d
            JOIN employee.employee_master e ON e.employee_id = d.employee_id
            LEFT JOIN master.department_master dep ON dep.department_id = e.department_id AND dep.lang_code = 1
            WHERE d.is_active = true";

        var parameters = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var upperStatus = status.ToUpperInvariant();
            query += " AND d.verification_status = @status";
            parameters["status"] = upperStatus;
        }

        if (employeeId.HasValue && employeeId.Value > 0)
        {
            query += " AND d.employee_id = @emp_id";
            parameters["emp_id"] = employeeId.Value;
        }

        if (departmentId.HasValue && departmentId.Value > 0)
        {
            query += " AND e.department_id = @dept_id";
            parameters["dept_id"] = departmentId.Value;
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query += " AND (e.emp_name ILIKE @search OR COALESCE(e.emp_code, e.contract_no, '') ILIKE @search OR d.document_name ILIKE @search)";
            parameters["search"] = $"%{search.Trim()}%";
        }

        query += " ORDER BY d.created_date DESC, d.profile_document_id DESC";

        var dt = await dataAccess.GetDataTableAsync(query, parameters, token);
        var list = new List<AdminDocumentListItemDto>(dt.Rows.Count);
        foreach (DataRow r in dt.Rows)
        {
            long size = Convert.ToInt64(r["file_size"]);
            string sizeStr = size >= 1048576 ? $"{(size / 1048576.0):0.1} MB" : $"{(size / 1024.0):0.1} KB";
            DateTime dtVal = Convert.ToDateTime(r["created_date"]);

            list.Add(new AdminDocumentListItemDto
            {
                DocumentId = Convert.ToInt64(r["profile_document_id"]),
                EmployeeId = Convert.ToInt64(r["employee_id"]),
                EmployeeCode = Convert.ToString(r["employee_code"]) ?? string.Empty,
                EmployeeName = Convert.ToString(r["emp_name"]) ?? string.Empty,
                DepartmentName = Convert.ToString(r["department_name"]) ?? string.Empty,
                DocumentTypeId = r["document_type_id"] == DBNull.Value ? null : Convert.ToInt64(r["document_type_id"]),
                DocumentName = Convert.ToString(r["document_name"]) ?? string.Empty,
                Category = Convert.ToString(r["category"]) ?? string.Empty,
                FileName = Convert.ToString(r["original_file_name"]) ?? string.Empty,
                ContentType = Convert.ToString(r["content_type"]) ?? "application/pdf",
                FileSize = size,
                SizeFormatted = sizeStr,
                Status = Convert.ToString(r["verification_status"]) switch
                {
                    "VERIFIED" => "Verified",
                    "REJECTED" => "Rejected",
                    _ => "Pending"
                },
                UploadedOn = dtVal.ToString("yyyy-MM-dd"),
                FilePath = r["file_path"] == DBNull.Value ? null : Convert.ToString(r["file_path"]),
                FileData = r["file_data"] == DBNull.Value ? null : (byte[])r["file_data"],
                RejectionRemarks = r["rejection_remarks"] == DBNull.Value ? null : Convert.ToString(r["rejection_remarks"]),
                VerifiedBy = r["verified_by"] == DBNull.Value ? null : Convert.ToInt64(r["verified_by"]),
                VerifiedAt = r["verified_at"] == DBNull.Value ? null : Convert.ToDateTime(r["verified_at"]).ToString("yyyy-MM-dd HH:mm")
            });
        }
        return list;
    }

    public async Task<bool> VerifyDocumentAsync(long documentId, long verifiedBy, string? remarks, CancellationToken token)
    {
        var existing = await GetDocumentByIdAsync(documentId, token);
        if (existing is null) return false;

        var prevStatus = existing.Status.ToUpperInvariant();
        var rows = await dataAccess.ExecuteNonQueryAsync(@"
            UPDATE employee.employee_profile_document
            SET verification_status = 'VERIFIED',
                verified_by = @verified_by,
                verified_at = CURRENT_TIMESTAMP,
                rejection_remarks = NULL,
                updated_date = CURRENT_TIMESTAMP
            WHERE profile_document_id = @id AND is_active = true",
            new Dictionary<string, object?>
            {
                ["id"] = documentId,
                ["verified_by"] = verifiedBy
            }, token);

        if (rows > 0)
        {
            var officialName = await GetOfficialNameAsync(verifiedBy, token);
            await dataAccess.ExecuteNonQueryAsync(@"
                INSERT INTO employee.document_verification_history (
                    document_id, previous_status, new_status, action_by, action_by_name, action_remarks, action_date, action_type
                ) VALUES (
                    @document_id, @previous_status, 'VERIFIED', @action_by, @action_by_name, @remarks, CURRENT_TIMESTAMP, 'VERIFY'
                )",
                new Dictionary<string, object?>
                {
                    ["document_id"] = documentId,
                    ["previous_status"] = prevStatus,
                    ["action_by"] = verifiedBy,
                    ["action_by_name"] = officialName,
                    ["remarks"] = remarks ?? "Document verified and approved"
                }, token);
            return true;
        }
        return false;
    }

    public async Task<bool> RejectDocumentAsync(long documentId, long rejectedBy, string remarks, CancellationToken token)
    {
        var existing = await GetDocumentByIdAsync(documentId, token);
        if (existing is null) return false;

        var prevStatus = existing.Status.ToUpperInvariant();
        var rows = await dataAccess.ExecuteNonQueryAsync(@"
            UPDATE employee.employee_profile_document
            SET verification_status = 'REJECTED',
                verified_by = @rejected_by,
                verified_at = CURRENT_TIMESTAMP,
                rejection_remarks = @remarks,
                updated_date = CURRENT_TIMESTAMP
            WHERE profile_document_id = @id AND is_active = true",
            new Dictionary<string, object?>
            {
                ["id"] = documentId,
                ["rejected_by"] = rejectedBy,
                ["remarks"] = remarks
            }, token);

        if (rows > 0)
        {
            var officialName = await GetOfficialNameAsync(rejectedBy, token);
            await dataAccess.ExecuteNonQueryAsync(@"
                INSERT INTO employee.document_verification_history (
                    document_id, previous_status, new_status, action_by, action_by_name, action_remarks, action_date, action_type
                ) VALUES (
                    @document_id, @previous_status, 'REJECTED', @action_by, @action_by_name, @remarks, CURRENT_TIMESTAMP, 'REJECT'
                )",
                new Dictionary<string, object?>
                {
                    ["document_id"] = documentId,
                    ["previous_status"] = prevStatus,
                    ["action_by"] = rejectedBy,
                    ["action_by_name"] = officialName,
                    ["remarks"] = remarks
                }, token);
            return true;
        }
        return false;
    }

    public async Task<IReadOnlyList<DocumentVerificationHistoryDto>> GetDocumentVerificationHistoryAsync(long documentId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT history_id, document_id, previous_status, new_status, action_by, action_by_name, action_remarks, action_date, action_type
            FROM employee.document_verification_history
            WHERE document_id = @id
            ORDER BY history_id DESC",
            new Dictionary<string, object?> { ["id"] = documentId }, token);

        var list = new List<DocumentVerificationHistoryDto>(dt.Rows.Count);
        foreach (DataRow r in dt.Rows)
        {
            list.Add(new DocumentVerificationHistoryDto
            {
                HistoryId = Convert.ToInt64(r["history_id"]),
                DocumentId = Convert.ToInt64(r["document_id"]),
                PreviousStatus = Convert.ToString(r["previous_status"]) ?? string.Empty,
                NewStatus = Convert.ToString(r["new_status"]) ?? string.Empty,
                ActionBy = r["action_by"] == DBNull.Value ? null : Convert.ToInt64(r["action_by"]),
                ActionByName = Convert.ToString(r["action_by_name"]) ?? string.Empty,
                ActionRemarks = r["action_remarks"] == DBNull.Value ? null : Convert.ToString(r["action_remarks"]),
                ActionDate = Convert.ToDateTime(r["action_date"]).ToString("yyyy-MM-dd HH:mm:ss"),
                ActionType = Convert.ToString(r["action_type"]) ?? string.Empty
            });
        }
        return list;
    }

    public async Task<EmployeeDocumentSummaryDto> GetEmployeeDocumentSummaryAsync(long employeeId, CancellationToken token)
    {
        var dt = await dataAccess.GetDataTableAsync(@"
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE verification_status = 'PENDING') AS pending,
                COUNT(*) FILTER (WHERE verification_status = 'VERIFIED') AS verified,
                COUNT(*) FILTER (WHERE verification_status = 'REJECTED') AS rejected
            FROM employee.employee_profile_document
            WHERE employee_id = @employee_id AND is_active = true",
            new Dictionary<string, object?> { ["employee_id"] = employeeId }, token);

        if (dt.Rows.Count == 0) return new EmployeeDocumentSummaryDto();
        var r = dt.Rows[0];
        return new EmployeeDocumentSummaryDto
        {
            TotalDocuments = Convert.ToInt32(r["total"]),
            PendingCount = Convert.ToInt32(r["pending"]),
            VerifiedCount = Convert.ToInt32(r["verified"]),
            RejectedCount = Convert.ToInt32(r["rejected"])
        };
    }

    private async Task<string> GetOfficialNameAsync(long officialId, CancellationToken token)
    {
        try
        {
            var dt = await dataAccess.GetDataTableAsync(@"
                SELECT official_name FROM official.official_master WHERE official_id = @id",
                new Dictionary<string, object?> { ["id"] = officialId }, token);
            if (dt.Rows.Count > 0 && dt.Rows[0]["official_name"] != DBNull.Value)
            {
                return Convert.ToString(dt.Rows[0]["official_name"])!;
            }
        }
        catch {}
        return "Official / Admin";
    }
}
