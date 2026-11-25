import { Routes } from '@angular/router';
import { LoginComponent } from './public-pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/auth/auth.guard';
import { makerMatch } from './core/auth/auth.guard';
import { MakerDashboard } from './pages/maker/dashboard/maker-dashboard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: MakerDashboard, canMatch: [makerMatch], canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'dashboard/:section', component: Dashboard, canActivate: [authGuard] },
  { path: 'dashboard/:section/:action', component: Dashboard, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
