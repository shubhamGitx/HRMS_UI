import { Component, computed, inject } from '@angular/core';
import { ProfileService } from '../shared/profile.service';
import { formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** Do dates ke beech saal + mahine */
function span(from: string, to: string): { y: number; m: number } {
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  months = Math.max(0, months);
  return { y: Math.floor(months / 12), m: months % 12 };
}

/** My Profile > Experience (VIEW) */
@Component({
  selector: 'app-experience',
  imports: [TranslatePipe],
  template: `
    <div class="mp-stats">
      <div class="mp-stat"><span>{{ 'Previous Experience' | translate }}</span><b>{{ total().y }} {{ 'Years' | translate }} {{ total().m }} {{ 'Months' | translate }}</b></div>
      <div class="mp-stat"><span>{{ 'Service in this Organisation' | translate }}</span><b>{{ current().y }} {{ 'Years' | translate }} {{ current().m }} {{ 'Months' | translate }}</b></div>
      <div class="mp-stat"><span>{{ 'Organisations Worked' | translate }}</span><b>{{ d().experience.length + 1 }}</b></div>
    </div>

    <div class="mp-layout">
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-briefcase"></i> {{ 'Previous Work Experience' | translate }}</h3>
        </div>
        <div class="mp-card-body">
          <div class="mp-table-wrap">
            <table class="mp-table">
              <thead><tr><th>{{ 'Organisation' | translate }}</th><th>{{ 'Designation' | translate }}</th><th>{{ 'From' | translate }}</th><th>{{ 'To' | translate }}</th><th>{{ 'Duration' | translate }}</th><th>{{ 'Responsibilities' | translate }}</th></tr></thead>
              <tbody>
                @for (x of d().experience; track $index) {
                  <tr>
                    <td style="font-weight:600">{{ x.organisation }}</td><td>{{ x.designation }}</td>
                    <td style="white-space:nowrap">{{ fmt(x.from) }}</td><td style="white-space:nowrap">{{ fmt(x.to) }}</td>
                    <td style="white-space:nowrap">{{ dur(x.from, x.to) }}</td><td>{{ x.responsibilities || '-' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" style="text-align:center; color:var(--pf-muted)">{{ 'No previous experience added.' | translate }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="mp-card">
        <div class="mp-card-head"><h3><i class="bi bi-signpost-split"></i> {{ 'Career Timeline' | translate }}</h3></div>
        <ul class="mp-tl">
          <li><span class="dot green"></span><div class="mp-tl-row"><b>{{ emp.designation | translate }}</b><span class="mp-pill green">{{ 'Current' | translate }}</span></div><small>{{ emp.department | translate }}, since {{ fmt(emp.joiningDate) }}</small></li>
          @for (x of d().experience; track $index) {
            <li><span class="dot"></span><b>{{ x.designation }}</b><small>{{ x.organisation }}, {{ fmt(x.from) }} to {{ fmt(x.to) }}</small></li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class Experience {
  private readonly profile = inject(ProfileService);
  protected readonly d = computed(() => this.profile.data());
  protected readonly emp = this.profile.employment;
  protected readonly fmt = formatDate;

  protected readonly total = computed(() => {
    return this.d().experience.reduce(
      (acc, x) => {
        const s = span(x.from, x.to);
        const m = acc.m + s.m;
        return { y: acc.y + s.y + Math.floor(m / 12), m: m % 12 };
      },
      { y: 0, m: 0 },
    );
  });

  protected readonly current = computed(() => span(this.emp.joiningDate, ''));

  protected dur(from: string, to: string): string {
    const s = span(from, to);
    if (!s.y && !s.m) return '-';
    const parts: string[] = [];
    if (s.y) parts.push(`${s.y}y`);
    if (s.m) parts.push(`${s.m}m`);
    return parts.join(' ');
  }
}
