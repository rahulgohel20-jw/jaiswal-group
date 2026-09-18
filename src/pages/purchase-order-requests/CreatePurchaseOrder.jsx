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
  PlusCircle,
  Search,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Truck,
  Pencil,
  AlertTriangle,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import VendorPriceComparisonModal from './VendorPriceComparisonModal';
import VendorChangeConfirmModal from './VendorChangeConfirmModal';
import { GenerateStockTransferModal } from './GenerateStockTransferModal';
import { usePurchaseRequisitions } from '../purchase-requisition/utils/usePurchaseRequisitions';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import {
  checkIsInterState,
  numberToWords,
  formatCurrency,
} from './utils/taxUtils';
import {
  getAllActiveVendors,
  getAllVendorOutletMappings,
  getActiveVendorPriceConfigsByDate,
  getVendorPriceConfigsByVendorId,
  getAllRawMaterialItems,
  getVendorById,
  getCompanyById,
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
  const [uomMap, setUomMap] = useState({});
  const [priceMap, setPriceMap] = useState({});
  const [hsnMap, setHsnMap] = useState({});
  const [gstMap, setGstMap] = useState({});
  const [cessMap, setCessMap] = useState({});
  const [itemRemarksMap, setItemRemarksMap] = useState({});
  const [openRemarksMap, setOpenRemarksMap] = useState({});
  const toggleItemRemarks = (id) => setOpenRemarksMap((prev) => ({ ...prev, [id]: !prev[id] }));
  const [commonVendorId, setCommonVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poDate, setPoDate] = useState(getTodayForDateInput());
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingVendorId, setPendingVendorId] = useState(null);
  const [showVendorChangeModal, setShowVendorChangeModal] = useState(false);
  const [isSwitchingVendor, setIsSwitchingVendor] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [rowSelection, setRowSelection] = useState({});
  const [showStockTransferModal, setShowStockTransferModal] = useState(false);

  const [otherCosts, setOtherCosts] = useState(() => {
    const initial = poRecord?.otherCosts || state?.otherCosts;
    if (Array.isArray(initial) && initial.length > 0) {
      return initial.map((c, i) => ({
        id: c.id || Date.now() + i,
        label: c.label || '',
        cost: c.cost !== undefined && c.cost !== null ? String(c.cost) : '',
      }));
    }
    return [{ id: Date.now(), label: '', cost: '' }];
  });

  const handleAddOtherCost = () => {
    setOtherCosts((prev) => [...prev, { id: Date.now() + Math.random(), label: '', cost: '' }]);
  };

  const handleRemoveOtherCost = (id) => {
    setOtherCosts((prev) => {
      if (prev.length <= 1) {
        return [{ id: Date.now(), label: '', cost: '' }];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleOtherCostChange = (id, field, value) => {
    setOtherCosts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalOtherCosts = useMemo(() => {
    return otherCosts.reduce((sum, item) => {
      const val = Number(item.cost);
      return sum + (!isNaN(val) && val > 0 ? val : 0);
    }, 0);
  }, [otherCosts]);

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

  // NOTE: activeOutletId must be declared here, before any effect that
  // references it (directly or in a dependency array) — dependency arrays
  // are evaluated during render, at the useEffect() call site itself, so
  // referencing activeOutletId before this declaration throws
  // "Cannot access 'activeOutletId' before initialization" (TDZ).
  const activeOutletId =
    selectedOutletId ||
    (poRecord?.outletId != null ? String(poRecord.outletId) : '') ||
    (pr?.outletId != null ? String(pr.outletId) : '') ||
    (state?.outletId != null ? String(state.outletId) : '') ||
    (orgScopeOutletId != null ? String(orgScopeOutletId) : '');

  const isEditRoute = location.pathname.includes('/edit-purchase-order') || !!routeId;
  const isEditingExistingPo = isEditRoute && !state?.isCopyPr;
  const targetPoId = isEditingExistingPo ? (routeId || state?.id) : null;
  const isCopyPr = !!state?.isCopyPr;
  const isGeneratePo = Boolean(
    state?.isGeneratePo ||
    (state?.stage === 'PR_NO_PO' && !state?.isCopyPr && !isEditingExistingPo),
  );
  const isSingleVendorPo = !isGeneratePo && (isEditingExistingPo || Boolean(state?.reviewMode) || Boolean(poRecord?.id && (poRecord?.vendorId || poRecord?.billTo)));

  const [fetchedBillTo, setFetchedBillTo] = useState(null);
  const [fetchedShipTo, setFetchedShipTo] = useState(null);

  const billTo = fetchedBillTo || poRecord?.billTo || state?.billTo || null;
  const shipTo = fetchedShipTo || poRecord?.shipTo || state?.shipTo || null;
  const isInterState = useMemo(() => checkIsInterState(billTo, shipTo), [billTo, shipTo]);

  // Fetch vendor address if billTo is not directly provided on poRecord/state
  useEffect(() => {
    if (poRecord?.billTo || state?.billTo) return;
    const vendorId = commonVendorId || poRecord?.vendorId || state?.vendorId || Object.values(vendorMap).find(Boolean);
    if (!vendorId) {
      setFetchedBillTo(null);
      return;
    }
    let isCancelled = false;
    getVendorById(vendorId)
      .then((res) => {
        if (isCancelled) return;
        const v = res?.data?.data ?? res?.data;
        if (v) {
          setFetchedBillTo({
            vendorId: v.id,
            vendorName: v.name || v.vendorName,
            isGstApplicable:
              v.isGstApplicable !== undefined && v.isGstApplicable !== null
                ? Boolean(v.isGstApplicable)
                : false,
            addressLine1: v.addressLine1 || v.address,
            addressLine2: v.addressLine2,
            cityName: v.cityName || v.city,
            stateId: v.stateId,
            stateName: v.stateName || v.state,
            countryName: v.countryName || v.country,
            pincode: v.pincode,
            phoneNumber: v.phoneNumber || v.phone,
            gstNumber: v.gstNumber || v.gstin,
            panNumber: v.panNumber || v.pan,
          });
        }
      })
      .catch(() => {
        if (!isCancelled) setFetchedBillTo(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [poRecord?.billTo, state?.billTo, commonVendorId, poRecord?.vendorId, state?.vendorId, vendorMap]);

  // Fetch outlet address if shipTo is not directly provided on poRecord/state
  useEffect(() => {
    if (poRecord?.shipTo || state?.shipTo) return;
    const outletId = activeOutletId || selectedOutletId || poRecord?.outletId || state?.outletId || pr?.outletId;
    if (!outletId) {
      setFetchedShipTo(null);
      return;
    }
    let isCancelled = false;
    getCompanyById(outletId)
      .then((res) => {
        if (isCancelled) return;
        const c = res?.data?.data ?? res?.data;
        if (c) {
          setFetchedShipTo({
            id: c.id,
            companyNameEnglish: c.companyNameEnglish || c.name,
            companyCode: c.companyCode || c.code,
            addressEnglish: c.addressEnglish || c.address,
            addressline2: c.addressline2,
            cityName: c.cityName || c.city,
            stateId: c.stateId,
            stateName: c.stateName || c.state,
            countryName: c.countryName || c.country,
            pincode: c.pincode,
            mobilenumber: c.mobilenumber || c.phone,
            emailid: c.emailid || c.email,
            gstNumber: c.gstNumber,
            panNumber: c.panNumber,
          });
        }
      })
      .catch(() => {
        if (!isCancelled) setFetchedShipTo(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [poRecord?.shipTo, state?.shipTo, activeOutletId, selectedOutletId, poRecord?.outletId, state?.outletId, pr?.outletId]);

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
    setUomMap((prev) => {
      const next = { ...prev };
      pr.details.forEach((d) => {
        if (next[d.rawMaterialId] === undefined && (d.uomId || d.uomName)) {
          next[d.rawMaterialId] = { uomId: d.uomId, uomName: d.uomName };
        }
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
    const uomNext = {};
    const priceNext = {};
    const vendorNext = {};
    const remarksNext = {};
    const hsnNext = {};
    const gstNext = {};
    const cessNext = {};

    (poRecord.details || []).forEach((d) => {
      // normalizePo renames the API's `orderedQuantity` to `quantity` on
      // the flattened detail object — read `d.quantity`, not
      // `d.orderedQuantity` (which is always undefined).
      qtyNext[d.rawMaterialId] = d.quantity;
      if (d.uomId || d.uomName) {
        uomNext[d.rawMaterialId] = { uomId: d.uomId, uomName: d.uomName };
      }
      priceNext[d.rawMaterialId] = d.unitPrice;
      if (d.vendorId) vendorNext[d.rawMaterialId] = d.vendorId;
      if (d.remarks) remarksNext[d.rawMaterialId] = d.remarks;
      if (d.hsnCode) hsnNext[d.rawMaterialId] = d.hsnCode;
      if (d.cess != null && d.cess !== '') cessNext[d.rawMaterialId] = Number(d.cess);

      const hasCgst = d.cgst != null && Number(d.cgst) > 0;
      const hasSgst = d.sgst != null && Number(d.sgst) > 0;
      const hasIgst = d.igst != null && Number(d.igst) > 0;
      const hasTax = d.tax != null && Number(d.tax) > 0;

      if (hasIgst) gstNext[d.rawMaterialId] = Number(d.igst);
      else if (hasCgst && hasSgst) gstNext[d.rawMaterialId] = Number(d.cgst) + Number(d.sgst);
      else if (hasCgst) gstNext[d.rawMaterialId] = Number(d.cgst) * 2;
      else if (hasTax) gstNext[d.rawMaterialId] = Number(d.tax);
      else gstNext[d.rawMaterialId] = 18;
    });
    setPoQtyMap((prev) => ({ ...prev, ...qtyNext }));
    setUomMap((prev) => ({ ...prev, ...uomNext }));
    setPriceMap((prev) => ({ ...prev, ...priceNext }));
    setVendorMap((prev) => ({ ...prev, ...vendorNext }));
    setItemRemarksMap((prev) => ({ ...prev, ...remarksNext }));
    setHsnMap((prev) => ({ ...prev, ...hsnNext }));
    setGstMap((prev) => ({ ...prev, ...gstNext }));
    setCessMap((prev) => ({ ...prev, ...cessNext }));
    if (poRecord.otherCosts && Array.isArray(poRecord.otherCosts) && poRecord.otherCosts.length > 0) {
      setOtherCosts(
        poRecord.otherCosts.map((c, i) => ({
          id: c.id || Date.now() + i,
          label: c.label || '',
          cost: c.cost !== undefined && c.cost !== null ? String(c.cost) : '',
        }))
      );
    }
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
            isGstApplicable:
              v.isGstApplicable !== undefined && v.isGstApplicable !== null
                ? Boolean(v.isGstApplicable)
                : false,
            gstNumber: v.gstNumber || v.gstin || '',
            rawVendor: v,
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

  const activeVendorObj = useMemo(() => {
    const targetId =
      commonVendorId ||
      poRecord?.vendorId ||
      state?.vendorId ||
      billTo?.vendorId ||
      Object.values(vendorMap).find(Boolean);
    if (!targetId) return null;
    return vendors.find((v) => String(v.id) === String(targetId)) || null;
  }, [vendors, commonVendorId, poRecord?.vendorId, state?.vendorId, billTo?.vendorId, vendorMap]);

  const isGstApplicable = useMemo(() => {
    // 1. From matched active vendor in getAllActiveVendors()
    if (activeVendorObj && activeVendorObj.isGstApplicable !== undefined && activeVendorObj.isGstApplicable !== null) {
      return Boolean(activeVendorObj.isGstApplicable);
    }
    // 2. Directly from getbyid response (poRecord.isGstApplicable)
    if (poRecord && poRecord.isGstApplicable !== undefined && poRecord.isGstApplicable !== null) {
      return Boolean(poRecord.isGstApplicable);
    }
    // 3. From billTo or route state
    if (billTo && billTo.isGstApplicable !== undefined && billTo.isGstApplicable !== null) {
      return Boolean(billTo.isGstApplicable);
    }
    if (state && state.isGstApplicable !== undefined && state.isGstApplicable !== null) {
      return Boolean(state.isGstApplicable);
    }
    return false;
  }, [activeVendorObj, poRecord, billTo, state]);

  const handleVendorChange = async (rawMaterialId, vendorId) => {
    if (!vendorId) {
      setVendorMap((prev) => {
        const next = { ...prev };
        delete next[rawMaterialId];
        return next;
      });
      setPriceMap((prev) => ({
        ...prev,
        [rawMaterialId]: '',
      }));
      return;
    }

    const vendorObj = vendors.find((v) => String(v.id) === String(vendorId));
    const vendorName = vendorObj?.name || 'Selected Vendor';
    const item = purchaseItems.find((i) => String(i.rawMaterialId) === String(rawMaterialId));
    const itemName = item?.itemName || 'this item';

    try {
      const res = await getVendorPriceConfigsByVendorId(Number(vendorId));
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const configs = Array.isArray(raw) ? raw : [];
      const matched = configs.find((c) => Number(c.rawMaterialId) === Number(rawMaterialId));

      setVendorMap((prev) => ({
        ...prev,
        [rawMaterialId]: vendorId,
      }));
      setPriceMap((prev) => ({
        ...prev,
        [rawMaterialId]: matched?.price != null ? matched.price : 0,
      }));
    } catch (err) {
      console.error('Failed to fetch vendor price for raw material', err);
      setVendorMap((prev) => ({
        ...prev,
        [rawMaterialId]: vendorId,
      }));
      setPriceMap((prev) => ({
        ...prev,
        [rawMaterialId]: 0,
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

  const handleGlobalVendorChange = (vendorId) => {
    if (!vendorId) {
      setCommonVendorId('');
      return;
    }

    if (isSingleVendorPo) {
      // In single vendor PO, trigger confirmation modal before switching vendor
      const currentVendorId = commonVendorId || poRecord?.vendorId || state?.vendorId || '';
      if (String(vendorId) === String(currentVendorId)) return;
      setPendingVendorId(vendorId);
      setShowVendorChangeModal(true);
    } else {
      // In pre-generation multi-vendor mode, apply directly to checked items
      setCommonVendorId(vendorId);
      applyCommonVendorToChecked(vendorId, rowSelection, purchaseItems);
    }
  };

  const handleConfirmVendorChange = async () => {
    if (!pendingVendorId) return;
    setIsSwitchingVendor(true);
    try {
      await applyVendorSwitch(pendingVendorId);
      setShowVendorChangeModal(false);
      setPendingVendorId(null);
    } finally {
      setIsSwitchingVendor(false);
    }
  };

  const applyVendorSwitch = async (vendorId) => {
    const vendorObj = vendors.find((v) => String(v.id) === String(vendorId));
    const vendorName = vendorObj?.name || 'Selected Vendor';

    let configs = [];
    try {
      const res = await getVendorPriceConfigsByVendorId(Number(vendorId));
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      configs = Array.isArray(raw) ? raw : [];
    } catch (err) {
      console.error('Failed to fetch vendor price configs', err);
    }

    const priceLookup = {};
    configs.forEach((c) => {
      if (c?.rawMaterialId != null && c.price != null) {
        priceLookup[Number(c.rawMaterialId)] = c.price;
      }
    });

    // All items are supplied with new vendor:
    setCommonVendorId(vendorId);

    setVendorMap((prev) => {
      const next = { ...prev };
      purchaseItems.forEach((item) => {
        if (item?.rawMaterialId) {
          next[item.rawMaterialId] = vendorId;
        }
      });
      return next;
    });

    setPriceMap((prev) => {
      const next = { ...prev };
      purchaseItems.forEach((item) => {
        if (item?.rawMaterialId) {
          next[item.rawMaterialId] = priceLookup[Number(item.rawMaterialId)] != null ? priceLookup[Number(item.rawMaterialId)] : 0;
        }
      });
      return next;
    });

    // Fetch new vendor's address and check state against outlet
    try {
      const vendorRes = await getVendorById(Number(vendorId));
      const v = vendorRes?.data?.data ?? vendorRes?.data;
      if (v) {
        const newBillTo = {
          vendorId: v.id,
          vendorName: v.name || v.vendorName,
          isGstApplicable:
            v.isGstApplicable !== undefined && v.isGstApplicable !== null
              ? Boolean(v.isGstApplicable)
              : false,
          addressLine1: v.addressLine1 || v.address,
          addressLine2: v.addressLine2,
          cityName: v.cityName || v.city,
          stateId: v.stateId,
          stateName: v.stateName || v.state,
          countryName: v.countryName || v.country,
          pincode: v.pincode,
          phoneNumber: v.phoneNumber || v.phone,
          gstNumber: v.gstNumber || v.gstin,
          panNumber: v.panNumber || v.pan,
        };
        setFetchedBillTo(newBillTo);

        // Get outlet address if not present
        const outletId = activeOutletId || selectedOutletId || poRecord?.outletId || state?.outletId || pr?.outletId;
        let currentShipTo = shipTo;
        if (!currentShipTo && outletId) {
          const companyRes = await getCompanyById(Number(outletId));
          const c = companyRes?.data?.data ?? companyRes?.data;
          if (c) {
            currentShipTo = {
              id: c.id,
              companyNameEnglish: c.companyNameEnglish || c.name,
              cityName: c.cityName || c.city,
              stateId: c.stateId,
              stateName: c.stateName || c.state,
            };
            setFetchedShipTo(currentShipTo);
          }
        }

        // Check if Inter-State (vendor state != outlet state)
        const isNewInterState = checkIsInterState(newBillTo, currentShipTo);

        // Update tax fields accordingly:
        purchaseItems.forEach((item) => {
          const defaultTax = item.tax != null && Number(item.tax) > 0 ? Number(item.tax) : 18;
          setGstMap((prev) => ({ ...prev, [item.rawMaterialId]: prev[item.rawMaterialId] ?? defaultTax }));
        });

        toast.success(`Vendor switched to ${vendorName}. Prices and tax rates recalculated.`);
      }
    } catch (err) {
      console.error('Failed to fetch new vendor details', err);
      toast.error('Failed to fetch vendor details.');
    }
  };

  const applyCommonVendorToChecked = async (vendorId, selection, rows, passedConfigs = null, passedVendorName = null) => {
    if (!vendorId) return;
    const selectedIndexes = Object.keys(selection).filter((k) => selection[k]);
    if (selectedIndexes.length === 0) return;

    const targetRows = selectedIndexes.map((idx) => rows[Number(idx)]).filter(Boolean);
    if (targetRows.length === 0) return;

    const vendorObj = vendors.find((v) => String(v.id) === String(vendorId));
    const vendorName = passedVendorName || vendorObj?.name || 'Selected Vendor';

    let configs = passedConfigs;
    if (!configs) {
      try {
        const res = await getVendorPriceConfigsByVendorId(Number(vendorId));
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        configs = Array.isArray(raw) ? raw : [];
      } catch (err) {
        console.error('Failed to fetch vendor price configs for checked items', err);
        configs = [];
      }
    }

    const priceLookup = {};
    configs.forEach((c) => {
      if (c?.rawMaterialId != null && c.price != null) {
        priceLookup[Number(c.rawMaterialId)] = c.price;
      }
    });

    // Set vendor for target items
    setVendorMap((prev) => {
      const next = { ...prev };
      targetRows.forEach((item) => {
        if (item?.rawMaterialId) {
          next[item.rawMaterialId] = vendorId;
        }
      });
      return next;
    });

    // Set price from config or 0 if vendor is not supplier
    setPriceMap((prev) => {
      const next = { ...prev };
      targetRows.forEach((item) => {
        if (item?.rawMaterialId) {
          next[item.rawMaterialId] = priceLookup[Number(item.rawMaterialId)] != null ? priceLookup[Number(item.rawMaterialId)] : 0;
        }
      });
      return next;
    });
  };

  const handleAddRawMaterialItem = async (item) => {
    const uomId = item.unitId ?? item.unit?.id ?? 0;
    const uomName = item.unit?.nameEnglish || item.unit?.symbolEnglish || item.unitName || '';

    if (!uomId || !uomName) {
      setItemPickError(
        `"${item.nameEnglish}" has no unit configured and can't be added. Set a unit on the item first.`,
      );
      return;
    }
    setItemPickError('');

    setUomMap((prev) => ({
      ...prev,
      [item.id]: { uomId, uomName },
    }));

    // If single-vendor PO, assign the PO's vendor to this new item if supplied
    const targetVendor = isSingleVendorPo
      ? (commonVendorId || poRecord?.vendorId || state?.vendorId || '')
      : (commonVendorId || '');

    let vendorAssigned = targetVendor;
    let initialPrice = item.supplierRate ?? '';

    if (targetVendor) {
      const vendorObj = vendors.find((v) => String(v.id) === String(targetVendor));
      const vendorName = vendorObj?.name || 'Selected Vendor';
      try {
        const res = await getVendorPriceConfigsByVendorId(Number(targetVendor));
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const configs = Array.isArray(raw) ? raw : [];
        const matched = configs.find((c) => Number(c.rawMaterialId) === Number(item.id));
        initialPrice = matched?.price != null ? matched.price : (item.supplierRate ?? 0);
      } catch (err) {
        console.error('Failed to verify vendor config for added item', err);
        initialPrice = 0;
      }
    }

    if (vendorAssigned) {
      setVendorMap((prev) => ({ ...prev, [item.id]: String(vendorAssigned) }));
    }

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
            vendorId: vendorAssigned || null,
          },
        ];
      });
    }

    setPoQtyMap((prev) => ({ ...prev, [item.id]: prev[item.id] || 1 }));
    setPriceMap((prev) => ({ ...prev, [item.id]: prev[item.id] ?? initialPrice }));
    if (item.hsnCode) {
      setHsnMap((prev) => ({ ...prev, [item.id]: prev[item.id] ?? item.hsnCode }));
    }
    const itemTax = item.tax != null && item.tax !== '' ? Number(item.tax) : 18;
    setGstMap((prev) => ({ ...prev, [item.id]: prev[item.id] ?? itemTax }));
    setCessMap((prev) => ({ ...prev, [item.id]: prev[item.id] ?? (item.cess != null && item.cess !== '' ? Number(item.cess) : 0) }));
  };

  const handleUnitChange = (rawMaterialId, selectedUnitId) => {
    const rm = rawMaterials.find((r) => r.id === rawMaterialId);
    const allowedList = Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
      ? rm.allowedUnits
      : (rm?.unit ? [rm.unit] : []);
    const selected = allowedList.find((u) => String(u.id) === String(selectedUnitId));
    if (selected) {
      const uName = selected.nameEnglish || selected.symbolEnglish || `Unit #${selected.id}`;
      setUomMap((prev) => ({
        ...prev,
        [rawMaterialId]: { uomId: Number(selected.id), uomName: uName },
      }));
    } else if (selectedUnitId) {
      setUomMap((prev) => ({
        ...prev,
        [rawMaterialId]: { uomId: Number(selectedUnitId), uomName: prev[rawMaterialId]?.uomName || '' },
      }));
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
    setUomMap((prev) => {
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
    setHsnMap((prev) => {
      const next = { ...prev };
      delete next[rawMaterialId];
      return next;
    });
    setGstMap((prev) => {
      const next = { ...prev };
      delete next[rawMaterialId];
      return next;
    });
    setCessMap((prev) => {
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

  // Synchronize HSN, CESS and Tax rates from loaded rawMaterials
  useEffect(() => {
    if (!rawMaterials.length || !purchaseItems.length) return;
    const rmMap = {};
    rawMaterials.forEach((rm) => {
      rmMap[rm.id] = rm;
    });

    setHsnMap((prev) => {
      const next = { ...prev };
      purchaseItems.forEach((item) => {
        if (next[item.rawMaterialId] === undefined) {
          const rm = rmMap[item.rawMaterialId];
          if (rm?.hsnCode) next[item.rawMaterialId] = rm.hsnCode;
        }
      });
      return next;
    });

    setCessMap((prev) => {
      const next = { ...prev };
      purchaseItems.forEach((item) => {
        if (next[item.rawMaterialId] === undefined) {
          const rm = rmMap[item.rawMaterialId];
          next[item.rawMaterialId] = rm?.cess != null && rm.cess !== '' ? Number(rm.cess) : 0;
        }
      });
      return next;
    });

    setGstMap((prev) => {
      const next = { ...prev };
      purchaseItems.forEach((item) => {
        if (next[item.rawMaterialId] === undefined) {
          const rm = rmMap[item.rawMaterialId];
          const rmTax = rm?.tax != null && rm.tax !== '' ? Number(rm.tax) : 18;
          next[item.rawMaterialId] = rmTax;
        }
      });
      return next;
    });
  }, [rawMaterials, purchaseItems]);

  const alreadyAddedIds = useMemo(
    () => new Set(purchaseItems.map((item) => String(item.rawMaterialId))),
    [purchaseItems],
  );

  const selectedItemsForTransfer = useMemo(() => {
    return purchaseItems
      .filter((_, idx) => Boolean(rowSelection[idx]))
      .map((item) => {
        const uom = uomMap[item.rawMaterialId] || {
          uomId: item.uomId,
          uomName: item.uomName || item.unit || 'Unit',
        };
        const vId =
          vendorMap[item.rawMaterialId] ||
          (isSingleVendorPo ? (commonVendorId || poRecord?.vendorId || state?.vendorId || '') : '') ||
          commonVendorId ||
          '';
        const vObj = mappedVendors.find((v) => String(v.id) === String(vId));
        const vName = vObj?.name || item.vendorName || (vId ? `Vendor #${vId}` : 'No vendor assigned');
        const remarks = itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? '';
        const currentQty = Number(poQtyMap[item.rawMaterialId]) || 1;

        return {
          id: item.rawMaterialId,
          rawMaterialId: item.rawMaterialId,
          itemName: item.itemName,
          source: item.source,
          uomId: uom.uomId,
          uomName: uom.uomName,
          vendorId: vId,
          vendorName: vName,
          remarks: remarks,
          orderedQty: currentQty,
          transferQuantity: currentQty,
        };
      });
  }, [
    purchaseItems,
    rowSelection,
    uomMap,
    vendorMap,
    isSingleVendorPo,
    commonVendorId,
    poRecord?.vendorId,
    state?.vendorId,
    mappedVendors,
    itemRemarksMap,
    poQtyMap,
  ]);

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

  const calculatedTotals = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCESS = 0;

    const itemCalculations = {};
    const taxRateGroups = {};

    includedItems.forEach((item) => {
      const qty = Number(poQtyMap[item.rawMaterialId]) || 0;
      const price = Number(priceMap[item.rawMaterialId]) || 0;
      const taxable = qty * price;
      totalTaxable += taxable;

      const cessPct =
        isGstApplicable && cessMap[item.rawMaterialId] !== undefined && cessMap[item.rawMaterialId] !== ''
          ? Number(cessMap[item.rawMaterialId])
          : 0;
      const cessAmt = (taxable * cessPct) / 100;
      totalCESS += cessAmt;

      const gstPct =
        isGstApplicable && gstMap[item.rawMaterialId] !== undefined && gstMap[item.rawMaterialId] !== ''
          ? Number(gstMap[item.rawMaterialId])
          : (isGstApplicable ? 18 : 0);

      let itemTax = 0;
      let cgstPct = 0;
      let sgstPct = 0;
      let igstPct = 0;
      let cgstAmt = 0;
      let sgstAmt = 0;
      let igstAmt = 0;
      let gstAmt = 0;

      if (isGstApplicable) {
        if (isInterState) {
          igstPct = gstPct;
          igstAmt = (taxable * igstPct) / 100;
          gstAmt = igstAmt;
          totalIGST += igstAmt;
        } else {
          cgstPct = gstPct / 2;
          sgstPct = gstPct / 2;
          cgstAmt = (taxable * cgstPct) / 100;
          sgstAmt = (taxable * sgstPct) / 100;
          gstAmt = cgstAmt + sgstAmt;
          totalCGST += cgstAmt;
          totalSGST += sgstAmt;
        }
        itemTax = gstAmt + cessAmt;
      }

      const itemTotal = taxable + itemTax;

      itemCalculations[item.rawMaterialId] = {
        qty,
        price,
        taxable,
        gstPct,
        gstAmt,
        cgstPct,
        sgstPct,
        igstPct,
        cgstAmt,
        sgstAmt,
        igstAmt,
        cessPct,
        cessAmt,
        itemTax,
        itemTotal,
      };

      if (isGstApplicable) {
        const rateKey = `${gstPct}_${cessPct}`;
        if (!taxRateGroups[rateKey]) {
          taxRateGroups[rateKey] = {
            gstPct,
            cessPct,
            cgstPct,
            sgstPct,
            igstPct,
            taxable: 0,
            cgstAmt: 0,
            sgstAmt: 0,
            igstAmt: 0,
            gstAmt: 0,
            cessAmt: 0,
          };
        }
        taxRateGroups[rateKey].taxable += taxable;
        taxRateGroups[rateKey].cgstAmt += cgstAmt;
        taxRateGroups[rateKey].sgstAmt += sgstAmt;
        taxRateGroups[rateKey].igstAmt += igstAmt;
        taxRateGroups[rateKey].gstAmt += gstAmt;
        taxRateGroups[rateKey].cessAmt += cessAmt;
      }
    });

    const taxBreakdowns = Object.values(taxRateGroups).sort((a, b) => b.gstPct - a.gstPct || b.cessPct - a.cessPct);

    const totalGST = isInterState ? totalIGST : totalCGST + totalSGST;
    const totalTax = isGstApplicable ? totalGST + totalCESS : 0;
    const rawNet = totalTaxable + totalTax + totalOtherCosts;
    const roundedNet = Math.round(rawNet);
    const roundOff = Number((roundedNet - rawNet).toFixed(2));
    const netAmount = roundedNet;

    return {
      itemCalculations,
      taxBreakdowns,
      totalTaxable,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      totalCESS,
      totalTax,
      totalOtherCosts,
      rawNet,
      netAmount,
      roundedNet,
      roundOff,
      amountInWords: numberToWords(netAmount),
    };
  }, [includedItems, poQtyMap, priceMap, gstMap, cessMap, isInterState, isGstApplicable, totalOtherCosts]);

  const buildSinglePayload = (status) => {
    const reqId = getPurchaseRequisitionId();
    const outletId = Number(selectedOutletId) || pr?.outletId || poRecord?.outletId || state?.outletId;
    const formattedPoDate = inputDateToApiDate(poDate);
    const formattedExpectedDate = inputDateToApiDate(expectedDeliveryDate);
    const userId = getUserIdFromToken();
    const actionBy = getUsernameFromToken();
    const firstVendorId = Object.values(vendorMap).find(Boolean) || commonVendorId || poRecord?.vendorId;

    const otherCostsPayload = otherCosts
      .filter((c) => (c.label && c.label.trim()) || (c.cost !== '' && !isNaN(Number(c.cost))))
      .map((c) => ({
        ...(c.id && typeof c.id === 'number' && c.id < 1000000000 ? { id: c.id } : {}),
        label: (c.label || '').trim(),
        cost: Number(c.cost) || 0,
      }));

    // Line items inserted vendor-wise (ordered by vendorId)
    const details = [...includedItems]
      .map((item) => {
        const itemVendorId = vendorMap[item.rawMaterialId] || commonVendorId || firstVendorId;
        const vendorObj = vendors.find((v) => String(v.id) === String(itemVendorId));
        const qty = Number(poQtyMap[item.rawMaterialId]) || 0;
        const unitPrice = Number(priceMap[item.rawMaterialId]) || 0;
        const currentUom = uomMap[item.rawMaterialId] || { uomId: item.uomId, uomName: item.uomName || item.unit };

        // If initial Create PO / isGeneratePo OR Non-GST vendor: NO GST, NO HSN, NO tax fields
        if (isGeneratePo || !isGstApplicable) {
          return {
            uomId: currentUom.uomId,
            uomName: currentUom.uomName,
            rawMaterialId: item.rawMaterialId,
            rawMaterialName: item.itemName,
            quantity: qty,
            unitPrice: unitPrice,
            vendorId: itemVendorId ? Number(itemVendorId) : undefined,
            vendorName: vendorObj?.name ?? item.vendorName ?? '',
            orderedQuantity: qty,
            receivedQuantity: 0,
            tax: 0,
            taxAmount: 0,
            totalPrice: Number((qty * unitPrice).toFixed(2)),
            hsnCode: '',
            cess: 0,
            cessAmount: 0,
            cgst: 0,
            cgstAmount: 0,
            sgst: 0,
            sgstAmount: 0,
            igst: 0,
            igstAmount: 0,
            prDetailId: item.prDetailId != null ? Number(item.prDetailId) : null,
            remarks: itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? '',
          };
        }

        // Otherwise (GST-applicable vendor): Include configured GST, HSN, Tax amounts, CESS
        const calc = calculatedTotals.itemCalculations[item.rawMaterialId] || {};
        const hsn = hsnMap[item.rawMaterialId] || '';
        const cess = calc.cessPct ?? 0;

        let taxRate = 0;
        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;
        const cessAmount = Number((calc.cessAmt || 0).toFixed(2));
        const taxAmount = Number((calc.itemTax || 0).toFixed(2));
        const totalPrice = Number((calc.itemTotal || (qty * unitPrice + (calc.itemTax || 0))).toFixed(2));

        if (isInterState) {
          igstRate = Number(calc.igstPct ?? 18);
          igstAmount = Number((calc.igstAmt || 0).toFixed(2));
          cgstRate = 0;
          cgstAmount = 0;
          sgstRate = 0;
          sgstAmount = 0;
          taxRate = igstRate + cess;
        } else {
          cgstRate = Number(calc.cgstPct ?? 9);
          cgstAmount = Number((calc.cgstAmt || 0).toFixed(2));
          sgstRate = Number(calc.sgstPct ?? 9);
          sgstAmount = Number((calc.sgstAmt || 0).toFixed(2));
          igstRate = 0;
          igstAmount = 0;
          taxRate = cgstRate + sgstRate + cess;
        }

        return {
          uomId: currentUom.uomId,
          uomName: currentUom.uomName,
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: item.itemName,
          quantity: qty,
          unitPrice: unitPrice,
          vendorId: itemVendorId ? Number(itemVendorId) : undefined,
          vendorName: vendorObj?.name ?? item.vendorName ?? '',
          orderedQuantity: qty,
          receivedQuantity: 0,
          tax: taxRate,
          taxAmount: taxAmount,
          totalPrice: totalPrice,
          hsnCode: hsn,
          cess: cess,
          cessAmount: cessAmount,
          cgst: cgstRate,
          cgstAmount: cgstAmount,
          sgst: sgstRate,
          sgstAmount: sgstAmount,
          igst: igstRate,
          igstAmount: igstAmount,
          prDetailId: item.prDetailId != null ? Number(item.prDetailId) : null,
          remarks: itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? '',
        };
      })
      .sort((a, b) => (Number(a.vendorId) || 0) - (Number(b.vendorId) || 0));

    if (isGeneratePo) {
      return {
        purchaseRequisitionId: reqId,
        prId: reqId,
        outletId,
        poDate: formattedPoDate,
        expectedDeliveryDate: formattedExpectedDate,
        remarks,
        totalAmount: Number(calculatedTotals.netAmount.toFixed(2)),
        vendorId: firstVendorId ? Number(firstVendorId) : undefined,
        status,
        userId,
        actionBy,
        otherCosts: otherCostsPayload,
        totalOtherCosts: Number(totalOtherCosts.toFixed(2)),
        details,
      };
    }

    return {
      purchaseRequisitionId: reqId,
      prId: reqId,
      outletId,
      poDate: formattedPoDate,
      expectedDeliveryDate: formattedExpectedDate,
      remarks,
      roundOff: calculatedTotals.roundOff,
      totalAmount: calculatedTotals.netAmount,
      vendorId: firstVendorId ? Number(firstVendorId) : undefined,
      status,
      userId,
      actionBy,
      otherCosts: otherCostsPayload,
      totalOtherCosts: Number(totalOtherCosts.toFixed(2)),
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
      const vendorId = vendorMap[item.rawMaterialId] || (isSingleVendorPo ? commonVendorId : '');
      const vendorObj = vendors.find((v) => String(v.id) === String(vendorId));
      const vendorName = vendorObj?.name || 'Selected vendor';
      if (!vendorId) {
        setSubmitError(`Please select a valid vendor for "${item.itemName}".`);
        return false;
      }
      const price = priceMap[item.rawMaterialId];
      if (price === '' || price === undefined || isNaN(Number(price)) || Number(price) < 0) {
        setSubmitError(`Please enter a valid price for "${item.itemName}".`);
        return false;
      }
      if (!isGeneratePo && isGstApplicable) {
        const gst = gstMap[item.rawMaterialId];
        if (gst !== '' && gst !== undefined && (isNaN(Number(gst)) || Number(gst) < 0 || Number(gst) > 100)) {
          setSubmitError(`Please enter a valid GST percentage (0-100) for "${item.itemName}".`);
          return false;
        }
        const cess = cessMap[item.rawMaterialId];
        if (cess !== '' && cess !== undefined && (isNaN(Number(cess)) || Number(cess) < 0 || Number(cess) > 100)) {
          setSubmitError(`Please enter a valid CESS percentage (0-100) for "${item.itemName}".`);
          return false;
        }
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
      console.log('=== SAVE DRAFT / GENERATE PO PAYLOAD ===', payload);
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
      console.log('=== SENT FOR APPROVAL PO PAYLOAD ===', payload);
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

  const estimatedTotal = calculatedTotals.netAmount;

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
                          onChange={(e) => handleGlobalVendorChange(e.target.value)}
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
                          onChange={(e) => handleGlobalVendorChange(e.target.value)}
                          disabled={vendorsLoading || isReadOnly || isSwitchingVendor}
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
                        {isSwitchingVendor ? (
                          <Loader2 size={16} className="absolute right-8 top-1/2 -translate-y-1/2 text-[#084E92] animate-spin pointer-events-none" />
                        ) : null}
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
                        disabled={outletsLoading || isReadOnly || isSwitchingVendor}
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
                          onChange={(e) => handleGlobalVendorChange(e.target.value)}
                          disabled={vendorsLoading || isReadOnly || isSwitchingVendor}
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
                        {isSwitchingVendor ? (
                          <Loader2 size={16} className="absolute right-8 top-1/2 -translate-y-1/2 text-[#084E92] animate-spin pointer-events-none" />
                        ) : null}
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

        {/* Bill To & Ship To Address Section (Shown only once PO is generated vendor-wise / existing / review) */}
        {isSingleVendorPo && (billTo || shipTo) && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-3 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#084E92]" />
                <h2 className="text-base font-semibold text-[#1E293B]">Address & Tax Configuration</h2>
              </div>
              <div className="flex items-center gap-2">
                {isGstApplicable ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      isInterState
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isInterState ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {isInterState
                      ? 'Inter-State Supply (IGST 18%)'
                      : 'Intra-State Supply (CGST 9% + SGST 9%)'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Non-GST Supply
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bill To (Vendor Address) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 relative">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#084E92]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                      Bill To (Vendor Address)
                    </span>
                  </div>
                </div>

                {billTo ? (
                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p className="font-bold text-sm text-gray-900">
                      {poRecord?.vendorName || state?.vendorName || billTo?.vendorName || 'Vendor'}
                    </p>
                    {billTo.addressLine1 && <p>{billTo.addressLine1}</p>}
                    {billTo.addressLine2 && <p>{billTo.addressLine2}</p>}
                    <p className="font-medium text-gray-800">
                      {[billTo.cityName, billTo.stateName, billTo.pincode, billTo.countryName].filter(Boolean).join(', ')}
                    </p>
                    <div className="pt-2 mt-2 border-t border-gray-200/60 flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                      {billTo.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {billTo.phoneNumber}
                        </span>
                      )}
                      {isGstApplicable && billTo.gstNumber && (
                        <span>
                          <strong className="text-gray-700">GSTIN:</strong> {billTo.gstNumber}
                        </span>
                      )}
                      {billTo.panNumber && (
                        <span>
                          <strong className="text-gray-700">PAN:</strong> {billTo.panNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-800">
                      {commonVendorId
                        ? mappedVendors.find((v) => String(v.id) === String(commonVendorId))?.name || 'Selected Vendor'
                        : 'Vendor not yet selected'}
                    </p>
                    <p className="text-gray-400 italic">
                      {commonVendorId
                        ? 'Billing address details will be attached upon PO generation.'
                        : 'Select a vendor above to preview billing details.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Ship To (Outlet Address) */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 relative">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#084E92]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                      Ship To (Outlet Delivery Address)
                    </span>
                  </div>
                </div>

                {shipTo ? (
                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p className="font-bold text-sm text-gray-900">
                      {shipTo.companyNameEnglish || poRecord?.outlet || state?.outlet || 'Outlet'}
                      {shipTo.companyCode ? ` (${shipTo.companyCode})` : ''}
                    </p>
                    {shipTo.addressEnglish && <p>{shipTo.addressEnglish}</p>}
                    {shipTo.addressline2 && <p>{shipTo.addressline2}</p>}
                    <p className="font-medium text-gray-800">
                      {[shipTo.cityName, shipTo.stateName, shipTo.pincode, shipTo.countryName].filter(Boolean).join(', ')}
                    </p>
                    <div className="pt-2 mt-2 border-t border-gray-200/60 flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                      {(shipTo.mobilenumber || shipTo.alternatemobilenumber) && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {shipTo.mobilenumber || shipTo.alternatemobilenumber}
                        </span>
                      )}
                      {shipTo.emailid && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {shipTo.emailid}
                        </span>
                      )}
                      {shipTo.gstNumber && (
                        <span>
                          <strong className="text-gray-700">GSTIN:</strong> {shipTo.gstNumber}
                        </span>
                      )}
                      {shipTo.panNumber && (
                        <span>
                          <strong className="text-gray-700">PAN:</strong> {shipTo.panNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-800">
                      {pr?.outlet || poRecord?.outlet || state?.outlet || 'Assigned Outlet'}
                    </p>
                    <p className="text-gray-400 italic">
                      Delivery address configured for this outlet will be bound upon PO generation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="w-full my-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          {(isEditingExistingPo ? poSaving && !poRecord : prLoading) && (
            <div className="p-4 text-sm text-gray-500 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
              Loading purchase items...
            </div>
          )}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b border-[#E2E8F0] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Purchase Items</h2>
                <p className="text-xs text-gray-500">
                  Select items, assign vendors, quantities, rates
                </p>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-72 md:w-80">
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

                <button
                  type="button"
                  disabled={selectedItemsForTransfer.length === 0}
                  onClick={() => setShowStockTransferModal(true)}
                  className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    selectedItemsForTransfer.length > 0
                      ? 'bg-[#084E92] text-white hover:bg-blue-800 shadow-sm active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
                  }`}
                  title={
                    selectedItemsForTransfer.length === 0
                      ? 'Select at least one item from the table below to generate stock transfer'
                      : `Generate Stock Transfer for ${selectedItemsForTransfer.length} selected item(s)`
                  }
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Generate Stock Transfer</span>
                  {selectedItemsForTransfer.length > 0 && (
                    <span className="inline-flex items-center justify-center bg-white/25 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {selectedItemsForTransfer.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold tracking-wider text-[#475569] uppercase">
                  <th className="py-3 px-2 w-8 text-center">
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
                  <th className="py-3 px-2 text-left w-52">Item Description</th>
                  <th className="py-3 px-2 text-left w-36">Unit</th>
                  <th className="py-3 px-2 text-left w-52">Vendor Name</th>
                  <th className="py-3 px-2 text-center w-16">Qty</th>
                  <th className="py-3 px-2 text-right w-20">Rate (₹)</th>
                  {!isGeneratePo && isGstApplicable && (
                    <>
                      <th className="py-3 px-2 text-center w-20">HSN/SAC</th>
                      <th className="py-3 px-1 text-center w-14">GST (%)</th>
                      <th className="py-3 px-1 text-center w-14">CESS (%)</th>
                      <th className="py-3 px-2 text-right w-24">Amount w/o Tax (₹)</th>
                      <th className="py-3 px-2 text-right w-20">Tax Applied (₹)</th>
                      <th className="py-3 px-3 text-right w-28">Total Amount (₹)</th>
                    </>
                  )}
                  {(isGeneratePo || !isGstApplicable) && (
                    <th className="py-3 px-4 text-right w-auto min-w-[130px]">Amount (₹)</th>
                  )}
                  <th className="py-3 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={(!isGeneratePo && isGstApplicable) ? 12 : 8} className="py-14 text-center">
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
                    const calc = calculatedTotals.itemCalculations[item.rawMaterialId] || {
                      qty: Number(poQtyMap[item.rawMaterialId]) || 0,
                      price: Number(priceMap[item.rawMaterialId]) || 0,
                      taxable: 0,
                      gstPct: 18,
                      gstAmt: 0,
                      cgstPct: 9,
                      sgstPct: 9,
                      igstPct: 18,
                      cessPct: 0,
                      itemTax: 0,
                      itemTotal: 0,
                    };
                    const itemRemarks = itemRemarksMap[item.rawMaterialId] ?? item.remarks ?? '';
                    const isRemarksOpen = Boolean(openRemarksMap[item.rawMaterialId]);

                    return (
                      <tr key={item.rawMaterialId} className={`hover:bg-blue-50/20 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-2 text-center align-top pt-3.5 w-8">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={isSelected}
                            onChange={() => setRowSelection(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-2.5 px-2 align-top w-52">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => openQuotationModal(item)}
                                title="Click to compare vendor prices"
                                className="text-[#084E92] font-semibold underline underline-offset-2 hover:text-[#063d73] cursor-pointer text-left inline-flex items-center gap-1 text-xs truncate max-w-[140px]"
                              >
                                <span className="truncate">{item.itemName}</span>
                              </button>
                              {item.source === 'manual' && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-[#0B5CAD] bg-[#EFF6FF] px-1.5 py-0.2 rounded shrink-0">
                                  Added
                                </span>
                              )}
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => toggleItemRemarks(item.rawMaterialId)}
                                  title={isRemarksOpen ? 'Close remarks' : 'Add/Edit remarks'}
                                  className={`p-0.5 rounded hover:bg-blue-50 transition cursor-pointer shrink-0 ${
                                    itemRemarks ? 'text-[#084E92]' : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                >
                                  <Pencil size={11} />
                                </button>
                              )}
                            </div>

                            {/* Show compact remarks input when opened via pencil icon */}
                            {isRemarksOpen ? (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={itemRemarks}
                                  onChange={(e) =>
                                    setItemRemarksMap((prev) => ({
                                      ...prev,
                                      [item.rawMaterialId]: e.target.value,
                                    }))
                                  }
                                  disabled={isReadOnly}
                                  placeholder="Remarks..."
                                  className="w-full max-w-[200px] h-6 border border-[#CBD5E1] rounded px-1.5 text-[10px] text-[#1E293B] outline-none focus:border-[#084E92] bg-white disabled:bg-[#F8FAFC]"
                                />
                              </div>
                            ) : itemRemarks ? (
                              <p
                                onClick={() => !isReadOnly && toggleItemRemarks(item.rawMaterialId)}
                                title="Click to edit remarks"
                                className="text-[10px] text-gray-500 italic truncate max-w-[180px] cursor-pointer hover:text-gray-700"
                              >
                                {itemRemarks}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 align-top pt-2.5 w-36">
                          {(() => {
                            const currentUom = uomMap[item.rawMaterialId] || {
                              uomId: item.uomId,
                              uomName: item.uomName || item.unit || '—',
                            };
                            const rm = rawMaterials.find((r) => r.id === item.rawMaterialId);
                            const allowedList = Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
                              ? rm.allowedUnits
                              : (rm?.unit ? [rm.unit] : []);

                            let options = allowedList.map((u) => ({
                              value: String(u.id),
                              label: u.nameEnglish || u.symbolEnglish || `Unit #${u.id}`,
                            }));

                            if (currentUom.uomId && !options.some((opt) => String(opt.value) === String(currentUom.uomId))) {
                              options = [
                                { value: String(currentUom.uomId), label: currentUom.uomName || `Unit #${currentUom.uomId}` },
                                ...options,
                              ];
                            }

                            if (isReadOnly) {
                              return (
                                <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded font-medium text-[11px] text-gray-700">
                                  {currentUom.uomName || '—'}
                                </span>
                              );
                            }

                            return (
                              <div className="min-w-[110px] max-w-[150px]">
                                <SearchableSelect
                                  name={`unit-${item.rawMaterialId}`}
                                  value={currentUom.uomId ? String(currentUom.uomId) : ''}
                                  onChange={(e) => handleUnitChange(item.rawMaterialId, e.target.value)}
                                  options={options}
                                  placeholder="Select unit"
                                  disabled={isReadOnly}
                                  hasError={!currentUom.uomId || !currentUom.uomName}
                                />
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 align-top pt-3 w-52">
                          <div className="relative">
                            <select
                              value={vendorMap[item.rawMaterialId] || (isSingleVendorPo ? (commonVendorId || poRecord?.vendorId || state?.vendorId || '') : '')}
                              onChange={(e) => handleVendorChange(item.rawMaterialId, e.target.value)}
                              disabled={isReadOnly || isSingleVendorPo}
                              title={isSingleVendorPo ? 'Vendor is fixed per PO. Change vendor globally from PO Information above.' : 'Select Vendor'}
                              className={`w-full h-8 border border-[#E2E8F0] rounded-lg px-2 pr-5 text-xs text-[#1E293B] appearance-none outline-none ${
                                isSingleVendorPo
                                  ? 'bg-[#F8FAFC] text-gray-500 cursor-not-allowed border-dashed'
                                  : 'bg-white cursor-pointer focus:border-[#084E92]'
                              } disabled:bg-[#F8FAFC] disabled:cursor-not-allowed truncate`}
                            >
                              <option value="">Select Vendor</option>
                              {mappedVendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                            {!isSingleVendorPo && (
                              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center align-top pt-3 w-16">
                          <input
                            type="number"
                            min="1"
                            value={poQtyMap[item.rawMaterialId] ?? ''}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                            }}
                            onChange={(e) =>
                              setPoQtyMap((prev) => ({
                                ...prev,
                                [item.rawMaterialId]: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                              }))
                            }
                            disabled={isReadOnly}
                            placeholder="0"
                            className="w-14 h-8 border border-[#E2E8F0] rounded-lg text-center font-medium text-xs outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC] disabled:text-[#475467]"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right align-top pt-3 w-20">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceMap[item.rawMaterialId] ?? ''}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                            }}
                            onChange={(e) =>
                              setPriceMap((prev) => ({
                                ...prev,
                                [item.rawMaterialId]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                              }))
                            }
                            disabled={isReadOnly}
                            placeholder="0.00"
                            className="w-18 h-8 border border-[#E2E8F0] rounded-lg text-right px-1.5 font-medium text-xs outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC]"
                          />
                        </td>
                        {!isGeneratePo && isGstApplicable ? (
                          <>
                            <td className="py-2.5 px-2 text-center align-top pt-3 w-20">
                              <input
                                type="text"
                                value={hsnMap[item.rawMaterialId] ?? ''}
                                onChange={(e) =>
                                  setHsnMap((prev) => ({
                                    ...prev,
                                    [item.rawMaterialId]: e.target.value,
                                  }))
                                }
                                disabled={isReadOnly}
                                placeholder="HSN"
                                className="w-18 h-8 border border-[#E2E8F0] rounded-lg px-1.5 text-center text-xs font-mono outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC]"
                              />
                            </td>
                            <td className="py-2.5 px-1 text-center align-top pt-3 w-14">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={gstMap[item.rawMaterialId] ?? 18}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e') e.preventDefault();
                                }}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                  setGstMap((prev) => ({ ...prev, [item.rawMaterialId]: v }));
                                }}
                                disabled={isReadOnly}
                                placeholder="18"
                                className="w-13 h-8 border border-[#E2E8F0] rounded-lg text-center text-xs outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC]"
                              />
                            </td>
                            <td className="py-2.5 px-1 text-center align-top pt-3 w-14">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={cessMap[item.rawMaterialId] ?? 0}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e') e.preventDefault();
                                }}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                  setCessMap((prev) => ({ ...prev, [item.rawMaterialId]: v }));
                                }}
                                disabled={isReadOnly}
                                placeholder="0"
                                className="w-12 h-8 border border-[#E2E8F0] rounded-lg text-center text-xs outline-none focus:border-[#084E92] disabled:bg-[#F8FAFC]"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-medium text-xs text-gray-700 font-mono align-top pt-3.5 w-24 whitespace-nowrap">
                              ₹{calc.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2 text-right font-medium text-xs text-amber-700 font-mono align-top pt-3.5 w-20 whitespace-nowrap">
                              ₹{calc.itemTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-xs text-gray-900 font-mono align-top pt-3.5 w-28 whitespace-nowrap">
                              ₹{calc.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </>
                        ) : (
                          <td className="py-2.5 px-4 text-right font-bold text-xs text-gray-900 font-mono align-top pt-3.5 w-auto min-w-[130px] whitespace-nowrap">
                            ₹{((Number(poQtyMap[item.rawMaterialId]) || 0) * (Number(priceMap[item.rawMaterialId]) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="py-2.5 px-2 text-center align-top pt-3 w-12">
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:!text-red-600 hover:!bg-red-50 transition-colors duration-150 cursor-pointer mx-auto group"
                              title="Remove from PO"
                            >
                              <Trash2 size={15} className="text-gray-400 group-hover:!text-red-600 transition-colors duration-150" />
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

          {/* Summary Section: Simple for Generate PO vs Detailed Tax Invoice for Continue PO / Review */}
          {isGeneratePo ? (
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Total Items: <strong className="text-gray-800">{includedItems.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-bold uppercase tracking-wide">Total Amount:</span>
                <span className="text-lg font-bold text-[#084E92] font-mono">
                  ₹{calculatedTotals.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-6">
              {/* If GST is applicable, show Other Costing on top across full width, then 2-col Tax Breakdown + Summary */}
              {isGstApplicable && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <PlusCircle size={16} className="text-[#084E92]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                        Other Costing / Charges (Transportation, Handling, etc.)
                      </h3>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleAddOtherCost}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#084E92] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                      >
                        <Plus size={13} />
                        Add Cost
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {otherCosts.map((costItem, index) => (
                      <div key={costItem.id || index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={costItem.label}
                          onChange={(e) => handleOtherCostChange(costItem.id, 'label', e.target.value)}
                          disabled={isReadOnly}
                          placeholder="e.g. Delivery Charge, Packaging, Freight..."
                          className="w-64 sm:w-80 md:w-96 max-w-full h-9 border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-[#1E293B] outline-none focus:border-[#084E92] bg-white disabled:bg-[#F8FAFC]"
                        />
                        <div className="w-36 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={costItem.cost}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                            }}
                            onChange={(e) => handleOtherCostChange(costItem.id, 'cost', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="0.00"
                            className="w-full h-9 border border-[#E2E8F0] rounded-lg pl-6 pr-2 text-right text-xs font-mono text-[#1E293B] outline-none focus:border-[#084E92] bg-white disabled:bg-[#F8FAFC]"
                          />
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOtherCost(costItem.id)}
                            disabled={otherCosts.length === 1 && !costItem.label && !costItem.cost}
                            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40 shrink-0"
                            title="Remove cost"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {totalOtherCosts > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-start items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-500 uppercase tracking-wider">Total Other Costs:</span>
                      <span className="font-bold text-gray-900 font-mono">
                        ₹{totalOtherCosts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Left Column: If GST is applicable -> Tax Breakdown. If GST NOT applicable -> Other Costing / Charges */}
                {isGstApplicable ? (
                  <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-100">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92] flex items-center gap-1.5">
                        <Receipt className="w-4 h-4" />
                        Tax Breakdown {isInterState ? '(Inter-State IGST)' : '(Intra-State CGST + SGST)'}
                      </h3>
                      <span className="text-[10px] font-semibold bg-blue-50 text-[#084E92] px-2.5 py-0.5 rounded-full border border-blue-100">
                        GST Rate Breakdown
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px]">
                            <th className="pb-2.5 px-2 text-left whitespace-nowrap">TAX RATE</th>
                            <th className="pb-2.5 px-2 text-right whitespace-nowrap">TAXABLE AMT</th>
                            {!isInterState ? (
                              <>
                                <th className="pb-2.5 px-2 text-right whitespace-nowrap">SGST</th>
                                <th className="pb-2.5 w-6 text-center"></th>
                                <th className="pb-2.5 px-2 text-right whitespace-nowrap">CGST</th>
                              </>
                            ) : (
                              <th className="pb-2.5 px-2 text-right whitespace-nowrap">IGST</th>
                            )}
                            {calculatedTotals.totalCESS > 0 && (
                              <>
                                <th className="pb-2.5 w-6 text-center"></th>
                                <th className="pb-2.5 px-2 text-right whitespace-nowrap">CESS</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                          {calculatedTotals.taxBreakdowns && calculatedTotals.taxBreakdowns.length > 0 ? (
                            calculatedTotals.taxBreakdowns.map((rate, idx) => (
                              <tr key={`${rate.gstPct}_${rate.cessPct || 0}_${idx}`} className="hover:bg-gray-50/60 transition-colors">
                                <td className="py-2.5 px-2 font-sans whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#084E92] border border-blue-100">
                                    {Number(rate.gstPct).toFixed(2)}% GST
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-1.5 font-mono">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-sans">
                                      of
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                      ₹{Number(rate.taxable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100/90 text-gray-500 font-bold text-[11px] font-sans">
                                      =
                                    </span>
                                  </div>
                                </td>
                                {!isInterState ? (
                                  <>
                                    <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                      ₹{Number(rate.sgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 w-6 px-0.5 text-center">
                                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">
                                        +
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                      ₹{Number(rate.cgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                ) : (
                                  <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                    ₹{Number(rate.igstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                )}
                                {calculatedTotals.totalCESS > 0 && (
                                  <>
                                    <td className="py-2.5 w-6 px-0.5 text-center">
                                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">
                                        +
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                      <div className="inline-flex items-center justify-end gap-1.5 font-mono">
                                        <span>
                                          ₹{Number(rate.cessAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {Number(rate.cessPct || 0) > 0 ? (
                                          <span className="text-[10px] font-sans font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                            ({Number(rate.cessPct)}% CESS)
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={!isInterState ? (calculatedTotals.totalCESS > 0 ? 7 : 5) : (calculatedTotals.totalCESS > 0 ? 5 : 3)} className="py-4 text-center text-gray-400 italic">
                                No taxable line items
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-dashed border-gray-300 font-bold text-gray-900 font-mono">
                            <td className="pt-3 px-2 font-sans uppercase tracking-wider text-xs whitespace-nowrap">TOTAL</td>
                            <td className="pt-3 px-2 text-right whitespace-nowrap">
                              ₹{Number(calculatedTotals.totalTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {!isInterState ? (
                              <>
                                <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                  ₹{Number(calculatedTotals.totalSGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="pt-3 w-6 px-0.5"></td>
                                <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                  ₹{Number(calculatedTotals.totalCGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            ) : (
                              <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                ₹{Number(calculatedTotals.totalIGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            {calculatedTotals.totalCESS > 0 && (
                              <>
                                <td className="pt-3 w-6 px-0.5"></td>
                                <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                  ₹{Number(calculatedTotals.totalCESS).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Non-GST View: Left column is Other Costing / Charges */
                  <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <PlusCircle size={16} className="text-[#084E92]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                            Other Costing / Charges
                          </h3>
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={handleAddOtherCost}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#084E92] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Plus size={13} />
                            Add Cost
                          </button>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {otherCosts.map((costItem, index) => (
                          <div key={costItem.id || index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={costItem.label}
                              onChange={(e) => handleOtherCostChange(costItem.id, 'label', e.target.value)}
                              disabled={isReadOnly}
                              placeholder="e.g. Delivery, Packaging, Handling..."
                              className="flex-1 h-9 border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-[#1E293B] outline-none focus:border-[#084E92] bg-white disabled:bg-[#F8FAFC]"
                            />
                            <div className="w-32 relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costItem.cost}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e') e.preventDefault();
                                }}
                                onChange={(e) => handleOtherCostChange(costItem.id, 'cost', e.target.value)}
                                disabled={isReadOnly}
                                placeholder="0.00"
                                className="w-full h-9 border border-[#E2E8F0] rounded-lg pl-6 pr-2 text-right text-xs font-mono text-[#1E293B] outline-none focus:border-[#084E92] bg-white disabled:bg-[#F8FAFC]"
                              />
                            </div>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOtherCost(costItem.id)}
                                disabled={otherCosts.length === 1 && !costItem.label && !costItem.cost}
                                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40 shrink-0"
                                title="Remove cost"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {totalOtherCosts > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-500 uppercase tracking-wider">Total Other Costs:</span>
                        <span className="font-bold text-gray-900 font-mono">
                          ₹{totalOtherCosts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Right Column: Grand Total & Amount In Words */}
                <div className="xl:col-span-5 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">{isGstApplicable ? 'Sub Total (Taxable):' : 'Sub Total:'}</span>
                      <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTaxable)}</span>
                    </div>
                    {isGstApplicable && (
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Total Tax:</span>
                        <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTax)}</span>
                      </div>
                    )}
                    {totalOtherCosts > 0 && (() => {
                      const labels = otherCosts
                        .map((c) => (c.label || '').trim())
                        .filter(Boolean);
                      const displayTitle = labels.length > 0
                        ? `Other Costs (${labels.join(', ')}):`
                        : 'Other Costs:';
                      return (
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500 truncate max-w-[220px]" title={displayTitle}>
                            {displayTitle}
                          </span>
                          <span className="font-semibold text-gray-800 font-mono">
                            +{formatCurrency(totalOtherCosts)}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Round Off:</span>
                      <span className="font-semibold text-gray-600 font-mono">
                        {calculatedTotals.roundOff >= 0 ? `+${calculatedTotals.roundOff}` : `${calculatedTotals.roundOff}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-200">
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Net Amount:</span>
                      <span className="text-2xl font-bold text-[#084E92] font-mono">
                        {formatCurrency(calculatedTotals.netAmount)}
                      </span>
                    </div>
                  </div>

                  {calculatedTotals.amountInWords && (
                    <div className="mt-3 pt-2.5 border-t border-dashed border-gray-200 bg-blue-50/50 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Amount in Words</p>
                      <p className="text-xs font-semibold text-[#084E92] italic">
                        {calculatedTotals.amountInWords}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
                    disabled={isSaving || !canEdit}
                    onClick={handleSaveInProgress}
                    className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !canEdit}
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
                  disabled={isSaving || !canEdit}
                  onClick={handleOpenRejectConfirm}
                  className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50 font-medium text-sm transition"
                >
                  {isSaving ? 'Rejecting...' : 'Reject purchase order'}
                </button>
              )}
            </div>
          ) : isGeneratePo ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving || isReadOnly}
                onClick={handleSaveDraft}
                className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer disabled:opacity-50 font-medium text-sm transition shadow-sm"
              >
                {isSaving ? 'Generating...' : 'Generate Purchase Order'}
              </button>
            </div>
          ) : canPerformAction ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving || isReadOnly}
                onClick={handleSaveDraft}
                className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50 font-medium text-sm transition"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                disabled={isSaving || isReadOnly}
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer disabled:opacity-50 font-medium text-sm transition shadow-sm"
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
        lockedVendorId={isSingleVendorPo ? (commonVendorId || poRecord?.vendorId || state?.vendorId || vendorMap[quotationItem?.rawMaterialId] || '') : null}
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

      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete?.rawMaterialId) {
            handleRemoveItem(itemToDelete.rawMaterialId);
          }
          setItemToDelete(null);
        }}
        title="Remove Raw Material"
        itemLabel={itemToDelete?.itemName}
        description={`Are you sure you want to remove "${itemToDelete?.itemName}" from this purchase order?`}
      />

      {/* Vendor Change Confirmation Modal */}
      <VendorChangeConfirmModal
        isOpen={showVendorChangeModal}
        onClose={() => {
          if (!isSwitchingVendor) {
            setShowVendorChangeModal(false);
            setPendingVendorId(null);
          }
        }}
        onConfirm={handleConfirmVendorChange}
        vendorName={vendors.find((v) => String(v.id) === String(pendingVendorId))?.name || 'Selected Vendor'}
        loading={isSwitchingVendor}
      />

      {/* Generate Stock Transfer Modal */}
      <GenerateStockTransferModal
        isOpen={showStockTransferModal}
        onClose={() => setShowStockTransferModal(false)}
        initialItems={selectedItemsForTransfer}
        currentOutletId={activeOutletId}
        onSuccess={() => {
          setRowSelection({});
        }}
      />
    </Container>
  );
};

export default CreatePurchaseOrder;