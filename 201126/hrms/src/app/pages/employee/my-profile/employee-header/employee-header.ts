import { Component, computed, inject } from '@angular/core';
import { ProfileService } from '../shared/profile.service';
import { ProfileAvatar } from './profile-avatar';
import { LanguageService } from '@core/i18n/language.service';

/**
 * Employee header card: photo, naam, code, department, designation,
 * employee type, reporting officer aur status.
 * My Profile ke har page ke upar yahi component lagta hai.
 */
@Component({
  selector: 'app-employee-header',
  imports: [ProfileAvatar],
  template: `
    <section class="mp-emp" aria-label="Employee summary">
      <div class="mp-emp-who">
        <div class="mp-photo"><app-profile-avatar [src]="data().photo" /></div>
        <div>
          <h2>{{ data().personal.fullName || language.t('Employee', 'Employee') }}</h2>
          <p>{{ language.t('Emp. Code', 'Emp. Code') }}: <b>{{ emp.employeeCode }}</b></p>
          <p>{{ language.t('Employee No.', 'Employee No.') }}: <b>{{ emp.employeeNo }}</b></p>
        </div>
      </div>
      <div class="mp-emp-item">
        <i class="bi bi-diagram-3" aria-hidden="true"></i>
        <div><span>{{ language.t('Department', 'Department') }}</span><strong>{{ language.t(emp.department) }}</strong></div>
      </div>
      <div class="mp-emp-item">
        <i class="bi bi-pencil-square" aria-hidden="true"></i>
        <div><span>{{ language.t('Designation', 'Designation') }}</span><strong>{{ language.t(emp.designation) }}</strong></div>
      </div>
      <div class="mp-emp-item">
        <i class="bi bi-calendar-check" aria-hidden="true"></i>
        <div><span>{{ language.t('Employee Type', 'Employee Type') }}</span><strong>{{ language.t(emp.employeeType) }}</strong></div>
      </div>
      <div class="mp-emp-item">
        <i class="bi bi-person-badge" aria-hidden="true"></i>
        <div><span>{{ language.t('Reporting Officer', 'Reporting Officer') }}</span><strong>{{ emp.reportingOfficer || language.t('Not Assigned', 'Not Assigned') }}</strong>@if (emp.reportingOfficerDesignation) { <small>({{ language.t(emp.reportingOfficerDesignation) }})</small> }</div>
      </div>
      <span class="mp-emp-status mp-pill green lg">{{ language.t(emp.status) }}</span>
    </section>
  `,
})
export class EmployeeHeader {
  private readonly profile = inject(ProfileService);
  public readonly language = inject(LanguageService);
  protected readonly data = computed(() => this.profile.data());
  protected readonly emp = this.profile.employment;
}
