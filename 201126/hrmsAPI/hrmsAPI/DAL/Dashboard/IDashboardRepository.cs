using HRMSAPI.MODEL.Dashboard;

namespace HRMSAPI.DAL.Dashboard;

public interface IDashboardRepository
{
    Task<DashboardStatsResponse> GetDadmStatsAsync(long officeId, long? officialId, CancellationToken cancellationToken);
    Task<EmployeeDashboardStatsResponse> GetEmployeeStatsAsync(long employeeId, CancellationToken cancellationToken);
}
