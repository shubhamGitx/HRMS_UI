import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';
import {
  CreatePayComponentRequest,
  PayComponent,
  PayComponentLookups,
  PayComponentSummary,
  PayComponentsApiService,
} from '../../../core/services/pay-components-api.service';

const EMPTY_SUMMARY: PayComponentSummary = {
  totalComponents: 0,
  activeComponents: 0,
  inactiveComponents: 0,
  earnings: 0,
  deductions: 0,
  employerContributions: 0,
};

@Component({
  selector: 'app-pay-components-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pay-components-master.html',
  styleUrl: './salary-configuration.css',
})
export class PayComponentsMasterComponent implements OnInit {
  private readonly api = inject(PayComponentsApiService);
  private readonly snackbar = inject(SnackbarService);
  readonly rows = signal<PayComponent[]>([]);
  readonly summary = signal<PayComponentSummary>(EMPTY_SUMMARY);
  readonly loading = signal(true);
  readonly summaryLoading = signal(true);
  readonly error = signal('');
  readonly summaryError = signal('');
  readonly formError = signal('');
  readonly lookupsError = signal('');
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly changingStatusIds = signal<Set<number>>(new Set());
  readonly lookups = signal<PayComponentLookups>({ componentTypes: [], calculationTypes: [] });
  readonly componentTypes = computed(() =>
    this.uniqueOptions('componentTypeId', 'componentTypeName'),
  );
  readonly calculationTypes = computed(() => this.uniqueOptions('calcTypeId', 'calcTypeName'));

  search = '';
  typeFilter = 'ALL';
  calcFilter = 'ALL';
  statusFilter = 'ACTIVE';
  code = '';
  name = '';
  componentTypeId: number | null = null;
  calcTypeId: number | null = null;
  calcPriority = 1;
  defaultValue: number | null = null;
  defaultBaseComponentCode = '';
  get availableBaseComponents(): PayComponent[] {
    const currentCode = this.code.trim().toUpperCase();
    return this.rows().filter(
      (component) => component.isActive && component.code.trim().toUpperCase() !== currentCode,
    );
  }
  defaultMaxCap: number | null = null;
  defaultFormula = '';
  get isMatrixLinked(): boolean {
    return this.code.trim().toUpperCase() === 'BASIC';
  }
  isProrated = true;
  isTaxable = true;
  isActive = true;

  get selectedComponentTypeCode(): string {
    return (
      this.lookups().componentTypes.find((item) => item.componentTypeId === this.componentTypeId)
        ?.code ?? ''
    );
  }

  get selectedCalcTypeCode(): string {
    return (
      this.lookups().calculationTypes.find((item) => item.calcTypeId === this.calcTypeId)?.code ?? ''
    );
  }

  setCode(code: string): void {
    this.code = code;
    if (this.isMatrixLinked) {
      this.componentTypeId = this.lookups().componentTypes.find(t => t.code === 'EARNING')?.componentTypeId ?? null;
      this.calcTypeId = this.lookups().calculationTypes.find(t => t.code === 'FIXED')?.calcTypeId ?? null;
      this.defaultValue = null;
      this.onComponentTypeChanged();
    }
  }

  canActivate(row: PayComponent): boolean {
    if (row.code.trim().toUpperCase() !== 'BASIC') return !row.isMatrixLinked;
    const options = this.lookups();
    return row.isMatrixLinked && row.defaultValue == null &&
      options.componentTypes.some(t => t.componentTypeId === row.componentTypeId && t.code === 'EARNING') &&
      options.calculationTypes.some(t => t.calcTypeId === row.calcTypeId && t.code === 'FIXED');
  }

  onComponentTypeChanged(): void {
    if (this.selectedComponentTypeCode === 'EARNING' && (this.calcPriority < 1 || this.calcPriority > 9)) {
      this.calcPriority = 1;
    } else if (
      this.selectedComponentTypeCode === 'DEDUCTION' &&
      (this.calcPriority < 10 || this.calcPriority > 89)
    ) {
      this.calcPriority = 10;
    } else if (
      this.selectedComponentTypeCode === 'EMPLOYER_CONTRIB' &&
      this.calcPriority < 90
    ) {
      this.calcPriority = 90;
    }
  }

