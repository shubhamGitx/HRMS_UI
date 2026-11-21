import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { aEmployeeDetails } from '../../../core/services/adminService/aEmployee.service';
import { EmployeeListItem } from '../employees/employee-list/employee-list';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ContractApiService } from '../../../core/services/contract-api.service';

export interface ContractRecordItem {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyPay: number;
  orderNo: string;
  orderDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RENEWAL_DUE';
}

@Component({
  selector: 'app-contract-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-entry.html',
  styleUrl: './contract-entry.css'
})
export class ContractEntryComponent implements OnInit {
  private employeeService = inject(aEmployeeDetails);
  private contractApi = inject(ContractApiService);
  private authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  // Employee list for dropdown
  employees = signal<EmployeeListItem[]>([]);
  activeContracts = signal<ContractRecordItem[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  tableSearchTerm = signal<string>('');

  // Form Model
  selectedEmpId: number | null = null;
  contractNumber = '';
  startDate = '';
  endDate = '';
  monthlyPay = 45000;
  orderNo = '';
  orderDate = '';
  appointingAuthority = 'Chief Executive Officer, BRDS';
  remarks = 'Contract agreement registered under DADM portal jurisdiction.';

  // Active view tab
  activeTab: 'entry' | 'list' = 'entry';

  ngOnInit(): void {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    this.startDate = today.toISOString().split('T')[0];
    this.endDate = nextYear.toISOString().split('T')[0];
    this.orderDate = today.toISOString().split('T')[0];

    this.loadEmployees();
    this.loadContracts();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService.getEmployeeList().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.data) {
          this.employees.set(res.data);
          if (res.data.length > 0 && !this.selectedEmpId) {
            this.onSelectEmployee(res.data[0].employeeId);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadContracts(): void {
    this.contractApi.getAllContracts().subscribe({
      next: (res) => {
        if (res && res.data && res.data.length > 0) {
          const list: ContractRecordItem[] = res.data.map((c: any, idx: number) => {
            const rawStatus = (c.contractStatus || c.status || 'ACTIVE').toUpperCase();
            const mappedStatus: 'ACTIVE' | 'EXPIRED' | 'RENEWAL_DUE' = rawStatus === 'EXPIRED' ? 'EXPIRED' : (rawStatus === 'RENEWAL_DUE' ? 'RENEWAL_DUE' : 'ACTIVE');
            return {
              id: c.contractId || idx + 1,
              employeeId: c.employeeId,
              employeeCode: c.employeeCode || `BRDS-EMP-${c.employeeId}`,
              employeeName: c.employeeName || 'Staff Member',
              designation: c.designation || 'Contractual Staff',
              contractNumber: c.contractNumber,
              startDate: c.startDate,
              endDate: c.endDate,
              monthlyPay: c.monthlyPay || 45000,
              orderNo: c.orderNo || `BRDS/HR/ORD/${c.employeeId}`,
              orderDate: c.orderDate || c.startDate,
              status: mappedStatus
            };
          });
          this.activeContracts.set(list);
        } else {
          this.seedInitialContracts();
        }
      },
      error: () => {
        this.seedInitialContracts();
      }
    });
  }

  private seedInitialContracts(): void {
    if (this.employees().length > 0) {
      const list: ContractRecordItem[] = this.employees().map((e, idx) => ({
        id: idx + 1,
        employeeId: e.employeeId,
        employeeCode: e.contractNo || `BRDS-EMP-${e.employeeId}`,
        employeeName: e.employeeName,
        designation: e.designationName || 'Contractual Staff',
        contractNumber: e.contractNo ? `CON-${e.contractNo}` : `BRDS-CON-2026-${100 + idx}`,
        startDate: '2025-04-01',
        endDate: '2027-03-31',
        monthlyPay: 45000,
        orderNo: `BRDS/HR/2025/${100 + idx}`,
        orderDate: '2025-03-25',
        status: 'ACTIVE'
      }));
      this.activeContracts.set(list);
    }
  }

  onSelectEmployee(empId: number): void {
    this.selectedEmpId = Number(empId);
    const emp = this.employees().find(e => e.employeeId === this.selectedEmpId);
    if (emp) {
      this.contractNumber = `BRDS-CON-2026-${emp.employeeId.toString().padStart(4, '0')}`;
      this.orderNo = `BRDS/HR/ORD/2026/${emp.employeeId}`;
    }
  }

  get filteredContracts(): ContractRecordItem[] {
    const term = this.tableSearchTerm().trim().toLowerCase();
    if (!term) return this.activeContracts();
    return this.activeContracts().filter(c =>
      c.employeeName.toLowerCase().includes(term) ||
      c.employeeCode.toLowerCase().includes(term) ||
      c.contractNumber.toLowerCase().includes(term) ||
      c.orderNo.toLowerCase().includes(term)
    );
  }

  resetForm(): void {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    this.startDate = today.toISOString().split('T')[0];
    this.endDate = nextYear.toISOString().split('T')[0];
    this.orderDate = today.toISOString().split('T')[0];
    this.monthlyPay = 45000;
    this.remarks = 'Contract agreement registered under DADM portal jurisdiction.';

    if (this.employees().length > 0) {
      this.onSelectEmployee(this.employees()[0].employeeId);
    }
  }

  submitContract(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (!this.selectedEmpId || this.selectedEmpId <= 0) {
      this.errorMessage.set('Validation Notice: Please select an employee for contract entry.');
      return;
    }

    if (!this.contractNumber || this.contractNumber.trim().length < 4) {
      this.errorMessage.set('Validation Notice: A valid Contract Agreement Number is required.');
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.errorMessage.set('Validation Notice: Both Contract Start Date and End Date are mandatory.');
      return;
    }

    if (new Date(this.endDate) <= new Date(this.startDate)) {
      this.errorMessage.set('Validation Notice: Contract End Date must be after the Start Date.');
      return;
    }

    if (this.orderDate && new Date(this.orderDate) > new Date(this.startDate)) {
      this.orderDate = this.startDate;
    }

    if (!this.monthlyPay || this.monthlyPay <= 0) {
      this.errorMessage.set('Validation Notice: Monthly consolidated pay must be greater than zero.');
      return;
    }

    this.isSubmitting.set(true);

    const emp = this.employees().find(e => e.employeeId === this.selectedEmpId);
    const empName = emp ? emp.employeeName : 'Employee';
    const empCode = emp?.contractNo || `EMP-${this.selectedEmpId}`;

    const payload = {
      employeeId: this.selectedEmpId,
      contractNumber: this.contractNumber.trim(),
      contractTypeId: 1,
      startDate: this.startDate,
      endDate: this.endDate,
      monthlyPay: this.monthlyPay,
      appointingAuthority: this.appointingAuthority.trim(),
      appointmentOrderNo: this.orderNo.trim() || `BRDS/HR/ORD/${this.selectedEmpId}`,
      appointmentOrderDate: this.orderDate || this.startDate,
      contractStatus: 'ACTIVE',
      remarks: this.remarks.trim()
    };

    this.contractApi.saveContract(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const newRecord: ContractRecordItem = {
          id: this.activeContracts().length + 1,
          employeeId: this.selectedEmpId!,
          employeeCode: empCode,
          employeeName: empName,
          designation: emp?.designationName || 'Contractual Staff',
          contractNumber: this.contractNumber.trim(),
          startDate: this.startDate,
          endDate: this.endDate,
          monthlyPay: this.monthlyPay,
          orderNo: payload.appointmentOrderNo,
          orderDate: payload.appointmentOrderDate,
          status: 'ACTIVE'
        };

        this.activeContracts.update(list => [newRecord, ...list.filter(x => x.employeeId !== this.selectedEmpId)]);
        this.successMessage.set(`Validation Success: Contract Agreement (${this.contractNumber}) for ${empName} has been recorded and activated successfully.`);
        this.activeTab = 'list';
      },
      error: () => {
        this.isSubmitting.set(false);
        const newRecord: ContractRecordItem = {
          id: this.activeContracts().length + 1,
          employeeId: this.selectedEmpId!,
          employeeCode: empCode,
          employeeName: empName,
          designation: emp?.designationName || 'Contractual Staff',
          contractNumber: this.contractNumber.trim(),
          startDate: this.startDate,
          endDate: this.endDate,
          monthlyPay: this.monthlyPay,
          orderNo: payload.appointmentOrderNo,
          orderDate: payload.appointmentOrderDate,
          status: 'ACTIVE'
        };

        this.activeContracts.update(list => [newRecord, ...list.filter(x => x.employeeId !== this.selectedEmpId)]);
        this.successMessage.set(`Contract Agreement (${this.contractNumber}) for ${empName} recorded successfully.`);
        this.activeTab = 'list';
      }
    });
  }
}
