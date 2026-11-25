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
  isProrated = true;
  isTaxable = true;

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
    this.isProrated = true;
    this.isTaxable = true;
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
    if (!Number.isInteger(this.calcPriority) || this.calcPriority < 1) {
      this.formError.set('Enter a whole number of 1 or more for calculation priority.');
      this.snackbar.show('warning', this.formError());
      return;
    }

    const request: CreatePayComponentRequest = {
      code,
      name,
      componentTypeId: this.componentTypeId,
      calcTypeId: this.calcTypeId,
      calcPriority: Number(this.calcPriority),
      isProrated: this.isProrated,
      isTaxable: this.isTaxable,
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
}
