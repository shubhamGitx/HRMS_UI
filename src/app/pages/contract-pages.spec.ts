import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { ContractEntryComponent, ContractRecordItem } from './admin/contract-entry/contract-entry';
import { CurrentContractComponent } from './employee/my-contract/current-contract/current-contract';
import { ContractPageComponent } from './employee/my-contract/contract-page/contract-page';
import { ContractService } from './employee/my-contract/shared/contract.service';
import { ContractApiService } from '../core/services/contract-api.service';
import { aEmployeeDetails } from '../core/services/adminService/aEmployee.service';
import { AuthSessionService } from '../core/auth/auth-session.service';
import { EmployeeApiService } from '../core/services/employee-api.service';
import { LanguageService } from '../core/i18n/language.service';
import { EmployeeListItem } from './admin/employees/employee-list/employee-list';

describe('Contract Management Unit Tests (Admin & Employee)', () => {
  let injector: Injector;

  // Mock employee data for admin dropdown
  const mockEmployees: EmployeeListItem[] = [
    {
      employeeId: 1010,
      contractNo: 'BRDS-EMP-001010',
      employeeName: 'Mr. Sachin',
      designationName: 'Contractual Staff',
      departmentName: 'IT Department',
      officeName: 'BRDS HQ',
      joiningDate: '2026-11-05',
      userStatus: 'A'
    },
    {
      employeeId: 1009,
      contractNo: 'BRDS-EMP-001009',
      employeeName: 'Mr. Sunny',
      designationName: 'Contractual Staff',
      departmentName: 'IT Department',
      officeName: 'BRDS HQ',
      joiningDate: '2026-11-01',
      userStatus: 'A'
    }
  ];

  // Mock existing contracts in database
  const mockContractList = [
    {
      contractId: 4,
      employeeId: 1010,
      employeeCode: 'BRDS-EMP-001010',
      employeeName: 'Mr. Sachin',
      designation: 'Contractual Staff',
      contractNumber: 'BRDS-CON-2026-1010',
      startDate: '2026-11-05',
      endDate: '2027-12-31',
      monthlyPay: 65000,
      orderNo: 'BRDS/HR/ORD/2026/1010',
      orderDate: '2026-11-05',
      contractStatus: 'ACTIVE'
    },
    {
      contractId: 2,
      employeeId: 1009,
      employeeCode: 'BRDS-EMP-001009',
      employeeName: 'Mr. Sunny',
      designation: 'Contractual Staff',
      contractNumber: 'BRDS-CON-2026-1009',
      startDate: '2026-11-05',
      endDate: '2027-11-05',
      monthlyPay: 45000,
      orderNo: 'BRDS/HR/ORD/2026/1009',
      orderDate: '2026-11-05',
      contractStatus: 'ACTIVE'
    }
  ];

  // Mock contract details response for Mr. Sachin
  const mockSachinContractDetails = {
    contractId: 4,
    contractNo: 'BRDS-CON-2026-1010',
    employeeId: 1010,
    employeeCode: 'BRDS-EMP-001010',
    employeeName: 'Mr. Sachin',
    designation: 'Contractual Employee',
    department: 'IT Department',
    postingUnit: 'BRDS Headquarters',
    sanctionOrderNo: 'BRDS/HR/ORD/2026/1010',
    sanctionOrderDate: '2026-11-05',
    appointingAuthority: 'Chief Executive Officer, BRDS',
    reportingOfficer: 'Amit Kumar',
    reportingOfficerDesignation: 'HRMS Nodal Officer',
    contractTypeId: 1,
    contractTypeName: 'Fixed Term',
    startDate: '2026-11-05',
    endDate: '2027-12-31',
    monthlyConsolidatedPay: 65000,
    totalDays: 421,
    passedDays: 0,
    remainingDays: 421,
    status: 'Active',
    remarks: 'Contract recorded under DADM portal'
  };

  const mockEmployeeService = {
    getEmployeeList: vi.fn(() => of({ success: true, data: mockEmployees }))
  };

  const mockContractApi = {
    getAllContracts: vi.fn(() => of({ success: true, data: mockContractList })),
    saveContract: vi.fn((payload: any) => of({ success: true, data: 5 })),
    getContractDetails: vi.fn((empId: number) => of({ success: true, data: mockSachinContractDetails })),
    getRenewalHistory: vi.fn(() => of({ success: true, data: [] })),
    getAppointmentOrders: vi.fn(() => of({ success: true, data: [] })),
    getRenewalWorkflow: vi.fn(() => of({ success: true, data: [] }))
  };

  const mockAuthSession = {
    user: {
      userId: 'BRDS-EMP-001010',
      employeeId: 1010,
      userName: 'Mr. Sachin',
      userRole: 'Employee',
      reportingOfficialName: 'Amit Kumar'
    },
    token: 'jwt-test-token'
  };

  const mockEmployeeApi = {
    downloadDocument: vi.fn(() => of(new Blob(['pdf-content'], { type: 'application/pdf' })))
  };

  const mockLanguage = {
    t: (key: string) => key,
    currentLanguage: () => 'en'
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    injector = Injector.create({
      providers: [
        { provide: aEmployeeDetails, useValue: mockEmployeeService },
        { provide: ContractApiService, useValue: mockContractApi },
        { provide: AuthSessionService, useValue: mockAuthSession },
        { provide: EmployeeApiService, useValue: mockEmployeeApi },
        { provide: LanguageService, useValue: mockLanguage },
        { provide: Router, useValue: mockRouter },
        ContractService,
        ContractEntryComponent,
        CurrentContractComponent,
        ContractPageComponent
      ]
    });
  });

  // =========================================================================
  // SUITE 1: ADMIN SIDE - CONTRACT ENTRY COMPONENT
  // =========================================================================
  describe('1. Admin Side: Contract Entry Component', () => {
    it('1.1 should initialize dates and load employee list & active contracts on ngOnInit', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.ngOnInit();

        expect(component.startDate).toBeTruthy();
        expect(component.endDate).toBeTruthy();
        expect(component.orderDate).toBeTruthy();
        expect(mockEmployeeService.getEmployeeList).toHaveBeenCalled();
        expect(mockContractApi.getAllContracts).toHaveBeenCalled();
        expect(component.employees().length).toBe(2);
        expect(component.activeContracts().length).toBe(2);
        // Should auto-select first employee
        expect(component.selectedEmpId).toBe(1010);
      });
    });

    it('1.2 should auto-fill contractNumber and orderNo when an employee is selected', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.employees.set(mockEmployees);

        component.onSelectEmployee(1009);

        expect(component.selectedEmpId).toBe(1009);
        expect(component.contractNumber).toBe('BRDS-CON-2026-1009');
        expect(component.orderNo).toBe('BRDS/HR/ORD/2026/1009');
      });
    });

    it('1.3 should validate that an employee must be selected', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.selectedEmpId = null;

        component.submitContract();

        expect(component.errorMessage()).toContain('Please select an employee');
        expect(mockContractApi.saveContract).not.toHaveBeenCalled();
      });
    });

    it('1.4 should validate that Contract Agreement Number has minimum length of 4 characters', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.selectedEmpId = 1010;
        component.contractNumber = '12'; // Too short

        component.submitContract();

        expect(component.errorMessage()).toContain('valid Contract Agreement Number is required');
        expect(mockContractApi.saveContract).not.toHaveBeenCalled();
      });
    });

    it('1.5 should validate that End Date must be after Start Date', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-12-01';
        component.endDate = '2026-11-01'; // End date earlier than start date

        component.submitContract();

        expect(component.errorMessage()).toContain('Contract End Date must be after the Start Date');
        expect(mockContractApi.saveContract).not.toHaveBeenCalled();
      });
    });

    it('1.6 should auto-adjust orderDate if orderDate is after startDate', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-11-05';
        component.endDate = '2027-11-05';
        component.orderDate = '2026-11-20'; // After start date
        component.monthlyPay = 65000;

        component.submitContract();

        expect(component.orderDate).toBe('2026-11-05');
      });
    });

    it('1.7 should validate that Monthly Remuneration must be greater than zero', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-11-05';
        component.endDate = '2027-11-05';
        component.monthlyPay = 0; // Invalid

        component.submitContract();

        expect(component.errorMessage()).toContain('Monthly consolidated pay must be greater than zero');
        expect(mockContractApi.saveContract).not.toHaveBeenCalled();
      });
    });

    it('1.8 should submit valid contract, add to active list, and switch tab to list view', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.employees.set(mockEmployees);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-11-05';
        component.endDate = '2027-12-31';
        component.monthlyPay = 65000;
        component.orderNo = 'BRDS/HR/ORD/2026/1010';
        component.activeTab = 'entry';

        component.submitContract();

        expect(mockContractApi.saveContract).toHaveBeenCalledWith(
          expect.objectContaining({
            employeeId: 1010,
            contractNumber: 'BRDS-CON-2026-1010',
            startDate: '2026-11-05',
            endDate: '2027-12-31',
            monthlyPay: 65000,
            contractStatus: 'ACTIVE'
          })
        );

        expect(component.activeTab).toBe('list');
        expect(component.successMessage()).toContain('Validation Success');
        expect(component.activeContracts().some(c => c.contractNumber === 'BRDS-CON-2026-1010' && c.monthlyPay === 65000)).toBe(true);
      });
    });

    it('1.9 should filter active contracts by search term (employee name, contract no, or order no)', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.activeContracts.set(mockContractList as any);

        // Search by name
        component.tableSearchTerm.set('Sachin');
        expect(component.filteredContracts.length).toBe(1);
        expect(component.filteredContracts[0].employeeName).toBe('Mr. Sachin');

        // Search by contract number
        component.tableSearchTerm.set('CON-2026-1009');
        expect(component.filteredContracts.length).toBe(1);
        expect(component.filteredContracts[0].employeeName).toBe('Mr. Sunny');

        // Empty search term returns all
        component.tableSearchTerm.set('');
        expect(component.filteredContracts.length).toBe(2);
      });
    });

    it('1.10 should reset form to default state on resetForm', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.employees.set(mockEmployees);
        component.monthlyPay = 99999;
        component.remarks = 'Changed remarks';

        component.resetForm();

        expect(component.monthlyPay).toBe(45000);
        expect(component.remarks).toContain('registered under DADM portal');
        expect(component.selectedEmpId).toBe(1010);
      });
    });

    it('1.11 should fallback to default orderNo and orderDate if left empty', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.employees.set(mockEmployees);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-11-05';
        component.endDate = '2027-11-05';
        component.monthlyPay = 50000;
        component.orderNo = ''; // Empty
        component.orderDate = ''; // Empty

        component.submitContract();

        expect(mockContractApi.saveContract).toHaveBeenCalledWith(
          expect.objectContaining({
            appointmentOrderNo: 'BRDS/HR/ORD/1010',
            appointmentOrderDate: '2026-11-05'
          })
        );
      });
    });

    it('1.12 should handle API error gracefully on saveContract and retain optimistic state', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractEntryComponent);
        component.employees.set(mockEmployees);
        component.selectedEmpId = 1010;
        component.contractNumber = 'BRDS-CON-2026-1010';
        component.startDate = '2026-11-05';
        component.endDate = '2027-11-05';
        component.monthlyPay = 50000;

        mockContractApi.saveContract.mockReturnValueOnce(throwError(() => new Error('Server down')));

        component.submitContract();

        expect(component.isSubmitting()).toBe(false);
        expect(component.activeTab).toBe('list');
        expect(component.successMessage()).toContain('recorded successfully');
      });
    });
  });

  // =========================================================================
  // SUITE 2: EMPLOYEE SIDE - CURRENT CONTRACT & TENURE LOGIC
  // =========================================================================
  describe('2. Employee Side: Current Contract & Tenure Calculations', () => {
    it('2.1 should load employee contract details via ContractService on ngOnInit', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        component.ngOnInit();

        expect(mockContractApi.getContractDetails).toHaveBeenCalledWith(1010);
        const contract = component['contract']();
        expect(contract.employeeName).toBe('Mr. Sachin');
        expect(contract.employeeCode).toBe('BRDS-EMP-001010');
        expect(contract.monthlyConsolidatedPay).toBe(65000);
        expect(contract.reportingOfficer).toBe('Amit Kumar');
      });
    });

    it('2.2 should calculate tenure elapsed percentage and remaining percentage accurately', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const service = injector.get(ContractService);

        // Scenario A: Just started contract (0 passed / 421 total days)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 421,
          passedDays: 0,
          remainingDays: 421
        } as any);

        expect(component.elapsedPercentage).toBe(0);
        expect(component.remainingPercentage).toBe(100);

        // Scenario B: Mid contract (210 passed / 420 total days = 50%)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 420,
          passedDays: 210,
          remainingDays: 210
        } as any);

        expect(component.elapsedPercentage).toBe(50);
        expect(component.remainingPercentage).toBe(50);

        // Scenario C: Fully completed contract (420 passed / 420 total days = 100%)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 420,
          passedDays: 420,
          remainingDays: 0
        } as any);

        expect(component.elapsedPercentage).toBe(100);
        expect(component.remainingPercentage).toBe(0);
      });
    });

    it('2.3 should correctly detect Healthy, Expiring Soon, and Expired contract states', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const service = injector.get(ContractService);

        // State 1: Healthy (> 60 days remaining)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 365,
          passedDays: 100,
          remainingDays: 265
        } as any);

        expect(component.isExpired).toBe(false);
        expect(component.isExpiringSoon).toBe(false);
        expect(component.tenureStatusText).toBe('Active Contract Tenure');
        expect(component.tenureStatusClass).toBe('status-healthy');

        // State 2: Expiring Soon (1 to 60 days remaining)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 365,
          passedDays: 320,
          remainingDays: 45
        } as any);

        expect(component.isExpired).toBe(false);
        expect(component.isExpiringSoon).toBe(true);
        expect(component.tenureStatusText).toBe('Renewal Window (Expiring Soon)');
        expect(component.tenureStatusClass).toBe('status-warning');

        // State 3: Expired (0 or negative days remaining)
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 365,
          passedDays: 365,
          remainingDays: 0
        } as any);

        expect(component.isExpired).toBe(true);
        expect(component.isExpiringSoon).toBe(false);
        expect(component.tenureStatusText).toBe('Contract Term Expired');
        expect(component.tenureStatusClass).toBe('status-expired');
      });
    });

    it('2.4 should toggle accordion sections for contract terms', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);

        expect(component.activeTermId).toBe('tc-1');

        component.toggleTerm('tc-2');
        expect(component.activeTermId).toBe('tc-2');

        // Clicking the same term collapses it
        component.toggleTerm('tc-2');
        expect(component.activeTermId).toBeNull();
      });
    });

    it('2.5 should trigger downloadDocument via employeeApi on downloadContractPdf', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const service = injector.get(ContractService);
        service.currentContract.set(mockSachinContractDetails as any);

        // Mock window and document for Node.js environment
        const prevWindow = (globalThis as any).window;
        const prevDoc = (globalThis as any).document;

        const mockAnchor = {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn()
        };

        const origCreateUrl = window.URL.createObjectURL;
        const origRevokeUrl = window.URL.revokeObjectURL;

        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = vi.fn();
        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);

        component.downloadContractPdf();

        expect(mockEmployeeApi.downloadDocument).toHaveBeenCalledWith(1010, 4);
        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchor.click).toHaveBeenCalled();

        window.URL.createObjectURL = origCreateUrl;
        window.URL.revokeObjectURL = origRevokeUrl;
        vi.restoreAllMocks();
      });
    });

    it('2.6 should safely bound elapsedPercentage between 0 and 100 on edge values', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const service = injector.get(ContractService);

        // Negative passedDays
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 365,
          passedDays: -10,
          remainingDays: 375
        } as any);

        expect(component.elapsedPercentage).toBe(0);
        expect(component.remainingPercentage).toBe(100);

        // passedDays exceeding totalDays
        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 365,
          passedDays: 400,
          remainingDays: -35
        } as any);

        expect(component.elapsedPercentage).toBe(100);
        expect(component.remainingPercentage).toBe(0);
      });
    });

    it('2.7 should return 0 for elapsedPercentage when totalDays is 0 or negative', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const service = injector.get(ContractService);

        service.currentContract.set({
          ...mockSachinContractDetails,
          totalDays: 0,
          passedDays: 0,
          remainingDays: 0
        } as any);

        expect(component.elapsedPercentage).toBe(0);
        expect(component.remainingPercentage).toBe(100);
      });
    });

    it('2.8 should call window.print on printContract', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(CurrentContractComponent);
        const prevWindow = (globalThis as any).window;
        const mockPrint = vi.fn();
        (globalThis as any).window = { print: mockPrint };

        component.printContract();

        expect(mockPrint).toHaveBeenCalled();
        (globalThis as any).window = prevWindow;
      });
    });
  });

  // =========================================================================
  // SUITE 3: EMPLOYEE SIDE - CONTRACT PAGE NAVIGATION & TABS
  // =========================================================================
  describe('3. Employee Side: Contract Page Tabs & Routing', () => {
    it('3.1 should default to current-contract page tab', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractPageComponent);
        expect(component.tabs.length).toBe(3);
        expect(component.tabs[0].key).toBe('current-contract');
        expect(component.tabs[1].key).toBe('renewal-history');
        expect(component.tabs[2].key).toBe('appointment-orders');
      });
    });

    it('3.2 should navigate to target tab preserving query params on selectTab', () => {
      runInInjectionContext(injector, () => {
        const component = injector.get(ContractPageComponent);

        component.selectTab('renewal-history');

        expect(mockRouter.navigate).toHaveBeenCalledWith(
          ['/dashboard', 'my-contract', 'renewal-history'],
          { queryParamsHandling: 'preserve' }
        );
      });
    });
  });

  // =========================================================================
  // SUITE 4: CONTRACT SERVICE - SYNC AND BUSINESS CALCULATIONS
  // =========================================================================
  describe('4. Contract Service: Business Logic & Session Sync', () => {
    it('4.1 should sync logged-in session user to contract model', () => {
      runInInjectionContext(injector, () => {
        const service = injector.get(ContractService);
        service.syncSessionUser();

        const c = service.currentContract();
        expect(c.employeeName).toBe('Mr. Sachin');
        expect(c.employeeCode).toBe('BRDS-EMP-001010');
        expect(c.reportingOfficer).toBe('Amit Kumar');
      });
    });

    it('4.2 calculateTenureDays should compute totalDays, passedDays, and remainingDays with correct dates', () => {
      runInInjectionContext(injector, () => {
        const service = injector.get(ContractService);

        const startDate = '2026-01-01';
        const endDate = '2026-12-31';

        const result = (service as any).calculateTenureDays(startDate, endDate);

        expect(result.totalDays).toBeGreaterThan(0);
        expect(result.passedDays + result.remainingDays).toBe(result.totalDays);
      });
    });

    it('4.3 should reset isLoading to false on API failure', () => {
      runInInjectionContext(injector, () => {
        const service = injector.get(ContractService);
        mockContractApi.getContractDetails.mockReturnValueOnce(throwError(() => new Error('Network error')));

        service.fetchContractDataFromApi(1010);

        expect(service.isLoading()).toBe(false);
        expect(service.apiError()).toBe('Network error');
      });
    });
  });
});
