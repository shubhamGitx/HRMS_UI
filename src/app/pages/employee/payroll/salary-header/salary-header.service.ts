import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

export type SalaryHeaderStatus = 'DRAFT' | 'LOCKED';

export interface SalaryComponentLine {
  id: number;
  code: string;
  name: string;
  componentType: 'EARNING' | 'DEDUCTION';
  calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
  rule: string;
  amount: number;
  isProrated: boolean;
  isTaxable: boolean;
}

export interface SalaryHeader {
  salaryHeaderId: number;
  revisionNo: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  payMatrix: string;
  monthlyGross: number;
  totalDeductions: number;
  netPayable: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SalaryHeaderStatus;
  createdOn: string;
  components: SalaryComponentLine[];
}

/**
 * Temporary UI data source for the employee Salary Header screen.
 * Replace `DUMMY_API_NAME` and the `of(...)` response with HttpClient when
 * the payroll API is available; no backend request is made by this service.
 */
@Injectable({ providedIn: 'root' })
export class SalaryHeaderDummyApiService {
  readonly DUMMY_API_NAME = 'GET /api/dummy/payroll/salary-header';

  getEmployeeSalaryHeader(employeeId?: number): Observable<SalaryHeader> {
    const header: SalaryHeader = {
      salaryHeaderId: 11,
      revisionNo: 2,
      employeeId: employeeId || 1,
      employeeCode: 'DEPT-2026-042',
      employeeName: 'Sudha Kumari',
      designation: 'Contractual Employee',
      department: 'Department of Information Technology',
      payMatrix: 'L2 - Cell 2',
      monthlyGross: 50000,
      totalDeductions: 2008,
      netPayable: 47992,
      effectiveFrom: '01 Apr 2026',
      effectiveTo: null,
      status: 'LOCKED',
      createdOn: '25 Mar 2026',
      components: [
        {
          id: 101,
          code: 'CONSOLIDATED_PAY',
          name: 'Consolidated Honorarium',
          componentType: 'EARNING',
          calculationType: 'FIXED',
          rule: 'Fixed monthly amount',
          amount: 50000,
          isProrated: true,
          isTaxable: true
        },
        {
          id: 102,
          code: 'EPF_EMP',
          name: 'Employee EPF Contribution',
          componentType: 'DEDUCTION',
          calculationType: 'FORMULA',
          rule: 'MIN(CONSOLIDATED_PAY, 15000) × 12%',
          amount: 1800,
          isProrated: true,
          isTaxable: false
        },
        {
          id: 103,
          code: 'PT',
          name: 'Bihar Professional Tax',
          componentType: 'DEDUCTION',
          calculationType: 'FIXED',
          rule: 'Fixed statutory deduction',
          amount: 208,
          isProrated: false,
          isTaxable: false
        }
      ]
    };

    return of(header).pipe(delay(220));
  }
}
