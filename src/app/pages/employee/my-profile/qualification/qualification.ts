import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

/** My Profile > Qualification (VIEW) */
@Component({
  selector: 'app-qualification',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="mp-layout">
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-mortarboard"></i> {{ 'Educational Qualifications' | translate }}</h3>
        </div>
        <div class="mp-card-body">
          <div class="mp-table-wrap">
            <table class="mp-table">
              <thead><tr><th>{{ 'Qualification' | translate }}</th><th>{{ 'Course / Stream' | translate }}</th><th>{{ 'Board / University' | translate }}</th><th>{{ 'Passing Year' | translate }}</th><th>{{ '% / CGPA' | translate }}</th><th>{{ 'Status' | translate }}</th><th></th></tr></thead>
              <tbody>
                @for (q of d().education; track $index) {
                  <tr>
                    <td style="font-weight:600">{{ resolveQual(q.qualification) }}</td><td>{{ q.course }}</td><td>{{ q.board }}</td><td>{{ q.year }}</td><td>{{ q.percentage }}</td>
                    <td><span class="mp-pill" [class.green]="q.status === 'Verified'" [class.amber]="q.status !== 'Verified'">{{ q.status | translate }}</span></td>
                    <td><button type="button" class="mp-icon-btn" (click)="view(resolveQual(q.qualification))" [attr.aria-label]="('View' | translate) + ' ' + resolveQual(q.qualification) + ' ' + ('Document' | translate)"><i class="bi bi-eye"></i></button></td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" style="text-align:center; color:var(--pf-muted)">{{ 'No qualification details found.' | translate }}</td></tr>
                }
              </tbody>
            </table>
          </div>

          <hr class="mp-divider" />
          <h4 class="mp-section-title"><i class="bi bi-stars"></i> {{ 'Skills' | translate }}</h4>
          <div class="pf-chips">
            @for (s of d().skills; track s) { <span class="pf-chip" style="padding-right:12px">{{ s }}</span> }
          </div>
        </div>
      </section>

      <aside class="mp-col">
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-award"></i> {{ 'Summary' | translate }}</h3></div>
          <div class="mp-summary-row" style="border-top:0"><i class="bi bi-mortarboard"></i><span>{{ 'Highest Qualification' | translate }}</span><b>{{ highest() }}</b></div>
          <div class="mp-summary-row"><i class="bi bi-list-ol"></i><span>{{ 'Qualifications Added' | translate }}</span><b>{{ d().education.length }}</b></div>
          <div class="mp-summary-row"><i class="bi bi-patch-check"></i><span>{{ 'Verified' | translate }}</span><b class="green">{{ verified() }} {{ 'of' | translate }} {{ d().education.length }}</b></div>
        </section>
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-lightning-charge"></i> {{ 'Quick Actions' | translate }}</h3></div>
          <div class="mp-actions">
            <a class="mp-action" [routerLink]="['/dashboard', 'my-profile', 'experience']" queryParamsHandling="preserve"><span class="ic"><i class="bi bi-briefcase"></i></span> {{ 'View Experience' | translate }}</a>
            <a class="mp-action" [routerLink]="['/dashboard', 'my-profile', 'documents']" queryParamsHandling="preserve"><span class="ic"><i class="bi bi-folder2-open"></i></span> {{ 'Qualification Documents' | translate }}</a>
          </div>
        </section>
      </aside>
    </div>
  `,
})
export class Qualification {
  private readonly profile = inject(ProfileService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  protected readonly d = computed(() => this.profile.data());
  protected readonly highest = computed(() => {
    const e = this.d().education;
    if (!e.length) return '-';
    const last = e[e.length - 1];
    return last.course || this.resolveQual(last.qualification);
  });
  protected readonly verified = computed(() => this.d().education.filter((q) => q.status === 'Verified').length);

  protected resolveQual(val: string): string {
    return this.profile.resolveQualification(Number(val), val);
  }

  protected view(name: string): void {
    const empId = Number(this.authSession.user?.employeeId || 1);
    const docs = this.profile.documents();
    let doc = docs.find((d) => d.category === 'Education' || d.name.toLowerCase().includes('degree') || d.name.toLowerCase().includes('qualification'));
    if (!doc && docs.length > 0) {
      doc = docs[0];
    }
    const docId = doc?.id || 3;
    this.employeeApi.downloadDocument(empId, docId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        this.profile.showToast(`Unable to open ${name} document.`, 'error');
      }
    });
  }
}
