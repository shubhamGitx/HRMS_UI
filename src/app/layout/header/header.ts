import { Component, HostListener, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service'; 

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.css', './header-login.css', './header-compact.css']
})
export class HeaderComponent {
  @Input() showNavigation = true;
  @Input() compact = false;
  @Input() dashboardMode = false;
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  isLoginDropdownOpen = false;

  public readonly language = inject(LanguageService);

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleLoginDropdown(event: Event) {
    event.stopPropagation();
    this.isLoginDropdownOpen = !this.isLoginDropdownOpen;
    this.isDropdownOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
    this.isLoginDropdownOpen = false;
  }
}

export { HeaderComponent as Header };
