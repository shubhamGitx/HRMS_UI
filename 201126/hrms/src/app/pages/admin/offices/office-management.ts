import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OfficeService, DepartmentOfficeDto, OfficeCreatedResult } from '../../../core/services/officeService/office.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { transliterateHindiName } from '../../../core/i18n/hindi-transliteration';
import { indianMobileValidator, personNameValidator } from '../../../shared/validators/custom-validators';

@Component({
  selector: 'app-office-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './office-management.html',
  styleUrl: './office-management.css'
})
export class OfficeManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private officeService = inject(OfficeService);
  private authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  offices = signal<DepartmentOfficeDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Modal / drawer state
  isCreateModalOpen = signal<boolean>(false);
  createdOfficeResult = signal<OfficeCreatedResult | null>(null);
  credentialsCopied = signal<boolean>(false);

  // Form
  officeForm!: FormGroup;
  isHindiManual = false;
  showPassword = false;

  get currentUserRole(): string {
    return this.authSession.user?.roleCode || 'SUP';
  }

  get userDepartmentId(): number {
    return this.authSession.user?.departmentId || 1;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadOffices();
  }

  initForm(): void {
    this.officeForm = this.fb.group({
      officeName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      officeNameHindi: [''],
      adminName: ['', [Validators.required, personNameValidator(3)]],
      adminPhone: ['', [indianMobileValidator(false)]],
      adminEmail: ['', [Validators.email]],
      adminUserId: ['', [Validators.pattern('^[a-zA-Z0-9_]{3,30}$')]],
      adminPassword: ['Admin@123', [Validators.required, Validators.minLength(6)]]
    });

    // Real-time Hindi transliteration for Office Name
    this.officeForm.get('officeName')?.valueChanges.subscribe((name: string) => {
      const trimmed = (name || '').trim();
      if (!trimmed) {
        this.isHindiManual = false;
        this.officeForm.get('officeNameHindi')?.setValue('', { emitEvent: false });
      } else if (!this.isHindiManual) {
        const hindi = transliterateHindiName(name);
        this.officeForm.get('officeNameHindi')?.setValue(hindi, { emitEvent: false });
      }
    });
  }

  onHindiInput(): void {
    this.isHindiManual = true;
  }

  loadOffices(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.officeService.getDepartmentOffices(this.userDepartmentId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.offices.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load department offices.');
      }
    });
  }

  openCreateModal(): void {
    this.officeForm.reset({ adminPassword: 'Admin@123' });
    this.isHindiManual = false;
    this.createdOfficeResult.set(null);
    this.credentialsCopied.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreateOffice(): void {
    this.errorMessage.set(null);

    if (this.officeForm.invalid) {
      this.officeForm.markAllAsTouched();
      this.errorMessage.set('Please fill all mandatory fields correctly.');
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.officeForm.value;

    this.officeService.createOffice({
      officeName: formVal.officeName.trim(),
      officeNameHindi: formVal.officeNameHindi?.trim() || undefined,
      adminName: formVal.adminName.trim(),
      adminPhone: formVal.adminPhone?.trim() || undefined,
      adminEmail: formVal.adminEmail?.trim() || undefined,
      adminUserId: formVal.adminUserId?.trim() || undefined,
      adminPassword: formVal.adminPassword?.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success && res.data) {
          this.createdOfficeResult.set(res.data);
          this.successMessage.set(res.message);
          this.loadOffices(); // Refresh offices table
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create office.');
      }
    });
  }

  copyCredentials(result: OfficeCreatedResult): void {
    const textToCopy = `HRMS Office Admin Credentials\nOffice: ${result.officeName} (ID: ${result.officeId})\nUser ID: ${result.userId}\nDefault Password: ${result.defaultPassword || 'Admin@123'}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.credentialsCopied.set(true);
      setTimeout(() => this.credentialsCopied.set(false), 3000);
    });
  }
}
