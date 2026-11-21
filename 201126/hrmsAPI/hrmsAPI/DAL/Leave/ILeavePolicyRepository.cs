using HRMSAPI.MODEL.Leave;

namespace HRMSAPI.DAL.Leave;

public interface ILeavePolicyRepository
{
    Task<IReadOnlyList<LeavePolicyDto>> GetAllPoliciesAsync(long? departmentId, long? leaveTypeId, bool? isActive, CancellationToken cancellationToken);
    
    Task<LeavePolicyDto?> GetPolicyByIdAsync(long policyId, CancellationToken cancellationToken);
    
    Task<LeavePolicyDto?> ResolveApplicablePolicyAsync(
        long leaveTypeId,
        long? departmentId,
        DateTime effectiveDate,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<EmployeeLeaveEntitlementDto>> GetEmployeeEntitlementsAsync(
        long employeeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<EmployeeLeaveEntitlementDto?> GetEmployeeEntitlementByLeaveTypeAsync(
        long employeeId,
        long leaveTypeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken);

    Task<long> SavePolicyAsync(SaveLeavePolicyRequest request, long actionByOfficialId, CancellationToken cancellationToken);
}
