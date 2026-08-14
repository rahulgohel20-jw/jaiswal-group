// ---------- Regex Patterns ----------
export const PATTERNS = {
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  ACCOUNT_NUMBER: /^[0-9]{9,18}$/,
  MOBILE: /^[6-9][0-9]{9}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UDYAM: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, // MSME/Udyam Registration Number
};

// ---------- General Field Validators ----------
export const validateRequired = (value, label = 'This field') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required`;
  }
  return '';
};

export const validateEmail = (value) => {
  if (!value?.trim()) return 'Email address is required';
  if (!PATTERNS.EMAIL.test(value.trim())) return 'Enter a valid email address';
  return '';
};

export const validateMobile = (value) => {
  if (!value?.trim()) return 'Mobile number is required';
  if (!PATTERNS.MOBILE.test(value.trim())) return 'Enter a valid 10-digit mobile number';
  return '';
};

export const validatePincode = (value) => {
  if (!value?.trim()) return 'Pincode is required';
  if (!PATTERNS.PINCODE.test(value.trim())) return 'Enter a valid 6-digit pincode';
  return '';
};


export const IFSC_BANK_PREFIXES = {
  HDFC: 'hdfc',
  ICIC: 'icici',
  SBIN: 'state bank',
  UTIB: 'axis',
  PUNB: 'punjab national',
  KKBK: 'kotak',
  IDIB: 'indian bank',
  BARB: 'bank of baroda',
  CNRB: 'canara',
  UBIN: 'union bank',
  IOBA: 'indian overseas',
  YESB: 'yes bank',
  INDB: 'indusind',
  AXIS: 'axis',
};

const getIfscPrefix = (ifsc) => ifsc?.trim().toUpperCase().slice(0, 4) ?? '';

export const checkIfscBankPrefix = (ifsc, bankName) => {
  const prefix = getIfscPrefix(ifsc);
  const expected = IFSC_BANK_PREFIXES[prefix];

  if (!expected) {
    return { matched: false, expected: null, known: false };
  }
  if (!bankName?.trim()) {
    return { matched: false, expected, known: true };
  }

  const entered = bankName.trim().toLowerCase();
  const matched = entered.includes(expected) || expected.includes(entered);
  return { matched, expected, known: true };
};

// ---------- Bank Detail Validators ----------
export const validateIFSC = (value) => {
  if (!value?.trim()) return 'IFSC code is required';
  const v = value.trim().toUpperCase();
  if (!PATTERNS.IFSC.test(v)) return 'Enter a valid IFSC code (e.g. SBIN0001234)';
  return '';
};

// Validates IFSC format, then (if the prefix is a known bank) checks that
// the bank name matches. Unknown prefixes are treated as valid — we simply
// can't verify them offline, so we don't block the user.
export const validateIFSCBankMatch = (ifsc, bankName) => {
  const formatErr = validateIFSC(ifsc);
  if (formatErr) return formatErr;

  if (!bankName?.trim()) return ''; // nothing to compare yet

  const { matched, expected, known } = checkIfscBankPrefix(ifsc, bankName);
  if (!known) return ''; // unrecognized bank code — can't verify, don't block

  if (!matched) {
    return `This IFSC looks like it belongs to a "${expected}" bank, not "${bankName}"`;
  }
  return '';
};

export const validateAccountNumber = (value) => {
  if (!value?.trim()) return 'Account number is required';
  if (!PATTERNS.ACCOUNT_NUMBER.test(value.trim())) {
    return 'Account number must be 9–18 digits';
  }
  return '';
};

export const validateReAccountNumber = (value, accountNumber) => {
  if (!value?.trim()) return 'Please re-enter account number';
  if (value.trim() !== accountNumber?.trim()) return 'Account numbers do not match';
  return '';
};

export const validateAccountHolderName = (value) => {
  if (!value?.trim()) return 'Account holder name is required';
  if (value.trim().length < 3) return 'Name must be at least 3 characters';
  return '';
};

export const validateBankName = (value) => {
  if (!value?.trim()) return 'Bank name is required';
  return '';
};


export const validateBankRow = (bank) => {
  const errors = {};
  const nameErr = validateAccountHolderName(bank.accountHolderName);
  const bankErr = validateBankName(bank.bankName);
  const acctErr = validateAccountNumber(bank.accountNumber);
  const reAcctErr = validateReAccountNumber(bank.reAccountNumber, bank.accountNumber);
  const ifscErr = validateIFSCBankMatch(bank.ifsc, bank.bankName) || validateIFSC(bank.ifsc);

  if (nameErr) errors.accountHolderName = nameErr;
  if (bankErr) errors.bankName = bankErr;
  if (acctErr) errors.accountNumber = acctErr;
  if (reAcctErr) errors.reAccountNumber = reAcctErr;
  if (ifscErr) errors.ifsc = ifscErr;

  return errors;
};

export const validateAllBanks = (banks = []) => banks.map(validateBankRow);

export const isBanksValid = (banks = []) =>
  validateAllBanks(banks).every((e) => Object.keys(e).length === 0);

// ---------- GST Validators ----------
export const validateGSTIN = (value) => {
  if (!value?.trim()) return 'GSTIN is required';
  const v = value.trim().toUpperCase();
  if (v.length !== 15) return 'GSTIN must be 15 characters';
  if (!PATTERNS.GSTIN.test(v)) return 'Enter a valid GSTIN';
  return '';
};

export const validateGSTINOptional = (value, isRequired) => {
  if (!isRequired) return '';
  return validateGSTIN(value);
};

// ---------- PAN Validators ----------
export const validatePAN = (value) => {
  if (!value?.trim()) return 'PAN number is required';
  const v = value.trim().toUpperCase();
  if (!PATTERNS.PAN.test(v)) return 'Enter a valid PAN (e.g. ABCDE1234F)';
  return '';
};

export const validatePANOptional = (value, isRequired) => {
  if (!isRequired) return '';
  return validatePAN(value);
};

// ---------- MSME / Udyam Validators ----------
export const validateMSMEType = (value, isRequired = false) => {
  if (isRequired && !value?.trim()) return 'Registration type is required';
  return '';
};

export const validateMSMENumber = (value, isRequired = false) => {
  if (!value?.trim()) {
    return isRequired ? 'MSME/Udyam Registration Number is required' : '';
  }
  const v = value.trim().toUpperCase();
  if (!PATTERNS.UDYAM.test(v)) {
    return 'Enter a valid Udyam number (e.g. UDYAM-GJ-01-1234567)';
  }
  return '';
};