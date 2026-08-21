// ============================================
// File: src/constants/prStatus.js
// Fixed to match actual backend enum values.
// ============================================

export const PR_STATUS = {
  PENDING: 'PENDING',                     // saved as draft (by creator)
  SENT_FOR_APPROVAL: 'SENT_FOR_APPROVAL', // submitted, not yet seen by approver
  IN_PROGRESS: 'IN_PROGRESS',             // edited & saved by the approver
  APPROVED: 'APPROVED',                   // approver approved the PR
  REJECTED: 'REJECTED',                   // approver rejected the PR
  CANCELLED: 'CANCELLED',                 // requisition cancelled
};

export const PR_STATUS_LIST = [
  { value: PR_STATUS.PENDING, label: 'Pending', description: 'Saved as draft' },
  { value: PR_STATUS.SENT_FOR_APPROVAL, label: 'Sent for Approval', description: 'Not yet seen by approver' },
  { value: PR_STATUS.IN_PROGRESS, label: 'In Progress', description: 'Edited by approver' },
  { value: PR_STATUS.APPROVED, label: 'Approved', description: 'Approved by approver' },
  { value: PR_STATUS.REJECTED, label: 'Rejected', description: 'Rejected by approver' },
  { value: PR_STATUS.CANCELLED, label: 'Cancelled', description: 'Requisition cancelled' },
];

export const getStatusLabel = (statusValue) => {
  const match = PR_STATUS_LIST.find((s) => s.value === statusValue);
  return match ? match.label : statusValue;
};

// Statuses a requisition can still be edited in — used by the list page
// to decide whether to show the Edit action.
export const EDITABLE_STATUSES = new Set([PR_STATUS.PENDING]);