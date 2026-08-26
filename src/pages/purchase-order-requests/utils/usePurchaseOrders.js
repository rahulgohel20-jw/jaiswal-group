// ============================================
// File: src/pages/purchase-order-requests/utils/usePurchaseOrders.js
// ============================================

import { useState, useCallback } from 'react';
import {
  getPurchaseOrdersByOutlet,
  getPurchaseOrderById,
  getPurchaseOrdersByStatuses,
  getPurchaseOrdersByCreatedBy,
  getPurchaseOrdersByVendors,
  filterPurchaseOrdersByDates,
  filterPurchaseOrdersByDatesAll,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  getPurchaseRequisitionsByOutlet,
  updatePurchaseRequisitionStatus,
  getAuditLogs,
} from '@/services/apiServices';
import { PO_STATUS, getPoStatusLabel } from './poStatus';
import { getUserIdFromToken, getUsernameFromToken } from '@/utils/auth';

const PR_APPROVED_STATUS = 'APPROVED';
const PR_REJECTED_STATUS = 'REJECTED';


const normalizePo = (po) => {
  const prId =
    po.purchaseRequisitionId ??
    po.prId ??
    po.purchaseRequisition?.id ??
    po.prPoMapping?.[0]?.purchaseRequisitionId ??
    po.prPoMapping?.[0]?.prId ??
    po.details?.[0]?.purchaseRequisitionId ??
    po.details?.[0]?.prId ??
    null;

  return {
    id: po.id,
    purchaseRequisitionId: prId ? Number(prId) : null,
    prId: prId ? Number(prId) : null,
    prCode: po.prCode ?? po.purchaseRequisition?.prCode ?? po.prPoMapping?.[0]?.prCode ?? '',
    poCode: po.poCode ?? 'TO BE GENERATED',
    outlet: po.outletName ?? '',
    outletId: po.outletId,
    date: po.poDate ?? '',
    expectedDeliveryDate: po.expectedDeliveryDate ?? '',
    remarks: po.remarks ?? '',
    raisedBy: po.createdByName ?? po.updatedByName ?? po.updatedBy ?? po.createdBy ?? '',
    status: getPoStatusLabel(po.status),
    rawStatus: po.status,
    createdBy: po.createdBy,
    createdByName: po.createdByName,
    updatedBy: po.updatedBy,
    updatedByName: po.updatedByName,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    details: (po.details || []).map((d) => ({
      id: d.id,
      rawMaterialId: d.rawMaterialId,
      rawMaterialName: d.rawMaterialName,
      uomId: d.uomId,
      uomName: d.uomName,
      quantity: d.orderedQuantity ?? d.quantity,
      receivedQuantity: d.receivedQuantity,
      unitPrice: d.unitPrice,
      tax: d.tax,
      taxAmount: d.taxAmount,
      totalPrice: d.totalPrice,
      vendorId: d.vendorId,
      vendorName: d.vendorName,
      prDetailId: d.prDetailId ?? d.purchaseRequisitionDetailId ?? d.prDetailsId ?? null,
    })),
  };
};

const normalizePurchaseRequest = (pr) => ({
  id: pr.id,
  prId: pr.id,
  purchaseRequisitionId: pr.id,
  prCode: pr.prCode ?? '',
  date: pr.prDate ?? '',
  requiredDate: pr.prRequiredDate ?? '',
  company: pr.companyName ?? '',
  outlet: pr.outletName ?? '',
  outletId: pr.outletId,
  raisedBy: pr.createdByName ?? pr.updatedByName ?? pr.updatedBy ?? pr.createdBy ?? '',
  status: getPoStatusLabel(PO_STATUS.PENDING),
  rawStatus: PO_STATUS.PENDING,
  vendorId: pr.vendorId,
  vendorName: pr.vendorName ?? '',
  createdBy: pr.createdBy,
  createdByName: pr.createdByName,
  updatedBy: pr.updatedBy,
  updatedByName: pr.updatedByName,
  createdAt: pr.createdAt,
  updatedAt: pr.updatedAt,
  prPoMapping: pr.prPoMapping ?? [],
});

