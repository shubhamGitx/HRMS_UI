import { Injectable, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ApiResponse } from '../../../../core/auth/auth.models';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { EmployeeApiService, EmployeeMasters } from '../../../../core/services/employee-api.service';
import { ContractApiService } from '../../../../core/services/contract-api.service';
import { Education, Experience } from './profile.models';
import {
  ChangeLog,
  ContractInfo,
  EmploymentInfo,
  EntryTab,
  HistoryRow,
  ProfileData,
  ProfileDocument,
} from './profile.models';

const STORE_KEY = 'hrms_my_profile_v2';

/*
 * My Profile ka poora data.
 * - Employee ka data (personal, contact, bank ...) STATIC hai aur Profile Entry page se badalta hai.
 *   Badla hua data browser ke localStorage me rehta hai (refresh par bhi).
 * - Employment / Contract HR ka data hai, sirf view hota hai.
 * API ready hone par load() aur save...() me HttpClient call lagani hai.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService  {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly contractApi = inject(ContractApiService);

  private currentLoadedUserId: string | null = null;
  private masters: EmployeeMasters | null = null;

  public loadMasters(): void {
    if (this.masters) return;
    this.employeeApi.masters().subscribe({
      next: res => {
        if (res && res.data) {
          this.masters = res.data;
          this.reapplyResolvedValues();
        }
      },
      error: () => {}
    });
  }

  public resolveGender(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.genders?.find(g => g.id === numId);
    if (found) return found.name;
    const map: Record<number, string> = { 1: 'Male', 2: 'Female', 3: 'Transgender' };
    return map[numId] || (name || String(numId));
  }

  public resolveBloodGroup(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.bloodGroups?.find(b => b.id === numId);
    if (found) return found.name;
    const map: Record<number, string> = {
      1: 'A+', 2: 'A-', 3: 'B+', 4: 'B-', 5: 'O+', 6: 'O-', 7: 'AB+', 8: 'AB-'
    };
    return map[numId] || (name || String(numId));
  }

  public resolveState(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.states?.find(s => s.id === numId);
    if (found) return found.name;
    if (numId === 10) return 'Bihar';
    return name || String(numId);
  }

  public resolveDistrict(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.districts?.find(d => d.id === numId);
    if (found) return found.name;
    return name || String(numId);
  }

  public resolveQualification(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.qualifications?.find(q => q.id === numId);
    if (found) return found.name;
    const map: Record<number, string> = {
      1: '10th / Matriculation',
      2: '12th / Intermediate',
      3: 'Graduation / Degree',
      4: 'Post Graduation / Master',
      5: 'Diploma',
      6: 'PhD / Doctorate'
    };
    return map[numId] || name || String(numId);
  }

  public resolveBank(id?: number | null, name?: string | null): string {
    if (name && isNaN(Number(name))) return name;
    if (id == null && (!name || isNaN(Number(name)))) return '';
    const numId = Number(id ?? name);
    const found = this.masters?.banks?.find(b => b.id === numId);
    return found ? found.name : (name || '');
  }

  public reapplyResolvedValues(): void {
    const d = this.data();
    let changed = false;
    const personal = { ...d.personal };
    const presentAddress = { ...d.presentAddress };
    const permanentAddress = { ...d.permanentAddress };
    let education = [...d.education];
    const bank = { ...d.bank };

    if (personal.genderId && (!personal.gender || personal.gender === String(personal.genderId) || !isNaN(Number(personal.gender)))) {
      const resolved = this.resolveGender(personal.genderId, personal.gender);
      if (resolved && resolved !== personal.gender) {
        personal.gender = resolved;
        changed = true;
      }
    }
    if (personal.bloodGroup && !isNaN(Number(personal.bloodGroup))) {
      const resolved = this.resolveBloodGroup(Number(personal.bloodGroup));
      if (resolved && resolved !== personal.bloodGroup) {
        personal.bloodGroup = resolved;
        changed = true;
      }
    }
    if (presentAddress.district && !isNaN(Number(presentAddress.district))) {
      const resolved = this.resolveDistrict(Number(presentAddress.district));
      if (resolved && resolved !== presentAddress.district) {
        presentAddress.district = resolved;
        changed = true;
      }
    }
    if (presentAddress.state && !isNaN(Number(presentAddress.state))) {
      const resolved = this.resolveState(Number(presentAddress.state));
      if (resolved && resolved !== presentAddress.state) {
        presentAddress.state = resolved;
        changed = true;
      }
    }
    if (permanentAddress.district && !isNaN(Number(permanentAddress.district))) {
      const resolved = this.resolveDistrict(Number(permanentAddress.district));
      if (resolved && resolved !== permanentAddress.district) {
        permanentAddress.district = resolved;
        changed = true;
      }
    }
    if (permanentAddress.state && !isNaN(Number(permanentAddress.state))) {
      const resolved = this.resolveState(Number(permanentAddress.state));
      if (resolved && resolved !== permanentAddress.state) {
        permanentAddress.state = resolved;
        changed = true;
      }
    }
    education = education.map(e => {
      if (e.qualification && !isNaN(Number(e.qualification))) {
        changed = true;
        return { ...e, qualification: this.resolveQualification(Number(e.qualification)) };
      }
      return e;
    });

    if (changed) {
      this.data.update(curr => ({
        ...curr,
        personal,
        presentAddress,
        permanentAddress,
        education,
        bank
      }));
    }
  }

  constructor() {
    this.syncSessionUser();
  }

  // ------------------------------------------------------------------ employee data
  readonly data = signal<ProfileData>(this.load());
  

  /** Profile Entry me kaunse tab save ho chuke */
  readonly saved = signal<Record<EntryTab, boolean>>(this.loadSaved());
  readonly submitted = signal<boolean>(typeof localStorage !== 'undefined' ? (localStorage.getItem(STORE_KEY + '_submitted') === '1') : false);

  readonly toast = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ------------------------------------------------------------------ HR data
  readonly employment: EmploymentInfo = {
    employeeCode: 'BRDS-EMP-0001',
    employeeNo: 'EMP0001',
    employeeType: 'Contractual',
    engagementType: 'Project Based',
    employeeCategory: 'Technical',
    department: 'IT Department',
    office: 'Main Secretariat, Patna',
    orgUnit: 'Application Support',
    designation: 'System Analyst',
    designationLevel: 'Level 6',
    joiningDate: '2024-04-01',
    effectiveFrom: '2024-04-01',
    effectiveTo: '2027-03-31',
    status: 'Active',
    reportingOfficer: 'Not Assigned',
    reportingOfficerDesignation: '',
    officePhone: '0612-2222222',
    workLocation: 'Patna, Bihar',
  };


