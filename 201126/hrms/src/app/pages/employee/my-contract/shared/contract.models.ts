export interface ContractDetails {
  contractId: string;
  contractNo?: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  officeLocation: string;
  contractType: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Under Renewal' | 'Expired' | 'Terminated';
  monthlyConsolidatedPay: number;
  payStructure?: string;
  sanctionOrderNo: string;
  sanctionOrderDate: string;
  reportingOfficer: string;
  reportingOfficerDesignation: string;
  postingUnit: string;
  remarks?: string;
  totalDays: number;
  remainingDays: number;
  passedDays: number;
  termsAndConditions: ContractTermClause[];
}

export interface ContractTermClause {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
}

export interface RenewalHistoryItem {
  id: string;
  renewalPhase: string;
  contractNo?: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  monthlyPay: number;
  incrementPercentage: number;
  sanctionOrderNo: string;
  sanctionOrderDate: string;
  status: 'Active' | 'Completed' | 'Extended';
  remarks: string;
  documentRef: string;
  performanceGrade: 'A+' | 'A' | 'B+' | 'B';
}

export interface AppointmentOrderItem {
  id: string;
  documentTitle: string;
  category: 'Initial Appointment' | 'Renewal Order' | 'Posting / Transfer' | 'Pay Revision' | 'Other';
  memoNumber: string;
  issueDate: string;
  effectiveDate: string;
  issuingAuthority: string;
  fileSize: string;
  fileType: 'PDF';
  downloadUrl: string;
  description: string;
  isLatest?: boolean;
}

export interface RenewalWorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  completedDate?: string;
  actor?: string;
}
