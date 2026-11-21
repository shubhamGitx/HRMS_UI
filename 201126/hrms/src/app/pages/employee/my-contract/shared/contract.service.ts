import { Injectable, inject, signal } from '@angular/core';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { ContractApiService } from '@core/services/contract-api.service';
import {
  AppointmentOrderItem,
  ContractDetails,
  RenewalHistoryItem,
  RenewalWorkflowStep
} from './contract.models';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private readonly authSession = inject(AuthSessionService);
  private readonly contractApi = inject(ContractApiService);

  // Loading & Error Signals
  readonly isLoading = signal<boolean>(false);
  readonly apiError = signal<string | null>(null);

  // -------------------------------------------------------------------------
  // Signals holding dynamic contract data
  // -------------------------------------------------------------------------
  readonly currentContract = signal<ContractDetails>(this.buildDefaultContract());
  readonly renewalHistory = signal<RenewalHistoryItem[]>(this.buildDefaultRenewalHistory());
  readonly appointmentOrders = signal<AppointmentOrderItem[]>(this.buildDefaultAppointmentOrders());
  readonly renewalWorkflow = signal<RenewalWorkflowStep[]>(this.buildDefaultWorkflow());

  constructor() {
    this.syncSessionUser();
    this.fetchContractDataFromApi();
  }

  /**
   * Sync dynamic user details from authenticated session
   */
  public syncSessionUser(): void {
    const user = this.authSession.user;
    if (!user) return;

    this.currentContract.update(c => {
      const updated = { ...c };
      if (user.userName) updated.employeeName = user.userName;
      if (user.userId) updated.employeeCode = user.userId;
      if (user.reportingOfficialName) updated.reportingOfficer = user.reportingOfficialName;
      return updated;
    });
  }

  /**
   * =========================================================================
   * 🚀 API INTEGRATION METHOD
   * =========================================================================
   * When the API team delivers the backend endpoints:
   * 1. Check endpoints in `src/app/core/apiEndpoints/api-endpoints.ts` (API_ENDPOINT.CONTRACT).
   * 2. This method is already wired in constructor and calls `ContractApiService`.
   * 3. Successful responses will automatically update the Angular signals below!
   * =========================================================================
   */
  public fetchContractDataFromApi(empId?: number | string): void {
    let numericId: number | null = null;
    if (typeof empId === 'number' && empId > 0) {
      numericId = empId;
    } else if (typeof empId === 'string' && !isNaN(Number(empId)) && Number(empId) > 0) {
      numericId = Number(empId);
    } else if (this.authSession.user?.employeeId && Number(this.authSession.user.employeeId) > 0) {
      numericId = Number(this.authSession.user.employeeId);
    } else if (this.authSession.user?.userRole === 'Employee') {
      numericId = 1;
    }

    if (!numericId) return;

    this.isLoading.set(true);
    this.apiError.set(null);

    // 1. Fetch Current Contract
    this.contractApi.getContractDetails(numericId).subscribe({
      next: (res) => {
        if (res && res.data) {
          const apiContract = res.data;
          const { totalDays, passedDays, remainingDays } = this.calculateTenureDays(
            apiContract.startDate,
            apiContract.endDate
          );
          this.currentContract.set({
            ...apiContract,
            employeeCode: apiContract.employeeCode || apiContract.contractNo || this.authSession.user?.userId || 'BRDS-EMP-000001',
            employeeName: apiContract.employeeName || this.authSession.user?.userName || 'Sudha Kumari',
            designation: apiContract.designation || 'Contractual Employee',
            reportingOfficer: apiContract.reportingOfficer || this.authSession.user?.reportingOfficialName || 'Amit Kumar',
            reportingOfficerDesignation: apiContract.reportingOfficerDesignation || 'Joint Director (IT)',
            totalDays: apiContract.totalDays || totalDays,
            passedDays: apiContract.passedDays !== undefined ? apiContract.passedDays : passedDays,
            remainingDays: apiContract.remainingDays !== undefined ? apiContract.remainingDays : remainingDays
          });
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('[ContractService] Backend contract API response error:', err?.status || err);
        this.apiError.set(err?.message || 'Failed to load contract details');
        this.isLoading.set(false);
      }
    });

    // 2. Fetch Renewal History
    this.contractApi.getRenewalHistory(numericId).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.renewalHistory.set(res.data);
        }
      },
      error: () => {}
    });

    // 3. Fetch Appointment Orders
    this.contractApi.getAppointmentOrders(numericId).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.appointmentOrders.set(res.data);
        }
      },
      error: () => {}
    });

    // 4. Fetch Renewal Workflow
    this.contractApi.getRenewalWorkflow(numericId).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.renewalWorkflow.set(res.data);
        }
      },
      error: () => {}
    });
  }

  /**
   * Helper to calculate dynamic total, passed, and remaining days between two dates
   */
  public calculateTenureDays(startDateStr: string, endDateStr: string): { totalDays: number; passedDays: number; remainingDays: number } {
    try {
      const start = new Date(startDateStr).getTime();
      const end = new Date(endDateStr).getTime();
      const now = new Date().getTime();

      const totalMs = Math.max(end - start, 86400000);
      const passedMs = Math.max(0, Math.min(now - start, totalMs));
      const remainingMs = Math.max(0, end - now);

      const oneDay = 86400000;
      const totalDays = Math.round(totalMs / oneDay);
      const passedDays = Math.round(passedMs / oneDay);
      const remainingDays = Math.round(remainingMs / oneDay);

      return { totalDays, passedDays, remainingDays };
    } catch {
      return { totalDays: 365, passedDays: 178, remainingDays: 187 };
    }
  }

  // -------------------------------------------------------------------------
  // Dynamic Initial Defaults
  // -------------------------------------------------------------------------
  private buildDefaultContract(): ContractDetails {
    const user = this.authSession.user;
    const { totalDays, passedDays, remainingDays } = this.calculateTenureDays('2025-04-01', '2027-03-31');

    return {
      contractId: '1',
      employeeCode: user?.userId || 'BRDS-EMP-000001',
      employeeName: user?.userName || 'Sudha Kumari',
      designation: 'Contractual Employee',
      department: 'Bihar Rural Development Society',
      officeLocation: 'BRDS Headquarters',
      contractType: 'Fixed Term',
      startDate: '2025-04-01',
      endDate: '2027-03-31',
      status: 'Active',
      monthlyConsolidatedPay: 45000,
      sanctionOrderNo: 'BRDS/HR/2025/001',
      sanctionOrderDate: '2025-03-25',
      reportingOfficer: user?.reportingOfficialName || 'Amit Kumar',
      reportingOfficerDesignation: 'Joint Director (IT)',
      postingUnit: 'Application Support',
      totalDays,
      remainingDays,
      passedDays,
      termsAndConditions: [
        {
          id: 'tc-1',
          category: 'Remuneration & Allowances',
          title: 'Fixed Monthly Remuneration',
          description: 'The employee shall receive a fixed consolidated monthly remuneration of ₹45,000/-. No extra DA, HRA or Grade Pay shall be applicable unless explicitly revised by State Govt. order.',
          icon: 'bi-currency-rupee'
        },
        {
          id: 'tc-2',
          category: 'Working Hours & Attendance',
          title: 'Standard Working Hours',
          description: 'Official working hours are 09:30 AM to 06:00 PM, Monday to Saturday (2nd & 4th Saturday off). Biometric / Geo-fenced attendance registration is mandatory.',
          icon: 'bi-clock-history'
        },
        {
          id: 'tc-3',
          category: 'Leave Entitlement',
          title: 'Casual & Medical Leaves',
          description: 'Allowed 12 days of Casual Leave (CL) and 10 days Medical Leave per calendar year. Leaves cannot be encashed or carried forward to subsequent contract terms.',
          icon: 'bi-calendar-check'
        },
        {
          id: 'tc-4',
          category: 'Notice Period & Termination',
          title: '30 Days Notice Requirement',
          description: 'Either party may terminate this contractual agreement by serving 30 days written notice or by depositing 1 month consolidated salary in lieu of notice.',
          icon: 'bi-exclamation-octagon'
        },
        {
          id: 'tc-5',
          category: 'Conduct & Confidentiality',
          title: 'Government Official Code of Conduct',
          description: 'The employee is bound by official secrecy norms. Any unauthorized disclosure of state departmental data will result in immediate contract termination and legal action.',
          icon: 'bi-shield-check'
        }
      ]
    };
  }

  private buildDefaultRenewalHistory(): RenewalHistoryItem[] {
    return [
      {
        id: 'ren-3',
        renewalPhase: 'Contract Extension Phase III (2026-27)',
        startDate: '01 Apr 2026',
        endDate: '31 Mar 2027',
        durationMonths: 12,
        monthlyPay: 45000,
        incrementPercentage: 7.14,
        sanctionOrderNo: 'MEMO/RWD/IT/2026/412-B',
        sanctionOrderDate: '28 Mar 2026',
        status: 'Active',
        remarks: 'Extended for 1 year following satisfactory performance appraisal by Reporting Officer.',
        documentRef: 'ORD-2026-412.pdf',
        performanceGrade: 'A+'
      },
      {
        id: 'ren-2',
        renewalPhase: 'Contract Extension Phase II (2025-26)',
        startDate: '01 Apr 2025',
        endDate: '31 Mar 2026',
        durationMonths: 12,
        monthlyPay: 42000,
        incrementPercentage: 5.0,
        sanctionOrderNo: 'MEMO/RWD/IT/2025/198-A',
        sanctionOrderDate: '25 Mar 2025',
        status: 'Completed',
        remarks: '12 Months extension granted. Achieved all key project milestones.',
        documentRef: 'ORD-2025-198.pdf',
        performanceGrade: 'A'
      },
      {
        id: 'ren-1',
        renewalPhase: 'Initial Contract Period (2024-25)',
        startDate: '01 Apr 2024',
        endDate: '31 Mar 2025',
        durationMonths: 12,
        monthlyPay: 40000,
        incrementPercentage: 0,
        sanctionOrderNo: 'MEMO/RWD/IT/2024/055',
        sanctionOrderDate: '28 Mar 2024',
        status: 'Completed',
        remarks: 'Initial joining contract order issued upon selection.',
        documentRef: 'ORD-2024-055.pdf',
        performanceGrade: 'A'
      }
    ];
  }

  private buildDefaultAppointmentOrders(): AppointmentOrderItem[] {
    return [
      {
        id: 'doc-1',
        documentTitle: 'Annual Contract Extension Order (2026-2027)',
        category: 'Renewal Order',
        memoNumber: 'MEMO/RWD/IT/2026/412-B',
        issueDate: '28 Mar 2026',
        effectiveDate: '01 Apr 2026',
        issuingAuthority: 'Department of IT & e-Governance, Govt. of Bihar',
        fileSize: '1.2 MB',
        fileType: 'PDF',
        downloadUrl: '#',
        description: 'Official sanction order granting 1-year contract extension from 01 Apr 2026 to 31 Mar 2027 with revised consolidated pay of ₹45,000/month.',
        isLatest: true
      },
      {
        id: 'doc-2',
        documentTitle: 'Annual Contract Extension Order (2025-2026)',
        category: 'Renewal Order',
        memoNumber: 'MEMO/RWD/IT/2025/198-A',
        issueDate: '25 Mar 2025',
        effectiveDate: '01 Apr 2025',
        issuingAuthority: 'Department of IT & e-Governance, Govt. of Bihar',
        fileSize: '1.0 MB',
        fileType: 'PDF',
        downloadUrl: '#',
        description: 'Sanction order for contract extension for FY 2025-26 with remuneration revision to ₹42,000/month.',
        isLatest: false
      },
      {
        id: 'doc-3',
        documentTitle: 'Posting & Assignment Allocation Order',
        category: 'Posting / Transfer',
        memoNumber: 'MEMO/RWD/HQ/2024/788',
        issueDate: '05 Apr 2024',
        effectiveDate: '05 Apr 2024',
        issuingAuthority: 'Chief Engineer (HQ), Rural Works Department',
        fileSize: '850 KB',
        fileType: 'PDF',
        downloadUrl: '#',
        description: 'Departmental posting order assigning duty as System Analyst at Main Secretariat Headquarters Patna.',
        isLatest: false
      },
      {
        id: 'doc-4',
        documentTitle: 'Initial Engagement & Offer of Contractual Appointment',
        category: 'Initial Appointment',
        memoNumber: 'MEMO/RWD/IT/2024/055',
        issueDate: '28 Mar 2024',
        effectiveDate: '01 Apr 2024',
        issuingAuthority: 'Deputy Secretary, Govt. of Bihar',
        fileSize: '2.4 MB',
        fileType: 'PDF',
        downloadUrl: '#',
        description: 'Initial appointment order for the post of System Analyst (Contractual) under HRMS Portal project.',
        isLatest: false
      }
    ];
  }

  private buildDefaultWorkflow(): RenewalWorkflowStep[] {
    return [
      {
        stepNumber: 1,
        title: 'Annual Performance Appraisal Submission',
        description: 'Self-appraisal submitted by employee with key deliverables.',
        status: 'completed',
        completedDate: '10 Feb 2026',
        actor: 'Rahul Sharma (Employee)'
      },
      {
        stepNumber: 2,
        title: 'Reporting Officer Recommendation',
        description: 'Performance reviewed & recommended for 1-year extension with Grade A+.',
        status: 'completed',
        completedDate: '24 Feb 2026',
        actor: 'Amit Kumar (RO)'
      },
      {
        stepNumber: 3,
        title: 'Departmental Committee Review & Approval',
        description: 'Sanction approved by State IT Engagement Committee.',
        status: 'completed',
        completedDate: '15 Mar 2026',
        actor: 'State IT Committee'
      },
      {
        stepNumber: 4,
        title: 'Sanction Order Generation & Digital Sign',
        description: 'Sanction Order MEMO/RWD/IT/2026/412-B generated and signed.',
        status: 'completed',
        completedDate: '28 Mar 2026',
        actor: 'Under Secretary, Govt. of Bihar'
      }
    ];
  }
}