public syncSessionUser(): void {
  const user = this.authSession.user;
  if (!user) {
    return;
  }

  this.loadMasters();

  const userId = user.userId;
  // If switching users or initializing, reload user-specific profile
  if (this.currentLoadedUserId !== userId) {
    this.currentLoadedUserId = userId;
    this.data.set(this.loadForUser(userId));
  }

  // Sync basic info directly from session
  if (user.userName) {
    this.data.update(d => ({
      ...d,
      personal: {
        ...d.personal,
        fullName: user.userName
      }
    }));
  }

  if (user.userId) {
    this.employment.employeeCode = user.userId;
    this.employment.employeeNo = user.userId.replace('BRDS-', '');
  }

  this.employment.reportingOfficer = user.reportingOfficialName || 'Not Assigned';

  const employeeId = user.employeeId || 1;
  this.employment.employeeId = employeeId;
  if (!employeeId) {
    return;
  }

  this.employeeApi.getPersonalDetails(Number(employeeId)).subscribe({
    next: res => {
      if (!res || !res.data) {
        return;
      }

      const p = res.data;
      const details = p.personalDetails;
      if (details) {
        let aadhaar = '';
        let pan = '';
        if (details.idName?.toLowerCase().includes('aadhaar')) {
          aadhaar = details.idNumber || '';
        } else if (details.idName?.toLowerCase().includes('pan')) {
          pan = details.idNumber || '';
        }
        if (!aadhaar && details.idNumber && /^[0-9]{12}$/.test(details.idNumber)) {
          aadhaar = details.idNumber;
        }
        if (!pan && details.idNumber && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(details.idNumber)) {
          pan = details.idNumber;
        }

        this.data.update(d => ({
          ...d,
          photo: details.photo || d.photo,
          personal: {
            ...d.personal,
            fullName: details.employeeName || user.userName || d.personal.fullName,
            fullNameHindi: details.employeeNameHindi || d.personal.fullNameHindi,
            dob: details.dateOfBirth || d.personal.dob,
            fatherName: details.fatherName || d.personal.fatherName,
            motherName: details.motherName || d.personal.motherName,
            gender: this.resolveGender(details.genderId, details.genderName) || d.personal.gender,
            genderId: details.genderId != null
              ? Number(details.genderId)
              : d.personal.genderId,
            bloodGroup: this.resolveBloodGroup(details.bloodGroupId, details.bloodGroupName) || d.personal.bloodGroup,
            aadhaarNumber: aadhaar || d.personal.aadhaarNumber || '234567890123',
            panNumber: pan || d.personal.panNumber || 'ABCDE1234F'
          }
        }));

        if (details.designationName) this.employment.designation = details.designationName;
        if (details.officeName) this.employment.office = details.officeName;
        if (details.employeeTypeName) this.employment.employeeType = details.employeeTypeName;
        if (details.reportingOfficialName) this.employment.reportingOfficer = details.reportingOfficialName;
        if (details.joiningDate) this.employment.joiningDate = details.joiningDate;
      }
     
      if (p.contractNo) {
        this.employment.employeeCode = p.contractNo;
      }

      if (p.recordStatus) {
        this.employment.status =
          p.recordStatus === 'ACTIVE' ? 'Active' : p.recordStatus;
      }
    },
    error: err => {
      console.error('Personal details API failed:', err);
    }
  });

  this.employeeApi.getAddressDetails(Number(employeeId)).subscribe({
    next: res => {
      if (!res || !res.success || !res.data) {
        return;
      }
      const ca = res.data.contactAddress;
      if (!ca) return;

      const addresses = ca.addresses || [];
      const perm = addresses.find(a => a.addressType === 'PERMANENT') || addresses[0];
      const curr = addresses.find(a => a.addressType === 'CURRENT' || a.addressType === 'PRESENT') || addresses[1] || perm;

      this.data.update(d => ({
        ...d,
        contact: {
          ...d.contact,
          officialEmail: ca.officialEmail || d.contact.officialEmail,
          personalEmail: d.contact.personalEmail || ca.officialEmail || '',
          mobile: ca.officialMobile || d.contact.mobile,
          alternateMobile: perm?.alternateMobile || curr?.alternateMobile || d.contact.alternateMobile
        },
        presentAddress: curr ? {
          line1: curr.addressLine1 || '',
          line2: curr.addressLine2 || '',
          city: curr.cityName || '',
          district: curr.districtName || this.resolveDistrict(curr.districtId) || '',
          state: curr.stateName || this.resolveState(curr.stateId) || '',
          pincode: curr.pincode || ''
        } : d.presentAddress,
        permanentAddress: perm ? {
          line1: perm.addressLine1 || '',
          line2: perm.addressLine2 || '',
          city: perm.cityName || '',
          district: perm.districtName || this.resolveDistrict(perm.districtId) || '',
          state: perm.stateName || this.resolveState(perm.stateId) || '',
          pincode: perm.pincode || ''
        } : d.permanentAddress
      }));
    },
    error: err => {
      console.error('Address details API failed:', err);
    }
  });

  this.employeeApi.getBnakDetails(Number(employeeId)).subscribe({
  next: res => {
    if (!res || !res.success || !res.data) {
      console.error('Bank details not found.');
      return;
    }

    const apiBank = res.data.bankDetails;

    if (!apiBank) {
      console.error('Bank details object is missing.');
      return;
    }

    this.data.update(d => ({
      ...d,
      bank: {
        holder: apiBank.accountHolderName ?? '',
        bankName: apiBank.bankName || this.resolveBank(apiBank.bankId) || '',
        branch: apiBank.branchName ?? '',
        ifsc: apiBank.ifscCode ?? '',
        accountNumber: apiBank.accountNumber ?? '',
        accountType: apiBank.accountType ?? '',
        status: 'Verified',
        verifiedOn: '',
        pfUanNumber: d.bank.pfUanNumber || '101234567890'
      }
    }));

    console.log('Bank details loaded:', apiBank);
  },
  error: err => {
    console.error('Bank details API failed:', err);
  }
});


this.employeeApi.getNomineeDetails(Number(employeeId)).subscribe({
  next: res => {
    if (!res || !res.success || !res.data) {
      console.error('Nominee details not found.');
      return;
    }

    // API returns data.nominees directly
    const nomineeData = res.data.nominees;

    this.data.update(d => ({
      ...d,
      nominees: (nomineeData || []).map(n => ({
        name: n.nomineeName || '',
        relation: n.relationship || '',
        dob: n.dateOfBirth || '',
        share: Number(n.sharePercentage || 0),
        address: n.address || ''
      }))
    }));

    console.log('Nominee details loaded:', nomineeData);
  },
  error: err => {
    console.error('Nominee API failed:', err);
  }
});
 

 this.employeeApi.getQulificationDetails(employeeId).subscribe({
  next: res => {
    if (!res || !res.success || !res.data) {
      return;
    }

    const qualificationExperience =
      res.data.qualificationExperience;

    if (!qualificationExperience) {
      return;
    }

    const education: Education[] =
      (qualificationExperience.qualifications || []).map(q => ({
        qualification: this.resolveQualification(q.qualificationId, q.qualificationName),
        course: '',
        board: q.institutionName || '',
        year: q.passingYear != null
          ? String(q.passingYear)
          : '',
        percentage: q.marksPercentage != null
          ? String(q.marksPercentage)
          : '',
        status: 'Verified'
      }));

    const experience: Experience[] =
      (qualificationExperience.experiences || []).map(e => ({
        organisation: e.organisation || '',
        designation: e.designation || '',
        from: e.fromDate || '',
        to: e.toDate || '',
        responsibilities: e.responsibilities || ''
      }));

    this.data.update(d => ({
      ...d,
      education: education.length > 0
        ? education
        : d.education,
      experience: experience.length > 0
        ? experience
        : d.experience
    }));

    console.log('Qualification details:', education);
    console.log('Experience details:', experience);
  },

  error: err => {
    console.error(
      'Qualification details API failed:',
      err
    );
  }
  });

  this.employeeApi.getEmergencyContactDetails(Number(employeeId)).subscribe({
    next: res => {
      const emg = res?.data?.emergencyContacts;
      if (emg && emg.length > 0) {
        this.data.update(d => ({
          ...d,
          emergency: emg.map((e: any) => ({
            name: e.contactName || '',
            relation: e.relationship || '',
            mobile: e.mobile || '',
            address: e.address || ''
          }))
        }));
      }
    },
    error: () => {}
  });

  // Contract details from API
  this.contractApi.getContractDetails(Number(employeeId)).subscribe({
    next: res => {
      if (res && res.data) {
        const c = res.data;
        this.contract.contractNo = c.contractNo || this.contract.contractNo;
        this.contract.startDate = c.startDate || this.contract.startDate;
        this.contract.endDate = c.endDate || this.contract.endDate;
        this.contract.status = c.status || this.contract.status;
        this.contract.payStructure = c.payStructure || this.contract.payStructure;
        this.contract.remuneration = c.monthlyConsolidatedPay ? `₹ ${c.monthlyConsolidatedPay.toLocaleString('en-IN')}` : this.contract.remuneration;
        this.contract.appointmentOrderNo = c.sanctionOrderNo || this.contract.appointmentOrderNo;
        this.contract.appointmentOrderDate = c.sanctionOrderDate || this.contract.appointmentOrderDate;
        this.contract.issuingAuthority = c.reportingOfficer || this.contract.issuingAuthority;
        this.contract.remarks = c.remarks || this.contract.remarks;

        if (c.designation) this.employment.designation = c.designation;
        if (c.department) this.employment.department = c.department;
        if (c.officeLocation) this.employment.office = c.officeLocation;
        if (c.reportingOfficer) this.employment.reportingOfficer = c.reportingOfficer;
        if (c.startDate) this.employment.joiningDate = c.startDate;
        if (c.startDate) this.employment.effectiveFrom = c.startDate;
        if (c.endDate) this.employment.effectiveTo = c.endDate;
        if (c.employeeCode) this.employment.employeeCode = c.employeeCode;
      }
    },
    error: () => {}
  });

  // Profile Documents from API
  this.loadEmployeeDocuments(Number(employeeId));

  // Profile Change Logs from API
  this.employeeApi.getChangeLogs(Number(employeeId)).subscribe({
    next: res => {
      if (res && res.data && res.data.length > 0) {
        const mapped: ChangeLog[] = res.data.map(h => ({
          date: h.date,
          section: h.section,
          change: h.change,
          by: h.by,
          status: (h.status === 'Approved' ? 'Approved' : h.status === 'Rejected' ? 'Rejected' : 'Pending') as any
        }));
        this.history.set(mapped);
      }
    },
    error: () => {}
  });

  // Contract Renewal History from API
  this.contractApi.getRenewalHistory(Number(employeeId)).subscribe({
    next: res => {
      if (res && res.data && res.data.length > 0) {
        this.contractHistory.length = 0;
        res.data.forEach(r => {
          this.contractHistory.push({
            contractNo: r.contractNo || r.renewalPhase,
            period: `${r.startDate} – ${r.endDate}`,
            remuneration: `₹ ${r.monthlyPay.toLocaleString('en-IN')}`,
            status: r.status
          });
        });
      }
    },
    error: () => {}
  });
}

  public loadEmployeeDocuments(employeeId?: number): void {
    const empId = employeeId || Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.getDocuments(empId).subscribe({
      next: res => {
        if (res && res.data && res.data.length > 0) {
          const mapped: ProfileDocument[] = res.data.map(d => ({
            id: d.documentId,
            name: d.name,
            category: d.category,
            fileType: d.contentType && d.contentType.includes('pdf') ? 'PDF' : (d.contentType && d.contentType.includes('png') ? 'PNG' : 'JPG'),
            fileName: d.fileName,
            size: d.sizeFormatted || `${Math.round(d.fileSize / 1024)} KB`,
            uploadedOn: d.uploadedOn,
            status: (d.status === 'Verified' ? 'Verified' : d.status === 'Rejected' ? 'Rejected' : 'Pending') as any,
            filePath: d.filePath,
            rejectionRemarks: d.rejectionRemarks,
            documentTypeId: d.documentTypeId
          }));
          this.documents.set(mapped);
        } else {
          this.documents.set([]);
        }
      },
      error: () => {
        this.documents.set([]);
      }
    });
  }

  readonly contract: ContractInfo = {
    contractNo: 'CTC/2024/001',
    contractType: 'Fixed Term',
    startDate: '2024-04-01',
    endDate: '2027-03-31',
    payStructure: 'Level 6 (IT)',
    remuneration: '₹ 45,000 (Consolidated)',
    appointmentOrderNo: 'AO/2024/117',
    appointmentOrderDate: '2024-03-25',
    issuingAuthority: 'Director (IT)',
    status: 'Active',
    remarks: '-',
  };

  readonly employmentTimeline = [
    { title: '01 Apr 2024 – 31 Mar 2027', sub: 'Current Contract Period', badge: 'Active', green: true },
    { title: '01 Apr 2024', sub: 'Joining Date', badge: '', green: false },
    { title: '25 Mar 2024', sub: 'Appointment Order Issued', badge: '', green: false },
  ];

  readonly orgHistory: HistoryRow[] = [
    { from: '2024-04-01', to: 'Till date', department: 'IT Department', office: 'Main Secretariat, Patna', unit: 'Application Support', order: 'AO/2024/117' },
  ];

  readonly contractHistory: HistoryRow[] = [
    { contractNo: 'CTC/2024/001-R2', period: '01 Apr 2026 – 31 Mar 2027', remuneration: '₹ 45,000', status: 'Active' },
    { contractNo: 'CTC/2024/001-R1', period: '01 Apr 2025 – 31 Mar 2026', remuneration: '₹ 40,000', status: 'Completed' },
    { contractNo: 'CTC/2024/001', period: '01 Apr 2024 – 31 Mar 2025', remuneration: '₹ 36,000', status: 'Completed' },
  ];

  readonly statusHistory: HistoryRow[] = [
    { date: '2024-04-01', status: 'Active', remark: 'Joined on duty', by: 'Establishment Officer' },
    { date: '2024-03-28', status: 'Verified', remark: 'Documents verified before joining', by: 'Department HR' },
  ];

  readonly reportingHistory: HistoryRow[] = [
    { from: '2024-04-01', to: 'Till date', officer: 'Ms. Priya Verma', designation: 'Joint Director', order: 'AO/2024/117' },
  ];

  readonly documents = signal<ProfileDocument[]>([]);

  readonly history = signal<ChangeLog[]>([
    { date: '2026-09-15', section: 'Personal Information', change: 'Marital status updated to Married', by: 'HR', status: 'Approved' },
    { date: '2026-08-10', section: 'Contact & Address', change: 'Present address changed to Rajendra Nagar, Patna', by: 'HR', status: 'Approved' },
    { date: '2026-08-05', section: 'Bank Details', change: 'Bank account verified', by: 'Accounts', status: 'Approved' },
    { date: '2024-08-12', section: 'Personal Information', change: 'Photograph uploaded', by: 'Rahul Sharma', status: 'Approved' },
    { date: '2024-03-28', section: 'Profile', change: 'Profile created and verified at joining', by: 'Department HR', status: 'Approved' },
  ]);

  readonly recentUpdates = computed(() =>
    this.history()
      .slice(0, 3)
      .map((h) => ({ title: h.change.length > 30 ? h.section + ' updated' : h.change, date: h.date, by: h.by, green: h.status === 'Approved' })),
  );

  // ------------------------------------------------------------------ computed helpers
  readonly contractDaysLeft = computed(() => {
    const end = new Date(this.employment.effectiveTo).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((end - today) / 86400000));
  });

  readonly entryProgress = computed(() => {
    const s = this.saved();
    const done = Object.values(s).filter(Boolean).length;
    return { done, total: Object.keys(s).length, percent: Math.round((done / Object.keys(s).length) * 100) };
  });

  readonly isSubmitting = signal<boolean>(false);

  // ------------------------------------------------------------------ save (Profile Entry)
  buildProfilePayload(status: 'DRAFT' | 'ACTIVE' = 'ACTIVE'): any {
    const d = this.data();
    return {
      recordStatus: status,
      personal: d.personal,
      identity: d.identity,
      family: d.family,
      contact: d.contact,
      presentAddress: d.presentAddress,
      permanentAddress: d.permanentAddress,
      qualification: {
        education: d.education,
        experience: d.experience,
        skills: d.skills,
      },
      bank: d.bank,
      nominees: d.nominees,
      emergency: d.emergency,
      photo: d.photo,
      // Compatibility mapping for existing /api/employees backend DTO
      employeeName: d.personal.fullName,
      employeeNameHindi: d.personal.fullNameHindi,
      dateOfBirth: d.personal.dob || null,
      fatherName: d.personal.fatherName,
      motherName: d.personal.motherName,
      officialEmail: d.contact.officialEmail,
      officialMobile: d.contact.mobile || d.contact.alternateMobile,
      address: {
        addressLine1: d.permanentAddress.line1,
        addressLine2: d.permanentAddress.line2,
        cityName: d.permanentAddress.city,
        pincode: d.permanentAddress.pincode,
        mobileNo: d.contact.mobile || d.contact.alternateMobile,
      },
      bankDetails: {
        accountHolderName: d.bank.holder,
        bankName: d.bank.bankName,
        branchName: d.bank.branch,
        ifscCode: d.bank.ifsc,
        accountNumber: d.bank.accountNumber,
        accountType: d.bank.accountType?.toUpperCase() || 'SAVINGS',
      },
      qualifications: d.education.map((e) => ({
        institutionName: e.board || e.course,
        passingYear: Number(e.year) || null,
        marksPercentage: Number(e.percentage) || null,
        rollNumber: '',
        grade: '',
      })),
      contract: {
        contractNumber: this.employment.employeeCode || 'CTC/2024/001',
        contractStatus: 'ACTIVE',
      },
    };
  }

  saveProfileToDatabase(payload?: any): Observable<ApiResponse<any>> {
    const empId = Number(this.authSession.user?.employeeId);
    if (empId && !isNaN(empId)) {
      return this.employeeApi.finalSubmit(empId) as any;
    }
    return of({ success: true, message: 'Profile saved successfully.', data: null } as any);
  }

  saveSection(tab: EntryTab, patch: Partial<ProfileData>, label: string): void {
    this.data.update((d) => ({ ...d, ...patch }));
    this.saved.update((s) => ({ ...s, [tab]: true }));
    this.history.update((h) => [
      { date: today(), section: label, change: `${label} saved as draft`, by: this.data().personal.fullName || 'Employee', status: 'Pending' },
      ...h,
    ]);
    this.persist();
    this.showToast(`${label} saved.`);
    this.syncDraftToApi(tab);
  }

  private syncDraftToApi(tab?: EntryTab): void {
    const empId = Number(this.authSession.user?.employeeId);
    if (!empId || isNaN(empId)) return;
    const d = this.data();

    if (!tab || tab === 'personal') {
      this.employeeApi.savePersonalDetails({
        employeeId: empId,
        contractNo: this.employment.employeeCode,
        employeeName: d.personal.fullName,
        employeeNameHindi: d.personal.fullNameHindi,
        dateOfBirth: d.personal.dob || null,
        genderId: d.personal.genderId || null,
        fatherName: d.personal.fatherName,
        motherName: d.personal.motherName,
        officialEmail: d.contact.officialEmail,
        officialMobile: d.contact.mobile,
        photo: d.photo
      }).subscribe({
        next: () => this.syncSessionUser(),
        error: (err) => console.error('Failed to sync personal details:', err)
      });
    }

    if (!tab || tab === 'contact') {
      const addresses: any[] = [];
      if (d.presentAddress.line1) {
        addresses.push({
          addressType: 'CURRENT',
          addressLine1: d.presentAddress.line1,
          addressLine2: d.presentAddress.line2,
          cityName: d.presentAddress.city,
          pincode: d.presentAddress.pincode,
          stateId: (d.presentAddress as any).stateId || 10,
          districtId: (d.presentAddress as any).districtId || 1,
          alternateMobile: d.contact.alternateMobile
        });
      }
      if (d.permanentAddress.line1) {
        addresses.push({
          addressType: 'PERMANENT',
          addressLine1: d.permanentAddress.line1,
          addressLine2: d.permanentAddress.line2,
          cityName: d.permanentAddress.city,
          pincode: d.permanentAddress.pincode,
          stateId: (d.permanentAddress as any).stateId || 10,
          districtId: (d.permanentAddress as any).districtId || 1,
          alternateMobile: d.contact.alternateMobile
        });
      }
      if (addresses.length > 0) {
        this.employeeApi.saveContactAddress({
          employeeId: empId,
          officialEmail: d.contact.officialEmail,
          officialMobile: d.contact.mobile,
          addresses
        }).subscribe({
          next: () => this.syncSessionUser(),
          error: (err) => console.error('Failed to sync contact address:', err)
        });
      }
    }

    if (!tab || tab === 'bank') {
      if (d.bank.accountNumber) {
        this.employeeApi.saveBankDetails({
          employeeId: empId,
          bankId: 1,
          bankName: d.bank.bankName,
          branchName: d.bank.branch,
          accountNumber: d.bank.accountNumber,
          accountHolderName: d.bank.holder,
          ifscCode: d.bank.ifsc,
          accountType: d.bank.accountType || 'SAVINGS',
          bankDocument: null
        }).subscribe({
          next: () => this.syncSessionUser(),
          error: (err) => console.error('Failed to sync bank details:', err)
        });
      }
    }

    if (!tab || tab === 'qualification') {
      const qualifications: any[] = (d.education || []).map((e, idx) => ({
        qualificationId: !isNaN(Number(e.qualification)) ? Number(e.qualification) : 1,
        institutionName: e.board || e.course || 'University',
        passingYear: Number(e.year) || null,
        rollNumber: '',
        registrationNumber: '',
        marksPercentage: Number(e.percentage) || null,
        grade: '',
        isHighestQualification: idx === (d.education.length - 1),
        documentId: null
      }));
      const experiences: any[] = (d.experience || []).map(e => ({
        organisation: e.organisation,
        designation: e.designation,
        fromDate: e.from ? (e.from.includes('T') ? e.from : e.from + 'T00:00:00Z') : null,
        toDate: e.to ? (e.to.includes('T') ? e.to : e.to + 'T00:00:00Z') : null,
        responsibilities: e.responsibilities || ''
      }));
      if (qualifications.length > 0 || experiences.length > 0) {
        this.employeeApi.saveQualificationExperience({
          employeeId: empId,
          qualifications,
          experiences
        }).subscribe({
          next: () => this.syncSessionUser(),
          error: (err) => console.error('Failed to sync qualification/experience:', err)
        });
      }
    }

    if (!tab || tab === 'nominee') {
      const nominees: any[] = (d.nominees || []).map(n => ({
        nomineeName: n.name,
        relationship: n.relation,
        dateOfBirth: n.dob ? (n.dob.includes('T') ? n.dob : n.dob + 'T00:00:00Z') : null,
        sharePercentage: Number(n.share) || null,
        address: n.address || ''
      }));
      const emergencyContacts: any[] = (d.emergency || []).map(e => ({
        contactName: e.name,
        relationship: e.relation,
        mobileNo: e.mobile,
        alternateMobile: null,
        address: e.address || ''
      }));
      if (nominees.length > 0 || emergencyContacts.length > 0) {
        this.employeeApi.saveNomineeEmergency({
          employeeId: empId,
          nominees,
          emergencyContacts
        }).subscribe({
          next: () => this.syncSessionUser(),
          error: (err) => console.error('Failed to sync nominee/emergency:', err)
        });
      }
    }
  }

  setPhoto(dataUrl: string): void {
    this.data.update((d) => ({ ...d, photo: dataUrl, photoUploadedOn: today() }));
    this.persist();
  }

  markSubmitted(): void {
    this.submitted.set(true);
    localStorage.setItem(STORE_KEY + '_submitted', '1');
    this.history.update((h) => [
      { date: today(), section: 'Profile', change: 'Profile submitted for verification', by: this.data().personal.fullName, status: 'Pending' },
      ...h,
    ]);
  }

  submitForVerification(): boolean {
    if (this.entryProgress().done < this.entryProgress().total) {
      this.showToast('Save every section before submitting.', 'error');
      return false;
    }
    this.markSubmitted();
    this.showToast('Profile submitted for verification.');
    return true;
  }

  /** Testing ke liye: static data wapas */
  reset(): void {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_KEY + '_saved');
    localStorage.removeItem(STORE_KEY + '_submitted');
    this.data.set(defaultProfile());
    this.saved.set(emptySaved());
    this.submitted.set(false);
  }

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ type, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  // ------------------------------------------------------------------ storage
  private persist(): void {
    const userId = this.authSession.user?.userId || 'common';
    try {
      localStorage.setItem(`${STORE_KEY}_${userId}`, JSON.stringify(this.data()));
      localStorage.setItem(`${STORE_KEY}_saved_${userId}`, JSON.stringify(this.saved()));
    } catch {
      /* storage band ho to sirf is session me rahega */
    }
  }

  private load(): ProfileData {
    const user = this.authSession.user;
    if (user?.userId) {
      return this.loadForUser(user.userId);
    }
    return defaultProfile();
  }

  private loadForUser(userId: string): ProfileData {
    try {
      const raw = localStorage.getItem(`${STORE_KEY}_${userId}`);
      if (raw) return { ...defaultProfile(), ...(JSON.parse(raw) as ProfileData) };
    } catch {
      /* kharab data */
    }
    return defaultProfile();
  }

  private loadSaved(): Record<EntryTab, boolean> {
    const userId = this.authSession.user?.userId || 'common';
    try {
      const raw = localStorage.getItem(`${STORE_KEY}_saved_${userId}`);
      if (raw) return { ...emptySaved(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return emptySaved();
  }
}

// ====================================================================== helpers
function emptySaved(): Record<EntryTab, boolean> {
  return { personal: false, contact: false, qualification: false, bank: false, nominee: false, review: false };
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Static data (reference screens jaisa) */
// export function defaultProfile(): ProfileData {
//   return {
//     photo: null,
//     photoUploadedOn: '2024-08-12',
//     personal: {
//       title: 'Ms.',
//       fullName: 'Neha Kumari',
//       fullNameHindi: 'नेहा कुमारी',
//       dob: '1988-03-15',
//       gender: 'Male',
//       maritalStatus: 'Married',
//       bloodGroup: 'B+',
//       nationality: 'Indian',
//       religion: 'Hindu',
//       fatherName: 'Rajesh Sharma',
//       motherName: 'Sunita Sharma',
//       spouseName: 'Anita Sharma',
//       motherTongue: 'Hindi',
//       languages: 'Hindi, English, Bhojpuri',
//       identificationMark: 'Mole on the left cheek',
//     },
//     identity: [
//       { type: 'Aadhaar Card', number: 'XXXX-XXXX-1234', issueDate: '2015-01-10', expiryDate: '', status: 'Verified' },
//       { type: 'PAN Card', number: 'ABCDE1234F', issueDate: '2018-03-15', expiryDate: '', status: 'Verified' },
//       { type: 'Voter ID', number: 'SDA1234567', issueDate: '2016-02-12', expiryDate: '', status: 'Verified' },
//     ],
//     family: [
//       { name: 'Anita Sharma', relation: 'Spouse', dob: '1991-06-20', occupation: 'Teacher', dependent: false },
//       { name: 'Aarav Sharma', relation: 'Son', dob: '2016-11-02', occupation: 'Student', dependent: true },
//       { name: 'Rajesh Sharma', relation: 'Father', dob: '1958-01-05', occupation: 'Retired', dependent: true },
//       { name: 'Sunita Sharma', relation: 'Mother', dob: '1962-09-14', occupation: 'Homemaker', dependent: true },
//     ],
//     contact: {
//       mobile: '9876543210',
//       alternateMobile: '8765432109',
//       officialEmail: 'rahul.sharma@nic.in',
//       personalEmail: 'rahul@gmail.com',
//       landline: '011-23091234',
//     },
//     presentAddress: { line1: 'Flat No. 302, Shanti Residency', line2: 'Rajendra Nagar', city: 'Patna', district: 'Patna', state: 'Bihar', pincode: '800016' },
//     permanentAddress: { line1: 'Vill. + P.O. - Dumraon', line2: '', city: 'Dumraon', district: 'Buxar', state: 'Bihar', pincode: '802119' },
//     education: [
//       { qualification: 'Matriculation (10th)', course: 'General', board: 'BSEB, Patna', year: '2003', percentage: '72.4', status: 'Verified' },
//       { qualification: 'Intermediate (12th)', course: 'Science', board: 'BSEB, Patna', year: '2005', percentage: '68.2', status: 'Verified' },
//       { qualification: 'Graduation', course: 'BCA', board: 'Patna University', year: '2008', percentage: '64.0', status: 'Verified' },
//       { qualification: 'Post Graduation', course: 'MCA', board: 'Aryabhatta Knowledge University', year: '2011', percentage: '71.5', status: 'Verified' },
//     ],
//     experience: [
//       { organisation: 'Bihar Skill Development Mission', designation: 'Computer Operator', from: '2016-06-01', to: '2024-03-15', responsibilities: 'Data entry, MIS reports and portal support' },
//       { organisation: 'Beltron, Patna', designation: 'Data Entry Operator', from: '2012-01-02', to: '2016-05-20', responsibilities: 'Office automation and record digitisation' },
//     ],
//     skills: ['MS Office', 'SQL', 'ASP.NET', 'Hindi Typing', 'Networking'],
//     bank: {
//       holder: 'Rahul Sharma',
//       bankName: 'State Bank of India',
//       branch: 'Boring Road, Patna',
//       ifsc: 'SBIN0003111',
//       accountNumber: '32145678901',
//       accountType: 'Savings',
//       status: 'Verified',
//       verifiedOn: '2026-08-05',
//     },
//     nominees: [
//       { name: 'Anita Sharma', relation: 'Spouse', dob: '1991-06-20', share: 60, address: 'Flat No. 302, Shanti Residency, Rajendra Nagar, Patna' },
//       { name: 'Aarav Sharma', relation: 'Son', dob: '2016-11-02', share: 40, address: 'Flat No. 302, Shanti Residency, Rajendra Nagar, Patna' },
//     ],
//     emergency: [
//       { name: 'Amit Kumar', relation: 'Brother', mobile: '9123456789', address: 'Patna, Bihar' },
//       { name: 'Anita Sharma', relation: 'Spouse', mobile: '9934567812', address: 'Patna, Bihar' },
//     ],
//   };
// }

export function defaultProfile(): ProfileData {
  return {
    photo: null,
    photoUploadedOn: '',

    personal: {
      title: '',
      fullName: '',
      fullNameHindi: '',
      dob: '',
      gender: '',
      genderId:0,
      maritalStatus: '',
      bloodGroup: '',
      nationality: '',
      religion: '',
      fatherName: '',
      motherName: '',
      spouseName: '',
      motherTongue: '',
      languages: '',
      identificationMark: '',
      aadhaarNumber: '234567890123',
      panNumber: 'ABCDE1234F'
    },

    identity: [],
    family: [],

    contact: {
      mobile: '',
      alternateMobile: '',
      officialEmail: '',
      personalEmail: '',
      landline: ''
    },

    presentAddress: {
      line1: '',
      line2: '',
      city: '',
      district: '',
      state: '',
      pincode: ''
    },

    permanentAddress: {
      line1: '',
      line2: '',
      city: '',
      district: '',
      state: '',
      pincode: ''
    },

    education: [],
    experience: [],
    skills: [],

    bank: {
      holder: '',
      bankName: '',
      branch: '',
      ifsc: '',
      accountNumber: '',
      accountType: '',
      status: 'Verified',
      verifiedOn: '',
      pfUanNumber: '101234567890'
    },

    nominees: [],
    emergency: []
  };
}
