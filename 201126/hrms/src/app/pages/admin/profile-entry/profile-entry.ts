import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { aEmployeeDetails } from '../../../core/services/adminService/aEmployee.service';
import { ApiResponse } from '../../../core/auth/auth.models';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { transliterateHindiName } from '../../../core/i18n/hindi-transliteration';
import { BulkUpload } from './bulk-upload/bulk-upload';
import {
  ageAboveValidator,
  indianMobileValidator,
  identityDocumentValidator,
  personNameValidator,
  ifscCodeValidator,
  bankAccountNumberValidator,
  indianPincodeValidator,
  joiningDateValidator,
  pastDateValidator,
  passingYearValidator,
  VALIDATION_PATTERNS
} from '../../../shared/validators/custom-validators';
import {
  AddressItemRequest,
  BankDetailsRequest,
  ContactAddressRequest,
  EmergencyContactItemRequest,
  EmployeeMasters,
  EmployeeSaveResult,
  ExperienceItemRequest,
  MasterOption,
  NomineeEmergencyRequest,
  NomineeItemRequest,
  PersonalDetailsRequest,
  QualificationExperienceRequest,
  QualificationItemRequest,
  ReportingOfficerOption
} from './profile-entry.models';

export type ProfileTab = 'personal' | 'contact' | 'qualification' | 'bank' | 'nominee' | 'review';

export interface FinalActivationResult {
  employeeId: number;
  contractNo: string;
  username: string;
  message: string;
}

export interface IncompleteDraft {
  employeeId: number;
  contractNo: string;
  employeeName: string;
  completedSections: number;
}

@Component({
  selector: 'app-profile-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BulkUpload],
  templateUrl: './profile-entry.html',
  styleUrl: './profile-entry.css',
})
export class ProfileEntry implements OnInit {
  isHindiManual = false;
  step2Submitted = false;
  step3Submitted = false;
  step4Submitted = false;
  step5Submitted = false;
  private fb = inject(FormBuilder);
  private employeeService = inject(aEmployeeDetails);
  private authSession = inject(AuthSessionService);
  private route = inject(ActivatedRoute);
  public readonly language = inject(LanguageService);

  // Mode Selection: Single vs Bulk Upload
  mode = signal<'single' | 'bulk'>('single');
  chooserOpen = signal<boolean>(false);
  pick = signal<'single' | 'bulk'>('single');

  // In-Progress Draft Detection & Resume
  activeDraft = signal<IncompleteDraft | null>(null);
  draftDismissed = signal<boolean>(false);

  // Active Wizard Tab
  activeTab = signal<ProfileTab>('personal');

  // Employee Identity State (Populated on Step 1 save)
  employeeId = signal<number | null>(null);
  contractNo = signal<string | null>(null);
  recordStatus = signal<string>('DRAFT');

  // Loading & Feedback States
  isLoadingMasters = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  finalResult = signal<FinalActivationResult | null>(null);

  // Validation Tracking State
  step1Submitted = false;

