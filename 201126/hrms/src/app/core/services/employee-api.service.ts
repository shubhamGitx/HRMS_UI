import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiResponse } from '../auth/auth.models';

// ===================== Master / Dropdown types =====================
export interface MasterOption {
  id: number;
  name: string;
  code?: string | null;
}

export interface ReportingOfficerOption {
  officialId: number;
  userId: string;
  officialName: string;
  designation?: string | null;
}

export interface EmployeeMasters {
  genders: MasterOption[];
  bloodGroups: MasterOption[];
  categories: MasterOption[];
  employmentStatuses: MasterOption[];
  employeeTypes: MasterOption[];
  offices: MasterOption[];
  designations: MasterOption[];
  idTypes: MasterOption[];
  states: MasterOption[];
  districts: MasterOption[];
  contractTypes?: MasterOption[];
  payStructures?: MasterOption[];
  qualifications: MasterOption[];
  documents: MasterOption[];
  banks: MasterOption[];
  reportingOfficers: ReportingOfficerOption[];
}

// ===================== List / Summary =====================
export interface EmployeeListItem {
  employeeId: number;
  contractNo: string;
  employeeName: string;
  officeName?: string;
  designationName?: string;
  reportingOfficerName?: string;
  recordStatus: string;
  officialMobile?: string;
  officialEmail?: string;
  completedSections: number;
}

export interface EmployeeSaveResult {
  success: boolean;
  message: string;
  employeeId: number;
  contractNo: string;
}

// ===================== Step 1 – Personal Details =====================
export interface PersonalDetailsRequest {
  employeeId?: number | null;
  contractNo?: string | null;
  employeeName: string;
  employeeNameHindi?: string | null;
  dateOfBirth?: string | null;
  genderId?: number | null;
  bloodGroupId?: number | null;
  fatherName?: string | null;
  motherName?: string | null;
  categoryId?: number | null;
  joiningDate?: string | null;
  employmentStatusId?: number | null;
  employeeTypeId?: number | null;
  officeId?: number | null;
  designationId?: number | null;
  reportingOfficialId?: number | null;
  idName?: string | null;
  idNumber?: string | null;
  officialEmail?: string | null;
  officialMobile?: string | null;
  photo?: string | null;
}

// Personal details response shape (Risha API)
export interface PersonalDetailsApiData {
  employeeId?: number;
  contractNo?: string;
  employeeName?: string;
  employeeNameHindi?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  genderId?: number | null;
  genderName?: string;
  bloodGroupId?: number | null;
  bloodGroupName?: string;
  categoryId?: number | null;
  categoryName?: string;
  joiningDate?: string;
  employmentStatusId?: number | null;
  employmentStatusName?: string;
  employeeTypeId?: number | null;
  employeeTypeName?: string;
  officeId?: number | null;
  officeName?: string;
  designationId?: number | null;
  designationName?: string;
  reportingOfficialId?: number | null;
  reportingOfficialName?: string;
  idName?: string;
  idNumber?: string;
  officialEmail?: string;
  officialMobile?: string;
  photo?: string;
  recordStatus?: string;
  personalDetails?: PersonalDetailsApiData;
}

// ===================== Step 2 – Contact & Address =====================
export interface AddressItemRequest {
  addressType: 'PERMANENT' | 'CURRENT';
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  stateId: number;
  districtId: number;
  cityName: string;
  pincode: string;
  alternateMobile?: string | null;
}

export interface ContactAddressRequest {
  employeeId: number;
  officialEmail?: string | null;
  officialMobile?: string | null;
  addresses: AddressItemRequest[];
}

export interface AddressItemResponse {
  addressType: string;
  addressLine1: string;
  addressLine2: string | null;
  cityName: string;
  pincode: string;
  stateName: string;
  stateId: number | null;
  districtName: string;
  districtId: number | null;
  alternateMobile: string | null;
}

export interface EmployeeAddressDetailsResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  contactAddress: {
    employeeId: number;
    officialEmail: string | null;
    officialMobile: string | null;
    addresses: AddressItemResponse[];
  };
}

