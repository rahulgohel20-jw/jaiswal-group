// ============================================
// File: src/pages/purchase-order/utils/poStatus.js
//
// Mirrors the `status` enum on PATCH /purchase-orders/updatestatus/{id}:
//   PENDING, SENT_FOR_APPROVAL, IN_PROGRESS, APPROVED,
//   PARTIALLY_RECEIVED, CLOSED, REJECTED
//
// NOTE: merge this with whatever your existing poStatus.js already
// exports (PO_STATUS / PO_STATUS_LIST were already in use elsewhere in
// the codebase) — this is the full shape those names should have now.
// ============================================

export const PO_STATUS = {
  PENDING: 'PENDING',
  SENT_FOR_APPROVAL: 'SENT_FOR_APPROVAL',
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
};

export const PO_STATUS_LIST = Object.values(PO_STATUS);

// Human-readable label for a raw status value.
const PO_STATUS_LABELS = {
  [PO_STATUS.PENDING]: 'Draft',
  [PO_STATUS.SENT_FOR_APPROVAL]: 'Sent for Approval',
  [PO_STATUS.IN_PROGRESS]: 'In Progress',
  [PO_STATUS.APPROVED]: 'Approved',
  [PO_STATUS.PARTIALLY_RECEIVED]: 'Partially Received',
  [PO_STATUS.CLOSED]: 'Closed',
  [PO_STATUS.REJECTED]: 'Rejected',
};

export const getPoStatusLabel = (status) => PO_STATUS_LABELS[status] || status || '';

// Which list-page "group"/tab a raw status belongs to. A PR that's been
// approved but has no PO yet isn't a real PO status — the list page adds
// that as its own synthetic group ('AWAITING_PO') before a PO exists.
export const PO_STATUS_GROUP = {
  [PO_STATUS.PENDING]: 'DRAFT',
  [PO_STATUS.SENT_FOR_APPROVAL]: 'PENDING_APPROVAL',
  [PO_STATUS.IN_PROGRESS]: 'APPROVED',
  [PO_STATUS.APPROVED]: 'APPROVED',
  [PO_STATUS.PARTIALLY_RECEIVED]: 'RECEIVING',
  [PO_STATUS.CLOSED]: 'CLOSED',
  [PO_STATUS.REJECTED]: 'REJECTED',
};

// Tab definitions for the Purchase Order Request list page, in display order.
export const PO_GROUPS = [
  { key: 'AWAITING_PO', label: 'Awaiting PO' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING_APPROVAL', label: 'Sent for Approval' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'RECEIVING', label: 'Partially Received' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'REJECTED', label: 'Rejected' },
];