import { Component, input } from '@angular/core';

/** Employee ki photo. Photo na ho to default avatar. */
@Component({
  selector: 'app-profile-avatar',
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="alt()" />
    } @else {
      <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="alt()">
        <rect width="120" height="120" fill="#dbe5f4" />
        <circle cx="60" cy="46" r="24" fill="#1e293b" />
        <circle cx="60" cy="50" r="19" fill="#e7b98f" />
        <path d="M41 45c0-12 8-20 19-20s19 8 19 20c0 1-1 2-2 2H43c-1 0-2-1-2-2z" fill="#0f172a" />
        <path d="M20 120c0-24 18-42 40-42s40 18 40 42z" fill="#5b8fd6" />
        <path d="M52 78h16l-8 14z" fill="#ffffff" />
      </svg>
    }
  `,
  styles: `:host { display: block; width: 100%; height: 100%; } img, svg { width: 100%; height: 100%; object-fit: cover; display: block; }`,
})
export class ProfileAvatar {
  readonly src = input<string | null>(null);
  readonly alt = input('Employee photograph');
}
