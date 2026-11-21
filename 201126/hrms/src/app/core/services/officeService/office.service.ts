import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { API_ENDPOINT } from '../../apiEndpoints/api-endpoints';
import { ApiResponse } from '../../auth/auth.models';

export interface CreateOfficeRequest {
  officeName: string;
  officeNameHindi?: string;
  adminName: string;
  adminPhone?: string;
  adminEmail?: string;
  adminUserId?: string;
  adminPassword?: string;
}

export interface OfficeCreatedResult {
  success: boolean;
  message: string;
  officeId: number;
  officeName: string;
  officialId: number;
  userId: string;
  defaultPassword?: string;
}

export interface DepartmentOfficeDto {
  officeId: number;
  officeName: string;
  officeNameHindi?: string;
  departmentId: number;
  adminOfficialId?: number;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
  adminUserId?: string;
  totalEmployees: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OfficeService {
  private readonly api = inject(ApiService);

  createOffice(request: CreateOfficeRequest): Observable<ApiResponse<OfficeCreatedResult>> {
    return this.api.post<ApiResponse<OfficeCreatedResult>>(API_ENDPOINT.OFFICE.CREATE, request);
  }

  getDepartmentOffices(departmentId?: number): Observable<ApiResponse<DepartmentOfficeDto[]>> {
    let params = new HttpParams();
    if (departmentId && departmentId > 0) {
      params = params.set('departmentId', departmentId.toString());
    }
    return this.api.get<ApiResponse<DepartmentOfficeDto[]>>(API_ENDPOINT.OFFICE.LIST, { params });
  }
}
