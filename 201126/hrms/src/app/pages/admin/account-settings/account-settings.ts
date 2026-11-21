import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountInfo, AccountService, RequestMobileChangeOtpResponse } from '../../../core/services/accountService/account.service';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css'
})
export class AccountSettingsComponent implements OnInit {
  private accountService = inject(AccountService);
  public readonly language = inject(LanguageService);

  activeTab: 'mobile' | 'password' = 'mobile';
  accountInfo = signal<AccountInfo | null>(null);
  loadingInfo = signal<boolean>(false);

  // Mobile Change State
  newMobile = '';
  oldMobileOtp = '';
  newMobileOtp = '';
  otpSent = signal<boolean>(false);
  otpData = signal<RequestMobileChangeOtpResponse | null>(null);
  loadingOtp = signal<boolean>(false);
  verifyingMobile = signal<boolean>(false);
  mobileSuccessMsg = signal<string | null>(null);
  mobileErrorMsg = signal<string | null>(null);
  resendCountdown = signal<number>(0);
  private countdownTimer: any = null;

  // Password Change State
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  updatingPassword = signal<boolean>(false);
  passwordSuccessMsg = signal<string | null>(null);
  passwordErrorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAccountInfo();
  }

  loadAccountInfo(): void {
    this.loadingInfo.set(true);
    this.accountService.getAccountInfo().subscribe({
      next: res => {
        this.loadingInfo.set(false);
        if (res && res.data) {
          this.accountInfo.set(res.data);
        }
      },
      error: err => {
        this.loadingInfo.set(false);
        console.error('Failed to load account info', err);
      }
    });
  }

  // --- Change Mobile Handlers ---
  onRequestMobileOtp(): void {
    this.mobileErrorMsg.set(null);
    this.mobileSuccessMsg.set(null);

    const mobilePattern = /^[6-9]\d{9}$/;
    if (!this.newMobile || !mobilePattern.test(this.newMobile.trim())) {
      this.mobileErrorMsg.set('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (this.accountInfo()?.phone === this.newMobile.trim()) {
      this.mobileErrorMsg.set('New mobile number cannot be the same as your currently registered mobile.');
      return;
    }

    this.loadingOtp.set(true);
    this.accountService.requestMobileChangeOtp(this.newMobile.trim()).subscribe({
      next: res => {
        this.loadingOtp.set(false);
        if (res && res.success && res.data) {
          this.otpSent.set(true);
          this.otpData.set(res.data);
          this.startCountdown(60);
          this.mobileSuccessMsg.set(res.message || 'Verification OTPs sent successfully.');
        } else {
          this.mobileErrorMsg.set(res.message || 'Failed to send verification codes.');
        }
      },
      error: err => {
        this.loadingOtp.set(false);
        const msg = err.error?.message || 'Server error while requesting OTP. Please try again.';
        this.mobileErrorMsg.set(msg);
      }
    });
  }

  onVerifyAndChangeMobile(): void {
    this.mobileErrorMsg.set(null);
    this.mobileSuccessMsg.set(null);

    const otpPattern = /^\d{6}$/;
    if (!otpPattern.test(this.oldMobileOtp.trim())) {
      this.mobileErrorMsg.set('Please enter a valid 6-digit OTP for your registered mobile.');
      return;
    }

    if (!otpPattern.test(this.newMobileOtp.trim())) {
      this.mobileErrorMsg.set('Please enter a valid 6-digit OTP for your new mobile.');
      return;
    }

    this.verifyingMobile.set(true);
    this.accountService.verifyChangeMobile(this.oldMobileOtp.trim(), this.newMobileOtp.trim()).subscribe({
      next: res => {
        this.verifyingMobile.set(false);
        if (res && res.success) {
          this.mobileSuccessMsg.set(res.message || 'Mobile number updated successfully!');
          this.otpSent.set(false);
          this.oldMobileOtp = '';
          this.newMobileOtp = '';
          this.newMobile = '';
          this.otpData.set(null);
          // Reload user account info with updated phone
          this.loadAccountInfo();
        } else {
          this.mobileErrorMsg.set(res.message || 'Verification failed. Please check OTPs.');
        }
      },
      error: err => {
        this.verifyingMobile.set(false);
        const msg = err.error?.message || 'Verification failed. Incorrect OTP or expired.';
        this.mobileErrorMsg.set(msg);
      }
    });
  }

  private startCountdown(seconds: number): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.resendCountdown.set(seconds);
    this.countdownTimer = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        clearInterval(this.countdownTimer);
        this.resendCountdown.set(0);
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }

  // --- Change Password Handlers ---
  onChangePassword(): void {
    this.passwordErrorMsg.set(null);
    this.passwordSuccessMsg.set(null);

    if (!this.currentPassword) {
      this.passwordErrorMsg.set('Please enter your current password.');
      return;
    }

    if (!this.newPassword || this.newPassword.length < 8) {
      this.passwordErrorMsg.set('New password must be at least 8 characters long.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMsg.set('New password and confirmation password do not match.');
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.passwordErrorMsg.set('New password cannot be the same as your current password.');
      return;
    }

    this.updatingPassword.set(true);
    this.accountService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: res => {
        this.updatingPassword.set(false);
        if (res && res.success) {
          this.passwordSuccessMsg.set(res.message || 'Password changed successfully!');
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.passwordErrorMsg.set(res.message || 'Failed to update password.');
        }
      },
      error: err => {
        this.updatingPassword.set(false);
        const msg = err.error?.message || 'Failed to update password. Current password may be incorrect.';
        this.passwordErrorMsg.set(msg);
      }
    });
  }
}