  ngOnInit(): void {
    this.refreshData();
    this.api.getLookups().subscribe({
      next: (lookups) => {
        this.lookups.set(lookups);
        this.lookupsError.set('');
      },
      error: () => this.lookupsError.set('Unable to load pay component options.'),
    });
  }

  private refreshData(): void {
    this.loading.set(true);
    this.summaryLoading.set(true);
    this.error.set('');
    this.summaryError.set('');
    this.api.getAllPayComponents().subscribe({
      next: (components) => {
        this.rows.set(components);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load pay components. Please try again later.');
        this.loading.set(false);
      },
    });

    this.api.getSummary().subscribe({
      next: (summary) => {
        this.summary.set({ ...EMPTY_SUMMARY, ...summary });
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryError.set('Summary could not be loaded.');
        this.summaryLoading.set(false);
      },
    });
  }

  get filtered(): PayComponent[] {
    const search = this.search.trim().toLowerCase();
    return this.rows()
      .filter(
        (component) =>
          (!search || `${component.code} ${component.name}`.toLowerCase().includes(search)) &&
          (this.typeFilter === 'ALL' || String(component.componentTypeId) === this.typeFilter) &&
          (this.calcFilter === 'ALL' || String(component.calcTypeId) === this.calcFilter) &&
          (this.statusFilter === 'ALL' ||
            (this.statusFilter === 'ACTIVE' ? component.isActive : !component.isActive)),
      )
      .sort((a, b) => a.calcPriority - b.calcPriority);
  }

