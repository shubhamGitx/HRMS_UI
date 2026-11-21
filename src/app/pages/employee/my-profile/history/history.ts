import { Component, computed, inject, signal } from '@angular/core';
import { ProfileService } from '../shared/profile.service';
import { formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** My Profile > History (VIEW) - profile me kab kya badla */
@Component({
  selector: 'app-profile-history',
  imports: [TranslatePipe],
  template: `
    <section class="mp-card">
      <div class="mp-card-head">
        <h3><i class="bi bi-clock-history"></i> {{ 'Profile Change History' | translate }}</h3>
        <span class="mp-pill blue">{{ rows().length }} {{ 'records' | translate }}</span>
      </div>
      <div class="mp-tabs" role="tablist">
        @for (f of filters; track f) {
          <button type="button" role="tab" class="mp-tab" [class.active]="filter() === f" (click)="filter.set(f)">{{ f | translate }}</button>
        }
      </div>
      <div class="mp-card-body">
        <div class="mp-table-wrap">
          <table class="mp-table">
            <thead><tr><th>{{ 'Date' | translate }}</th><th>{{ 'Section' | translate }}</th><th>{{ 'Change' | translate }}</th><th>{{ 'Done By' | translate }}</th><th>{{ 'Status' | translate }}</th></tr></thead>
            <tbody>
              @for (h of rows(); track $index) {
                <tr>
                  <td style="white-space:nowrap">{{ fmt(h.date) }}</td>
                  <td style="font-weight:600">{{ h.section | translate }}</td>
                  <td>{{ h.change | translate }}</td>
                  <td>{{ h.by | translate }}</td>
                  <td><span class="mp-pill" [class.green]="h.status === 'Approved'" [class.amber]="h.status === 'Pending'" [class.red]="h.status === 'Rejected'">{{ h.status | translate }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="5" style="text-align:center; color:var(--pf-muted)">{{ 'No records.' | translate }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class ProfileHistory {
  private readonly profile = inject(ProfileService);
  protected readonly fmt = formatDate;
  protected readonly filters = ['All', 'Approved', 'Pending', 'Rejected'];
  protected readonly filter = signal('All');
  protected readonly rows = computed(() =>
    this.filter() === 'All' ? this.profile.history() : this.profile.history().filter((h) => h.status === this.filter()),
  );
}
