// ============================================
// File: src/hooks/usePurchaseOrders.js
// Mirrors usePurchaseRequisitions.js's shape (list/current/loading/error +
// action callbacks) so PO screens follow the same pattern as PR screens.
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
} from '@/services/apiServices';
import { PO_STATUS, getPoStatusLabel } from './poStatus';

// NOTE: field names below (prCode, poCode, companyName, outletName,
// raisedBy/createdByName...) are guesses based on the mock UI's shape.
// Confirm against the real /purchase-orders/getbyoutlet response and
// adjust the ?? fallbacks accordingly.
const normalizePo = (po) => ({
  id: po.id,
  prId: po.prId,
  prCode: po.prCode ?? '',
  poCode: po.poCode ?? po.poNumber ?? 'TO BE GENERATED',
  date: po.poDate ?? po.createdAt ?? '',
  company: po.companyName ?? po.organizationName ?? '',
  outlet: po.outletName ?? '',
  outletId: po.outletId,
  raisedBy: po.raisedBy ?? po.createdByName ?? '',
  status: getPoStatusLabel(po.status),
  rawStatus: po.status,
  vendorId: po.vendorId,
  vendorName: po.vendorName ?? '',
  createdBy: po.createdBy,
  createdAt: po.createdAt,
});

export const usePurchaseOrders = () => {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchByOutlet = useCallback(async (outletId) => {
    if (!outletId) {
      setList([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getPurchaseOrdersByOutlet(outletId);
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
      const res = await updatePurchaseOrderStatus(id, { status, ...extra });
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

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deletePurchaseOrder(id);
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
    fetchByOutlet,
    fetchByStatuses,
    fetchById,
    create,
    update,
    approve,
    reject,
    remove,
  };
};