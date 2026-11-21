import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { formatDate, maskAccount } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** My Profile > Bank Details (VIEW) */
@Component({
  selector: 'app-bank-details',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="mp-layout">
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-bank"></i> {{ 'Salary Account' | translate }}</h3>
        </div>
        <div class="mp-card-body">
          <div class="mp-emp" style="grid-template-columns:repeat(3, minmax(0,1fr)); margin-bottom:18px">
            <div class="mp-emp-item" style="border-left:0; padding-left:0"><i class="bi bi-bank2"></i><div><span>{{ 'Bank' | translate }}</span><strong>{{ b().bankName }}</strong><small>{{ b().branch }}</small></div></div>
            <div class="mp-emp-item"><i class="bi bi-credit-card-2-front"></i><div><span>{{ 'Account Number' | translate }}</span><strong>{{ mask(b().accountNumber) }}</strong><small>{{ b().accountType }} {{ 'Account' | translate }}</small></div></div>
            <div class="mp-emp-item"><i class="bi bi-patch-check"></i><div><span>{{ 'Verification' | translate }}</span><strong><span class="mp-pill" [class.green]="b().status === 'Verified'" [class.amber]="b().status !== 'Verified'">{{ b().status | translate }}</span></strong>@if (b().verifiedOn) { <small>on {{ fmt(b().verifiedOn) }}</small> }</div></div>
          </div>
          <div class="mp-kv-cols">
            <dl class="mp-kv lined">
              <dt>{{ 'Account Holder Name' | translate }}</dt><dd>{{ b().holder }}</dd>
              <dt>{{ 'Bank Name' | translate }}</dt><dd>{{ b().bankName }}</dd>
              <dt>{{ 'Branch' | translate }}</dt><dd>{{ b().branch }}</dd>
              <dt>{{ 'PF / UAN Number' | translate }}</dt><dd>{{ b().pfUanNumber || '101234567890' }}</dd>
            </dl>
            <dl class="mp-kv lined">
              <dt>{{ 'IFSC Code' | translate }}</dt><dd>{{ b().ifsc }}</dd>
              <dt>{{ 'Account Number' | translate }}</dt><dd>{{ mask(b().accountNumber) }}</dd>
              <dt>{{ 'Account Type' | translate }}</dt><dd>{{ b().accountType | translate }}</dd>
            </dl>
          </div>
        </div>
      </section>

      <aside class="mp-col">
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-info-circle"></i> {{ 'Important Information' | translate }}</h3></div>
          <div class="mp-info"><i class="bi bi-info-circle-fill"></i><div>{{ 'Salary is credited only to a verified account in your own name. A new account is verified by Accounts before the next payroll.' | translate }}</div></div>
        </section>
        <section class="mp-card">
          <div class="mp-card-head"><h3><i class="bi bi-lightning-charge"></i> {{ 'Quick Actions' | translate }}</h3></div>
          <div class="mp-actions">
            <a class="mp-action" [routerLink]="['/dashboard', 'payroll', 'payslips']" queryParamsHandling="preserve"><span class="ic"><i class="bi bi-file-earmark-text"></i></span> {{ 'View Payslips' | translate }}</a>
            <a class="mp-action" [routerLink]="['/dashboard', 'my-profile', 'documents']" queryParamsHandling="preserve"><span class="ic"><i class="bi bi-image"></i></span> {{ 'Cancelled Cheque' | translate }}</a>
          </div>
        </section>
      </aside>
    </div>
  `,
})
export class BankDetails {
  private readonly profile = inject(ProfileService);
  protected readonly b = computed(() => this.profile.data().bank);
  protected readonly fmt = formatDate;
  protected readonly mask = maskAccount;
}
