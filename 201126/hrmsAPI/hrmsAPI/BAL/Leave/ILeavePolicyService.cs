using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Leave;

public interface ILeavePolicyService
{
    Task<ApiResponse<IReadOnlyList<LeavePolicyDto>>> GetAllPoliciesAsync(
        long? departmentId,
        long? leaveTypeId,
        bool? isActive,
        CancellationToken cancellationToken);

    Task<ApiResponse<LeavePolicyDto>> GetPolicyByIdAsync(
        long policyId,
        CancellationToken cancellationToken);

    Task<ApiResponse<LeavePolicyDto>> ResolveApplicablePolicyAsync(
        long leaveTypeId,
        long? departmentId,
        DateTime? effectiveDate,
        CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>> GetEmployeeEntitlementsAsync(
        long employeeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<ApiResponse<EmployeeLeaveEntitlementDto>> GetEmployeeEntitlementByLeaveTypeAsync(
        long employeeId,
        long leaveTypeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<ApiResponse<long>> SavePolicyAsync(
        SaveLeavePolicyRequest request,
        long actionByOfficialId,
        CancellationToken cancellationToken);
}
