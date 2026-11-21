using HRMSAPI.DAL.Leave;
using HRMSAPI.MODEL.Leave;
using HRMSAPI.MODEL.Login;

namespace HRMSAPI.BAL.Leave;

public sealed class LeavePolicyService(ILeavePolicyRepository policyRepository) : ILeavePolicyService
{
    public async Task<ApiResponse<IReadOnlyList<LeavePolicyDto>>> GetAllPoliciesAsync(
        long? departmentId,
        long? leaveTypeId,
        bool? isActive,
        CancellationToken cancellationToken)
    {
        var policies = await policyRepository.GetAllPoliciesAsync(departmentId, leaveTypeId, isActive, cancellationToken);
        return new ApiResponse<IReadOnlyList<LeavePolicyDto>>(true, "Leave policies retrieved successfully.", policies);
    }

    public async Task<ApiResponse<LeavePolicyDto>> GetPolicyByIdAsync(long policyId, CancellationToken cancellationToken)
    {
        if (policyId <= 0)
        {
            return new ApiResponse<LeavePolicyDto>(false, "Invalid policy ID.");
        }

        var policy = await policyRepository.GetPolicyByIdAsync(policyId, cancellationToken);
        if (policy is null)
        {
            return new ApiResponse<LeavePolicyDto>(false, "Leave policy not found.");
        }

        return new ApiResponse<LeavePolicyDto>(true, "Leave policy retrieved successfully.", policy);
    }

    public async Task<ApiResponse<LeavePolicyDto>> ResolveApplicablePolicyAsync(
        long leaveTypeId,
        long? departmentId,
        DateTime? effectiveDate,
        CancellationToken cancellationToken)
    {
        if (leaveTypeId <= 0)
        {
            return new ApiResponse<LeavePolicyDto>(false, "Invalid leave type ID.");
        }

        var targetDate = effectiveDate ?? DateTime.Today;

        try
        {
            var policy = await policyRepository.ResolveApplicablePolicyAsync(
                leaveTypeId, departmentId, targetDate, cancellationToken);

            if (policy is null)
            {
                return new ApiResponse<LeavePolicyDto>(
                    false,
                    $"No active leave policy found for Leave Type {leaveTypeId} valid as of {targetDate:dd-MMM-yyyy}.");
            }

            return new ApiResponse<LeavePolicyDto>(true, "Applicable leave policy resolved successfully.", policy);
        }
        catch (InvalidOperationException ex)
        {
            return new ApiResponse<LeavePolicyDto>(false, ex.Message);
        }
    }

    public async Task<ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>> GetEmployeeEntitlementsAsync(
        long employeeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        if (employeeId <= 0)
        {
            return new ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>(false, "Invalid employee ID.");
        }

        var entitlements = await policyRepository.GetEmployeeEntitlementsAsync(
            employeeId, asOfDate, financialYear, cancellationToken);

        return new ApiResponse<IReadOnlyList<EmployeeLeaveEntitlementDto>>(
            true, "Employee leave entitlements calculated successfully.", entitlements);
    }

    public async Task<ApiResponse<EmployeeLeaveEntitlementDto>> GetEmployeeEntitlementByLeaveTypeAsync(
        long employeeId,
        long leaveTypeId,
        DateTime? asOfDate,
        string? financialYear,
        CancellationToken cancellationToken)
    {
        if (employeeId <= 0)
        {
            return new ApiResponse<EmployeeLeaveEntitlementDto>(false, "Invalid employee ID.");
        }

        if (leaveTypeId <= 0)
        {
            return new ApiResponse<EmployeeLeaveEntitlementDto>(false, "Invalid leave type ID.");
        }

        var entitlement = await policyRepository.GetEmployeeEntitlementByLeaveTypeAsync(
            employeeId, leaveTypeId, asOfDate, financialYear, cancellationToken);

        if (entitlement is null)
        {
            return new ApiResponse<EmployeeLeaveEntitlementDto>(
                false, $"Leave entitlement not found for employee {employeeId} and leave type {leaveTypeId}.");
        }

        return new ApiResponse<EmployeeLeaveEntitlementDto>(
            true, "Employee leave entitlement retrieved successfully.", entitlement);
    }

    public async Task<ApiResponse<long>> SavePolicyAsync(
        SaveLeavePolicyRequest request,
        long actionByOfficialId,
        CancellationToken cancellationToken)
    {
        if (request.EffectiveTo.HasValue && request.EffectiveTo.Value.Date < request.EffectiveFrom.Date)
        {
            return new ApiResponse<long>(false, "Policy effective-to date cannot be earlier than effective-from date.");
        }

        if (request.AnnualEntitlement < 0)
        {
            return new ApiResponse<long>(false, "Annual entitlement cannot be negative.");
        }

        if (request.MaxConsecutiveDays <= 0)
        {
            return new ApiResponse<long>(false, "Max consecutive days must be at least 1 day.");
        }

        if (request.CarryForwardAllowed && request.MaxCarryForward < 0)
        {
            return new ApiResponse<long>(false, "Max carry forward cannot be negative.");
        }

        var policyId = await policyRepository.SavePolicyAsync(request, actionByOfficialId, cancellationToken);
        return new ApiResponse<long>(true, "Leave policy saved successfully.", policyId);
    }
}