// ===================== Step 3 – Qualification & Experience =====================
export interface QualificationItemResponse {
  qualificationId: number;
  qualificationName?: string | null;
  institutionName: string;
  passingYear: number | null;
  rollNumber: string | null;
  registrationNumber: string | null;
  marksPercentage: number | null;
  grade: string | null;
  isHighestQualification: boolean;
  documentId: number | null;
}

export interface ExperienceItemResponse {
  organisation: string;
  designation: string;
  fromDate: string | null;
  toDate: string | null;
  responsibilities: string | null;
}

export interface EmployeeQualificationDetailsResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  qualificationExperience: {
    employeeId: number;
    qualifications: QualificationItemResponse[];
    experiences: ExperienceItemResponse[];
  };
}

export interface QualificationItemRequest {
  qualificationId: number;
  institutionName: string;
  passingYear?: number | null;
  rollNumber?: string | null;
  registrationNumber?: string | null;
  marksPercentage?: number | null;
  grade?: string | null;
  isHighestQualification: boolean;
  documentId?: number | null;
}

export interface ExperienceItemRequest {
  organisation: string;
  designation: string;
  fromDate?: string | null;
  toDate?: string | null;
  responsibilities?: string | null;
}

export interface QualificationExperienceRequest {
  employeeId: number;
  qualifications: QualificationItemRequest[];
  experiences: ExperienceItemRequest[];
}

// ===================== Step 4 – Bank Details =====================
export interface BankDetailsRequest {
  employeeId: number;
  bankId: number;
  bankName?: string | null;
  branchName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  ifscCode: string | null;
  accountType: string | null;
  bankDocument: string | null;
}

export interface BankDetailsApiResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  bankDetails: BankDetailsRequest;
}

// ===================== Step 5 – Nominee & Emergency =====================
export interface NomineeItemRequest {
  nomineeName: string;
  relationship: string;
  dateOfBirth?: string | null;
  sharePercentage?: number | null;
  address?: string | null;
}

export interface EmergencyContactItemRequest {
  contactName: string;
  relationship: string;
  mobileNo: string;
  alternateMobile?: string | null;
  address?: string | null;
}

export interface NomineeEmergencyRequest {
  employeeId: number;
  nominees: NomineeItemRequest[];
  emergencyContacts: EmergencyContactItemRequest[];
}

export interface NomineeItemResponse {
  nomineeName: string;
  relationship: string;
  dateOfBirth: string | null;
  sharePercentage: number | null;
  address: string | null;
}

export interface NomineeApiResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  nominees: NomineeItemResponse[];
}

// ===================== Full profile response =====================
export interface EmployeeFullProfileResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  personalDetails?: PersonalDetailsApiData;
  [key: string]: any;
}

