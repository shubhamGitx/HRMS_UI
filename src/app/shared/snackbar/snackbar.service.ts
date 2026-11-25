import { Injectable, signal } from '@angular/core';

export type SnackbarKind = 'success' | 'error' | 'warning';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly current = signal<{ kind: SnackbarKind; message: string } | null>(null);
  private timeout?: ReturnType<typeof setTimeout>;
  readonly notification = this.current.asReadonly();

  show(kind: SnackbarKind, message: string): void {
    clearTimeout(this.timeout);
    this.current.set({ kind, message });
    this.timeout = setTimeout(() => this.dismiss(), kind === 'success' ? 5000 : 8000);
  }

  dismiss(): void {
    clearTimeout(this.timeout);
    this.current.set(null);
  }
}
