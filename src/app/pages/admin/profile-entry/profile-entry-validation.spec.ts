import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ProfileEntry } from './profile-entry';
import { aEmployeeDetails } from '../../../core/services/adminService/aEmployee.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { of } from 'rxjs';

describe('ProfileEntry Real-time Form Validation', () => {
  let component: ProfileEntry;

  const mockEmployeeService = {
    getMasters: () => of({
      genders: [{ id: 1, name: 'Male' }],
      bloodGroups: [],
      categories: [{ id: 1, name: 'General' }],
      employmentStatuses: [{ id: 1, name: 'Active' }],
      employeeTypes: [{ id: 1, name: 'Contractual' }],
      offices: [{ id: 1, name: 'HQ' }],
      designations: [{ id: 1, name: 'Officer' }],
      idTypes: [
        { id: 1, name: 'Aadhaar Card' },
        { id: 2, name: 'Driving Licence' },
        { id: 3, name: 'PAN Card' },
        { id: 4, name: 'Passport' },
        { id: 5, name: 'Voter ID Card' }
      ],
      states: [],
      districts: [],
      qualifications: [],
      banks: [],
      reportingOfficers: []
    }),
    savePersonalDetails: vi.fn().mockReturnValue(of({ data: { success: true, employeeId: 101, contractNo: 'CON-101' } })),
    getFullProfile: vi.fn().mockReturnValue(of({ data: null }))
  };

  const mockActivatedRoute = {
    queryParams: of({})
  };

  const mockLanguageService = {
    t: (s: string) => s
  };

  const mockAuthSessionService = {
    user: { employeeId: 1, officeId: 1 }
  };

  beforeEach(() => {
    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useClass: FormBuilder },
        { provide: aEmployeeDetails, useValue: mockEmployeeService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: AuthSessionService, useValue: mockAuthSessionService }
      ]
    });

    component = runInInjectionContext(injector, () => new ProfileEntry());
    component.ngOnInit();
  });

  describe('0. Automatic English to Hindi Name Translation', () => {
    it('should automatically translate English full name to Hindi in real-time', () => {
      const nameCtrl = component.personalForm.get('fullName')!;
      const hindiCtrl = component.personalForm.get('fullNameHindi')!;

      // Test "AAna" from user screenshot
      nameCtrl.setValue('AAna');
      expect(hindiCtrl.value).toBe('आना');

      // Test "Ramesh Kumar"
      nameCtrl.setValue('Ramesh Kumar');
      expect(hindiCtrl.value).toBe('रमेश कुमार');

      // Test clearing English name clears Hindi name
      nameCtrl.setValue('');
      expect(hindiCtrl.value).toBe('');
    });

    it('should update Hindi name on onFullNameInput input event', () => {
      const hindiCtrl = component.personalForm.get('fullNameHindi')!;
      component.onFullNameInput({ target: { value: 'AAna' } } as any);
      expect(hindiCtrl.value).toBe('आना');
    });
  });

  describe('1. Date of Birth Real-time Validation', () => {
    it('should not display errors prematurely when untouched', () => {
      expect(component.getDobErrorMessage()).toBeNull();
      expect(component.isDobInvalid()).toBe(false);
    });

    it('should show "Age must be above 18 years." immediately when under 18 is selected', () => {
      const today = new Date();
      const under18Year = today.getFullYear() - 15;
      const dobCtrl = component.personalForm.get('dob')!;
      dobCtrl.setValue(`${under18Year}-01-01`);
      component.onDobInput();

      expect(dobCtrl.invalid).toBe(true);
      expect(component.getDobErrorMessage()).toBe('Age must be above 18 years.');
      expect(component.isDobInvalid()).toBe(true);
    });

    it('should show "Age must be above 18 years." if a future date is entered', () => {
      const today = new Date();
      const futureYear = today.getFullYear() + 2;
      const dobCtrl = component.personalForm.get('dob')!;
      dobCtrl.setValue(`${futureYear}-05-10`);
      component.onDobInput();

      expect(dobCtrl.invalid).toBe(true);
      expect(component.getDobErrorMessage()).toBe('Age must be above 18 years.');
      expect(component.isDobInvalid()).toBe(true);
    });

    it('should clear error automatically when a valid age (>= 18) is selected', () => {
      const dobCtrl = component.personalForm.get('dob')!;
      dobCtrl.setValue('2000-05-15');
      component.onDobInput();

      expect(dobCtrl.valid).toBe(true);
      expect(component.getDobErrorMessage()).toBeNull();
      expect(component.isDobInvalid()).toBe(false);
    });

    it('should show "Date of birth is required." if cleared after interaction', () => {
      const dobCtrl = component.personalForm.get('dob')!;
      dobCtrl.setValue('');
      component.onDobInput();
      component.onDobBlur();

      expect(dobCtrl.invalid).toBe(true);
      expect(component.getDobErrorMessage()).toBe('Date of birth is required.');
      expect(component.isDobInvalid()).toBe(true);
    });
  });

  describe('2. Identity Document Type & Number Validation', () => {
    it('should validate 12-digit Aadhaar by default', () => {
      const numCtrl = component.personalForm.get('idNumber')!;

      // Incomplete digits
      numCtrl.setValue('12345');
      component.onIdNumberInput({ target: { value: '12345' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Aadhaar number must be exactly 12 digits.');
      expect(component.isIdNumberInvalid()).toBe(true);

      // Non-numeric
      numCtrl.setValue('1234abcd5678');
      component.onIdNumberInput({ target: { value: '1234abcd5678' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Aadhaar number must contain only digits.');
      expect(component.isIdNumberInvalid()).toBe(true);

      // Valid 12 digits (valid prefix and Verhoeff checksum)
      numCtrl.setValue('234567890124');
      component.onIdNumberInput({ target: { value: '234567890124' } } as any);
      expect(component.getIdNumberErrorMessage()).toBeNull();
      expect(component.isIdNumberInvalid()).toBe(false);
    });

    it('should dynamically switch to PAN Card validation and convert to uppercase', () => {
      const typeCtrl = component.personalForm.get('idName')!;
      const numCtrl = component.personalForm.get('idNumber')!;

      // Change doc type to PAN Card
      typeCtrl.setValue('PAN Card');
      component.onIdTypeChange();

      // Enter lowercase pan
      component.onIdNumberInput({ target: { value: 'abcde1234f' } } as any);
      expect(numCtrl.value).toBe('ABCDE1234F');
      expect(component.getIdNumberErrorMessage()).toBeNull();
      expect(component.isIdNumberInvalid()).toBe(false);

      // Invalid PAN format
      component.onIdNumberInput({ target: { value: 'ABCD12345F' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Enter a valid PAN number (e.g., ABCDE1234F).');
      expect(component.isIdNumberInvalid()).toBe(true);
    });

    it('should dynamically switch to Passport validation', () => {
      const typeCtrl = component.personalForm.get('idName')!;
      const numCtrl = component.personalForm.get('idNumber')!;

      typeCtrl.setValue('Passport');
      component.onIdTypeChange();

      // Invalid passport
      numCtrl.setValue('12345678');
      component.onIdNumberInput({ target: { value: '12345678' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Enter a valid Indian Passport number.');

      // Valid passport
      numCtrl.setValue('A1234567');
      component.onIdNumberInput({ target: { value: 'A1234567' } } as any);
      expect(component.getIdNumberErrorMessage()).toBeNull();
      expect(component.isIdNumberInvalid()).toBe(false);
    });

    it('should dynamically switch to Voter ID Card validation', () => {
      const typeCtrl = component.personalForm.get('idName')!;
      const numCtrl = component.personalForm.get('idNumber')!;

      typeCtrl.setValue('Voter ID Card');
      component.onIdTypeChange();

      // Invalid voter id
      numCtrl.setValue('AB123456');
      component.onIdNumberInput({ target: { value: 'AB123456' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Enter a valid Voter ID number.');

      // Valid voter id
      numCtrl.setValue('ABC1234567');
      component.onIdNumberInput({ target: { value: 'ABC1234567' } } as any);
      expect(component.getIdNumberErrorMessage()).toBeNull();
      expect(component.isIdNumberInvalid()).toBe(false);
    });

    it('should dynamically switch to Driving Licence validation', () => {
      const typeCtrl = component.personalForm.get('idName')!;
      const numCtrl = component.personalForm.get('idNumber')!;

      typeCtrl.setValue('Driving Licence');
      component.onIdTypeChange();

      // Invalid DL
      numCtrl.setValue('1234');
      component.onIdNumberInput({ target: { value: '1234' } } as any);
      expect(component.getIdNumberErrorMessage()).toBe('Enter a valid Indian Driving Licence number.');

      // Valid standard DL
      numCtrl.setValue('BR-0120190001234');
      component.onIdNumberInput({ target: { value: 'BR-0120190001234' } } as any);
      expect(component.getIdNumberErrorMessage()).toBeNull();
      expect(component.isIdNumberInvalid()).toBe(false);
    });

    it('should show "Please select an identity document type." if doc type is empty', () => {
      const typeCtrl = component.personalForm.get('idName')!;
      typeCtrl.setValue('');
      component.onIdTypeChange();
      component.onIdTypeBlur();

      expect(component.getIdTypeErrorMessage()).toBe('Please select an identity document type.');
      expect(component.isIdTypeInvalid()).toBe(true);
    });

    it('should show "Identity document number is required." if document number is empty', () => {
      const numCtrl = component.personalForm.get('idNumber')!;
      numCtrl.setValue('');
      component.onIdNumberInput({ target: { value: '' } } as any);
      component.onIdNumberBlur();

      expect(component.getIdNumberErrorMessage()).toBe('Identity document number is required.');
      expect(component.isIdNumberInvalid()).toBe(true);
    });
  });

  describe('3. Official Mobile Number Real-time Validation', () => {
    it('should show prefix error when starting with 0-5', () => {
      const mobCtrl = component.personalForm.get('officialMobile')!;

      mobCtrl.setValue('5123456789');
      component.onMobileInput({ target: { value: '5123456789' } } as any);
      expect(component.getMobileErrorMessage()).toBe('Enter a valid Indian mobile number starting with 6, 7, 8, or 9.');
      expect(component.isMobileInvalid()).toBe(true);
    });

    it('should show 10-digit error when valid prefix but fewer than 10 digits', () => {
      const mobCtrl = component.personalForm.get('officialMobile')!;

      mobCtrl.setValue('98765');
      component.onMobileInput({ target: { value: '98765' } } as any);
      expect(component.getMobileErrorMessage()).toBe('Mobile number must be of 10 digits.');
      expect(component.isMobileInvalid()).toBe(true);
    });

    it('should become valid when 10 digits starting with 6, 7, 8, or 9 entered', () => {
      const mobCtrl = component.personalForm.get('officialMobile')!;

      mobCtrl.setValue('9876543210');
      component.onMobileInput({ target: { value: '9876543210' } } as any);
      expect(component.getMobileErrorMessage()).toBeNull();
      expect(component.isMobileInvalid()).toBe(false);
    });

    it('should show "Official mobile number is required." when cleared after interaction', () => {
      const mobCtrl = component.personalForm.get('officialMobile')!;

      mobCtrl.setValue('');
      component.onMobileInput({ target: { value: '' } } as any);
      component.onMobileBlur();
      expect(component.getMobileErrorMessage()).toBe('Official mobile number is required.');
      expect(component.isMobileInvalid()).toBe(true);
    });
  });

  describe('4. Final Submission Validation', () => {
    it('should prevent submission and mark fields as touched if form is invalid', () => {
      component.saveStep1();

      expect(component.step1Submitted).toBe(true);
      expect(component.errorMessage()).toContain('Please fill all mandatory personal details');
      expect(component.isDobInvalid()).toBe(true);
      expect(component.isIdNumberInvalid()).toBe(true);
      expect(component.isMobileInvalid()).toBe(true);
    });
  });
});