// ===================== Service =====================
@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private readonly api = inject(ApiService);

  // ── Masters ──
  masters(): Observable<ApiResponse<EmployeeMasters>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.MASTERS);
  }

  // ── Employee list ──
  list(): Observable<ApiResponse<EmployeeListItem[]>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.LIST);
  }

  // ── Risha API: Personal details ──
  getPersonalDetails(id: number): Observable<ApiResponse<EmployeeFullProfileResponse>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_PERSONAL_DETAILS(id));
  }

  // ── Risha API: Address details ──
  getAddressDetails(id: number): Observable<ApiResponse<EmployeeAddressDetailsResponse>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_ADDRESS_DETAILS(id));
  }

  // ── Risha API: Qualification & Experience ──
  getQulificationDetails(id: number): Observable<ApiResponse<EmployeeQualificationDetailsResponse>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_QUALIFICATION(id));
  }

  // ── Risha API: Bank details ──
  getBnakDetails(id: number): Observable<ApiResponse<BankDetailsApiResponse>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_BANK_DETAILS(id));
  }

  // ── Risha API: Nominee details ──
  getNomineeDetails(id: number): Observable<ApiResponse<NomineeApiResponse>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_NOMINEE_DETAILS(id));
  }

  // ── Risha API: Emergency Contact details ──
  getEmergencyContactDetails(id: number): Observable<ApiResponse<{ emergencyContacts: any[] }>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_EMERGENCY_DETAILS(id));
  }

  // ── Save – Step 1: Personal Details ──
  savePersonalDetails(data: PersonalDetailsRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.SAVE_PERSONAL_DETAILS, data);
  }

  // ── Save – Step 2: Contact & Address ──
  saveContactAddress(data: ContactAddressRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.SAVE_CONTACT_ADDRESS, data);
  }

  // ── Save – Step 3: Qualification & Experience ──
  saveQualificationExperience(data: QualificationExperienceRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.SAVE_QUALIFICATION, data);
  }

  // ── Save – Step 4: Bank Details ──
  saveBankDetails(data: BankDetailsRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.SAVE_BANK_DETAILS, data);
  }

  // ── Save – Step 5: Nominee & Emergency Contacts ──
  saveNomineeEmergency(data: NomineeEmergencyRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.SAVE_NOMINEE_EMERGENCY, data);
  }

  // ── Final Submit ──
  finalSubmit(employeeId: number): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.FINAL_SUBMIT(employeeId), {});
  }

  // ── Employee Documents ──
  getDocuments(id: number): Observable<ApiResponse<EmployeeDocumentApiItem[]>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_DOCUMENTS(id));
  }

  downloadDocument(empId: number, docId: number): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.EMPLOYEE.DOWNLOAD_DOCUMENT(empId, docId));
  }

  uploadDocument(empId: number, formData: FormData): Observable<ApiResponse<number>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.UPLOAD_DOCUMENT(empId), formData);
  }

  deleteDocument(empId: number, docId: number): Observable<ApiResponse<boolean>> {
    return this.api.delete(API_ENDPOINT.EMPLOYEE.DELETE_DOCUMENT(empId, docId));
  }

  // ── Dedicated Document Management Endpoints ──
  getDocumentTypes(): Observable<ApiResponse<{ id: number; name: string }[]>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.DOCUMENT_TYPES);
  }

  getVerifiedDocuments(empId?: number): Observable<ApiResponse<EmployeeDocumentApiItem[]>> {
    const url = empId ? `${API_ENDPOINT.EMPLOYEE.VERIFIED_DOCUMENTS}?employeeId=${empId}` : API_ENDPOINT.EMPLOYEE.VERIFIED_DOCUMENTS;
    return this.api.get(url);
  }

  viewDocumentFile(docId: number): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.EMPLOYEE.VIEW_DOC(docId));
  }

  downloadDocumentFile(docId: number): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.EMPLOYEE.DOWNLOAD_DOC(docId));
  }

  uploadEmployeeDoc(formData: FormData): Observable<ApiResponse<number>> {
    return this.api.post(API_ENDPOINT.EMPLOYEE.UPLOAD_DOC, formData);
  }

  // ── Employee Profile Change Logs ──
  getChangeLogs(id: number): Observable<ApiResponse<ProfileChangeLogApiItem[]>> {
    return this.api.get(API_ENDPOINT.EMPLOYEE.GET_HISTORY(id));
  }

  // ── Employee Dashboard Stats ──
  getEmployeeDashboardStats(): Observable<ApiResponse<EmployeeDashboardStatsApiData>> {
    return this.api.get(API_ENDPOINT.DASHBOARD.EMPLOYEE_STATS);
  }
}

export interface EmployeeDocumentApiItem {
  documentId: number;
  employeeId: number;
  documentTypeId?: number | null;
  name: string;
  category: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  sizeFormatted: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  uploadedOn: string;
  filePath?: string;
  rejectionRemarks?: string | null;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
}

export interface ProfileChangeLogApiItem {
  id: number;
  date: string;
  section: string;
  change: string;
  by: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export interface EmployeeDashboardStatsApiData {
  leavesAvailable: number;
  pendingLeaveRequests: number;
  contractStatus: string;
  contractValidTill: string;
  contractNumber: string;
  presentDays: string;
  attendancePercentage: string;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  employeeType?: string;
  reportingOfficer?: string;
  remainingDays?: number;
  leaveType?: string;
  presentDaysCount?: number;
  totalWorkingDays?: number;
  salaryStatus?: string;
  absentDaysCount?: number;
  leaveDaysCount?: number;
  weeklyOffCount?: number;
  lateEarlyCount?: number;
  attendanceRate?: number;
}
