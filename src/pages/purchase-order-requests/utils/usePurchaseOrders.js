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
} from '@/services/apiServices';
import { PO_STATUS, getPoStatusLabel } from './poStatus';

const PR_APPROVED_STATUS = 'APPROVED';
const PR_REJECTED_STATUS = 'REJECTED';



const normalizePo = (po) => ({
  id: po.id,
  poCode: po.poCode ?? 'TO BE GENERATED',
  outlet: po.outletName ?? '',
  outletId: po.outletId,
  date: po.poDate ?? '',
  expectedDeliveryDate: po.expectedDeliveryDate ?? '',
  remarks: po.remarks ?? '',
  raisedBy: po.updatedBy ?? '',
  status: getPoStatusLabel(po.status),
  rawStatus: po.status,
  createdBy: po.createdBy,
  createdAt: po.createdAt,
  updatedAt: po.updatedAt,
  details: (po.details || []).map((d) => ({
    id: d.id,
    rawMaterialId: d.rawMaterialId,
    rawMaterialName: d.rawMaterialName,
    uomId: d.uomId,
    uomName: d.uomName,
    quantity: d.orderedQuantity,
    receivedQuantity: d.receivedQuantity,
    unitPrice: d.unitPrice,
    tax: d.tax,
    taxAmount: d.taxAmount,
    totalPrice: d.totalPrice,
    vendorId: d.vendorId,
    vendorName: d.vendorName,
    prDetailId: d.prDetailId,
  })),
});

const normalizePurchaseRequest = (pr) => ({
  id: pr.id,
  prId: pr.id,
  prCode: pr.prCode ?? '',
  poCode: 'TO BE GENERATED',
  date: pr.prDate ?? '',
  company: pr.companyName ?? '',
  outlet: pr.outletName ?? '',
  outletId: pr.outletId,
  raisedBy: pr.updatedBy ?? '',
  status: getPoStatusLabel(PO_STATUS.PENDING),
  rawStatus: PO_STATUS.PENDING,
  vendorId: pr.vendorId,
  vendorName: pr.vendorName ?? '',
  createdBy: pr.createdBy,
  createdAt: pr.createdAt,
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
    if (!outletId) {
      setList([]);
      return [];
    }
    const statuses = Array.isArray(status) ? status : [status].filter(Boolean);

    setLoading(true);
    setError(null);
    try {
      let raw;
      if (statuses.length <= 1) {
        const res = await getPurchaseOrdersByOutlet(outletId, statuses[0]);
        raw = res?.data?.data ?? res?.data ?? res ?? [];
      } else {
        const results = await Promise.all(
          statuses.map((s) => getPurchaseOrdersByOutlet(outletId, s)),
        );
        raw = results.flatMap((res) => res?.data?.data ?? res?.data ?? res ?? []);
      }
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

  // Purchase Order Requests screen: approved PRs for the selected outlet.
  // This is a fixed, single query (status=APPROVED) — it doesn't depend on
  // which PO tab is active, so callers should fetch it once per outlet,
  // not on every tab switch.
  const fetchApprovedRequestsByOutlet = useCallback(async (outletId) => {
    if (!outletId) {
      setList([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseRequisitionsByOutlet(outletId, PR_APPROVED_STATUS);
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const data = (Array.isArray(raw) ? raw : []).map(normalizePurchaseRequest);
      setList(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load purchase order requests.');
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

  const remove = useCallback(async (id, { actionBy }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deletePurchaseOrder(id, { actionBy });
      return res.data;
    } catch (err) {
      setError(err?.message || 'Failed to delete purchase order.');
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