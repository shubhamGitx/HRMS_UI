import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CalcType,
  PayComponent,
  PayType,
  PayrollDummyApiService,
} from './payroll-dummy-api.service';

@Component({
  selector: 'app-pay-components-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pay-components-master.html',
  styleUrl: './salary-configuration.css',
})
export class PayComponentsMasterComponent {
  private readonly api = inject(PayrollDummyApiService);
  readonly rows = signal<PayComponent[]>([...this.api.payComponents]);
  readonly search = signal('');
  readonly typeFilter = signal('ALL');
  readonly calcFilter = signal('ALL');
  readonly statusFilter = signal('ACTIVE');
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  code = '';
  name = '';
  componentType: PayType = 'EARNING';
  calcType: CalcType = 'FIXED';
  calcPriority = 1;
  formulaExpression = '';
  isProrated = true;
  isTaxable = true;
  isActive = true;
  get filtered(): PayComponent[] {
    return this.rows()
      .filter(
        (x) =>
          (!this.search() ||
            `${x.code} ${x.name}`.toLowerCase().includes(this.search().toLowerCase())) &&
          (this.typeFilter() === 'ALL' || x.componentType === this.typeFilter()) &&
          (this.calcFilter() === 'ALL' || x.calcType === this.calcFilter()) &&
          (this.statusFilter() === 'ALL' ||
            (this.statusFilter() === 'ACTIVE' ? x.isActive : !x.isActive)),
      )
      .sort((a, b) => a.calcPriority - b.calcPriority);
  }
  get activeCount(): number {
    return this.rows().filter((x) => x.isActive).length;
  }
  openNew(): void {
    this.editingId.set(null);
    this.code = '';
    this.name = '';
    this.componentType = 'EARNING';
    this.calcType = 'FIXED';
    this.calcPriority = 1;
    this.formulaExpression = '';
    this.isProrated = true;
    this.isTaxable = true;
    this.isActive = true;
    this.error.set('');
    this.showForm.set(true);
  }
  edit(row: PayComponent): void {
    this.editingId.set(row.id);
    this.code = row.code;
    this.name = row.name;
    this.componentType = row.componentType;
    this.calcType = row.calcType;
    this.calcPriority = row.calcPriority;
    this.formulaExpression = row.formulaExpression;
    this.isProrated = row.isProrated;
    this.isTaxable = row.isTaxable;
    this.isActive = row.isActive;
    this.error.set('');
    this.showForm.set(true);
  }
  save(): void {
    const code = this.code.trim().toUpperCase();
    if (!code || !this.name.trim()) {
      this.error.set('Enter a component code and display name.');
      return;
    }
    if (this.rows().some((x) => x.code === code && x.id !== this.editingId())) {
      this.error.set('That component code already exists.');
      return;
    }
    if (this.componentType === 'EARNING' && this.calcType === 'FIXED' && this.calcPriority > 9) {
      this.error.set('Earning priorities must be 1–9.');
      return;
    }
    if (this.componentType === 'DEDUCTION' && this.calcPriority < 10) {
      this.error.set('Deduction priorities must be 10 or greater.');
      return;
    }
    const row: PayComponent = {
      id: this.editingId() ?? Math.max(0, ...this.rows().map((x) => x.id)) + 1,
      code,
      name: this.name.trim(),
      componentType: this.componentType,
      calcType: this.calcType,
      calcPriority: Number(this.calcPriority),
      formulaExpression: this.calcType === 'FORMULA' ? this.formulaExpression.trim() : '',
      isProrated: this.isProrated,
      isTaxable: this.isTaxable,
      isActive: this.isActive,
    };
    this.rows.update((rows) =>
      this.editingId() ? rows.map((x) => (x.id === row.id ? row : x)) : [...rows, row],
    );
    this.showForm.set(false);
  }
  toggleActive(row: PayComponent): void {
    this.rows.update((rows) =>
      rows.map((x) => (x.id === row.id ? { ...x, isActive: !x.isActive } : x)),
    );
  }
}
