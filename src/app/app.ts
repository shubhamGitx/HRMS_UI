import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Topbar } from './layout/topbar/topbar';
import { Footer } from './layout/footer/footer'; 
import { HeaderComponent } from './layout/header/header';

@Component({
  imports: [CommonModule, RouterOutlet, Topbar, Footer, HeaderComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  standalone: true,
})
export class App {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  protected readonly title = signal('HRMS');
  isLoginPage = false;
  isDashboardPage = false;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.isLoginPage = url === '/' || url.startsWith('/?') || url.includes('/login');
      this.isDashboardPage = url.includes('/dashboard');
      this.cdr.markForCheck();
    });
  }
}
