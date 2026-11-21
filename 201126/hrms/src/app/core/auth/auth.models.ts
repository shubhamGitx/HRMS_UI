export type ApiUserRole = 'Employee' | 'Official';
export type OtpType = 'Login' | 'ForgotPassword';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface OtpResult {
  userId: string;
  otpType: OtpType;
  validUntil: string;
  expiresInSeconds: number;
  developmentOtp?: string;
}

export interface AuthenticatedUser {
  userId: string;
  employeeId: number | null;
  officialId: number | null;
  userName: string;
  userRole: ApiUserRole;
  departmentId: number | null;
  officeId: number | null;
  roleId: number;
  roleCode: string;
  langCode: 1 | 2;
  loginSessionId: string;
  reportingOfficialId: number | null;
  reportingOfficialName: string | null;
}

export interface LoginResult {
  accessToken: string;
  expiresAt: string;
  user: AuthenticatedUser;
  landingRoute: string;
}
