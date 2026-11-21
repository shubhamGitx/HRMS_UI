import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar {
  isAccessibilityOpen = false;
  currentFontSize = 'normal';
  currentTheme = 'light';

  public readonly language = inject(LanguageService);

  toggleAccessibility() {
    this.isAccessibilityOpen = !this.isAccessibilityOpen;
  }

  setFontSize(size: string) {
    this.currentFontSize = size;
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
  }
}
