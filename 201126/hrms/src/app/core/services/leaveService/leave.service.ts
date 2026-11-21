import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { API_ENDPOINT } from '../../apiEndpoints/api-endpoints';
import { ApiResponse } from '../../auth/auth.models';

export interface LeaveReasonDto {
  id: number;
  reasonName: string;
  description?: string;
  isActive: boolean;
}

export interface HolidayDto {
  holidayId: number;
  holidayDate: string;
  holidayName: string;
  holidayType: string;
  description?: string;
}

export interface LeaveCalculationRequest {
  employeeId?: number;
  fromDate: string;
  toDate: string;
  leaveTypeId?: number;
  isHalfDay?: boolean;
  fromDayType?: string;
  fromHalfSession?: string;
  toDayType?: string;
  toHalfSession?: string;
}

export interface ChargeableLeaveBreakdownDto {
  chargeableDays: number;
  totalCalendarDays: number;
  holidayDaysCount: number;
  weeklyOffDaysCount: number;
  isFromDateHoliday: boolean;
  fromDateHolidayName?: string;
  isToDateHoliday: boolean;
  toDateHolidayName?: string;
  isValid: boolean;
  validationMessage?: string;
  excludedHolidays: HolidayDto[];
  excludedWeeklyOffDates: string[];
}

export interface ApplyLeaveRequest {
  employeeId?: number;
  leaveTypeId: number;
  leaveReasonId: number;
  fromDate: string;
  toDate: string;
  reason?: string;
  isHalfDay?: boolean;
  fromDayType?: string;
  fromHalfSession?: string;
  toDayType?: string;
  toHalfSession?: string;
}

export interface ApplyLeaveResult {
  success: boolean;
  message: string;
  leaveId?: number;
  totalDays: number;
  remainingBalance?: number;
  totalCalendarDays?: number;
  holidayDaysCount?: number;
  weeklyOffDaysCount?: number;
  financialYear: string;
}

export interface LeaveBalanceDto {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  annualAllowed: number;
  consumedApproved: number;
  pendingApplied: number;
  balance: number;
}

export interface LeavePolicyDto {
  policyId: number;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  departmentId?: number;
  departmentCode?: string;
  departmentName?: string;
  annualEntitlement: number;
  maxConsecutiveDays: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  allowHalfDay: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  isDepartmentSpecific: boolean;
}

export interface EmployeeLeaveEntitlementDto {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  annualEntitlement: number;
  eligibleCarryForward: number;
  totalAllocatedQuota: number;
  usedLeaves: number;
  pendingLeaves: number;
  availableBalance: number;
  maxConsecutiveDays: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  allowHalfDay: boolean;
  policyId?: number;
  departmentId?: number;
  departmentName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  hasPolicyConflict: boolean;
  conflictMessage?: string;
}

