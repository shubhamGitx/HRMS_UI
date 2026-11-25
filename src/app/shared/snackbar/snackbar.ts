import { Component, inject } from '@angular/core';
import { SnackbarService } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  styleUrl: './snackbar.css',
  template: `
    @if (snackbar.notification(); as notice) {
      <div
        class="snackbar"
        [attr.data-kind]="notice.kind"
        animate.enter="snackbar-enter"
        animate.leave="snackbar-leave"
      >
        <i class="bi snackbar-icon" [class]="variants[notice.kind].icon" aria-hidden="true"></i>
        <div class="snackbar-copy" [attr.role]="notice.kind === 'error' ? 'alert' : 'status'" aria-atomic="true">
          <strong>{{ variants[notice.kind].title }}</strong>
          <p>{{ notice.message }}</p>
        </div>
        <button type="button" aria-label="Dismiss notification" (click)="snackbar.dismiss()">×</button>
      </div>
    }
  `,
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);
  protected readonly variants = {
    success: { title: 'Success', icon: 'bi-check-circle-fill' },
    error: { title: 'Error', icon: 'bi-x-circle-fill' },
    warning: { title: 'Warning', icon: 'bi-exclamation-triangle-fill' },
  };
}
