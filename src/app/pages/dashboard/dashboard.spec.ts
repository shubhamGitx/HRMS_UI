import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap, Router, ActivatedRouteSnapshot, RouterStateSnapshot, Route, PartialMatchRouteSnapshot } from '@angular/router';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { authGuard, makerMatch } from '../../core/auth/auth.guard';
import { Dashboard } from './dashboard';
import { MakerDashboard } from '../maker/dashboard/maker-dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('SMAKER dashboard', () => {
  let fixture: ComponentFixture<MakerDashboard>;
  let session: AuthSessionService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakerDashboard],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: {
          queryParams: of({ role: 'admin' }),
          paramMap: of(convertToParamMap({ section: 'employees' }))
        } }
      ]
    }).compileComponents();
    session = TestBed.inject(AuthSessionService);
    session.save({
      accessToken: 'test-token', expiresAt: new Date(Date.now() + 60000).toISOString(),
      landingRoute: '/dashboard?role=maker',
      user: {
        userId: 'MAKER01', userName: 'Test Maker', userRole: 'Official', roleCode: 'SMAKER',
        roleId: 5, officialId: 1, employeeId: null, departmentId: 1, officeId: 1,
        langCode: 1, loginSessionId: 'test-session', reportingOfficialId: null, reportingOfficialName: null
      }
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MakerDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    session.clear();
  });

  it('keeps the shell blank even with an admin query and an existing module path', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-sidebar')).toBeNull();
    expect(element.querySelector('.hrms-content-area')?.children.length).toBe(0);
    expect(element.querySelector('.topbar-search-box')).toBeNull();
    expect(element.querySelector('.notification-bell-btn')).toBeNull();
    expect(element.querySelector('.profile-role')?.textContent).toContain('Maker (SMAKER)');
    expect(element.querySelector('.logout-link')).not.toBeNull();
    http.expectNone(() => true);
  });

  it('redirects direct module URLs to the maker landing page', () => {
    const route = { paramMap: convertToParamMap({ section: 'employees' }) } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, {} as RouterStateSnapshot));
    expect(result?.toString()).toBe('/dashboard?role=maker');
  });

  it('selects the maker route only for the maker session', () => {
    const matches = () => TestBed.runInInjectionContext(() => makerMatch({} as Route, [], {} as PartialMatchRouteSnapshot));
    expect(matches()).toBe(true);
    const login = session.user!;
    login.roleCode = 'DADM';
    session.save({ accessToken: 'test-token', expiresAt: new Date(Date.now() + 60000).toISOString(), user: login, landingRoute: '/dashboard' });
    expect(matches()).toBe(false);
  });

  it('returns to Official Login on logout', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.onLogout();
    await fixture.whenStable();
    expect(session.user).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { role: 'admin' } });
  });
});

