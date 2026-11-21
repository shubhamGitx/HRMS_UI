import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { 
  LeaveService, 
  ManagerPendingLeaveDto, 
  ManagerLeaveHistoryDto, 
  ManagerLeaveStatsDto, 
  SubordinateLeaveRegisterDto 
} from '../../../../core/services/leaveService/leave.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pending-leaves.html',
  styleUrl: './pending-leaves.css'
})
export class PendingLeavesComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private authSession = inject(AuthSessionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public readonly language = inject(LanguageService);

  readonly action = input<string>('pending-applications');

  pendingLeaves = signal<ManagerPendingLeaveDto[]>([]);
  leaveHistory = signal<ManagerLeaveHistoryDto[]>([]);
  leaveStats = signal<ManagerLeaveStatsDto | null>(null);
  subordinateRegister = signal<SubordinateLeaveRegisterDto[]>([]);

  isLoading = signal<boolean>(false);
  isLoadingHistory = signal<boolean>(false);
  isLoadingReports = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  searchTerm = signal<string>('');
  historySearchTerm = signal<string>('');
  historyStatusFilter = signal<string>('ALL');
  activeTab = signal<string>('pending-applications');

  // Rejection Modal State
  selectedLeaveForReject = signal<ManagerPendingLeaveDto | null>(null);
  rejectForm!: FormGroup;

  constructor() {
    effect(() => {
      const act = this.action();
      if (act) {
        this.activeTab.set(act);
      }
    });
  }

  get officialId(): number {
    return this.authSession.user?.officialId || 1;
  }

  // Filtered pending leaves according to search box
  filteredLeaves = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.pendingLeaves();
    if (!term) return list;
    return list.filter(item =>
      (item.empName && item.empName.toLowerCase().includes(term)) ||
      (item.contractNo && item.contractNo.toLowerCase().includes(term)) ||
      (item.designationName && item.designationName.toLowerCase().includes(term)) ||
      (item.leaveTypeCode && item.leaveTypeCode.toLowerCase().includes(term)) ||
      (item.officeName && item.officeName.toLowerCase().includes(term))
    );
  });

  // Filtered leave history
  filteredHistory = computed(() => {
    const term = this.historySearchTerm().toLowerCase().trim();
    const status = this.historyStatusFilter();
    let list = this.leaveHistory();

    if (status !== 'ALL') {
      list = list.filter(item => item.leaveStatus === status);
    }

    if (!term) return list;
    return list.filter(item =>
      (item.empName && item.empName.toLowerCase().includes(term)) ||
      (item.contractNo && item.contractNo.toLowerCase().includes(term)) ||
      (item.designationName && item.designationName.toLowerCase().includes(term)) ||
      (item.leaveTypeCode && item.leaveTypeCode.toLowerCase().includes(term)) ||
      (item.reason && item.reason.toLowerCase().includes(term)) ||
      (item.rejectionReason && item.rejectionReason.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    if (this.action()) {
      this.activeTab.set(this.action());
    }

    this.rejectForm = this.fb.group({
      rejectionReason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]]
    });

    this.loadAllData();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.router.navigate(['/dashboard', 'leave', tab], { queryParamsHandling: 'preserve' });
    if (tab === 'leave-history-ro' && this.leaveHistory().length === 0) {
      this.loadLeaveHistory();
    } else if (tab === 'leave-reports' && this.subordinateRegister().length === 0) {
      this.loadSubordinateRegister();
    }
  }

  loadAllData(): void {
    this.loadPendingLeaves();
    this.loadLeaveStats();
    this.loadLeaveHistory();
    this.loadSubordinateRegister();
  }

  loadPendingLeaves(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.leaveService.getPendingApplications(this.officialId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.pendingLeaves.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load pending leave applications.');
      }
    });
  }

  loadLeaveStats(): void {
    this.leaveService.getManagerLeaveStats(this.officialId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.leaveStats.set(res.data);
        }
      },
      error: () => {}
    });
  }

  loadLeaveHistory(): void {
    this.isLoadingHistory.set(true);
    this.leaveService.getManagerLeaveHistory(this.officialId, this.historyStatusFilter()).subscribe({
      next: (res) => {
        this.isLoadingHistory.set(false);
        if (res.success && res.data) {
          this.leaveHistory.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingHistory.set(false);
        console.error('Failed to load leave history', err);
      }
    });
  }

  loadSubordinateRegister(): void {
    this.isLoadingReports.set(true);
    this.leaveService.getManagerSubordinateRegister(this.officialId).subscribe({
      next: (res) => {
        this.isLoadingReports.set(false);
        if (res.success && res.data) {
          this.subordinateRegister.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingReports.set(false);
        console.error('Failed to load leave register', err);
      }
    });
  }

  onFilterStatusChange(status: string): void {
    this.historyStatusFilter.set(status);
    this.loadLeaveHistory();
  }

  approveLeave(leave: ManagerPendingLeaveDto): void {
    if (!confirm(`Are you sure you want to approve ${leave.totalDays} day(s) ${leave.leaveTypeCode} for ${leave.empName}?`)) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.leaveService.actionLeave({
      leaveId: leave.leaveId,
      action: 'APPROVE'
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.successMessage.set(`Leave for ${leave.empName} approved successfully.`);
          this.loadPendingLeaves();
          this.loadLeaveStats();
          this.loadLeaveHistory();
          this.loadSubordinateRegister();
        } else {
          this.errorMessage.set(res.message);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to approve leave.');
      }
    });
  }

  openRejectModal(leave: ManagerPendingLeaveDto): void {
    this.selectedLeaveForReject.set(leave);
    this.rejectForm.reset();
  }

  closeRejectModal(): void {
    this.selectedLeaveForReject.set(null);
  }

  submitReject(): void {
    const leave = this.selectedLeaveForReject();
    if (!leave) return;

    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const reason = this.rejectForm.value.rejectionReason.trim();

    this.leaveService.actionLeave({
      leaveId: leave.leaveId,
      action: 'REJECT',
      rejectionReason: reason
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.closeRejectModal();
          this.successMessage.set(`Leave for ${leave.empName} rejected with recorded reason.`);
          this.loadPendingLeaves();
          this.loadLeaveStats();
          this.loadLeaveHistory();
          this.loadSubordinateRegister();
        } else {
          this.errorMessage.set(res.message);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reject leave.');
      }
    });
  }

  cancelSubordinateLeave(historyItem: ManagerLeaveHistoryDto): void {
    if (!confirm(`Are you sure you want to cancel the approved leave for ${historyItem.empName} (${historyItem.totalDays} days)? The deducted leave balance will be restored.`)) {
      return;
    }

    const remarks = prompt('Please enter cancellation reason:', 'Cancelled by authorized official') || 'Cancelled by authorized official';

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.leaveService.actionLeave({
      leaveId: historyItem.leaveId,
      action: 'CANCEL',
      cancellationReason: remarks
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.successMessage.set(`Leave for ${historyItem.empName} cancelled and balance restored.`);
          this.loadPendingLeaves();
          this.loadLeaveStats();
          this.loadLeaveHistory();
          this.loadSubordinateRegister();
        } else {
          this.errorMessage.set(res.message);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to cancel leave application.');
      }
    });
  }

  exportRegisterCsv(): void {
    const list = this.subordinateRegister();
    if (!list || list.length === 0) {
      alert('No subordinate records available to export.');
      return;
    }

    let csvContent = 'Staff Name,Contract Number,Designation,Office,Casual Leave (CL),Earned Leave (EL),Privilege Leave (PL),Sick Leave (SL),Total Days Availed\n';
    for (const r of list) {
      const name = `"${r.empName.replace(/"/g, '""')}"`;
      const contract = `"${r.contractNo}"`;
      const desig = `"${r.designationName.replace(/"/g, '""')}"`;
      const office = `"${r.officeName.replace(/"/g, '""')}"`;
      csvContent += `${name},${contract},${desig},${office},${r.clDays},${r.elDays},${r.plDays},${r.slDays},${r.totalDays}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Subordinates_Leave_Register_FY26-27_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
