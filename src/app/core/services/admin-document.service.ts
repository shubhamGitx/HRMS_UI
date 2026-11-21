import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiResponse } from '../auth/auth.models';

export interface AdminDocumentItem {
  documentId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  documentTypeId?: number | null;
  documentName: string;
  category: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  sizeFormatted: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  uploadedOn: string;
  filePath?: string | null;
  rejectionRemarks?: string | null;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
}

export interface DocumentVerificationHistoryItem {
  historyId: number;
  documentId: number;
  previousStatus: string;
  newStatus: string;
  actionBy?: number | null;
  actionByName: string;
  actionRemarks?: string | null;
  actionDate: string;
  actionType: string;
}

export interface EmployeeDocumentSummary {
  totalDocuments: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDocumentService {
  private readonly api = inject(ApiService);

  getDocumentsForVerification(params?: {
    status?: string;
    employeeId?: number;
    departmentId?: number;
    search?: string;
  }): Observable<ApiResponse<AdminDocumentItem[]>> {
    let url: string = API_ENDPOINT.ADMIN.DOCUMENTS;
    const queryParts: string[] = [];
    if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.employeeId) queryParts.push(`employeeId=${params.employeeId}`);
    if (params?.departmentId) queryParts.push(`departmentId=${params.departmentId}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);

    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }
    return this.api.get(url);
  }

  verifyDocument(documentId: number, remarks?: string): Observable<ApiResponse<boolean>> {
    return this.api.put(API_ENDPOINT.ADMIN.VERIFY_DOCUMENT(documentId), { remarks: remarks || null });
  }

  rejectDocument(documentId: number, remarks: string): Observable<ApiResponse<boolean>> {
    return this.api.put(API_ENDPOINT.ADMIN.REJECT_DOCUMENT(documentId), { remarks });
  }

  getDocumentHistory(documentId: number): Observable<ApiResponse<DocumentVerificationHistoryItem[]>> {
    return this.api.get(API_ENDPOINT.ADMIN.DOCUMENT_HISTORY(documentId));
  }

  getEmployeeDocumentSummary(employeeId: number): Observable<ApiResponse<EmployeeDocumentSummary>> {
    return this.api.get(API_ENDPOINT.ADMIN.EMPLOYEE_DOCUMENT_SUMMARY(employeeId));
  }

  downloadDocument(docId: number): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.EMPLOYEE.DOWNLOAD_DOC(docId));
  }

  viewDocument(docId: number): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.EMPLOYEE.VIEW_DOC(docId));
  }
}
