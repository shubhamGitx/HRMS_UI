// ===================== Employee ka apna data (entry page se bharta hai) =====================
export interface Address {
  line1: string;
  line2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface PersonalInfo {
  title: string;
  fullName: string;
  fullNameHindi: string;
  dob: string;
  gender: string;
  genderId:number;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  religion: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  motherTongue: string;
  languages: string;
  identificationMark: string;
  aadhaarNumber?: string;
  panNumber?: string;
}

export interface IdentityDoc {
  type: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: 'Verified' | 'Pending' | 'Rejected';
}

export interface FamilyMember {
  name: string;
  relation: string;
  dob: string;
  occupation: string;
  dependent: boolean;
}

export interface ContactInfo {
  mobile: string;
  alternateMobile: string;
  officialEmail: string;
  personalEmail: string;
  landline: string;
}

export interface Education {
  qualification: string;
  course: string;
  board: string;
  year: string;
  percentage: string;
  status: 'Verified' | 'Pending';
}

export interface Experience {
  organisation: string;
  designation: string;
  from: string;
  to: string;
  responsibilities: string;
}

export interface BankInfo {
  holder: string;
  bankName: string;
  branch: string;
  ifsc: string;
  accountNumber: string;
  accountType: string;
  status: 'Verified' | 'Pending';
  verifiedOn: string;
  pfUanNumber?: string;
}

export interface Nominee {
  name: string;
  relation: string;
  dob: string;
  share: number;
  address: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  mobile: string;
  address: string;
}

export interface ProfileData {
  photo: string | null;
  photoUploadedOn: string;
  personal: PersonalInfo;
  identity: IdentityDoc[];
  family: FamilyMember[];
  contact: ContactInfo;
  presentAddress: Address;
  permanentAddress: Address;
  education: Education[];
  experience: Experience[];
  skills: string[];
  bank: BankInfo;
  nominees: Nominee[];
  emergency: EmergencyContact[];
}

// ===================== HR ka data (employee edit nahi karta) =====================
export interface EmploymentInfo {
  employeeId?: number | string;
  employeeCode: string;
  employeeNo: string;
  employeeType: string;
  engagementType: string;
  employeeCategory: string;
  department: string;
  office: string;
  orgUnit: string;
  designation: string;
  designationLevel: string;
  joiningDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  reportingOfficer: string;
  reportingOfficerDesignation: string;
  officePhone: string;
  workLocation: string;
}

export interface ContractInfo {
  contractNo: string;
  contractType: string;
  startDate: string;
  endDate: string;
  payStructure: string;
  remuneration: string;
  appointmentOrderNo: string;
  appointmentOrderDate: string;
  issuingAuthority: string;
  status: string;
  remarks: string;
}

export interface HistoryRow {
  [key: string]: string;
}

export interface ProfileDocument {
  id?: number;
  name: string;
  category: string;
  fileType: string;
  fileName?: string;
  size: string;
  uploadedOn: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  filePath?: string;
  rejectionRemarks?: string | null;
  documentTypeId?: number | null;
}

export interface ChangeLog {
  date: string;
  section: string;
  change: string;
  by: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export type EntryTab = 'personal' | 'contact' | 'qualification' | 'bank' | 'nominee' | 'review';
