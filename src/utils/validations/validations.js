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

// ---------- Bank Detail Validators ----------
export const validateIFSC = (value) => {
  if (!value?.trim()) return 'IFSC code is required';
  const v = value.trim().toUpperCase();
  if (!PATTERNS.IFSC.test(v)) return 'Enter a valid IFSC code (e.g. SBIN0001234)';
  return '';
};

export const validateIFSCBankMatch = (ifsc, bankName) => {
  if (!ifsc?.trim() || !bankName?.trim()) return '';
  const cleanIfsc = ifsc.trim().toUpperCase();
  const cleanBank = bankName.trim().toUpperCase();

  if (!PATTERNS.IFSC.test(cleanIfsc)) return '';

  const bankCode = cleanIfsc.substring(0, 4);

  const codeToKeywords = {
    SBIN: ['STATE BANK', 'SBI'],
    HDFC: ['HDFC'],
    ICIC: ['ICICI'],
    UTIB: ['AXIS'],
    BARB: ['BARODA'],
    PUNB: ['PUNJAB NATIONAL', 'PNB'],
    KKBK: ['KOTAK'],
    YESB: ['YES BANK', 'YESB'],
    IBKL: ['IDBI'],
    CNRB: ['CANARA'],
    IOBA: ['INDIAN OVERSEAS'],
    IDIB: ['INDIAN BANK'],
    UBIN: ['UNION BANK'],
    MAHB: ['MAHARASHTRA'],
    PSIB: ['PUNJAB & SIND', 'PUNJAB AND SIND'],
    UCBA: ['UCO'],
    DBSS: ['DBS', 'DEVELOPMENT BANK OF SINGAPORE'],
    HSBC: ['HSBC'],
    SCBL: ['STANDARD CHARTERED'],
    CITI: ['CITI'],
    JAKA: ['JAMMU', 'KASHMIR'],
    TMBL: ['TAMILNAD'],
    KVBL: ['KARUR VYSYA'],
    FEDR: ['FEDERAL'],
    DLXB: ['DHANLAXMI'],
    SIBL: ['SOUTH INDIAN'],
    INDB: ['INDUSIND'],
    KBLA: ['KARNATAKA'],
    BAND: ['BANDHAN'],
    IDFB: ['IDFC'],
    ESFB: ['EQUITAS'],
    AUBL: ['AU SMALL'],
    UJVN: ['UJJIVAN'],
  };

  const keywords = codeToKeywords[bankCode];
  if (keywords) {
    const isMatch = keywords.some(keyword => cleanBank.includes(keyword));
    if (!isMatch) {
      return `IFSC code belongs to ${keywords[0]}, but bank name is ${bankName}`;
    }
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