import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar';
import { EmployeeList } from '../admin/employees/employee-list/employee-list';
import { ProfileEntry } from '../admin/profile-entry/profile-entry';
import { aEmployeeDetails, DashboardStatsResponse } from '../../core/services/adminService/aEmployee.service';
import { EmployeeApiService, EmployeeDashboardStatsApiData } from '../../core/services/employee-api.service';
import { ContractApiService } from '../../core/services/contract-api.service';
import { LeaveService } from '../../core/services/leaveService/leave.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ProfilePage } from '../employee/my-profile/profile-page/profile-page';
import { ContractPageComponent } from '../employee/my-contract/contract-page/contract-page';
import { AccountSettingsComponent } from '../admin/account-settings/account-settings';
import { OfficeManagementComponent } from '../admin/offices/office-management';
import { ApplyLeaveComponent } from '../employee/leave/apply-leave/apply-leave';
import { PendingLeavesComponent } from '../admin/leave/pending-leaves/pending-leaves';
import { DocumentVerificationComponent } from '../admin/document-verification/document-verification';
import { ContractEntryComponent } from '../admin/contract-entry/contract-entry';
import { AttendanceComponent } from '../admin/attendance/attendance';

export interface QuickActionItem {
  id: string;
  title: string;
  icon: string;
  colorClass: string;
  route?: string | null;
  actionType?: string;
}

export interface DashboardNotification {
  id: number;
  title: string;
  date: string;
  dotColor: string;
  route?: string | null;
}

export interface ContractTimelinePeriod {
  periodDate: string;
  title: string;
  status: 'Completed' | 'Current' | 'Under Review';
  badgeClass: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    SidebarComponent,
    EmployeeList,
    ProfileEntry,
    ProfilePage,
    ContractPageComponent,
    AccountSettingsComponent,
    OfficeManagementComponent,
    ApplyLeaveComponent,
    PendingLeavesComponent,
    DocumentVerificationComponent,
    ContractEntryComponent,
    AttendanceComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authSession = inject(AuthSessionService);
  private employeeService = inject(aEmployeeDetails);
  private employeeApiService = inject(EmployeeApiService);
  private contractApiService = inject(ContractApiService);
  private leaveService = inject(LeaveService);
  public readonly language = inject(LanguageService);

  role: 'admin' | 'employee' = this.authSession.user?.userRole === 'Official' ? 'admin' : 'employee';
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  profileMenuOpen = false;
  searchQuery = '';
  currentSection: string | null = null;
  currentAction: string | null = null;
  currentDateTime = '';

  // Interactive Modals State
  showPayslipModal = false;
  showNotificationsModal = false;
  actionModalData: { title: string; message: string; icon: string; actionId: string } | null = null;
  actionSubmitted = false;

  // Admin stats
  dashboardStats = signal<DashboardStatsResponse>({
    totalActiveStaff: 1024,
    presentToday: 982,
    pendingLeaveRequests: 14,
    contractsForRenewal: 8
  });

  // Employee Profile & Metric Signals - Defaults exactly match standard portal requirements
  employeeProfile = signal({
    employeeCode: 'BRDS-EMP-0001',
    employeeName: 'Sudha Kumari',
    department: 'IT Department',
    designation: 'System Analyst',
    employeeType: 'Contractual',
    reportingOfficer: 'Amit Kumar',
    contractValidTill: '31 Mar 2027',
    remainingDays: 187,
    leaveBalance: 12,
    leaveType: 'CL',
    presentDaysCount: 18,
    totalWorkingDays: 22,
    salaryStatus: 'Processed',
    pendingRequests: 2,
    absentDaysCount: 2,
    leaveDaysCount: 1,
    weeklyOffCount: 1,
    lateEarlyCount: 0,
    attendanceRate: 82
  });

  // Quick Action Buttons
  quickActions: QuickActionItem[] = [
    { id: 'leave', title: 'Apply Leave', icon: 'bi-umbrella', colorClass: 'qa-blue', route: '/dashboard/leave/apply' },
    { id: 'tour', title: 'Request Tour', icon: 'bi-airplane', colorClass: 'qa-green', actionType: 'tour' },
    { id: 'profile', title: 'View Profile', icon: 'bi-person', colorClass: 'qa-purple', route: '/dashboard/my-profile/personal-information' },
    { id: 'upload', title: 'Upload Document', icon: 'bi-file-earmark-arrow-up', colorClass: 'qa-yellow', route: '/dashboard/my-profile/documents' },
    { id: 'grievance', title: 'Raise Grievance', icon: 'bi-megaphone', colorClass: 'qa-red', actionType: 'grievance' },
    { id: 'certificate', title: 'Request Certificate', icon: 'bi-award', colorClass: 'qa-mint', actionType: 'certificate' },
    { id: 'payslip', title: 'View Payslip', icon: 'bi-currency-rupee', colorClass: 'qa-cyan', actionType: 'payslip' },
    { id: 'requests', title: 'My Requests', icon: 'bi-list-task', colorClass: 'qa-lavender', route: '/dashboard/leave/leave-history' }
  ];

