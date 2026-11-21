import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css', './footer-theme.css'],
})
export class Footer implements OnInit {
  isExpanded = false;
  currentYear: number = new Date().getFullYear();
  
  // Stats matching design
  todaysVisitors = '3009';
  totalVisitors = '125430';
  updateDate = '25-Sept-2026';

  // Scroll to top & Progress Ring properties
  showScrollTop = false;
  radius = 22;
  circumference = 2 * Math.PI * this.radius;
  progressOffset = this.circumference;

  public readonly language = inject(LanguageService);

  ngOnInit() {
    this.updateScrollProgress();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const currentScroll = window.scrollY;

    this.showScrollTop = currentScroll > 300;

    if (scrollTotal > 0) {
      const scrollProgress = currentScroll / scrollTotal;
      this.progressOffset = this.circumference - scrollProgress * this.circumference;
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
