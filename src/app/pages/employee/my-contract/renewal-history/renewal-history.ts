import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractService } from '../shared/contract.service';
import { LanguageService } from '@core/i18n/language.service';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  selector: 'app-renewal-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './renewal-history.html',
  styleUrl: './renewal-history.css'
})
export class RenewalHistoryComponent {
  protected readonly contractService = inject(ContractService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  protected readonly historyList = this.contractService.renewalHistory;
  protected readonly workflowSteps = this.contractService.renewalWorkflow;
  protected readonly isLoading = this.contractService.isLoading;

  // Dynamic summary stats derived from history
  protected readonly totalRenewalsCount = computed(() => {
    return this.historyList().length;
  });

  protected readonly latestAppraisal = computed(() => {
    const list = this.historyList();
    return list.length > 0 ? list[0].performanceGrade : 'A+';
  });

  protected readonly totalMonths = computed(() => {
    return this.historyList().reduce((acc, curr) => acc + (curr.durationMonths || 12), 0);
  });

  downloadOrder(memoNo: string): void {
    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.downloadDocument(empId, 4).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sanction_Order_${memoNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        alert(`Failed to download sanction order for ${memoNo}.`);
      }
    });
  }
}