export const usePurchaseOrders = () => {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch POs for an outlet filtered to one or more rawStatus values.
  // Accepts either a single status string or an array of statuses — the
  // outlet endpoint only takes one status per call, so for a group that
  // maps to several rawStatuses (e.g. "Approved" = IN_PROGRESS + APPROVED)
  // this fires one call per status and merges the results.
  const fetchByOutletandStatus = useCallback(async (outletId, status) => {
    const finalOutletId = outletId === 'ALL' || !outletId ? 0 : outletId;
    const statuses = Array.isArray(status) ? status : [status].filter(Boolean);

    setLoading(true);
    setError(null);
    try {
      let raw = [];
      if (statuses.length <= 1) {
        const res = await getPurchaseOrdersByOutlet(finalOutletId, statuses[0]);
        const responseData = res?.data?.data !== undefined && res?.data?.data !== null ? res?.data?.data : res?.data;
        raw = Array.isArray(responseData) ? responseData : [];
      } else {
        const results = await Promise.all(
          statuses.map((s) => getPurchaseOrdersByOutlet(finalOutletId, s)),
        );
        raw = results.flatMap((res) => {
          const responseData = res?.data?.data !== undefined && res?.data?.data !== null ? res?.data?.data : res?.data;
          return Array.isArray(responseData) ? responseData : [];
        });
      }
      const data = raw.filter((po) => po && po.id).map(normalizePo);
      setList(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load purchase orders.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApprovedRequestsByOutlet = useCallback(async (outletId) => {
    const finalOutletId = outletId === 'ALL' || !outletId ? 0 : outletId;

    setLoading(true);
    setError(null);

    try {
      const res = await getPurchaseRequisitionsByOutlet(
        finalOutletId,
        PR_APPROVED_STATUS,
      );

      const responseData = res?.data?.data !== undefined && res?.data?.data !== null ? res?.data?.data : res?.data;
      const raw = Array.isArray(responseData) ? responseData : [];

      // Only show approved PRs for which NO PO has been generated.
      const availablePrs = raw.filter((pr) => {
        if (!pr || !pr.id) return false;
        const mappings = pr.prPoMapping;
        return !Array.isArray(mappings) || mappings.length === 0;
      });

      const data = availablePrs.map(normalizePurchaseRequest);
      setList(data);
      return data;
    } catch (err) {
      setError(
        err?.message || 'Failed to load purchase order requests.',
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByStatuses = useCallback(async (statuses) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseOrdersByStatuses({ statuses });
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const data = (Array.isArray(raw) ? raw : []).map(normalizePo);
      setList(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load purchase orders.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseOrderById(id);
      const raw = res?.data?.data ?? res?.data ?? res;
      const data = normalizePo(raw);
      setCurrent(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load purchase order.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createPurchaseOrder(payload);
      return res.data;
    } catch (err) {
      setError(err?.message || 'Failed to create purchase order.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updatePurchaseOrder(id, payload);
      return res.data;
    } catch (err) {
      setError(err?.message || 'Failed to update purchase order.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id, status, extra = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updatePurchaseOrderStatus(id, status, extra.actionBy);
      return res.data;
    } catch (err) {
      setError(err?.message || 'Failed to update purchase order status.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(
    (id, extra) => updateStatus(id, PO_STATUS.APPROVED, extra),
    [updateStatus],
  );

  const reject = useCallback(
    (id, extra) => updateStatus(id, PO_STATUS.REJECTED, extra),
    [updateStatus],
  );

  const rejectRequest = useCallback(async (id, extra = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updatePurchaseRequisitionStatus(id, {
        status: PR_REJECTED_STATUS,
        ...extra,
      });
      return res.data;
    } catch (err) {
      setError(err?.message || 'Failed to reject purchase order request.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id, payload = {}) => {
    setLoading(true);
    setError(null);
    try {
      const userId = getUserIdFromToken();
      const actionBy = getUsernameFromToken() || userId;
      const params = typeof payload === 'object' && payload !== null
        ? { userId, actionBy, ...payload }
        : { userId, actionBy: payload || actionBy };
      const res = await deletePurchaseOrder(id, params);
      return res?.data ?? res;
    } catch (err) {
      setError(err?.message || 'Failed to delete purchase order.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const fetchAuditLogs = useCallback(async (moduleId, moduleName = 'PURCHASE_ORDER', subModuleId) => {
    if (!moduleId) {
      setLogs([]);
      return [];
    }
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await getAuditLogs(moduleId, moduleName, subModuleId);
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setLogs(list);
      return list;
    } catch (err) {
      setLogsError(err?.message || 'Failed to load activity log.');
      throw err;
    } finally {
      setLogsLoading(false);
    }
  }, []);

  return {
    list,
    current,
    loading,
    error,
    logs,
    logsLoading,
    logsError,
    fetchAuditLogs,
    fetchByOutletandStatus,
    fetchApprovedRequestsByOutlet,
    fetchByStatuses,
    fetchById,
    create,
    update,
    approve,
    reject,
    rejectRequest,
    remove,
  };
};