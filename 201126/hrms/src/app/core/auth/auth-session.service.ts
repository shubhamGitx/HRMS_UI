import { Injectable } from '@angular/core';
import { AuthenticatedUser, LoginResult } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly tokenKey = 'hrms_access_token';
  private readonly userKey = 'hrms_user';
  private readonly expiryKey = 'hrms_token_expiry';

  save(login: LoginResult): void {
    sessionStorage.setItem(this.tokenKey, login.accessToken);
    sessionStorage.setItem(this.userKey, JSON.stringify(login.user));
    sessionStorage.setItem(this.expiryKey, login.expiresAt);
    if (login.user?.langCode === 1 || login.user?.langCode === 2) {
      localStorage.setItem('hrms_language', String(login.user.langCode));
    }
  }

  clear(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.expiryKey);
  }

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  get user(): AuthenticatedUser | null {
    const stored = sessionStorage.getItem(this.userKey);
    if (!stored) return null;
    try { return JSON.parse(stored) as AuthenticatedUser; } catch { this.clear(); return null; }
  }

  get isAuthenticated(): boolean {
    const expiry = sessionStorage.getItem(this.expiryKey);
    if (!this.token || !expiry || Date.parse(expiry) <= Date.now()) {
      this.clear();
      return false;
    }
    return true;
  }
}
