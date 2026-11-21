import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { API_ENDPOINT } from '../../apiEndpoints/api-endpoints';
import { ApiResponse } from '../../auth/auth.models';
import { EmployeeListItem } from '../../../pages/admin/employees/employee-list/employee-list';
import {
  BankDetailsRequest,
  ContactAddressRequest,
  EmployeeFullProfileResponse,
  EmployeeMasters,
  EmployeeSaveResult,
  NomineeEmergencyRequest,
  PersonalDetailsRequest,
  QualificationExperienceRequest
} from '../../../pages/admin/profile-entry/profile-entry.models';

export interface DashboardStatsResponse {
  totalActiveStaff: number;
  presentToday: number;
  pendingLeaveRequests: number;
  contractsForRenewal: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminEmployeeService {
  private api = inject(ApiService);

  /**
   * Fetch current department employee overview/list
   */
  getEmployeeList(): Observable<ApiResponse<EmployeeListItem[]>> {
    return this.api.get(API_ENDPOINT.ADMIN.GET_EMPLOYEE_DETAILS);
  }

  personalDetails(): Observable<any> {
    return this.api.get(API_ENDPOINT.ADMIN.GET_EMPLOYEE_DETAILS);
  }

  /**
   * Fetch full employee profile / draft by ID for resume and edit
   */
  getFullProfile(employeeId: number): Observable<ApiResponse<EmployeeFullProfileResponse>> {
    return this.api.get(API_ENDPOINT.ADMIN.GET_FULL_PROFILE(employeeId));
  }

  /**
   * Fetch all master dropdown data for profile entry (Genders, Categories, Designations, Offices, etc.)
   */
  getMasters(): Observable<EmployeeMasters> {
    return this.api.get(API_ENDPOINT.ADMIN.GET_MASTERS).pipe(
      map((res: ApiResponse<EmployeeMasters>) => res.data as EmployeeMasters)
    );
  }

  /**
   * Step 1: Save Personal Details (Creates or updates draft employee record)
   */
  savePersonalDetails(data: PersonalDetailsRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_PERSONAL_DETAILS, data);
  }

  /**
   * Step 2: Save Contact & Address Details
   */
  saveContactAddress(data: ContactAddressRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_CONTACT_ADDRESS, data);
  }

  /**
   * Step 3: Save Qualification & Experience Details
   */
  saveQualificationExperience(data: QualificationExperienceRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_QUALIFICATION_EXPERIENCE, data);
  }

  /**
   * Step 4: Save Bank Details
   */
  saveBankDetails(data: BankDetailsRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_BANK_DETAILS, data);
  }

  /**
   * Step 5: Save Nominee & Emergency Contacts
   */
  saveNomineeEmergency(data: NomineeEmergencyRequest): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_NOMINEE_EMERGENCY, data);
  }

  /**
   * Step 6: Final Activation & Submit (Generates employee login account)
   */
  finalSubmit(employeeId: number): Observable<ApiResponse<EmployeeSaveResult>> {
    return this.api.post(API_ENDPOINT.ADMIN.POST_FINAL_SUBMIT(employeeId), {});
  }

  /**
   * Fetch DADM Dashboard KPI Statistics
   */
  getDashboardStats(): Observable<ApiResponse<DashboardStatsResponse>> {
    return this.api.get(API_ENDPOINT.DASHBOARD.STATS);
  }
}

// Backward-compatible alias for existing code
export { AdminEmployeeService as aEmployeeDetails };
