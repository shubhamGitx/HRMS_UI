namespace HRMSAPI.MODEL.Dashboard;

public sealed record DashboardStatsResponse(
    long TotalActiveStaff,
    long PresentToday,
    long PendingLeaveRequests,
    long ContractsForRenewal);

public sealed record EmployeeDashboardStatsResponse(
    decimal LeavesAvailable,
    int PendingLeaveRequests,
    string ContractStatus,
    string ContractValidTill,
    string ContractNumber,
    string PresentDays,
    string AttendancePercentage,
    string EmployeeCode = "BRDS-EMP-0001",
    string EmployeeName = "Sudha Kumari",
    string Department = "IT Department",
    string Designation = "System Analyst",
    string EmployeeType = "Contractual",
    string ReportingOfficer = "Ms. Priya Verma",
    int RemainingDays = 187,
    string LeaveType = "CL",
    int PresentDaysCount = 18,
    int TotalWorkingDays = 22,
    string SalaryStatus = "Processed",
    int AbsentDaysCount = 2,
    int LeaveDaysCount = 1,
    int WeeklyOffCount = 1,
    int LateEarlyCount = 0,
    int AttendanceRate = 82);

