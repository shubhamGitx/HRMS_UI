import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../shared/profile.service';
import { ProfileAvatar } from '../employee-header/profile-avatar';
import { ageOf, formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

/** My Profile > Personal Information (VIEW) */
@Component({
  selector: 'app-personal-information',
  imports: [RouterLink, ProfileAvatar, TranslatePipe],
  templateUrl: './personal-information.html',
})
export class PersonalInformation implements OnInit {
  protected readonly profile = inject(ProfileService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  protected readonly d = computed(() => this.profile.data());
  protected readonly emp = this.profile.employment;
  protected readonly fmt = formatDate;
  protected readonly age = ageOf;
  protected readonly tab = signal<'personal' | 'address' | 'other'>('personal');

  protected readonly gender = computed(() =>
    this.profile.resolveGender(this.d().personal.genderId, this.d().personal.gender) || '-'
  );
  protected readonly bloodGroup = computed(() =>
    this.profile.resolveBloodGroup(null, this.d().personal.bloodGroup) || '-'
  );

  protected readonly aadhaarNumber = computed(() => {
    const direct = this.d().personal.aadhaarNumber;
    if (direct) return direct;
    const doc = this.d().identity?.find(i => i.type?.toLowerCase().includes('aadhaar'));
    return doc?.number || '234567890123';
  });

  protected readonly panNumber = computed(() => {
    const direct = this.d().personal.panNumber;
    if (direct) return direct;
    const doc = this.d().identity?.find(i => i.type?.toLowerCase().includes('pan'));
    return doc?.number || 'ABCDE1234F';
  });

  protected resolveState(val: string): string {
    return this.profile.resolveState(Number(val), val);
  }

  protected resolveDistrict(val: string): string {
    return this.profile.resolveDistrict(Number(val), val);
  }

  protected resolveQual(val: string): string {
    return this.profile.resolveQualification(Number(val), val);
  }

  ngOnInit(): void {
    this.profile.syncSessionUser();
  }

  
  protected readonly identityDocs = computed(() =>
    
    this.profile.documents().filter((x) => x.category === 'Identity'),
  );

  protected viewDoc(name: string): void {
    const empId = Number(this.authSession.user?.employeeId || 1);
    const docs = this.profile.documents();
    const doc = docs.find((d) => d.name.toLowerCase().includes(name.toLowerCase())) || docs[0];
    if (doc?.id) {
      this.employeeApi.downloadDocument(empId, doc.id).subscribe({
        next: (blob) => {
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');
          setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        },
        error: () => this.profile.showToast(`Failed to open ${name}.`, 'error')
      });
    } else {
      this.profile.showToast(`${name} preview will open once documents are uploaded.`);
    }
  }

  protected print(): void {
    window.print();
  }
}
