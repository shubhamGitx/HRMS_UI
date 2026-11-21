export interface MasterOption {
  id: number;
  name: string;
  code?: string | null;
}

export interface ReportingOfficerOption {
  officialId: number;
  userId: string;
  officialName: string;
  designation?: string | null;
}

export interface EmployeeMasters {
  genders: MasterOption[];
  bloodGroups: MasterOption[];
  categories: MasterOption[];
  employmentStatuses: MasterOption[];
  employeeTypes: MasterOption[];
  offices: MasterOption[];
  designations: MasterOption[];
  idTypes: MasterOption[];
  states?: MasterOption[];
  districts?: MasterOption[];
  qualifications?: MasterOption[];
  documents?: MasterOption[];
  banks?: MasterOption[];
  reportingOfficers: ReportingOfficerOption[];
}

export interface EmployeeSaveResult {
  success: boolean;
  message: string;
  employeeId: number;
  contractNo: string;
}

// Step 1: Personal Details
export interface PersonalDetailsRequest {
  employeeId?: number | null;
  contractNo?: string | null;
  employeeName: string;
  employeeNameHindi?: string | null;
  dateOfBirth?: string | null;
  genderId?: number | null;
  bloodGroupId?: number | null;
  fatherName?: string | null;
  motherName?: string | null;
  categoryId?: number | null;
  joiningDate?: string | null;
  employmentStatusId?: number | null;
  employeeTypeId?: number | null;
  officeId?: number | null;
  designationId?: number | null;
  reportingOfficialId?: number | null;
  idName?: string | null;
  idNumber?: string | null;
  officialEmail?: string | null;
  officialMobile?: string | null;
  photo?: string | null;
}

// Step 2: Contact & Address
export interface AddressItemRequest {
  addressType: 'PERMANENT' | 'CURRENT';
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  stateId: number;
  districtId: number;
  cityName: string;
  pincode: string;
  alternateMobile?: string | null;
}

export interface ContactAddressRequest {
  employeeId: number;
  officialEmail?: string | null;
  officialMobile?: string | null;
  addresses: AddressItemRequest[];
}

// Step 3: Qualification & Experience
export interface QualificationItemRequest {
  qualificationId: number;
  institutionName: string;
  passingYear?: number | null;
  rollNumber?: string | null;
  marksPercentage?: number | null;
  grade?: string | null;
  isHighestQualification: boolean;
}

export interface ExperienceItemRequest {
  organisation: string;
  designation: string;
  fromDate?: string | null;
  toDate?: string | null;
  responsibilities?: string | null;
}

export interface QualificationExperienceRequest {
  employeeId: number;
  qualifications: QualificationItemRequest[];
  experiences: ExperienceItemRequest[];
}

// Step 4: Bank Details
export interface BankDetailsRequest {
  employeeId: number;
  bankId: number;
  branchName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  accountType: string;
  bankDocument?: string | null;
}

// Step 5: Nominee & Emergency Contacts
export interface NomineeItemRequest {
  nomineeName: string;
  relationship: string;
  dateOfBirth?: string | null;
  sharePercentage: number;
  address: string;
}

export interface EmergencyContactItemRequest {
  contactName: string;
  relationship: string;
  mobile: string;
  address: string;
}

export interface NomineeEmergencyRequest {
  employeeId: number;
  nominees: NomineeItemRequest[];
  emergencyContacts: EmergencyContactItemRequest[];
}

export interface EmployeeFullProfileResponse {
  employeeId: number;
  contractNo: string;
  recordStatus: string;
  personalDetails?: PersonalDetailsRequest;
  contactAddress?: ContactAddressRequest;
  qualificationExperience?: QualificationExperienceRequest;
  bankDetails?: BankDetailsRequest;
  nomineeEmergency?: NomineeEmergencyRequest;
}
