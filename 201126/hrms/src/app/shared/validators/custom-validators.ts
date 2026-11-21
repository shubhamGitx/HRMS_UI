import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Standard regular expressions for Indian identity documents, banking, and contact details.
 */
export const VALIDATION_PATTERNS = {
  // Driving Licence: standard Parivahan / Sarathi formats
  DRIVING_LICENCE: /^[A-Z]{2}[-\s\/]?[0-9]{2}[-\s\/]?(?:[0-9]{4}|[0-9]{2})[-\s\/]?[0-9]{4,7}$/i,

  // PAN Card: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,

  // Passport: 1 uppercase letter followed by 7 digits (e.g. A1234567)
  PASSPORT: /^[A-Z][0-9]{7}$/,

  // Voter ID / EPIC: 3 uppercase letters followed by 7 digits (e.g. ABC1234567)
  VOTER_ID: /^[A-Z]{3}[0-9]{7}$/,

  // Indian mobile prefix: must start with 6, 7, 8, or 9
  MOBILE_PREFIX: /^[6-9]/,

  // Only digits
  DIGITS_ONLY: /^\d+$/,

  // Name (English letters, spaces, dot): e.g. "Ramesh Kumar", "Dr. A. P. J."
  NAME_ALPHA: /^[a-zA-Z\s.]+$/,

  // City / Town / District (letters, spaces, hyphen, dot)
  CITY_ALPHA: /^[a-zA-Z\s.-]+$/,

  // Bank Account Number (Digits only, 9 to 18 digits)
  BANK_ACCOUNT: /^[0-9]{9,18}$/,

  // RBI IFSC Code: 4 letters, 0, 6 alphanumeric (e.g. SBIN0001234)
  IFSC_CODE: /^[A-Z]{4}0[A-Z0-9]{6}$/,

  // Indian Postal Pincode: 6 digits, starts with 1-9
  PINCODE: /^[1-9][0-9]{5}$/,

  // Passing Year: 4 digits
  YEAR_4_DIGIT: /^[12][0-9]{3}$/
};

/**
 * Calculates exact age considering day, month, and year accurately.
 */
export function calculateExactAge(dobString: string, referenceDate: Date = new Date()): { age: number; isFuture: boolean } {
  if (!dobString) {
    return { age: 0, isFuture: false };
  }
  const parts = String(dobString).split('-');
  if (parts.length !== 3) {
    return { age: 0, isFuture: false };
  }
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return { age: 0, isFuture: false };
  }

  const birthDate = new Date(y, m - 1, d);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  if (birthDate.getTime() > today.getTime()) {
    return { age: -1, isFuture: true };
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const mDiff = today.getMonth() - birthDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return { age, isFuture: false };
}

/**
 * Validator for Date of Birth:
 * Must be at least minAge years old on the current date, and not in the future.
 */
export function ageAboveValidator(minAge: number = 18): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null; // handled by Validators.required

    const { age, isFuture } = calculateExactAge(String(val).trim());
    if (isFuture || age < minAge) {
      return { underAge: true, message: 'Age must be above 18 years.' };
    }
    return null;
  };
}

/**
 * Validator for Indian Official Mobile Number:
 * Must be exactly 10 numeric digits, starting with 6, 7, 8, or 9.
 */
export function indianMobileValidator(required: boolean = true): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim();
    if (!val) return null; // handled by Validators.required if required

    if (!VALIDATION_PATTERNS.DIGITS_ONLY.test(val)) {
      return { invalidCharacters: true, message: 'Official mobile number must contain only digits.' };
    }

    if (val.length !== 10) {
      return { invalidLength: true, message: 'Mobile number must be of 10 digits.' };
    }

    if (!VALIDATION_PATTERNS.MOBILE_PREFIX.test(val)) {
      return { invalidPrefix: true, message: 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.' };
    }

    return null;
  };
}

/**
 * Validator for Name fields (Full Name, Father's Name, Mother's Name, Spouse, Nominee, Emergency):
 * Allows only letters, spaces, and dots. Rejects numbers and special symbols.
 */
export function personNameValidator(minChars: number = 2): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim();
    if (!val) return null;

    if (!VALIDATION_PATTERNS.NAME_ALPHA.test(val)) {
      return { invalidName: true, message: 'Name must contain only letters and spaces (no digits or symbols).' };
    }

    if (val.length < minChars) {
      return { minLength: true, message: `Name must be at least ${minChars} characters.` };
    }

    return null;
  };
}

/**
 * Validator for Indian Bank IFSC Code:
 * 11 characters: 4 letters, 0, 6 alphanumeric (e.g. SBIN0001234).
 */
export function ifscCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim().toUpperCase();
    if (!val) return null;

    if (!VALIDATION_PATTERNS.IFSC_CODE.test(val)) {
      return { invalidIfsc: true, message: 'Enter a valid 11-character IFSC code (e.g., SBIN0001234, no symbols allowed).' };
    }

    return null;
  };
}

