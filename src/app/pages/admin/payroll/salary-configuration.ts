import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, firstValueFrom, map, switchMap } from 'rxjs';
import {
  PayComponent,
  SalaryEmployee,
} from './payroll-dummy-api.service';
import { ContractApiService } from '../../../core/services/contract-api.service';
import {
  PayComponentsApiService,
  PayComponent as ApiPayComponent,
} from '../../../core/services/pay-components-api.service';
import {
  SalaryConfigurationApiService,
  SalaryConfigurationDetails,
  SalaryConfigurationEmployee,
  SalaryConfigurationSummary,
  SalaryComponentInput,
  SavedSalaryComponent,
} from '../../../core/services/salary-configuration-api.service';

type SalaryConfigurationRow = Omit<SalaryEmployee, 'components'> & {
  versionNo: number | null;
  components: SavedSalaryComponent[];
};

const EMPTY_SUMMARY: SalaryConfigurationSummary = {
  totalEmployees: 0,
  pendingDraft: 0,
  locked: 0,
};

@Component({
  selector: 'app-salary-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './salary-configuration.html',
  styleUrl: './salary-configuration.css',
})
export class SalaryConfigurationComponent implements OnInit {
  private readonly payComponentsApi = inject(PayComponentsApiService);
  private readonly contractApi = inject(ContractApiService);
  private readonly salaryApi = inject(SalaryConfigurationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detailEmployee = signal<SalaryConfigurationRow | null>(null);
  readonly employees = signal<SalaryConfigurationRow[]>([]);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly summary = signal<SalaryConfigurationSummary>(EMPTY_SUMMARY);
  readonly summaryLoading = signal(true);
  readonly summaryError = signal('');
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly componentError = signal('');
  readonly components = signal<PayComponent[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly salaryHeaderId = signal<number | null>(null);
  readonly payMatrixId = signal<number | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal('ALL');
  readonly designationFilter = signal('ALL');
  readonly designationDropdownOpen = signal(false);
  readonly statusDropdownOpen = signal(false);
  readonly designationOptions = computed(() =>
    [...new Set(this.employees().map((employee) => employee.designation))].sort(),
  );
  readonly statusOptions = [
    { value: 'ALL', label: 'All salary statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'LOCKED', label: 'Locked' },
  ] as const;
  readonly employee = computed(
    () => this.detailEmployee() ?? this.employees().find((e) => e.employeeId === this.selectedId()) ?? null,
  );
  readonly filteredEmployees = computed(() =>
    this.employees().filter(
      (e) =>
        (!this.search() ||
          `${e.fullName} ${e.employeeCode}`.toLowerCase().includes(this.search().toLowerCase())) &&
        (this.statusFilter() === 'ALL' || e.status === this.statusFilter()) &&
        (this.designationFilter() === 'ALL' || e.designation === this.designationFilter()),
    ),
  );
  readonly draftCount = computed(() => this.summary().pendingDraft);
  readonly lockedCount = computed(() => this.summary().locked);
  readonly mode = signal<'list' | 'configure'>('list');
  readonly effectiveFrom = signal('2026-04-01');
  readonly status = signal<'DRAFT' | 'LOCKED'>('DRAFT');
  readonly lines = signal<SavedSalaryComponent[]>([]);
  readonly showAdd = signal(false);
  readonly newComponentId = signal<number | null>(null);
  readonly newFixedAmount = signal<number | null>(null);
  readonly newPercentage = signal<number | null>(null);
  readonly newBaseCode = signal('CONSOLIDATED_PAY');
  readonly savedMessage = signal('');
  readonly saveError = signal('');
  readonly saving = signal(false);
  readonly formDisabled = computed(
    () => !this.detailEmployee() || this.saving() || this.status() === 'LOCKED',
  );
  readonly gross = computed(() =>
    this.lines().reduce(
      (n, x) =>
        n + (this.componentType(x) === 'EARNING' ? x.monthlyAmount : 0),
      0,
    ),
  );
  readonly deductions = computed(() =>
    this.lines().reduce(
      (n, x) =>
        n + (this.componentType(x) === 'DEDUCTION' ? x.monthlyAmount : 0),
      0,
    ),
  );
  readonly net = computed(() => this.gross() - this.deductions());

  get designationLabel(): string {
    const designation = this.designationFilter();
    return designation === 'ALL' ? 'All designations' : designation;
  }

  get statusLabel(): string {
    return (
      this.statusOptions.find((option) => option.value === this.statusFilter())?.label ??
      'All salary statuses'
    );
  }

  toggleDropdown(kind: 'designation' | 'status', event: MouseEvent): void {
    event.stopPropagation();
    if (kind === 'designation') {
      this.designationDropdownOpen.update((open) => !open);
      this.statusDropdownOpen.set(false);
    } else {
      this.statusDropdownOpen.update((open) => !open);
      this.designationDropdownOpen.set(false);
    }
  }

  selectDesignation(value: string): void {
    this.designationFilter.set(value);
    this.designationDropdownOpen.set(false);
  }

  selectStatus(value: string): void {
    this.statusFilter.set(value);
    this.statusDropdownOpen.set(false);
  }

  handleDropdownKeydown(event: KeyboardEvent, kind: 'designation' | 'status'): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (kind === 'designation') this.designationDropdownOpen.set(true);
      else this.statusDropdownOpen.set(true);
    } else if (event.key === 'Escape') {
      if (kind === 'designation') this.designationDropdownOpen.set(false);
      else this.statusDropdownOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  closeDropdownsOnOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.salary-filter-dropdown')) {
      this.designationDropdownOpen.set(false);
      this.statusDropdownOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.payComponentsApi.getAllPayComponents().subscribe({
      next: (components) => this.components.set(components.map((component) => this.toPayComponent(component))),
      error: () => this.componentError.set('Unable to load active pay components.'),
    });

    this.salaryApi.getSalaryConfigurationSummary().subscribe({
      next: (summary) => {
        this.summary.set({ ...EMPTY_SUMMARY, ...summary });
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryError.set('Unable to load salary summary.');
        this.summaryLoading.set(false);
      },
    });

    this.salaryApi.getSalaryConfigurationGrid().subscribe({
      next: (rows) => {
        this.employees.set(rows.map((row) => this.toSalaryEmployee(row)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load salary configuration employees.');
        this.loading.set(false);
      },
    });
    this.route.queryParamMap.pipe(
      map((params) => Number(params.get('employeeId'))),
      distinctUntilChanged(),
      switchMap((id) => {
        const employeeId = Number.isSafeInteger(id) && id > 0 ? id : null;
        this.detailEmployee.set(null);
        this.lines.set([]);
        this.showAdd.set(false);
        this.savedMessage.set('');
        this.saveError.set('');
        this.detailError.set('');
        this.selectedId.set(employeeId);
        this.salaryHeaderId.set(null);
        this.payMatrixId.set(null);
        this.status.set('DRAFT');
        this.effectiveFrom.set('');
        this.mode.set(employeeId === null ? 'list' : 'configure');
        this.detailLoading.set(employeeId !== null);

        if (employeeId === null) return EMPTY;
        return this.salaryApi.getSalaryConfigurationByEmployeeId(employeeId).pipe(
          catchError(() => {
            this.detailError.set('Unable to load salary configuration details for this employee.');
            this.detailLoading.set(false);
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((details) => {
      this.detailLoading.set(false);
      if (details.salaryConfigurationId && !Array.isArray(details.components)) {
        this.detailError.set('The API did not return the saved salary components.');
        return;
      }

      this.salaryHeaderId.set(details.salaryConfigurationId);
      this.payMatrixId.set(details.payMatrixId);
      const employee = this.toSalaryEmployee(details);
      this.detailEmployee.set(employee);
      this.lines.set(employee.components);
      this.status.set(employee.status === 'LOCKED' ? 'LOCKED' : 'DRAFT');
      this.effectiveFrom.set(details.salaryConfigurationId ? employee.effectiveFrom : '2026-04-01');
    });
  }

  private toSalaryEmployee(
    row: SalaryConfigurationEmployee & Partial<SalaryConfigurationDetails>,
  ): SalaryConfigurationRow {
    const dateOnly = (value?: string | null): string => value?.slice(0, 10) ?? '';
    const cell = row.payCell?.match(/\d+/)?.[0];
    return {
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      fullName: row.employeeName,
      designation: row.designationName ?? '',
      office: row.officeName ?? '',
      levelCode: row.payLevel ?? '',
      cellNo: cell ? Number(cell) : 0,
      sanctionedAmount: row.basicPay ?? 0,
      contractStart: dateOnly(row.contractStartDate),
      contractEnd: dateOnly(row.contractEndDate),
      nextIncrementDate: dateOnly(row.nextIncrementDate),
      status: this.mapStatus(row.salaryStatus),
      versionNo: row.versionNo ?? null,
      effectiveFrom: dateOnly(row.effectiveFrom),
      effectiveTo: dateOnly(row.effectiveTo) || null,
      monthlyGross: 0,
      totalDeductions: 0,
      netPayable: 0,
      components: row.components ?? [],
    };
  }

  private mapStatus(status: string | null): SalaryEmployee['status'] {
    const normalized = status?.trim().toUpperCase() ?? '';
    if (normalized.includes('LOCK')) return 'LOCKED';
    if (normalized.includes('DRAFT')) return 'DRAFT';
    return 'PENDING';
  }

  private toPayComponent(component: ApiPayComponent): PayComponent {
    const typeName = component.componentTypeName.toUpperCase();
    const calcName = component.calcTypeName.toUpperCase();
    return {
      id: component.componentId,
      code: component.code,
      name: component.name,
      componentType: typeName.includes('DEDUCT')
        ? 'DEDUCTION'
        : typeName.includes('EMPLOYER')
          ? 'EMPLOYER_CONTRIB'
          : 'EARNING',
      calcType: calcName.includes('PERCENT')
        ? 'PERCENTAGE'
        : calcName.includes('FORMULA')
          ? 'FORMULA'
          : 'FIXED',
      calcPriority: component.calcPriority,
      formulaExpression: '',
      isProrated: component.isProrated,
      isTaxable: component.isTaxable,
      isActive: component.isActive,
    };
  }

  component(id: number): PayComponent | undefined {
    return this.components().find((c) => c.id === id);
  }

  componentType(line: SavedSalaryComponent): string {
    return line.componentTypeCode?.trim().toUpperCase() ||
      this.component(line.componentId)?.componentType || '';
  }

  openEmployee(employee: SalaryConfigurationRow): void {
    this.router.navigate(['/dashboard/payroll/configure-salary'], {
      queryParams: { role: 'admin', employeeId: employee.employeeId },
    });
  }
  backToList(): void {
    if (this.saving()) return;
    this.router.navigate(['/dashboard/payroll/salary-configuration'], {
      queryParams: { role: 'admin' },
    });
  }
  openAdd(): void {
    if (this.formDisabled()) return;
    this.newComponentId.set(null);
    this.newFixedAmount.set(null);
    this.newPercentage.set(null);
    this.showAdd.set(true);
  }
  addLine(): void {
    if (this.formDisabled()) return;
    const id = this.newComponentId();
    if (id === null) return;
    const master = this.component(id);
    if (!master || this.lines().some((x) => x.componentId === id)) return;
    const amount =
      master.calcType === 'FIXED'
        ? Number(this.newFixedAmount() || 0)
        : master.calcType === 'PERCENTAGE'
          ? Math.round(
              (((this.lines().find(
                (x) => x.componentCode === this.newBaseCode(),
              )?.monthlyAmount || 0) *
                Number(this.newPercentage() || 0)) /
                100) *
                100,
            ) / 100
          : master.code === 'EPF_EMP'
            ? Math.min(this.gross(), 15000) * 0.12
            : 0;
    this.lines.update((lines) => [
      ...lines,
      {
        componentId: id,
        componentCode: master.code,
        componentName: master.name,
        componentTypeCode: master.componentType,
        priority: master.calcPriority,
        ruleInput: master.calcType === 'FIXED'
          ? 'Fixed amount'
          : master.calcType === 'PERCENTAGE'
            ? `${Number(this.newPercentage())}% of ${this.newBaseCode()}`
            : master.formulaExpression.trim() || null,
        monthlyAmount: amount,
      },
    ]);
    this.showAdd.set(false);
  }
  removeLine(id: number): void {
    if (!this.formDisabled())
      this.lines.update((lines) => lines.filter((line) => line.componentId !== id));
  }

  async save(lock: boolean): Promise<void> {debugger
    const e = this.detailEmployee();
    if (!e || this.formDisabled()) return;
    this.savedMessage.set('');
    this.saveError.set('');

    if (!this.effectiveFrom()) {
      this.saveError.set('Select an effective from date.');
      return;
    }
    const payMatrixId = this.payMatrixId();
    if (!payMatrixId || payMatrixId <= 0) {
      this.saveError.set('A pay matrix is required before this salary can be saved.');
      return;
    }
    if (!this.lines().length) {
      this.saveError.set('Add at least one salary component before saving.');
      return;
    }

    const components = this.toSalaryComponentInputs();
    if (!components) return;

    const effectiveTo = e.effectiveTo || null;
    const nextIncrementDate = e.nextIncrementDate || null;
    const commonRequest = {
      effectiveFrom: this.effectiveFrom(),
      effectiveTo,
      nextIncrementDate,
      payMatrixId,
      components,
    };
    const savedEmployee: SalaryConfigurationRow = {
      ...e,
      effectiveFrom: commonRequest.effectiveFrom,
      monthlyGross: this.gross(),
      totalDeductions: this.deductions(),
      netPayable: this.net(),
      components: this.lines(),
    };

    this.saving.set(true);
    try {
      let salaryHeaderId = this.salaryHeaderId();

      if (salaryHeaderId) {
        const result = await firstValueFrom(
          this.salaryApi.updateSalaryHeaderDraft(salaryHeaderId, commonRequest),
        );
        salaryHeaderId = result.salaryHeaderId;
      } else {
        const contractResponse = await firstValueFrom(
          this.contractApi.getContractDetails(e.employeeId),
        );
        const contractId = Number(contractResponse.data?.contractId);
        if (!Number.isInteger(contractId) || contractId <= 0) {
          throw new Error('No valid contract ID was returned for this employee.');
        }

        const result = await firstValueFrom(
          this.salaryApi.saveSalaryHeaderDraft({
            employeeId: e.employeeId,
            contractId,
            ...commonRequest,
          }),
        );
        salaryHeaderId = result.salaryHeaderId;
      }

      if (!salaryHeaderId || salaryHeaderId <= 0) {
        throw new Error('The API did not return a valid salary header ID.');
      }

      this.updateSavedEmployee(savedEmployee, salaryHeaderId, 'DRAFT');

      if (lock) {
        await firstValueFrom(this.salaryApi.lockSalaryHeader(salaryHeaderId));
        this.updateSavedEmployee(savedEmployee, salaryHeaderId, 'LOCKED');
        if (this.selectedId() === e.employeeId) {
          this.savedMessage.set('Salary configuration confirmed and locked successfully.');
        }
      } else if (this.selectedId() === e.employeeId) {
        this.savedMessage.set('Salary configuration saved as draft successfully.');
      }

      this.salaryApi.getSalaryConfigurationSummary().subscribe({
        next: (summary) => this.summary.set({ ...EMPTY_SUMMARY, ...summary }),
      });
    } catch (error) {
      if (this.selectedId() === e.employeeId) this.saveError.set(this.getErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private toSalaryComponentInputs(): SalaryComponentInput[] | null {
    const result: SalaryComponentInput[] = [];
    for (const line of this.lines()) {
      const master = this.component(line.componentId);
      const ruleInput = line.ruleInput?.trim()
        ? line.ruleInput
        : master?.calcType === 'FIXED' ? 'Fixed amount' : null;
      if (!ruleInput) {
        this.saveError.set(`The rule for ${line.componentCode ?? line.componentId} is missing.`);
        return null;
      }

      result.push({
        componentId: line.componentId,
        priority: line.priority,
        ruleInput,
        monthlyAmount: line.monthlyAmount,
      });
    }
    return result;
  }

  private updateSavedEmployee(
    employee: SalaryConfigurationRow,
    salaryHeaderId: number,
    status: 'DRAFT' | 'LOCKED',
  ): void {
    const saved = { ...employee, status };
    if (this.selectedId() === employee.employeeId) {
      this.salaryHeaderId.set(salaryHeaderId);
      this.detailEmployee.set(saved);
      this.status.set(status);
    }
    this.employees.update((rows) =>
      rows.map((row) => row.employeeId === employee.employeeId ? saved : row),
    );
  }

  private getErrorMessage(error: unknown): string {
    const response = error as {
      error?: { message?: string; Message?: string };
      message?: string;
    };
    return (
      response?.error?.message ??
      response?.error?.Message ??
      response?.message ??
      (error instanceof Error ? error.message : undefined) ??
      'Unable to save salary configuration.'
    );
  }
}
