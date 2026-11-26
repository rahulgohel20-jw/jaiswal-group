import { formatToDDMMYYYY } from './dateUtils';

/**
 * Formats a numeric value as Indian Rupees (INR)
 * e.g. 125000 -> "₹1,25,000.00"
 *
 * @param {number|string|null|undefined} amount
 * @param {string} fallback
 * @returns {string}
 */
export const formatCurrency = (amount, fallback = '—') => {
  if (amount === null || amount === undefined || amount === '') return fallback;
  const num = Number(amount);
  if (Number.isNaN(num)) return fallback;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (err) {
    console.warn('Currency formatting error:', err);
    return `₹${num.toFixed(2)}`;
  }
};

/**
 * Formats a number as a percentage string
 * e.g. 12.5 -> "12.5%", 10 -> "10%"
 *
 * @param {number|string|null|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export const formatPercent = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return `${Number(num.toFixed(2)).toString()}%`;
};

/**
 * Formats a date string into readable DD/MM/YYYY format
 *
 * @param {string|Date|null|undefined} dateVal
 * @param {string} fallback
 * @returns {string}
 */
export const formatDate = (dateVal, fallback = '—') => {
  if (!dateVal) return fallback;
  const formatted = formatToDDMMYYYY(dateVal);
  return formatted || fallback;
};

/**
 * Formats a timestamp into a readable Date & Time format
 * e.g. "25/11/2026, 03:30 PM"
 *
 * @param {string|Date|null|undefined} dateVal
 * @param {string} fallback
 * @returns {string}
 */
export const formatDateTime = (dateVal, fallback = '—') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) {
      return formatDate(dateVal, fallback);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return formatDate(dateVal, fallback);
  }
};

/**
 * Ensures text is trimmed or returns a fallback dash
 *
 * @param {string|null|undefined} val
 * @param {string} fallback
 * @returns {string}
 */
export const formatText = (val, fallback = '—') => {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
};

/**
 * Returns label and Tailwind classes for proposal status badges
 *
 * @param {string|null|undefined} status
 * @returns {{ label: string, badgeClass: string }}
 */
export const getStatusBadge = (status) => {
  const raw = String(status || '').toUpperCase().trim();

  switch (raw) {
    case 'APPROVED':
    case 'ACCEPTED':
      return {
        label: 'Approved',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'PENDING_APPROVAL':
    case 'PENDING APPROVAL':
    case 'SENT_FOR_APPROVAL':
    case 'SENT FOR APPROVAL':
      return {
        label: 'Pending Approval',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'DRAFT':
      return {
        label: 'Draft',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      };
    case 'UNDER_REVIEW':
    case 'UNDER REVIEW':
      return {
        label: 'Under Review',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    default:
      return {
        label: formatText(status, 'Draft'),
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};
