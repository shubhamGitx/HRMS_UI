import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { API_ENDPOINT } from '../../apiEndpoints/api-endpoints';
import { ApiResponse } from '../../auth/auth.models';

export interface AccountInfo {
  officialId: number;
  userId: string;
  officialName: string;
  phone: string;
  email: string;
  designation: string;
  officeId: number;
  officeName: string;
}

export interface RequestMobileChangeOtpResponse {
  success: boolean;
  message: string;
  currentMobileMasked?: string;
  newMobileMasked?: string;
  testCurrentOtp?: string;
  testNewOtp?: string;
  expiresInSeconds: number;
}

export interface VerifyChangeMobileRequest {
  oldMobileOtp: string;
  newMobileOtp: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private api = inject(ApiService);

  getAccountInfo(): Observable<ApiResponse<AccountInfo>> {
    return this.api.get(API_ENDPOINT.ACCOUNT.INFO);
  }

  requestMobileChangeOtp(newMobile: string): Observable<ApiResponse<RequestMobileChangeOtpResponse>> {
    return this.api.post(API_ENDPOINT.ACCOUNT.REQUEST_MOBILE_OTP, { newMobile });
  }

  verifyChangeMobile(oldMobileOtp: string, newMobileOtp: string): Observable<ApiResponse<string>> {
    return this.api.post(API_ENDPOINT.ACCOUNT.VERIFY_CHANGE_MOBILE, { oldMobileOtp, newMobileOtp });
  }

  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<string>> {
    return this.api.post(API_ENDPOINT.ACCOUNT.CHANGE_PASSWORD, request);
  }
}
