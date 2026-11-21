using HRMSAPI.DAL.Dashboard;
using HRMSAPI.MODEL.Dashboard;

namespace HRMSAPI.BAL.Dashboard;

public sealed class DashboardService(IDashboardRepository repository) : IDashboardService
{
    public Task<DashboardStatsResponse> GetDadmStatsAsync(long officeId, long? officialId, CancellationToken cancellationToken) =>
        repository.GetDadmStatsAsync(officeId, officialId, cancellationToken);

    public Task<EmployeeDashboardStatsResponse> GetEmployeeStatsAsync(long employeeId, CancellationToken cancellationToken) =>
        repository.GetEmployeeStatsAsync(employeeId, cancellationToken);
}