  // Recent Notifications
  notifications: DashboardNotification[] = [
    { id: 1, title: 'Your payslip for September 2026 is available.', date: '24 Sep 2026', dotColor: '#3b82f6', route: '/dashboard/payroll/current-salary' },
    { id: 2, title: 'Contract renewal reminder (valid till 31 Mar 2027)', date: '18 Sep 2026', dotColor: '#ef4444', route: '/dashboard/my-contract/current-contract' },
    { id: 3, title: 'Leave application (No. LVE-2026-00123) approved.', date: '16 Sep 2026', dotColor: '#10b981', route: '/dashboard/leave/leave-history' },
    { id: 4, title: 'Attendance correction request is under review.', date: '14 Sep 2026', dotColor: '#f59e0b', route: '/dashboard/leave/leave-history' },
    { id: 5, title: 'Department circular: Office timings updated.', date: '12 Sep 2026', dotColor: '#64748b' }
  ];

  // Contract Timeline Periods
  contractTimeline: ContractTimelinePeriod[] = [
    {
      periodDate: '01 Apr 2024 - 31 Mar 2025',
      title: 'Contract Period 1',
      status: 'Completed',
      badgeClass: 'badge-completed',
      isCurrent: false
    },
    {
      periodDate: '01 Apr 2025 - 31 Mar 2026',
      title: 'Contract Period 2',
      status: 'Completed',
      badgeClass: 'badge-completed',
      isCurrent: false
    },
    {
      periodDate: '01 Apr 2026 - 31 Mar 2027',
      title: 'Contract Period 3',
      status: 'Current',
      badgeClass: 'badge-current',
      isCurrent: true
    }
  ];

