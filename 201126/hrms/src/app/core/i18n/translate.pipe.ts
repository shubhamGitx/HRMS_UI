import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from './language.service';

/**
 * Enterprise Angular standalone pipe to translate keys or English text to Hindi
 * when language is set to Hindi (2).
 * pure: false ensures that when the language signal updates, all template expressions
 * immediately update dynamically without requiring page reload.
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly lang = inject(LanguageService);

  transform(value: string | null | undefined, fallback?: string): string {
    if (value === null || value === undefined) return '';
    return this.lang.t(value, fallback);
  }
}
