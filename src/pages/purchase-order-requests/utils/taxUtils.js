// ============================================
// File: src/pages/purchase-order-requests/utils/taxUtils.js
// ============================================

/**
 * Check if the transaction is inter-state based on vendor stateId (billTo) and outlet stateId (shipTo).
 * Per requirements: Compare state by stateId and not the name.
 * Same stateId -> Intra-state (CGST + SGST)
 * Different stateId -> Inter-state (IGST)
 */
export const checkIsInterState = (billTo, shipTo) => {
  const vendorStateId = billTo?.stateId;
  const outletStateId = shipTo?.stateId;

  if (vendorStateId != null && outletStateId != null) {
    return Number(vendorStateId) !== Number(outletStateId);
  }
  return false;
};

/**
 * Convert number into words (Indian numbering format).
 * e.g. 41000 -> "Forty One Thousand Rupees Only"
 */
export const numberToWords = (num) => {
  if (num == null || isNaN(num)) return '';
  const val = Math.round(Number(num));
  if (val === 0) return 'Zero Rupees Only';
  if (val < 0) return `Negative ${numberToWords(Math.abs(val))}`;

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const inWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        ' Hundred ' +
        (n % 100 !== 0 ? inWords(n % 100) : '')
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        'Thousand ' +
        (n % 1000 !== 0 ? inWords(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        'Lakh ' +
        (n % 100000 !== 0 ? inWords(n % 100000) : '')
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      'Crore ' +
      (n % 10000000 !== 0 ? inWords(n % 10000000) : '')
    );
  };

  return `${inWords(val).trim()} Rupees Only`;
};

/**
 * Format currency with 2 decimal places and Indian numbering
 */
export const formatCurrency = (val) => {
  if (val == null || isNaN(val)) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
