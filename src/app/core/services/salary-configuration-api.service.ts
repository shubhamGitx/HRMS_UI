import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiService } from './api.service';

export interface SalaryConfigurationEmployee {
  employeeId: number;
  salaryConfigurationId: number | null;
  employeeCode: string;
  employeeName: string;
  officeId: number | null;
  officeName: string | null;
  designationId: number | null;
  designationName: string | null;
  payMatrixId: number | null;
  payLevel: string | null;
  payCell: string | null;
  basicPay: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  salaryStatusId: number | null;
  salaryStatus: string | null;
}

export interface SalaryConfigurationGrid {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data: SalaryConfigurationEmployee[];
}

export interface SalaryConfigurationSummary {
  totalEmployees: number;
  pendingDraft: number;
  locked: number;
}

export interface SalaryComponentInput {
  componentId: number;
  priority: number;
  ruleInput: string;
  monthlyAmount: number;
}

export interface SavedSalaryComponent extends Omit<SalaryComponentInput, 'ruleInput'> {
  ruleInput: string | null;
  componentCode: string | null;
  componentName: string | null;
  componentTypeCode: string | null;
}

export interface SalaryConfigurationDetails extends SalaryConfigurationEmployee {
  versionNo: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  nextIncrementDate: string | null;
  components: SavedSalaryComponent[];
}

export interface SaveSalaryHeaderDraftRequest {
  employeeId: number;
  contractId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  nextIncrementDate: string | null;
  payMatrixId: number;
  components: SalaryComponentInput[];
}

export interface UpdateSalaryHeaderDraftRequest {
  effectiveFrom: string;
  effectiveTo: string | null;
  nextIncrementDate: string | null;
  payMatrixId: number;
  components: SalaryComponentInput[];
}

export interface SalaryHeaderSaveResult {
  salaryHeaderId: number;
  status: string;
  isPayrollEligible?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SalaryConfigurationApiService {
  private readonly api = inject(ApiService);
  private readonly pageSize = 100;

  getSalaryConfigurationGrid(): Observable<SalaryConfigurationEmployee[]> {
    return this.getGridPage(1).pipe(
      switchMap((firstPage) => {
        const pageCount = Math.ceil(firstPage.totalRecords / this.pageSize);
        if (pageCount <= 1) return of(firstPage.data ?? []);

        const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
        return forkJoin(remainingPages.map((pageNumber) => this.getGridPage(pageNumber))).pipe(
          map((pages) => [firstPage, ...pages].flatMap((page) => page.data ?? [])),
        );
      }),
    );
  }

  getSalaryConfigurationSummary(): Observable<SalaryConfigurationSummary> {
    return this.api
      .get<ApiEnvelope<SalaryConfigurationSummary>>(
        API_ENDPOINT.PAYROLL.SALARY_CONFIGURATION_SUMMARY,
      )
      .pipe(map((response) => response.data));
  }

  getSalaryConfigurationByEmployeeId(
    employeeId: number | string,
  ): Observable<SalaryConfigurationDetails> {
    return this.api
      .get<ApiEnvelope<SalaryConfigurationDetails>>(
        API_ENDPOINT.PAYROLL.SALARY_CONFIGURATION_BY_EMPLOYEE_ID(employeeId),
      )
      .pipe(map((response) => response.data));
  }

  saveSalaryHeaderDraft(
    request: SaveSalaryHeaderDraftRequest,
  ): Observable<SalaryHeaderSaveResult> {
    return this.api
      .post<ApiEnvelope<SalaryHeaderSaveResult>>(
        API_ENDPOINT.PAYROLL.SAVE_SALARY_HEADER_DRAFT,
        request,
      )
      .pipe(map((response) => response.data));
  }

  updateSalaryHeaderDraft(
    salaryHeaderId: number,
    request: UpdateSalaryHeaderDraftRequest,
  ): Observable<SalaryHeaderSaveResult> {
    return this.api
      .put<ApiEnvelope<SalaryHeaderSaveResult>>(
        API_ENDPOINT.PAYROLL.UPDATE_SALARY_HEADER_DRAFT(salaryHeaderId),
        request,
      )
      .pipe(map((response) => response.data));
  }

  lockSalaryHeader(salaryHeaderId: number): Observable<SalaryHeaderSaveResult> {
    return this.api
      .put<ApiEnvelope<SalaryHeaderSaveResult>>(
        API_ENDPOINT.PAYROLL.LOCK_SALARY_HEADER(salaryHeaderId),
        {},
      )
      .pipe(map((response) => response.data));
  }

  private getGridPage(pageNumber: number): Observable<SalaryConfigurationGrid> {
    return this.api
      .get<ApiEnvelope<SalaryConfigurationGrid>>(API_ENDPOINT.PAYROLL.SALARY_CONFIGURATION, {
        params: { pageNumber, pageSize: this.pageSize },
      })
      .pipe(map((response) => response.data));
  }
}
