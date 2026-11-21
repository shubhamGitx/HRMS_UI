import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bulk-upload.html',
  styleUrl: './bulk-upload.css',
})
export class BulkUpload {
  public readonly language = inject(LanguageService);
  @Output() switchToSingle = new EventEmitter<void>();

  step = signal<number>(1);
  selectedFileName = signal<string | null>(null);
  isUploading = signal<boolean>(false);
  uploadSuccess = signal<boolean>(false);
  savedCount = signal<number | null>(null);

  downloadTemplate(): void {
    // Generate CSV template or prompt download
    const headers = [
      'Title', 'FullName', 'FullNameHindi', 'DateOfBirth', 'Gender', 'BloodGroup',
      'Category', 'FatherName', 'MotherName', 'JoiningDate', 'EmploymentStatus',
      'EmployeeType', 'Office', 'Designation', 'IDType', 'IDNumber', 'Mobile', 'Email',
      'BankName', 'Branch', 'IFSC', 'AccountNumber'
    ];
    const sampleRow = [
      'Mr.', 'Ramesh Kumar', 'रमेश कुमार', '1995-05-15', 'Male', 'O+',
      'General', 'Suresh Kumar', 'Sunita Devi', '2024-01-10', 'Active',
      'Contractual', 'BRDS State HQ - Patna', 'System Analyst', 'Aadhaar Card', '123456789012',
      '9876543210', 'ramesh@bihar.gov.in', 'State Bank of India', 'Patna Main', 'SBIN0001234', '12345678901'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'BRDS_Employee_Master_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFileName.set(file.name);
      this.step.set(2);
    }
  }

  processUpload(): void {
    if (!this.selectedFileName()) return;
    this.isUploading.set(true);

    setTimeout(() => {
      this.isUploading.set(false);
      this.uploadSuccess.set(true);
      this.savedCount.set(12);
      this.step.set(3);
    }, 1200);
  }

  reset(): void {
    this.step.set(1);
    this.selectedFileName.set(null);
    this.uploadSuccess.set(false);
    this.savedCount.set(null);
  }
}
