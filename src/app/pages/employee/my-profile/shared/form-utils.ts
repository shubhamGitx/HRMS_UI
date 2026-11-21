import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Field touched hai aur invalid hai to true */
export function isInvalid(group: AbstractControl, path: string): boolean {
  const c = group.get(path);
  return !!c && c.invalid && (c.touched || c.dirty);
}

/** Saare fields touched mark karo taaki errors dikh jayein */
export function touchAll(form: AbstractControl): void {
  form.markAllAsTouched();
}

/** Age kam se kam `min` saal honi chahiye */
export function minAge(min: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    if (!c.value) return null;
    const dob = new Date(c.value);
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - min);
    return dob > limit ? { minAge: min } : null;
  };
}

/** Date aaj ke baad ki nahi honi chahiye */
export function notFuture(c: AbstractControl): ValidationErrors | null {
  if (!c.value) return null;
  return new Date(c.value) > new Date() ? { future: true } : null;
}

/** Do fields ki value same honi chahiye (account number confirm ke liye) */
export function matchFields(a: string, b: string): ValidatorFn {
  return (g: AbstractControl): ValidationErrors | null => {
    const fg = g as FormGroup;
    const v1 = fg.get(a)?.value;
    const v2 = fg.get(b)?.value;
    return v1 && v2 && v1 !== v2 ? { mismatch: true } : null;
  };
}

export function maskAccount(acc: string): string {
  if (!acc) return '';
  return 'X'.repeat(Math.max(0, acc.length - 4)) + acc.slice(-4);
}

export function formatDate(value: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Umar (saal) */
export function ageOf(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

/** 9876543210 -> +91 98765 43210 */
export function phone(n: string): string {
  if (!n) return '-';
  return /^\d{10}$/.test(n) ? `+91 ${n.slice(0, 5)} ${n.slice(5)}` : n;
}
