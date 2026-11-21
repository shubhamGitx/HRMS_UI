import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiResponse } from '../auth/auth.models';
import { LanguageService } from '../i18n/language.service';

export interface DashboardMenuItem {
  id: number;
  label: string;
  icon: string;
  route?: string | null;
  isHeading: boolean;
  children: DashboardMenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NavigationConfigService {
  private api = inject(ApiService);
  private language = inject(LanguageService);

  getMenu(lang?: number): Observable<DashboardMenuItem[]> {
    const langCode = lang || this.language.langCode();
    const url = `${API_ENDPOINT.NAVIGATION.MY_MENU}?lang=${langCode}`;
    return this.api.get(url).pipe(
      map((response: ApiResponse<DashboardMenuItem[]>) => response.data ?? []),
      catchError(() => of([]))
    );
  }
}
