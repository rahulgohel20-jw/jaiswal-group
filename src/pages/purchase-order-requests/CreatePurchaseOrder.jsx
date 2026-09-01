// ============================================
// File: src/pages/CreatePurchaseOrder.jsx
// ============================================

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Info,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/common/container';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import VendorPriceComparisonModal from './VendorPriceComparisonModal';
import { usePurchaseRequisitions } from '../purchase-requisition/utils/usePurchaseRequisitions';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import {
  getAllActiveVendors,
  getAllVendorOutletMappings,
  getActiveVendorPriceConfigsByDate,
  getVendorPriceConfigsByVendorId,
  getAllRawMaterialItems,
} from '@/services/apiServices';
import {
  getUserIdFromToken,
  getUsernameFromToken,
  getOrgIdFromToken,
} from '../../utils/auth';
import { useOrgScope } from '@/hooks/useOrgScope';
import { OrgTypes } from '@/constants/orgTypes';
import { getApiErrorMessage } from '@/utils/toast';
import { PO_STATUS } from './utils/poStatus';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const getTodayForDateInput = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayForApiDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const inputDateToApiDate = (str) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  if (!d || !m || !y) return '';
  return `${d}/${m}/${y}`;
};

const apiDateToInputDate = (str) => {
  if (!str) return '';
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const RawMaterialItemPicker = ({ rawMaterials, alreadyAddedIds, onAdd, loading }) => {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const q = term.trim().toLowerCase();
    return rawMaterials
      .filter((rm) => !alreadyAddedIds.has(String(rm.id)))
      .filter((rm) => {
        if (!q) return true;
        return (
          String(rm.nameEnglish || '').toLowerCase().includes(q) ||
          String(rm.itemCode || rm.code || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [rawMaterials, term, alreadyAddedIds]);

  const handleSelect = (item) => {
    onAdd(item);
    setTerm('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading items...' : 'Search raw material by name or code...'}
          disabled={loading}
          className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-sm outline-none focus:border-[#084E92] focus:bg-white transition"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-[#E2E8F0] rounded-xl shadow-lg">
          {matches.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">
              No matching items found.
            </div>
          ) : (
            matches.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/60 transition border-b border-gray-50 last:border-b-0 cursor-pointer"
              >
                <span className="text-sm font-semibold text-[#084E92] truncate">
                  {item.nameEnglish}
                </span>
                <span className="text-xs font-semibold text-gray-600 shrink-0">
                  {item.supplierRate != null ? `₹${item.supplierRate}` : '—'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, required }) => (
  <div>
    <label className="text-sm text-[#475569] mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center text-sm text-[#1E293B]">
      {value || '—'}
    </div>
  </div>
);

const CreatePurchaseOrder = () => {
  const location = useLocation();
  const { state } = location;
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const poPerms = usePagePermissions('Purchase Order Requests');
  const approvalPerms = usePagePermissions('Approve Purchase Order');

  const { current: pr, loading: prLoading, error: prError, fetchById } = usePurchaseRequisitions();
  const {
    current: poRecord,
    fetchById: fetchPoById,
    create,
    update,
    loading: poSaving,
    error: poSaveError,
  } = usePurchaseOrders();

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const [rowSelection, setRowSelection] = useState({});
  const [quotationItem, setQuotationItem] = useState(null);

  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  const [rawMaterials, setRawMaterials] = useState([]);
  const [rawMaterialsLoading, setRawMaterialsLoading] = useState(false);
  const [itemPickError, setItemPickError] = useState('');
  const [manualItems, setManualItems] = useState([]);
  const [deletedRawMaterialIds, setDeletedRawMaterialIds] = useState(new Set());

  const [vendorMap, setVendorMap] = useState({});
  const [poQtyMap, setPoQtyMap] = useState({});
  const [priceMap, setPriceMap] = useState({});
  const [itemRemarksMap, setItemRemarksMap] = useState({});
  const [commonVendorId, setCommonVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poDate, setPoDate] = useState(getTodayForDateInput());
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const {
    loading: outletsLoading,
    orgType,
    units: outlets, // [{ id, name, code }]
    selectedUnitId: orgScopeOutletId,
  } = useOrgScope();

  const hasOutletDropdownAccess = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;
  const [selectedOutletId, setSelectedOutletId] = useState(
    state?.outletId != null ? String(state.outletId) : '',
  );

  const isEditRoute = location.pathname.includes('/edit-purchase-order') || !!routeId;
  const isEditingExistingPo = isEditRoute && !state?.isCopyPr;
  const targetPoId = isEditingExistingPo ? (routeId || state?.id) : null;
  const isCopyPr = !!state?.isCopyPr;
  const isGeneratePo = Boolean(
    state?.isGeneratePo ||
    (state?.stage === 'PR_NO_PO' && !state?.isCopyPr && !isEditingExistingPo),
  );

    // Set by PurchaseOrderApproval.jsx's navigate() call:
  //  - 'approve' -> actionable review, shows an Approve button
  //  - 'reject'  -> actionable review, shows a Reject button, remarks required
  // undefined -> normal create / continue-draft flow (Save Draft / Generate)
  const reviewMode = state?.reviewMode; // 'approve' | 'reject' | undefined
  const isApproveMode = reviewMode === 'approve';
  const isRejectMode = reviewMode === 'reject';
  const isReviewMode = isApproveMode || isRejectMode;

  const currentPerms = isReviewMode ? approvalPerms : poPerms;
  const canView = currentPerms.canView;
  const canAdd = currentPerms.canAdd;
  const canEdit = currentPerms.canEdit;
  const canDelete = currentPerms.canDelete;

  const isExistingInProgress =
    poRecord?.rawStatus === PO_STATUS.IN_PROGRESS ||
    state?.rawStatus === PO_STATUS.IN_PROGRESS ||
    state?.status === 'IN_PROGRESS';
  const canPerformAction = isEditingExistingPo ? canEdit : canAdd;
  const isReadOnly = isReviewMode ? (!canEdit || isRejectMode) : !canPerformAction;

  useEffect(() => {
    if (!selectedOutletId && orgScopeOutletId) {
      setSelectedOutletId(String(orgScopeOutletId));
    }
  }, [selectedOutletId, orgScopeOutletId]);

  useEffect(() => {
    if (poRecord?.outletId && !selectedOutletId) {
      setSelectedOutletId(String(poRecord.outletId));
    }
  }, [poRecord?.outletId, selectedOutletId]);



  useEffect(() => {
    if (isEditingExistingPo && targetPoId) {
      fetchPoById(targetPoId);
    }
  }, [isEditingExistingPo, targetPoId, fetchPoById]);

  useEffect(() => {
    const prTargetId =
      state?.prId ||
      state?.purchaseRequisitionId ||
      poRecord?.purchaseRequisitionId ||
      poRecord?.prId ||
      (!isEditingExistingPo ? state?.id : undefined);

    if (prTargetId && !pr) {
      fetchById(prTargetId);
    }
  }, [state?.prId, state?.purchaseRequisitionId, state?.id, isEditingExistingPo, poRecord?.purchaseRequisitionId, poRecord?.prId, pr, fetchById]);

  useEffect(() => {
    if (isEditingExistingPo || !pr?.details) return;
    setPoQtyMap((prev) => {
      const next = { ...prev };
      pr.details.forEach((d) => {
        if (next[d.rawMaterialId] === undefined) next[d.rawMaterialId] = d.quantity;
      });
      return next;
    });
    setItemRemarksMap((prev) => {
      const next = { ...prev };
      pr.details.forEach((d) => {
        if (next[d.rawMaterialId] === undefined && d.remarks) {
          next[d.rawMaterialId] = d.remarks;
        }
      });
      return next;
    });
  }, [pr, isEditingExistingPo]);

  useEffect(() => {
    if (!isEditingExistingPo || !poRecord) return;
    if (poRecord.poDate) setPoDate(apiDateToInputDate(poRecord.poDate));
    if (poRecord.expectedDeliveryDate) {
      setExpectedDeliveryDate(apiDateToInputDate(poRecord.expectedDeliveryDate));
    }
    if (poRecord.remarks) setRemarks(poRecord.remarks);

    const qtyNext = {};
    const priceNext = {};
    const vendorNext = {};
    const remarksNext = {};
    (poRecord.details || []).forEach((d) => {
      // normalizePo renames the API's `orderedQuantity` to `quantity` on
      // the flattened detail object — read `d.quantity`, not
      // `d.orderedQuantity` (which is always undefined).
      qtyNext[d.rawMaterialId] = d.quantity;
      priceNext[d.rawMaterialId] = d.unitPrice;
      if (d.vendorId) vendorNext[d.rawMaterialId] = d.vendorId;
      if (d.remarks) remarksNext[d.rawMaterialId] = d.remarks;
    });
    setPoQtyMap((prev) => ({ ...prev, ...qtyNext }));
    setPriceMap((prev) => ({ ...prev, ...priceNext }));
    setVendorMap((prev) => ({ ...prev, ...vendorNext }));
    setItemRemarksMap((prev) => ({ ...prev, ...remarksNext }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poRecord, isEditingExistingPo]);

  const [vendorOutletMappings, setVendorOutletMappings] = useState([]);

  const loadVendorOutletMappings = useCallback(async () => {
    try {
      const res = await getAllVendorOutletMappings();
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      setVendorOutletMappings(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load vendor outlet mappings', err);
    }
  }, []);

  useEffect(() => {
    loadVendorOutletMappings();
  }, [loadVendorOutletMappings]);

  useEffect(() => {
    (async () => {
      setVendorsLoading(true);
      try {
        const res = await getAllActiveVendors();
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = (Array.isArray(raw) ? raw : []).map((v) => {
          const personName = (v.fullName || v.vendorName || v.name || '').trim();
          const companyName = (v.companyName || v.companyNameEnglish || v.tradeName || v.gstRegisteredName || '').trim();

          let displayName = companyName;
          if (companyName && personName && companyName.toLowerCase() !== personName.toLowerCase()) {
            displayName = `${companyName} (${personName})`;
          } else {
            displayName = companyName || personName || `Vendor #${v.id}`;
          }

          return {
            id: v.id,
            name: displayName,
            personName,
            companyName,
          };
        });
        setVendors(list);
      } catch (err) {
        console.error('Failed to load vendors', err);
      } finally {
        setVendorsLoading(false);
      }
    })();
  }, []);

  const activeOutletId =
    selectedOutletId ||
    (poRecord?.outletId != null ? String(poRecord.outletId) : '') ||
    (pr?.outletId != null ? String(pr.outletId) : '') ||
    (state?.outletId != null ? String(state.outletId) : '') ||
    (orgScopeOutletId != null ? String(orgScopeOutletId) : '');

  const mappedVendors = useMemo(() => {
    if (!activeOutletId || !vendorOutletMappings.length) return vendors;
    const mappedVendorIds = new Set(
      vendorOutletMappings
        .filter((m) => String(m.outletId) === String(activeOutletId))
        .map((m) => Number(m.vendorId)),
    );
    const filtered = vendors.filter((v) => mappedVendorIds.has(Number(v.id)));
    return filtered.length > 0 ? filtered : vendors;
  }, [vendors, vendorOutletMappings, activeOutletId]);

  const fetchAndSetPriceForVendor = useCallback(async (rawMaterialId, vendorId) => {
    if (!rawMaterialId || !vendorId) return;
    try {
      const res = await getVendorPriceConfigsByVendorId(Number(vendorId));
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const configs = Array.isArray(raw) ? raw : [];
      const matched = configs.find((c) => Number(c.rawMaterialId) === Number(rawMaterialId));
      setPriceMap((prev) => ({
        ...prev,
        [rawMaterialId]: matched?.price != null ? matched.price : '',
      }));
    } catch (err) {
      console.error('Failed to fetch vendor price config', err);
    }
  }, []);

  const handleVendorChange = (rawMaterialId, vendorId) => {
    setVendorMap((prev) => ({
      ...prev,
      [rawMaterialId]: vendorId,
    }));
    if (vendorId) {
      fetchAndSetPriceForVendor(rawMaterialId, vendorId);
    } else {
      setPriceMap((prev) => ({
        ...prev,
        [rawMaterialId]: '',
      }));
    }
  };

  useEffect(() => {
    (async () => {
      setRawMaterialsLoading(true);
      try {
        const res = await getAllRawMaterialItems(0, 0, true, '', '', '');
        setRawMaterials(res?.data?.data?.['Raw Material Details'] || []);
      } catch (err) {
        console.error('Failed to load raw materials', err);
      } finally {
        setRawMaterialsLoading(false);
      }
    })();
  }, []);

  const applyCommonVendorToChecked = async (vendorId, selection, rows) => {
    if (!vendorId) return;
    const selectedIndexes = Object.keys(selection).filter((k) => selection[k]);
    if (selectedIndexes.length === 0) return;

    const targetRows = selectedIndexes.map((idx) => rows[Number(idx)]).filter(Boolean);
    if (targetRows.length === 0) return;

    // Set vendor for all checked items
    setVendorMap((prev) => {
      const next = { ...prev };
      targetRows.forEach((item) => {
        if (item?.rawMaterialId) next[item.rawMaterialId] = vendorId;
      });
      return next;
    });

    // Fetch all price configs for this vendor and set prices for checked items
    try {
      const res = await getVendorPriceConfigsByVendorId(Number(vendorId));
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const configs = Array.isArray(raw) ? raw : [];
      const priceLookup = {};
      configs.forEach((c) => {
        if (c?.rawMaterialId != null && c.price != null) {
          priceLookup[Number(c.rawMaterialId)] = c.price;
        }
      });

      setPriceMap((prev) => {
        const next = { ...prev };
        targetRows.forEach((item) => {
          if (item?.rawMaterialId) {
            next[item.rawMaterialId] = priceLookup[Number(item.rawMaterialId)] ?? '';
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch vendor price configs for checked items', err);
    }
  };

  const handleAddRawMaterialItem = (item) => {
    const uomId = item.unitId ?? item.unit?.id ?? 0;
    const uomName = item.unit?.nameEnglish || item.unitName || '';

    if (!uomId || !uomName) {
      setItemPickError(
        `"${item.nameEnglish}" has no unit configured and can't be added. Set a unit on the item first.`,
      );
      return;
    }
    setItemPickError('');

    // If previously removed, un-delete it
    setDeletedRawMaterialIds((prev) => {
      const next = new Set(prev);
      next.delete(String(item.id));
      return next;
    });

    const inBaseline = (isEditingExistingPo ? poRecord?.details : pr?.details)?.some(
      (d) => String(d.rawMaterialId) === String(item.id),
    );

    if (!inBaseline) {
      setManualItems((prev) => {
        if (prev.some((m) => String(m.rawMaterialId) === String(item.id))) return prev;
        return [
          ...prev,
          {
            rawMaterialId: item.id,
            itemName: item.nameEnglish,
            unit: uomName,
            uomId,
            uomName,
          },
        ];
      });
    }

    setPoQtyMap((prev) => ({ ...prev, [item.id]: prev[item.id] || 1 }));
    if (item.supplierRate != null) {
      setPriceMap((prev) => ({ ...prev, [item.id]: prev[item.id] ?? item.supplierRate }));
    }
  };

  const handleRemoveItem = (rawMaterialId) => {
    setDeletedRawMaterialIds((prev) => {
      const next = new Set(prev);
      next.add(String(rawMaterialId));
      return next;
    });
    setManualItems((prev) => prev.filter((m) => String(m.rawMaterialId) !== String(rawMaterialId)));
    setPoQtyMap((prev) => {
      const next = { ...prev };
      delete next[rawMaterialId];
      return next;
    });
    setPriceMap((prev) => {
      const next = { ...prev };
      delete next[rawMaterialId];
      return next;
    });
    setVendorMap((prev) => {
      const next = { ...prev };
      delete next[rawMaterialId];
      return next;
    });
  };

  const openQuotationModal = async (item) => {
    const enteredQty = poQtyMap[item.rawMaterialId];
    const currentQty =
      enteredQty !== undefined && enteredQty !== ''
        ? enteredQty
        : (item.approvedQty ?? item.quantity ?? null);

    setQuotationItem({
      ...item,
      quantity: currentQty,
      approvedQty: currentQty,
      outletId: activeOutletId ? Number(activeOutletId) : undefined,
    });
    setQuotations([]);
    setQuotationsLoading(true);
    try {
      const targetOrgId = activeOutletId ? Number(activeOutletId) : getOrgIdFromToken();
      const res = await getActiveVendorPriceConfigsByDate({
        isNullConsidered: false,
        organizationId: targetOrgId,
        rawMaterialId: item.rawMaterialId,
        targetDate: getTodayForApiDate(),
      });
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const mappedVendorIds = new Set(
        vendorOutletMappings
          .filter((m) => String(m.outletId) === String(activeOutletId))
          .map((m) => Number(m.vendorId)),
      );
      const list = (Array.isArray(raw) ? raw : []).map((c) => ({
        id: c.id,
        vendorId: c.vendorId,
        vendorName: c.vendorName ?? `Vendor #${c.vendorId}`,
        vendorCode: c.vendorCode ?? null,
        vendorCompanyName: c.vendorCompanyName ?? null,
        price: c.price ?? 0,
        isMapped: !!c.isMapped || mappedVendorIds.has(Number(c.vendorId)),
      }));
      setQuotations(list);
    } catch (err) {
      console.error('Failed to load vendor price configs', err);
      setQuotations([]);
    } finally {
      setQuotationsLoading(false);
    }
  };

  const closeQuotationModal = () => {
    setQuotationItem(null);
    setQuotations([]);
  };

  const handleSelectPrice = (quotation, item) => {
    setPriceMap((prev) => ({
      ...prev,
      [item.rawMaterialId]: quotation.price,
    }));
    if (quotation.vendorId) {
      setVendorMap((prev) => ({
        ...prev,
        [item.rawMaterialId]: quotation.vendorId,
      }));
    }
    if (quotation.quantity !== undefined && quotation.quantity !== '' && !isNaN(Number(quotation.quantity))) {
      setPoQtyMap((prev) => ({
        ...prev,
        [item.rawMaterialId]: Number(quotation.quantity),
      }));
    }
    closeQuotationModal();
  };

  const purchaseItems = useMemo(() => {
    const baseline = isEditingExistingPo
      ? (poRecord?.details || []).map((d, idx) => ({
          rawMaterialId: d.rawMaterialId,
          prDetailId: d.prDetailId != null ? Number(d.prDetailId) : (d.id != null ? Number(d.id) : null),
          srNo: String(idx + 1).padStart(2, '0'),
          itemName: d.rawMaterialName,
          unit: d.uomName,
          uomId: d.uomId,
          uomName: d.uomName,
          approvedQty: d.quantity,
          remarks: d.remarks || '',
          source: 'pr',
        }))
      : (pr?.details || []).map((d, idx) => ({
          rawMaterialId: d.rawMaterialId,
          prDetailId: d.id != null ? Number(d.id) : (d.prDetailId != null ? Number(d.prDetailId) : null),
          srNo: String(idx + 1).padStart(2, '0'),
          itemName: d.rawMaterialName,
          unit: d.uomName,
          uomId: d.uomId,
          uomName: d.uomName,
          approvedQty: d.quantity ?? d.orderedQuantity,
          remarks: d.remarks || '',
          source: 'pr',
        }));
    const fromManual = manualItems.map((m, idx) => ({
      rawMaterialId: m.rawMaterialId,
      prDetailId: null,
      srNo: String(baseline.length + idx + 1).padStart(2, '0'),
      itemName: m.itemName,
      unit: m.unit,
      uomId: m.uomId,
      uomName: m.uomName,
      approvedQty: null,
      remarks: m.remarks || '',
      source: 'manual',
    }));
    return [...baseline, ...fromManual]
      .filter((item) => !deletedRawMaterialIds.has(String(item.rawMaterialId)))
      .map((item, idx) => ({
        ...item,
        srNo: String(idx + 1).padStart(2, '0'),
      }));
  }, [pr, poRecord, isEditingExistingPo, manualItems, deletedRawMaterialIds]);

  const alreadyAddedIds = useMemo(
    () => new Set(purchaseItems.map((item) => String(item.rawMaterialId))),
    [purchaseItems],
  );

  const includedItems = purchaseItems.filter(
    (item) => poQtyMap[item.rawMaterialId] !== undefined && poQtyMap[item.rawMaterialId] !== '',
  );

  const getPurchaseRequisitionId = () => {
    const rawId =
      state?.purchaseRequisitionId ??
      state?.prId ??
      poRecord?.purchaseRequisitionId ??
      poRecord?.prId ??
      pr?.id ??
      (!isEditingExistingPo ? state?.id : undefined);
    return rawId ? Number(rawId) || rawId : undefined;
  };

  const buildSinglePayload = (status) => {
    const reqId = getPurchaseRequisitionId();
    const outletId = Number(selectedOutletId) || pr?.outletId || poRecord?.outletId || state?.outletId;
    const formattedPoDate = inputDateToApiDate(poDate);
    const formattedExpectedDate = inputDateToApiDate(expectedDeliveryDate);
    const userId = getUserIdFromToken();
    const actionBy = getUsernameFromToken();
    const firstVendorId = Object.values(vendorMap).find(Boolean) || commonVendorId || poRecord?.vendorId;

    // Line items inserted vendor-wise (ordered by vendorId)
    const details = [...includedItems]
      .map((item) => {
        const itemVendorId = vendorMap[item.rawMaterialId] || commonVendorId || firstVendorId;
        const vendorObj = vendors.find((v) => String(v.id) === String(itemVendorId));
        return {
          uomId: item.uomId,
          uomName: item.uomName,
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: item.itemName,
          quantity: Number(poQtyMap[item.rawMaterialId]),
          unitPrice: Number(priceMap[item.rawMaterialId]) || 0,
          vendorId: itemVendorId ? Number(itemVendorId) : undefined,
          vendorName: vendorObj?.name ?? item.vendorName ?? '',
          orderedQuantity: Number(poQtyMap[item.rawMaterialId]),
          receivedQuantity: 0,
          tax: 0,
          prDetailId: item.prDetailId != null ? Number(item.prDetailId) : null,
          remarks: itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? '',
        };
      })
      .sort((a, b) => (Number(a.vendorId) || 0) - (Number(b.vendorId) || 0));

    return {
      purchaseRequisitionId: reqId,
      prId: reqId,
      outletId,
      poDate: formattedPoDate,
      expectedDeliveryDate: formattedExpectedDate,
      remarks,
      vendorId: firstVendorId ? Number(firstVendorId) : undefined,
      status,
      userId,
      actionBy,
      details,
    };
  };

  const validateForm = () => {
    const activeOutletId = Number(selectedOutletId) || pr?.outletId || poRecord?.outletId || state?.outletId;
    if (!activeOutletId) {
      setSubmitError('Please select an outlet.');
      return false;
    }
    if (!poDate) {
      setSubmitError('PO Date is required.');
      return false;
    }
    if (!expectedDeliveryDate) {
      setSubmitError('Expected Delivery Date is required.');
      return false;
    }
    if (poDate && expectedDeliveryDate && expectedDeliveryDate < poDate) {
      setSubmitError('Expected Delivery Date cannot be less than PO Date.');
      return false;
    }
    if (includedItems.length === 0) {
      setSubmitError('Please include at least one item with a valid quantity.');
      return false;
    }
    for (const item of includedItems) {
      const qty = Number(poQtyMap[item.rawMaterialId]);
      if (qty === undefined || qty === null || qty <= 0 || isNaN(qty)) {
        setSubmitError(`Please enter a valid quantity greater than 0 for "${item.itemName}".`);
        return false;
      }
      const vendorId = vendorMap[item.rawMaterialId] || commonVendorId;
      if (!vendorId) {
        setSubmitError(`Please select a vendor for "${item.itemName}".`);
        return false;
      }
    }
    setSubmitError('');
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const currentRawStatus = poRecord?.rawStatus || state?.rawStatus;
      const targetStatus = currentRawStatus === PO_STATUS.IN_PROGRESS ? PO_STATUS.IN_PROGRESS : PO_STATUS.PENDING;
      const payload = buildSinglePayload(targetStatus);
      if (isEditingExistingPo && targetPoId) {
        await update(targetPoId, payload);
      } else {
        await create(payload);
      }
      navigate(-1);
    } catch (err) {
      console.error(err);
      setSubmitError(getApiErrorMessage(err, 'Failed to save purchase order draft.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildSinglePayload(PO_STATUS.SENT_FOR_APPROVAL);
      if (isEditingExistingPo && targetPoId) {
        await update(targetPoId, payload);
      } else {
        await create(payload);
      }
      navigate('/purchase-order-request/purchase');
    } catch (err) {
      console.error(err);
      setSubmitError(getApiErrorMessage(err, 'Failed to generate purchase order.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve/Reject/Save-in-progress reuse the same update() call as Save Draft/Generate —
  // only the target status (and, for reject, the required remarks) differ.
  const handleSaveInProgress = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildSinglePayload(PO_STATUS.IN_PROGRESS);
      if (targetPoId) {
        await update(targetPoId, payload);
      }
      navigate(-1);
    } catch (err) {
      console.error(err);
      setSubmitError(getApiErrorMessage(err, 'Failed to save purchase order progress.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePO = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildSinglePayload(PO_STATUS.APPROVED);
      if (targetPoId) {
        await update(targetPoId, payload);
      }
      navigate(-1);
    } catch (err) {
      console.error(err);
      setSubmitError(getApiErrorMessage(err, 'Failed to approve purchase order.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRejectConfirm = () => {
    if (!remarks.trim()) {
      setRemarksError('Add a reason for rejecting this purchase order.');
      return;
    }
    setRemarksError('');
    setShowRejectModal(true);
  };

  const handleRejectPO = async () => {
    if (!remarks.trim()) {
      setRemarksError('Add a reason for rejecting this purchase order.');
      setShowRejectModal(false);
      return;
    }
    setRemarksError('');
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildSinglePayload(PO_STATUS.REJECTED);
      if (targetPoId) {
        await update(targetPoId, payload);
      }
      setShowRejectModal(false);
      navigate(-1);
    } catch (err) {
      console.error(err);
      setSubmitError(getApiErrorMessage(err, 'Failed to reject purchase order.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedTotal = includedItems.reduce((sum, item) => {
    const qty = Number(poQtyMap[item.rawMaterialId]) || 0;
    const price = Number(priceMap[item.rawMaterialId]) || 0;
    return sum + qty * price;
  }, 0);

  // Approval Date isn't a field the PR or PO APIs return today — there's no
  // "date approved" property in either response shape. updatedAt is the
  // closest proxy (it does get bumped on the approve action) but it also
  // changes on any edit, so treat this as best-effort display, not a source
  // of truth, until the backend exposes a real approvedAt field.
  const approvalDateDisplay =
    poRecord?.rawStatus === PO_STATUS.APPROVED ? poRecord?.updatedAt : '';

  const isSaving = poSaving || isSubmitting;

  if (!canView) {
    return <AccessDenied pageTitle={isReviewMode ? "Approve Purchase Order" : "Purchase Order Requests"} />;
  }

  if (!isEditingExistingPo && !canAdd && !isReviewMode) {
    return <AccessDenied pageTitle="Purchase Order Requests" />;
  }

  return (
    <Container>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase Order Request</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            {isRejectMode
              ? 'Reject Purchase Order'
              : isApproveMode && !isExistingInProgress
                ? 'Approve Purchase Order'
                : isEditingExistingPo
                  ? 'Edit Purchase Order'
                  : 'Create Purchase Order'}
          </span>
        </div>

        <div className="my-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            {isRejectMode
              ? 'Reject Purchase Order'
              : isApproveMode && !isExistingInProgress
                ? 'Approve Purchase Order'
                : isEditingExistingPo
                  ? 'Edit Purchase Order'
                  : 'Create Purchase Order'}
          </h1>
          <p className="text-sm text-[#737781] mt-1">
            {isRejectMode
              ? 'Review the purchase order details and provide rejection remarks.'
              : isReviewMode && !isExistingInProgress
                ? 'Review the purchase order details before submitting your decision.'
                : isEditingExistingPo
                  ? 'Update purchase order line items, pricing, vendor assignment, and details.'
                  : 'Review requisition details and finalize the purchase order for vendor submission.'}
          </p>
        </div>

        {prError && isGeneratePo && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {prError?.message || 'Failed to load the source purchase requisition.'}
          </div>
        )}

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-[#0B5CAD]" />
              <h2 className="text-xl font-semibold text-[#1E293B]">Purchase Order Information</h2>
            </div>
          </div>
          <div className="p-6">
            {isGeneratePo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field
                    label="PO Code"
                    value={poRecord?.poCode || state?.poCode || 'TO BE GENERATED'}
                  />
                  <Field label="PR Code" value={pr?.prCode ?? state?.prCode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <Field label="PR Date" value={pr?.date ?? state?.date} />
                  <Field label="Approval Date" value={approvalDateDisplay} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <Field label="Outlet Name" value={pr?.outlet ?? poRecord?.outlet ?? state?.outlet} />
                  <Field label="PR Approved By" value={pr?.updatedBy} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={poDate || getTodayForDateInput()}
                      disabled
                      readOnly
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Expected Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      min={poDate || getTodayForDateInput()}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={isRejectMode}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={commonVendorId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCommonVendorId(v);
                            if (v) applyCommonVendorToChecked(v, rowSelection, purchaseItems);
                          }}
                          disabled={vendorsLoading || isRejectMode}
                          className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 bg-white outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                        >
                          <option value="">
                            {vendorsLoading ? 'Loading vendors...' : 'Select vendor...'}
                          </option>
                          {mappedVendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                      {!isRejectMode && (
                        <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                          <Plus size={18} className="text-[#0B5CAD]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : isEditingExistingPo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field
                    label="PO Code"
                    value={poRecord?.poCode || state?.poCode || 'TO BE GENERATED'}
                  />
                  <Field label="Outlet Name" value={pr?.outlet ?? poRecord?.outlet ?? state?.outlet} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={poDate || getTodayForDateInput()}
                      disabled
                      readOnly
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Expected Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      min={poDate || getTodayForDateInput()}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={commonVendorId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCommonVendorId(v);
                            if (v) applyCommonVendorToChecked(v, rowSelection, purchaseItems);
                          }}
                          disabled={vendorsLoading || isReadOnly}
                          className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 bg-white outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                        >
                          <option value="">
                            {vendorsLoading ? 'Loading vendors...' : 'Select vendor...'}
                          </option>
                          {mappedVendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                      {!isReadOnly && (
                        <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                          <Plus size={18} className="text-[#0B5CAD]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {hasOutletDropdownAccess && (
                    <div>
                      <label className="text-sm text-[#475569] mb-1 block">
                        Outlet <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedOutletId ? String(selectedOutletId) : ''}
                        onChange={(e) => setSelectedOutletId(e.target.value)}
                        disabled={outletsLoading || isReadOnly}
                        className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 bg-white outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                      >
                        <option value="">
                          {outletsLoading ? 'Loading outlets...' : 'Select outlet...'}
                        </option>
                        {outlets.map((o) => (
                          <option key={o.id} value={String(o.id)}>
                            {o.name} {o.code ? `(${o.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={commonVendorId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCommonVendorId(v);
                            if (v) applyCommonVendorToChecked(v, rowSelection, purchaseItems);
                          }}
                          disabled={vendorsLoading || isReadOnly}
                          className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 bg-white outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                        >
                          <option value="">
                            {vendorsLoading ? 'Loading vendors...' : 'Select vendor...'}
                          </option>
                          {mappedVendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                      {!isReadOnly && (
                        <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                          <Plus size={18} className="text-[#0B5CAD]" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={poDate || getTodayForDateInput()}
                      disabled
                      readOnly
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Expected Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      min={poDate || getTodayForDateInput()}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full my-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          {(isEditingExistingPo ? poSaving && !poRecord : prLoading) && (
            <div className="p-4 text-sm text-gray-500 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
              Loading purchase items...
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 border-b border-[#E2E8F0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Purchase Items</h2>
                <p className="text-xs text-gray-500">Select items, assign vendors, and specify quantities</p>
              </div>
            </div>
            {!isReadOnly && (
              <div className="w-full md:w-80">
                <RawMaterialItemPicker
                  rawMaterials={rawMaterials}
                  alreadyAddedIds={alreadyAddedIds}
                  onAdd={handleAddRawMaterialItem}
                  loading={rawMaterialsLoading}
                />
                {itemPickError && (
                  <p className="text-xs text-red-500 mt-1.5">{itemPickError}</p>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold tracking-wider text-[#475569] uppercase">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={purchaseItems.length > 0 && purchaseItems.every((_, idx) => !!rowSelection[idx])}
                      onChange={() => {
                        const allSelected = purchaseItems.length > 0 && purchaseItems.every((_, idx) => !!rowSelection[idx]);
                        if (allSelected) {
                          setRowSelection({});
                        } else {
                          const next = {};
                          purchaseItems.forEach((_, idx) => { next[idx] = true; });
                          setRowSelection(next);
                        }
                      }}
                      className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="py-3.5 px-4 text-left">Item Name</th>
                  <th className="py-3.5 px-4 text-left w-24">Unit</th>
                  <th className="py-3.5 px-4 text-left min-w-[220px]">Vendor Name</th>
                  <th className="py-3.5 px-4 text-center w-28">Quantity</th>
                  <th className="py-3.5 px-4 text-right w-28">Price (₹)</th>
                  <th className="py-3.5 px-4 text-left min-w-[150px]">Remarks</th>
                  <th className="py-3.5 px-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#084E92] mb-3">
                          <Package className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">No purchase items added</p>
                        <p className="text-xs text-gray-400 mt-1">Search and select raw material items above to include them in this purchase order.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseItems.map((item, idx) => {
                    const isSelected = !!rowSelection[idx];
                    return (
                      <tr key={item.rawMaterialId} className={`hover:bg-blue-50/20 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={isSelected}
                            onChange={() => setRowSelection(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openQuotationModal(item)}
                              title="Click to compare vendor prices"
                              className="text-[#084E92] font-semibold hover:underline hover:text-[#063d73] cursor-pointer text-left inline-flex items-center gap-1"
                            >
                              <span>{item.itemName}</span>
                            </button>
                            {item.source === 'manual' && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0B5CAD] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                                Added
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 text-sm">
                          {item.unit || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative max-w-[240px]">
                            <select
                              value={vendorMap[item.rawMaterialId] || ''}
                              onChange={(e) => handleVendorChange(item.rawMaterialId, e.target.value)}
                              disabled={isReadOnly}
                              className="w-full h-9 border border-[#E2E8F0] rounded-lg px-3 pr-8 text-sm text-[#1E293B] appearance-none outline-none bg-white cursor-pointer focus:border-[#084E92] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
                            >
                              <option value="">Select Vendor</option>
                              {mappedVendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={poQtyMap[item.rawMaterialId] ?? ''}
                            onChange={(e) =>
                              setPoQtyMap((prev) => ({
                                ...prev,
                                [item.rawMaterialId]: e.target.value === '' ? '' : Number(e.target.value),
                              }))
                            }
                            disabled={isReadOnly}
                            placeholder="0"
                            className="w-20 h-9 border border-[#E2E8F0] rounded-lg text-center font-medium outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC] disabled:text-[#475467]"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-sm text-gray-800">
                          {priceMap[item.rawMaterialId] != null && priceMap[item.rawMaterialId] !== ''
                            ? `₹${Number(priceMap[item.rawMaterialId]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? ''}
                            onChange={(e) =>
                              setItemRemarksMap((prev) => ({
                                ...prev,
                                [item.rawMaterialId]: e.target.value,
                              }))
                            }
                            disabled={isReadOnly}
                            placeholder="Remarks..."
                            className="w-full min-w-[120px] max-w-[200px] h-9 border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-[#1E293B] outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC]"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.rawMaterialId)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer mx-auto"
                              title="Remove from PO"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4 py-4 px-6 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{purchaseItems.length}</span> item{purchaseItems.length === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-sm flex gap-2">
                <span className="text-gray-500">Total PR Items:</span>
                <p className="font-semibold text-gray-800">{purchaseItems.length}</p>
              </div>
              <div className="text-sm flex gap-2">
                <span className="text-gray-500">PO Items Included:</span>
                <p className="font-semibold text-gray-800">{includedItems.length}</p>
              </div>
              <div className="text-sm flex gap-2 items-center">
                <span className="text-gray-500">Estimated Total:</span>
                <p className="text-xl font-bold text-[#084E92]">₹ {estimatedTotal.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#0B5CAD]" />
              <h2 className="text-sm font-semibold text-[#1E293B]">
                Terms & Delivery Notes {isRejectMode && <span className="text-red-500">*</span>}
              </h2>
            </div>
          </div>
          <div className="p-6">
            <textarea
              rows={4}
              value={remarks}
              disabled={isReadOnly && !isRejectMode}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (remarksError) setRemarksError('');
              }}
              placeholder={
                isRejectMode
                  ? 'Please state the reason for rejecting this purchase order...'
                  : 'Add any specific terms, instructions, or notes for the vendor...'
              }
              className={`w-full p-4 rounded-xl border ${
                remarksError ? 'border-red-400 focus:border-red-500' : 'border-[#E2E8F0] focus:border-[#0B5CAD]'
              } text-sm outline-none resize-none transition disabled:bg-[#F8FAFC]`}
            />
            {remarksError && (
              <p className="text-xs text-red-500 mt-1.5">{remarksError}</p>
            )}
          </div>
        </div>

        {submitError && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#475569] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          {isReviewMode || isExistingInProgress ? (
            <div className="flex gap-3 ml-auto">
              {!isRejectMode && (isApproveMode || isExistingInProgress) && (
                <>
                  <button
                    type="button"
                    disabled={isSaving || isReadOnly}
                    onClick={handleSaveInProgress}
                    className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || isReadOnly}
                    onClick={handleApprovePO}
                    className="px-6 py-2.5 bg-[#14804A] text-white rounded-lg hover:bg-[#106b3d] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                  >
                    {isSaving ? 'Approving...' : 'Approve purchase order'}
                  </button>
                </>
              )}
              {isRejectMode && (
                <button
                  type="button"
                  disabled={isSaving || isReadOnly}
                  onClick={handleOpenRejectConfirm}
                  className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                >
                  {isSaving ? 'Rejecting...' : 'Reject purchase order'}
                </button>
              )}
            </div>
          ) : canPerformAction ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving || isReadOnly}
                onClick={handleSaveDraft}
                className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
              >
                {isSaving ? 'Saving...' : isEditingExistingPo ? 'Save' : 'Generate Purchase Order'}
              </button>
              <button
                type="button"
                disabled={isSaving || isReadOnly}
                onClick={handleGenerate} 
                className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
              >
                {isSaving ? 'Sending...' : 'Sent For Approval'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <VendorPriceComparisonModal
        open={!!quotationItem}
        item={quotationItem}
        quotations={quotations}
        loading={quotationsLoading}
        onClose={closeQuotationModal}
        onSelectPrice={handleSelectPrice}
        outletId={activeOutletId}
        onVendorMapped={async () => {
          await loadVendorOutletMappings();
          if (quotationItem) {
            openQuotationModal(quotationItem);
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={showRejectModal}
        onClose={() => {
          if (!isSubmitting && !poSaving) setShowRejectModal(false);
        }}
        onConfirm={handleRejectPO}
        title="Reject Purchase Order"
        itemLabel={poRecord?.poCode || state?.poCode || (targetPoId ? `PO #${targetPoId}` : 'this purchase order')}
        description="Are you sure you want to reject this purchase order? This action cannot be undone."
        saving={isSubmitting || poSaving}
      />
    </Container>
  );
};

export default CreatePurchaseOrder;