/**
 * Validator for Bank Account Number:
 * Only numeric digits, length 9 to 18 digits.
 */
export function bankAccountNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim();
    if (!val) return null;

    if (!VALIDATION_PATTERNS.DIGITS_ONLY.test(val)) {
      return { nonNumericAccount: true, message: 'Account number must contain only numeric digits.' };
    }

    if (!VALIDATION_PATTERNS.BANK_ACCOUNT.test(val)) {
      return { invalidAccountLength: true, message: 'Account number must be between 9 and 18 digits.' };
    }

    return null;
  };
}

/**
 * Validator for 6-Digit Indian Pincode.
 */
export function indianPincodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim();
    if (!val) return null;

    if (!VALIDATION_PATTERNS.PINCODE.test(val)) {
      return { invalidPincode: true, message: 'Enter a valid 6-digit Pincode (starts with 1-9).' };
    }

    return null;
  };
}

/**
 * Verhoeff checksum algorithm for UIDAI Aadhaar Number validation
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export function validateVerhoeff(numStr: string): boolean {
  let c = 0;
  const invertedArray = numStr.split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][invertedArray[i]]];
  }
  return c === 0;
}

/**
 * Dynamic Identity Document Number Validator based on the currently selected document type.
 */
export function identityDocumentValidator(docTypeGetter: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) return null;
    const val = String(raw).trim();
    if (!val) return null; // handled by Validators.required

    const docType = (docTypeGetter() || '').trim();
    if (!docType) {
      return { noDocType: true, message: 'Please select an identity document type.' };
    }

    // 1. Aadhaar Card
    if (docType === 'Aadhaar Card' || docType === 'Aadhaar') {
      if (!VALIDATION_PATTERNS.DIGITS_ONLY.test(val)) {
        return { nonNumeric: true, message: 'Aadhaar number must contain only digits.' };
      }
      if (val.length !== 12) {
        return { aadhaarLength: true, message: 'Aadhaar number must be exactly 12 digits.' };
      }
      return null;
    }

    // 2. PAN Card
    if (docType === 'PAN Card' || docType === 'PAN') {
      if (!VALIDATION_PATTERNS.PAN.test(val.toUpperCase())) {
        return { panInvalid: true, message: 'Enter a valid PAN number (e.g., ABCDE1234F).' };
      }
      return null;
    }

    // 3. Passport
    if (docType === 'Passport') {
      if (!VALIDATION_PATTERNS.PASSPORT.test(val.toUpperCase())) {
        return { passportInvalid: true, message: 'Enter a valid Indian Passport number.' };
      }
      return null;
    }

    // 4. Voter ID Card
    if (docType === 'Voter ID Card' || docType === 'Voter ID') {
      if (!VALIDATION_PATTERNS.VOTER_ID.test(val.toUpperCase())) {
        return { voterIdInvalid: true, message: 'Enter a valid Voter ID number.' };
      }
      return null;
    }

    // 5. Driving Licence
    if (docType === 'Driving Licence' || docType === 'Driving License') {
      if (!VALIDATION_PATTERNS.DRIVING_LICENCE.test(val)) {
        return { drivingLicenceInvalid: true, message: 'Enter a valid Indian Driving Licence number.' };
      }
      return null;
    }

    // Fallback if another type is provided
    if (val.length < 4) {
      return { genericInvalid: true, message: 'Enter a valid document number.' };
    }

    return null;
  };
}

/**
 * Joining Date must be at least 18 years after Date of Birth
 */
export function joiningDateValidator(dobGetter: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    const dobStr = (dobGetter() || '').trim();
    if (!dobStr) return null;

    const dob = new Date(dobStr);
    const joining = new Date(String(val).trim());
    if (isNaN(dob.getTime()) || isNaN(joining.getTime())) return null;

    const minJoining = new Date(dob);
    minJoining.setFullYear(minJoining.getFullYear() + 18);

    if (joining < minJoining) {
      return { joiningUnderAge: true, message: 'Joining date must be at least 18 years after Date of Birth.' };
    }
    return null;
  };
}

/**
 * Validates that date of birth is strictly in the past (before today)
 */
export function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    const d = new Date(String(val).trim());
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d >= today) {
      return { notPastDate: true, message: 'Date of birth must be a past date (before today).' };
    }
    return null;
  };
}

/**
 * Validates passing year according to Date of Birth and current year
 */
export function passingYearValidator(dobGetter: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    const year = Number(val);
    if (isNaN(year) || year < 1950) {
      return { invalidYear: true, message: 'Enter a valid 4-digit year.' };
    }
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
      return { futureYear: true, message: 'Passing year cannot be in the future.' };
    }
    const dobStr = (dobGetter() || '').trim();
    if (dobStr) {
      const dobYear = new Date(dobStr).getFullYear();
      if (!isNaN(dobYear) && year < dobYear + 14) {
        return { yearBeforeAge: true, message: `Passing year must be after ${dobYear + 14} (age 14+).` };
      }
    }
    return null;
  };
}
