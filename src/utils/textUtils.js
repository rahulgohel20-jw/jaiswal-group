/**
 * Utility functions for text formatting and normalization.
 */

// Common business acronyms to preserve in uppercase
const COMMON_ACRONYMS = new Set([
  'PO', 'PR', 'GRN', 'GST', 'GSTIN', 'PAN', 'TDS', 'TCS',
  'UOM', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'MRP', 'QC', 'QA',
  'ID', 'SKU', 'RFQ', 'RFP', 'SO', 'DO', 'STN', 'DC',
  'VIP', 'CEO', 'MD', 'CFO', 'HR', 'IT', 'MIS', 'OTP',
  'AM', 'PM'
]);

/**
 * Capitalizes the first letter of each word in a string (Title Case).
 * e.g., "contact site manager for further details" -> "Contact Site Manager For Further Details"
 *
 * @param {string} value The input text
 * @returns {string} The Title Case formatted string
 */
export const formatRemarks = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Normalize excessive horizontal spaces while preserving newlines
  const normalized = trimmed
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n');

  // Match each word (including letters, digits, and apostrophes)
  return normalized.replace(/[a-zA-Z0-9]+(?:'[a-zA-Z]+)?/g, (word) => {
    // Pure numbers are preserved
    if (/^\d+$/.test(word)) return word;

    const upper = word.toUpperCase();
    if (COMMON_ACRONYMS.has(upper)) {
      return upper;
    }

    const isAllUpper = word === word.toUpperCase();
    const isAllLower = word === word.toLowerCase();

    // If word is completely lowercase or uppercase, capitalize first letter and lowercase rest
    if (isAllUpper || isAllLower) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // If word already has mixed casing (e.g., iPhone), ensure initial letter is capitalized
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
};

/**
 * Checks if an object/payload key represents a remark field.
 * Matches: 'remarks', 'remark', 'itemRemarks', 'discrepancyRemarks', 'rejectionRemarks', etc.
 *
 * @param {string} key
 * @returns {boolean}
 */
export const isRemarksKey = (key) => {
  if (typeof key !== 'string') return false;
  return /remarks?$/i.test(key) || /(^|[_\b\-])remarks?($|[_\b\-])/i.test(key);
};

/**
 * Recursively traverses any payload object, array, or FormData,
 * and formats all string values under remark keys to Title Case.
 *
 * @param {any} data
 * @returns {any}
 */
export const transformRemarksInPayload = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(transformRemarksInPayload);
  }

  // Handle FormData in browser environment
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    try {
      for (const [key, val] of Array.from(data.entries())) {
        if (isRemarksKey(key) && typeof val === 'string') {
          data.set(key, formatRemarks(val));
        }
      }
    } catch {
      // ignore
    }
    return data;
  }

  // Skip Blobs, Files, Dates, RegExps
  if (
    (typeof Blob !== 'undefined' && data instanceof Blob) ||
    (typeof File !== 'undefined' && data instanceof File) ||
    data instanceof Date ||
    data instanceof RegExp
  ) {
    return data;
  }

  if (typeof data === 'object') {
    const copy = {};
    for (const [k, v] of Object.entries(data)) {
      if (isRemarksKey(k) && typeof v === 'string') {
        copy[k] = formatRemarks(v);
      } else if (v && typeof v === 'object') {
        copy[k] = transformRemarksInPayload(v);
      } else {
        copy[k] = v;
      }
    }
    return copy;
  }

  return data;
};
