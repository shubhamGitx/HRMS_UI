import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { ProfileService } from './shared/profile.service';
import { PersonalInformation } from './personal-information/personal-information';
import { Qualification } from './qualification/qualification';
import { Experience } from './experience/experience';
import { BankDetails } from './bank-details/bank-details';
import { NomineeDetails } from './nominee/nominee';
import { EmergencyContactDetails } from './emergency-contact/emergency-contact';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { EmployeeApiService } from '../../../core/services/employee-api.service';
import { ContractApiService } from '../../../core/services/contract-api.service';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

describe('Staff Profile – Read-Only Fields Specification', () => {
  let injector: Injector;

  beforeEach(() => {
    const mockAuthSession = {
      user: {
        userId: 'EMP001',
        userName: 'Sudha Kumari',
        userRole: 'Employee',
        employeeId: 1,
        reportingOfficialName: 'Amit Kumar'
      },
      token: 'mock-token'
    };

    const mockEmployeeApi = {
      masters: () => of({ success: true, data: {} }),
      getPersonalDetails: () => of({
        success: true,
        data: {
          personalDetails: {
            employeeName: 'Sudha Kumari',
            employeeNameHindi: 'सुधा कुमारी',
            dateOfBirth: '1994-07-15',
            fatherName: 'Ramesh Prasad',
            motherName: 'Sunita Devi',
            genderId: 2,
            genderName: 'Female',
            bloodGroupId: 2,
            bloodGroupName: 'A-',
            idName: 'Aadhaar Card',
            idNumber: '234567890123'
          }
        }
      }),
      getAddressDetails: () => of({ success: true, data: { contactAddress: { addresses: [] } } }),
      getBnakDetails: () => of({
        success: true,
        data: {
          bankDetails: {
            bankName: 'State Bank of India',
            accountNumber: '123456789012',
            ifscCode: 'SBIN0001234',
            branchName: 'Patna Main',
            accountHolderName: 'Sudha Kumari'
          }
        }
      }),
      getNomineeDetails: () => of({ success: true, data: { nominees: [] } }),
      getQulificationDetails: () => of({ success: true, data: { qualificationExperience: {} } }),
      getEmergencyContactDetails: () => of({ success: true, data: { emergencyContacts: [] } }),
      getDocuments: () => of({ success: true, data: [] }),
      getVerifiedDocuments: () => of({ success: true, data: [] }),
      getChangeLogs: () => of({ success: true, data: [] })
    };

    const mockContractApi = {
      getContractDetails: () => of({ success: true, data: { contractNo: 'BRDS-CON-2025-001' } }),
      getRenewalHistory: () => of({ success: true, data: [] })
    };

    injector = Injector.create({
      providers: [
        { provide: AuthSessionService, useValue: mockAuthSession },
        { provide: EmployeeApiService, useValue: mockEmployeeApi },
        { provide: ContractApiService, useValue: mockContractApi },
        { provide: HttpClient, useValue: {} },
        { provide: ProfileService, useClass: ProfileService }
      ]
    });
  });

  it('1. Personal Information component should expose Aadhaar and PAN computed fields', () => {
    const comp = runInInjectionContext(injector, () => new PersonalInformation());
    comp.ngOnInit();
    expect(comp['aadhaarNumber']()).toBe('234567890123');
    expect(comp['panNumber']()).toBe('ABCDE1234F');
  });

  it('2. Personal Information template should contain no edit buttons and no profile-entry links', () => {
    const htmlPath = path.resolve(__dirname, 'personal-information/personal-information.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('profile-entry');
    expect(html).not.toContain('Request Profile Change');
    expect(html).toContain('Employee Name (Hindi)');
    expect(html).toContain('Aadhaar Number');
    expect(html).toContain('PAN Number');
  });

  it('3. Contact & Address template should have NO edit buttons and NO profile-entry links', () => {
    const htmlPath = path.resolve(__dirname, 'contact-address/contact-address.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('profile-entry');
    expect(html).not.toContain('Update Contact Details');
    expect(html).not.toContain('Update Address');
    expect(html).not.toContain('Update Emergency Contact');
    expect(html).toContain('Contact Information');
    expect(html).toContain('Addresses');
  });

  it('4. Employment Details template should display Employee ID and have no profile-entry links', () => {
    const htmlPath = path.resolve(__dirname, 'employment-details/employment-details.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('profile-entry');
    expect(html).toContain('Employee ID');
    expect(html).toContain('Employee Code');
    expect(html).toContain('Office / Place of Posting');
    expect(html).toContain('Date of Joining');
  });

  it('5. Qualification template should have NO edit buttons or Add Qualification links', () => {
    const tsPath = path.resolve(__dirname, 'qualification/qualification.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toContain('profile-entry');
    expect(ts).not.toContain('Add Qualification');
    expect(ts).toContain('Educational Qualifications');
  });

  it('6. Experience template should have NO edit buttons', () => {
    const tsPath = path.resolve(__dirname, 'experience/experience.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toContain('profile-entry');
    expect(ts).toContain('Previous Work Experience');
  });

  it('7. Bank Details template should display PF / UAN Number with NO Change Request buttons', () => {
    const tsPath = path.resolve(__dirname, 'bank-details/bank-details.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toContain('profile-entry');
    expect(ts).not.toContain('Change Request');
    expect(ts).not.toContain('Change Bank Account');
    expect(ts).toContain('PF / UAN Number');
  });

  it('8. Nominee template should have NO edit buttons', () => {
    const tsPath = path.resolve(__dirname, 'nominee/nominee.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toContain('profile-entry');
    expect(ts).toContain('Nominee Details');
  });

  it('9. Emergency Contact template should have NO edit or update buttons', () => {
    const tsPath = path.resolve(__dirname, 'emergency-contact/emergency-contact.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toContain('profile-entry');
    expect(ts).not.toContain('Update Emergency Contact');
    expect(ts).toContain('Emergency Contacts');
  });

  it('10. ProfilePage template should have NO Edit button in its header', () => {
    const tsPath = path.resolve(__dirname, 'profile-page/profile-page.ts');
    const ts = fs.readFileSync(tsPath, 'utf8');
    expect(ts).not.toMatch(/@if\s*\(\s*key\(\)\s*===\s*'employment-details'\s*\)/);
  });
});
