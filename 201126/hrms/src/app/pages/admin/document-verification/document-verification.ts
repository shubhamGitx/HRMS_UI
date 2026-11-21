import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { 
  AdminDocumentService, 
  AdminDocumentItem, 
  DocumentVerificationHistoryItem, 
  EmployeeDocumentSummary 
} from '../../../core/services/admin-document.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-document-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-verification.html',
  styleUrl: './document-verification.css'
})
export class DocumentVerificationComponent implements OnInit {
  private adminDocService = inject(AdminDocumentService);
  private authSession = inject(AuthSessionService);
  public readonly language = inject(LanguageService);

  // Data states
  documents = signal<AdminDocumentItem[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filter states
  activeTab = signal<'Pending' | 'Verified' | 'Rejected' | 'All'>('Pending');
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('ALL');

  // Counts
  pendingCount = computed(() => this.documents().filter(d => d.status === 'Pending').length);
  verifiedCount = computed(() => this.documents().filter(d => d.status === 'Verified').length);
  rejectedCount = computed(() => this.documents().filter(d => d.status === 'Rejected').length);
  totalCount = computed(() => this.documents().length);

  // Filtered documents
  filteredDocuments = computed(() => {
    let list = this.documents();
    const tab = this.activeTab();
    if (tab !== 'All') {
      list = list.filter(d => d.status.toLowerCase() === tab.toLowerCase());
    }

    const cat = this.selectedCategory();
    if (cat !== 'ALL') {
      list = list.filter(d => d.category?.toLowerCase() === cat.toLowerCase());
    }

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter(d =>
        (d.employeeName && d.employeeName.toLowerCase().includes(term)) ||
        (d.employeeCode && d.employeeCode.toLowerCase().includes(term)) ||
        (d.documentName && d.documentName.toLowerCase().includes(term)) ||
        (d.departmentName && d.departmentName.toLowerCase().includes(term)) ||
        (d.category && d.category.toLowerCase().includes(term))
      );
    }

    return list;
  });

  // Verify Modal
  targetVerifyDoc = signal<AdminDocumentItem | null>(null);
  verifyRemarks: string = '';

  // Reject Modal
  targetRejectDoc = signal<AdminDocumentItem | null>(null);
  rejectRemarks: string = '';
  rejectRemarksError = signal<string | null>(null);

  // History Modal
  targetHistoryDoc = signal<AdminDocumentItem | null>(null);
  historyItems = signal<DocumentVerificationHistoryItem[]>([]);
  isLoadingHistory = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminDocService.getDocumentsForVerification().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.data) {
          this.documents.set(res.data);
        } else {
          this.documents.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load documents for verification.');
      }
    });
  }

  setTab(tab: 'Pending' | 'Verified' | 'Rejected' | 'All'): void {
    this.activeTab.set(tab);
  }

  // ── Verification Flow ──
  openVerifyModal(doc: AdminDocumentItem): void {
    this.targetVerifyDoc.set(doc);
    this.verifyRemarks = '';
  }

  closeVerifyModal(): void {
    if (this.isSubmitting()) return;
    this.targetVerifyDoc.set(null);
  }

  confirmVerify(): void {
    const doc = this.targetVerifyDoc();
    if (!doc) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.adminDocService.verifyDocument(doc.documentId, this.verifyRemarks).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.successMessage.set(`Document "${doc.documentName}" for ${doc.employeeName} (${doc.employeeCode}) has been verified successfully.`);
          this.closeVerifyModal();
          this.loadDocuments();
        } else {
          this.errorMessage.set(res.message || 'Failed to verify document.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to verify document.');
      }
    });
  }

  // ── Rejection Flow ──
  openRejectModal(doc: AdminDocumentItem): void {
    this.targetRejectDoc.set(doc);
    this.rejectRemarks = '';
    this.rejectRemarksError.set(null);
  }

  closeRejectModal(): void {
    if (this.isSubmitting()) return;
    this.targetRejectDoc.set(null);
    this.rejectRemarksError.set(null);
  }

  confirmReject(): void {
    const doc = this.targetRejectDoc();
    if (!doc) return;

    const remarks = this.rejectRemarks.trim();
    if (!remarks || remarks.length < 5) {
      this.rejectRemarksError.set('Rejection remarks are mandatory (at least 5 characters). Please provide a clear reason.');
      return;
    }

    this.isSubmitting.set(true);
    this.rejectRemarksError.set(null);
    this.errorMessage.set(null);

    this.adminDocService.rejectDocument(doc.documentId, remarks).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.successMessage.set(`Document "${doc.documentName}" has been rejected. The remarks have been recorded.`);
          this.closeRejectModal();
          this.loadDocuments();
        } else {
          this.errorMessage.set(res.message || 'Failed to reject document.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reject document.');
      }
    });
  }

  // ── History Audit Trail ──
  openHistoryModal(doc: AdminDocumentItem): void {
    this.targetHistoryDoc.set(doc);
    this.historyItems.set([]);
    this.isLoadingHistory.set(true);

    this.adminDocService.getDocumentHistory(doc.documentId).subscribe({
      next: (res) => {
        this.isLoadingHistory.set(false);
        if (res && res.data) {
          this.historyItems.set(res.data);
        }
      },
      error: () => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  closeHistoryModal(): void {
    this.targetHistoryDoc.set(null);
    this.historyItems.set([]);
  }

  // ── Document View & Download ──
  viewDocument(doc: AdminDocumentItem): void {
    this.adminDocService.viewDocument(doc.documentId).subscribe({
      next: (blob) => {
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
      },
      error: () => {
        this.errorMessage.set(`Unable to preview document "${doc.documentName}".`);
      }
    });
  }

  downloadDocument(doc: AdminDocumentItem): void {
    if (!doc || !doc.documentId) {
      this.errorMessage.set('Validation Notice: Document identifier is invalid.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.adminDocService.downloadDocument(doc.documentId).subscribe({
      next: (blob) => {
        if (blob.type && blob.type.includes('json')) {
          blob.text().then(text => {
            try {
              const err = JSON.parse(text);
              this.errorMessage.set(err.message || `Validation Alert: Document "${doc.documentName}" file is not found on server.`);
            } catch {
              this.errorMessage.set(`Validation Alert: Document "${doc.documentName}" file is not found on server.`);
            }
          });
          return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ext = doc.fileName ? doc.fileName.substring(doc.fileName.lastIndexOf('.')) : (doc.contentType?.includes('pdf') ? '.pdf' : '.jpg');
        const safeName = (doc.documentName || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_');
        a.download = `${safeName}${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.successMessage.set(`Validation Success: Document "${doc.documentName}" for ${doc.employeeName} (${doc.employeeCode}) downloaded successfully.`);
      },
      error: () => {
        this.errorMessage.set(`Validation Alert: Unable to download "${doc.documentName}". The file may not exist on the storage path.`);
      }
    });
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
}
