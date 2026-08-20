// ============================================
// File: src/constants/poStatus.js
// NOTE: These enum values are a best guess mirroring the PR_STATUS pattern
// (PENDING/APPROVED/REJECTED/CANCELLED). Confirm against the actual
// /purchase-orders/updatestatus swagger before relying on them.
// ============================================

export const PO_STATUS = {
  PENDING: 'PENDING',     // PO shell created from an approved PR, not yet finalized
  APPROVED: 'APPROVED',   // PO generated / finalized
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

// Includes the "All Status" sentinel so it can drive the filter <Select> directly.
export const PO_STATUS_LIST = [
  { value: 'All Status', label: 'All Status' },
  { value: PO_STATUS.PENDING, label: 'Pending' },
  { value: PO_STATUS.APPROVED, label: 'Approved' },
  { value: PO_STATUS.REJECTED, label: 'Rejected' },
  { value: PO_STATUS.CANCELLED, label: 'Cancelled' },
];

export const getPoStatusLabel = (value) => {
  const match = PO_STATUS_LIST.find((s) => s.value === value);
  return match ? match.label : value;
};