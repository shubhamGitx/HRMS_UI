export const API_ENDPOINT = {
  AUTH: {
    REQUEST_OTP: '/login/request-otp',
    VERIFY_OTP: '/login/verify-otp',
    LOGIN: '/login',
    LOGOUT: '/login/logout',
  },
  ADMIN: {
    EMPLOYEES: '/employees',
    GET_EMPLOYEE_DETAILS: '/employees',
    GET_MASTERS: '/employees/masters',
    GET_FULL_PROFILE: (id: number | string) => `/employees/${id}`,
    POST_PERSONAL_DETAILS: '/employees/personal-details',
    POST_CONTACT_ADDRESS: '/employees/contact-address',
    POST_QUALIFICATION_EXPERIENCE: '/employees/qualification-experience',
    POST_BANK_DETAILS: '/employees/bank-details',
    POST_NOMINEE_EMERGENCY: '/employees/nominee-emergency',
    POST_FINAL_SUBMIT: (id: number | string) => `/employees/${id}/final-submit`,
    DOCUMENTS: '/admin/documents',
    VERIFY_DOCUMENT: (docId: number | string) => `/admin/documents/${docId}/verify`,
    REJECT_DOCUMENT: (docId: number | string) => `/admin/documents/${docId}/reject`,
    DOCUMENT_HISTORY: (docId: number | string) => `/admin/documents/${docId}/history`,
    EMPLOYEE_DOCUMENT_SUMMARY: (empId: number | string) =>
      `/admin/employees/${empId}/documents/summary`,
  },
  EMPLOYEE: {
    // Risha API — employee self-service endpoints
    GET_PERSONAL_DETAILS: (id: number | string) => `/employees/${id}/personal-details-risha`,
    GET_ADDRESS_DETAILS: (id: number | string) => `/employees/${id}/address-details-risha`,
    GET_QUALIFICATION: (id: number | string) => `/employees/${id}/qualification-details-risha`,
    GET_BANK_DETAILS: (id: number | string) => `/employees/${id}/bank-details-risha`,
    GET_NOMINEE_DETAILS: (id: number | string) => `/employees/${id}/Nominee-details-risha`,
    GET_EMERGENCY_DETAILS: (id: number | string) =>
      `/employees/${id}/EmergencyContact-details-risha`,
    // Save endpoints
    SAVE_PERSONAL_DETAILS: '/employees/personal-details',
    SAVE_CONTACT_ADDRESS: '/employees/contact-address',
    SAVE_QUALIFICATION: '/employees/qualification-experience',
    SAVE_BANK_DETAILS: '/employees/bank-details',
    SAVE_NOMINEE_EMERGENCY: '/employees/nominee-emergency',
    FINAL_SUBMIT: (id: number | string) => `/employees/${id}/final-submit`,
    // Masters & List
    MASTERS: '/employees/masters',
    LIST: '/employees',
    IMPORT_TEMPLATE: '/employees/import-template',
    IMPORT: '/employees/import',
    GET_DOCUMENTS: (id: number | string) => `/employees/${id}/documents`,
    DOWNLOAD_DOCUMENT: (empId: number | string, docId: number | string) =>
      `/employees/${empId}/documents/${docId}/download`,
    UPLOAD_DOCUMENT: (id: number | string) => `/employees/${id}/documents/upload`,
    DELETE_DOCUMENT: (empId: number | string, docId: number | string) =>
      `/employees/${empId}/documents/${docId}`,
    GET_HISTORY: (id: number | string) => `/employees/${id}/history`,
    // Dedicated Document APIs
    DOCUMENT_TYPES: '/employee/document-types',
    VERIFIED_DOCUMENTS: '/employee/documents',
    VIEW_DOC: (docId: number | string) => `/employee/documents/${docId}/view`,
    DOWNLOAD_DOC: (docId: number | string) => `/employee/documents/${docId}/download`,
    UPLOAD_DOC: '/employee/documents/upload',
  },
  NAVIGATION: {
    MY_MENU: '/navigation/my-menu',
  },
  DASHBOARD: {
    STATS: '/dashboard/stats',
    EMPLOYEE_STATS: '/dashboard/employee-stats',
  },
  PAYROLL: {
    PAY_COMPONENTS: '/PayComponents',
    PAY_COMPONENT_LOOKUPS: '/PayComponents/masterdropdown',
    PAY_COMPONENT_SUMMARY: '/PayComponents/summary',
    SALARY_CONFIGURATION: '/SalaryConfiguration',
    SALARY_CONFIGURATION_BY_EMPLOYEE_ID: (employeeId: number | string) =>
      `/SalaryConfiguration/${employeeId}`,
    SALARY_CONFIGURATION_SUMMARY: '/SalaryConfiguration/summary',
    SAVE_SALARY_HEADER_DRAFT: '/SalaryConfiguration/salary-headers',
    UPDATE_SALARY_HEADER_DRAFT: (salaryHeaderId: number | string) =>
      `/SalaryConfiguration/salary-headers/${salaryHeaderId}`,
    LOCK_SALARY_HEADER: (salaryHeaderId: number | string) =>
      `/SalaryConfiguration/salary-headers/${salaryHeaderId}/lock`,
  },
  CONTRACT: {
    // Contract endpoints
    GET_CURRENT_CONTRACT: (id: number | string) => `/employees/${id}/contract-details`,
    GET_RENEWAL_HISTORY: (id: number | string) => `/employees/${id}/renewal-history`,
    GET_APPOINTMENT_ORDERS: (id: number | string) => `/employees/${id}/appointment-orders`,
    GET_RENEWAL_WORKFLOW: (id: number | string) => `/employees/${id}/renewal-workflow`,
    DOWNLOAD_ORDER_PDF: (docId: number | string) =>
      `/employees/appointment-orders/${docId}/download`,
    SAVE_CONTRACT: '/employees/contracts',
    GET_ALL_CONTRACTS: '/employees/contracts',
  },
  ACCOUNT: {
    INFO: '/account/info',
    REQUEST_MOBILE_OTP: '/account/change-mobile/request-otp',
    VERIFY_CHANGE_MOBILE: '/account/change-mobile/verify',
    CHANGE_PASSWORD: '/account/change-password',
  },
  LEAVE: {
    REASONS: '/leave/reasons',
    HOLIDAYS: '/leave/holidays',
    CALCULATE_DAYS: '/leave/calculate-chargeable-days',
    APPLY: '/leave/apply',
    BALANCES: '/leave/balances',
    MY_LEAVES: '/leave/my-leaves',
    PENDING_APPLICATIONS: '/leave/pending-applications',
    MANAGER_HISTORY: '/leave/manager-history',
    MANAGER_STATS: '/leave/manager-stats',
    MANAGER_REGISTER: '/leave/manager-register',
    ACTION: '/leave/action',
    CANCEL: '/leave/cancel',
  },
  LEAVE_POLICY: {
    BASE: '/leave-policies',
    ME: '/leave-policies/me',
    EMPLOYEE: '/leave-policies/employee',
  },
  OFFICE: {
    CREATE: '/office/create',
    LIST: '/office/list',
  },
} as const;
