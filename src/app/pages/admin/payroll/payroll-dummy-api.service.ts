import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type PayType = 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIB';
export type CalcType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';
export type SalaryStatus = 'PENDING' | 'DRAFT' | 'LOCKED';

export interface PayComponent {
  id: number;
  code: string;
  name: string;
  componentType: PayType;
  calcType: CalcType;
  calcPriority: number;
  formulaExpression: string;
  isProrated: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

export interface SalaryLine {
  componentId: number;
  fixedAmount?: number;
  percentage?: number;
  baseCode?: string;
  formulaExpression?: string;
  computedAmount: number;
}

export interface SalaryEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  designation: string;
  office: string;
  levelCode: string;
  cellNo: number;
  sanctionedAmount: number;
  contractStart: string;
  contractEnd: string;
  nextIncrementDate: string;
  status: SalaryStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  monthlyGross: number;
  totalDeductions: number;
  netPayable: number;
  components: SalaryLine[];
}

@Injectable({ providedIn: 'root' })
export class PayrollDummyApiService {
  readonly API_NAMES = {
    employees: 'GET /api/dummy/payroll/employees',
    payComponents: 'GET /api/dummy/payroll/pay-components',
    salary: 'GET/POST /api/dummy/payroll/salary-configuration'
  };

  readonly payComponents: PayComponent[] = [
    { id: 1, code: 'CONSOLIDATED_PAY', name: 'Consolidated Honorarium', componentType: 'EARNING', calcType: 'FIXED', calcPriority: 1, formulaExpression: '', isProrated: true, isTaxable: true, isActive: true },
    { id: 2, code: 'SPECIAL_ALLOW', name: 'Special / Technical Allowance', componentType: 'EARNING', calcType: 'PERCENTAGE', calcPriority: 2, formulaExpression: '', isProrated: true, isTaxable: true, isActive: true },
    { id: 3, code: 'EPF_EMP', name: 'Employee EPF Contribution', componentType: 'DEDUCTION', calcType: 'FORMULA', calcPriority: 10, formulaExpression: 'MIN(CONSOLIDATED_PAY, 15000) * 0.12', isProrated: true, isTaxable: false, isActive: true },
    { id: 4, code: 'ESIC_EMP', name: 'Employee ESIC Contribution', componentType: 'DEDUCTION', calcType: 'FORMULA', calcPriority: 11, formulaExpression: 'IF(CONSOLIDATED_PAY <= 21000, CONSOLIDATED_PAY * 0.0075, 0)', isProrated: true, isTaxable: false, isActive: true },
    { id: 5, code: 'PT', name: 'Bihar Professional Tax', componentType: 'DEDUCTION', calcType: 'FIXED', calcPriority: 12, formulaExpression: '', isProrated: false, isTaxable: false, isActive: true },
    { id: 6, code: 'ARREAR_PAY', name: 'Salary Arrears', componentType: 'EARNING', calcType: 'FIXED', calcPriority: 5, formulaExpression: '', isProrated: false, isTaxable: true, isActive: true },
    { id: 7, code: 'EPF_ER', name: 'Employer EPF Contribution', componentType: 'EMPLOYER_CONTRIB', calcType: 'FORMULA', calcPriority: 90, formulaExpression: 'MIN(CONSOLIDATED_PAY, 15000) * 0.13', isProrated: true, isTaxable: false, isActive: true }
  ];

  readonly employees: SalaryEmployee[] = [
    { employeeId: 1, employeeCode: 'DEPT-2024-019', fullName: 'Rajesh Kumar', designation: 'Programmer', office: 'Patna HQ', levelCode: 'L2', cellNo: 2, sanctionedAmount: 50000, contractStart: '2026-04-01', contractEnd: '2027-03-31', nextIncrementDate: '2027-04-01', status: 'DRAFT', effectiveFrom: '2026-04-01', effectiveTo: null, monthlyGross: 50000, totalDeductions: 2008, netPayable: 47992, components: [{ componentId: 1, fixedAmount: 50000, computedAmount: 50000 }, { componentId: 3, computedAmount: 1800 }, { componentId: 5, fixedAmount: 208, computedAmount: 208 }] },
    { employeeId: 2, employeeCode: 'DEPT-2025-042', fullName: 'Priya Kumari', designation: 'Data Entry Operator', office: 'Patna HQ', levelCode: 'L1', cellNo: 1, sanctionedAmount: 18500, contractStart: '2025-12-16', contractEnd: '2026-12-15', nextIncrementDate: '2026-12-16', status: 'PENDING', effectiveFrom: '', effectiveTo: null, monthlyGross: 0, totalDeductions: 0, netPayable: 0, components: [] },
    { employeeId: 3, employeeCode: 'DEPT-2026-088', fullName: 'Amit Verma', designation: 'IT Assistant', office: 'Patna HQ', levelCode: 'L1', cellNo: 2, sanctionedAmount: 19425, contractStart: '2026-04-01', contractEnd: '2027-03-31', nextIncrementDate: '2027-04-01', status: 'LOCKED', effectiveFrom: '2026-04-01', effectiveTo: null, monthlyGross: 19425, totalDeductions: 1939, netPayable: 17486, components: [{ componentId: 1, fixedAmount: 19425, computedAmount: 19425 }, { componentId: 3, computedAmount: 1800 }, { componentId: 5, fixedAmount: 139, computedAmount: 139 }] }
  ];

  getEmployees(): Observable<SalaryEmployee[]> { return of(this.employees); }
  getPayComponents(): Observable<PayComponent[]> { return of(this.payComponents); }
}
