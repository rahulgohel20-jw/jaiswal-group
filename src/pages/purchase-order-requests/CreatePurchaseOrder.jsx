// ============================================
// File: src/pages/CreatePurchaseOrder.jsx
// ============================================

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Info,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import VendorPriceComparisonModal from './VendorPriceComparisonModal';
import { usePurchaseRequisitions } from '../purchase-requisition/utils/usePurchaseRequisitions';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import {
  getAllActiveVendors,
  getAllVendorOutletMappings,
  getActiveVendorPriceConfigsByDate,
  getAllRawMaterialItems,
} from '@/services/apiServices';
import {
  getUserIdFromToken,
  getUsernameFromToken,
  getOrgIdFromToken,
} from '../../utils/auth';
import { useOrgScope } from '@/hooks/useOrgScope';
import { OrgTypes } from '@/constants/orgTypes';
import { PO_STATUS } from './utils/poStatus';

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
    <div ref={wrapperRef} className="relative max-w-md">
      <label className="text-sm text-[#475569] mb-1 block">Add Raw Material Item</label>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading items...' : 'Search item by name or code...'}
          disabled={loading}
          className="w-full h-11 rounded-lg border border-[#E2E8F0] pl-9 pr-3 text-sm outline-none focus:border-[#0B5CAD]"
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

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
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

  useEffect(() => {
    if (!isEditingExistingPo && !isGeneratePo && !selectedOutletId && orgScopeOutletId) {
      setSelectedOutletId(String(orgScopeOutletId));
    }
  }, [isEditingExistingPo, isGeneratePo, selectedOutletId, orgScopeOutletId]);

  useEffect(() => {
    if (poRecord?.outletId && !selectedOutletId) {
      setSelectedOutletId(String(poRecord.outletId));
    }
  }, [poRecord?.outletId, selectedOutletId]);

  // Set by PurchaseOrderApproval.jsx's navigate() call:
  //  - 'approve' -> actionable review, shows an Approve button
  //  - 'reject'  -> actionable review, shows a Reject button, remarks required
  // undefined -> normal create / continue-draft flow (Save Draft / Generate)
  const reviewMode = state?.reviewMode; // 'approve' | 'reject' | undefined
  const isApproveMode = reviewMode === 'approve';
  const isRejectMode = reviewMode === 'reject';
  const isReviewMode = isApproveMode || isRejectMode;
  const isExistingInProgress =
    poRecord?.rawStatus === PO_STATUS.IN_PROGRESS ||
    state?.rawStatus === PO_STATUS.IN_PROGRESS ||
    state?.status === 'IN_PROGRESS';

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
    (poRecord.details || []).forEach((d) => {
      // normalizePo renames the API's `orderedQuantity` to `quantity` on
      // the flattened detail object — read `d.quantity`, not
      // `d.orderedQuantity` (which is always undefined).
      qtyNext[d.rawMaterialId] = d.quantity;
      priceNext[d.rawMaterialId] = d.unitPrice;
      if (d.vendorId) vendorNext[d.rawMaterialId] = d.vendorId;
    });
    setPoQtyMap((prev) => ({ ...prev, ...qtyNext }));
    setPriceMap((prev) => ({ ...prev, ...priceNext }));
    setVendorMap((prev) => ({ ...prev, ...vendorNext }));
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
        const list = (Array.isArray(raw) ? raw : []).map((v) => ({
          id: v.id,
          name: v.name ?? v.vendorName ?? v.companyName ?? `Vendor #${v.id}`,
        }));
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
      const res = await getActiveVendorPriceConfigsByDate({
        isNullConsidered: false,
        organizationId: getOrgIdFromToken(),
        rawMaterialId: Number(rawMaterialId),
        targetDate: getTodayForApiDate(),
      });
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const configs = Array.isArray(raw) ? raw : [];
      const matched = configs.find((c) => Number(c.vendorId) === Number(vendorId));
      if (matched && matched.price != null) {
        setPriceMap((prev) => ({
          ...prev,
          [rawMaterialId]: matched.price,
        }));
      }
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

  const applyCommonVendorToChecked = (vendorId, selection, rows) => {
    if (!vendorId) return;
    const selectedIndexes = Object.keys(selection).filter((k) => selection[k]);
    const targetRows = selectedIndexes.length > 0
      ? selectedIndexes.map((idx) => rows[Number(idx)]).filter(Boolean)
      : rows;

    setVendorMap((prev) => {
      const next = { ...prev };
      targetRows.forEach((item) => {
        if (item?.rawMaterialId) next[item.rawMaterialId] = vendorId;
      });
      return next;
    });

    targetRows.forEach((item) => {
      if (item?.rawMaterialId) {
        fetchAndSetPriceForVendor(item.rawMaterialId, vendorId);
      }
    });
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
    setQuotationItem(item);
    setQuotations([]);
    setQuotationsLoading(true);
    try {
      const res = await getActiveVendorPriceConfigsByDate({
        isNullConsidered: false,
        organizationId: getOrgIdFromToken(),
        rawMaterialId: item.rawMaterialId,
        targetDate: getTodayForApiDate(),
      });
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const list = (Array.isArray(raw) ? raw : []).map((c) => ({
        id: c.id,
        vendorId: c.vendorId,
        vendorName: c.vendorName ?? `Vendor #${c.vendorId}`,
        vendorCode: c.vendorCode ?? null,
        vendorCompanyName: c.vendorCompanyName ?? null,
        price: c.price ?? 0,
        isMapped: !!c.isMapped,
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

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer"
          />
        ),
        size: 44,
        enableSorting: false,
      },
      {
        accessorKey: 'itemName',
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-semibold my-3" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openQuotationModal(row.original)}
              title="View vendor price comparison"
              className="text-[#084E92] font-medium underline underline-offset-2 hover:text-[#063d73] cursor-pointer text-left"
            >
              {row.original.itemName}
            </button>
            {row.original.source === 'manual' && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0B5CAD] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                Added
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'unit',
        header: ({ column }) => (
          <DataGridColumnHeader title="UNIT" column={column} className="text-[#43474F] font-semibold my-3" />
        ),
        size: 90,
      },
      {
        id: 'vendorName',
        header: ({ column }) => (
          <DataGridColumnHeader title="VENDOR NAME" column={column} className="text-[#43474F] font-semibold my-3" />
        ),
        cell: ({ row }) => (
          <div className="relative">
            <select
              value={vendorMap[row.original.rawMaterialId] || ''}
              onChange={(e) =>
                handleVendorChange(row.original.rawMaterialId, e.target.value)
              }
              disabled={isRejectMode}
              className="w-full max-w-[140px] h-9 border border-[#E2E8F0] rounded-lg px-3 text-sm text-[#1E293B] appearance-none outline-none bg-white cursor-pointer disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
            >
              <option value="">Select</option>
              {mappedVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ),
        size: 170,
      },
      {
        id: 'quantity',
        header: ({ column }) => (
          <DataGridColumnHeader title="QUANTITY" column={column} className="text-[#43474F] font-semibold my-3" />
        ),
        cell: ({ row }) => (
          <input
            type="number"
            value={poQtyMap[row.original.rawMaterialId] ?? ''}
            onChange={(e) =>
              setPoQtyMap((prev) => ({
                ...prev,
                [row.original.rawMaterialId]: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            disabled={isRejectMode}
            className="w-20 h-9 border rounded-lg text-center outline-none disabled:bg-[#F8FAFC] disabled:text-[#475467]"
          />
        ),
      },
      {
        id: 'price',
        header: ({ column }) => (
          <DataGridColumnHeader title="PRICE" column={column} className="text-[#43474F] font-semibold my-3" />
        ),
        cell: ({ row }) => (
          <input
            type="number"
            value={priceMap[row.original.rawMaterialId] ?? ''}
            readOnly
            disabled
            placeholder="—"
            className="w-24 h-9 border border-[#E2E8F0] bg-[#F8FAFC] text-[#475467] rounded-lg text-center outline-none cursor-not-allowed"
          />
        ),
        size: 100,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTION" column={column} className="text-[#43474F] font-semibold" />
        ),
        cell: ({ row }) =>
          isRejectMode ? null : (
            <button
              type="button"
              onClick={() => handleRemoveItem(row.original.rawMaterialId)}
              className="cursor-pointer"
              title="Remove from PO"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          ),
        size: 90,
      },
    ],
    [vendors, vendorMap, poQtyMap, priceMap, isReviewMode, isRejectMode],
  );

  const table = useReactTable({
    data: purchaseItems,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

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
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save purchase order draft.');
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
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to generate purchase order.');
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
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save purchase order progress.');
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
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to approve purchase order.');
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
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to reject purchase order.');
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
                      value={poDate}
                      min={getTodayForDateInput()}
                      onChange={(e) => {
                        const newPoDate = e.target.value;
                        setPoDate(newPoDate);
                        if (expectedDeliveryDate && newPoDate && expectedDeliveryDate < newPoDate) {
                          setExpectedDeliveryDate(newPoDate);
                        }
                      }}
                      disabled={isRejectMode}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
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
                      value={poDate}
                      min={getTodayForDateInput()}
                      onChange={(e) => {
                        const newPoDate = e.target.value;
                        setPoDate(newPoDate);
                        if (expectedDeliveryDate && newPoDate && expectedDeliveryDate < newPoDate) {
                          setExpectedDeliveryDate(newPoDate);
                        }
                      }}
                      disabled={isRejectMode}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD] disabled:bg-[#F8FAFC]"
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
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      Outlet <span className="text-red-500">*</span>
                    </label>
                    {hasOutletDropdownAccess ? (
                      <select
                        value={selectedOutletId ? String(selectedOutletId) : ''}
                        onChange={(e) => setSelectedOutletId(e.target.value)}
                        disabled={outletsLoading}
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
                    ) : (
                      <div className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center text-sm text-[#1E293B]">
                        {outletsLoading
                          ? 'Loading...'
                          : outlets.find((o) => String(o.id) === String(selectedOutletId))?.name || outlets[0]?.name || '—'}
                      </div>
                    )}
                  </div>
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
                          disabled={vendorsLoading}
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
                      <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                        <Plus size={18} className="text-[#0B5CAD]" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm text-[#475569] mb-1 block">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={poDate}
                      min={getTodayForDateInput()}
                      onChange={(e) => {
                        const newPoDate = e.target.value;
                        setPoDate(newPoDate);
                        if (expectedDeliveryDate && newPoDate && expectedDeliveryDate < newPoDate) {
                          setExpectedDeliveryDate(newPoDate);
                        }
                      }}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD]"
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
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD]"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {(isEditingExistingPo ? poSaving && !poRecord : prLoading) && (
            <p className="p-4 text-sm text-gray-500">Loading purchase items...</p>
          )}
          <div className="flex flex-col gap-4 px-3 py-6 border-b">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2 items-center text-[#084E92]">
                <ClipboardList />
                <h1 className="text-2xl font-semibold text-black">Purchase Items</h1>
              </div>
            </div>
            {!isRejectMode && (
              <div>
                <RawMaterialItemPicker
                  rawMaterials={rawMaterials}
                  alreadyAddedIds={alreadyAddedIds}
                  onAdd={handleAddRawMaterialItem}
                  loading={rawMaterialsLoading}
                />
                {itemPickError && (
                  <p className="text-xs text-red-500 mt-2">{itemPickError}</p>
                )}
              </div>
            )}
          </div>
          <DataGrid table={table} recordCount={purchaseItems.length}>
            <Card className="rounded-t-none border-t-0">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] ">
                <DataGridPagination />
              </CardFooter>
            </Card>
          </DataGrid>
          <div className="flex justify-end gap-8 py-4 px-6 border-t bg-[#F8FAFC] items-center">
            <div className="text-sm flex gap-2">
              <span className="text-gray-500">Total PR Items</span>
              <p className="font-semibold">{purchaseItems.length}</p>
            </div>
            <div className="text-sm flex gap-2">
              <span className="text-gray-500">PO Items Included</span>
              <p className="font-semibold">{includedItems.length}</p>
            </div>
            <div className="text-sm flex gap-2 items-center">
              <span className="text-gray-500">Estimated Total Value:</span>
              <p className="text-xl font-bold text-[#084E92]">₹ {estimatedTotal.toLocaleString('en-IN')}</p>
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
              rows={3}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (remarksError) setRemarksError('');
              }}
              placeholder={
                isRejectMode
                  ? 'Explain why this purchase order is being rejected...'
                  : 'Add specific Remarks/Instructions'
              }
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 resize-none outline-none focus:border-[#0B5CAD] focus:ring-2 focus:ring-[#DBEAFE]"
            />
            {remarksError && <p className="text-xs text-red-500 mt-2">{remarksError}</p>}
          </div>
        </div>

        {(submitError || poSaveError) && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {submitError || poSaveError}
          </div>
        )}

        <div className="flex justify-between items-center mt-8 border-t py-5">
          {isReviewMode || isExistingInProgress ? (
            <div className="flex gap-3 ml-auto">
              {!isRejectMode && (isApproveMode || isExistingInProgress) && (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveInProgress}
                    className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
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
                  disabled={isSaving}
                  onClick={handleOpenRejectConfirm}
                  className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                >
                  {isSaving ? 'Rejecting...' : 'Reject purchase order'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDraft}
                className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Generate Purchase Order'}
              </button>
            </div>
          )}
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
        onVendorMapped={() => loadVendorOutletMappings()}
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