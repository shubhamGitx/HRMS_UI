import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const user = session.user;
  if (session.isAuthenticated && user) return true;
  return router.createUrlTree(['/login'], { queryParams: { role: 'employee' } });
};
