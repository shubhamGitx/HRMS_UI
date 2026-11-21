import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../shared/profile.service';
import { formatDate } from '../shared/form-utils';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProfileDocument } from '../shared/profile.models';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { EmployeeApiService } from '@core/services/employee-api.service';

interface DocTypeOption {
  id: number;
  name: string;
}

interface RequiredDocStatus {
  name: string;
  doc: ProfileDocument | null;
  status: 'Verified' | 'Pending' | 'Rejected' | 'Missing';
  remarks?: string | null;
}

/** My Profile > Documents (VIEW & MANAGEMENT) */
@Component({
  selector: 'app-profile-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="mp-layout">
      <!-- Main Content Area: Document List Card -->
      <section class="mp-card">
        <div class="mp-card-head">
          <h3><i class="bi bi-folder2-open"></i> {{ 'My Documents' | translate }}</h3>
          <div style="display:flex; align-items:center; gap:10px">
            <span class="mp-pill blue">{{ list().length }} {{ 'documents' | translate }}</span>
            <button type="button" class="mp-btn" (click)="openUploadModal()">
              <i class="bi bi-cloud-arrow-up"></i> {{ 'Upload Document' | translate }}
            </button>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="mp-tabs" role="tablist">
          @for (c of categories(); track c) {
            <button type="button" role="tab" class="mp-tab" [class.active]="cat() === c" (click)="cat.set(c)">
              {{ c | translate }}
            </button>
          }
        </div>

        <div class="mp-card-body">
          @if (list().length > 0) {
            <div class="mp-table-wrap">
              <table class="mp-table">
                <thead>
                  <tr>
                    <th>{{ 'Document' | translate }}</th>
                    <th>{{ 'Category' | translate }}</th>
                    <th>{{ 'File' | translate }}</th>
                    <th>{{ 'Uploaded On' | translate }}</th>
                    <th>{{ 'Status' | translate }}</th>
                    <th style="text-align:right">{{ 'Actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (x of list(); track (x.id || x.name)) {
                    <tr>
                      <!-- Document Name & File Type Icon -->
                      <td>
                        <div class="doc-title-cell">
                          <i class="bi bi-file-earmark-pdf mp-row-icon text-danger" *ngIf="x.fileType === 'PDF'"></i>
                          <i class="bi bi-file-earmark-image mp-row-icon text-primary" *ngIf="x.fileType !== 'PDF'"></i>
                          <div>
                            <b class="doc-main-name">{{ x.name | translate }}</b>
                            <small class="text-muted d-block" *ngIf="x.fileName">{{ x.fileName }}</small>
                          </div>
                        </div>
                        <!-- Rejection remarks display if rejected -->
                        @if (x.status === 'Rejected' && x.rejectionRemarks) {
                          <div class="doc-rejection-alert mt-1">
                            <i class="bi bi-exclamation-triangle-fill text-danger me-1"></i>
                            <strong>{{ 'Rejection Reason' | translate }}:</strong> {{ x.rejectionRemarks }}
                          </div>
                        }
                      </td>

                      <!-- Category -->
                      <td><span class="mp-pill grey">{{ x.category | translate }}</span></td>

                      <!-- File Info -->
                      <td>
                        <span class="doc-file-info">{{ x.fileType }}, {{ x.size }}</span>
                      </td>

                      <!-- Upload Date -->
                      <td>{{ fmt(x.uploadedOn) }}</td>

                      <!-- Status Badge -->
                      <td>
                        <span class="mp-pill" 
                          [class.green]="x.status === 'Verified'" 
                          [class.amber]="x.status === 'Pending'" 
                          [class.red]="x.status === 'Rejected'">
                          <i class="bi me-1" 
                            [class.bi-patch-check-fill]="x.status === 'Verified'"
                            [class.bi-hourglass-split]="x.status === 'Pending'"
                            [class.bi-x-circle-fill]="x.status === 'Rejected'"></i>
                          {{ (x.status === 'Pending' ? 'Pending Verification' : x.status) | translate }}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td style="white-space:nowrap; text-align:right">
                        <div class="action-btn-group">
                          <!-- View -->
                          <button type="button" class="mp-icon-btn" (click)="viewDoc(x)" [attr.aria-label]="('View' | translate) + ' ' + (x.name | translate)" title="{{ 'View Document' | translate }}">
                            <i class="bi bi-eye"></i>
                          </button>

                          <!-- Download -->
                          <button type="button" class="mp-icon-btn" (click)="downloadDoc(x)" [attr.aria-label]="('Download' | translate) + ' ' + (x.name | translate)" title="{{ 'Download Document' | translate }}">
                            <i class="bi bi-download"></i>
                          </button>

                          <!-- Delete (Allowed for Pending or Rejected) -->
                          @if (x.status !== 'Verified') {
                            <button type="button" class="mp-icon-btn text-danger" (click)="deleteDoc(x)" [attr.aria-label]="('Delete' | translate) + ' ' + (x.name | translate)" title="{{ 'Delete Document' | translate }}">
                              <i class="bi bi-trash3"></i>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="mp-empty-state">
              <div class="empty-icon"><i class="bi bi-file-earmark-check"></i></div>
              <h4>{{ 'No documents available.' | translate }}</h4>
              <p>{{ 'You have not uploaded any documents under this category. Upload your documents for official verification.' | translate }}</p>
              <button type="button" class="mp-btn" (click)="openUploadModal()">
                <i class="bi bi-cloud-arrow-up"></i> {{ 'Upload Document' | translate }}
              </button>
            </div>
          }
        </div>
      </section>

      <!-- Sidebar: Required Documents & Upload Rules -->
      <aside class="mp-col">
        <!-- Dynamic Required Documents Panel -->
        <section class="mp-card">
          <div class="mp-card-head">
            <h3><i class="bi bi-list-check"></i> {{ 'Required Documents' | translate }}</h3>
          </div>
          <div class="mp-req-list">
            @for (req of requiredDocStatusList(); track req.name) {
              <div class="mp-req-item" [class.is-verified]="req.status === 'Verified'" [class.is-pending]="req.status === 'Pending'" [class.is-rejected]="req.status === 'Rejected'" [class.is-missing]="req.status === 'Missing'">
                <div class="mp-req-top">
                  <div class="d-flex align-items-center gap-2">
                    <i class="bi req-icon"
                      [class.bi-check-circle-fill]="req.status === 'Verified'"
                      [class.bi-hourglass-split]="req.status === 'Pending'"
                      [class.bi-exclamation-circle-fill]="req.status === 'Rejected'"
                      [class.bi-dash-circle]="req.status === 'Missing'"></i>
                    <strong class="req-title">{{ req.name | translate }}</strong>
                  </div>
                  <span class="req-pill" 
                    [class.pill-green]="req.status === 'Verified'"
                    [class.pill-amber]="req.status === 'Pending'"
                    [class.pill-red]="req.status === 'Rejected'"
                    [class.pill-grey]="req.status === 'Missing'">
                    {{ (req.status === 'Pending' ? 'Uploaded / Pending' : req.status) | translate }}
                  </span>
                </div>

                <!-- Rejection Remarks in Sidebar if Rejected -->
                @if (req.status === 'Rejected' && req.remarks) {
                  <div class="req-remarks-box">
                    <small><b>{{ 'Reason' | translate }}:</b> {{ req.remarks }}</small>
                  </div>
                }

                <!-- Quick Upload Action if Missing or Rejected -->
                @if (req.status === 'Missing' || req.status === 'Rejected') {
                  <button type="button" class="btn-quick-upload" (click)="openUploadForRequired(req.name)">
                    <i class="bi bi-cloud-arrow-up me-1"></i> {{ (req.status === 'Rejected' ? 'Re-upload' : 'Upload') | translate }}
                  </button>
                }
              </div>
            }
          </div>
        </section>

        <!-- Upload Rules Panel -->
        <section class="mp-card">
          <div class="mp-card-head">
            <h3><i class="bi bi-info-circle"></i> {{ 'Upload Guidelines' | translate }}</h3>
          </div>
          <div class="mp-info">
            <i class="bi bi-info-circle-fill"></i>
            <div>
              {{ 'Accepted Formats: PDF, JPG, JPEG, PNG (up to 5 MB each). Ensure scans are clear, upright, and legible. Uploaded documents are submitted for HR/Admin review and marked Pending until verified.' | translate }}
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- ==============================================
         UPLOAD DOCUMENT MODAL DIALOG
         ============================================== -->
    <div class="doc-modal-backdrop" *ngIf="showUploadModal()" (click)="closeUploadModal()">
      <div class="doc-modal" (click)="$event.stopPropagation()">
        <div class="doc-modal-header">
          <h3><i class="bi bi-cloud-arrow-up-fill me-2 text-primary"></i>{{ 'Upload Document' | translate }}</h3>
          <button type="button" class="btn-close-modal" (click)="closeUploadModal()">&times;</button>
        </div>

        <form (ngSubmit)="submitUpload()">
          <div class="doc-modal-body">
            <!-- Upload Error Alert -->
            <div *ngIf="uploadError()" class="upload-alert error">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ uploadError() }}</span>
            </div>

            <!-- Document Type Selection -->
            <div class="form-group mb-3">
              <label class="form-label required">{{ 'Document Type' | translate }}</label>
              <select class="form-select-custom" [(ngModel)]="selectedTypeId" name="documentType" (change)="onDocTypeChange()" required>
                <option [ngValue]="null">-- {{ 'Select Document Type' | translate }} --</option>
                <option *ngFor="let t of docTypes()" [ngValue]="t.id">{{ t.name }}</option>
              </select>
            </div>

            <!-- Custom Document Title -->
            <div class="form-group mb-3">
              <label class="form-label required">{{ 'Document Title / Name' | translate }}</label>
              <input type="text" class="form-control-custom" [(ngModel)]="customDocName" name="docName" placeholder="e.g. Aadhaar Card Front & Back" required />
            </div>

            <!-- Category -->
            <div class="form-group mb-3">
              <label class="form-label">{{ 'Category' | translate }}</label>
              <select class="form-select-custom" [(ngModel)]="uploadCategory" name="category">
                <option value="Identity">{{ 'Identity' | translate }}</option>
                <option value="Education">{{ 'Education' | translate }}</option>
                <option value="Banking">{{ 'Banking' | translate }}</option>
                <option value="Contract">{{ 'Contract' | translate }}</option>
                <option value="Experience">{{ 'Experience' | translate }}</option>
                <option value="Other">{{ 'Other' | translate }}</option>
              </select>
            </div>

            <!-- File Upload Input (Browse / Drag & Drop) -->
            <div class="form-group mb-2">
              <label class="form-label required">{{ 'Select File' | translate }}</label>
              <div class="file-drop-area" (click)="fileInput.click()">
                <input type="file" #fileInput (change)="onFilePicked($event)" style="display:none" accept=".pdf,.png,.jpg,.jpeg">
                <i class="bi bi-file-earmark-arrow-up file-icon" *ngIf="!selectedFile()"></i>
                <i class="bi bi-file-earmark-check-fill file-icon text-success" *ngIf="selectedFile()"></i>
                <div class="file-prompt" *ngIf="!selectedFile()">
                  <strong>{{ 'Click to browse' | translate }}</strong>
                  <small>{{ 'PDF, JPG, JPEG, PNG (Max 5 MB)' | translate }}</small>
                </div>
                <div class="file-selected-info" *ngIf="selectedFile() as file">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">({{ (file.size / 1024 / 1024).toFixed(2) }} MB)</span>
                </div>
              </div>
            </div>

            <small class="text-muted d-block mt-2">
              <i class="bi bi-shield-check text-success me-1"></i>
              {{ 'Files are stored securely on the server and verified by authorized officials.' | translate }}
            </small>
          </div>

          <div class="doc-modal-footer">
            <button type="button" class="btn-cancel" (click)="closeUploadModal()" [disabled]="isUploading()">
              {{ 'Cancel' | translate }}
            </button>
            <button type="submit" class="mp-btn" [disabled]="isUploading() || !selectedFile()">
              <i class="bi" [ngClass]="isUploading() ? 'bi-arrow-clockwise spin' : 'bi-cloud-arrow-up'"></i>
              {{ isUploading() ? ('Uploading...' | translate) : ('Upload Document' | translate) }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==============================================
         IMAGE PREVIEW MODAL
         ============================================== -->
    <div class="doc-modal-backdrop" *ngIf="previewImage()" (click)="closeImagePreview()">
      <div class="image-preview-dialog" (click)="$event.stopPropagation()">
        <div class="doc-modal-header">
          <h3><i class="bi bi-image me-2 text-primary"></i>{{ previewImageTitle() }}</h3>
          <button type="button" class="btn-close-modal" (click)="closeImagePreview()">&times;</button>
        </div>
        <div class="image-preview-body">
          <img [src]="previewImage()" [alt]="previewImageTitle()" class="preview-img" />
        </div>
        <div class="doc-modal-footer">
          <button type="button" class="btn-cancel" (click)="closeImagePreview()">
            {{ 'Close' | translate }}
          </button>
          <a [href]="previewImage()" [download]="previewImageTitle()" class="mp-btn">
            <i class="bi bi-download"></i> {{ 'Download Image' | translate }}
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .doc-title-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .doc-main-name {
      font-weight: 600;
      color: #0f172a;
    }
    .doc-rejection-alert {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.76rem;
      color: #991b1b;
      margin-top: 4px;
    }
    .doc-file-info {
      font-size: 0.8rem;
      color: #475569;
    }
    .action-btn-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Required Documents Panel */
    .mp-req-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
    }
    .mp-req-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      transition: all 0.2s ease;
    }
    .mp-req-item.is-verified {
      border-color: #bbf7d0;
      background: #f0fdf4;
    }
    .mp-req-item.is-pending {
      border-color: #fef08a;
      background: #fefce8;
    }
    .mp-req-item.is-rejected {
      border-color: #fecaca;
      background: #fef2f2;
    }
    .mp-req-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .req-title {
      font-size: 0.84rem;
      color: #1e293b;
    }
    .req-icon {
      font-size: 1.05rem;
    }
    .is-verified .req-icon { color: #16a34a; }
    .is-pending .req-icon { color: #d97706; }
    .is-rejected .req-icon { color: #dc2626; }
    .is-missing .req-icon { color: #94a3b8; }

    .req-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .pill-green { background: #dcfce7; color: #15803d; }
    .pill-amber { background: #fef3c7; color: #b45309; }
    .pill-red { background: #fee2e2; color: #b91c1c; }
    .pill-grey { background: #f1f5f9; color: #64748b; }

    .req-remarks-box {
      margin-top: 6px;
      padding: 4px 8px;
      background: #ffffff;
      border-radius: 4px;
      border-left: 3px solid #dc2626;
      font-size: 0.75rem;
      color: #7f1d1d;
    }
    .btn-quick-upload {
      margin-top: 6px;
      background: transparent;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 0.75rem;
      color: #1d4ed8;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      text-align: center;
    }
    .btn-quick-upload:hover {
      background: #eff6ff;
      border-color: #3b82f6;
    }

    /* Empty state */
    .mp-empty-state {
      text-align: center;
      padding: 48px 20px;
      color: #64748b;
    }
    .empty-icon {
      font-size: 3rem;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .mp-empty-state h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .mp-empty-state p {
      font-size: 0.88rem;
      max-width: 440px;
      margin: 0 auto 18px;
      line-height: 1.5;
    }

    /* Modal Backdrop */
    .doc-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(2px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .doc-modal {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      animation: modalSlideIn 0.2s ease-out;
    }
    .image-preview-dialog {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 650px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: modalSlideIn 0.2s ease-out;
    }
    .image-preview-body {
      padding: 20px;
      text-align: center;
      max-height: 70vh;
      overflow-y: auto;
      background: #0f172a;
    }
    .preview-img {
      max-width: 100%;
      max-height: 60vh;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    @keyframes modalSlideIn {
      from { transform: translateY(-16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .doc-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .doc-modal-header h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f2b48;
      margin: 0;
      display: flex;
      align-items: center;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      color: #64748b;
      cursor: pointer;
      padding: 0 4px;
    }
    .btn-close-modal:hover { color: #0f172a; }
    .doc-modal-body {
      padding: 20px;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }
    .form-label.required::after {
      content: ' *';
      color: #ef4444;
    }
    .form-control-custom, .form-select-custom {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #fff;
      transition: border-color 0.15s ease-in-out;
    }
    .form-control-custom:focus, .form-select-custom:focus {
      outline: none;
      border-color: #1e62c8;
      box-shadow: 0 0 0 3px rgba(30, 98, 200, 0.12);
    }
    .file-drop-area {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.2s;
    }
    .file-drop-area:hover {
      border-color: #1e62c8;
      background: #f0f7ff;
    }
    .file-icon {
      font-size: 2rem;
      color: #1e62c8;
      display: block;
      margin-bottom: 6px;
    }
    .file-prompt strong {
      display: block;
      font-size: 0.88rem;
      color: #1e293b;
    }
    .file-prompt small {
      font-size: 0.78rem;
      color: #64748b;
    }
    .file-selected-info {
      font-size: 0.88rem;
      color: #166534;
      font-weight: 600;
    }
    .file-selected-info .file-size {
      color: #64748b;
      font-weight: normal;
      margin-left: 6px;
    }
    .upload-alert.error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 6px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 0.84rem;
      margin-bottom: 14px;
    }
    .doc-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .btn-cancel {
      padding: 7px 16px;
      border-radius: 7px;
      background: #fff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
    }
    .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class ProfileDocuments implements OnInit {
  private readonly profile = inject(ProfileService);
  private readonly authSession = inject(AuthSessionService);
  private readonly employeeApi = inject(EmployeeApiService);
  protected readonly fmt = formatDate;
  protected readonly cat = signal<string>('All');

  // Modal & form states
  protected readonly showUploadModal = signal<boolean>(false);
  protected readonly isUploading = signal<boolean>(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly docTypes = signal<DocTypeOption[]>([]);

  // Image Preview Modal states
  protected readonly previewImage = signal<string | null>(null);
  protected readonly previewImageTitle = signal<string>('');

  protected selectedTypeId: number | null = null;
  protected customDocName = '';
  protected uploadCategory = 'Identity';
  protected selectedFile = signal<File | null>(null);

  protected readonly categories = computed(() => ['All', 'Identity', 'Education', 'Banking', 'Contract', 'Experience', 'Other']);
  
  // All documents of the employee filtered by category tab
  protected readonly list = computed(() => {
    const c = this.cat();
    const docs = this.profile.documents();
    return c === 'All' ? docs : docs.filter((d) => d.category.toLowerCase() === c.toLowerCase());
  });

  // Dynamic Required Documents List
  protected readonly requiredDocTypes = [
    'Aadhaar Card',
    'PAN Card',
    'Highest Qualification',
    'Cancelled Cheque',
    'Signed Contract'
  ];

  protected readonly requiredDocStatusList = computed<RequiredDocStatus[]>(() => {
    const allDocs = this.profile.documents();
    return this.requiredDocTypes.map(reqName => {
      // Find matching document by name keyword
      const found = allDocs.find(d => {
        const dName = (d.name || '').toLowerCase();
        if (reqName === 'Aadhaar Card') return dName.includes('aadhaar');
        if (reqName === 'PAN Card') return dName.includes('pan');
        if (reqName === 'Highest Qualification') return dName.includes('qualification') || dName.includes('degree') || dName.includes('10th') || dName.includes('12th');
        if (reqName === 'Cancelled Cheque') return dName.includes('cheque') || dName.includes('passbook');
        if (reqName === 'Signed Contract') return dName.includes('contract') || dName.includes('appointment');
        return dName.includes(reqName.toLowerCase());
      });

      if (!found) {
        return { name: reqName, doc: null, status: 'Missing' };
      }

      return {
        name: reqName,
        doc: found,
        status: found.status === 'Verified' ? 'Verified' : found.status === 'Rejected' ? 'Rejected' : 'Pending',
        remarks: found.rejectionRemarks
      };
    });
  });

  ngOnInit(): void {
    this.loadDocumentTypes();
    const empId = Number(this.authSession.user?.employeeId || 1);
    this.profile.loadEmployeeDocuments(empId);
  }

  private loadDocumentTypes(): void {
    this.employeeApi.getDocumentTypes().subscribe({
      next: res => {
        if (res && res.data) {
          this.docTypes.set(res.data);
        }
      },
      error: () => {}
    });
  }

  protected openUploadModal(): void {
    this.uploadError.set(null);
    this.selectedFile.set(null);
    this.selectedTypeId = null;
    this.customDocName = '';
    this.uploadCategory = this.cat() === 'All' ? 'Identity' : this.cat();
    this.showUploadModal.set(true);
  }

  protected openUploadForRequired(reqName: string): void {
    this.openUploadModal();
    // Preselect document type if available
    const foundType = this.docTypes().find(t => t.name.toLowerCase().includes(reqName.toLowerCase()));
    if (foundType) {
      this.selectedTypeId = foundType.id;
      this.customDocName = foundType.name;
    } else {
      this.customDocName = reqName;
    }
    this.onDocTypeChange();
  }

  protected closeUploadModal(): void {
    if (this.isUploading()) return;
    this.showUploadModal.set(false);
  }

  protected onDocTypeChange(): void {
    if (this.selectedTypeId) {
      const found = this.docTypes().find(t => t.id === this.selectedTypeId);
      if (found) {
        this.customDocName = found.name;
        const lower = found.name.toLowerCase();
        if (lower.includes('aadhaar') || lower.includes('pan') || lower.includes('photo') || lower.includes('identity')) {
          this.uploadCategory = 'Identity';
        } else if (lower.includes('qualification') || lower.includes('degree') || lower.includes('certificate') || lower.includes('10th') || lower.includes('12th')) {
          this.uploadCategory = 'Education';
        } else if (lower.includes('bank') || lower.includes('cheque') || lower.includes('passbook')) {
          this.uploadCategory = 'Banking';
        } else if (lower.includes('contract') || lower.includes('appointment')) {
          this.uploadCategory = 'Contract';
        } else if (lower.includes('experience') || lower.includes('relieving')) {
          this.uploadCategory = 'Experience';
        }
      }
    }
  }

  protected onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    // Validate size (max 5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadError.set('File size exceeds the 5 MB limit. Please select a smaller file.');
      input.value = '';
      this.selectedFile.set(null);
      return;
    }

    // Validate extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowed.includes(ext)) {
      this.uploadError.set('Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.');
      input.value = '';
      this.selectedFile.set(null);
      return;
    }

    this.uploadError.set(null);
    this.selectedFile.set(file);
    if (!this.customDocName) {
      this.customDocName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }
  }

  protected submitUpload(): void {
    const file = this.selectedFile();
    if (!file) {
      this.uploadError.set('Please select a file to upload.');
      return;
    }
    if (!this.customDocName.trim()) {
      this.uploadError.set('Please enter a document title or select a document type.');
      return;
    }

    const empId = Number(this.authSession.user?.employeeId || 1);
    const formData = new FormData();
    formData.append('file', file);
    if (this.selectedTypeId) {
      formData.append('documentTypeId', String(this.selectedTypeId));
    }
    formData.append('documentName', this.customDocName.trim());
    formData.append('category', this.uploadCategory || 'Identity');

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.employeeApi.uploadDocument(empId, formData).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success) {
          this.profile.showToast('Document uploaded successfully. It is now pending administrative verification.');
          this.closeUploadModal();
          this.profile.loadEmployeeDocuments(empId);
        } else {
          this.uploadError.set(res.message || 'Upload failed.');
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(err.error?.message || 'Failed to upload document. Please try again.');
      }
    });
  }

  // ── View Document (PDF in new tab, Image in Modal) ──
  protected viewDoc(doc: ProfileDocument): void {
    if (!doc.id) {
      this.profile.showToast(`Document "${doc.name}" ID is missing.`, 'error');
      return;
    }

    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.viewDocumentFile(doc.id).subscribe({
      next: (blob) => {
        const isPdf = (doc.fileType === 'PDF') || (blob.type && blob.type.includes('pdf'));
        const fileURL = URL.createObjectURL(blob);

        if (isPdf) {
          if (typeof window !== 'undefined' && window.open) {
            window.open(fileURL, '_blank');
          }
        } else {
          // Open Image Preview Modal
          this.previewImageTitle.set(doc.name);
          this.previewImage.set(fileURL);
        }
      },
      error: () => this.profile.showToast(`Failed to open document "${doc.name}".`, 'error')
    });
  }

  protected closeImagePreview(): void {
    const current = this.previewImage();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.previewImage.set(null);
  }

  // ── Download Document ──
  protected downloadDoc(doc: ProfileDocument): void {
    if (!doc.id) {
      this.profile.showToast(`Validation Alert: Document "${doc.name}" ID is missing.`, 'error');
      return;
    }

    this.profile.showToast(`Downloading "${doc.name}"... Please wait.`);
    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.downloadDocumentFile(doc.id).subscribe({
      next: (blob) => {
        if (blob.type && blob.type.includes('json')) {
          blob.text().then(text => {
            try {
              const err = JSON.parse(text);
              this.profile.showToast(err.message || `Validation Alert: Document "${doc.name}" is not available on server.`, 'error');
            } catch {
              this.profile.showToast(`Validation Alert: Document "${doc.name}" is not available on server.`, 'error');
            }
          });
          return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const fileName = doc.fileName || `${(doc.name || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_')}.${doc.fileType.toLowerCase()}`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
        this.profile.showToast(`Document "${doc.name}" downloaded successfully.`, 'success');
      },
      error: () => this.profile.showToast(`Validation Alert: Failed to download document "${doc.name}". File may not exist on server.`, 'error')
    });
  }

  // ── Delete Document (for Pending or Rejected) ──
  protected deleteDoc(doc: ProfileDocument): void {
    if (!doc.id) return;
    if (doc.status === 'Verified') {
      this.profile.showToast('Verified documents cannot be deleted.', 'error');
      return;
    }

    const confirmed = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to delete the document "${doc.name}"?`) : true;
    if (!confirmed) return;

    const empId = Number(this.authSession.user?.employeeId || 1);
    this.employeeApi.deleteDocument(empId, doc.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.profile.showToast(`Document "${doc.name}" deleted successfully.`);
          this.profile.loadEmployeeDocuments(empId);
        } else {
          this.profile.showToast(res.message || 'Failed to delete document.', 'error');
        }
      },
      error: (err) => {
        this.profile.showToast(err.error?.message || 'Failed to delete document.', 'error');
      }
    });
  }
}
