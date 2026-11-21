import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractService } from '../shared/contract.service';
import { AppointmentOrderItem } from '../shared/contract.models';
import { LanguageService } from '@core/i18n/language.service';
import { EmployeeApiService } from '@core/services/employee-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  selector: 'app-appointment-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-orders.html',
  styleUrl: './appointment-orders.css'
})
export class AppointmentOrdersComponent {
  protected readonly contractService = inject(ContractService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  protected readonly orderList = this.contractService.appointmentOrders;
  protected readonly currentContract = this.contractService.currentContract;
  protected readonly isLoading = this.contractService.isLoading;

  // Selected Category filter
  selectedCategory: string = 'All';

  // Modal Preview state
  selectedDocument: AppointmentOrderItem | null = null;
  showPreviewModal: boolean = false;

  get filteredOrders(): AppointmentOrderItem[] {
    if (this.selectedCategory === 'All') {
      return this.orderList();
    }
    return this.orderList().filter(doc => doc.category === this.selectedCategory);
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat;
  }

  openPreview(doc: AppointmentOrderItem): void {
    this.selectedDocument = doc;
    this.showPreviewModal = true;
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.selectedDocument = null;
  }

  downloadDocument(doc: AppointmentOrderItem, event?: Event): void {
    if (event) event.stopPropagation();
    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.downloadDocument(empId, 4).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.documentTitle || 'Appointment_Order').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        alert(`Failed to download order ${doc.documentTitle}.`);
      }
    });
  }

  printDocument(): void {
    window.print();
  }
}
