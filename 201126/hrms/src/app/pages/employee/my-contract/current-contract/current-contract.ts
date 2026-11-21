import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractService } from '../shared/contract.service';
import { LanguageService } from '@core/i18n/language.service';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  selector: 'app-current-contract',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './current-contract.html',
  styleUrl: './current-contract.css',
})
export class CurrentContractComponent implements OnInit {
  protected readonly contractService = inject(ContractService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);
  protected readonly contract = this.contractService.currentContract;
  protected readonly isLoading = this.contractService.isLoading;

  // Active accordion section for terms & conditions
  activeTermId: string | null = 'tc-1';

  ngOnInit(): void {
    const user = this.authSession.user;
    const empId = user?.employeeId || (user?.userId && !isNaN(Number(user.userId)) ? Number(user.userId) : (user?.userRole === 'Employee' ? 1 : undefined));
    this.contractService.fetchContractDataFromApi(empId);
  }

  get elapsedPercentage(): number {
    const c = this.contract();
    if (!c || !c.totalDays || c.totalDays <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((c.passedDays / c.totalDays) * 100)));
  }

  get remainingPercentage(): number {
    return Math.max(0, 100 - this.elapsedPercentage);
  }

  get isExpiringSoon(): boolean {
    const days = this.contract().remainingDays;
    return days > 0 && days <= 60;
  }

  get isExpired(): boolean {
    return this.contract().remainingDays <= 0;
  }

  get tenureStatusText(): string {
    if (this.isExpired) return 'Contract Term Expired';
    if (this.isExpiringSoon) return 'Renewal Window (Expiring Soon)';
    return 'Active Contract Tenure';
  }

  get tenureStatusClass(): string {
    if (this.isExpired) return 'status-expired';
    if (this.isExpiringSoon) return 'status-warning';
    return 'status-healthy';
  }

  toggleTerm(id: string): void {
    if (this.activeTermId === id) {
      this.activeTermId = null;
    } else {
      this.activeTermId = id;
    }
  }

  downloadContractPdf(): void {
    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.downloadDocument(empId, 4).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const memoSafe = (this.contract().sanctionOrderNo || 'Active').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = 'Contract_Order_' + memoSafe + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        alert('Unable to download contract PDF at this time.');
      }
    });
  }

  printContract(): void {
    window.print();
  }
}
