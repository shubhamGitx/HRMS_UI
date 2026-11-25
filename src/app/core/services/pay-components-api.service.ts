import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiService } from './api.service';

export interface PayComponent {
  componentId: number;
  code: string;
  name: string;
  componentTypeId: number;
  componentTypeName: string;
  calcTypeId: number;
  calcTypeName: string;
  calcPriority: number;
  isProrated: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

interface PayComponentPage {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data: PayComponent[];
}

export interface PayComponentSummary {
  totalComponents: number;
  activeComponents: number;
  inactiveComponents: number;
  earnings: number;
  deductions: number;
  employerContributions: number;
}

export interface PayComponentLookups {
  componentTypes: { componentTypeId: number; code: string; name: string }[];
  calculationTypes: { calcTypeId: number; code: string; name: string }[];
}

export interface CreatePayComponentRequest {
  code: string;
  name: string;
  componentTypeId: number;
  calcTypeId: number;
  calcPriority: number;
  isProrated: boolean;
  isTaxable: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PayComponentMutationResponse {
  success: boolean;
  message: string;
  componentId?: number;
}

@Injectable({ providedIn: 'root' })
export class PayComponentsApiService {
  private readonly api = inject(ApiService);
  private readonly pageSize = 100;

  getAllPayComponents(): Observable<PayComponent[]> {
    return this.getPayComponentGrid(1).pipe(
      switchMap((firstPage) => {
        const pageCount = Math.ceil(firstPage.totalRecords / this.pageSize);
        if (pageCount <= 1) return of(firstPage.data ?? []);

        const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
        return forkJoin(
          remainingPages.map((pageNumber) => this.getPayComponentGrid(pageNumber)),
        ).pipe(map((pages) => [firstPage, ...pages].flatMap((page) => page.data ?? [])));
      }),
    );
  }

  getSummary(): Observable<PayComponentSummary> {
    return this.api.get<PayComponentSummary>(API_ENDPOINT.PAYROLL.PAY_COMPONENT_SUMMARY);
  }

  getLookups(): Observable<PayComponentLookups> {
    return this.api
      .get<ApiEnvelope<PayComponentLookups>>(API_ENDPOINT.PAYROLL.PAY_COMPONENT_LOOKUPS)
      .pipe(map((response) => response.data));
  }

  createPayComponent(request: CreatePayComponentRequest): Observable<PayComponentMutationResponse> {
    return this.api.post<PayComponentMutationResponse>(
      API_ENDPOINT.PAYROLL.PAY_COMPONENTS,
      request,
    );
  }

  private getPayComponentGrid(pageNumber: number): Observable<PayComponentPage> {
    return this.api.get<PayComponentPage>(API_ENDPOINT.PAYROLL.PAY_COMPONENTS, {
      params: { pageNumber, pageSize: this.pageSize },
    });
  }
}
