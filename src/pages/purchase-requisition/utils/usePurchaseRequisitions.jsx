// ============================================
// File: src/hooks/usePurchaseRequisitions.js
// ============================================

import { useState, useCallback } from 'react';
import {
  getPurchaseRequisitionsByStatus,
  getPurchaseRequisitionById,
  updatePurchaseRequisition,
  updatePurchaseRequisitionStatus,
  createPurchaseRequisition,
  deletePurchaseRequisition
} from '@/services/apiServices';
import { PR_STATUS, getStatusLabel } from './prStatus';

/* ---------------- payload builders ---------------- */

export const formatDateForApi = (value) => {
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// actionBy is now expected to be the username (string); userId carries the
// logged-in user's numeric/string id separately, both sourced from the
// token via getUsernameFromToken() / getUserIdFromToken().
export const buildUpdatePayload = ({
  actionBy,
  userId,
  outletId,
  outletName,
  outletShortCode,
  prDate,
  prRequiredDate,
  remarks,
  details = [],
  status,
}) => ({
  actionBy,
  userId,
  outletId,
  outletName,
  outletShortCode,
  prDate: formatDateForApi(prDate),
  prRequiredDate: formatDateForApi(prRequiredDate),
  remarks,
  status,
  details: details.map((d) => ({
    id: d.id ?? 0,
    quantity: d.quantity,
    rawMaterialId: d.rawMaterialId,
    rawMaterialName: d.rawMaterialName,
    uomId: d.uomId,
    uomName: d.uomName,
  })),
});

export const buildStatusPayload = ({ status, actionBy, userId, remarks = '' }) => ({
  status,
  actionBy,
  userId,
  remarks,
});

// actionBy: username of whoever last actioned this PR (create / approve /
// reject / save-progress) — surfaced directly by getPurchaseRequisitionById.
// Used on the view page to show "Approved By" / "Rejected By".
const normalizePr = (pr) => ({
  id: pr.id,
  prCode: pr.prCode,
  date: pr.prDate,
  requiredDate: pr.prRequiredDate,
  outlet: pr.outletName ?? '',
  outletId: pr.outletId,
  status: getStatusLabel(pr.status),
  rawStatus: pr.status,
  remarks: pr.remarks ?? '',
  notes: pr.remarks ?? '',
  raisedBy: pr.createdByName ?? pr.updatedByName ?? pr.actionBy ?? pr.updatedBy ?? pr.createdBy ?? '',
  actionBy: pr.actionBy ?? pr.updatedByName ?? pr.createdByName ?? '',
  details: pr.details ?? [],
  createdBy: pr.createdBy,
  createdByName: pr.createdByName,
  createdAt: pr.createdAt,
  updatedBy: pr.updatedBy,
  updatedByName: pr.updatedByName,
  updatedAt: pr.updatedAt,
});

/* ---------------- hook ---------------- */

export const usePurchaseRequisitions = () => {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchByStatus = useCallback(async (status) => {
    if (!status) {
      setList([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseRequisitionsByStatus(status);
      const data = (res?.data?.data ?? []).map(normalizePr);
      setList(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseRequisitionById(id);
      const raw = res?.data?.data ?? res?.data;
      const data = normalizePr(raw);
      setCurrent(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------- Create page: Save vs Send For Approval -------- */

  const createPr = useCallback(async (formValues, status) => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildUpdatePayload({ ...formValues, status });
      const res = await createPurchaseRequisition(payload);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDraft = useCallback(
    (formValues) => createPr(formValues, PR_STATUS.PENDING),
    [createPr],
  );

  const createAndSendForApproval = useCallback(
    (formValues) => createPr(formValues, PR_STATUS.SENT_FOR_APPROVAL),
    [createPr],
  );

  /* -------- Edit page (PENDING PRs only): Save vs Send For Approval -------- */

  const updatePr = useCallback(async (id, formValues, status) => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildUpdatePayload({ ...formValues, status });
      const res = await updatePurchaseRequisition(id, payload);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDraft = useCallback(
    (id, formValues) => updatePr(id, formValues, PR_STATUS.PENDING),
    [updatePr],
  );

  const updateAndSendForApproval = useCallback(
    (id, formValues) => updatePr(id, formValues, PR_STATUS.SENT_FOR_APPROVAL),
    [updatePr],
  );

  /* -------- Approver actions — status-only endpoint --------
   * Now take both actionBy (username) and userId (logged-in user's id).
   * -------- */

  const approve = useCallback(async (id, actionBy, userId, remarks = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await updatePurchaseRequisitionStatus(
        id,
        buildStatusPayload({ status: PR_STATUS.APPROVED, actionBy, userId, remarks }),
      );
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (id, actionBy, userId, remarks = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await updatePurchaseRequisitionStatus(
        id,
        buildStatusPayload({ status: PR_STATUS.REJECTED, actionBy, userId, remarks }),
      );
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------- Approver actions that edit line items -------- */

  const saveApprovalProgress = useCallback(async (id, formValues) => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildUpdatePayload({ ...formValues, status: PR_STATUS.IN_PROGRESS });
      const res = await updatePurchaseRequisition(id, payload);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveWithChanges = useCallback(async (id, formValues) => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildUpdatePayload({ ...formValues, status: PR_STATUS.APPROVED });
      const res = await updatePurchaseRequisition(id, payload);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePr = useCallback(async (id, actionBy) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deletePurchaseRequisition(id, actionBy);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    list,
    current,
    loading,
    error,
    fetchByStatus,
    fetchById,
    createDraft,
    createAndSendForApproval,
    updateDraft,
    updateAndSendForApproval,
    approveWithChanges,
    saveApprovalProgress,
    approve,
    reject,
    deletePr,
  };
};