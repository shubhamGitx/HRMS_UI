import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { phone } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** My Profile > Emergency Contact (VIEW) */
@Component({
  selector: 'app-emergency-contact',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="mp-layout">
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-person-lines-fill"></i> {{ 'Emergency Contacts' | translate }}</h3>
        </div>
        <div class="mp-card-body">
          <div class="mp-table-wrap">
            <table class="mp-table">
              <thead><tr><th>{{ 'Priority' | translate }}</th><th>{{ 'Name' | translate }}</th><th>{{ 'Relationship' | translate }}</th><th>{{ 'Mobile Number' | translate }}</th><th>{{ 'Address' | translate }}</th></tr></thead>
              <tbody>
                @for (e of contacts(); track $index) {
                  <tr>
                    <td><span class="mp-pill" [class.blue]="$first" [class.grey]="!$first">{{ ($first ? 'Primary' : 'Secondary') | translate }}</span></td>
                    <td style="font-weight:600">{{ e.name }}</td><td>{{ e.relation | translate }}</td><td>{{ phone(e.mobile) }}</td><td>{{ e.address }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" style="text-align:center; color:var(--pf-muted)">{{ 'No emergency contact added.' | translate }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <aside class="mp-col">
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-info-circle"></i> {{ 'Important Information' | translate }}</h3></div>
          <div class="mp-info"><i class="bi bi-telephone-forward-fill"></i><div>{{ 'The office calls the primary contact first if something happens to you on duty. Keep at least one number that is always reachable.' | translate }}</div></div>
        </section>
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-lightning-charge"></i> {{ 'Quick Actions' | translate }}</h3></div>
          <div class="mp-actions">
            <a class="mp-action" [routerLink]="['/dashboard', 'my-profile', 'contact-address']" queryParamsHandling="preserve"><span class="ic"><i class="bi bi-telephone"></i></span> {{ 'Contact & Address' | translate }}</a>
          </div>
        </section>
      </aside>
    </div>
  `,
})
export class EmergencyContactDetails {
  private readonly profile = inject(ProfileService);
  protected readonly contacts = computed(() => this.profile.data().emergency);
  protected readonly phone = phone;
}
