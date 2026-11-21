import { Injectable, computed, signal } from '@angular/core';
import { COMMON_RESOURCES } from './common-resources';

export type LanguageCode = 1 | 2; // 1 = English, 2 = Hindi

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly langCode = signal<LanguageCode>(this.readStored());
  readonly isHindi = computed(() => this.langCode() === 2);

  setLanguage(code: LanguageCode): void {
    this.langCode.set(code);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hrms_language', String(code));
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code === 2 ? 'hi' : 'en';
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.langCode() === 1 ? 2 : 1);
  }

  t(keyOrEnglish?: string | null, englishFallback?: string): string {
    if (!keyOrEnglish) {
      return englishFallback ?? '';
    }

    const code = this.langCode();
    if (code === 1) {
      return englishFallback ?? keyOrEnglish;
    }

    const hi = COMMON_RESOURCES[2];
    if (!hi) {
      return englishFallback ?? keyOrEnglish;
    }

    // 1. Direct match with keyOrEnglish
    if (hi[keyOrEnglish]) {
      return hi[keyOrEnglish];
    }

    // 2. Fallback text lookup
    if (englishFallback && hi[englishFallback]) {
      return hi[englishFallback];
    }

    // 3. Trimmed key lookup
    const trimmed = keyOrEnglish?.trim();
    if (trimmed && hi[trimmed]) {
      return hi[trimmed];
    }

    // 4. Trimmed fallback lookup
    if (englishFallback) {
      const trimmedFb = englishFallback.trim();
      if (hi[trimmedFb]) {
        return hi[trimmedFb];
      }
    }

    // 5. Case-insensitive lookup
    if (trimmed) {
      const found = this.lookupCaseInsensitive(trimmed, hi);
      if (found) return found;
    }

    if (englishFallback) {
      const foundFb = this.lookupCaseInsensitive(englishFallback.trim(), hi);
      if (foundFb) return foundFb;
    }

    return englishFallback ?? keyOrEnglish;
  }

  private lowerCache: Map<string, string> | null = null;

  private lookupCaseInsensitive(term: string, hi: Record<string, string>): string | undefined {
    if (!this.lowerCache) {
      this.lowerCache = new Map<string, string>();
      for (const [k, v] of Object.entries(hi)) {
        this.lowerCache.set(k.toLowerCase(), v);
      }
    }
    return this.lowerCache.get(term.toLowerCase());
  }

  private readStored(): LanguageCode {
    if (typeof localStorage === 'undefined') return 1;
    return localStorage.getItem('hrms_language') === '2' ? 2 : 1;
  }
}
