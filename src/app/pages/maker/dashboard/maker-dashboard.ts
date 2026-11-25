import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'app-maker-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maker-dashboard.html',
  styleUrl: '../../dashboard/dashboard.css'
})
export class MakerDashboard {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  readonly user = this.session.user;
  readonly currentDateTime = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
  profileMenuOpen = false;

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  @HostListener('document:click')
  closeProfileMenu(): void { this.profileMenuOpen = false; }

  onLogout(): void {
    this.session.clear();
    this.router.navigate(['/login'], { queryParams: { role: 'admin' } });
  }
}