  ngOnInit(): void {
    const user = this.authSession.user;
    if (user) {
      this.employeeProfile.update(prev => ({
        ...prev,
        employeeName: user.userName || prev.employeeName,
        employeeCode: user.userId || prev.employeeCode,
        reportingOfficer: user.reportingOfficialName || prev.reportingOfficer,
        designation: user.userRole === 'Official' ? (user.roleCode === 'DADM' ? 'Office Admin (DADM)' : 'Official Admin') : prev.designation,
        department: user.userRole === 'Official' ? 'District Administration' : prev.department
      }));
    }

    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        this.role = params['role'] === 'admin' ? 'admin' : 'employee';
      } else {
        const sessionRole = this.authSession.user?.userRole;
        this.role = sessionRole === 'Official' ? 'admin' : 'employee';
      }
      this.refreshCurrentDashboard();
    });

    this.route.paramMap.subscribe(params => {
      this.currentSection = params.get('section');
      this.currentAction = params.get('action');
    });

    this.updateDateTime();
    this.refreshCurrentDashboard();
  }

  private refreshCurrentDashboard(): void {
    if (this.role === 'admin' && this.authSession.token) {
      this.loadDashboardStats();
    } else {
      this.loadEmployeeDashboardStats();
    }
  }

  loadDashboardStats(): void {
    this.employeeService.getDashboardStats().subscribe({
      next: res => {
        if (res && res.data) {
          this.dashboardStats.set(res.data);
        }
      },
      error: () => {}
    });
  }

  loadEmployeeDashboardStats(): void {
    const user = this.authSession.user;
    const empId = user?.employeeId || 1;

    // Seed defaults from user session if present
    if (user) {
      this.employeeProfile.update(prev => ({
        ...prev,
        employeeName: user.userName || prev.employeeName,
        employeeCode: user.userId || prev.employeeCode,
        reportingOfficer: user.reportingOfficialName || prev.reportingOfficer
      }));
    }

    // Call standard dashboard employee-stats endpoint
    this.employeeApiService.getEmployeeDashboardStats().subscribe({
      next: res => {
        if (res && res.data) {
          const d = res.data;
          this.employeeProfile.update(prev => ({
            ...prev,
            leavesAvailable: d.leavesAvailable ?? prev.leaveBalance,
            leaveBalance: d.leavesAvailable ? Number(d.leavesAvailable) : prev.leaveBalance,
            pendingRequests: d.pendingLeaveRequests ?? prev.pendingRequests,
            contractValidTill: d.contractValidTill || prev.contractValidTill,
            remainingDays: d.remainingDays ?? this.calculateRemainingDays(d.contractValidTill || prev.contractValidTill),
            employeeCode: d.employeeCode || prev.employeeCode,
            employeeName: d.employeeName || prev.employeeName,
            department: d.department || prev.department,
            designation: d.designation || prev.designation,
            employeeType: d.employeeType || prev.employeeType,
            reportingOfficer: d.reportingOfficer || prev.reportingOfficer,
            leaveType: d.leaveType || prev.leaveType,
            presentDaysCount: d.presentDaysCount ?? prev.presentDaysCount,
            totalWorkingDays: d.totalWorkingDays ?? prev.totalWorkingDays,
            salaryStatus: d.salaryStatus || prev.salaryStatus,
            absentDaysCount: d.absentDaysCount ?? prev.absentDaysCount,
            leaveDaysCount: d.leaveDaysCount ?? prev.leaveDaysCount,
            weeklyOffCount: d.weeklyOffCount ?? prev.weeklyOffCount,
            lateEarlyCount: d.lateEarlyCount ?? prev.lateEarlyCount,
            attendanceRate: d.attendanceRate ?? prev.attendanceRate
          }));
        }
      },
      error: () => {}
    });

    // Also fetch contract details for complete real-time contract metadata
    if (this.authSession.token) {
      this.contractApiService.getContractDetails(empId).subscribe({
        next: contractRes => {
          if (contractRes && contractRes.data) {
            const c = contractRes.data;
            this.employeeProfile.update(prev => ({
              ...prev,
              employeeCode: c.employeeCode || prev.employeeCode,
              employeeName: c.employeeName || prev.employeeName,
              department: c.department || prev.department,
              designation: c.designation || prev.designation,
              employeeType: c.contractType || prev.employeeType,
              reportingOfficer: c.reportingOfficer || prev.reportingOfficer,
              contractValidTill: c.endDate ? this.formatDate(c.endDate) : prev.contractValidTill,
              remainingDays: c.remainingDays ?? this.calculateRemainingDays(c.endDate)
            }));
          }
        },
        error: () => {}
      });

      // Fetch renewal history to dynamically populate Contract Timeline
      this.contractApiService.getRenewalHistory(empId).subscribe({
        next: renewalRes => {
          if (renewalRes && renewalRes.data && renewalRes.data.length > 0) {
            const list = renewalRes.data;
            const mapped: ContractTimelinePeriod[] = list.map((item, index) => {
              const startFormatted = this.formatDate(item.startDate);
              const endFormatted = this.formatDate(item.endDate);
              const isCurrent = item.status === 'Active' || index === list.length - 1;
              return {
                periodDate: `${startFormatted} - ${endFormatted}`,
                title: item.renewalPhase || `Contract Period ${index + 1}`,
                status: isCurrent ? 'Current' : 'Completed',
                badgeClass: isCurrent ? 'badge-current' : 'badge-completed',
                isCurrent
              };
            });
            if (mapped.length > 0) {
              this.contractTimeline = mapped;
            }
          }
        },
        error: () => {}
      });

      // Fetch leave balances for CL balance
      this.leaveService.getLeaveBalances(empId).subscribe({
        next: (leaveRes: any) => {
          if (leaveRes && leaveRes.data && Array.isArray(leaveRes.data)) {
            const cl = leaveRes.data.find((l: any) => l.leaveTypeCode?.toUpperCase() === 'CL');
            if (cl) {
              this.employeeProfile.update(prev => ({
                ...prev,
                leaveBalance: cl.balance,
                leaveType: 'CL'
              }));
            }
          }
        },
        error: () => {}
      });
    }
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  get displayName(): string {
    const user = this.authSession.user;
    if (user?.userName) return user.userName;
    return this.employeeProfile().employeeName || (this.role === 'admin' ? (user?.userId || 'Admin Officer') : 'Sudha Kumari');
  }

  get displayDesignation(): string {
    const user = this.authSession.user;
    if (this.role === 'admin') {
      return user?.roleCode === 'DADM' ? 'Office Admin (DADM)' : (user?.roleCode || 'Department Admin');
    }
    return this.employeeProfile().designation || 'Contractual Staff';
  }

  get employeeCode(): string {
    const user = this.authSession.user;
    if (user?.userId) return user.userId;
    return this.employeeProfile().employeeCode || (this.role === 'admin' ? 'DADM' : 'BRDS-EMP-0001');
  }

  get donutSegments() {
    const C = 314.159; // 2 * PI * 50
    const p = this.employeeProfile();
    const total = (p.presentDaysCount + p.absentDaysCount + p.leaveDaysCount + p.weeklyOffCount + p.lateEarlyCount) || 22;

    const presentLen = Math.max(0, (p.presentDaysCount / total) * C);
    const absentLen = Math.max(0, (p.absentDaysCount / total) * C);
    const leaveLen = Math.max(0, (p.leaveDaysCount / total) * C);
    const weeklyOffLen = Math.max(0, (p.weeklyOffCount / total) * C);
    const lateEarlyLen = Math.max(0, (p.lateEarlyCount / total) * C);

    let offset = 0;
    const segs = [
      { name: 'Present', color: '#10b981', dashArray: `${presentLen.toFixed(1)} ${(C - presentLen).toFixed(1)}`, dashOffset: -offset }
    ];
    offset += presentLen;

    segs.push({ name: 'Absent', color: '#3b82f6', dashArray: `${absentLen.toFixed(1)} ${(C - absentLen).toFixed(1)}`, dashOffset: -offset });
    offset += absentLen;

    segs.push({ name: 'Leave', color: '#f59e0b', dashArray: `${leaveLen.toFixed(1)} ${(C - leaveLen).toFixed(1)}`, dashOffset: -offset });
    offset += leaveLen;

    segs.push({ name: 'Weekly Off', color: '#94a3b8', dashArray: `${weeklyOffLen.toFixed(1)} ${(C - weeklyOffLen).toFixed(1)}`, dashOffset: -offset });
    offset += weeklyOffLen;

    if (lateEarlyLen > 0) {
      segs.push({ name: 'Late/Early Departure', color: '#ef4444', dashArray: `${lateEarlyLen.toFixed(1)} ${(C - lateEarlyLen).toFixed(1)}`, dashOffset: -offset });
    }

    return segs;
  }

  calculateRemainingDays(dateStr: string): number {
    if (!dateStr) return 187;
    const end = new Date(dateStr);
    if (isNaN(end.getTime())) return 187;
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  formatDate(dateInput: string | Date): string {
    if (!dateInput) return '31 Mar 2027';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  handleQuickAction(action: QuickActionItem): void {
    if (action.route) {
      this.router.navigateByUrl(action.route);
      return;
    }
    if (action.actionType === 'payslip') {
      this.showPayslipModal = true;
      return;
    }
    if (action.id === 'tour') {
      this.openActionModal('tour', 'Official Tour Request', 'Submit request for official field travel, advance allowance, and route authorization.');
    } else if (action.id === 'grievance') {
      this.openActionModal('grievance', 'Raise Employee Grievance', 'Submit an official grievance to the HR grievance redressal committee.');
    } else if (action.id === 'certificate') {
      this.openActionModal('certificate', 'Request Service Certificate', 'Apply for Experience Certificate, Salary Certificate, or NOC from administration.');
    }
  }

  handleNotificationClick(notif: DashboardNotification): void {
    if (notif.route) {
      this.router.navigateByUrl(notif.route);
    } else {
      this.openActionModal('notif', 'Circular Notice', notif.title);
    }
  }

  openPayslipModal(event?: Event): void {
    if (event) event.stopPropagation();
    this.showPayslipModal = true;
  }

  closePayslipModal(): void {
    this.showPayslipModal = false;
  }

  openNotificationsModal(): void {
    this.showNotificationsModal = true;
  }

  closeNotificationsModal(): void {
    this.showNotificationsModal = false;
  }

  openActionModal(actionId: string, title: string, message: string): void {
    const iconMap: Record<string, string> = {
      tour: 'bi-airplane',
      grievance: 'bi-megaphone',
      certificate: 'bi-award',
      notif: 'bi-bell'
    };
    this.actionModalData = {
      actionId,
      title,
      message,
      icon: iconMap[actionId] || 'bi-info-circle'
    };
    this.actionSubmitted = false;
  }

  closeActionModal(): void {
    this.actionModalData = null;
    this.actionSubmitted = false;
  }

  submitActionRequest(): void {
    this.actionSubmitted = true;
    setTimeout(() => {
      this.closeActionModal();
    }, 1800);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onLogout(): void {
    this.authSession.clear();
    this.router.navigate(['/login'], { queryParams: { role: this.role } });
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  @HostListener('document:click')
  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  private updateDateTime(): void {
    const now = new Date();
    this.currentDateTime = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}
