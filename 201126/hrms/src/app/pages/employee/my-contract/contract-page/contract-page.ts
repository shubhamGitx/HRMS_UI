import { Component, OnInit, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CurrentContractComponent } from '../current-contract/current-contract';
import { RenewalHistoryComponent } from '../renewal-history/renewal-history';
import { AppointmentOrdersComponent } from '../appointment-orders/appointment-orders';
import { ContractService } from '../shared/contract.service';
import { EmployeeHeader } from '../../../../shared/components/employee-header/employee-header';
import { LanguageService } from '@core/i18n/language.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  selector: 'app-contract-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmployeeHeader,
    CurrentContractComponent,
    RenewalHistoryComponent,
    AppointmentOrdersComponent,
  ],
  templateUrl: './contract-page.html',
  styleUrl: './contract-page.css'
})
export class ContractPageComponent implements OnInit {
  readonly page = input<string>('current-contract');

  protected readonly contractService = inject(ContractService);
  private readonly authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);
  protected readonly contract = this.contractService.currentContract;
  protected readonly router = inject(Router);

  // Available tabs matching user requirements & sidebar hierarchy
  readonly tabs = [
    { key: 'current-contract', title: 'Current Contract', icon: 'bi-file-earmark-check' },
    { key: 'renewal-history', title: 'Renewal History', icon: 'bi-clock-history' },
    { key: 'appointment-orders', title: 'Appointment Orders', icon: 'bi-file-earmark-pdf' }
  ];

  ngOnInit(): void {
    this.contractService.syncSessionUser();
    const user = this.authSession.user;
    const empId = user?.employeeId || (user?.userId && !isNaN(Number(user.userId)) ? Number(user.userId) : (user?.userRole === 'Employee' ? 1 : undefined));
    this.contractService.fetchContractDataFromApi(empId);
  }

  protected readonly activeTab = computed(() => {
    const p = this.page();
    return this.tabs.find(t => t.key === p)?.key ?? 'current-contract';
  });

  protected readonly pageTitle = computed(() => {
    return this.tabs.find(t => t.key === this.activeTab())?.title ?? 'Current Contract';
  });

  selectTab(tabKey: string): void {
    this.router.navigate(['/dashboard', 'my-contract', tabKey], { queryParamsHandling: 'preserve' });
  }
}