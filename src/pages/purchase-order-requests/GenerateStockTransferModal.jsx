import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  GitFork,
  Info,
  Trash2,
  X,
  ChevronDown,
  Loader2,
  Package,
} from 'lucide-react';
import {
  getOrganizationByType,
  getAllSubOutletsByOrganization,
  saveTransfer,
  getCurrentStockListGet,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';

export const GenerateStockTransferModal = ({
  isOpen,
  onClose,
  initialItems = [],
  currentOutletId = '',
  onSuccess,
}) => {
  const {
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units: scopedUnits,
    effectiveOutletId,
    loading: scopeLoading,
  } = useOrgScope();

  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  // Routing configuration state
  const [fromOutletId, setFromOutletId] = useState('');
  const [toOutletId, setToOutletId] = useState('');
  const [fromSubOutletId, setFromSubOutletId] = useState('');
  const [toSubOutletId, setToSubOutletId] = useState('');
  const [fromSubOutlets, setFromSubOutlets] = useState([]);
  const [toSubOutlets, setToSubOutlets] = useState([]);
  const [loadingFromSubs, setLoadingFromSubs] = useState(false);
  const [loadingToSubs, setLoadingToSubs] = useState(false);

  // Stock map & status states
  const [stockMap, setStockMap] = useState({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available "From Outlets":
  // - Company user: only outlets belonging to this parent company (scopedUnits)
  // - Group user: all outlets
  // - Outlet user: automatically fixed to user's outlet (no dropdown)
  const availableFromOutlets = useMemo(() => {
    if (isCompanyUser) {
      return (scopedUnits || []).map((u) => ({
        id: String(u.id),
        name: u.name || `Outlet #${u.id}`,
      }));
    }
    return outlets;
  }, [isCompanyUser, scopedUnits, outlets]);

  // Sync initial items and toOutletId when modal opens
  useEffect(() => {
    if (isOpen) {
      setItems(
        initialItems.map((item) => ({
          ...item,
          transferQuantity: item.transferQuantity || item.orderedQty || 1,
        }))
      );
      setErrors({});
      if (currentOutletId) {
        setToOutletId(String(currentOutletId));
      }
    }
  }, [isOpen, initialItems, currentOutletId]);

  // Load all outlets (for Group user or destination outlet selection)
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setLoadingOutlets(true);
    getOrganizationByType(OrgTypes.OUTLET)
      .then((res) => {
        if (isCancelled) return;
        const raw =
          res?.data?.data ??
          res?.data?.organizations ??
          res?.data?.outlets ??
          res?.data ??
          res ??
          [];
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list.map((o) => ({
          id: String(o.id),
          name: o.companyNameEnglish || o.name || o.companyName || `Outlet #${o.id}`,
        }));
        setOutlets(mapped);
      })
      .catch((err) => {
        console.error('Failed to load outlets for stock transfer:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingOutlets(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Default fromOutletId based on user role and available outlets
  useEffect(() => {
    if (!isOpen) return;

    if (isOutletUser) {
      const myOutletId = String(
        effectiveOutletId || currentOutletId || getOrgIdFromToken() || scopedUnits[0]?.id || ''
      );
      if (myOutletId) {
        setFromOutletId(myOutletId);
      }
      return;
    }

    if (isCompanyUser && availableFromOutlets.length > 0) {
      if (!fromOutletId || !availableFromOutlets.some((o) => String(o.id) === String(fromOutletId))) {
        const differentOutlet = availableFromOutlets.find(
          (o) => String(o.id) !== String(toOutletId || currentOutletId)
        );
        setFromOutletId(differentOutlet ? String(differentOutlet.id) : String(availableFromOutlets[0].id));
      }
      return;
    }

    if (isGroupUser && outlets.length > 0) {
      if (!fromOutletId || !outlets.some((o) => String(o.id) === String(fromOutletId))) {
        const differentOutlet = outlets.find(
          (o) => String(o.id) !== String(toOutletId || currentOutletId)
        );
        setFromOutletId(differentOutlet ? String(differentOutlet.id) : String(outlets[0].id));
      }
    }
  }, [
    isOpen,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    effectiveOutletId,
    currentOutletId,
    scopedUnits,
    availableFromOutlets,
    outlets,
    toOutletId,
    fromOutletId,
  ]);

  // Load sub-outlets for "From Outlet"
  useEffect(() => {
    if (!isOpen || !fromOutletId) {
      setFromSubOutlets([]);
      setFromSubOutletId('');
      return;
    }
    let isCancelled = false;
    setLoadingFromSubs(true);
    getAllSubOutletsByOrganization(fromOutletId)
      .then((res) => {
        if (isCancelled) return;
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list.map((s) => ({
          id: String(s.id),
          name: s.subOutletName || s.name || s.subOutlet || `Sub-Outlet #${s.id}`,
        }));
        setFromSubOutlets(mapped);
        if (mapped.length > 0 && !fromSubOutletId) {
          setFromSubOutletId(mapped[0].id);
        }
      })
      .catch((err) => {
        console.warn('Failed to load sub-outlets for fromOutlet:', err);
        if (!isCancelled) setFromSubOutlets([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingFromSubs(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, fromOutletId]);

  // Load sub-outlets for "To Outlet"
  useEffect(() => {
    if (!isOpen || !toOutletId) {
      setToSubOutlets([]);
      setToSubOutletId('');
      return;
    }
    let isCancelled = false;
    setLoadingToSubs(true);
    getAllSubOutletsByOrganization(toOutletId)
      .then((res) => {
        if (isCancelled) return;
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list.map((s) => ({
          id: String(s.id),
          name: s.subOutletName || s.name || s.subOutlet || `Sub-Outlet #${s.id}`,
        }));
        setToSubOutlets(mapped);
        if (mapped.length > 0 && !toSubOutletId) {
          setToSubOutletId(mapped[0].id);
        }
      })
      .catch((err) => {
        console.warn('Failed to load sub-outlets for toOutlet:', err);
        if (!isCancelled) setToSubOutlets([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingToSubs(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, toOutletId]);

  // Fetch available stock for items at the source ("From Outlet")
  useEffect(() => {
    if (!isOpen || !fromOutletId || items.length === 0) {
      setStockMap({});
      return;
    }
    const itemIds = items.map((it) => it.rawMaterialId || it.itemId || it.id).filter(Boolean);
    if (itemIds.length === 0) return;

    let isCancelled = false;
    setLoadingStock(true);
    const params = {
      itemIds,
      itemType: 'RAW_MATERIAL',
      organizationId: Number(fromOutletId),
    };
    if (fromSubOutletId) {
      params.subOutletId = Number(fromSubOutletId);
    }

    getCurrentStockListGet(params)
      .then((res) => {
        if (isCancelled) return;
        const stockData = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(stockData)
          ? stockData
          : Array.isArray(stockData?.content)
          ? stockData.content
          : Array.isArray(stockData?.list)
          ? stockData.list
          : [];

        const map = {};
        list.forEach((s) => {
          const id = s.itemId || s.id;
          if (id != null) {
            map[id] = s.currentStock ?? 0;
          }
        });
        setStockMap(map);
      })
      .catch((err) => {
        console.warn('Failed to load stock list in GenerateStockTransferModal:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingStock(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, fromOutletId, fromSubOutletId, items]);

  const handleQtyChange = (itemId, val) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, transferQuantity: val } : it))
    );
    if (errors[`qty_${itemId}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`qty_${itemId}`];
        return next;
      });
    }
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSubmit = async () => {
    const errs = {};

    if (!fromOutletId) errs.fromOutletId = 'From Outlet is required';
    if (!toOutletId) errs.toOutletId = 'To Outlet is required';
    if (fromOutletId && toOutletId && fromOutletId === toOutletId && fromSubOutletId === toSubOutletId) {
      errs.toOutletId = 'Source and Destination cannot be identical';
    }

    if (items.length === 0) {
      errs.items = 'Please include at least one raw material item for transfer';
    }

    items.forEach((it) => {
      const q = Number(it.transferQuantity);
      if (!it.transferQuantity || isNaN(q) || q <= 0) {
        errs[`qty_${it.id}`] = 'Invalid qty';
      }
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      notify.error('Please resolve validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const formattedDate = `${dd}/${mm}/${yyyy}`;

      const payload = {
        fromOrganizationId: Number(fromOutletId),
        fromSubOutletId: fromSubOutletId ? Number(fromSubOutletId) : null,
        toOrganizationId: Number(toOutletId),
        toSubOutletId: toSubOutletId ? Number(toSubOutletId) : null,
        vehicleNumber: '',
        driverName: '',
        driverContact: '',
        remarks: 'Generated from Purchase Order',
        transferDate: formattedDate,
        isDraft: false,
        items: items.map((it) => {
          const rawItemId = Number(it.rawMaterialId || it.itemId || it.id || 0);
          return {
            id: rawItemId,
            itemId: rawItemId,
            itemType: 'RAW_MATERIAL',
            unitId: Number(it.uomId || it.unitId || 0),
            requestedQuantity: Number(it.transferQuantity || it.orderedQty || 0),
            batchNumber: it.batchNumber || '',
            expiryDate: it.expiryDate || '',
            remarks: it.remarks || '',
          };
        }),
      };

      const res = await saveTransfer(payload);
      const resData = res?.data?.data ?? res?.data;
      const transferCode = resData?.transferCode || resData?.code || '';
      const fromOutletName =
        availableFromOutlets.find((o) => String(o.id) === String(fromOutletId))?.name ||
        outlets.find((o) => String(o.id) === String(fromOutletId))?.name ||
        `Outlet #${fromOutletId}`;
      const toOutletName =
        outlets.find((o) => String(o.id) === String(toOutletId))?.name || `Outlet #${toOutletId}`;

      notify.success(
        `Stock Transfer ${transferCode ? `(${transferCode}) ` : ''}created from "${fromOutletName}" to "${toOutletName}" successfully!`
      );
      onSuccess?.(resData || payload);
      onClose();
    } catch (err) {
      console.error('Failed to submit stock transfer:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to create stock transfer. Please try again.';
      notify.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#084E92] flex items-center justify-center text-white shadow-sm shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Generate Stock Transfer
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#084E92] border border-blue-100 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#084E92]"></span>
                  TRANSFER MODE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Transfer selected purchase items between outlets and sub-outlets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 bg-[#FAFCFF]/50">
          {/* Section 1: OUTLET & ROUTE CONFIGURATION */}
          <div className="bg-white rounded-2xl border border-blue-100/90 shadow-2xs overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-[#084E92] via-blue-500 to-indigo-500"></div>
            <div className="px-5 py-3.5 bg-blue-50/40 border-b border-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#084E92]">
                <GitFork className="w-4 h-4 text-[#084E92]" />
                OUTLET & SUBOUTLET CONFIGURATION
              </div>
            </div>

            <div
              className={`p-5 grid grid-cols-1 ${
                isOutletUser ? 'md:grid-cols-3' : 'md:grid-cols-2'
              } gap-4`}
            >
              {/* From Outlet - Hidden for Outlet User */}
              {!isOutletUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    From Outlet <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={fromOutletId}
                      onChange={(e) => {
                        setFromOutletId(e.target.value);
                        if (errors.fromOutletId) {
                          setErrors((prev) => ({ ...prev, fromOutletId: undefined }));
                        }
                      }}
                      disabled={loadingOutlets || scopeLoading}
                      className={`w-full h-10 border rounded-xl px-3 pr-8 text-xs text-gray-800 bg-white appearance-none outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-blue-100 ${
                        errors.fromOutletId ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select From Outlet</option>
                      {availableFromOutlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.fromOutletId && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.fromOutletId}</p>
                  )}
                </div>
              )}

              {/* To Outlet */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  To Outlet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={toOutletId}
                    onChange={(e) => {
                      setToOutletId(e.target.value);
                      if (errors.toOutletId) {
                        setErrors((prev) => ({ ...prev, toOutletId: undefined }));
                      }
                    }}
                    disabled={loadingOutlets || scopeLoading}
                    className={`w-full h-10 border rounded-xl px-3 pr-8 text-xs text-gray-800 bg-white appearance-none outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-blue-100 ${
                      errors.toOutletId ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Select To Outlet</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.toOutletId && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.toOutletId}</p>
                )}
              </div>

              {/* From Sub-Outlet */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  From Sub-Outlet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={fromSubOutletId}
                    onChange={(e) => setFromSubOutletId(e.target.value)}
                    disabled={!fromOutletId || loadingFromSubs}
                    className="w-full h-10 border border-gray-200 rounded-xl px-3 pr-8 text-xs text-gray-800 bg-white appearance-none outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {loadingFromSubs
                        ? 'Loading sub-outlets...'
                        : fromSubOutlets.length === 0
                        ? 'No sub-outlets (Main Outlet Stock)'
                        : 'Select From Sub-Outlet'}
                    </option>
                    {fromSubOutlets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* To Sub-Outlet */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  To Sub-Outlet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={toSubOutletId}
                    onChange={(e) => setToSubOutletId(e.target.value)}
                    disabled={!toOutletId || loadingToSubs}
                    className="w-full h-10 border border-gray-200 rounded-xl px-3 pr-8 text-xs text-gray-800 bg-white appearance-none outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {loadingToSubs
                        ? 'Loading sub-outlets...'
                        : toSubOutlets.length === 0
                        ? 'No sub-outlets (Main Outlet Stock)'
                        : 'Select To Sub-Outlet'}
                    </option>
                    {toSubOutlets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: SELECTED ITEMS FOR TRANSFER */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  SELECTED ITEMS FOR TRANSFER
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#084E92] border border-blue-100">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-10 text-center">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">
                  No items selected for transfer
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Please close and select at least one item from the purchase order table.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {items.map((item) => {
                  const hasQtyErr = Boolean(errors[`qty_${item.id}`]);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-200/90 p-4 hover:border-blue-200 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Item metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h4 className="font-bold text-sm text-gray-900 truncate max-w-[280px]">
                            {item.itemName}
                          </h4>
                          {item.source === 'manual' && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                              ADDED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mb-1.5">
                          <span className="inline-flex items-center bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                            Unit:{' '}
                            <strong className="text-gray-800 ml-1">
                              {item.unitName || '—'}
                            </strong>
                          </span>
                          <span className="inline-flex items-center bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                            Avail Stock:{' '}
                            <strong
                              className={`ml-1 ${
                                Number(
                                  stockMap[item.rawMaterialId || item.itemId || item.id] ??
                                  item.currentstock ??
                                  0
                                ) > 0
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {loadingStock
                                ? '...'
                                : stockMap[item.rawMaterialId || item.itemId || item.id] !== undefined
                                ? Number(stockMap[item.rawMaterialId || item.itemId || item.id]).toFixed(2)
                                : item.availableStock != null
                                ? Number(item.availableStock).toFixed(2)
                                : '0.00'}{' '}
                              {item.uomName || item.unit || ''}
                            </strong>
                          </span>
                        </div>

                        {item.remarks && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate italic max-w-md">
                              Remarks: {item.remarks}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Transfer Qty Input & Remove */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="flex flex-col items-end">
                          <label className="text-[11px] font-semibold text-gray-700 mb-1">
                            Transfer Qty <span className="text-red-500">*</span>
                          </label>
                          <div
                            className={`flex items-center border rounded-xl overflow-hidden focus-within:border-[#084E92] bg-white h-9 w-40 transition ${
                              hasQtyErr ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
                            }`}
                          >
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.transferQuantity}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'e') e.preventDefault();
                              }}
                              placeholder="0"
                              className="w-full h-full px-2.5 text-right font-mono font-bold text-xs text-gray-900 outline-none"
                            />
                            <span className="bg-gray-50 border-l border-gray-200 px-2.5 text-[11px] font-semibold text-gray-500 flex items-center justify-center shrink-0 h-full">
                              {item.uomName || 'Unit'}
                            </span>
                          </div>
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer mt-5"
                            title="Remove from transfer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-4 h-4" />
            )}
            <span>Submit Stock Transfer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
