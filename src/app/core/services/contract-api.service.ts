import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINT } from '../apiEndpoints/api-endpoints';
import { ApiResponse } from '../auth/auth.models';
import {
  AppointmentOrderItem,
  ContractDetails,
  RenewalHistoryItem,
  RenewalWorkflowStep
} from '../../pages/employee/my-contract/shared/contract.models';

@Injectable({
  providedIn: 'root'
})
export class ContractApiService {
  private readonly api = inject(ApiService);

  /**
   * Fetch current contract details for an employee
   */
  getContractDetails(employeeId: number | string): Observable<ApiResponse<ContractDetails>> {
    return this.api.get(API_ENDPOINT.CONTRACT.GET_CURRENT_CONTRACT(employeeId));
  }

  /**
   * Fetch contract renewal & extension history
   */
  getRenewalHistory(employeeId: number | string): Observable<ApiResponse<RenewalHistoryItem[]>> {
    return this.api.get(API_ENDPOINT.CONTRACT.GET_RENEWAL_HISTORY(employeeId));
  }

  /**
   * Fetch appointment orders and sanctioned documents
   */
  getAppointmentOrders(employeeId: number | string): Observable<ApiResponse<AppointmentOrderItem[]>> {
    return this.api.get(API_ENDPOINT.CONTRACT.GET_APPOINTMENT_ORDERS(employeeId));
  }

  /**
   * Fetch renewal audit workflow steps
   */
  getRenewalWorkflow(employeeId: number | string): Observable<ApiResponse<RenewalWorkflowStep[]>> {
    return this.api.get(API_ENDPOINT.CONTRACT.GET_RENEWAL_WORKFLOW(employeeId));
  }

  /**
   * Download appointment order PDF document
   */
  downloadAppointmentOrder(docId: number | string): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINT.CONTRACT.DOWNLOAD_ORDER_PDF(docId));
  }

  /**
   * Record & activate a new contractual agreement
   */
  saveContract(contractData: any): Observable<ApiResponse<number>> {
    return this.api.post(API_ENDPOINT.CONTRACT.SAVE_CONTRACT, contractData);
  }

  /**
   * Fetch all active contracts recorded in jurisdiction
   */
  getAllContracts(): Observable<ApiResponse<any[]>> {
    return this.api.get(API_ENDPOINT.CONTRACT.GET_ALL_CONTRACTS);
  }
}