export interface SaveLeavePolicyRequest {
  policyId?: number;
  leaveTypeId: number;
  departmentId?: number;
  annualEntitlement: number;
  maxConsecutiveDays: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  allowHalfDay: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface EmployeeLeaveDto {
  leaveId: number;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveReasonId?: number;
  reasonName?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  financialYear: string;
  reason?: string;
  leaveStatus: string; // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  rejectionReason?: string;
  cancellationReason?: string;
  appliedDate: string;
  actionDate?: string;
  cancelledAt?: string;
  isHalfDay?: boolean;
  halfDaySession?: string;
  fromDayType?: string;
  fromHalfSession?: string;
  toDayType?: string;
  toHalfSession?: string;
}

export interface ManagerPendingLeaveDto {
  leaveId: number;
  employeeId: number;
  empName: string;
  contractNo: string;
  designationName: string;
  officeName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveReasonId?: number;
  reasonName?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  financialYear: string;
  reason?: string;
  leaveStatus: string;
  appliedDate: string;
  isHalfDay?: boolean;
  halfDaySession?: string;
  fromDayType?: string;
  fromHalfSession?: string;
  toDayType?: string;
  toHalfSession?: string;
}

export interface ActionLeaveRequest {
  leaveId: number;
  action: 'APPROVE' | 'REJECT' | 'CANCEL';
  rejectionReason?: string;
  cancellationReason?: string;
}

export interface ActionLeaveResult {
  success: boolean;
  message: string;
  leaveId?: number;
  newStatus: string;
}

export interface CancelLeaveRequest {
  leaveId: number;
  cancellationReason?: string;
}

export interface CancelLeaveResult {
  success: boolean;
  message: string;
  leaveId?: number;
  restoredDays: number;
  newStatus: string;
}

export interface ManagerLeaveHistoryDto {
  leaveId: number;
  employeeId: number;
  empName: string;
  contractNo: string;
  designationName: string;
  officeName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveReasonId?: number;
  reasonName?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  financialYear: string;
  reason?: string;
  leaveStatus: string;
  rejectionReason?: string;
  cancellationReason?: string;
  appliedDate: string;
  actionDate?: string;
  actionOfficialName?: string;
}

export interface ManagerQuotaReportDto {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  totalSanctionedDays: number;
  totalAllocatedDays: number;
  utilizationPercentage: number;
}

export interface ManagerLeaveStatsDto {
  pendingApprovalCount: number;
  sanctionedThisMonthCount: number;
  staffOnLeaveTodayCount: number;
  totalSubordinatesCount: number;
  quotaUtilization: ManagerQuotaReportDto[];
}

export interface SubordinateLeaveRegisterDto {
  employeeId: number;
  empName: string;
  contractNo: string;
  designationName: string;
  officeName: string;
  clDays: number;
  elDays: number;
  plDays: number;
  slDays: number;
  totalDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private readonly api = inject(ApiService);

  getLeaveReasons(): Observable<ApiResponse<LeaveReasonDto[]>> {
    return this.api.get<ApiResponse<LeaveReasonDto[]>>(API_ENDPOINT.LEAVE.REASONS);
  }

  getHolidays(year?: number): Observable<ApiResponse<HolidayDto[]>> {
    let params = new HttpParams();
    if (year && year > 0) {
      params = params.set('year', year.toString());
    }
    return this.api.get<ApiResponse<HolidayDto[]>>(API_ENDPOINT.LEAVE.HOLIDAYS, { params });
  }

  calculateChargeableDays(request: LeaveCalculationRequest): Observable<ApiResponse<ChargeableLeaveBreakdownDto>> {
    return this.api.post<ApiResponse<ChargeableLeaveBreakdownDto>>(API_ENDPOINT.LEAVE.CALCULATE_DAYS, request);
  }

  applyLeave(request: ApplyLeaveRequest): Observable<ApiResponse<ApplyLeaveResult>> {
    return this.api.post<ApiResponse<ApplyLeaveResult>>(API_ENDPOINT.LEAVE.APPLY, request);
  }