  get todayStr(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  get idNumberPlaceholder(): string {
    const docType = this.personalForm?.get('idName')?.value;
    switch (docType) {
      case 'Aadhaar Card':
        return 'e.g. 1234 5678 9012';
      case 'PAN Card':
        return 'e.g. ABCDE1234F';
      case 'Driving Licence':
        return 'e.g. BR-0120190001234';
      case 'Passport':
        return 'e.g. A1234567';
      case 'Voter ID Card':
      case 'Voter ID':
        return 'e.g. ABC1234567';
      default:
        return 'Enter identity document number';
    }
  }

  get idNumberMaxLength(): number {
    const docType = this.personalForm?.get('idName')?.value;
    switch (docType) {
      case 'Aadhaar Card':
        return 12;
      case 'PAN Card':
        return 10;
      case 'Passport':
        return 8;
      case 'Voter ID Card':
      case 'Voter ID':
        return 10;
      case 'Driving Licence':
        return 20;
      default:
        return 30;
    }
  }

  // Completed steps tracking
  completedSteps = signal<Record<ProfileTab, boolean>>({
    personal: false,
    contact: false,
    qualification: false,
    bank: false,
    nominee: false,
    review: false
  });

  // Computed Progress
  completedSectionsCount = computed(() => {
    const s = this.completedSteps();
    return (s.personal ? 1 : 0) + (s.contact ? 1 : 0) + (s.qualification ? 1 : 0) + (s.bank ? 1 : 0) + (s.nominee ? 1 : 0);
  });

  progressPercent = computed(() => {
    return Math.round((this.completedSectionsCount() / 5) * 100);
  });

  // Dynamic Master Data Dropdowns (loaded via GET /api/employee/masters)
  genders = signal<MasterOption[]>([]);
  bloodGroups = signal<MasterOption[]>([]);
  categories = signal<MasterOption[]>([]);
  employmentStatuses = signal<MasterOption[]>([]);
  employeeTypes = signal<MasterOption[]>([]);
  offices = signal<MasterOption[]>([]);
  designations = signal<MasterOption[]>([]);
  idTypes = signal<MasterOption[]>([]);
  states = signal<MasterOption[]>([]);
  districts = signal<MasterOption[]>([]);
  qualificationsList = signal<MasterOption[]>([]);
  banks = signal<MasterOption[]>([]);
  reportingOfficers = signal<ReportingOfficerOption[]>([]);

  // Photo Preview State
  photoPreview = signal<string | null>(null);
  photoError = signal<string | null>(null);

  // Reactive Forms for all 5 Steps
  personalForm!: FormGroup;
  contactForm!: FormGroup;
  qualificationForm!: FormGroup;
  bankForm!: FormGroup;
  nomineeForm!: FormGroup;

  titles = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Shri', 'Smt.'];
  relations = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
  accountTypes = ['SAVINGS', 'SALARY', 'CURRENT'];

  tabs: Array<{ id: ProfileTab; label: string; icon: string }> = [
    { id: 'personal', label: '1. Personal Details', icon: 'bi-person-vcard-fill' },
    { id: 'contact', label: '2. Contact & Address', icon: 'bi-geo-alt-fill' },
    { id: 'qualification', label: '3. Qualification & Exp.', icon: 'bi-mortarboard-fill' },
    { id: 'bank', label: '4. Bank & PF Details', icon: 'bi-bank2' },
    { id: 'nominee', label: '5. Nominee & Emergency', icon: 'bi-people-fill' },
    { id: 'review', label: '6. Review & Activate', icon: 'bi-patch-check-fill' }
  ];

  get educationArray(): FormArray {
    return this.qualificationForm.get('education') as FormArray;
  }

  get experienceArray(): FormArray {
    return this.qualificationForm.get('experience') as FormArray;
  }

  get nomineesArray(): FormArray {
    return this.nomineeForm.get('nominees') as FormArray;
  }

  get emergencyArray(): FormArray {
    return this.nomineeForm.get('emergency') as FormArray;
  }

  get totalNomineeShare(): number {
    const list = this.nomineesArray?.value as Array<{ share?: number | string }>;
    if (!list || !list.length) return 0;
    return list.reduce((sum, item) => sum + (Number(item?.share) || 0), 0);
  }

  ngOnInit(): void {
    this.initAllForms();
    this.loadMasters();
    this.listenForRouteParams();
  }

  // ----------------------- Route Param & Draft Loader -----------------------
  private listenForRouteParams(): void {
    this.route.queryParams.subscribe(params => {
      const empIdParam = params['employeeId'] || params['id'];
      const mode = params['mode'];
      const tabParam = params['tab'];
      let targetEmpId: number | null = null;
      if (empIdParam && !isNaN(Number(empIdParam))) {
        targetEmpId = Number(empIdParam);
      } else if (this.authSession.user?.employeeId && !isNaN(Number(this.authSession.user.employeeId))) {
        targetEmpId = Number(this.authSession.user.employeeId);
      }

      if (targetEmpId && targetEmpId > 0) {
        this.loadDraftProfile(targetEmpId, mode, tabParam);
        return;
      }
      this.checkForPendingDrafts();
    });
  }

  loadDraftProfile(empId: number, mode?: string, targetTab?: string): void {
    this.isLoadingMasters.set(true);
    this.draftDismissed.set(true);

    this.employeeService.getFullProfile(empId).subscribe({
      next: (res) => {
        this.isLoadingMasters.set(false);
        const profile = res.data;
        if (!profile) return;

        this.employeeId.set(profile.employeeId);
        this.contractNo.set(profile.contractNo);
        this.recordStatus.set(profile.recordStatus || 'DRAFT');

        // Reset completed steps tracking before loading actual saved data
        this.completedSteps.set({
          personal: false,
          contact: false,
          qualification: false,
          bank: false,
          nominee: false,
          review: false
        });

        // Step 1: Personal Details
        if (profile.personalDetails && (profile.personalDetails.employeeName || profile.personalDetails.fatherName)) {
          const p = profile.personalDetails;
          let title = 'Shri';
          let cleanName = p.employeeName || '';
          const match = cleanName.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Shri|Smt\.)\s*(.*)$/i);
          if (match) {
            title = match[1];
            cleanName = match[2];
          }

          this.personalForm.patchValue({
            title: title || 'Shri',
            fullName: cleanName,
            fullNameHindi: p.employeeNameHindi || '',
            dob: p.dateOfBirth ? String(p.dateOfBirth).split('T')[0] : '',
            genderId: p.genderId,
            bloodGroupId: p.bloodGroupId,
            fatherName: p.fatherName || '',
            motherName: p.motherName || '',
            categoryId: p.categoryId,
            joiningDate: p.joiningDate ? String(p.joiningDate).split('T')[0] : '',
            employmentStatusId: p.employmentStatusId,
            employeeTypeId: p.employeeTypeId,
            officeId: this.authSession.user?.officeId || p.officeId,
            designationId: p.designationId,
            reportingOfficialId: p.reportingOfficialId,
            idName: p.idName || 'Aadhaar Card',
            idNumber: p.idNumber || '',
            officialEmail: p.officialEmail || '',
            officialMobile: p.officialMobile || ''
          });
          const hasPersonalRequired = !!(
            p.employeeName &&
            p.fatherName &&
            p.dateOfBirth &&
            p.genderId &&
            p.categoryId &&
            p.joiningDate &&
            p.idNumber &&
            p.officialMobile
          );
          if (hasPersonalRequired) {
            this.completedSteps.update(s => ({ ...s, personal: true }));
          }
        }

        // Step 2: Contact & Address
        const ca = profile.contactAddress;
        const currentAddr = ca?.addresses?.find(a => a.addressType === 'CURRENT');
        const permAddr = ca?.addresses?.find(a => a.addressType === 'PERMANENT');
        const hasContactData = !!(ca && ca.addresses && ca.addresses.length > 0 && (currentAddr?.addressLine1 || permAddr?.addressLine1));

        if (hasContactData) {
          if (currentAddr) {
            this.contactForm.get('present')?.patchValue({
              line1: currentAddr.addressLine1 || '',
              line2: currentAddr.addressLine2 || '',
              landmark: currentAddr.landmark || '',
              stateId: currentAddr.stateId,
              districtId: currentAddr.districtId,
              city: currentAddr.cityName || '',
              pincode: currentAddr.pincode || ''
            });
          }

          if (permAddr) {
            this.contactForm.get('permanent')?.patchValue({
              line1: permAddr.addressLine1 || '',
              line2: permAddr.addressLine2 || '',
              landmark: permAddr.landmark || '',
              stateId: permAddr.stateId,
              districtId: permAddr.districtId,
              city: permAddr.cityName || '',
              pincode: permAddr.pincode || ''
            });
          }

          const isSame = !!(currentAddr && permAddr && currentAddr.addressLine1 === permAddr.addressLine1);
          this.contactForm.patchValue({
            officialEmail: ca.officialEmail || '',
            officialMobile: ca.officialMobile || '',
            alternateMobile: currentAddr?.alternateMobile || permAddr?.alternateMobile || '',
            sameAsPresent: isSame
          });

          if (isSame) {
            this.contactForm.get('permanent')?.disable();
          } else {
            this.contactForm.get('permanent')?.enable();
          }

          this.completedSteps.update(s => ({ ...s, contact: true }));
        } else {
          // Pre-populate official contact info from Step 1 if available
          if (profile.personalDetails) {
            this.contactForm.patchValue({
              officialEmail: profile.personalDetails.officialEmail || '',
              officialMobile: profile.personalDetails.officialMobile || ''
            });
          }
          this.contactForm.get('permanent')?.disable();
        }

        // Step 3: Qualification & Experience
        const qe = profile.qualificationExperience;
        const hasQualifications = !!(qe && qe.qualifications && qe.qualifications.length > 0 && qe.qualifications.some(q => q.institutionName?.trim()));

        if (hasQualifications) {
          this.educationArray.clear();
          qe.qualifications.forEach(q => {
            this.educationArray.push(this.fb.group({
              qualificationId: [q.qualificationId || 1, Validators.required],
              institution: [q.institutionName || '', Validators.required],
              year: [q.passingYear ? String(q.passingYear) : '', [Validators.required, Validators.pattern('^[12][0-9]{3}$')]],
              roll: [q.rollNumber || ''],
              percentage: [q.marksPercentage || '', [Validators.required, Validators.min(1), Validators.max(100)]],
              grade: [q.grade || ''],
              isHighest: [!!q.isHighestQualification]
            }));
          });

          if (qe.experiences && qe.experiences.length > 0) {
            this.experienceArray.clear();
            qe.experiences.forEach(e => {
              this.experienceArray.push(this.fb.group({
                organisation: [e.organisation || ''],
                designation: [e.designation || ''],
                from: [e.fromDate ? String(e.fromDate).split('T')[0] : ''],
                to: [e.toDate ? String(e.toDate).split('T')[0] : ''],
                responsibilities: [e.responsibilities || '']
              }));
            });
          }
          this.completedSteps.update(s => ({ ...s, qualification: true }));
        }

        // Step 4: Bank Details
        const b = profile.bankDetails;
        const hasBank = !!(b && (b.accountNumber?.trim() || b.bankId));

        if (hasBank) {
          this.bankForm.patchValue({
            bankId: b.bankId,
            branch: b.branchName || '',
            holder: b.accountHolderName || '',
            accountNumber: b.accountNumber || '',
            confirmAccount: b.accountNumber || '',
            ifsc: b.ifscCode || '',
            accountType: b.accountType || 'SAVINGS',
            declaration: true
          });
          this.completedSteps.update(s => ({ ...s, bank: true }));
        }

        // Step 5: Nominee & Emergency Contacts
        const ne = profile.nomineeEmergency;
        const hasNominees = !!(ne && ne.nominees && ne.nominees.length > 0 && ne.nominees.some(n => n.nomineeName?.trim()));
        const hasEmergency = !!(ne && ne.emergencyContacts && ne.emergencyContacts.length > 0 && ne.emergencyContacts.some(e => e.contactName?.trim()));

        if (hasNominees || hasEmergency) {
          if (hasNominees) {
            this.nomineesArray.clear();
            ne.nominees.forEach(n => {
              this.nomineesArray.push(this.fb.group({
                name: [n.nomineeName || '', Validators.required],
                relation: [n.relationship || '', Validators.required],
                share: [n.sharePercentage || 100, [Validators.required, Validators.min(1), Validators.max(100)]],
                dob: [n.dateOfBirth ? String(n.dateOfBirth).split('T')[0] : ''],
                address: [n.address || '', Validators.required]
              }));
            });
          }

          if (hasEmergency) {
            this.emergencyArray.clear();
            ne.emergencyContacts.forEach(e => {
              this.emergencyArray.push(this.fb.group({
                name: [e.contactName || '', Validators.required],
                relation: [e.relationship || '', Validators.required],
                mobile: [e.mobile || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
                address: [e.address || '']
              }));
            });
          }
          this.completedSteps.update(s => ({ ...s, nominee: true }));
        }

        // Auto-navigate to first incomplete tab
        const s = this.completedSteps();
        const allStepsDone = s.personal && s.contact && s.qualification && s.bank && s.nominee;
        this.completedSteps.update(curr => ({ ...curr, review: allStepsDone }));

        if (targetTab && ['personal', 'contact', 'qualification', 'bank', 'nominee', 'review'].includes(targetTab)) {
          this.activeTab.set(targetTab as ProfileTab);
        } else if (mode === 'edit') {
          this.activeTab.set('personal');
        } else {
          if (!s.personal) this.activeTab.set('personal');
          else if (!s.contact) this.activeTab.set('contact');
          else if (!s.qualification) this.activeTab.set('qualification');
          else if (!s.bank) this.activeTab.set('bank');
          else if (!s.nominee) this.activeTab.set('nominee');
          else this.activeTab.set('personal');
        }

        this.successMessage.set(`Loaded draft profile for ${profile.contractNo}! Continuing registration.`);
      },
      error: (err) => {
        this.isLoadingMasters.set(false);
        this.errorMessage.set(err.error?.message || `Failed to load draft employee #${empId}.`);
      }
    });
  }

  // ----------------------- Mode Chooser Controls -----------------------
  openChooser(): void {
    this.pick.set(this.mode());
    this.chooserOpen.set(true);
  }

