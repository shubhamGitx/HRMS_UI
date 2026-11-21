import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { FormControl } from '@angular/forms';
import {
  ageAboveValidator,
  indianMobileValidator,
  identityDocumentValidator,
  calculateExactAge,
  VALIDATION_PATTERNS
} from './custom-validators';

describe('Custom Validators Suite', () => {

  describe('1. Date of Birth & Age Calculation Validator', () => {
    it('should accurately calculate age considering day, month, and year', () => {
      const refDate = new Date(2026, 9, 29); // 2026-10-29

      // Exactly 18 years old today (born 2008-10-29)
      const res18 = calculateExactAge('2008-10-29', refDate);
      expect(res18.age).toBe(18);
      expect(res18.isFuture).toBe(false);

      // 1 day before turning 18 (born 2008-10-30)
      const res17 = calculateExactAge('2008-10-30', refDate);
      expect(res17.age).toBe(17);
      expect(res17.isFuture).toBe(false);

      // 25 years old (born 2001-05-15)
      const res25 = calculateExactAge('2001-05-15', refDate);
      expect(res25.age).toBe(25);
      expect(res25.isFuture).toBe(false);

      // Future date
      const future = calculateExactAge('2027-01-01', refDate);
      expect(future.isFuture).toBe(true);
    });

    it('should pass if age is exactly 18 or older', () => {
      const validator = ageAboveValidator(18);
      // Construct a birthdate for someone 20 years old
      const today = new Date();
      const dob20 = `${today.getFullYear() - 20}-01-15`;
      const ctrl = new FormControl(dob20);
      expect(validator(ctrl)).toBeNull();
    });

    it('should fail with error if age is under 18 years', () => {
      const validator = ageAboveValidator(18);
      const today = new Date();
      const dob15 = `${today.getFullYear() - 15}-01-15`;
      const ctrl = new FormControl(dob15);
      const result = validator(ctrl);
      expect(result).toEqual({ underAge: true, message: 'Age must be above 18 years.' });
    });

    it('should fail if future date is selected', () => {
      const validator = ageAboveValidator(18);
      const today = new Date();
      const dobFuture = `${today.getFullYear() + 1}-01-15`;
      const ctrl = new FormControl(dobFuture);
      const result = validator(ctrl);
      expect(result).toEqual({ underAge: true, message: 'Age must be above 18 years.' });
    });

    it('should return null for empty values so Validators.required handles mandatory check', () => {
      const validator = ageAboveValidator(18);
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });
  });

  describe('2. Identity Document Number Validator', () => {
    let currentDocType = 'Aadhaar Card';
    const validator = identityDocumentValidator(() => currentDocType);

    describe('A. Aadhaar Card Validation', () => {
      it('should accept valid 12-digit numeric Aadhaar', () => {
        currentDocType = 'Aadhaar Card';
        expect(validator(new FormControl('123456789012'))).toBeNull();
        expect(validator(new FormControl(' 987654321098 '))).toBeNull(); // with whitespace trimmed
      });

      it('should fail if Aadhaar contains non-numeric characters', () => {
        currentDocType = 'Aadhaar Card';
        const result = validator(new FormControl('1234ABCD9012'));
        expect(result).toEqual({ nonNumeric: true, message: 'Aadhaar number must contain only digits.' });
      });

      it('should fail if Aadhaar is not exactly 12 digits', () => {
        currentDocType = 'Aadhaar Card';
        const shortRes = validator(new FormControl('12345678901'));
        expect(shortRes).toEqual({ aadhaarLength: true, message: 'Aadhaar number must be exactly 12 digits.' });

        const longRes = validator(new FormControl('1234567890123'));
        expect(longRes).toEqual({ aadhaarLength: true, message: 'Aadhaar number must be exactly 12 digits.' });
      });
    });

    describe('B. PAN Card Validation', () => {
      it('should accept valid standard PAN format (5 letters, 4 digits, 1 letter)', () => {
        currentDocType = 'PAN Card';
        expect(validator(new FormControl('ABCDE1234F'))).toBeNull();
        expect(validator(new FormControl('abcde1234f'))).toBeNull(); // case-insensitive check
      });

      it('should reject invalid PAN formats', () => {
        currentDocType = 'PAN Card';
        expect(validator(new FormControl('12345ABCDE'))).toEqual({
          panInvalid: true,
          message: 'Enter a valid PAN number (e.g., ABCDE1234F).'
        });
        expect(validator(new FormControl('ABCD12345F'))).toEqual({
          panInvalid: true,
          message: 'Enter a valid PAN number (e.g., ABCDE1234F).'
        });
        expect(validator(new FormControl('ABCDEF1234'))).toEqual({
          panInvalid: true,
          message: 'Enter a valid PAN number (e.g., ABCDE1234F).'
        });
      });
    });

    describe('C. Passport Validation', () => {
      it('should accept valid standard Indian passport (1 uppercase letter, 7 digits)', () => {
        currentDocType = 'Passport';
        expect(validator(new FormControl('A1234567'))).toBeNull();
        expect(validator(new FormControl('z7654321'))).toBeNull();
      });

      it('should reject invalid passport numbers', () => {
        currentDocType = 'Passport';
        expect(validator(new FormControl('12345678'))).toEqual({
          passportInvalid: true,
          message: 'Enter a valid Indian Passport number.'
        });
        expect(validator(new FormControl('AB123456'))).toEqual({
          passportInvalid: true,
          message: 'Enter a valid Indian Passport number.'
        });
        expect(validator(new FormControl('A123456'))).toEqual({
          passportInvalid: true,
          message: 'Enter a valid Indian Passport number.'
        });
      });
    });

    describe('D. Voter ID Card Validation', () => {
      it('should accept valid 10-char EPIC Voter ID (3 letters, 7 digits)', () => {
        currentDocType = 'Voter ID Card';
        expect(validator(new FormControl('ABC1234567'))).toBeNull();
        expect(validator(new FormControl('xyz7654321'))).toBeNull();
      });

      it('should reject invalid Voter ID numbers', () => {
        currentDocType = 'Voter ID Card';
        expect(validator(new FormControl('AB12345678'))).toEqual({
          voterIdInvalid: true,
          message: 'Enter a valid Voter ID number.'
        });
        expect(validator(new FormControl('1234567890'))).toEqual({
          voterIdInvalid: true,
          message: 'Enter a valid Voter ID number.'
        });
      });
    });

    describe('E. Driving Licence Validation', () => {
      it('should accept standard Indian Driving Licence formats with various separators', () => {
        currentDocType = 'Driving Licence';
        expect(validator(new FormControl('BR-0120190001234'))).toBeNull();
        expect(validator(new FormControl('BR01 20190001234'))).toBeNull();
        expect(validator(new FormControl('BR-01-2019-0001234'))).toBeNull();
        expect(validator(new FormControl('DL0420110149646'))).toBeNull();
        expect(validator(new FormControl('MH-02-20150001234'))).toBeNull();
      });

      it('should reject invalid Driving Licence formats', () => {
        currentDocType = 'Driving Licence';
        expect(validator(new FormControl('12345'))).toEqual({
          drivingLicenceInvalid: true,
          message: 'Enter a valid Indian Driving Licence number.'
        });
        expect(validator(new FormControl('INVALID_DL'))).toEqual({
          drivingLicenceInvalid: true,
          message: 'Enter a valid Indian Driving Licence number.'
        });
      });
    });

    describe('F. Dynamic Re-validation on Document Type Change', () => {
      it('should switch validation rules immediately when doc type changes', () => {
        const inputCtrl = new FormControl('123456789012');

        // Initially Aadhaar -> valid
        currentDocType = 'Aadhaar Card';
        expect(validator(inputCtrl)).toBeNull();

        // Switch to PAN -> invalid (123456789012 is not PAN)
        currentDocType = 'PAN Card';
        expect(validator(inputCtrl)).toEqual({
          panInvalid: true,
          message: 'Enter a valid PAN number (e.g., ABCDE1234F).'
        });

        // Switch to Passport -> invalid
        currentDocType = 'Passport';
        expect(validator(inputCtrl)).toEqual({
          passportInvalid: true,
          message: 'Enter a valid Indian Passport number.'
        });

        // Switch to Voter ID -> invalid
        currentDocType = 'Voter ID Card';
        expect(validator(inputCtrl)).toEqual({
          voterIdInvalid: true,
          message: 'Enter a valid Voter ID number.'
        });

        // Switch to Driving Licence -> invalid
        currentDocType = 'Driving Licence';
        expect(validator(inputCtrl)).toEqual({
          drivingLicenceInvalid: true,
          message: 'Enter a valid Indian Driving Licence number.'
        });
      });
    });
  });

  describe('3. Official Mobile Number Validator', () => {
    const validator = indianMobileValidator();

    it('should accept valid 10-digit mobile starting with 6, 7, 8, 9', () => {
      expect(validator(new FormControl('9876543210'))).toBeNull();
      expect(validator(new FormControl('8123456789'))).toBeNull();
      expect(validator(new FormControl('7012345678'))).toBeNull();
      expect(validator(new FormControl('6201234567'))).toBeNull();
    });

    it('should reject mobile number with fewer than 10 digits', () => {
      const result = validator(new FormControl('98765'));
      expect(result).toEqual({ invalidLength: true, message: 'Mobile number must be of 10 digits.' });
    });

    it('should reject mobile number starting with 0, 1, 2, 3, 4, 5', () => {
      ['0987654321', '1234567890', '2345678901', '3456789012', '4567890123', '5678901234'].forEach(num => {
        const result = validator(new FormControl(num));
        expect(result).toEqual({
          invalidPrefix: true,
          message: 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.'
        });
      });
    });

    it('should reject non-numeric characters', () => {
      const result = validator(new FormControl('98765abcd0'));
      expect(result).toEqual({
        invalidCharacters: true,
        message: 'Official mobile number must contain only digits.'
      });
    });
  });
});
