import { Component, computed, inject } from '@angular/core';
import { ProfileService } from '../shared/profile.service';
import { ageOf, formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** My Profile > Nominee (VIEW) */
@Component({
  selector: 'app-nominee',
  imports: [TranslatePipe],
  template: `
    <div class="mp-layout">
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-people"></i> {{ 'Nominee Details' | translate }}</h3>
        </div>
        <div class="mp-card-body">
          <div class="mp-table-wrap">
            <table class="mp-table">
              <thead><tr><th>{{ 'Nominee Name' | translate }}</th><th>{{ 'Relationship' | translate }}</th><th>{{ 'Date of Birth' | translate }}</th><th>{{ 'Share' | translate }}</th><th>{{ 'Address' | translate }}</th></tr></thead>
              <tbody>
                @for (n of nominees(); track $index) {
                  <tr>
                    <td style="font-weight:600">{{ n.name }}</td>
                    <td>{{ n.relation | translate }}</td>
                    <td style="white-space:nowrap">{{ fmt(n.dob) }} @if (age(n.dob) < 18) { <span class="mp-pill amber">{{ 'Minor' | translate }}</span> }</td>
                    <td style="min-width:140px"><b>{{ n.share }}%</b><div class="mp-share"><div [style.width.%]="n.share"></div></div></td>
                    <td>{{ n.address }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" style="text-align:center; color:var(--pf-muted)">{{ 'No nominee added.' | translate }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside class="mp-col">
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-pie-chart"></i> {{ 'Share Distribution' | translate }}</h3></div>
          <div class="mp-card-body">
            @for (n of nominees(); track $index) {
              <div style="margin-bottom:12px; font-size:.84rem">
                <div style="display:flex; justify-content:space-between"><span>{{ n.name }} ({{ n.relation | translate }})</span><b>{{ n.share }}%</b></div>
                <div class="mp-share" style="margin-top:4px"><div [style.width.%]="n.share"></div></div>
              </div>
            }
            <div style="display:flex; justify-content:space-between; padding-top:10px; border-top:1px solid var(--pf-line); font-size:.86rem">
              <b>{{ 'Total' | translate }}</b><span class="mp-pill" [class.green]="total() === 100" [class.red]="total() !== 100">{{ total() }}%</span>
            </div>
          </div>
        </section>
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-info-circle"></i> {{ 'Important Information' | translate }}</h3></div>
          <div class="mp-info"><i class="bi bi-info-circle-fill"></i><div>{{ 'Pending salary, final settlement and other dues are paid to nominees in these shares. For a minor nominee, HR will ask for guardian details.' | translate }}</div></div>
        </section>
      </aside>
    </div>
  `,
})
export class NomineeDetails {
  private readonly profile = inject(ProfileService);
  protected readonly fmt = formatDate;
  protected readonly age = ageOf;
  protected readonly nominees = computed(() => this.profile.data().nominees);
  protected readonly total = computed(() => this.nominees().reduce((acc, n) => acc + (n.share || 0), 0));
}
