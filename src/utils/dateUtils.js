/**
 * Date helper utilities
 */

/**
 * Formats various date representations (Date object, ISO string, YYYY-MM-DD, DD-MM-YYYY)
 * into standard DD/MM/YYYY string format.
 *
 * @param {Date|string|null|undefined} dateVal
 * @returns {string} Formatted DD/MM/YYYY date or empty string if invalid
 */
export const formatToDDMMYYYY = (dateVal) => {
  if (!dateVal) return '';

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const day = String(dateVal.getDate()).padStart(2, '0');
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const year = dateVal.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';

  // If already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  const clean = trimmed.split('T')[0];
  if (clean.includes('-')) {
    const parts = clean.split('-');
    // YYYY-MM-DD
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    // DD-MM-YYYY
    if (parts.length === 3 && parts[2].length === 4) {
      const [day, month, year] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      // YYYY/MM/DD
      if (parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      // DD/MM/YYYY
      if (parts[2].length === 4) {
        const [day, month, year] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
  }

  return trimmed;
};

/**
 * Returns today's date formatted as YYYY-MM-DD for date inputs
 *
 * @returns {string} YYYY-MM-DD
 */
export const getTodayInputDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

