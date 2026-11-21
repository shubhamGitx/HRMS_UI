import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { ProfileDocuments } from './documents';
import { DocumentVerificationComponent } from '../../../admin/document-verification/document-verification';
import { ProfileService } from '../shared/profile.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { EmployeeApiService } from '../../../../core/services/employee-api.service';
import { AdminDocumentService } from '../../../../core/services/admin-document.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { of } from 'rxjs';

describe('HRMS Employee Document Management & Verification Suite', () => {
  let injector: Injector;

  const mockDocsData = [
    {
      documentId: 101,
      employeeId: 1,
      employeeCode: 'EMP001',
      employeeName: 'Sudha Kumari',
      departmentName: 'Rural Development',
      documentTypeId: 1,
      documentName: 'Aadhaar Card',
      category: 'Identity',
      fileName: 'aadhaar_scan.pdf',
      contentType: 'application/pdf',
      fileSize: 102400,
      sizeFormatted: '100 KB',
      status: 'Verified' as const,
      uploadedOn: '2026-11-01T10:00:00Z',
      verifiedBy: 1,
      verifiedAt: '2026-11-01T11:00:00Z'
    },
    {
      documentId: 102,
      employeeId: 1,
      employeeCode: 'EMP001',
      employeeName: 'Sudha Kumari',
      departmentName: 'Rural Development',
      documentTypeId: 3,
      documentName: 'B.Tech Highest Qualification Degree',
      category: 'Education',
      fileName: 'degree.pdf',
      contentType: 'application/pdf',
      fileSize: 204800,
      sizeFormatted: '200 KB',
      status: 'Pending' as const,
      uploadedOn: '2026-11-02T09:00:00Z'
    },
    {
      documentId: 103,
      employeeId: 1,
      employeeCode: 'EMP001',
      employeeName: 'Sudha Kumari',
      departmentName: 'Rural Development',
      documentTypeId: 5,
      documentName: 'Cancelled Cheque',
      category: 'Banking',
      fileName: 'cheque.png',
      contentType: 'image/png',
      fileSize: 51200,
      sizeFormatted: '50 KB',
      status: 'Rejected' as const,
      uploadedOn: '2026-11-01T14:00:00Z',
      rejectionRemarks: 'Account number is not visible clearly'
    }
  ];

  const mockAuthSession = {
    user: {
      userId: 'EMP001',
      userName: 'Sudha Kumari',
      userRole: 'Employee',
      employeeId: 1,
      officialId: 1
    },
    token: 'mock-token'
  };

  const mockEmployeeApi = {
    getDocumentTypes: () => of({
      success: true,
      data: [
        { id: 1, name: 'Aadhaar Card' },
        { id: 2, name: 'PAN Card' },
        { id: 3, name: 'Highest Qualification Degree' },
        { id: 4, name: 'Cancelled Cheque' },
        { id: 5, name: 'Signed Contract' }
      ]
    }),
    getDocuments: vi.fn(() => of({
      success: true,
      data: [
        {
          documentId: 101,
          employeeId: 1,
          name: 'Aadhaar Card',
          category: 'Identity',
          fileName: 'aadhaar_scan.pdf',
          contentType: 'application/pdf',
          fileSize: 102400,
          sizeFormatted: '100 KB',
          status: 'Verified',
          uploadedOn: '2026-11-01T10:00:00Z'
        },
        {
          documentId: 102,
          employeeId: 1,
          name: 'B.Tech Highest Qualification Degree',
          category: 'Education',
          fileName: 'degree.pdf',
          contentType: 'application/pdf',
          fileSize: 204800,
          sizeFormatted: '200 KB',
          status: 'Pending',
          uploadedOn: '2026-11-02T09:00:00Z'
        },
        {
          documentId: 103,
          employeeId: 1,
          name: 'Cancelled Cheque',
          category: 'Banking',
          fileName: 'cheque.png',
          contentType: 'image/png',
          fileSize: 51200,
          sizeFormatted: '50 KB',
          status: 'Rejected',
          uploadedOn: '2026-11-01T14:00:00Z',
          rejectionRemarks: 'Account number is not visible clearly'
        }
      ]
    })),
    getVerifiedDocuments: () => of({ success: true, data: [] }),
    uploadDocument: vi.fn(() => of({ success: true, data: 104 })),
    uploadEmployeeDoc: vi.fn(() => of({ success: true, data: 104 })),
    downloadDocument: vi.fn((empId: number, docId: number) => of(new Blob(['test_binary'], { type: docId === 103 ? 'image/png' : 'application/pdf' }))),
    deleteDocument: vi.fn((empId: number, docId: number) => of({ success: true, data: true })),
    viewDocumentFile: vi.fn((docId?: number) => of(new Blob(['test_binary'], { type: docId === 103 ? 'image/png' : 'application/pdf' }))),
    downloadDocumentFile: vi.fn(() => of(new Blob(['test'], { type: 'application/pdf' })))
  };

  const mockAdminDocService = {
    getDocumentsForVerification: vi.fn(() => of({
      success: true,
      data: mockDocsData
    })),
    verifyDocument: vi.fn((docId: number, remarks?: string) => of({ success: true, data: true })),
    rejectDocument: vi.fn((docId: number, remarks: string) => of({ success: true, data: true })),
    getDocumentHistory: vi.fn((docId: number) => of({
      success: true,
      data: [
        {
          historyId: 1,
          documentId: docId,
          previousStatus: 'None',
          newStatus: 'Pending',
          actionByName: 'Employee Upload',
          actionRemarks: 'Uploaded by employee',
          actionDate: '2026-11-01T10:00:00Z',
          actionType: 'Upload'
        }
      ]
    })),
    viewDocument: vi.fn((docId: number) => of(new Blob(['test'], { type: 'application/pdf' }))),
    downloadDocument: vi.fn((docId: number) => of(new Blob(['test'], { type: 'application/pdf' })))
  };

  const mockProfileService = {
    documents: vi.fn(() => [
      {
        id: 101,
        name: 'Aadhaar Card',
        category: 'Identity',
        fileType: 'PDF',
        fileName: 'aadhaar_scan.pdf',
        size: '100 KB',
        uploadedOn: '2026-11-01T10:00:00Z',
        status: 'Verified' as const
      },
      {
        id: 102,
        name: 'B.Tech Highest Qualification Degree',
        category: 'Education',
        fileType: 'PDF',
        fileName: 'degree.pdf',
        size: '200 KB',
        uploadedOn: '2026-11-02T09:00:00Z',
        status: 'Pending' as const
      },
      {
        id: 103,
        name: 'Cancelled Cheque',
        category: 'Banking',
        fileType: 'PNG',
        fileName: 'cheque.png',
        size: '50 KB',
        uploadedOn: '2026-11-01T14:00:00Z',
        status: 'Rejected' as const,
        rejectionRemarks: 'Account number is not visible clearly'
      }
    ]),
    loadEmployeeDocuments: vi.fn(),
    showToast: vi.fn()
  };

  const mockLanguage = {
    t: (en: string) => en
  };

  beforeEach(() => {
    injector = Injector.create({
      providers: [
        { provide: AuthSessionService, useValue: mockAuthSession },
        { provide: EmployeeApiService, useValue: mockEmployeeApi },
        { provide: AdminDocumentService, useValue: mockAdminDocService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LanguageService, useValue: mockLanguage },
        ProfileDocuments,
        DocumentVerificationComponent
      ]
    });
  });

  describe('1. Employee Documents Component', () => {
    it('should initialize and load documents and types', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        comp.ngOnInit();
        expect(comp['docTypes']().length).toBe(5);
        expect(mockProfileService.loadEmployeeDocuments).toHaveBeenCalledWith(1);
      });
    });

    it('should list all employee documents with their real status (Verified, Pending, Rejected)', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        const list = comp['list']();
        expect(list.length).toBe(3);
        expect(list.some(d => d.status === 'Verified')).toBe(true);
        expect(list.some(d => d.status === 'Pending')).toBe(true);
        expect(list.some(d => d.status === 'Rejected')).toBe(true);
      });
    });

    it('should dynamically calculate required documents status (Verified, Pending, Rejected with remarks, Missing)', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        const reqs = comp['requiredDocStatusList']();
        expect(reqs.length).toBe(5);

        const aadhaar = reqs.find(r => r.name === 'Aadhaar Card')!;
        expect(aadhaar.status).toBe('Verified');

        const qual = reqs.find(r => r.name === 'Highest Qualification')!;
        expect(qual.status).toBe('Pending');

        const cheque = reqs.find(r => r.name === 'Cancelled Cheque')!;
        expect(cheque.status).toBe('Rejected');
        expect(cheque.remarks).toContain('Account number is not visible');

        const pan = reqs.find(r => r.name === 'PAN Card')!;
        expect(pan.status).toBe('Missing');

        const contract = reqs.find(r => r.name === 'Signed Contract')!;
        expect(contract.status).toBe('Missing');
      });
    });

    it('should validate file extension and size during upload', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        comp['openUploadModal']();

        // 1. Oversized file (> 5 MB)
        const fakeLargeFile = new File(['x'.repeat(100)], 'large.pdf');
        Object.defineProperty(fakeLargeFile, 'size', { value: 6 * 1024 * 1024 });
        const eventLarge = { target: { files: [fakeLargeFile], value: '' } } as any;
        comp['onFilePicked'](eventLarge);
        expect(comp['uploadError']()).toContain('exceeds the 5 MB limit');

        // 2. Disallowed extension (.exe)
        const fakeBadFile = new File(['content'], 'virus.exe');
        const eventBad = { target: { files: [fakeBadFile], value: '' } } as any;
        comp['onFilePicked'](eventBad);
        expect(comp['uploadError']()).toContain('Invalid file format');

        // 3. Allowed file (.pdf)
        const fakeOkFile = new File(['content'], 'document.pdf');
        Object.defineProperty(fakeOkFile, 'size', { value: 500 * 1024 });
        const eventOk = { target: { files: [fakeOkFile], value: '' } } as any;
        comp['onFilePicked'](eventOk);
        expect(comp['uploadError']()).toBeNull();
        expect(comp['selectedFile']()).toBe(fakeOkFile);
      });
    });

    it('should submit multipart upload and call employeeApi.uploadDocument', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        comp['openUploadModal']();

        const fakeFile = new File(['pdfcontent'], 'my_contract.pdf');
        comp['selectedFile'].set(fakeFile);
        comp['selectedTypeId'] = 5;
        comp['customDocName'] = 'Signed Contract';
        comp['uploadCategory'] = 'Contract';

        comp['submitUpload']();
        expect(mockEmployeeApi.uploadDocument).toHaveBeenCalled();
        expect(mockProfileService.showToast).toHaveBeenCalledWith(
          expect.stringContaining('uploaded successfully')
        );
      });
    });

    it('should delete pending or rejected document when confirmed', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        if (typeof (globalThis as any).window === 'undefined') {
          (globalThis as any).window = globalThis;
        }
        (globalThis as any).window.confirm = vi.fn(() => true);

        const pendingDoc = mockProfileService.documents()[1];
        comp['deleteDoc'](pendingDoc);

        expect(mockEmployeeApi.deleteDocument).toHaveBeenCalledWith(1, pendingDoc.id);
        expect(mockProfileService.showToast).toHaveBeenCalledWith(
          expect.stringContaining('deleted successfully')
        );
      });
    });

    it('should block deletion of verified documents', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        const verifiedDoc = mockProfileService.documents()[0];
        comp['deleteDoc'](verifiedDoc);

        expect(mockEmployeeApi.deleteDocument).not.toHaveBeenCalled();
        expect(mockProfileService.showToast).toHaveBeenCalledWith(
          expect.stringContaining('Verified documents cannot be deleted'),
          'error'
        );
      });
    });

    it('should open image in preview modal when viewing image document', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(ProfileDocuments);
        global.URL.createObjectURL = vi.fn(() => 'blob:image-url');

        const imageDoc = mockProfileService.documents()[2]; // Cancelled Cheque (PNG)
        comp['viewDoc'](imageDoc);

        expect(mockEmployeeApi.viewDocumentFile).toHaveBeenCalledWith(imageDoc.id);
        expect(comp['previewImage']()).toBe('blob:image-url');
        expect(comp['previewImageTitle']()).toBe(imageDoc.name);

        comp['closeImagePreview']();
        expect(comp['previewImage']()).toBeNull();
      });
    });
  });

  describe('2. Admin Document Verification Component', () => {
    it('should load all documents for verification and compute counts accurately', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(DocumentVerificationComponent);
        comp.ngOnInit();

        expect(mockAdminDocService.getDocumentsForVerification).toHaveBeenCalled();
        expect(comp.documents().length).toBe(3);
        expect(comp.pendingCount()).toBe(1);
        expect(comp.verifiedCount()).toBe(1);
        expect(comp.rejectedCount()).toBe(1);
        expect(comp.totalCount()).toBe(3);
      });
    });

    it('should enforce mandatory rejection remarks when rejecting document', () => {
      runInInjectionContext(injector, () => {
        const comp = injector.get(DocumentVerificationComponent);
        comp.ngOnInit();

        const pendingDoc = mockDocsData[1];
        comp.openRejectModal(pendingDoc);

        // Blank remarks should be rejected
        comp.rejectRemarks = '   ';
        comp.confirmReject();
        expect(comp.rejectRemarksError()).toContain('Rejection remarks are mandatory');
        expect(mockAdminDocService.rejectDocument).not.toHaveBeenCalled();

        // Valid remarks should proceed
        comp.rejectRemarks = 'Degree certificate copy is unreadable and cropped.';
        comp.confirmReject();
        expect(mockAdminDocService.rejectDocument).toHaveBeenCalledWith(
          pendingDoc.documentId,
          'Degree certificate copy is unreadable and cropped.'
        );
      });
    });
  });
});