  private uniqueOptions(
    idKey: 'componentTypeId' | 'calcTypeId',
    nameKey: 'componentTypeName' | 'calcTypeName',
  ): { id: number; name: string }[] {
    const options = new Map<number, string>();
    for (const component of this.rows()) {
      options.set(component[idKey], component[nameKey]);
    }
    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  openNew(): void {
    this.code = '';
    this.name = '';
    this.componentTypeId =
      this.lookups().componentTypes.find((type) => type.code === 'EARNING')?.componentTypeId ??
      null;
    this.calcTypeId =
      this.lookups().calculationTypes.find((type) => type.code === 'FIXED')?.calcTypeId ?? null;
    this.calcPriority = 1;
    this.defaultValue = null;
    this.defaultBaseComponentCode = '';
    this.defaultMaxCap = null;
    this.defaultFormula = '';
    this.isProrated = true;
    this.isTaxable = true;
    this.isActive = true;
    this.formError.set(this.lookupsError());
    this.showForm.set(true);
  }

  save(): void {
    if (this.saving()) return;
    const code = this.code.trim().toUpperCase();
    const name = this.name.trim();
    if (!code || !name || this.componentTypeId === null || this.calcTypeId === null) {
      this.formError.set('Enter a component code and name, then choose its type and calculation.');
      this.snackbar.show('warning', this.formError());
      return;
    }
    const priorityBand = this.priorityBandError();
    if (priorityBand) {
      this.formError.set(priorityBand);
      this.snackbar.show('warning', this.formError());
      return;
    }

    if (this.isMatrixLinked && this.rows().some(row => row.code.trim().toUpperCase() === 'BASIC')) {
      this.formError.set('BASIC already exists. Use the existing Basic Pay component.');
      this.snackbar.show('warning', this.formError());
      return;
    }

    if (
      this.selectedCalcTypeCode === 'FIXED' &&
      !this.isMatrixLinked &&
      this.defaultValue == null
    ) {
      this.formError.set('Enter the default fixed amount or mark the component as matrix-linked.');
      this.snackbar.show('warning', this.formError());
      return;
    }
    if (
      this.selectedCalcTypeCode === 'PERCENTAGE' &&
      (this.defaultValue == null || !this.availableBaseComponents.some(
        (component) => component.code === this.defaultBaseComponentCode,
      ))
    ) {
      this.formError.set('Percentage components need a default percentage and base component code.');
      this.snackbar.show('warning', this.formError());
      return;
    }
    if (this.selectedCalcTypeCode === 'FORMULA' && !this.defaultFormula.trim()) {
      this.formError.set('Enter a formula expression for this component.');
      this.snackbar.show('warning', this.formError());
      return;
    }
    if (
      (this.defaultValue != null && this.defaultValue < 0) ||
      (this.defaultMaxCap != null && this.defaultMaxCap < 0)
    ) {
      this.formError.set('Amounts, percentages, and caps must be zero or greater.');
      this.snackbar.show('warning', this.formError());
      return;
    }

    const request: CreatePayComponentRequest = {
      code,
      name,
      componentTypeId: this.componentTypeId,
      calcTypeId: this.calcTypeId,
      calcPriority: Number(this.calcPriority),
      defaultValue:
        this.selectedCalcTypeCode === 'FORMULA' || this.isMatrixLinked
          ? null
          : Number(this.defaultValue),
      defaultBaseComponentCode:
        this.selectedCalcTypeCode === 'PERCENTAGE'
        ? this.defaultBaseComponentCode.trim().toUpperCase()
          : null,
      defaultMaxCap: this.selectedCalcTypeCode === 'FIXED' ? null : this.defaultMaxCap,
      defaultFormula: this.selectedCalcTypeCode === 'FORMULA' ? this.defaultFormula.trim() : null,
      isMatrixLinked: this.isMatrixLinked,
      isProrated: this.isProrated,
      isTaxable: this.isTaxable,
      isActive: this.isActive,
    };

    this.saving.set(true);
    this.formError.set('');
    this.api.createPayComponent(request).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (!response.success) {
          this.formError.set(response.message || 'Unable to add pay component.');
          this.snackbar.show('error', this.formError());
          return;
        }
        this.showForm.set(false);
        this.snackbar.show('success', `Pay component ${code} saved successfully.`);
        this.refreshData();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(
          error?.error?.message ?? error?.error?.Message ?? 'Unable to add pay component.',
        );
        this.snackbar.show('error', this.formError());
      },
    });
  }

  toggleActive(row: PayComponent): void {
    if (this.changingStatusIds().has(row.componentId) || (!row.isActive && !this.canActivate(row))) return;

    const nextStatus = !row.isActive;
    this.changingStatusIds.update((ids) => new Set(ids).add(row.componentId));
    this.api.setPayComponentActive(row.componentId, nextStatus).subscribe({
      next: (response) => {
        if (!response.success) {
          this.snackbar.show('error', response.message || 'Unable to change component status.');
          this.finishStatusChange(row.componentId);
          return;
        }

        this.rows.update((rows) =>
          rows.map((item) =>
            item.componentId === row.componentId ? { ...item, isActive: nextStatus } : item,
          ),
        );
        this.summary.update((summary) => ({
          ...summary,
          activeComponents: summary.activeComponents + (nextStatus ? 1 : -1),
          inactiveComponents: summary.inactiveComponents + (nextStatus ? -1 : 1),
        }));
        this.snackbar.show(
          'success',
          `${row.code} ${nextStatus ? 'activated' : 'deactivated'} successfully.`,
        );
        this.finishStatusChange(row.componentId);
      },
      error: (error) => {
        this.snackbar.show(
          'error',
          error?.error?.message ?? error?.error?.Message ?? 'Unable to change component status.',
        );
        this.finishStatusChange(row.componentId);
      },
    });
  }

  private finishStatusChange(componentId: number): void {
    this.changingStatusIds.update((ids) => {
      const next = new Set(ids);
      next.delete(componentId);
      return next;
    });
  }

  private priorityBandError(): string | null {
    if (!Number.isInteger(this.calcPriority)) return 'Calculation priority must be a whole number.';
    const priority = Number(this.calcPriority);
    if (
      this.selectedComponentTypeCode === 'EARNING' &&
      (priority < 1 || priority > 9)
    ) {
      return 'Earning priorities must be from 1 to 9.';
    }
    if (
      this.selectedComponentTypeCode === 'DEDUCTION' &&
      (priority < 10 || priority > 89)
    ) {
      return 'Deduction priorities must be from 10 to 89.';
    }
    if (this.selectedComponentTypeCode === 'EMPLOYER_CONTRIB' && priority < 90) {
      return 'Employer contribution priorities must be 90 or higher.';
    }
    if (priority <= 0) return 'Calculation priority must be greater than zero.';
    return null;
  }
}