  closeChooser(): void {
    this.chooserOpen.set(false);
  }

  confirmChoice(): void {
    this.mode.set(this.pick());
    this.chooserOpen.set(false);
  }

  // ----------------------- Pending Draft Detection -----------------------
  checkForPendingDrafts(): void {
    if (typeof localStorage === 'undefined') return;
    const storedDraft = localStorage.getItem('hrms_last_draft');
    if (storedDraft) {
      try {
        this.activeDraft.set(JSON.parse(storedDraft));
        return;
      } catch {}
    }
  }

  resumeDraft(empId: number): void {
    this.loadDraftProfile(empId);
  }

  dismissDraftBanner(): void {
    this.draftDismissed.set(true);
  }

  canAccessTab(targetTab: ProfileTab): boolean {
    if (targetTab === 'personal') {
      return true;
    }

    const stepsOrder: ProfileTab[] = ['personal', 'contact', 'qualification', 'bank', 'nominee', 'review'];
    const targetIndex = stepsOrder.indexOf(targetTab);
    if (targetIndex === -1) return false;

    // Strict sequential wizard rule:
    // A step can only be accessed if all preceding steps have been completed and saved.
    const completed = this.completedSteps();
    for (let i = 0; i < targetIndex; i++) {
      const prevStep = stepsOrder[i];
      if (!completed[prevStep]) {
        return false;
      }
    }

    return true;
  }

  getFirstIncompleteStepBefore(targetTab: ProfileTab): ProfileTab | null {
    const stepsOrder: ProfileTab[] = ['personal', 'contact', 'qualification', 'bank', 'nominee', 'review'];
    const targetIndex = stepsOrder.indexOf(targetTab);
    if (targetIndex <= 0) return null;

    const completed = this.completedSteps();
    for (let i = 0; i < targetIndex; i++) {
      const prev = stepsOrder[i];
      if (!completed[prev]) {
        return prev;
      }
    }
    return null;
  }

  getFirstIncompleteStep(): ProfileTab | null {
    const stepsOrder: ProfileTab[] = ['personal', 'contact', 'qualification', 'bank', 'nominee'];
    const completed = this.completedSteps();
    for (const step of stepsOrder) {
      if (!completed[step]) return step;
    }
    return null;
  }

  getTabLabel(tab: ProfileTab): string {
    const found = this.tabs.find(t => t.id === tab);
    return found ? this.language.t(found.label) : tab;
  }

  setTab(tab: ProfileTab): void {
    if (tab === this.activeTab()) return;

    if (!this.canAccessTab(tab)) {
      const missing = this.getFirstIncompleteStepBefore(tab);
      if (missing) {
        const missingLabel = this.getTabLabel(missing);
        const targetLabel = this.getTabLabel(tab);
        this.errorMessage.set(
          `Please complete "${missingLabel}" before proceeding to "${targetLabel}".`
        );
      } else {
        this.errorMessage.set('Please complete previous sections in order before proceeding.');
      }
      return;
    }

    this.activeTab.set(tab);
    this.clearMessages();
  }

  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private initAllForms(): void {
    this.personalForm = this.fb.group({
      title: ['Shri', Validators.required],
      fullName: ['', [Validators.required, personNameValidator(3)]],
      fullNameHindi: [''],
      dob: ['', [Validators.required, ageAboveValidator(18)]],
      genderId: [null, Validators.required],
      bloodGroupId: [null],
      categoryId: [null, Validators.required],
      fatherName: ['', [Validators.required, personNameValidator(3)]],
      motherName: ['', [personNameValidator(2)]],
      spouseName: ['', [personNameValidator(2)]],
      joiningDate: ['', [Validators.required, joiningDateValidator(() => this.personalForm?.get('dob')?.value)]],
      employmentStatusId: [null, Validators.required],
      employeeTypeId: [null, Validators.required],
      officeId: [this.authSession.user?.officeId || null],
      designationId: [null, Validators.required],
      reportingOfficialId: [null],
      idName: ['Aadhaar Card', Validators.required],
      idNumber: ['', [Validators.required, identityDocumentValidator(() => this.personalForm?.get('idName')?.value)]],
      officialEmail: ['', [Validators.email]],
      officialMobile: ['', [Validators.required, indianMobileValidator(true)]]
    });

    // Real-time automatic transliteration from English Full Name to Hindi Full Name
    this.personalForm.get('fullName')?.valueChanges.subscribe((name: string) => {
      const trimmed = (name || '').trim();
      if (!trimmed) {
        this.isHindiManual = false;
        this.personalForm.get('fullNameHindi')?.setValue('', { emitEvent: false });
      } else if (!this.isHindiManual) {
        const hindiName = transliterateHindiName(name);
        this.personalForm.get('fullNameHindi')?.setValue(hindiName, { emitEvent: false });
      }
    });

    // Revalidate joining date whenever DOB changes
    this.personalForm.get('dob')?.valueChanges.subscribe(() => {
      this.personalForm.get('joiningDate')?.updateValueAndValidity();
    });

    // Revalidate idNumber immediately whenever idName (document type) changes
    this.personalForm.get('idName')?.valueChanges.subscribe((type: string) => {
      const numCtrl = this.personalForm.get('idNumber');
      if (numCtrl) {
        const val = numCtrl.value;
        if (val && typeof val === 'string') {
          if (['PAN Card', 'Passport', 'Voter ID Card', 'Voter ID', 'Driving Licence'].includes(type)) {
            numCtrl.setValue(val.toUpperCase(), { emitEvent: false });
          }
        }
        numCtrl.updateValueAndValidity();
      }
    });

    this.contactForm = this.fb.group({
      officialEmail: ['', [Validators.email]],
      officialMobile: ['', [indianMobileValidator(false)]],
      alternateMobile: ['', [indianMobileValidator(false)]],
      sameAsPresent: [true],
      present: this.fb.group({
        line1: ['', [Validators.required, Validators.maxLength(250)]],
        line2: [''],
        landmark: [''],
        stateId: [null, Validators.required],
        districtId: [null, Validators.required],
        city: ['', [Validators.required, Validators.maxLength(100), Validators.pattern('^[a-zA-Z\\s.-]+$')]],
        pincode: ['', [Validators.required, indianPincodeValidator()]]
      }),
      permanent: this.fb.group({
        line1: ['', [Validators.required, Validators.maxLength(250)]],
        line2: [''],
        landmark: [''],
        stateId: [null, Validators.required],
        districtId: [null, Validators.required],
        city: ['', [Validators.required, Validators.maxLength(100), Validators.pattern('^[a-zA-Z\\s.-]+$')]],
        pincode: ['', [Validators.required, indianPincodeValidator()]]
      })
    });

    // Disable permanent address group initially since sameAsPresent is true
    this.contactForm.get('permanent')?.disable();

    this.contactForm.get('sameAsPresent')?.valueChanges.subscribe(same => {
      if (same) {
        this.contactForm.get('permanent')?.patchValue(this.contactForm.get('present')?.getRawValue());
        this.contactForm.get('permanent')?.disable();
      } else {
        this.contactForm.get('permanent')?.enable();
      }
    });

    // Cascading state -> district selection for Present Address
    this.contactForm.get('present.stateId')?.valueChanges.subscribe(stateId => {
      const filtered = this.getFilteredDistricts(stateId);
      const currentDistId = this.contactForm.get('present.districtId')?.value;
      if (filtered.length > 0 && !filtered.some(d => d.id === currentDistId)) {
        this.contactForm.get('present.districtId')?.setValue(filtered[0].id);
      }
    });

    // Cascading state -> district selection for Permanent Address
    this.contactForm.get('permanent.stateId')?.valueChanges.subscribe(stateId => {
      const filtered = this.getFilteredDistricts(stateId);
      const currentDistId = this.contactForm.get('permanent.districtId')?.value;
      if (filtered.length > 0 && !filtered.some(d => d.id === currentDistId)) {
        this.contactForm.get('permanent.districtId')?.setValue(filtered[0].id);
      }
    });

    this.qualificationForm = this.fb.group({
      education: this.fb.array([]),
      experience: this.fb.array([])
    });
    this.addEducation();
    this.addExperience();

    this.bankForm = this.fb.group({
      bankId: [null, Validators.required],
      holder: ['', [Validators.required, personNameValidator(3)]],
      branch: ['', [Validators.required, Validators.maxLength(150)]],
      ifsc: ['', [Validators.required, ifscCodeValidator()]],
      accountNumber: ['', [Validators.required, bankAccountNumberValidator()]],
      confirmAccount: ['', [Validators.required, bankAccountNumberValidator()]],
      accountType: ['SAVINGS', Validators.required],
      declaration: [false, Validators.requiredTrue]
    }, { validators: this.matchAccounts });

    this.nomineeForm = this.fb.group({
      nominees: this.fb.array([]),
      emergency: this.fb.array([])
    });
    this.addNominee();
    this.addEmergency();
  }

