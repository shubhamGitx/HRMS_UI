import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeaveService, LeaveBalanceDto, EmployeeLeaveDto, LeaveReasonDto, HolidayDto, ChargeableLeaveBreakdownDto, EmployeeLeaveEntitlementDto } from '../../../../core/services/leaveService/leave.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Router } from '@angular/router';

export interface FeedbackModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  details?: {
    leaveTypeName?: string;
    dates?: string;
    totalDays?: number;
    financialYear?: string;
    remainingBalance?: number;
  };
}

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  leaveStatus?: 'PENDING' | 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null;
  leaveTypeCode?: string;
}

export interface LeaveCalculationBreakdown {
  totalCalendarDays: number;
  holidayCount: number;
  weeklyOffCount: number;
  chargeableDays: number;
  leaveDays: number;
  excludedHolidayNames: string[];
  isFromHoliday: boolean;
  fromHolidayName?: string;
  isToHoliday: boolean;
  toHolidayName?: string;
  isFromWeekend: boolean;
  fromWeekendName?: string;
  isToWeekend: boolean;
  toWeekendName?: string;
  isSingleDay: boolean;
  isValid: boolean;
  formattedFromDate: string;
  formattedToDate: string;
}

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './apply-leave.html',
  styleUrl: './apply-leave.css'
})
export class ApplyLeaveComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);
  private authSession = inject(AuthSessionService);
  private router = inject(Router);
  public readonly language = inject(LanguageService);

  readonly action = input<string>('apply');

  leaveForm!: FormGroup;
  balances = signal<LeaveBalanceDto[]>([]);
  entitlements = signal<EmployeeLeaveEntitlementDto[]>([]);
  selectedEntitlement = signal<EmployeeLeaveEntitlementDto | null>(null);
  isLoadingEntitlements = signal<boolean>(false);
  leaves = signal<EmployeeLeaveDto[]>([]);

  // Unified display entitlements signal that bridges balances and dynamic policies smoothly
  displayEntitlements = computed<EmployeeLeaveEntitlementDto[]>(() => {
    if (this.entitlements().length > 0) {
      return this.entitlements();
    }
    return this.balances().map(b => ({
      leaveTypeId: b.leaveTypeId,
      leaveTypeCode: b.leaveTypeCode,
      leaveTypeName: b.leaveTypeName,
      annualEntitlement: b.annualAllowed,
      eligibleCarryForward: 0,
      totalAllocatedQuota: b.annualAllowed,
      usedLeaves: b.consumedApproved,
      pendingLeaves: b.pendingApplied,
      availableBalance: b.balance,
      maxConsecutiveDays: 5,
      carryForwardAllowed: false,
      maxCarryForward: 0,
      allowHalfDay: true,
      hasPolicyConflict: false
    }));
  });

  // Authoritative current entitlement with immediate fallback
  currentEntitlement = computed<EmployeeLeaveEntitlementDto | null>(() => {
    if (this.selectedEntitlement()) {
      return this.selectedEntitlement();
    }
    const currentTypeId = Number(this.leaveForm?.get('leaveTypeId')?.value || 1);
    const match = this.displayEntitlements().find(e => e.leaveTypeId === currentTypeId);
    return match || this.displayEntitlements()[0] || null;
  });

  // Maximum selectable end date based on fromDate, policy consecutive limit, and available balance
  maxSelectableEndDate = computed<string>(() => {
    const range = this.dateRange();
    if (!range.from) return '';
    return this.calculateMaxEndDate(range.from);
  });
  leaveReasons = signal<LeaveReasonDto[]>([]);
  holidays = signal<HolidayDto[]>([]);
  dateRange = signal<{ from: string; to: string }>({ from: '', to: '' });
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  activeTab = signal<string>('apply');

  // Standard Popup Modal handlers
  closeSuccessModal(): void {
    this.successMessage.set(null);
  }

  closeErrorModal(): void {
    this.errorMessage.set(null);
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.feedbackModal.set({ isOpen: false, type: 'success', title: '', message: '' });
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.clearAlerts();
  }

  // Backward compatibility modal state
  feedbackModal = signal<FeedbackModalState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  openFeedbackModal(
    type: 'success' | 'error' | 'warning',
    title: string,
    message: string,
    details?: FeedbackModalState['details']
  ): void {
    if (type === 'success') {
      this.successMessage.set(message);
    } else {
      this.errorMessage.set(message);
    }
    this.feedbackModal.set({
      isOpen: true,
      type,
      title,
      message,
      details
    });
  }

  closeFeedbackModal(): void {
    this.clearAlerts();
  }

  // Calendar State
  currentCalendarDate = signal<Date>(new Date());
  calendarDays = signal<CalendarDay[]>([]);

  // Fast map lookup for official holidays by YYYY-MM-DD
  holidayMap = computed(() => {
    const map = new Map<string, HolidayDto>();
    for (const h of this.holidays()) {
      const dStr = h.holidayDate ? h.holidayDate.split('T')[0] : '';
      if (dStr) {
        map.set(dStr, h);
      }
    }
    return map;
  });

  // Centralized real-time calculation breakdown for selected leave range
  calculationBreakdown = computed<LeaveCalculationBreakdown | null>(() => {
    const range = this.dateRange();
    const from = range.from;
    const to = range.to;
    if (!from || !to) return null;

    const d1 = new Date(from);
    const d2 = new Date(to);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return null;

    const holidayMap = this.holidayMap();
    let totalCalendarDays = 0;
    let holidayCount = 0;
    let weeklyOffCount = 0;
    const excludedHolidayNames: string[] = [];

    const isFromHoliday = holidayMap.has(from);
    const fromHolidayName = holidayMap.get(from)?.holidayName;
    const isToHoliday = holidayMap.has(to);
    const toHolidayName = holidayMap.get(to)?.holidayName;

    const isFromWeekend = d1.getDay() === 0 || d1.getDay() === 6;
    const fromWeekendName = d1.getDay() === 0 ? 'Sunday' : 'Saturday';
    const isToWeekend = d2.getDay() === 0 || d2.getDay() === 6;
    const toWeekendName = d2.getDay() === 0 ? 'Sunday' : 'Saturday';

    const isSingleDay = from === to;

    const fromDayType = this.leaveForm?.get('fromDayType')?.value || 'FULL';
    const toDayType = this.leaveForm?.get('toDayType')?.value || 'FULL';

    const curr = new Date(d1);
    let workingDaysChargeable = 0;
    while (curr <= d2) {
      totalCalendarDays++;
      const curStr = this.formatDate(curr);
      const isWeekendDay = curr.getDay() === 0 || curr.getDay() === 6; // Saturday & Sunday both weekly offs
      const hol = holidayMap.get(curStr);

      if (hol) {
        holidayCount++;
        excludedHolidayNames.push(`${hol.holidayName} (${curStr})`);
      } else if (isWeekendDay) {
        weeklyOffCount++;
      } else {
        if (isSingleDay) {
          workingDaysChargeable += (fromDayType === 'HALF' ? 0.5 : 1.0);
        } else {
          if (curStr === from) {
            workingDaysChargeable += (fromDayType === 'HALF' ? 0.5 : 1.0);
          } else if (curStr === to) {
            workingDaysChargeable += (toDayType === 'HALF' ? 0.5 : 1.0);
          } else {
            workingDaysChargeable += 1.0;
          }
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    const chargeableDays = workingDaysChargeable;

    return {
      totalCalendarDays,
      holidayCount,
      weeklyOffCount,
      chargeableDays,
      leaveDays: chargeableDays,
      excludedHolidayNames,
      isFromHoliday,
      fromHolidayName,
      isToHoliday,
      toHolidayName,
      isFromWeekend,
      fromWeekendName,
      isToWeekend,
      toWeekendName,
      isSingleDay,
      isValid: !isFromHoliday && !isToHoliday && !isFromWeekend && !isToWeekend && chargeableDays > 0,
      formattedFromDate: this.formatDisplayDate(from),
      formattedToDate: this.formatDisplayDate(to)
    };
  });

  // Consolidated validation error message for template display and submit checks
  dateValidationError = computed<string | null>(() => {
    const calc = this.calculationBreakdown();
    if (!calc) return null;

    if (calc.isSingleDay) {
      if (calc.isFromHoliday) {
        return `${calc.formattedFromDate} is an official holiday (${calc.fromHolidayName}). Leave cannot be applied on a holiday.`;
      }
      if (calc.isFromWeekend) {
        return `${calc.formattedFromDate} is a weekend (${calc.fromWeekendName}). Leave cannot be applied on a weekend.`;
      }
    } else {
      if (calc.isFromHoliday) {
        return `Start Date (${calc.formattedFromDate}) is an official holiday (${calc.fromHolidayName}). Leaves cannot start on a holiday.`;
      }
      if (calc.isToHoliday) {
        return `End Date (${calc.formattedToDate}) is an official holiday (${calc.toHolidayName}). Leaves cannot end on a holiday.`;
      }
      if (calc.isFromWeekend) {
        return `Start Date (${calc.formattedFromDate}) is a weekend (${calc.fromWeekendName}). Leaves cannot start on a weekend.`;
      }
      if (calc.isToWeekend) {
        return `End Date (${calc.formattedToDate}) is a weekend (${calc.toWeekendName}). Leaves cannot end on a weekend.`;
      }
    }

    if (calc.leaveDays === 0) {
      return 'The selected date(s) fall entirely on weekends or official holidays. Leave days must be at least 1.';
    }

    // Policy Rule Validations
    const entitlement = this.currentEntitlement();
    if (entitlement) {
      if (entitlement.hasPolicyConflict) {
        return entitlement.conflictMessage || 'Leave policy configuration conflict detected. Please contact HR.';
      }

      const fromDayType = this.leaveForm?.get('fromDayType')?.value || 'FULL';
      const toDayType = this.leaveForm?.get('toDayType')?.value || 'FULL';
      const hasHalfDay = fromDayType === 'HALF' || toDayType === 'HALF';
      if (hasHalfDay && !entitlement.allowHalfDay) {
        return `Half-day leave is not permitted for ${entitlement.leaveTypeName} under the applicable leave policy.`;
      }

      if (calc.leaveDays > entitlement.maxConsecutiveDays) {
        return `Requested leave duration (${calc.leaveDays} day(s)) exceeds the maximum consecutive limit of ${entitlement.maxConsecutiveDays} day(s) allowed for ${entitlement.leaveTypeName}.`;
      }

      if (calc.leaveDays > entitlement.availableBalance) {
        return `Insufficient leave balance for ${entitlement.leaveTypeName}. Available: ${entitlement.availableBalance} day(s), Requested: ${calc.leaveDays} day(s).`;
      }
    }

    return null;
  });

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  constructor() {
    effect(() => {
      const act = (this.action() || 'apply').toLowerCase();
      if (act.includes('balance')) {
        this.activeTab.set('balance');
      } else if (act.includes('history') || act.includes('application')) {
        this.activeTab.set('history');
      } else {
        this.activeTab.set('apply');
      }
    });
  }

  get employeeId(): number {
    return this.authSession.user?.employeeId || 1;
  }

  get totalDaysCalculated(): number {
    const from = this.leaveForm?.get('fromDate')?.value;
    const to = this.leaveForm?.get('toDate')?.value;
    if (!from || !to) return 0;
    const d1 = new Date(from);
    const d2 = new Date(to);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 0;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  get isInvalidDateRange(): boolean {
    const from = this.leaveForm?.get('fromDate')?.value;
    const to = this.leaveForm?.get('toDate')?.value;
    if (!from || !to) return false;
    const d1 = new Date(from);
    const d2 = new Date(to);
    return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 < d1;
  }

  isDateSelected(dateStr: string): boolean {
    const from = this.leaveForm?.get('fromDate')?.value;
    const to = this.leaveForm?.get('toDate')?.value;
    if (!from) return false;
    if (!to) return dateStr === from;
    return dateStr >= from && dateStr <= to;
  }

  getMaxAllowedLimit(): number {
    const ent = this.currentEntitlement();
    if (!ent) return 5;
    const consecutive = ent.maxConsecutiveDays > 0 ? ent.maxConsecutiveDays : 5;
    const balance = ent.availableBalance !== undefined ? ent.availableBalance : 999;
    return Math.max(0, Math.min(consecutive, balance));
  }

  calculateChargeableDaysBetween(
    startDateStr: string,
    endDateStr: string,
    fromDayType: string = 'FULL',
    toDayType: string = 'FULL'
  ): number {
    if (!startDateStr || !endDateStr) return 0;
    const d1 = new Date(startDateStr);
    const d2 = new Date(endDateStr);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 0;

    const holidayMap = this.holidayMap();
    let workingDays = 0;
    const curr = new Date(d1);
    while (curr <= d2) {
      const curStr = this.formatDate(curr);
      const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
      const isHol = holidayMap.has(curStr);
      if (!isWeekend && !isHol) {
        if (startDateStr === endDateStr) {
          workingDays += (fromDayType === 'HALF' ? 0.5 : 1.0);
        } else {
          if (curStr === startDateStr) {
            workingDays += (fromDayType === 'HALF' ? 0.5 : 1.0);
          } else if (curStr === endDateStr) {
            workingDays += (toDayType === 'HALF' ? 0.5 : 1.0);
          } else {
            workingDays += 1.0;
          }
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    return workingDays;
  }

  calculateMaxEndDate(startDateStr: string): string {
    if (!startDateStr) return '';
    const maxLimit = this.getMaxAllowedLimit();
    if (maxLimit <= 0) return startDateStr;

    const fromDayType = this.leaveForm?.get('fromDayType')?.value || 'FULL';
    const holidayMap = this.holidayMap();
    let workingDaysCount = 0;
    const curr = new Date(startDateStr);
    let lastValidDate = startDateStr;

    // Search forward up to 90 calendar days
    for (let i = 0; i < 90; i++) {
      const curStr = this.formatDate(curr);
      const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
      const isHol = holidayMap.has(curStr);

      if (!isWeekend && !isHol) {
        const increment = (curStr === startDateStr && fromDayType === 'HALF') ? 0.5 : 1.0;
        workingDaysCount += increment;
        lastValidDate = curStr;
        if (workingDaysCount >= maxLimit) {
          return curStr;
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    return lastValidDate;
  }

  isDateExceedingLimit(dateStr: string): boolean {
    const maxLimit = this.getMaxAllowedLimit();
    if (maxLimit <= 0) return true;
    const from = this.leaveForm?.get('fromDate')?.value;
    if (!from || !dateStr) return false;
    if (dateStr < from) return false;
    const maxEnd = this.maxSelectableEndDate();
    if (!maxEnd) return false;
    return dateStr > maxEnd;
  }

  onExceedingDateClick(day: CalendarDay): void {
    const maxLimit = this.getMaxAllowedLimit();
    const ent = this.currentEntitlement();
    const maxEnd = this.maxSelectableEndDate();
    const entName = ent?.leaveTypeName || 'this leave type';
    this.errorMessage.set(
      `Cannot select ${this.formatDisplayDate(day.dateStr)}: Exceeds the maximum limit of ${maxLimit} day(s) allowed for ${entName}. Maximum selectable date is ${this.formatDisplayDate(maxEnd)}.`
    );
  }

  getDayTitle(day: CalendarDay): string {
    if (day.isHoliday) return `Official Holiday: ${day.holidayName}`;
    if (day.isWeekend) return `${day.isSunday ? 'Sunday' : 'Saturday'} Weekend Off`;
    if (this.isDateExceedingLimit(day.dateStr)) {
      const maxLimit = this.getMaxAllowedLimit();
      const ent = this.currentEntitlement();
      return `Exceeds max allowed limit (${maxLimit} days) for ${ent?.leaveTypeName || 'this leave type'}`;
    }
    return 'Click to select this date for leave';
  }

  onSelectCalendarDate(day: CalendarDay): void {
    if (!day.dateStr) return;

    if (day.isHoliday) {
      this.errorMessage.set(`"${day.holidayName}" is an official holiday and cannot be selected as leave date.`);
      return;
    }

    if (day.isWeekend) {
      this.errorMessage.set(`${day.isSunday ? 'Sunday' : 'Saturday'} is a weekend off and cannot be selected as leave date.`);
      return;
    }

    const ent = this.currentEntitlement();
    const maxLimit = this.getMaxAllowedLimit();

    if (maxLimit <= 0) {
      this.errorMessage.set(`You have zero available balance for ${ent?.leaveTypeName || 'this leave type'}.`);
      return;
    }

    const from = this.leaveForm.get('fromDate')?.value;
    const to = this.leaveForm.get('toDate')?.value;

    if (!from || (from && to && from !== to)) {
      this.leaveForm.patchValue({ fromDate: day.dateStr, toDate: day.dateStr });
      this.errorMessage.set(null);
    } else if (from && (!to || from === to)) {
      if (day.dateStr < from) {
        this.leaveForm.patchValue({ fromDate: day.dateStr, toDate: day.dateStr });
        this.errorMessage.set(null);
      } else {
        const fromDayType = this.leaveForm.get('fromDayType')?.value || 'FULL';
        const toDayType = this.leaveForm.get('toDayType')?.value || 'FULL';
        const chargeable = this.calculateChargeableDaysBetween(from, day.dateStr, fromDayType, toDayType);
        const maxEnd = this.calculateMaxEndDate(from);

        if (chargeable > maxLimit || (maxEnd && day.dateStr > maxEnd)) {
          // STRICT RULE: DO NOT LET THEM SELECT IF EXCEEDING LIMIT!
          this.leaveForm.patchValue({ toDate: maxEnd });
          this.errorMessage.set(
            `Cannot select up to ${this.formatDisplayDate(day.dateStr)}: Exceeds the limit of ${maxLimit} day(s) for ${ent?.leaveTypeName || 'this leave'}. Selection clamped to ${this.formatDisplayDate(maxEnd)}.`
          );
          return;
        }

        this.leaveForm.patchValue({ toDate: day.dateStr });
        this.errorMessage.set(null);
      }
    }
  }

  get monthNames(): string[] {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }

  get currentMonthYearLabel(): string {
    const d = this.currentCalendarDate();
    return `${this.monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }

  ngOnInit(): void {
    if (this.action()) {
      this.activeTab.set(this.action());
    }

    this.initForm();
    this.generateCalendarDays(); // Immediately populate calendar dates
    this.loadHolidays();
    this.loadReasons();
    this.loadEntitlements();
    this.loadBalances();
    this.loadMyLeaves();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.router.navigate(['/dashboard', 'leave', tab], { queryParamsHandling: 'preserve' });
  }

  setFromDayType(type: 'FULL' | 'HALF'): void {
    const ent = this.currentEntitlement();
    if (type === 'HALF' && ent && !ent.allowHalfDay) {
      this.errorMessage.set(`Half-day leave is not permitted for ${ent.leaveTypeName} under the applicable leave policy.`);
      return;
    }
    this.leaveForm.patchValue({ fromDayType: type });
    const fromVal = this.leaveForm.get('fromDate')?.value;
    const toVal = this.leaveForm.get('toDate')?.value;
    if (fromVal && toVal && fromVal === toVal) {
      this.leaveForm.patchValue({ toDayType: type });
    }
    const hasHalf = type === 'HALF' || this.leaveForm.get('toDayType')?.value === 'HALF';
    this.leaveForm.patchValue({ isHalfDay: hasHalf });
    this.dateRange.set({ ...this.dateRange() });
  }

  setFromHalfSession(session: 'FIRST_HALF' | 'SECOND_HALF'): void {
    this.leaveForm.patchValue({ fromHalfSession: session });
    const fromVal = this.leaveForm.get('fromDate')?.value;
    const toVal = this.leaveForm.get('toDate')?.value;
    if (fromVal && toVal && fromVal === toVal) {
      this.leaveForm.patchValue({ toHalfSession: session });
    }
    this.dateRange.set({ ...this.dateRange() });
  }

  setToDayType(type: 'FULL' | 'HALF'): void {
    const ent = this.currentEntitlement();
    if (type === 'HALF' && ent && !ent.allowHalfDay) {
      this.errorMessage.set(`Half-day leave is not permitted for ${ent.leaveTypeName} under the applicable leave policy.`);
      return;
    }
    this.leaveForm.patchValue({ toDayType: type });
    const fromVal = this.leaveForm.get('fromDate')?.value;
    const toVal = this.leaveForm.get('toDate')?.value;
    if (fromVal && toVal && fromVal === toVal) {
      this.leaveForm.patchValue({ fromDayType: type });
    }
    const hasHalf = this.leaveForm.get('fromDayType')?.value === 'HALF' || type === 'HALF';
    this.leaveForm.patchValue({ isHalfDay: hasHalf });
    this.dateRange.set({ ...this.dateRange() });
  }

  setToHalfSession(session: 'FIRST_HALF' | 'SECOND_HALF'): void {
    this.leaveForm.patchValue({ toHalfSession: session });
    const fromVal = this.leaveForm.get('fromDate')?.value;
    const toVal = this.leaveForm.get('toDate')?.value;
    if (fromVal && toVal && fromVal === toVal) {
      this.leaveForm.patchValue({ fromHalfSession: session });
    }
    this.dateRange.set({ ...this.dateRange() });
  }

  initForm(): void {
    this.leaveForm = this.fb.group({
      leaveTypeId: [1, Validators.required],
      leaveReasonId: [null, [Validators.required]],
      fromDate: ['', Validators.required],
      fromDayType: ['FULL', Validators.required],
      fromHalfSession: ['FIRST_HALF'],
      toDate: ['', Validators.required],
      toDayType: ['FULL', Validators.required],
      toHalfSession: ['SECOND_HALF'],
      reason: ['', [Validators.maxLength(500)]],
      isHalfDay: [false]
    });

    this.leaveForm.valueChanges.subscribe(val => {
      this.dateRange.set({
        from: val.fromDate || '',
        to: val.toDate || ''
      });
    });

    this.leaveForm.get('leaveTypeId')?.valueChanges.subscribe(typeId => {
      if (typeId) {
        this.onLeaveTypeChanged(Number(typeId));
      }
    });

    this.leaveForm.get('fromDayType')?.valueChanges.subscribe(type => {
      const fromVal = this.leaveForm.get('fromDate')?.value;
      const toVal = this.leaveForm.get('toDate')?.value;
      if (fromVal && toVal && fromVal === toVal) {
        this.leaveForm.patchValue({ toDayType: type }, { emitEvent: false });
      }
      const hasHalf = type === 'HALF' || this.leaveForm.get('toDayType')?.value === 'HALF';
      this.leaveForm.patchValue({ isHalfDay: hasHalf }, { emitEvent: false });
    });

    this.leaveForm.get('toDayType')?.valueChanges.subscribe(type => {
      const fromVal = this.leaveForm.get('fromDate')?.value;
      const toVal = this.leaveForm.get('toDate')?.value;
      if (fromVal && toVal && fromVal === toVal) {
        this.leaveForm.patchValue({ fromDayType: type }, { emitEvent: false });
      }
      const hasHalf = this.leaveForm.get('fromDayType')?.value === 'HALF' || type === 'HALF';
      this.leaveForm.patchValue({ isHalfDay: hasHalf }, { emitEvent: false });
    });

    this.leaveForm.get('fromHalfSession')?.valueChanges.subscribe(sess => {
      const fromVal = this.leaveForm.get('fromDate')?.value;
      const toVal = this.leaveForm.get('toDate')?.value;
      if (fromVal && toVal && fromVal === toVal) {
        this.leaveForm.patchValue({ toHalfSession: sess }, { emitEvent: false });
      }
    });

    this.leaveForm.get('toHalfSession')?.valueChanges.subscribe(sess => {
      const fromVal = this.leaveForm.get('fromDate')?.value;
      const toVal = this.leaveForm.get('toDate')?.value;
      if (fromVal && toVal && fromVal === toVal) {
        this.leaveForm.patchValue({ fromHalfSession: sess }, { emitEvent: false });
      }
    });

    this.leaveForm.get('fromDate')?.valueChanges.subscribe(fromVal => {
      if (fromVal) {
        const maxEnd = this.calculateMaxEndDate(fromVal);
        const toVal = this.leaveForm.get('toDate')?.value;
        if (!toVal || new Date(toVal) < new Date(fromVal)) {
          this.leaveForm.patchValue({ toDate: fromVal }, { emitEvent: false });
          this.dateRange.set({ from: fromVal, to: fromVal });
        } else if (maxEnd && toVal > maxEnd) {
          this.leaveForm.patchValue({ toDate: maxEnd }, { emitEvent: false });
          this.dateRange.set({ from: fromVal, to: maxEnd });
          const ent = this.currentEntitlement();
          const maxLimit = this.getMaxAllowedLimit();
          this.errorMessage.set(
            `Date range adjusted: Maximum limit for ${ent?.leaveTypeName || 'this leave'} is ${maxLimit} day(s). To Date restricted to ${this.formatDisplayDate(maxEnd)}.`
          );
        }
      }
    });

    this.leaveForm.get('toDate')?.valueChanges.subscribe(toVal => {
      if (!toVal) return;
      const fromVal = this.leaveForm.get('fromDate')?.value;
      if (!fromVal) return;

      const maxEnd = this.maxSelectableEndDate();
      if (maxEnd && toVal > maxEnd) {
        const ent = this.currentEntitlement();
        const maxLimit = this.getMaxAllowedLimit();
        this.leaveForm.patchValue({ toDate: maxEnd }, { emitEvent: false });
        this.dateRange.set({ from: fromVal, to: maxEnd });
        this.errorMessage.set(
          `Date exceeds limit: Maximum allowed duration for ${ent?.leaveTypeName || 'this leave'} is ${maxLimit} day(s). To Date restricted to ${this.formatDisplayDate(maxEnd)}.`
        );
      }
    });
  }

  loadEntitlements(): void {
    this.isLoadingEntitlements.set(true);
    this.leaveService.getEmployeeEntitlements(this.employeeId).subscribe({
      next: (res) => {
        this.isLoadingEntitlements.set(false);
        if (res.success && res.data) {
          this.entitlements.set(res.data);
          const currentTypeId = this.leaveForm?.get('leaveTypeId')?.value;
          if (currentTypeId) {
            const match = res.data.find(e => e.leaveTypeId === Number(currentTypeId));
            this.selectedEntitlement.set(match || res.data[0] || null);
          } else if (res.data.length > 0) {
            this.leaveForm?.patchValue({ leaveTypeId: res.data[0].leaveTypeId });
            this.selectedEntitlement.set(res.data[0]);
          }
        }
      },
      error: (err) => {
        this.isLoadingEntitlements.set(false);
        console.error('Failed to load leave entitlements', err);
      }
    });
  }

  onLeaveTypeChanged(leaveTypeId: number): void {
    const entitlement = this.entitlements().find(e => e.leaveTypeId === leaveTypeId);
    if (entitlement) {
      this.selectedEntitlement.set(entitlement);
      if (!entitlement.allowHalfDay) {
        this.leaveForm.patchValue({
          fromDayType: 'FULL',
          toDayType: 'FULL',
          isHalfDay: false
        });
      }
    }

    // Immediately re-evaluate current date range with new limit
    const fromVal = this.leaveForm.get('fromDate')?.value;
    const toVal = this.leaveForm.get('toDate')?.value;
    if (fromVal && toVal) {
      const maxEnd = this.calculateMaxEndDate(fromVal);
      if (maxEnd && toVal > maxEnd) {
        this.leaveForm.patchValue({ toDate: maxEnd });
        const entName = entitlement?.leaveTypeName || 'this leave';
        this.errorMessage.set(
          `Adjusted To Date to ${this.formatDisplayDate(maxEnd)} to comply with ${entName}'s limit of ${this.getMaxAllowedLimit()} day(s).`
        );
      }
    }

    // Also fetch fresh from server to guarantee authoritative synchronization
    this.leaveService.getEmployeeEntitlementByLeaveType(this.employeeId, leaveTypeId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const freshData = res.data;
          this.selectedEntitlement.set(freshData);
          this.entitlements.update(list => {
            const idx = list.findIndex(item => item.leaveTypeId === leaveTypeId);
            if (idx >= 0) {
              const updated = [...list];
              updated[idx] = freshData;
              return updated;
            }
            return [...list, freshData];
          });

          const currentFrom = this.leaveForm.get('fromDate')?.value;
          const currentTo = this.leaveForm.get('toDate')?.value;
          if (currentFrom && currentTo) {
            const freshMaxEnd = this.calculateMaxEndDate(currentFrom);
            if (freshMaxEnd && currentTo > freshMaxEnd) {
              this.leaveForm.patchValue({ toDate: freshMaxEnd });
            }
          }
        }
      }
    });
  }

  loadHolidays(): void {
    this.leaveService.getHolidays().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.holidays.set(res.data);
          this.generateCalendarDays();
        }
      },
      error: (err) => {
        console.error('Failed to load official holidays', err);
        this.generateCalendarDays();
      }
    });
  }

  loadReasons(): void {
    this.leaveService.getLeaveReasons().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.leaveReasons.set(res.data);
          if (res.data.length > 0 && !this.leaveForm.get('leaveReasonId')?.value) {
            this.leaveForm.patchValue({ leaveReasonId: res.data[0].id });
          }
        }
      },
      error: (err) => {
        console.error('Failed to load leave reasons', err);
      }
    });
  }

  loadBalances(): void {
    this.leaveService.getLeaveBalances(this.employeeId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.balances.set(res.data);
          // Default to first balance's leaveTypeId
          if (res.data.length > 0 && !this.leaveForm.get('leaveTypeId')?.value) {
            this.leaveForm.patchValue({ leaveTypeId: res.data[0].leaveTypeId });
          }
        }
      },
      error: () => {}
    });
  }

  loadMyLeaves(): void {
    this.isLoading.set(true);
    this.leaveService.getMyLeaves(this.employeeId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.leaves.set(res.data);
          this.generateCalendarDays();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load leaves', err);
        this.generateCalendarDays();
      }
    });
  }

  submitLeave(): void {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      this.errorMessage.set('Please complete all mandatory fields marked with an asterisk (*) before submitting.');
      return;
    }

    const {
      leaveTypeId,
      leaveReasonId,
      fromDate,
      toDate,
      reason,
      fromDayType,
      fromHalfSession,
      toDayType,
      toHalfSession
    } = this.leaveForm.value;

    if (!leaveReasonId) {
      this.errorMessage.set('Please select a valid Leave Reason.');
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      this.errorMessage.set('To Date cannot be earlier than From Date.');
      return;
    }

    const dateErr = this.dateValidationError();
    if (dateErr) {
      this.errorMessage.set(dateErr);
      return;
    }

    const hasHalf = fromDayType === 'HALF' || toDayType === 'HALF';

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveService.applyLeave({
      employeeId: this.employeeId,
      leaveTypeId: Number(leaveTypeId),
      leaveReasonId: Number(leaveReasonId),
      fromDate: fromDate,
      toDate: toDate,
      reason: reason?.trim() || '',
      isHalfDay: hasHalf,
      fromDayType: fromDayType || 'FULL',
      fromHalfSession: fromDayType === 'HALF' ? (fromHalfSession || 'FIRST_HALF') : null,
      toDayType: toDayType || 'FULL',
      toHalfSession: toDayType === 'HALF' ? (toHalfSession || 'SECOND_HALF') : null
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          const msg = res.message || `Leave application submitted successfully. Balance deducted immediately.`;
          this.successMessage.set(msg);
          this.initForm();
          if (this.leaveReasons().length > 0) {
            this.leaveForm.patchValue({ leaveReasonId: this.leaveReasons()[0].id });
          }
          this.loadEntitlements();
          this.loadBalances();
          this.loadMyLeaves();
        } else {
          this.errorMessage.set(res.message || 'Unable to submit leave application.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.message || 'Failed to submit leave application. Please check your network or try again.';
        this.errorMessage.set(msg);
      }
    });
  }

  cancelMyLeave(leave: EmployeeLeaveDto): void {
    const formattedFrom = leave.fromDate.split('T')[0];
    const formattedTo = leave.toDate.split('T')[0];
    if (!confirm(`Are you sure you want to cancel your leave application (${formattedFrom} to ${formattedTo})? Your deducted leave balance will be restored.`)) {
      return;
    }

    const remarks = prompt('Please enter cancellation remarks (optional):', 'Cancelled by applicant') || 'Cancelled by applicant';

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveService.cancelLeave({
      leaveId: leave.leaveId,
      cancellationReason: remarks
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          const msg = res.message || 'Leave application cancelled and balance restored successfully.';
          this.successMessage.set(msg);
          this.loadBalances();
          this.loadMyLeaves();
        } else {
          this.errorMessage.set(res.message || 'Unable to cancel this leave.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.message || 'Failed to cancel leave application.';
        this.errorMessage.set(msg);
      }
    });
  }

  prevMonth(): void {
    const cur = this.currentCalendarDate();
    this.currentCalendarDate.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
    this.generateCalendarDays();
  }

  nextMonth(): void {
    const cur = this.currentCalendarDate();
    this.currentCalendarDate.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
    this.generateCalendarDays();
  }

  goToToday(): void {
    this.currentCalendarDate.set(new Date());
    this.generateCalendarDays();
  }

  private generateCalendarDays(): void {
    const cur = this.currentCalendarDate();
    const year = cur.getFullYear();
    const month = cur.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const todayStr = this.formatDate(new Date());
    const days: CalendarDay[] = [];
    const holidayMap = this.holidayMap();

    // Previous month padding days
    for (let i = firstDayIndex; i > 0; i--) {
      const d = new Date(year, month - 1, prevLastDate - i + 1);
      const dStr = this.formatDate(d);
      const dayOfWeek = d.getDay();
      const hol = holidayMap.get(dStr);
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: prevLastDate - i + 1,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isHoliday: !!hol,
        holidayName: hol?.holidayName,
        ...this.getLeaveForDate(dStr)
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      const dStr = this.formatDate(d);
      const dayOfWeek = d.getDay();
      const hol = holidayMap.get(dStr);
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isHoliday: !!hol,
        holidayName: hol?.holidayName,
        ...this.getLeaveForDate(dStr)
      });
    }

    // Next month padding days to complete 42 or 35 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = this.formatDate(d);
      const dayOfWeek = d.getDay();
      const hol = holidayMap.get(dStr);
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isHoliday: !!hol,
        holidayName: hol?.holidayName,
        ...this.getLeaveForDate(dStr)
      });
    }

    this.calendarDays.set(days);
  }

  private getLeaveForDate(dateStr: string): { leaveStatus?: 'PENDING' | 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null; leaveTypeCode?: string } {
    const allLeaves = this.leaves();
    // Prioritize APPROVED first, then PENDING / APPLIED
    for (const l of allLeaves) {
      const from = l.fromDate.split('T')[0];
      const to = l.toDate.split('T')[0];
      if (dateStr >= from && dateStr <= to) {
        if (l.leaveStatus === 'APPROVED') {
          return { leaveStatus: 'APPROVED', leaveTypeCode: l.leaveTypeCode };
        }
      }
    }

    for (const l of allLeaves) {
      const from = l.fromDate.split('T')[0];
      const to = l.toDate.split('T')[0];
      if (dateStr >= from && dateStr <= to) {
        if (l.leaveStatus === 'PENDING' || l.leaveStatus === 'APPLIED') {
          return { leaveStatus: 'PENDING', leaveTypeCode: l.leaveTypeCode };
        }
      }
    }

    return { leaveStatus: null, leaveTypeCode: undefined };
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
