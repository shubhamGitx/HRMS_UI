import { Component, inject, signal } from '@angular/core';
import { ProfileService } from '../shared/profile.service';
import { formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

type EmpTab = 'employment' | 'organization' | 'contract' | 'status' | 'reporting';

/** My Profile > Employment Details (VIEW, HR maintained) */
@Component({
  selector: 'app-employment-details',
  imports: [TranslatePipe],
  templateUrl: './employment-details.html',
})
export class EmploymentDetails {
  protected readonly profile = inject(ProfileService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  protected readonly e = this.profile.employment;
  protected readonly c = this.profile.contract;
  protected readonly fmt = formatDate;
  protected readonly tab = signal<EmpTab>('employment');

  protected readonly tabs: { key: EmpTab; label: string }[] = [
    { key: 'employment', label: 'Employment Details' },
    { key: 'organization', label: 'Organization History' },
    { key: 'contract', label: 'Contract Details' },
    { key: 'status', label: 'Status History' },
    { key: 'reporting', label: 'Reporting History' },
  ];

  protected openDoc(name: string): void {
    const empId = Number(this.authSession.user?.employeeId || 1);
    const docs = this.profile.documents();
    let targetDoc = docs.find((d) => d.category === 'Contract' || d.name.toLowerCase().includes('appointment') || d.name.toLowerCase().includes('contract'));
    if (!targetDoc && docs.length > 0) {
      targetDoc = docs[0];
    }
    const docId = targetDoc?.id || 4;
    this.employeeApi.downloadDocument(empId, docId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        if (name.toLowerCase().includes('download') || name.toLowerCase().includes('joining')) {
          const a = document.createElement('a');
          a.href = url;
          a.download = targetDoc?.fileName || `${name.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(url, '_blank');
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        this.profile.showToast(`Unable to open ${name}. Verify document is uploaded in database.`, 'error');
      }
    });
  }

  protected isDate(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
  }
}