  addEducation(): void {
    const group = this.fb.group({
      qualificationId: [1, Validators.required],
      institution: ['', Validators.required],
      year: ['', [Validators.required, passingYearValidator(() => this.personalForm?.get('dob')?.value)]],
      roll: [''],
      percentage: ['', [Validators.required, Validators.min(1), Validators.max(100)]],
      grade: [''],
      isHighest: [false]
    });
    this.educationArray.push(group);
  }

  removeEducation(index: number): void {
    if (this.educationArray.length > 1) {
      this.educationArray.removeAt(index);
    }
  }

  addExperience(): void {
    const group = this.fb.group({
      organisation: [''],
      designation: [''],
      from: ['', [pastDateValidator()]],
      to: ['', [pastDateValidator()]],
      responsibilities: ['']
    });
    this.experienceArray.push(group);
  }

  removeExperience(index: number): void {
    if (this.experienceArray.length > 1) {
      this.experienceArray.removeAt(index);
    }
  }

  addNominee(): void {
    const remainingShare = Math.max(0, 100 - this.totalNomineeShare);
    const group = this.fb.group({
      name: ['', [Validators.required, personNameValidator(3)]],
      relation: ['Spouse', Validators.required],
      dob: [''],
      share: [remainingShare || 100, [Validators.required, Validators.min(1), Validators.max(100)]],
      address: ['', Validators.required]
    });
    this.nomineesArray.push(group);
  }

  removeNominee(index: number): void {
    if (this.nomineesArray.length > 1) {
      this.nomineesArray.removeAt(index);
    }
  }

  addEmergency(): void {
    const group = this.fb.group({
      name: ['', [Validators.required, personNameValidator(3)]],
      relation: ['Father', Validators.required],
      mobile: ['', [Validators.required, indianMobileValidator(true)]],
      address: ['', Validators.required]
    });
    this.emergencyArray.push(group);
  }

  removeEmergency(index: number): void {
    if (this.emergencyArray.length > 1) {
      this.emergencyArray.removeAt(index);
    }
  }

  loadMasters(): void {
    this.isLoadingMasters.set(true);
    this.employeeService.getMasters().subscribe({
      next: (masters: EmployeeMasters) => {
        this.isLoadingMasters.set(false);
        if (masters) {
          this.genders.set(masters.genders ?? []);
          this.bloodGroups.set(masters.bloodGroups ?? []);
          this.categories.set(masters.categories ?? []);
          this.employmentStatuses.set(masters.employmentStatuses ?? []);
          this.employeeTypes.set(masters.employeeTypes ?? []);
          this.offices.set(masters.offices ?? []);
          this.designations.set(masters.designations ?? []);
          this.idTypes.set(masters.idTypes ?? []);
          this.states.set(masters.states ?? []);
          this.districts.set(masters.districts ?? []);
          this.qualificationsList.set(masters.qualifications ?? []);
          this.banks.set(masters.banks ?? []);
          this.reportingOfficers.set(masters.reportingOfficers ?? []);
          this.applyDefaultSelections();
        }
      },
      error: (err: any) => {
        this.isLoadingMasters.set(false);
        this.loadFallbackMasters();
      }
    });
  }

  private applyDefaultSelections(): void {
    if (this.genders().length && this.personalForm.get('genderId')?.value == null) {
      this.personalForm.patchValue({ genderId: this.genders()[0].id });
    }
    if (this.categories().length && this.personalForm.get('categoryId')?.value == null) {
      this.personalForm.patchValue({ categoryId: this.categories()[0].id });
    }
    if (this.employmentStatuses().length && this.personalForm.get('employmentStatusId')?.value == null) {
      this.personalForm.patchValue({ employmentStatusId: this.employmentStatuses()[0].id });
    }
    if (this.employeeTypes().length && this.personalForm.get('employeeTypeId')?.value == null) {
      this.personalForm.patchValue({ employeeTypeId: this.employeeTypes()[0].id });
    }
    const userOfficeId = this.authSession.user?.officeId;
    if (this.personalForm.get('officeId')?.value == null) {
      if (userOfficeId) {
        this.personalForm.patchValue({ officeId: userOfficeId });
      } else if (this.offices().length) {
        this.personalForm.patchValue({ officeId: this.offices()[0].id });
      }
    }
    if (this.designations().length && this.personalForm.get('designationId')?.value == null) {
      this.personalForm.patchValue({ designationId: this.designations()[0].id });
    }

    if (this.states().length) {
      const stateId = this.states()[0].id;
      if (this.contactForm.get('present.stateId')?.value == null) {
        this.contactForm.get('present.stateId')?.setValue(stateId);
      }
      if (this.contactForm.get('permanent.stateId')?.value == null) {
        this.contactForm.get('permanent.stateId')?.setValue(stateId);
      }
    }
    if (this.districts().length) {
      const distId = this.districts()[0].id;
      if (this.contactForm.get('present.districtId')?.value == null) {
        this.contactForm.get('present.districtId')?.setValue(distId);
      }
      if (this.contactForm.get('permanent.districtId')?.value == null) {
        this.contactForm.get('permanent.districtId')?.setValue(distId);
      }
    }
    if (this.banks().length && this.bankForm.get('bankId')?.value == null) {
      this.bankForm.patchValue({ bankId: this.banks()[0].id });
    }
  }

  getFilteredDistricts(stateId: number | string | null | undefined): MasterOption[] {
    if (!stateId) return this.districts();
    const sId = String(stateId);
    return this.districts().filter(d => !d.code || d.code === sId);
  }

