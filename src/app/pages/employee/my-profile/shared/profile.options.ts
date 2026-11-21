/** Dropdown values. Baad me ye masters API se aayenge. */
export const GENDERS = ['Male', 'Female', 'Transgender'];
export const MARITAL_STATUS = ['Unmarried', 'Married', 'Widowed', 'Divorced'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const STATES = ['Bihar', 'Jharkhand', 'Uttar Pradesh', 'West Bengal', 'Other'];
export const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar',
  'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
  'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger',
  'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
  'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran',
];
export const RELATIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
export const EDUCATION_LEVELS = [
  'Matriculation (10th)', 'Intermediate (12th)', 'Diploma', 'Graduation', 'Post Graduation', 'Doctorate', 'Certificate Course',
];
export const ACCOUNT_TYPES = ['Savings', 'Current', 'Salary'];

/** Form validation patterns */
export const PATTERNS = {
  mobile: /^[6-9]\d{9}$/,
  pin: /^[1-9]\d{5}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  account: /^\d{9,18}$/,
  year: /^(19|20)\d{2}$/,
  percent: /^(\d{1,2}(\.\d{1,2})?|100)$/,
};
