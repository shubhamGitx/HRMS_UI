import { Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { EmployeeHeader } from '../employee-header/employee-header';
import { PersonalInformation } from '../personal-information/personal-information';
import { ContactAddress } from '../contact-address/contact-address';
import { EmploymentDetails } from '../employment-details/employment-details';
import { Qualification } from '../qualification/qualification';
import { Experience } from '../experience/experience';
import { BankDetails } from '../bank-details/bank-details';
import { NomineeDetails } from '../nominee/nominee';
import { EmergencyContactDetails } from '../emergency-contact/emergency-contact';
import { ProfileDocuments } from '../documents/documents';
import { ProfileHistory } from '../history/history';
import { LanguageService } from '@core/i18n/language.service';

interface PageInfo {
  title: string;
  subtitle: string;
  icon: string;
}

/** Har page ka title, subtitle, icon */
const PAGES: Record<string, PageInfo> = {
  'personal-information': { title: 'Personal Information', subtitle: 'View your personal details', icon: 'bi-person-vcard' },
  'contact-address': { title: 'Contact and Address', subtitle: 'View and manage your contact details and addresses', icon: 'bi-person-lines-fill' },
  'employment-details': { title: 'Employment Details', subtitle: 'View and manage your employment information', icon: 'bi-briefcase' },
  qualification: { title: 'Qualification', subtitle: 'Your educational qualifications and skills', icon: 'bi-mortarboard' },
  experience: { title: 'Experience', subtitle: 'Your previous work experience', icon: 'bi-briefcase-fill' },
  'bank-details': { title: 'Bank Details', subtitle: 'Account where your remuneration is credited', icon: 'bi-bank' },
  nominee: { title: 'Nominee', subtitle: 'People who receive your dues', icon: 'bi-people' },
  'emergency-contact': { title: 'Emergency Contact', subtitle: 'People to contact in an emergency', icon: 'bi-telephone-forward' },
  documents: { title: 'Documents', subtitle: 'All documents uploaded in your profile', icon: 'bi-folder2-open' },
  history: { title: 'History', subtitle: 'Every change made to your profile', icon: 'bi-clock-history' },
};

/**
 * My Profile ka page (dashboard ke andar): /dashboard/my-profile/<page>
 * Upar breadcrumb + title, phir Employee Header, phir page.
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink, EmployeeHeader,
    PersonalInformation, ContactAddress, EmploymentDetails, Qualification, Experience,
    BankDetails, NomineeDetails, EmergencyContactDetails, ProfileDocuments, ProfileHistory,
  ],
  template: `
    <div class="pf mp">
      <nav class="mp-crumb mp-no-print" aria-label="Breadcrumb">
        <a [routerLink]="['/dashboard']" queryParamsHandling="preserve">{{ language.t('Home', 'Home') }}</a>
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
        <a [routerLink]="['/dashboard', 'my-profile', 'personal-information']" queryParamsHandling="preserve">{{ language.t('My Profile', 'My Profile') }}</a>
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
        <strong>{{ language.t(info().title) }}</strong>
      </nav>

      <div class="mp-title">
        <div class="mp-title-left">
          <span class="mp-title-icon"><i class="bi" [class]="info().icon"></i></span>
          <div>
            <h1>{{ language.t(info().title) }}</h1>
            <p>{{ language.t(info().subtitle) }}</p>
          </div>
        </div>
      </div>

      <app-employee-header />

      @switch (key()) {
        @case ('personal-information') { <app-personal-information /> }
        @case ('contact-address') { <app-contact-address /> }
        @case ('employment-details') { <app-employment-details /> }
        @case ('qualification') { <app-qualification /> }
        @case ('experience') { <app-experience /> }
        @case ('bank-details') { <app-bank-details /> }
        @case ('nominee') { <app-nominee /> }
        @case ('emergency-contact') { <app-emergency-contact /> }
        @case ('documents') { <app-profile-documents /> }
        @case ('history') { <app-profile-history /> }
      }

      @if (profile.toast(); as t) {
        <div class="mp-toast" [class.error]="t.type === 'error'" role="status" aria-live="polite">
          <i class="bi" [class.bi-check-circle]="t.type === 'success'" [class.bi-exclamation-circle]="t.type === 'error'" aria-hidden="true"></i>
          {{ t.text }}
          <button type="button" (click)="profile.toast.set(null)" aria-label="Close">✕</button>
        </div>
      }
    </div>
  `,
  styles: `
    .mp-toast {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; align-items: center; gap: 10px; max-width: min(440px, calc(100vw - 32px));
      padding: 12px 14px 12px 18px; border-radius: 8px; background: #0f172a; color: #fff; font-size: .88rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, .2);
    }
    .mp-toast > i { color: #4ade80; font-size: 1.05rem; }
    .mp-toast.error > i { color: #f87171; }
    .mp-toast button { background: none; border: 0; color: inherit; cursor: pointer; opacity: .8; }
  `,
})
export class ProfilePage implements OnInit {
  readonly page = input<string>('personal-information');
  protected readonly profile = inject(ProfileService);
  public readonly language = inject(LanguageService);

  ngOnInit(): void {
    this.profile.syncSessionUser();
  }

  protected readonly key = computed(() => {
    const p = this.page();
    return (p && p !== 'profile-entry' && PAGES[p]) ? p : 'personal-information';
  });
  protected readonly info = computed(() => PAGES[this.key()]);
}
