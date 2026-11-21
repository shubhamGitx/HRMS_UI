import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal,OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { aEmployeeDetails } from '../../../../core/services/adminService/aEmployee.service';
import { LanguageService } from '../../../../core/i18n/language.service';

export type StatusFilter = 'ALL' | 'DRAFT' | 'ACTIVE';

export interface EmployeeListItem {
  employeeId: number;
  contractNo?: string;
  employeeName: string;
  officialMobile?: string;
  designationName?: string;
  officeName?: string;
  reportingName?: string;
  reportingOfficerName?: string;
  completedSections: number;
  recordStatus: 'DRAFT' | 'ACTIVE' | string;
}

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})


export class EmployeeList implements OnInit{
  private router = inject(Router);
  private employeeService = inject(aEmployeeDetails);
  public readonly language = inject(LanguageService);
  ngOnInit(): void {
    this.loadEmployees();
  }

  // Data signals (Empty by default - no static data)
  employees = signal<EmployeeListItem[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Search & Filter state
  searchQuery = signal<string>('');
  selectedStatus = signal<StatusFilter>('ALL');

  // Stats computed from loaded employees
  totalCount = computed(() => this.employees().length);
  draftCount = computed(() => this.employees().filter(e => e.recordStatus === 'DRAFT').length);
  activeCount = computed(() => this.employees().filter(e => e.recordStatus === 'ACTIVE').length);

  // Filtered employees list based on search and status tab
  filteredEmployees = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.employees().filter(emp => {
      // Status filter tab
      if (status !== 'ALL' && emp.recordStatus !== status) {
        return false;
      }

      // Search query filter
      if (!q) return true;

      const code = emp.contractNo?.toLowerCase() ?? '';
      const name = emp.employeeName?.toLowerCase() ?? '';
      const mobile = emp.officialMobile?.toLowerCase() ?? '';
      const desig = emp.designationName?.toLowerCase() ?? '';
      const office = emp.officeName?.toLowerCase() ?? '';
      const ro = emp.reportingOfficerName?.toLowerCase() ?? '';

      return code.includes(q) ||
             name.includes(q) ||
             mobile.includes(q) ||
             desig.includes(q) ||
             office.includes(q) ||
             ro.includes(q);
    });
  });

  // UI Event Handlers (Logic placeholders ready for API integration)
 loadEmployees(): void {
  this.isLoading.set(true);
  this.errorMessage.set(null);

  this.employeeService.getEmployeeList().subscribe({
    next: (res) => {
      this.employees.set(res.data ?? []);
      this.isLoading.set(false);
    },
    error: (err) => {
      this.errorMessage.set(err.error?.message || 'Failed to load office employees.');
      this.isLoading.set(false);
    }
  });
}

  startNewRegistration(): void {
    this.router.navigate(['/dashboard', 'profile-entry']);
  }

  resumeRegistration(emp: EmployeeListItem): void {
    this.router.navigate(['/dashboard', 'profile-entry'], {
      queryParams: { employeeId: emp.employeeId, mode: 'resume' }
    });
  }

  editProfile(emp: EmployeeListItem): void {
    this.router.navigate(['/dashboard', 'profile-entry'], {
      queryParams: { employeeId: emp.employeeId, mode: 'edit' }
    });
  }

  setStatusFilter(status: StatusFilter): void {
    this.selectedStatus.set(status);
  }

  getProgressPercentage(sections?: number): number {
    return Math.min(100, Math.round(((sections || 0) / 5) * 100));
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
