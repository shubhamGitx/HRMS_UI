import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { phone } from '../shared/form-utils';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/** My Profile > Contact & Address (VIEW) */
@Component({
  selector: 'app-contact-address',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './contact-address.html',
})
export class ContactAddress implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly employeeApi = inject(EmployeeApiService);
  protected readonly profile = inject(ProfileService);
  protected readonly d = computed(() => this.profile.data());
  protected readonly phone = phone;

  protected resolveState(val: string): string {
    return this.profile.resolveState(Number(val), val);
  }

  protected resolveDistrict(val: string): string {
    return this.profile.resolveDistrict(Number(val), val);
  }

  ngOnInit(): void {
    this.profile.syncSessionUser();
    this.addressDetails();
  }



private addressDetails(): void {
  const user = this.authSession.user;
  const employeeId = user?.employeeId;

  if (!employeeId) {
    console.error('Employee ID not found in session.');
    return;
  }

  this.employeeApi.getAddressDetails(employeeId).subscribe({
    next: res => {
      if (!res || !res.success || !res.data) {
        return;
      }
     
      const result = res.data;
      const contactAddress = result.contactAddress;

      if (!contactAddress) {
        return;
      }

      const addresses = contactAddress.addresses || [];

      const present = addresses.find(
        a => a.addressType === 'PRESENT'
      );

      const permanent = addresses.find(
        a => a.addressType === 'PERMANENT'
      );

      this.profile.data.update(d => ({
        ...d,

        contact: {
          ...d.contact,
          officialEmail:
            contactAddress.officialEmail || d.contact.officialEmail,
          mobile:
            contactAddress.officialMobile || d.contact.mobile,
          alternateMobile:
            (present && present.alternateMobile) ||
            d.contact.alternateMobile
        },

        presentAddress: present ? {
          ...d.presentAddress,
          line1: present.addressLine1 || '',
          line2: present.addressLine2 || '',
          city: present.cityName || '',
          district: this.profile.resolveDistrict(present.districtId, present.districtName),
          state: this.profile.resolveState(present.stateId, present.stateName),
          pincode: present.pincode || ''
        } : d.presentAddress,

        permanentAddress: permanent ? {
          ...d.permanentAddress,
          line1: permanent.addressLine1 || '',
          line2: permanent.addressLine2 || '',
          city: permanent.cityName || '',
          district: this.profile.resolveDistrict(permanent.districtId, permanent.districtName),
          state: this.profile.resolveState(permanent.stateId, permanent.stateName),
          pincode: permanent.pincode || ''
        } : d.permanentAddress
      }));

      console.log('Address details loaded:', contactAddress);
    },

    error: err => {
      console.error('Address details API failed:', err);
    }
  });
}


  protected readonly contacts = computed(() => {
    const c = this.d().contact;
    return [
      { icon: 'bi-phone', type: 'Mobile Number', value: phone(c.mobile), primary: true },
      { icon: 'bi-phone', type: 'Alternate Mobile', value: phone(c.alternateMobile), primary: false },
      { icon: 'bi-envelope', type: 'Official Email', value: c.officialEmail || '-', primary: true },
      { icon: 'bi-envelope', type: 'Personal Email', value: c.personalEmail || '-', primary: false },
      { icon: 'bi-telephone', type: 'Landline Number', value: c.landline || '-', primary: false },
    ];
  });
}
