import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output, SimpleChanges, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DashboardMenuItem, NavigationConfigService } from '../../core/services/navigation-config.service';
import { LanguageService } from '../../core/i18n/language.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface StaticMenuItem {
  title: string;
  path: string;
  action?: string;
  icon?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit, OnChanges {
  private router = inject(Router);
  private navigationConfig = inject(NavigationConfigService);
  private authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  @Input() role: 'admin' | 'employee' = this.authSession.user?.userRole === 'Official' ? 'admin' : 'employee';
  @Input() collapsed = false;
  @HostBinding('class.collapsed') get isCollapsed() { return this.collapsed; }
  @Output() collapsedChange = new EventEmitter<boolean>();

  @Input() mobileOpen = false;
  @Output() mobileOpenChange = new EventEmitter<boolean>();

  @Output() logout = new EventEmitter<void>();

  // Dynamic menus loaded from backend database for Official/Admin
  dbMenuItems: DashboardMenuItem[] = [];
  expandedDbMenus = new Set<number>();

  // Accordion state for collapsible static menus - All closed by default
  expandedMenus: Record<string, boolean> = {
    myTeam: false,
    leave: false,
    attendance: false,
    tour: false,
    grievance: false,
    settings: false,
    myProfile: false,
    myContract: false,
    payroll: false,
    certificates: false,
    account: false
  };

  // Static Fallback Menus for Admin / Official
  readonly teamMenuAdmin: StaticMenuItem[] = [
    { title: 'Team Overview', path: '/dashboard' },
    { title: 'Profile Entry', path: '/dashboard/profile-entry' },
    { title: 'Employee List', path: '/dashboard/employees' },
    { title: 'Document Verification', path: '/dashboard/document-verification' },
    { title: 'Office Management', path: '/dashboard/offices' },
    { title: 'Reporting Structure', path: '/dashboard/reporting-structure' }
  ];

  readonly leaveMenuAdmin: StaticMenuItem[] = [
    { title: 'Pending Leave Applications', path: '/dashboard/leave/pending-applications' },
    { title: 'Leave History', path: '/dashboard/leave/leave-history-ro' },
    { title: 'Leave Reports', path: '/dashboard/leave/leave-reports' }
  ];

  readonly attendanceMenuAdmin: StaticMenuItem[] = [
    { title: 'Daily Attendance', path: '/dashboard/attendance/daily-attendance' },
    { title: 'Team Daily Attendance', path: '/dashboard/attendance/team-daily-attendance' },
    { title: 'Attendance Correction', path: '/dashboard/attendance/attendance-correction' },
    { title: 'Attendance Reports', path: '/dashboard/attendance/attendance-reports' }
  ];

  // Employee Self-Service Menus
  readonly profileMenuEmployee: StaticMenuItem[] = [
    { title: 'Personal Information', path: '/dashboard/my-profile/personal-information' },
    { title: 'Contact & Address', path: '/dashboard/my-profile/contact-address' },
    { title: 'Employment Details', path: '/dashboard/my-profile/employment-details' },
    { title: 'Qualification', path: '/dashboard/my-profile/qualification' },
    { title: 'Experience', path: '/dashboard/my-profile/experience' },
    { title: 'Bank Details', path: '/dashboard/my-profile/bank-details' },
    { title: 'Nominee', path: '/dashboard/my-profile/nominee' },
    { title: 'Emergency Contact', path: '/dashboard/my-profile/emergency-contact' },
    { title: 'Documents', path: '/dashboard/my-profile/documents' },
    { title: 'History', path: '/dashboard/my-profile/history' }
  ];

  readonly contractMenuEmployee: StaticMenuItem[] = [
    { title: 'Current Contract', path: '/dashboard/my-contract/current-contract' },
    { title: 'Renewal History', path: '/dashboard/my-contract/renewal-history' },
    { title: 'Appointment Orders', path: '/dashboard/my-contract/appointment-orders' }
  ];

  readonly attendanceMenuEmployee: StaticMenuItem[] = [
    { title: 'Daily Attendance', path: '/dashboard/attendance/daily-attendance' },
    { title: 'Monthly Summary', path: '/dashboard/attendance/monthly-summary' },
    { title: 'Attendance Correction', path: '/dashboard/attendance/attendance-correction' }
  ];

  readonly leaveMenuEmployee: StaticMenuItem[] = [
    { title: 'Apply Leave', path: '/dashboard/leave/apply' },
    { title: 'My Leave Balance', path: '/dashboard/leave/balance' },
    { title: 'Leave History', path: '/dashboard/leave/history' }
  ];

  readonly payrollMenuEmployee: StaticMenuItem[] = [
    { title: 'Current Salary', path: '/dashboard/payroll/current-salary' },
    { title: 'Payslips', path: '/dashboard/payroll/payslips' },
    { title: 'Salary History', path: '/dashboard/payroll/salary-history' }
  ];

  readonly tourMenuEmployee: StaticMenuItem[] = [
    { title: 'Apply Tour', path: '/dashboard/official-tour/apply-tour' },
    { title: 'My Tours', path: '/dashboard/official-tour/my-tours' },
    { title: 'TA/DA Claim', path: '/dashboard/official-tour/tada-claim' }
  ];

  readonly grievanceMenuEmployee: StaticMenuItem[] = [
    { title: 'Lodge Grievance', path: '/dashboard/grievance/lodge' },
    { title: 'My Grievances', path: '/dashboard/grievance/history' }
  ];

  readonly certificatesMenuEmployee: StaticMenuItem[] = [
    { title: 'My Certificates', path: '/dashboard/certificates/my-certificates' },
    { title: 'Request Certificate', path: '/dashboard/certificates/request' }
  ];

  constructor() {
    effect(() => {
      const lang = this.language.langCode();
      if (lang && this.role === 'admin') {
        this.loadDynamicMenu();
      }
    });
  }

  ngOnInit(): void {
    if (this.role === 'admin') {
      this.loadDynamicMenu();
    } else {
      this.dbMenuItems = [];
    }
    this.autoExpandActiveMenus();

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.autoExpandActiveMenus();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role']) {
      if (this.role === 'admin') {
        this.loadDynamicMenu();
      } else {
        this.dbMenuItems = [];
      }
    }
  }

  loadDynamicMenu(): void {
    if (this.role !== 'admin') {
      this.dbMenuItems = [];
      return;
    }
    this.navigationConfig.getMenu().subscribe(items => {
      if (this.role !== 'admin') {
        this.dbMenuItems = [];
        return;
      }
      if (items && items.length > 0) {
        this.dbMenuItems = this.enrichMenuItems(items);
        this.expandedDbMenus = new Set<number>();
        for (const item of this.dbMenuItems) {
          if (this.isDbParentActive(item)) {
            this.expandedDbMenus.add(item.id);
          }
        }
      }
    });
  }

  private autoExpandActiveMenus(): void {
    if (this.isGroupActive(this.profileMenuEmployee)) this.expandedMenus['myProfile'] = true;
    if (this.isGroupActive(this.contractMenuEmployee)) this.expandedMenus['myContract'] = true;
    if (this.isGroupActive(this.attendanceMenuEmployee)) this.expandedMenus['attendance'] = true;
    if (this.isGroupActive(this.leaveMenuEmployee)) this.expandedMenus['leave'] = true;
    if (this.isGroupActive(this.payrollMenuEmployee)) this.expandedMenus['payroll'] = true;
    if (this.isGroupActive(this.tourMenuEmployee)) this.expandedMenus['tour'] = true;
    if (this.isGroupActive(this.grievanceMenuEmployee)) this.expandedMenus['grievance'] = true;
    if (this.isGroupActive(this.certificatesMenuEmployee)) this.expandedMenus['certificates'] = true;
    if (this.isRouteActive('/dashboard/account-settings')) this.expandedMenus['account'] = true;

    if (this.isGroupActive(this.teamMenuAdmin.slice(1))) this.expandedMenus['myTeam'] = true;
    if (this.isGroupActive(this.leaveMenuAdmin)) this.expandedMenus['leave'] = true;
    if (this.isGroupActive(this.attendanceMenuAdmin)) this.expandedMenus['attendance'] = true;
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  closeMobileSidebar(): void {
    this.mobileOpen = false;
    this.mobileOpenChange.emit(false);
  }

  toggleSubmenu(menuKey: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.collapsed) {
      this.toggleSidebar();
      this.expandedMenus[menuKey] = true;
      return;
    }
    this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
  }

  toggleDbSubmenu(item: DashboardMenuItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.collapsed) {
      this.toggleSidebar();
      this.expandedDbMenus.add(item.id);
      return;
    }
    if (this.expandedDbMenus.has(item.id)) {
      this.expandedDbMenus.delete(item.id);
    } else {
      this.expandedDbMenus.add(item.id);
    }
  }

  isDbExpanded(item: DashboardMenuItem): boolean {
    return this.expandedDbMenus.has(item.id);
  }

  isDbItemActive(item: DashboardMenuItem): boolean {
    if (!item.route) return false;
    const url = this.router.url.split('?')[0];
    if (item.route === '/dashboard') return url === '/dashboard';
    return url === item.route || url.startsWith(item.route + '/');
  }

  isDbParentActive(item: DashboardMenuItem): boolean {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some(c => this.isDbItemActive(c));
  }

  isRouteActive(path: string): boolean {
    const url = this.router.url.split('?')[0];
    if (path === '/dashboard') return url === '/dashboard';
    return url === path || url.startsWith(path + '/');
  }

  isGroupActive(items: StaticMenuItem[]): boolean {
    return items.some(item => this.isRouteActive(item.path));
  }

  onLogout(): void {
    this.logout.emit();
  }

  private enrichMenuItems(items: DashboardMenuItem[]): DashboardMenuItem[] {
    const iconMap: Record<string, string> = {
      'My Team': 'bi-people',
      'मेरी टीम': 'bi-people',
      'Employee': 'bi-people',
      'Team Overview': 'bi-grid-fill',
      'Profile Entry': 'bi-person-plus',
      'Single/Bulk Entry': 'bi-person-plus',
      'Employee List': 'bi-people',
      'Reporting Structure': 'bi-diagram-3',
      'Posting History': 'bi-clock-history',
      'Leave Management': 'bi-calendar2-week',
      'Leave': 'bi-calendar2-week',
      'Attendance': 'bi-clock',
      'Tour Management': 'bi-airplane',
      'Tour': 'bi-airplane',
      'Payroll': 'bi-currency-rupee',
      'Grievance Management': 'bi-chat-left-dots',
      'Grievance': 'bi-chat-left-dots',
      'Reports': 'bi-file-earmark-bar-graph',
      'Notifications': 'bi-bell',
      'Settings': 'bi-gear',
      'Document Verification & Approval': 'bi-file-earmark-check',
      'Document Verification': 'bi-file-earmark-check',
      'दस्तावेज़ सत्यापन एवं अनुमोदन': 'bi-file-earmark-check',
      'Contract Entry': 'bi-journal-plus',
      'संविदा प्रविष्टि': 'bi-journal-plus',
      'My Profile': 'bi-person',
      'मेरा प्रोफ़ाइल': 'bi-person',
      'Personal Information': 'bi-person-vcard',
      'व्यक्तिगत जानकारी': 'bi-person-vcard',
      'Contact & Address': 'bi-geo-alt',
      'संपर्क और पता': 'bi-geo-alt',
      'Employment Details': 'bi-briefcase',
      'रोजगार विवरण': 'bi-briefcase',
      'Qualification': 'bi-mortarboard',
      'योग्यता': 'bi-mortarboard',
      'Experience': 'bi-briefcase-fill',
      'अनुभव': 'bi-briefcase-fill',
      'Bank Details': 'bi-bank',
      'बैंक विवरण': 'bi-bank',
      'Nominee': 'bi-people',
      'नामित व्यक्ति': 'bi-people',
      'Emergency Contact': 'bi-telephone-plus',
      'आपातकालीन संपर्क': 'bi-telephone-plus',
      'Documents': 'bi-folder2-open',
      'दस्तावेज़': 'bi-folder2-open',
      'Profile History': 'bi-clock-history',
      'प्रोफ़ाइल इतिहास': 'bi-clock-history',
      'My Contract': 'bi-file-earmark-text',
      'मेरा अनुबंध': 'bi-file-earmark-text',
      'Current Contract': 'bi-file-earmark-check',
      'वर्तमान अनुबंध': 'bi-file-earmark-check',
      'Renewal History': 'bi-clock-history',
      'नवीनीकरण इतिहास': 'bi-clock-history',
      'Appointment Orders': 'bi-file-earmark-text',
      'नियुक्ति आदेश': 'bi-file-earmark-text',
      'Apply Leave': 'bi-send',
      'अवकाश आवेदन': 'bi-send',
      'Leave Balance': 'bi-pie-chart',
      'अवकाश शेष': 'bi-pie-chart',
      'Applications Status': 'bi-list-check',
      'आवेदन की स्थिति': 'bi-list-check'
    };

    const defaultRouteMap: Record<string, string> = {
      'Document Verification & Approval': '/dashboard/document-verification',
      'Document Verification': '/dashboard/document-verification',
      'दस्तावेज़ सत्यापन एवं अनुमोदन': '/dashboard/document-verification',
      'Contract Entry': '/dashboard/contract-entry',
      'संविदा प्रविष्टि': '/dashboard/contract-entry',
      'Daily Attendance': '/dashboard/attendance/daily-attendance',
      'दैनिक उपस्थिति': '/dashboard/attendance/daily-attendance',
      'Monthly Summary': '/dashboard/attendance/monthly-summary',
      'मासिक सारांश': '/dashboard/attendance/monthly-summary',
      'Attendance Correction': '/dashboard/attendance/attendance-correction',
      'उपस्थिति सुधार': '/dashboard/attendance/attendance-correction',
      'Current Salary': '/dashboard/payroll/current-salary',
      'वर्तमान वेतन': '/dashboard/payroll/current-salary',
      'Payslip': '/dashboard/payroll/payslips',
      'Payslips': '/dashboard/payroll/payslips',
      'वेतन पर्ची': '/dashboard/payroll/payslips',
      'Salary History': '/dashboard/payroll/salary-history',
      'Apply Tour': '/dashboard/official-tour/apply-tour',
      'टूर आवेदन': '/dashboard/official-tour/apply-tour',
      'My Tour': '/dashboard/official-tour/my-tours',
      'मेरा टूर': '/dashboard/official-tour/my-tours',
      'TA/DA Claim': '/dashboard/official-tour/tada-claim',
      'Lodge Grievance': '/dashboard/grievance/lodge',
      'My Grievances': '/dashboard/grievance/history',
      'My Requests': '/dashboard/my-requests',
      'Help / FAQ': '/dashboard/help'
    };

    return items.map(item => ({
      ...item,
      route: item.route || defaultRouteMap[item.label] || null,
      icon: item.icon || iconMap[item.label] || 'bi-circle',
      children: item.children ? this.enrichMenuItems(item.children) : []
    }));
  }
}
