using HRMSAPI.MODEL.Dashboard;

namespace HRMSAPI.BAL.Dashboard;

public interface IDashboardService
{
    Task<DashboardStatsResponse> GetDadmStatsAsync(long officeId, long? officialId, CancellationToken cancellationToken);
    Task<EmployeeDashboardStatsResponse> GetEmployeeStatsAsync(long employeeId, CancellationToken cancellationToken);
}
