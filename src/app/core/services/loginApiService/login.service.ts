import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api.service';
import { ApiUserRole } from '../../auth/auth.models';
import { API_ENDPOINT } from '../../apiEndpoints/api-endpoints';


@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private api = inject(ApiService);

  requestOtp(payload: { userId: string, password: string, userRole: ApiUserRole, langCode: 1 | 2}) {
    return this.api.post(API_ENDPOINT.AUTH.REQUEST_OTP, payload);
  }

  verifyOtp(payload: {userId: string, otp: string, userRole: ApiUserRole, langCode: 1 | 2 }) {
    return this.api.post(API_ENDPOINT.AUTH.VERIFY_OTP, {
    ...payload,
    otpType: 'Login'
  });
  }
}