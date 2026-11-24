import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PayrollDummyApiService, PayComponent, SalaryEmployee, SalaryLine } from './payroll-dummy-api.service';

@Component({ selector: 'app-salary-configuration', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './salary-configuration.html', styleUrl: './salary-configuration.css' })
export class SalaryConfigurationComponent implements OnInit {
  private readonly api = inject(PayrollDummyApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly employees = signal<SalaryEmployee[]>([]);
  readonly components = this.api.payComponents;
  readonly selectedId = signal<number | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal('ALL');
  readonly designationFilter = signal('ALL');
  readonly employee = computed(() => this.employees().find(e => e.employeeId === this.selectedId()) ?? null);
  readonly filteredEmployees = computed(() => this.employees().filter(e => (!this.search() || `${e.fullName} ${e.employeeCode}`.toLowerCase().includes(this.search().toLowerCase())) && (this.statusFilter() === 'ALL' || e.status === this.statusFilter()) && (this.designationFilter() === 'ALL' || e.designation === this.designationFilter())));
  readonly draftCount = computed(() => this.employees().filter(e => e.status === 'DRAFT' || e.status === 'PENDING').length);
  readonly lockedCount = computed(() => this.employees().filter(e => e.status === 'LOCKED').length);
  readonly mode = signal<'list' | 'configure'>('list');
  readonly effectiveFrom = signal('2026-04-01');
  readonly status = signal<'DRAFT' | 'LOCKED'>('DRAFT');
  readonly lines = signal<SalaryLine[]>([]);
  readonly showAdd = signal(false);
  readonly newComponentId = signal<number | null>(null);
  readonly newFixedAmount = signal<number | null>(null);
  readonly newPercentage = signal<number | null>(null);
  readonly newBaseCode = signal('CONSOLIDATED_PAY');
  readonly savedMessage = signal('');
  readonly gross = computed(() => this.lines().reduce((n, x) => n + (this.component(x.componentId)?.componentType === 'EARNING' ? x.computedAmount : 0), 0));
  readonly deductions = computed(() => this.lines().reduce((n, x) => n + (this.component(x.componentId)?.componentType === 'DEDUCTION' ? x.computedAmount : 0), 0));
  readonly net = computed(() => this.gross() - this.deductions());

  ngOnInit(): void {
    this.api.getEmployees().subscribe(rows => this.employees.set(rows));
    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('employeeId'));
      if (id) { this.selectedId.set(id); this.mode.set('configure'); this.loadDraft(); }
    });
  }
  component(id: number): PayComponent | undefined { return this.components.find(c => c.id === id); }
  openEmployee(employee: SalaryEmployee): void { this.selectedId.set(employee.employeeId); this.router.navigate(['/dashboard/payroll/configure-salary'], { queryParams: { role: 'admin', employeeId: employee.employeeId } }); this.mode.set('configure'); this.loadDraft(); }
  backToList(): void { this.mode.set('list'); this.selectedId.set(null); this.router.navigate(['/dashboard/payroll/salary-configuration'], { queryParams: { role: 'admin' } }); }
  private loadDraft(): void { const e = this.employee(); if (!e) return; this.lines.set(e.components.map(x => ({ ...x }))); this.status.set(e.status === 'LOCKED' ? 'LOCKED' : 'DRAFT'); this.effectiveFrom.set(e.effectiveFrom || '2026-04-01'); }
  openAdd(): void { this.newComponentId.set(null); this.newFixedAmount.set(null); this.newPercentage.set(null); this.showAdd.set(true); }
  addLine(): void {
    const id = this.newComponentId(); if (id === null) return; const master = this.component(id); if (!master || this.lines().some(x => x.componentId === id)) return;
    const amount = master.calcType === 'FIXED' ? Number(this.newFixedAmount() || 0) : master.calcType === 'PERCENTAGE' ? Math.round((this.lines().find(x => this.component(x.componentId)?.code === this.newBaseCode())?.computedAmount || 0) * Number(this.newPercentage() || 0) / 100 * 100) / 100 : master.code === 'EPF_EMP' ? Math.min(this.gross(), 15000) * .12 : 0;
    this.lines.update(lines => [...lines, { componentId: id, fixedAmount: master.calcType === 'FIXED' ? amount : undefined, percentage: master.calcType === 'PERCENTAGE' ? Number(this.newPercentage()) : undefined, baseCode: master.calcType === 'PERCENTAGE' ? this.newBaseCode() : undefined, formulaExpression: master.formulaExpression, computedAmount: amount }]); this.showAdd.set(false);
  }
  removeLine(id: number): void { if (this.status() !== 'LOCKED') this.lines.update(lines => lines.filter(line => line.componentId !== id)); }
  save(lock: boolean): void { const e = this.employee(); if (!e) return; this.status.set(lock ? 'LOCKED' : 'DRAFT'); this.employees.update(rows => rows.map(row => row.employeeId !== e.employeeId ? row : { ...row, status: lock ? 'LOCKED' : 'DRAFT', effectiveFrom: this.effectiveFrom(), monthlyGross: this.gross(), totalDeductions: this.deductions(), netPayable: this.net(), components: this.lines().map(line => ({ ...line })) })); this.savedMessage.set(lock ? 'Salary version locked and ready for payroll (dummy UI state).' : 'Salary configuration saved as draft (dummy UI state).'); }
}