  getLeaveBalances(employeeId?: number, financialYear?: string): Observable<ApiResponse<LeaveBalanceDto[]>> {
    let params = new HttpParams();
    if (employeeId && employeeId > 0) {
      params = params.set('employeeId', employeeId.toString());
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<LeaveBalanceDto[]>>(API_ENDPOINT.LEAVE.BALANCES, { params });
  }

  getMyLeaves(employeeId?: number): Observable<ApiResponse<EmployeeLeaveDto[]>> {
    let params = new HttpParams();
    if (employeeId && employeeId > 0) {
      params = params.set('employeeId', employeeId.toString());
    }
    return this.api.get<ApiResponse<EmployeeLeaveDto[]>>(API_ENDPOINT.LEAVE.MY_LEAVES, { params });
  }

  getPendingApplications(officialId?: number): Observable<ApiResponse<ManagerPendingLeaveDto[]>> {
    let params = new HttpParams();
    if (officialId && officialId > 0) {
      params = params.set('officialId', officialId.toString());
    }
    return this.api.get<ApiResponse<ManagerPendingLeaveDto[]>>(API_ENDPOINT.LEAVE.PENDING_APPLICATIONS, { params });
  }

  getManagerLeaveHistory(officialId?: number, status?: string): Observable<ApiResponse<ManagerLeaveHistoryDto[]>> {
    let params = new HttpParams();
    if (officialId && officialId > 0) {
      params = params.set('officialId', officialId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.api.get<ApiResponse<ManagerLeaveHistoryDto[]>>(API_ENDPOINT.LEAVE.MANAGER_HISTORY, { params });
  }

  getManagerLeaveStats(officialId?: number): Observable<ApiResponse<ManagerLeaveStatsDto>> {
    let params = new HttpParams();
    if (officialId && officialId > 0) {
      params = params.set('officialId', officialId.toString());
    }
    return this.api.get<ApiResponse<ManagerLeaveStatsDto>>(API_ENDPOINT.LEAVE.MANAGER_STATS, { params });
  }

  getManagerSubordinateRegister(officialId?: number, financialYear?: string): Observable<ApiResponse<SubordinateLeaveRegisterDto[]>> {
    let params = new HttpParams();
    if (officialId && officialId > 0) {
      params = params.set('officialId', officialId.toString());
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<SubordinateLeaveRegisterDto[]>>(API_ENDPOINT.LEAVE.MANAGER_REGISTER, { params });
  }

  actionLeave(request: ActionLeaveRequest): Observable<ApiResponse<ActionLeaveResult>> {
    return this.api.post<ApiResponse<ActionLeaveResult>>(API_ENDPOINT.LEAVE.ACTION, request);
  }

  cancelLeave(request: CancelLeaveRequest): Observable<ApiResponse<CancelLeaveResult>> {
    return this.api.post<ApiResponse<CancelLeaveResult>>(API_ENDPOINT.LEAVE.CANCEL, request);
  }

  getLeavePolicies(departmentId?: number, leaveTypeId?: number, isActive?: boolean): Observable<ApiResponse<LeavePolicyDto[]>> {
    let params = new HttpParams();
    if (departmentId !== undefined && departmentId !== null) {
      params = params.set('departmentId', departmentId.toString());
    }
    if (leaveTypeId !== undefined && leaveTypeId !== null) {
      params = params.set('leaveTypeId', leaveTypeId.toString());
    }
    if (isActive !== undefined && isActive !== null) {
      params = params.set('isActive', isActive.toString());
    }
    return this.api.get<ApiResponse<LeavePolicyDto[]>>(API_ENDPOINT.LEAVE_POLICY.BASE, { params });
  }

  getLeavePolicyById(policyId: number): Observable<ApiResponse<LeavePolicyDto>> {
    return this.api.get<ApiResponse<LeavePolicyDto>>(`${API_ENDPOINT.LEAVE_POLICY.BASE}/${policyId}`);
  }

  getMyEntitlements(asOfDate?: string, financialYear?: string): Observable<ApiResponse<EmployeeLeaveEntitlementDto[]>> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<EmployeeLeaveEntitlementDto[]>>(API_ENDPOINT.LEAVE_POLICY.ME, { params });
  }

  getMyEntitlementByLeaveType(leaveTypeId: number, asOfDate?: string, financialYear?: string): Observable<ApiResponse<EmployeeLeaveEntitlementDto>> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<EmployeeLeaveEntitlementDto>>(`${API_ENDPOINT.LEAVE_POLICY.ME}/leave-type/${leaveTypeId}`, { params });
  }

  getEmployeeEntitlements(employeeId: number, asOfDate?: string, financialYear?: string): Observable<ApiResponse<EmployeeLeaveEntitlementDto[]>> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<EmployeeLeaveEntitlementDto[]>>(`${API_ENDPOINT.LEAVE_POLICY.EMPLOYEE}/${employeeId}`, { params });
  }

  getEmployeeEntitlementByLeaveType(employeeId: number, leaveTypeId: number, asOfDate?: string, financialYear?: string): Observable<ApiResponse<EmployeeLeaveEntitlementDto>> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.api.get<ApiResponse<EmployeeLeaveEntitlementDto>>(`${API_ENDPOINT.LEAVE_POLICY.EMPLOYEE}/${employeeId}/leave-type/${leaveTypeId}`, { params });
  }

  saveLeavePolicy(request: SaveLeavePolicyRequest): Observable<ApiResponse<number>> {
    return this.api.post<ApiResponse<number>>(API_ENDPOINT.LEAVE_POLICY.BASE, request);
  }
}
