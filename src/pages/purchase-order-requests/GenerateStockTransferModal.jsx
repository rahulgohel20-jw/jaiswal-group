import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  GitFork,
  Info,
  Pencil,
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
  getAllRawMaterialItems,
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

  // Raw materials map (master unit of measurement from getAllRawMaterialItems API)
  const [rawMaterialsMap, setRawMaterialsMap] = useState({});
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false);

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

  // Remarks states (global and item-wise)
  const [remarks, setRemarks] = useState('');
  const [openRemarkRowIds, setOpenRemarkRowIds] = useState({});

  const toggleRemarkInput = (itemId) => {
    setOpenRemarkRowIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleRemarkChange = (itemId, val) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, remarks: val } : it))
    );
  };

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

  // Sync initial items and routing state when modal opens
  useEffect(() => {
    if (isOpen) {
      setItems(
        initialItems.map((item) => {
          const resolvedUnit =
            item.masterUnitName ||
            item.unitName ||
            item.uomName ||
            (typeof item.unit === 'string'
              ? item.unit
              : item.unit?.nameEnglish || item.unit?.symbolEnglish || item.unit?.name) ||
            item.unitSymbol ||
            '';
          const resolvedUnitId =
            item.masterUnitId ||
            item.uomId ||
            item.unitId ||
            (typeof item.unit === 'object' ? item.unit?.id : null) ||
            null;
          return {
            ...item,
            masterUnitName: resolvedUnit,
            masterUnitId: resolvedUnitId,
            unitName: resolvedUnit,
            uomName: resolvedUnit,
            unit: resolvedUnit,
            unitId: resolvedUnitId,
            uomId: resolvedUnitId,
            transferQuantity: item.transferQuantity || item.orderedQty || 1,
            remarks: item.remarks || item.itemRemarks || '',
          };
        })
      );
      setOpenRemarkRowIds({});
      setRemarks('');
      setErrors({});

      // From Outlet is initialized to the outlet for which PO is generated
      if (currentOutletId) {
        setFromOutletId(String(currentOutletId));
      }
      // To Outlet, From Sub-Outlet, and To Sub-Outlet are unselected by default
      setToOutletId('');
      setFromSubOutletId('');
      setToSubOutletId('');
    }
  }, [isOpen, initialItems, currentOutletId]);

  // Load raw material items to get their master UOM definition
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setLoadingRawMaterials(true);
    getAllRawMaterialItems(0, 0, true, '', '', '')
      .then((res) => {
        if (isCancelled) return;
        const raw =
          res?.data?.data?.['Raw Material Details'] ||
          res?.data?.['Raw Material Details'] ||
          res?.data?.data ||
          res?.data ||
          [];
        const list = Array.isArray(raw) ? raw : [];
        const map = {};
        list.forEach((rm) => {
          const uName =
            rm?.unit?.nameEnglish ||
            rm?.unit?.symbolEnglish ||
            (typeof rm?.unit === 'string' ? rm.unit : '') ||
            rm?.unitName ||
            '';
          const uId = rm?.unitId ?? rm?.unit?.id ?? null;
          const entry = {
            name: rm?.nameEnglish || rm?.itemName || rm?.name || '',
            unitName: uName,
            unitId: uId,
          };
          map[rm.id] = entry;
          map[String(rm.id)] = entry;
        });
        setRawMaterialsMap(map);
      })
      .catch((err) => {
        console.warn('Failed to load raw materials in GenerateStockTransferModal:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingRawMaterials(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

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

  // Default fromOutletId based on currentOutletId or user role
  useEffect(() => {
    if (!isOpen) return;

    if (currentOutletId) {
      setFromOutletId(String(currentOutletId));
      return;
    }

    if (isOutletUser) {
      const myOutletId = String(
        effectiveOutletId || getOrgIdFromToken() || scopedUnits[0]?.id || ''
      );
      if (myOutletId) {
        setFromOutletId(myOutletId);
      }
      return;
    }

    if (isCompanyUser && availableFromOutlets.length > 0) {
      if (!fromOutletId || !availableFromOutlets.some((o) => String(o.id) === String(fromOutletId))) {
        setFromOutletId(String(availableFromOutlets[0].id));
      }
      return;
    }

    if (isGroupUser && outlets.length > 0) {
      if (!fromOutletId || !outlets.some((o) => String(o.id) === String(fromOutletId))) {
        setFromOutletId(String(outlets[0].id));
      }
    }
  }, [
    isOpen,
    currentOutletId,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    effectiveOutletId,
    scopedUnits,
    availableFromOutlets,
    outlets,
    fromOutletId,
  ]);

  // Load sub-outlets for "From Outlet" (without auto-selecting first item)
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

  // Load sub-outlets for "To Outlet" (without auto-selecting first item)
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

  // Stable key for item IDs
  const itemIdsKey = useMemo(() => {
    return items
      .map((it) => it.rawMaterialId || it.itemId || it.id)
      .filter(Boolean)
      .join(',');
  }, [items]);

  // Fetch available stock for items at the source ("From Outlet")
  useEffect(() => {
    if (!isOpen || !fromOutletId || !itemIdsKey) {
      setStockMap({});
      return;
    }
    const itemIds = itemIdsKey.split(',').map(Number).filter(Boolean);
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
          const id = s.itemId ?? s.rawMaterialId ?? s.id;
          if (id != null) {
            const stockVal = Number(
              s.currentStock ??
                s.closingStock ??
                s.availableStock ??
                s.stock ??
                s.actualStock ??
                0
            );
            const uName =
              s.unitName ||
              s.unitSymbol ||
              s.uomName ||
              s.unit?.nameEnglish ||
              s.unit?.symbolEnglish ||
              (typeof s.unit === 'string' ? s.unit : '') ||
              '';
            const uId = s.unitId ?? s.uomId ?? s.unit?.id ?? null;
            const entry = { currentStock: stockVal, unitName: uName, unitId: uId };
            map[id] = entry;
            map[String(id)] = entry;
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
  }, [isOpen, fromOutletId, fromSubOutletId, itemIdsKey]);

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
        remarks: remarks.trim() || 'Generated from Purchase Order',
        transferDate: formattedDate,
        isDraft: false,
        items: items.map((it) => {
          const rawItemId = Number(it.rawMaterialId || it.itemId || it.id || 0);
          const rmEntry = rawMaterialsMap[rawItemId] || rawMaterialsMap[String(rawItemId)];
          const stockEntry = stockMap[rawItemId] || stockMap[String(rawItemId)];
          const resolvedUnitId = Number(
            rmEntry?.unitId ||
              it.masterUnitId ||
              (typeof stockEntry === 'object' && stockEntry?.unitId ? stockEntry.unitId : 0) ||
              it.unitId ||
              it.uomId ||
              0
          );
          return {
            id: rawItemId,
            itemId: rawItemId,
            itemType: 'RAW_MATERIAL',
            unitId: resolvedUnitId,
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
                  From Sub-Outlet <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
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
                  To Sub-Outlet <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
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

              {/* Remarks (Global) */}
              <div className={isOutletUser ? 'md:col-span-3' : 'md:col-span-2'}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Remarks / Notes (Global)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes, reason or transport reference..."
                  className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-xs text-gray-800 bg-white outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400"
                />
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
                  const rawId = item.rawMaterialId || item.itemId || item.id;
                  const rmInfo = rawMaterialsMap[rawId] || rawMaterialsMap[String(rawId)];
                  const stockInfo = stockMap[rawId] || stockMap[String(rawId)];
                  const unitDisplay =
                    rmInfo?.unitName ||
                    item.masterUnitName ||
                    (typeof stockInfo === 'object' && stockInfo?.unitName ? stockInfo.unitName : '') ||
                    item.unitName ||
                    item.uomName ||
                    (typeof item.unit === 'string'
                      ? item.unit
                      : item.unit?.nameEnglish || item.unit?.symbolEnglish || item.unit?.name) ||
                    item.unitSymbol ||
                    'Units';

                  const currentStockNum =
                    stockInfo !== undefined && stockInfo !== null
                      ? (typeof stockInfo === 'object' ? stockInfo.currentStock : Number(stockInfo))
                      : item.availableStock != null
                      ? Number(item.availableStock)
                      : item.currentstock != null
                      ? Number(item.currentstock)
                      : item.currentStock != null
                      ? Number(item.currentStock)
                      : null;

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
                          <button
                            type="button"
                            onClick={() => toggleRemarkInput(item.id)}
                            className={`p-1 rounded-md transition cursor-pointer flex-shrink-0 ${
                              openRemarkRowIds[item.id] || (item.remarks && item.remarks.trim())
                                ? 'text-[#084E92] bg-blue-50 hover:bg-blue-100'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={openRemarkRowIds[item.id] ? 'Hide remarks' : 'Add / edit item remarks'}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mb-1.5">
                          <span className="inline-flex items-center bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                            Unit:{' '}
                            <strong className="text-gray-800 ml-1">
                              {unitDisplay}
                            </strong>
                          </span>
                          <span className="inline-flex items-center bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                            Avail Stock:{' '}
                            <strong
                              className={`ml-1 ${
                                (currentStockNum ?? 0) > 0
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {loadingStock
                                ? '...'
                                : currentStockNum !== null && !isNaN(currentStockNum)
                                ? Number(currentStockNum).toFixed(2)
                                : '0.00'}{' '}
                              {unitDisplay}
                            </strong>
                          </span>
                        </div>

                        {openRemarkRowIds[item.id] && (
                          <div className="mt-1.5 max-w-md">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                              placeholder="Item remarks / specifications..."
                              className="h-7 w-full border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 font-normal"
                              autoFocus
                            />
                          </div>
                        )}
                        {!openRemarkRowIds[item.id] && item.remarks && item.remarks.trim() && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate italic max-w-md" title={item.remarks}>
                              Note: {item.remarks}
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
                              {unitDisplay}
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
