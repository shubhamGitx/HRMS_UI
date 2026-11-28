export type PayType = 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIB';
export type CalcType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';
export type SalaryStatus = 'PENDING' | 'DRAFT' | 'LOCKED';

export interface PayComponent {
  id: number;
  code: string;
  name: string;
  componentType: PayType;
  calcType: CalcType;
  calcPriority: number;
  defaultValue?: number | null;
  defaultBaseComponentCode?: string | null;
  defaultMaxCap?: number | null;
  defaultFormula?: string | null;
  isMatrixLinked?: boolean;
  formulaExpression: string;
  isProrated: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

export interface SalaryLine {
  componentId: number;
  fixedAmount?: number;
  percentage?: number;
  baseCode?: string;
  formulaExpression?: string;
  computedAmount: number;
}

export interface SalaryEmployee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  designation: string;
  office: string;
  levelCode: string;
  cellNo: number;
  sanctionedAmount: number;
  contractStart: string;
  contractEnd: string;
  nextIncrementDate: string;
  status: SalaryStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  monthlyGross: number;
  totalDeductions: number;
  netPayable: number;
  components: SalaryLine[];
}
