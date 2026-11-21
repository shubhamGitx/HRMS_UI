import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { ApiUserRole } from '../../core/auth/auth.models';
import { LanguageCode, LanguageService } from '../../core/i18n/language.service';
import { LoginService } from '../../core/services/loginApiService/login.service';

type AuthView = 'login' | 'loginOtp' | 'forgotRequest' | 'forgotOtp' | 'resetPassword' | 'resetSuccess';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  view: AuthView = 'login';
  userRole: 'admin' | 'employee' = 'employee';
  userId = '';
  password = '';
  mobileNumber = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  rememberMe = false;
  showPassword = false;
  showNewPassword = false;
  submitted = false;
  errorMessage = '';
  developmentOtp = '';
  loading = false;
  resendSeconds = 30;
  private resendTimer?: ReturnType<typeof setInterval>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authSession = inject(AuthSessionService);
  public language = inject(LanguageService);
  private changeDetector = inject(ChangeDetectorRef);
  private loginServiceApi = inject(LoginService);

  constructor() {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.userRole = params['role'] === 'admin' ? 'admin' : 'employee';
      this.resetFlow();
      this.changeDetector.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  get portalName(): string {
    return this.userRole === 'admin' ? this.t('officialLogin', 'Official Login') : this.t('employeeLogin', 'Employee Login');
  }

  get idLabel(): string {
    return this.userRole === 'admin' ? this.t('officialUserId', 'Official User ID') : this.t('userId', 'User ID');
  }

  get maskedMobile(): string {
    const digits = this.mobileNumber.replace(/\D/g, '');
    return digits.length === 10 ? `******${digits.slice(-4)}` : '******3210';
  }

  requestLoginOtp(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.userId.trim() || !this.password) return;
    this.loading = true;
    const payload = {
      userId : this.userId.trim(), 
      password : this.password,
      userRole : this.apiUserRole, 
      langCode : this.language.langCode()
    };
    this.loginServiceApi.requestOtp(payload).subscribe({
      next: (response: any)=>{
        this.loading = false;
        this.developmentOtp = response.data?.developmentOtp ?? '';
        this.mobileNumber = this.mobileNumber || '9999993210';
        this.openOtpView('loginOtp');
        this.changeDetector.markForCheck();
      },
      error :(err) =>{
        this.handleApiError(err);
      }
    });
  }

  openForgotPassword(): void {
    this.clearMessages();
    this.mobileNumber = '';
    this.otp = '';
    this.view = 'forgotRequest';
  }

  requestResetOtp(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.userId.trim() || !/^\d{10}$/.test(this.mobileNumber)) return;

    // TODO: Replace with forgot-password API; API should verify User ID/mobile mapping and send OTP.
    this.openOtpView('forgotOtp');
  }

  verifyOtp(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!/^\d{6}$/.test(this.otp)) return;
    if (this.view === 'loginOtp') {
      this.loading = true;

      const payload = {
        userId: this.userId.trim(), 
        otp: this.otp, 
        userRole: this.apiUserRole, 
        langCode: this.language.langCode()
      }
      
      this.loginServiceApi.verifyOtp(payload).subscribe({
        next: (response : any) =>{
          this.loading = false;
          if (!response.data) return;
          this.authSession.save(response.data);
          this.router.navigateByUrl(response.data.landingRoute);
          this.changeDetector.markForCheck();
        },
        error: error => this.handleApiError(error),
      });
    } else {
      this.view = 'resetPassword';
      this.clearMessages();
    }
  }

  resetPassword(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.newPassword.length < 8 || this.newPassword !== this.confirmPassword) return;

    // TODO: Replace with reset-password API using the verified OTP transaction token.
    this.view = 'resetSuccess';
    this.clearMessages();
  }

  resendOtp(): void {
    if (this.resendSeconds > 0) return;
    this.otp = '';
    if (this.view !== 'loginOtp') {
      this.startResendTimer();
      return;
    }
    // this.loading = true;
    // this.authApi.resendOtp(this.userId.trim(), 'Login', this.apiUserRole, this.language.langCode()).subscribe({
    //   next: response => {
    //     this.loading = false;
    //     this.developmentOtp = response.data?.developmentOtp ?? '';
    //     this.startResendTimer();
    //   },
    //   error: error => this.handleApiError(error),
    // });
  }

  backToLogin(): void {
    this.resetFlow();
  }

  backFromOtp(): void {
    this.clearTimer();
    this.clearMessages();
    this.otp = '';
    this.view = this.view === 'loginOtp' ? 'login' : 'forgotRequest';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private openOtpView(view: 'loginOtp' | 'forgotOtp'): void {
    this.view = view;
    this.otp = '';
    this.clearMessages();
    this.startResendTimer();
  }

  private startResendTimer(): void {
    this.clearTimer();
    this.resendSeconds = 30;
    this.resendTimer = setInterval(() => {
      if (this.resendSeconds <= 1) {
        this.resendSeconds = 0;
        this.clearTimer();
      } else {
        this.resendSeconds -= 1;
      }
      this.changeDetector.markForCheck();
    }, 1000);
  }

  private clearTimer(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = undefined;
  }

  private clearMessages(): void {
    this.submitted = false;
    this.errorMessage = '';
  }

  private get apiUserRole(): ApiUserRole {
    return this.userRole === 'admin' ? 'Official' : 'Employee';
  }

  setLanguage(code: LanguageCode): void { 
    this.language.setLanguage(code); 
    this.changeDetector.markForCheck();
  }
  setRole(role:'employee'|'admin'):void{if(this.userRole===role)return;this.userRole=role;this.userId='';this.resetFlow();this.router.navigate([], { relativeTo:this.route, queryParams:{role}, replaceUrl:true });}
  t(key: string, english: string): string { return this.language.t(key, english); }

  private handleApiError(error: HttpErrorResponse): void {
    this.loading = false;
    setTimeout(() => {
      this.errorMessage = error.error?.message || 'Unable to connect to the HRMS service. Please try again.';
      this.changeDetector.markForCheck();
    });
  }

  private resetFlow(): void {
    this.clearTimer();
    this.view = 'login';
    this.password = '';
    this.otp = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.developmentOtp = '';
    this.clearMessages();
  }
}

export { LoginComponent as Login };