  private scrollToFirstInvalidField(): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const invalidControl = document.querySelector('.ng-invalid:not(form)');
      if (invalidControl) {
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (invalidControl instanceof HTMLElement) {
          invalidControl.focus();
        }
      }
    }, 100);
  }

  private getInvalidPersonalFields(): string[] {
    const invalid: string[] = [];
    const nameMap: Record<string, string> = {
      title: 'Title',
      fullName: 'Full Name (in English)',
      fullNameHindi: 'Full Name (in Hindi)',
      dob: 'Date of Birth (must be 18+ years)',
      genderId: 'Gender',
      bloodGroupId: 'Blood Group',
      categoryId: 'Social Category',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      spouseName: 'Spouse Name',
      joiningDate: 'Date of Joining (must be 18+ years after DOB)',
      employmentStatusId: 'Employment Status',
      employeeTypeId: 'Employee Type',
      designationId: 'Designation / Role',
      reportingOfficialId: 'Reporting Officer',
      idName: 'Identity Document Type',
      idNumber: 'Identity Document Number',
      officialMobile: 'Official Mobile Number (10 digits starting with 6-9)',
      officialEmail: 'Official Email'
    };

    Object.keys(this.personalForm.controls).forEach(key => {
      const ctrl = this.personalForm.get(key);
      if (ctrl && ctrl.invalid && ctrl.enabled) {
        invalid.push(nameMap[key] || key);
      }
    });
    return invalid;
  }

  // ----------------------- Step 1 -----------------------
  saveStep1(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.clearMessages();
    this.step1Submitted = true;

    // Explicitly revalidate critical controls before proceeding
    this.personalForm.get('dob')?.updateValueAndValidity();
    this.personalForm.get('idName')?.updateValueAndValidity();
    this.personalForm.get('idNumber')?.updateValueAndValidity();
    this.personalForm.get('officialMobile')?.updateValueAndValidity();
    this.personalForm.get('joiningDate')?.updateValueAndValidity();

    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      const invalidFields = this.getInvalidPersonalFields();
      this.errorMessage.set(
        invalidFields.length > 0
          ? `Please fill all mandatory personal details: ${invalidFields.join(', ')}.`
          : 'Please fill all mandatory personal details before proceeding.'
      );
      this.scrollToFirstInvalidField();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.personalForm.value;
    const userOffice = this.authSession.user?.officeId;
    const officeToSave = userOffice ? Number(userOffice) : Number(formVal.officeId || 1);

    const payload: PersonalDetailsRequest = {
      employeeId: this.employeeId(),
      contractNo: this.contractNo(),
      employeeName: `${formVal.title} ${formVal.fullName}`.trim(),
      employeeNameHindi: formVal.fullNameHindi?.trim() || null,
      dateOfBirth: formVal.dob || null,
      genderId: Number(formVal.genderId),
      bloodGroupId: formVal.bloodGroupId ? Number(formVal.bloodGroupId) : null,
      fatherName: formVal.fatherName?.trim() || null,
      motherName: formVal.motherName?.trim() || null,
      categoryId: Number(formVal.categoryId),
      joiningDate: formVal.joiningDate || null,
      employmentStatusId: Number(formVal.employmentStatusId),
      employeeTypeId: Number(formVal.employeeTypeId),
      officeId: officeToSave,
      designationId: Number(formVal.designationId),
      reportingOfficialId: formVal.reportingOfficialId ? Number(formVal.reportingOfficialId) : null,
      idName: formVal.idName || null,
      idNumber: formVal.idNumber?.trim() || null,
      officialEmail: formVal.officialEmail?.trim() || null,
      officialMobile: formVal.officialMobile?.trim() || null,
      photo: this.photoPreview()
    };

    this.employeeService.savePersonalDetails(payload).subscribe({
      next: (response: ApiResponse<EmployeeSaveResult>) => {
        this.isSubmitting.set(false);
        const result = response.data;
        if (result && (result.success || result.employeeId)) {
          const empId = result.employeeId || this.employeeId()!;
          const contract = result.contractNo || this.contractNo();
          this.employeeId.set(empId);
          if (contract) this.contractNo.set(contract);
          this.completedSteps.update(s => ({ ...s, personal: true }));
          this.successMessage.set(`Step 1 Saved! Employee ID: ${empId}` + (contract ? ` | Contract No: ${contract}` : ''));

          // Cache draft for resume
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hrms_last_draft', JSON.stringify({
              employeeId: empId,
              contractNo: contract,
              employeeName: payload.employeeName,
              completedSections: 1
            }));
          }

          this.contactForm.patchValue({
            officialMobile: formVal.officialMobile,
            officialEmail: formVal.officialEmail
          });

          this.bankForm.patchValue({
            holder: `${formVal.title} ${formVal.fullName}`.trim()
          });

          this.activeTab.set('contact');
        } else {
          this.completedSteps.update(s => ({ ...s, personal: true }));
          this.successMessage.set(response.message || 'Personal Details saved successfully!');
          this.activeTab.set('contact');
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to save personal details.');
      }
    });
  }

  // ----------------------- Step 2 -----------------------
  saveStep2(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.clearMessages();
    this.step2Submitted = true;
    if (!this.employeeId()) {
      this.errorMessage.set('Please save Personal Details first.');
      return;
    }

    const isSame = !!this.contactForm.get('sameAsPresent')?.value;
    if (isSame) {
      this.contactForm.get('permanent')?.patchValue(this.contactForm.get('present')?.getRawValue());
      this.contactForm.get('permanent')?.disable();
    } else {
      this.contactForm.get('permanent')?.enable();
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      const invalidFields = this.getInvalidContactFields();
      this.errorMessage.set(
        invalidFields.length > 0
          ? `Please fill all mandatory fields: ${invalidFields.join(', ')}.`
          : 'Please fill all mandatory address and contact fields.'
      );
      this.scrollToFirstInvalidField();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.contactForm.getRawValue();
    const pres = v.present;
    const perm = v.sameAsPresent ? pres : v.permanent;

    const payload: ContactAddressRequest = {
      employeeId: this.employeeId()!,
      officialEmail: v.officialEmail || null,
      officialMobile: v.officialMobile || null,
      addresses: [
        {
          addressType: 'CURRENT',
          addressLine1: pres.line1.trim(),
          addressLine2: pres.line2?.trim() || null,
          landmark: pres.landmark?.trim() || null,
          stateId: Number(pres.stateId),
          districtId: Number(pres.districtId),
          cityName: pres.city.trim(),
          pincode: pres.pincode.trim(),
          alternateMobile: v.alternateMobile?.trim() || null
        },
        {
          addressType: 'PERMANENT',
          addressLine1: perm.line1.trim(),
          addressLine2: perm.line2?.trim() || null,
          landmark: perm.landmark?.trim() || null,
          stateId: Number(perm.stateId),
          districtId: Number(perm.districtId),
          cityName: perm.city.trim(),
          pincode: perm.pincode.trim(),
          alternateMobile: v.alternateMobile?.trim() || null
        }
      ]
    };

    this.employeeService.saveContactAddress(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.completedSteps.update(s => ({ ...s, contact: true }));
        this.successMessage.set('Step 2 Saved! Contact & Address saved successfully.');
        this.activeTab.set('qualification');
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to save contact details.');
      }
    });
  }

  private getInvalidContactFields(): string[] {
    const invalid: string[] = [];
    const nameMap: Record<string, string> = {
      'present.line1': 'Present Address Line 1',
      'present.stateId': 'Present State',
      'present.districtId': 'Present District',
      'present.city': 'Present City / Town / Block',
      'present.pincode': 'Present Pincode (6 digits)',
      'permanent.line1': 'Permanent Address Line 1',
      'permanent.stateId': 'Permanent State',
      'permanent.districtId': 'Permanent District',
      'permanent.city': 'Permanent City / Town',
      'permanent.pincode': 'Permanent Pincode (6 digits)',
      'alternateMobile': 'Alternate Mobile (10 digits)'
    };

    const check = (group: FormGroup, prefix = '') => {
      Object.keys(group.controls).forEach(key => {
        const ctrl = group.get(key);
        if (ctrl instanceof FormGroup) {
          if (ctrl.enabled) {
            check(ctrl, `${prefix}${key}.`);
          }
        } else if (ctrl && ctrl.invalid && ctrl.enabled) {
          const path = `${prefix}${key}`;
          invalid.push(nameMap[path] || path);
        }
      });
    };

    check(this.contactForm);
    return invalid;
  }

  // ----------------------- Step 3 -----------------------
  saveStep3(): void {
    this.clearMessages();
    this.step3Submitted = true;
    if (!this.employeeId()) {
      this.errorMessage.set('Please save Personal Details first.');
      return;
    }
    if (this.qualificationForm.invalid) {
      this.qualificationForm.markAllAsTouched();
      this.errorMessage.set('Please verify all educational qualification records.');
      this.scrollToFirstInvalidField();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.qualificationForm.getRawValue();

    const payload: QualificationExperienceRequest = {
      employeeId: this.employeeId()!,
      qualifications: v.education.map((e: any) => ({
        qualificationId: Number(e.qualificationId) || 1,
        institutionName: e.institution.trim(),
        passingYear: e.year ? Number(e.year) : null,
        rollNumber: e.roll?.trim() || null,
        marksPercentage: e.percentage ? Number(e.percentage) : null,
        grade: e.grade?.trim() || null,
        isHighestQualification: !!e.isHighest
      })),
      experiences: v.experience
        .filter((exp: any) => exp.organisation?.trim() && exp.designation?.trim())
        .map((exp: any) => ({
          organisation: exp.organisation.trim(),
          designation: exp.designation.trim(),
          fromDate: exp.from || null,
          toDate: exp.to || null,
          responsibilities: exp.responsibilities?.trim() || null
        }))
    };

    this.employeeService.saveQualificationExperience(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.completedSteps.update(s => ({ ...s, qualification: true }));
        this.successMessage.set('Step 3 Saved! Qualification & Experience saved successfully.');
        this.activeTab.set('bank');
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to save qualifications.');
      }
    });
  }

  // ----------------------- Step 4 -----------------------
  saveStep4(): void {
    this.clearMessages();
    this.step4Submitted = true;
    if (!this.employeeId()) {
      this.errorMessage.set('Please save Personal Details first.');
      return;
    }
    if (this.bankForm.invalid) {
      this.bankForm.markAllAsTouched();
      if (this.bankForm.hasError('mismatch')) {
        this.errorMessage.set('Account Number and Confirm Account Number do not match.');
      } else {
        this.errorMessage.set('Please enter valid bank account details and accept the declaration.');
      }
      this.scrollToFirstInvalidField();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.bankForm.getRawValue();

    const payload: BankDetailsRequest = {
      employeeId: this.employeeId()!,
      bankId: Number(v.bankId),
      branchName: v.branch.trim(),
      accountHolderName: v.holder.trim(),
      accountNumber: v.accountNumber.trim(),
      ifscCode: v.ifsc.trim().toUpperCase(),
      accountType: (v.accountType || 'SAVINGS').toUpperCase()
    };

    this.employeeService.saveBankDetails(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.completedSteps.update(s => ({ ...s, bank: true }));
        this.successMessage.set('Step 4 Saved! Salary Bank Details saved successfully.');
        this.activeTab.set('nominee');
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to save bank details.');
      }
    });
  }

  // ----------------------- Step 5 -----------------------
  saveStep5(): void {
    this.clearMessages();
    this.step5Submitted = true;
    if (!this.employeeId()) {
      this.errorMessage.set('Please save Personal Details first.');
      return;
    }
    if (this.nomineeForm.invalid) {
      this.nomineeForm.markAllAsTouched();
      this.errorMessage.set('Please fill all mandatory nominee and emergency contact details.');
      this.scrollToFirstInvalidField();
      return;
    }
    if (this.totalNomineeShare !== 100) {
      this.errorMessage.set(`Nominee share must total exactly 100%. Current total is ${this.totalNomineeShare}%.`);
      return;
    }

    this.isSubmitting.set(true);
    const v = this.nomineeForm.getRawValue();

    const payload: NomineeEmergencyRequest = {
      employeeId: this.employeeId()!,
      nominees: v.nominees.map((n: any) => ({
        nomineeName: n.name.trim(),
        relationship: n.relation.trim(),
        dateOfBirth: n.dob || null,
        sharePercentage: Number(n.share),
        address: n.address.trim()
      })),
      emergencyContacts: v.emergency.map((e: any) => ({
        contactName: e.name.trim(),
        relationship: e.relation.trim(),
        mobile: e.mobile.trim(),
        address: e.address.trim()
      }))
    };

    this.employeeService.saveNomineeEmergency(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const s = this.completedSteps();
        const allPriorDone = !!(s.personal && s.contact && s.qualification && s.bank);
        this.completedSteps.update(curr => ({
          ...curr,
          nominee: true,
          review: allPriorDone
        }));
        this.successMessage.set('Step 5 Saved! Nominee & Emergency details saved successfully.');

        if (allPriorDone) {
          this.activeTab.set('review');
        } else {
          const firstMissing = this.getFirstIncompleteStep();
          if (firstMissing) {
            this.activeTab.set(firstMissing);
            this.errorMessage.set(
              `Nominee details saved, but please complete "${this.getTabLabel(firstMissing)}" before final review.`
            );
          }
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to save nominee details.');
      }
    });
  }

  // ----------------------- Step 6 -----------------------
  finalSubmit(): void {
    this.clearMessages();
    if (!this.employeeId()) {
      this.errorMessage.set('No employee draft found to activate.');
      return;
    }

    const s = this.completedSteps();
    const missing: string[] = [];
    if (!s.personal) missing.push(this.getTabLabel('personal'));
    if (!s.contact) missing.push(this.getTabLabel('contact'));
    if (!s.qualification) missing.push(this.getTabLabel('qualification'));
    if (!s.bank) missing.push(this.getTabLabel('bank'));
    if (!s.nominee) missing.push(this.getTabLabel('nominee'));

    if (missing.length > 0) {
      this.errorMessage.set(
        `Cannot activate profile. All 5 steps must be completed before activation. Incomplete sections: ${missing.join(', ')}.`
      );
      const firstMissing = this.getFirstIncompleteStep();
      if (firstMissing) {
        this.activeTab.set(firstMissing);
      }
      return;
    }

    this.isSubmitting.set(true);
    const empId = this.employeeId()!;

    this.employeeService.finalSubmit(empId).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const code = res.data?.contractNo || this.contractNo() || `BRDS-EMP-${empId}`;
        this.finalResult.set({
          employeeId: empId,
          contractNo: code,
          username: code,
          message: res.message || 'Employee registration completed and login credentials generated successfully!'
        });
        this.recordStatus.set('ACTIVE');
        this.successMessage.set('Employee activated successfully!');
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('hrms_last_draft');
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to complete final employee submission.');
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.photoError.set(null);

    if (!file.type.startsWith('image/')) {
      this.photoError.set('Please upload a valid image file (JPG or PNG).');
      return;
    }

    if (file.size > 300 * 1024) {
      this.photoError.set('Photo size must not exceed 300 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  resetAll(): void {
    this.personalForm.reset({ title: 'Shri', idName: 'Aadhaar Card' });
    this.contactForm.reset({ sameAsPresent: true });
    this.qualificationForm.reset();
    this.bankForm.reset({ accountType: 'SAVINGS', declaration: false });
    this.nomineeForm.reset();

    this.educationArray.clear();
    this.experienceArray.clear();
    this.nomineesArray.clear();
    this.emergencyArray.clear();

    this.addEducation();
    this.addExperience();
    this.addNominee();
    this.addEmergency();

    this.photoPreview.set(null);
    this.employeeId.set(null);
    this.contractNo.set(null);
    this.recordStatus.set('DRAFT');
    this.finalResult.set(null);
    this.step1Submitted = false;
    this.completedSteps.set({
      personal: false,
      contact: false,
      qualification: false,
      bank: false,
      nominee: false,
      review: false
    });
    this.activeTab.set('personal');
    this.clearMessages();
    this.applyDefaultSelections();
  }

  // ----------------------- Real-time Event Handlers -----------------------
  onFullNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let name = input?.value || '';
    const cleaned = name.replace(/[^a-zA-Z\s.]/g, '');
    if (cleaned !== name) {
      name = cleaned;
      input.value = name;
    }
    this.personalForm?.get('fullName')?.setValue(name, { emitEvent: false });
    if (!name.trim()) {
      this.isHindiManual = false;
      this.personalForm?.get('fullNameHindi')?.setValue('', { emitEvent: false });
    } else if (!this.isHindiManual) {
      const hindiName = transliterateHindiName(name);
      this.personalForm?.get('fullNameHindi')?.setValue(hindiName, { emitEvent: false });
    }
    this.personalForm?.get('fullName')?.markAsDirty();
    this.personalForm?.get('fullName')?.updateValueAndValidity();
  }

  onHindiNameInput(): void {
    this.isHindiManual = true;
  }

  onNameOnlyInput(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/[^a-zA-Z\s.]/g, '');
    if (cleaned !== val) {
      val = cleaned;
      input.value = val;
    }
    this.personalForm?.get(controlName)?.setValue(val, { emitEvent: false });
    this.personalForm?.get(controlName)?.markAsDirty();
    this.personalForm?.get(controlName)?.updateValueAndValidity();
  }

  onPincodeInput(event: Event, groupName: 'present' | 'permanent'): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    if (cleaned !== val) {
      val = cleaned;
      input.value = val;
    }
    const ctrl = this.contactForm?.get(groupName)?.get('pincode');
    if (ctrl) {
      ctrl.setValue(val, { emitEvent: false });
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onAlternateMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    if (cleaned !== val) {
      val = cleaned;
      input.value = val;
    }
    const ctrl = this.contactForm?.get('alternateMobile');
    if (ctrl) {
      ctrl.setValue(val, { emitEvent: false });
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    input.value = cleaned;
    const ctrl = this.bankForm?.get('ifsc');
    if (ctrl) {
      ctrl.setValue(cleaned, { emitEvent: false });
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onAccountNumberInput(event: Event, controlName: 'accountNumber' | 'confirmAccount'): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/\D/g, '').slice(0, 18);
    input.value = cleaned;
    const ctrl = this.bankForm?.get(controlName);
    if (ctrl) {
      ctrl.setValue(cleaned, { emitEvent: false });
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
    this.bankForm?.updateValueAndValidity();
  }

  onAccountHolderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/[^a-zA-Z\s.]/g, '');
    input.value = cleaned;
    const ctrl = this.bankForm?.get('holder');
    if (ctrl) {
      ctrl.setValue(cleaned, { emitEvent: false });
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onNomineeNameInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/[^a-zA-Z\s.]/g, '');
    input.value = cleaned;
    const group = this.nomineesArray.at(index);
    group?.get('name')?.setValue(cleaned, { emitEvent: false });
    group?.get('name')?.markAsDirty();
    group?.get('name')?.updateValueAndValidity();
  }

  onEmergencyNameInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/[^a-zA-Z\s.]/g, '');
    input.value = cleaned;
    const group = this.emergencyArray.at(index);
    group?.get('name')?.setValue(cleaned, { emitEvent: false });
    group?.get('name')?.markAsDirty();
    group?.get('name')?.updateValueAndValidity();
  }

  onEmergencyMobileInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    input.value = cleaned;
    const group = this.emergencyArray.at(index);
    group?.get('mobile')?.setValue(cleaned, { emitEvent: false });
    group?.get('mobile')?.markAsDirty();
    group?.get('mobile')?.updateValueAndValidity();
  }

  onYearInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input?.value || '';
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    input.value = cleaned;
    const group = this.educationArray.at(index);
    group?.get('year')?.setValue(cleaned, { emitEvent: false });
    group?.get('year')?.markAsDirty();
    group?.get('year')?.updateValueAndValidity();
  }

  onDobInput(): void {
    const ctrl = this.personalForm?.get('dob');
    if (ctrl) {
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onDobBlur(): void {
    this.personalForm?.get('dob')?.markAsTouched();
  }

  onIdTypeChange(): void {
    const typeCtrl = this.personalForm?.get('idName');
    typeCtrl?.markAsDirty();
    typeCtrl?.updateValueAndValidity();

    const numCtrl = this.personalForm?.get('idNumber');
    if (numCtrl) {
      const docType = typeCtrl?.value;
      const val = numCtrl.value;
      if (val && typeof val === 'string') {
        if (['PAN Card', 'Passport', 'Voter ID Card', 'Voter ID', 'Driving Licence'].includes(docType)) {
          numCtrl.setValue(val.toUpperCase(), { emitEvent: false });
        }
      }
      numCtrl.updateValueAndValidity();
    }
  }

  onIdTypeBlur(): void {
    this.personalForm?.get('idName')?.markAsTouched();
  }

  onIdNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    const docType = this.personalForm?.get('idName')?.value;

    if (['PAN Card', 'Passport', 'Voter ID Card', 'Voter ID', 'Driving Licence'].includes(docType)) {
      val = val.toUpperCase();
      input.value = val;
    } else if (docType === 'Aadhaar Card' || docType === 'Aadhaar') {
      if (val.length > 12 && /^\d+$/.test(val)) {
        val = val.slice(0, 12);
        input.value = val;
      }
    }

    const ctrl = this.personalForm?.get('idNumber');
    if (ctrl) {
      if (ctrl.value !== val) {
        ctrl.setValue(val, { emitEvent: false });
      }
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onIdNumberPaste(event: ClipboardEvent): void {
    const pastedData = event.clipboardData?.getData('text') || '';
    const docType = this.personalForm?.get('idName')?.value;
    if (docType === 'Aadhaar Card' || docType === 'Aadhaar') {
      if (pastedData.trim().length > 12 && /^\d+$/.test(pastedData.trim())) {
        event.preventDefault();
        const val = pastedData.trim().slice(0, 12);
        this.personalForm?.get('idNumber')?.setValue(val);
        this.personalForm?.get('idNumber')?.markAsDirty();
        this.personalForm?.get('idNumber')?.updateValueAndValidity();
      }
    }
  }

  onIdNumberBlur(): void {
    this.personalForm?.get('idNumber')?.markAsTouched();
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    val = cleaned;
    input.value = val;

    const ctrl = this.personalForm?.get('officialMobile');
    if (ctrl) {
      if (ctrl.value !== val) {
        ctrl.setValue(val, { emitEvent: false });
      }
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity();
    }
  }

  onMobilePaste(event: ClipboardEvent): void {
    const pastedData = event.clipboardData?.getData('text') || '';
    const cleaned = pastedData.replace(/\D/g, '').slice(0, 10);
    if (cleaned) {
      event.preventDefault();
      this.personalForm?.get('officialMobile')?.setValue(cleaned);
      this.personalForm?.get('officialMobile')?.markAsDirty();
      this.personalForm?.get('officialMobile')?.updateValueAndValidity();
    }
  }

  onMobileBlur(): void {
    this.personalForm?.get('officialMobile')?.markAsTouched();
  }

  // ----------------------- Field Validation & Error Helpers -----------------------
  getDobErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('dob');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) {
      return null;
    }
    if (ctrl.hasError('required') || !ctrl.value) {
      return 'Date of birth is required.';
    }
    if (ctrl.hasError('underAge') || ctrl.hasError('minAge') || ctrl.hasError('futureDate')) {
      return 'Age must be above 18 years.';
    }
    return null;
  }

  isDobInvalid(): boolean {
    return !!this.getDobErrorMessage();
  }

  getIdTypeErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('idName');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) {
      return null;
    }
    if (ctrl.hasError('required') || !ctrl.value || !String(ctrl.value).trim()) {
      return 'Please select an identity document type.';
    }
    return null;
  }

  isIdTypeInvalid(): boolean {
    return !!this.getIdTypeErrorMessage();
  }

  getIdNumberErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('idNumber');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) {
      return null;
    }
    const val = (ctrl.value || '').toString().trim();
    if (ctrl.hasError('required') || val.length === 0) {
      return 'Identity document number is required.';
    }

    const errors = ctrl.errors;
    if (!errors) return null;

    if (errors['nonNumeric']) {
      return 'Aadhaar number must contain only digits.';
    }
    if (errors['aadhaarLength']) {
      return 'Aadhaar number must be exactly 12 digits.';
    }
    if (errors['aadhaarPrefix']) {
      return 'Aadhaar number cannot begin with 0 or 1.';
    }
    if (errors['aadhaarRepeated']) {
      return 'Aadhaar number cannot have all identical digits.';
    }
    if (errors['aadhaarChecksum']) {
      return 'Invalid Aadhaar number (checksum validation failed).';
    }
    if (errors['panInvalid']) {
      return 'Enter a valid PAN number (e.g., ABCDE1234F).';
    }
    if (errors['passportInvalid']) {
      return 'Enter a valid Indian Passport number.';
    }
    if (errors['drivingLicenceInvalid']) {
      return 'Enter a valid Indian Driving Licence number.';
    }
    if (errors['voterIdInvalid']) {
      return 'Enter a valid Voter ID number.';
    }
    if (errors['noDocType']) {
      return 'Please select an identity document type.';
    }
    if (errors['genericInvalid']) {
      return errors['message'] || 'Enter a valid document number.';
    }
    if (errors['message']) {
      return errors['message'];
    }
    return null;
  }

  isIdNumberInvalid(): boolean {
    return !!this.getIdNumberErrorMessage();
  }

  getMobileErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('officialMobile');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) {
      return null;
    }
    const val = (ctrl.value || '').toString().trim();
    if (ctrl.hasError('required') || val.length === 0) {
      return 'Official mobile number is required.';
    }

    const errors = ctrl.errors;
    if (!errors) return null;

    if (errors['invalidCharacters']) {
      return 'Official mobile number must contain only digits.';
    }
    if (errors['invalidPrefix']) {
      return 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.';
    }
    if (errors['invalidLength']) {
      return 'Mobile number must be of 10 digits.';
    }
    return null;
  }

  isMobileInvalid(): boolean {
    return !!this.getMobileErrorMessage();
  }

  getFullNameErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('fullName');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Full Name is required.';
    if (ctrl.hasError('invalidName')) return 'Name must contain only letters and spaces (no digits or symbols).';
    if (ctrl.hasError('minLength') || (ctrl.value || '').trim().length < 3) return 'Name must be at least 3 characters.';
    return null;
  }

  getFatherNameErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('fatherName');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return "Father's Name is required.";
    if (ctrl.hasError('invalidName')) return 'Name must contain only letters and spaces (no digits or symbols).';
    if (ctrl.hasError('minLength') || (ctrl.value || '').trim().length < 3) return "Father's Name must be at least 3 characters.";
    return null;
  }

  getJoiningDateErrorMessage(): string | null {
    const ctrl = this.personalForm?.get('joiningDate');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step1Submitted)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Joining date is required.';
    if (ctrl.hasError('joiningUnderAge') || ctrl.hasError('joiningTooEarly')) return 'Joining date must be at least 18 years after Date of Birth.';
    if (ctrl.hasError('noDob')) return 'Please select Date of Birth first.';
    return null;
  }

  isJoiningDateInvalid(): boolean {
    return !!this.getJoiningDateErrorMessage();
  }

  isGenderInvalid(): boolean {
    const ctrl = this.personalForm?.get('genderId');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step1Submitted));
  }
  getGenderErrorMessage(): string | null {
    return this.isGenderInvalid() ? 'Gender is required.' : null;
  }

  isCategoryInvalid(): boolean {
    const ctrl = this.personalForm?.get('categoryId');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step1Submitted));
  }
  getCategoryErrorMessage(): string | null {
    return this.isCategoryInvalid() ? 'Social Category is required.' : null;
  }

  isEmploymentStatusInvalid(): boolean {
    const ctrl = this.personalForm?.get('employmentStatusId');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step1Submitted));
  }
  getEmploymentStatusErrorMessage(): string | null {
    return this.isEmploymentStatusInvalid() ? 'Employment Status is required.' : null;
  }

  isEmployeeTypeInvalid(): boolean {
    const ctrl = this.personalForm?.get('employeeTypeId');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step1Submitted));
  }
  getEmployeeTypeErrorMessage(): string | null {
    return this.isEmployeeTypeInvalid() ? 'Employee Type is required.' : null;
  }

  isDesignationInvalid(): boolean {
    const ctrl = this.personalForm?.get('designationId');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step1Submitted));
  }
  getDesignationErrorMessage(): string | null {
    return this.isDesignationInvalid() ? 'Designation is required.' : null;
  }

  isContactFieldInvalid(path: string): boolean {
    const ctrl = this.contactForm?.get(path);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched || this.step2Submitted);
  }

  getContactFieldErrorMessage(path: string, label: string): string | null {
    const ctrl = this.contactForm?.get(path);
    if (!ctrl || (!ctrl.dirty && !ctrl.touched && !this.step2Submitted)) return null;
    if (ctrl.hasError('required')) return `${label} is required.`;
    if (ctrl.hasError('pattern')) {
      if (path.includes('city')) return 'City name can only contain letters, spaces, and hyphens.';
      return `Invalid format for ${label}.`;
    }
    if (ctrl.hasError('invalidPincode')) return 'Enter a valid 6-digit Pincode (starts with 1-9).';
    if (ctrl.hasError('maxlength')) return `${label} exceeds maximum allowed length.`;
    return null;
  }

  getPincodeErrorMessage(group: 'present' | 'permanent'): string | null {
    const ctrl = this.contactForm?.get(group)?.get('pincode');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Pincode is required.';
    if (ctrl.hasError('invalidPincode') || ctrl.hasError('pattern')) return 'Enter a valid 6-digit Pincode (starts with 1-9).';
    return null;
  }

  getIfscErrorMessage(): string | null {
    const ctrl = this.bankForm?.get('ifsc');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'IFSC code is required.';
    if (ctrl.hasError('invalidIfsc') || ctrl.hasError('pattern')) return 'Enter a valid 11-character IFSC code (e.g., SBIN0001234, no symbols).';
    return null;
  }

  getAccountNumberErrorMessage(): string | null {
    const ctrl = this.bankForm?.get('accountNumber');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Account number is required.';
    if (ctrl.hasError('nonNumericAccount')) return 'Account number must contain only numeric digits.';
    if (ctrl.hasError('invalidAccountLength') || ctrl.hasError('pattern')) return 'Account number must be between 9 and 18 digits.';
    return null;
  }

  getConfirmAccountErrorMessage(): string | null {
    const ctrl = this.bankForm?.get('confirmAccount');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Please confirm account number.';
    if (this.bankForm?.hasError('mismatch')) return 'Account numbers do not match.';
    return null;
  }

  getHolderErrorMessage(): string | null {
    const ctrl = this.bankForm?.get('holder');
    if (!ctrl || (!ctrl.dirty && !ctrl.touched)) return null;
    if (ctrl.hasError('required') || !ctrl.value) return 'Account holder name is required.';
    if (ctrl.hasError('invalidName')) return 'Holder name must contain only letters and spaces.';
    return null;
  }

  private validateAge(minAge: number) {
    return ageAboveValidator(minAge);
  }

  private matchAccounts(group: FormGroup) {
    const acc = group.get('accountNumber')?.value;
    const confirm = group.get('confirmAccount')?.value;
    return acc === confirm ? null : { mismatch: true };
  }

  private loadFallbackMasters(): void {
    this.genders.set([
      { id: 1, name: 'Male' },
      { id: 2, name: 'Female' },
      { id: 3, name: 'Transgender' }
    ]);
    this.bloodGroups.set([
      { id: 1, name: 'A+' }, { id: 2, name: 'A-' },
      { id: 3, name: 'B+' }, { id: 4, name: 'B-' },
      { id: 5, name: 'O+' }, { id: 6, name: 'O-' },
      { id: 7, name: 'AB+' }, { id: 8, name: 'AB-' }
    ]);
    this.categories.set([
      { id: 1, name: 'General (UR)' },
      { id: 2, name: 'EWS' },
      { id: 3, name: 'BC' },
      { id: 4, name: 'EBC' },
      { id: 5, name: 'SC' },
      { id: 6, name: 'ST' }
    ]);
    this.employmentStatuses.set([
      { id: 1, name: 'Active / On-Duty' },
      { id: 2, name: 'Probation' },
      { id: 3, name: 'Notice Period' }
    ]);
    this.employeeTypes.set([
      { id: 1, name: 'Contractual (Fixed Term)' },
      { id: 2, name: 'Deputation' },
      { id: 3, name: 'Consultant' }
    ]);
    this.offices.set([
      { id: 101, name: 'BRDS State HQ - Patna' },
      { id: 102, name: 'District DRDA - Patna' },
      { id: 103, name: 'District DRDA - Gaya' },
      { id: 104, name: 'District DRDA - Muzaffarpur' },
      { id: 105, name: 'District DRDA - Bhagalpur' }
    ]);
    this.designations.set([
      { id: 1, name: 'Block Programme Officer (BPO)' },
      { id: 2, name: 'Accountant-cum-IT Assistant' },
      { id: 3, name: 'Gram Rozgar Sevak (GRS)' },
      { id: 4, name: 'Technical Assistant (JE)' },
      { id: 5, name: 'District Coordinator' }
    ]);
    this.idTypes.set([
      { id: 1, name: 'Aadhaar Card' },
      { id: 2, name: 'Driving Licence' },
      { id: 3, name: 'PAN Card' },
      { id: 4, name: 'Passport' },
      { id: 5, name: 'Voter ID Card' }
    ]);
    this.states.set([
      { id: 1, name: 'Bihar' },
      { id: 2, name: 'Jharkhand' },
      { id: 3, name: 'Uttar Pradesh' }
    ]);
    this.districts.set([
      { id: 1, name: 'Patna' },
      { id: 2, name: 'Gaya' },
      { id: 3, name: 'Muzaffarpur' },
      { id: 4, name: 'Bhagalpur' },
      { id: 5, name: 'Darbhanga' }
    ]);
    this.qualificationsList.set([
      { id: 1, name: 'Matriculation (10th)' },
      { id: 2, name: 'Intermediate (12th)' },
      { id: 3, name: 'Graduation (BCA/BSc/BA/BTech)' },
      { id: 4, name: 'Post Graduation (MCA/MTech/MSc)' },
      { id: 5, name: 'Diploma in Computer Applications' }
    ]);
    this.banks.set([
      { id: 1, name: 'State Bank of India' },
      { id: 2, name: 'Punjab National Bank' },
      { id: 3, name: 'Canara Bank' },
      { id: 4, name: 'Bank of Baroda' },
      { id: 5, name: 'HDFC Bank' }
    ]);
    this.reportingOfficers.set([
      { officialId: 1, userId: 'ADM-PAT-01', officialName: 'Dr. Alok Verma, IAS', designation: 'CEO, BRDS' },
      { officialId: 2, userId: 'ADM-GAY-02', officialName: 'Shri Rajesh Mishra, BAS', designation: 'DDC, Gaya' },
      { officialId: 3, userId: 'ADM-MUZ-03', officialName: 'Smt. Priya Ranjan, BAS', designation: 'DDC, Muzaffarpur' }
    ]);

    this.applyDefaultSelections();
  }

  // ----------------------- Lookup Helpers for Review Summary -----------------------
  getGenderName(id: any): string {
    return this.genders().find(g => g.id === Number(id))?.name || '—';
  }

  getCategoryName(id: any): string {
    return this.categories().find(c => c.id === Number(id))?.name || '—';
  }

  getBloodGroupName(id: any): string {
    if (!id) return 'Not Specified';
    return this.bloodGroups().find(b => b.id === Number(id))?.name || 'Not Specified';
  }

  getOfficeName(id: any): string {
    return this.offices().find(o => o.id === Number(id))?.name || '—';
  }

  getDesignationName(id: any): string {
    return this.designations().find(d => d.id === Number(id))?.name || '—';
  }

  getEmploymentStatusName(id: any): string {
    return this.employmentStatuses().find(s => s.id === Number(id))?.name || '—';
  }

  getEmployeeTypeName(id: any): string {
    return this.employeeTypes().find(t => t.id === Number(id))?.name || '—';
  }

  getStateName(id: any): string {
    return this.states().find(s => s.id === Number(id))?.name || '—';
  }

  getDistrictName(id: any): string {
    return this.districts().find(d => d.id === Number(id))?.name || '—';
  }

  getQualificationName(id: any): string {
    return this.qualificationsList().find(q => q.id === Number(id))?.name || '—';
  }

  getBankName(id: any): string {
    return this.banks().find(b => b.id === Number(id))?.name || '—';
  }

  getReportingOfficerName(id: any): string {
    if (!id) return 'Not Assigned';
    const ro = this.reportingOfficers().find(r => r.officialId === Number(id));
    return ro ? `${ro.officialName} (${ro.userId || ro.designation})` : 'Not Assigned';
  }
}
