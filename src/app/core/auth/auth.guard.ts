import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const makerMatch: CanMatchFn = () => inject(AuthSessionService).isMaker;

export const authGuard: CanActivateFn = (route) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const user = session.user;
  if (session.isAuthenticated && user) {
    if (session.isMaker && route.paramMap.has('section')) {
      return router.createUrlTree(['/dashboard'], { queryParams: { role: 'maker' } });
    }
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { role: 'employee' } });
};
