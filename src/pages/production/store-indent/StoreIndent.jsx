import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChefHat,
  Calendar,
  Utensils,
  Store,
  Package,
  Boxes,
  RotateCw,
  Download,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken, getUserIdFromToken, getUsernameFromToken } from '@/utils/auth';
import { getTodayInputDate } from '@/utils/GetCurrentToday';
import { formatRemarks } from '@/utils/textUtils';
import { PR_STATUS } from '@/pages/purchase-requisition/utils/prStatus';
import {
  getAllMenuPlans,
  getMenuPlanById,
  GetAllStoreByOrg,
  GenerateStoreIndent,
  createPurchaseRequisition,
  getAllRawMaterialItems,
} from '@/services/apiServices';

// Helper date formatters
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatQty = (val) => {
  const num = Number(val);
  if (Number.isNaN(num)) return '0';
  return Number(num.toFixed(3)).toString();
};

const formatCurrencyINR = (val) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeProcurementRef = (ref, fallbackUom = '') => {
  if (typeof ref === 'string' || typeof ref === 'number') {
    const label = String(ref).trim();
    const upper = label.toUpperCase();
    const docType = upper.startsWith('PO') ? 'PO' : upper.startsWith('PR') ? 'PR' : 'REF';
    return {
      docType,
      refNumber: label || '—',
      qty: null,
      uom: fallbackUom,
      date: '',
      party: '',
      status: '',
    };
  }
  const obj = ref && typeof ref === 'object' ? ref : {};
  const rawType = String(
    obj.docType ?? obj.documentType ?? obj.referenceType ?? obj.type ?? ''
  )
    .trim()
    .toUpperCase();
  const refNumber =
    obj.docNumber ??
    obj.documentNumber ??
    obj.documentNo ??
    obj.referenceNumber ??
    obj.referenceNo ??
    obj.refNumber ??
    obj.refNo ??
    obj.code ??
    obj.prCode ??
    obj.poCode ??
    obj.prNumber ??
    obj.poNumber ??
    (obj.id ? `#${obj.id}` : '—');
  const inferredType =
    rawType ||
    (String(refNumber).toUpperCase().startsWith('PO') || obj.poCode || obj.poNumber
      ? 'PO'
      : String(refNumber).toUpperCase().startsWith('PR') || obj.prCode || obj.prNumber
        ? 'PR'
        : 'REF');
  const rawQty =
    obj.openQty ??
    obj.pendingQty ??
    obj.remainingQty ??
    obj.inboundQty ??
    obj.quantity ??
    obj.qty ??
    obj.orderedQty ??
    null;

  return {
    docType: inferredType,
    refNumber: String(refNumber),
    qty: rawQty !== null && rawQty !== undefined ? Number(rawQty) : null,
    uom: obj.uomSymbol || obj.unitSymbol || obj.uomName || obj.uom || fallbackUom,
    date: obj.expectedDate || obj.requiredDate || obj.deliveryDate || obj.date || obj.createdAt || '',
    party: obj.vendorName || obj.supplierName || obj.storeName || obj.subOutletName || '',
    status: obj.status ? String(obj.status).toUpperCase() : '',
  };
};

const OpenProcurementReferencesTable = ({ references = [], fallbackUom = '' }) => {
  if (!Array.isArray(references) || references.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
          <tr>
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Reference No.</th>
            <th className="py-2 px-3">Date</th>
            <th className="py-2 px-3">Vendor / Store</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3 text-right">Open Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {references.map((procRef, rIdx) => {
            const parsed = normalizeProcurementRef(procRef, fallbackUom);
            const isPo = parsed.docType === 'PO';
            return (
              <tr
                key={`${parsed.refNumber}-${rIdx}`}
                className="hover:bg-slate-50/50"
              >
                <td className="py-2 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-[#084E92] border-blue-200'
                    }`}
                  >
                    {parsed.docType}
                  </span>
                </td>
                <td className="py-2 px-3 font-bold text-slate-900">
                  {parsed.refNumber}
                </td>
                <td className="py-2 px-3 text-slate-600">
                  {parsed.date ? formatDateDisplay(parsed.date) : '—'}
                </td>
                <td className="py-2 px-3 text-slate-700">
                  {parsed.party || '—'}
                </td>
                <td className="py-2 px-3 text-slate-600 font-medium">
                  {parsed.status || '—'}
                </td>
                <td className="py-2 px-3 text-right font-bold text-[#084E92]">
                  {parsed.qty !== null && !Number.isNaN(parsed.qty)
                    ? `${formatQty(parsed.qty)} ${parsed.uom}`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const extractIndentItemsList = (resData) => {
  if (Array.isArray(resData)) return resData;
  if (!resData || typeof resData !== 'object') return [];
  const candidateKeys = [
    'items',
    'rawMaterials',
    'materials',
    'requirements',
    'shortfallItems',
    'details',
    'storeIndentItems',
    'lines',
    'content',
  ];
  for (const key of candidateKeys) {
    if (Array.isArray(resData[key])) return resData[key];
  }
  return [];
};

const StoreIndent = () => {
  const { units, selectedUnitId, effectiveOutletId, companyId, getSubOutlets } = useOrgScope();

  // State: Loading
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generatingIndent, setGeneratingIndent] = useState(false);

  // State: Menu Plans
  const [allMenuPlans, setAllMenuPlans] = useState([]);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null); // Single ID

  // Cache for fully fetched menu plan details: { [planId]: planData }
  const [plansCache, setPlansCache] = useState({});

  // State: Multi-select Days & Shifts
  const [selectedDayIds, setSelectedDayIds] = useState([]);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [selectedMealTypeIds, setSelectedMealTypeIds] = useState([]);
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
  const lastInitializedPlanRef = useRef(null);

  // State: Include Pipeline Stock toggle
  const [includePipelineStock, setIncludePipelineStock] = useState(true);

  // State: Store Selection
  const [storeOptions, setStoreOptions] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [selectedStores, setSelectedStores] = useState([]); // Array of store objects { id, name, code }

  // State: Generated Store Indent Table Data & Summary
  const [generatedRows, setGeneratedRows] = useState([]);
  const [indentSummary, setIndentSummary] = useState(null);
  const [responseStores, setResponseStores] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState(new Set());

  // State: View Item Breakdown Modal
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [expandedProcRows, setExpandedProcRows] = useState({});

  const handleToggleProcRow = (rowKey) => {
    setExpandedProcRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  // State: Purchase Requisition Modal
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prRequiredDate, setPrRequiredDate] = useState('');
  const [prRemarks, setPrRemarks] = useState('');
  const [generatingPr, setGeneratingPr] = useState(false);

  // Refs for dropdown click outside
  const planDropdownRef = useRef(null);
  const dayDropdownRef = useRef(null);
  const shiftDropdownRef = useRef(null);
  const storeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (planDropdownRef.current && !planDropdownRef.current.contains(e.target)) {
        setPlanDropdownOpen(false);
      }
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target)) {
        setDayDropdownOpen(false);
      }
      if (shiftDropdownRef.current && !shiftDropdownRef.current.contains(e.target)) {
        setShiftDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch all Menu Plans on load
  const fetchMenuPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getAllMenuPlans({ page: 0, size: 100, status: 'APPROVED' });
      const payload = res?.data?.data ?? res?.data ?? {};
      const list = Array.isArray(payload.content)
        ? payload.content
        : Array.isArray(payload)
          ? payload
          : [];
      setAllMenuPlans(list);

      // Auto-select first approved or first available plan if none selected
      if (list.length > 0 && !selectedPlanId) {
        const approvedPlan = list.find(
          (p) =>
            String(p.status).toUpperCase() === 'APPROVED' ||
            String(p.status).toUpperCase() === 'PARTIALLY_APPROVED'
        );
        const defaultPlan = approvedPlan || list[0];
        if (defaultPlan?.id) {
          setSelectedPlanId(defaultPlan.id);
        }
      }
    } catch (err) {
      console.error('Failed to load menu plans:', err);
      notify.error('Could not load menu plans list.');
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    fetchMenuPlans();
  }, []);

  // 2. Fetch full details for selected menu plan into plansCache
  useEffect(() => {
    if (!selectedPlanId) return;
    if (plansCache[selectedPlanId]) return;

    let isMounted = true;
    const loadDetail = async () => {
      setLoadingDetails(true);
      try {
        const res = await getMenuPlanById(selectedPlanId);
        const data = res?.data?.data ?? res?.data;
        if (data && isMounted) {
          setPlansCache((prev) => ({ ...prev, [selectedPlanId]: data }));
        }
      } catch (err) {
        console.error('Failed to load menu plan full details:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedPlanId, plansCache]);

  // Selected plan data from cache or summary list
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plansCache[selectedPlanId] || allMenuPlans.find((p) => p.id === selectedPlanId) || null;
  }, [selectedPlanId, plansCache, allMenuPlans]);

  // 3. Populate Available Days from selected plan
  const availableDays = useMemo(() => {
    if (!selectedPlan || !Array.isArray(selectedPlan.days)) return [];
    return selectedPlan.days.map((day, idx) => ({
      ...day,
      id: Number(day.id),
      planId: selectedPlan.id,
      planCode: selectedPlan.planCode,
      uniqueKey: `${selectedPlan.id}-${day.id || idx}-${day.planDate}`,
    }));
  }, [selectedPlan]);

  // Initialize multi-selected Days when full plan details load for a plan
  useEffect(() => {
    if (!selectedPlanId) {
      lastInitializedPlanRef.current = null;
      setSelectedDayIds([]);
      setSelectedMealTypeIds([]);
      return;
    }
    const cachedPlan = plansCache[selectedPlanId];
    if (!cachedPlan || !Array.isArray(cachedPlan.days)) return;
    if (lastInitializedPlanRef.current === selectedPlanId) return;

    lastInitializedPlanRef.current = selectedPlanId;
    const allDayIds = cachedPlan.days.map((d) => Number(d.id)).filter((id) => id > 0);
    setSelectedDayIds(allDayIds);

    const allMealIds = [];
    const seen = new Set();
    cachedPlan.days.forEach((day) => {
      if (Array.isArray(day.shifts)) {
        day.shifts.forEach((s) => {
          const mtId = Number(s.mealTypeId || s.id);
          if (mtId > 0 && !seen.has(mtId)) {
            seen.add(mtId);
            allMealIds.push(mtId);
          }
        });
      }
    });
    setSelectedMealTypeIds(allMealIds);
  }, [selectedPlanId, plansCache]);

  // 4. Populate Available Shifts from selected days (or all days if none selected)
  const availableShifts = useMemo(() => {
    const shifts = [];
    const seenShiftKeys = new Set();

    const targetDays =
      selectedDayIds.length > 0
        ? availableDays.filter((d) => selectedDayIds.includes(Number(d.id)))
        : availableDays;

    targetDays.forEach((day) => {
      if (Array.isArray(day.shifts)) {
        day.shifts.forEach((s) => {
          const mealTypeId = Number(s.mealTypeId || s.id);
          if (!mealTypeId || seenShiftKeys.has(mealTypeId)) return;
          seenShiftKeys.add(mealTypeId);
          shifts.push({
            id: Number(s.id),
            mealTypeId,
            mealTypeName: s.mealTypeName || `Shift #${mealTypeId}`,
            mealTypeCode: s.mealTypeCode || '',
          });
        });
      }
    });

    return shifts;
  }, [availableDays, selectedDayIds]);

  // Keep selectedMealTypeIds in sync with availableShifts when day filter changes
  useEffect(() => {
    const validIds = new Set(availableShifts.map((s) => Number(s.mealTypeId)));
    setSelectedMealTypeIds((prev) => prev.filter((id) => validIds.has(Number(id))));
  }, [availableShifts]);

  // Resolved Org ID: from selected menu plan or user scope
  const planOrgId = useMemo(() => {
    if (selectedPlan?.organizationId != null && Number(selectedPlan.organizationId) > 0) {
      return Number(selectedPlan.organizationId);
    }
    return (
      (selectedUnitId ? Number(selectedUnitId) : null) ||
      (effectiveOutletId ? Number(effectiveOutletId) : null) ||
      (companyId ? Number(companyId) : null) ||
      (getOrgIdFromToken() ? Number(getOrgIdFromToken()) : null) ||
      (units.length > 0 && units[0]?.id ? Number(units[0].id) : null) ||
      0
    );
  }, [selectedPlan, selectedUnitId, effectiveOutletId, companyId, units]);

  // Resolved SubOutlet ID: if subOutletId is null/undefined/0 -> null; if valid id -> Number
  const planSubOutletId = useMemo(() => {
    if (
      selectedPlan &&
      selectedPlan.subOutletId !== null &&
      selectedPlan.subOutletId !== undefined &&
      Number(selectedPlan.subOutletId) > 0
    ) {
      return Number(selectedPlan.subOutletId);
    }
    return null;
  }, [selectedPlan]);

  const lastStoreScopeKeyRef = useRef('');

  // Fetch Store Options using GetAllStoreByOrg whenever selected plan or its org/subOutlet changes
  useEffect(() => {
    let isMounted = true;
    const fetchStores = async () => {
      if (!planOrgId && !selectedPlanId) return;
      setLoadingStores(true);
      try {
        const hasSubOutlet = Boolean(planSubOutletId && Number(planSubOutletId) > 0);
        const payload = {
          orgId: Number(planOrgId) || 0,
          type: 'STORE',
        };
        // If subOutletId is null so pass orgId only; if subOutletId has id so pass both orgId and subOutletId
        if (hasSubOutlet) {
          payload.subOutletId = Number(planSubOutletId);
        }

        const res = await GetAllStoreByOrg(payload);
        const rawContainer = res?.data?.data ?? res?.data ?? [];
        const raw = Array.isArray(rawContainer)
          ? rawContainer
          : Array.isArray(rawContainer?.content)
            ? rawContainer.content
            : Array.isArray(rawContainer?.items)
              ? rawContainer.items
              : Array.isArray(rawContainer?.stores)
                ? rawContainer.stores
                : Array.isArray(rawContainer?.subOutlets)
                  ? rawContainer.subOutlets
                  : Array.isArray(rawContainer?.subLocations)
                    ? rawContainer.subLocations
                    : [];

        const seenIds = new Set();
        const list = [];
        raw.forEach((st, idx) => {
          const rawId = hasSubOutlet
            ? (st.subLocationId ?? st.id ?? st.storeId ?? st.materialCenterId ?? st.subOutletId)
            : (st.subOutletId ?? st.id ?? st.storeId ?? st.materialCenterId ?? st.subLocationId);
          const name = hasSubOutlet
            ? (st.subLocationName || st.name || st.storeName || st.subOutletName || `Store #${rawId ?? idx + 1}`)
            : (st.subOutletName || st.name || st.storeName || st.subLocationName || `Store #${rawId ?? idx + 1}`);
          const code = st.code || st.subOutletCode || st.subLocationCode || st.storeCode || '';

          const resolvedId =
            rawId !== undefined && rawId !== null && rawId !== '' && !Number.isNaN(Number(rawId))
              ? Number(rawId)
              : `${String(code || name)}-${idx}`;

          const idKey = String(resolvedId);
          if (seenIds.has(idKey)) return;
          seenIds.add(idKey);

          list.push({
            id: resolvedId,
            name,
            code,
          });
        });

        if (isMounted) {
          setStoreOptions(list);
          const scopeKey = `${planOrgId || 0}-${planSubOutletId || 0}`;
          const scopeChanged = lastStoreScopeKeyRef.current !== scopeKey;
          lastStoreScopeKeyRef.current = scopeKey;

          if (list.length === 0) {
            setSelectedStores([]);
          } else if (scopeChanged) {
            setSelectedStores(list.slice(0, Math.min(2, list.length)));
          } else {
            setSelectedStores((prev) => {
              const listMap = new Map(list.map((s) => [String(s.id), s]));
              const kept = prev.map((p) => listMap.get(String(p.id))).filter(Boolean);
              return kept.length > 0 ? kept : list.slice(0, Math.min(2, list.length));
            });
          }
        }
      } catch (err) {
        console.error('Failed to load stores by org:', err);
      } finally {
        if (isMounted) setLoadingStores(false);
      }
    };

    fetchStores();
    return () => {
      isMounted = false;
    };
  }, [selectedPlanId, planOrgId, planSubOutletId]);

  // Day multi-select handlers
  const handleToggleDay = (dayId) => {
    const idNum = Number(dayId);
    setSelectedDayIds((prev) =>
      prev.includes(idNum) ? prev.filter((d) => d !== idNum) : [...prev, idNum]
    );
  };

  const handleToggleAllDays = () => {
    if (selectedDayIds.length === availableDays.length) {
      setSelectedDayIds([]);
    } else {
      setSelectedDayIds(availableDays.map((d) => Number(d.id)).filter((id) => id > 0));
    }
  };

  // Shift multi-select handlers
  const handleToggleShift = (mealTypeId) => {
    const idNum = Number(mealTypeId);
    setSelectedMealTypeIds((prev) =>
      prev.includes(idNum) ? prev.filter((id) => id !== idNum) : [...prev, idNum]
    );
  };

  const handleToggleAllShifts = () => {
    if (selectedMealTypeIds.length === availableShifts.length) {
      setSelectedMealTypeIds([]);
    } else {
      setSelectedMealTypeIds(availableShifts.map((s) => Number(s.mealTypeId)).filter((id) => id > 0));
    }
  };

  // Plan selection handlers (single-select)
  const handleSelectPlan = (planId) => {
    lastInitializedPlanRef.current = null;
    setSelectedPlanId(planId);
    setSelectedDayIds([]);
    setSelectedMealTypeIds([]);
    setGeneratedRows([]);
    setIndentSummary(null);
    setResponseStores([]);
    setHasGenerated(false);
    setSelectedRowKeys(new Set());
    setPlanDropdownOpen(false);
  };

  const handleClearPlan = (e) => {
    e?.stopPropagation();
    lastInitializedPlanRef.current = null;
    lastStoreScopeKeyRef.current = '';
    setSelectedPlanId(null);
    setSelectedDayIds([]);
    setSelectedMealTypeIds([]);
    setStoreOptions([]);
    setSelectedStores([]);
    setGeneratedRows([]);
    setIndentSummary(null);
    setResponseStores([]);
    setHasGenerated(false);
    setSelectedRowKeys(new Set());
  };

  // Store toggling handler
  const handleToggleStore = (store) => {
    const storeKey = String(store.id);
    setSelectedStores((prev) => {
      const exists = prev.some((s) => String(s.id) === storeKey);
      if (exists) {
        return prev.filter((s) => String(s.id) !== storeKey);
      }
      return [...prev, store];
    });
  };

  const handleToggleAllStores = () => {
    if (selectedStores.length === storeOptions.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(storeOptions);
    }
  };

  const handleRemoveStore = (storeId, e) => {
    e?.stopPropagation();
    const storeKey = String(storeId);
    setSelectedStores((prev) => prev.filter((s) => String(s.id) !== storeKey));
  };

  // Generate Store Indent via API and populate below table
  const handleGenerateIndent = async () => {
    if (!selectedPlanId) {
      notify.error('Please select a Menu Plan first.');
      return;
    }
    if (selectedDayIds.length === 0) {
      notify.error('Please select at least one Menu Plan Day.');
      return;
    }
    if (selectedMealTypeIds.length === 0) {
      notify.error('Please select at least one Shift.');
      return;
    }
    const selectedStoreIds = selectedStores.map((s) => Number(s.id)).filter((id) => id > 0);
    if (selectedStoreIds.length === 0) {
      notify.error('Please select at least one Store.');
      return;
    }

    const targetDays = availableDays.filter((d) => selectedDayIds.includes(Number(d.id)));
    const menuPlanDayIds = targetDays.map((d) => Number(d.id)).filter((id) => id > 0);

    const matchedShiftIds = [];
    const matchedMealTypeIds = [];
    const seenShiftIds = new Set();
    const seenMealTypeIds = new Set();

    targetDays.forEach((day) => {
      if (!Array.isArray(day.shifts)) return;
      day.shifts.forEach((s) => {
        const mtId = Number(s.mealTypeId || s.id);
        if (!selectedMealTypeIds.includes(mtId)) return;
        if (mtId > 0 && !seenMealTypeIds.has(mtId)) {
          seenMealTypeIds.add(mtId);
          matchedMealTypeIds.push(mtId);
        }
        const sId = Number(s.id);
        if (sId > 0 && !seenShiftIds.has(sId)) {
          seenShiftIds.add(sId);
          matchedShiftIds.push(sId);
        }
      });
    });

    // If OrgId level only -> pass Store Selection IDs in storeSubOutletIds
    // If SubOutletId is present -> pass Store Selection IDs in storeSubLocationIds
    const hasSubOutlet = Boolean(planSubOutletId && Number(planSubOutletId) > 0);

    const payload = {
      includePipelineStock: Boolean(includePipelineStock),
      includePriorCommitments: true,
      includeRecipeBreakdown: false,
      mealTypeIds: matchedMealTypeIds.length > 0 ? matchedMealTypeIds : selectedMealTypeIds,
      menuPlanDayIds,
      menuPlanIds: [Number(selectedPlanId)],
      onlyShortfallItems: true,
      organizationId: Number(planOrgId) || 0,
      shiftIds: matchedShiftIds,
      storeSubLocationIds: hasSubOutlet ? selectedStoreIds : [],
      storeSubOutletIds: hasSubOutlet ? [] : selectedStoreIds,
    };

    setGeneratingIndent(true);
    try {
      const res = await GenerateStoreIndent(payload);
      const resData = res?.data?.data ?? res?.data ?? {};
      const rawList = extractIndentItemsList(resData);
      const apiSummary =
        resData?.summary && typeof resData.summary === 'object' ? resData.summary : null;
      const apiSelectedStores = Array.isArray(resData?.selectedStores)
        ? resData.selectedStores
        : [];

      const mappedRows = rawList.map((item, idx) => {
        const rmId = Number(item.rawMaterialId ?? item.materialId ?? item.id ?? idx + 1);
        const storeStocks = Array.isArray(item.storeStocks) ? item.storeStocks : [];
        const primaryStoreStock = storeStocks[0] || null;
        const storeId =
          primaryStoreStock?.storeId ??
          primaryStoreStock?.subLocationId ??
          primaryStoreStock?.subOutletId ??
          item.storeSubLocationId ??
          item.storeSubOutletId ??
          item.storeId ??
          item.subLocationId ??
          item.subOutletId ??
          null;
        const matchedStore = storeId
          ? selectedStores.find((s) => String(s.id) === String(storeId))
          : null;

        const requiredQty = Number(
          item.totalRequiredQty ??
          item.requiredQty ??
          item.grossRequiredQty ??
          item.plannedQty ??
          0
        );
        const liveStockQty = Number(item.liveStockQty ?? 0);
        const priorCommittedQty = Number(item.priorCommittedQty ?? 0);
        const totalAvailableQty = Number(item.totalAvailableQty ?? 0);
        const effectiveAvailableQty = Number(
          item.effectiveAvailableQty ??
          item.totalAvailableQty ??
          item.availableStock ??
          item.currentStock ??
          item.liveStockQty ??
          0
        );
        const totalSuggestedIssueQty = Number(item.totalSuggestedIssueQty ?? 0);
        const rawShortfallQty = Number(
          item.rawShortfallQty ?? Math.max(0, Number((requiredQty - effectiveAvailableQty).toFixed(3)))
        );
        const openPrQty = Number(item.openPrQty ?? 0);
        const openPoQty = Number(item.openPoQty ?? 0);
        const pipelineInboundQty = Number(
          item.pipelineInboundQty ?? item.pipelineStock ?? item.inPipelineQty ?? item.pipelineQty ?? 0
        );
        const netShortfallQty = Number(
          item.netShortfallQty ??
          item.shortfallQty ??
          item.shortfall ??
          Math.max(0, Number((requiredQty - effectiveAvailableQty).toFixed(3)))
        );
        const shortageQty = Number(
          item.shortfallQty ?? item.netShortfallQty ?? item.shortfall ?? netShortfallQty
        );
        const estimatedUnitRate = Number(item.estimatedUnitRate ?? 0);
        const estimatedRequiredCost = Number(item.estimatedRequiredCost ?? 0);
        const estimatedShortfallCost = Number(item.estimatedShortfallCost ?? 0);

        const uomSymbol =
          item.uomSymbol ??
          item.unitSymbol ??
          item.uomName ??
          item.unitName ??
          item.uom ??
          '';
        const uomName =
          item.uomName ??
          item.unitName ??
          item.uomSymbol ??
          item.unitSymbol ??
          item.uom ??
          '';

        const breakdown = Array.isArray(item.recipeBreakdown)
          ? item.recipeBreakdown
          : Array.isArray(item.breakdown)
            ? item.breakdown
            : Array.isArray(item.recipes)
              ? item.recipes
              : [];

        return {
          rowKey: `${rmId}-${storeId ?? idx}-${idx}`,
          id: rmId,
          rawMaterialId: rmId,
          rawMaterialName:
            item.rawMaterialName ?? item.materialName ?? item.itemName ?? item.name ?? 'Raw Material',
          rawMaterialCode: item.rawMaterialCode ?? item.materialCode ?? item.code ?? '',
          categoryId: item.categoryId ?? null,
          category:
            item.categoryName ?? item.rawMaterialCategoryName ?? item.category ?? 'General',
          requiredQty,
          totalAvailableQty,
          liveStockQty,
          priorCommittedQty,
          effectiveAvailableQty,
          availableStock: effectiveAvailableQty,
          totalSuggestedIssueQty,
          rawShortfallQty,
          openPrQty,
          openPoQty,
          pipelineStock: pipelineInboundQty,
          pipelineInboundQty,
          openProcurementReferences: Array.isArray(item.openProcurementReferences)
            ? item.openProcurementReferences
            : [],
          netShortfallQty,
          shortageQty,
          initialShortageQty: shortageQty,
          isShortfall: item.isShortfall ?? shortageQty > 0,
          estimatedUnitRate,
          estimatedRequiredCost,
          estimatedShortfallCost,
          storeStocks,
          uom: uomSymbol || uomName || 'KG',
          uomId: Number(item.uomId ?? item.unitId ?? item.purchaseUomId ?? item.baseUomId ?? 0),
          uomName: uomName || uomSymbol || 'KG',
          storeId: storeId ? Number(storeId) : null,
          store:
            item.storeName ??
            primaryStoreStock?.storeName ??
            apiSelectedStores[0]?.storeName ??
            item.subLocationName ??
            item.subOutletName ??
            matchedStore?.name ??
            selectedStores[idx % selectedStores.length]?.name ??
            selectedStores[0]?.name ??
            'Central Store',
          breakdown,
        };
      });

      setGeneratedRows(mappedRows);
      setIndentSummary(apiSummary);
      setResponseStores(apiSelectedStores);
      setHasGenerated(true);
      setSelectedRowKeys(new Set(mappedRows.map((r) => r.rowKey)));

      notify.success(
        mappedRows.length > 0
          ? `Store indent generated with ${mappedRows.length} item(s).`
          : 'No shortfall items found for the selected parameters.'
      );
    } catch (err) {
      console.error('Failed to generate store indent:', err);
      notify.error(
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to generate store indent.'
      );
    } finally {
      setGeneratingIndent(false);
    }
  };

  // Row selection & editing handlers
  const handleToggleRow = (rowKey) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (generatedRows.length > 0 && selectedRowKeys.size === generatedRows.length) {
      setSelectedRowKeys(new Set());
    } else {
      setSelectedRowKeys(new Set(generatedRows.map((r) => r.rowKey)));
    }
  };

  const handleShortageQtyChange = (rowKey, value) => {
    setGeneratedRows((prev) =>
      prev.map((row) => {
        if (row.rowKey !== rowKey) return row;
        if (value === '') {
          return { ...row, shortageQty: '' };
        }
        const parsed = Number(value);
        return {
          ...row,
          shortageQty: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
        };
      })
    );
  };

  const handleRowStoreChange = (rowKey, storeName) => {
    setGeneratedRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? { ...row, store: storeName } : row))
    );
  };

  // KPI summary calculations
  const totalItemsCount = indentSummary?.totalRawMaterialsCount ?? generatedRows.length;
  const totalRequiredQty = formatQty(
    generatedRows.reduce((sum, r) => sum + (Number(r.requiredQty) || 0), 0)
  );
  const totalShortageQty = formatQty(
    generatedRows.reduce((sum, r) => sum + (Number(r.shortageQty) || 0), 0)
  );
  const totalEstimatedRequiredCost =
    indentSummary?.totalEstimatedRequiredCost !== undefined
      ? Number(indentSummary.totalEstimatedRequiredCost)
      : generatedRows.reduce((sum, r) => sum + (Number(r.estimatedRequiredCost) || 0), 0);

  const getRowShortfallCost = (row) => {
    const qty = Number(row.shortageQty) || 0;
    if (Number(row.estimatedUnitRate) > 0) {
      return qty * Number(row.estimatedUnitRate);
    }
    if (qty === Number(row.initialShortageQty)) {
      return Number(row.estimatedShortfallCost) || 0;
    }
    return 0;
  };

  const totalEstimatedShortfallCost = generatedRows.reduce(
    (sum, r) => sum + getRowShortfallCost(r),
    0
  );

  const inStockCount = generatedRows.filter((r) => (Number(r.shortageQty) || 0) === 0).length;
  const shortageCount = generatedRows.filter((r) => (Number(r.shortageQty) || 0) > 0).length;

  const selectedItems = useMemo(
    () => generatedRows.filter((r) => selectedRowKeys.has(r.rowKey)),
    [generatedRows, selectedRowKeys]
  );

  // Export to CSV
  const handleExportCSV = () => {
    if (generatedRows.length === 0) {
      notify.error('No raw materials to export.');
      return;
    }

    const headers = [
      'S.No',
      'Raw Material',
      'Category',
      'Required Qty',
      'Available Stock',
      'Pipeline Inbound',
      'Shortage Qty',
      'Unit',
      'Est. Rate',
      'Est. Shortfall Cost',
      'Store',
    ];
    const rows = generatedRows.map((r, idx) => [
      idx + 1,
      `"${r.rawMaterialName}"`,
      `"${r.category}"`,
      r.requiredQty,
      r.availableStock,
      r.pipelineInboundQty || 0,
      Number(r.shortageQty) || 0,
      r.uom,
      r.estimatedUnitRate || 0,
      getRowShortfallCost(r).toFixed(2),
      `"${r.store}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Store_Indent_Requirements_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Raw material requirements exported successfully.');
  };

  // Open Purchase Requisition Modal
  const handleOpenPrModal = () => {
    if (selectedItems.length === 0) {
      notify.error('Please select at least one item to generate a Purchase Requisition.');
      return;
    }
    const hasPositiveQty = selectedItems.some((item) => Number(item.shortageQty) > 0);
    if (!hasPositiveQty) {
      notify.error('Selected items must have Shortage Qty greater than 0.');
      return;
    }
    setPrRequiredDate((prev) => prev || getTodayInputDate());
    setPrRemarks(
      `Generated from Store Indent${selectedPlan?.planCode ? ` (${selectedPlan.planCode})` : ''}`
    );
    setIsPrModalOpen(true);
  };

  // Directly call Purchase Requisition API
  const handleConfirmGeneratePR = async (e) => {
    e?.preventDefault();
    const today = getTodayInputDate();
    if (!prRequiredDate) {
      notify.error('Please select Required Date for the Purchase Requisition.');
      return;
    }
    if (prRequiredDate < today) {
      notify.error('Required Date cannot be earlier than today.');
      return;
    }

    const validItems = selectedItems.filter((item) => Number(item.shortageQty) > 0);
    if (validItems.length === 0) {
      notify.error('Please ensure selected items have Shortage Qty greater than 0.');
      return;
    }

    setGeneratingPr(true);
    try {
      const primarySelectedStore = selectedStores[0] || null;
      const matchedRespStore = primarySelectedStore
        ? responseStores.find(
            (rs) =>
              String(rs.subOutletId ?? rs.storeId ?? '') === String(primarySelectedStore.id)
          ) || responseStores[0]
        : responseStores[0] || null;

      const selectedStoreSubOutletId =
        matchedRespStore?.subOutletId && Number(matchedRespStore.subOutletId) > 0
          ? Number(matchedRespStore.subOutletId)
          : primarySelectedStore?.id &&
              !Number.isNaN(Number(primarySelectedStore.id)) &&
              Number(primarySelectedStore.id) > 0
            ? Number(primarySelectedStore.id)
            : matchedRespStore?.storeId && Number(matchedRespStore.storeId) > 0
              ? Number(matchedRespStore.storeId)
              : null;

      const resolvedSubOutletId = planSubOutletId
        ? Number(planSubOutletId)
        : selectedStoreSubOutletId;

      // Resolve missing uomId from Raw Material master if Store Indent API didn't include uomId
      let itemsWithUom = validItems;
      const needsUomLookup = validItems.some((item) => !item.uomId || Number(item.uomId) <= 0);
      if (needsUomLookup) {
        try {
          const rmRes = await getAllRawMaterialItems(
            null,
            0,
            true,
            '',
            '',
            '',
            planOrgId || '',
            resolvedSubOutletId || ''
          );
          const rmList =
            rmRes?.data?.data?.['Raw Material Details'] ||
            rmRes?.data?.['Raw Material Details'] ||
            [];
          if (Array.isArray(rmList) && rmList.length > 0) {
            const rmMap = new Map(rmList.map((rm) => [Number(rm.id), rm]));
            itemsWithUom = validItems.map((item) => {
              if (item.uomId && Number(item.uomId) > 0) return item;
              const matched = rmMap.get(Number(item.rawMaterialId));
              if (!matched) return item;
              const resolvedUomId =
                matched.currentStock?.unitId ?? matched.unitId ?? matched.unit?.id ?? 0;
              const resolvedUomName =
                matched.currentStock?.unitName ||
                matched.currentStock?.unitSymbol ||
                matched.unit?.nameEnglish ||
                matched.unit?.symbolEnglish ||
                matched.unitName ||
                item.uomName ||
                item.uom;
              return {
                ...item,
                uomId: Number(resolvedUomId) || 0,
                uomName: resolvedUomName,
              };
            });
          }
        } catch (lookupErr) {
          console.error('Failed to look up raw material UOMs:', lookupErr);
        }
      }

      const missingUomItem = itemsWithUom.find((item) => !item.uomId || Number(item.uomId) <= 0);
      if (missingUomItem) {
        notify.error(
          `Unit (UOM ID) is missing for "${missingUomItem.rawMaterialName}". Cannot generate Purchase Requisition.`
        );
        return;
      }

      const outletObj = units.find((u) => Number(u.id) === Number(planOrgId));
      const subOutletsList = planOrgId && getSubOutlets ? getSubOutlets(planOrgId) : [];
      const subOutletObj = resolvedSubOutletId
        ? (subOutletsList || []).find((s) => Number(s.id) === Number(resolvedSubOutletId))
        : null;
      const resolvedSubOutletName = resolvedSubOutletId
        ? subOutletObj?.name ||
          subOutletObj?.subOutletName ||
          (planSubOutletId ? selectedPlan?.subOutletName : null) ||
          matchedRespStore?.storeName ||
          primarySelectedStore?.name ||
          null
        : null;

      const prPayload = {
        actionBy: getUsernameFromToken(),
        userId: getUserIdFromToken(),
        outletId: Number(planOrgId),
        outletName: outletObj?.name || selectedPlan?.organizationName || '',
        outletShortCode: outletObj?.code || '',
        subOutletId: resolvedSubOutletId,
        subOutletName: resolvedSubOutletName,
        prDate: today,
        prRequiredDate,
        remarks: formatRemarks(
          prRemarks ||
          `Generated from Store Indent${selectedPlan?.planCode ? ` (${selectedPlan.planCode})` : ''}`
        ),
        status: PR_STATUS.PENDING,
        details: itemsWithUom.map((item) => ({
          id: 0,
          quantity: Number(item.shortageQty),
          rawMaterialId: Number(item.rawMaterialId),
          rawMaterialName: item.rawMaterialName,
          uomId: Number(item.uomId),
          uomName: item.uomName || item.uom,
        })),
      };

      const prRes = await createPurchaseRequisition(prPayload);
      const createdPr = prRes?.data?.data ?? prRes?.data;
      const prCode = createdPr?.prCode;

      notify.success(
        prCode
          ? `Purchase Requisition ${prCode} generated successfully!`
          : 'Purchase Requisition generated successfully!'
      );
      setIsPrModalOpen(false);
    } catch (err) {
      console.error('Failed to generate Purchase Requisition:', err);
      notify.error(
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to generate Purchase Requisition.'
      );
    } finally {
      setGeneratingPr(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-5 py-4 pb-12">
        {/* ========================================================= */}
        {/* TOP HEADER */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center border border-blue-100 shrink-0 shadow-2xs">
              <ChefHat size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Generate Store Indent – Raw Material Requirement
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Select approved menu plans, days, shifts, and stores to generate raw material requirements.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 1: MENU PLAN SELECTION CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Boxes size={16} className="text-[#084E92]" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                Menu Plan Selection
              </h2>
            </div>

            {/* Include Pipeline Stock Toggle */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Include Pipeline Stock
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={includePipelineStock}
                onClick={() => setIncludePipelineStock((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${includePipelineStock ? 'bg-[#084E92]' : 'bg-slate-300'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${includePipelineStock ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </button>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${includePipelineStock
                  ? 'bg-blue-50 text-[#084E92]'
                  : 'bg-slate-200 text-slate-600'
                  }`}
              >
                {includePipelineStock ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Grid of 3 Filters: Menu Plan, Days (Multi), Shifts (Multi) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Menu Plan Single-Select */}
            <div className="relative" ref={planDropdownRef}>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Select Menu Plan
              </label>

              <div
                onClick={() => setPlanDropdownOpen((prev) => !prev)}
                className="min-h-10 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer bg-white hover:border-slate-300 transition shadow-2xs"
              >
                {!selectedPlan ? (
                  <span className="text-xs text-slate-400">
                    {loadingPlans ? 'Loading plans...' : 'Select Menu Plan...'}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded-md border border-blue-100 truncate">
                      <span>{selectedPlan.planCode}</span>
                      <X
                        size={12}
                        className="cursor-pointer hover:text-red-500"
                        onClick={handleClearPlan}
                      />
                    </span>
                    {selectedPlan.status && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {selectedPlan.status}
                      </span>
                    )}
                  </div>
                )}
                <div className="ml-auto text-slate-400 pl-1 shrink-0">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Menu Plan Dropdown List */}
              {planDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search menu plan..."
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                      className="w-full text-xs bg-transparent focus:outline-none text-slate-700"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
                    {allMenuPlans.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        {loadingPlans ? 'Fetching plans...' : 'No menu plans found.'}
                      </div>
                    ) : (
                      allMenuPlans
                        .filter(
                          (p) =>
                            !planSearch ||
                            (p.planCode || '').toLowerCase().includes(planSearch.toLowerCase()) ||
                            (p.organizationName || '')
                              .toLowerCase()
                              .includes(planSearch.toLowerCase())
                        )
                        .map((plan) => {
                          const isSelected = selectedPlanId === plan.id;
                          return (
                            <div
                              key={plan.id}
                              onClick={() => handleSelectPlan(plan.id)}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${isSelected
                                ? 'bg-blue-50 text-[#084E92] font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                              <div>
                                <div className="font-bold flex items-center gap-1.5">
                                  <span>{plan.planCode}</span>
                                  {plan.status && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                                      {plan.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {plan.organizationName || 'Unit'} •{' '}
                                  {formatDateDisplay(plan.fromDate)} -{' '}
                                  {formatDateDisplay(plan.toDate)}
                                </div>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border ${isSelected
                                  ? 'bg-[#084E92] border-[#084E92] text-white'
                                  : 'border-slate-300'
                                  }`}
                              >
                                {isSelected && <Check size={11} className="stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Menu Plan Days Multi-Select */}
            <div className="relative" ref={dayDropdownRef}>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-[#084E92]" />
                Menu Plan Days (Multi-Select)
              </label>

              <div
                onClick={() => {
                  if (!selectedPlanId || loadingDetails) return;
                  setDayDropdownOpen((prev) => !prev);
                }}
                className={`min-h-10 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 transition shadow-2xs ${!selectedPlanId || loadingDetails
                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:border-slate-300 cursor-pointer'
                  }`}
              >
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                  {!selectedPlanId ? (
                    <span className="text-xs text-slate-400">Select menu plan first</span>
                  ) : loadingDetails ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin text-[#084E92]" />
                      Loading days...
                    </span>
                  ) : selectedDayIds.length === 0 ? (
                    <span className="text-xs text-slate-400">Select days...</span>
                  ) : selectedDayIds.length === availableDays.length && availableDays.length > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded-md border border-blue-100">
                      All Days ({availableDays.length})
                    </span>
                  ) : (
                    <>
                      {availableDays
                        .filter((d) => selectedDayIds.includes(Number(d.id)))
                        .slice(0, 2)
                        .map((day) => (
                          <span
                            key={day.id}
                            className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-blue-100"
                          >
                            <span>{formatDateDisplay(day.planDate)}</span>
                            <X
                              size={11}
                              className="cursor-pointer hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDay(day.id);
                              }}
                            />
                          </span>
                        ))}
                      {selectedDayIds.length > 2 && (
                        <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 px-1.5 py-0.5 rounded">
                          +{selectedDayIds.length - 2} more
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="ml-auto text-slate-400 pl-1 shrink-0">
                  <ChevronDown size={14} />
                </div>
              </div>

              {dayDropdownOpen && selectedPlanId && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
                  <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-600">
                      {selectedDayIds.length} of {availableDays.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleAllDays}
                      className="text-[11px] font-bold text-[#084E92] hover:underline cursor-pointer"
                    >
                      {selectedDayIds.length === availableDays.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
                    {availableDays.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No days configured for this plan.
                      </div>
                    ) : (
                      availableDays.map((day, dIdx) => {
                        const isSelected = selectedDayIds.includes(Number(day.id));
                        return (
                          <div
                            key={day.uniqueKey || dIdx}
                            onClick={() => handleToggleDay(day.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${isSelected
                              ? 'bg-blue-50 text-[#084E92] font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <span>
                              {formatDateDisplay(day.planDate)}{' '}
                              {day.dayOfWeek ? `(${day.dayOfWeek})` : ''}
                            </span>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected
                                ? 'bg-[#084E92] border-[#084E92] text-white'
                                : 'border-slate-300'
                                }`}
                            >
                              {isSelected && <Check size={11} className="stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Shifts Multi-Select */}
            <div className="relative" ref={shiftDropdownRef}>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                <Utensils size={12} className="text-[#084E92]" />
                Shifts (Multi-Select)
              </label>

              <div
                onClick={() => {
                  if (!selectedPlanId || loadingDetails) return;
                  setShiftDropdownOpen((prev) => !prev);
                }}
                className={`min-h-10 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 transition shadow-2xs ${!selectedPlanId || loadingDetails
                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:border-slate-300 cursor-pointer'
                  }`}
              >
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                  {!selectedPlanId ? (
                    <span className="text-xs text-slate-400">Select menu plan first</span>
                  ) : loadingDetails ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin text-[#084E92]" />
                      Loading shifts...
                    </span>
                  ) : selectedMealTypeIds.length === 0 ? (
                    <span className="text-xs text-slate-400">Select shifts...</span>
                  ) : selectedMealTypeIds.length === availableShifts.length &&
                    availableShifts.length > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded-md border border-blue-100">
                      All Shifts ({availableShifts.length})
                    </span>
                  ) : (
                    <>
                      {availableShifts
                        .filter((s) => selectedMealTypeIds.includes(Number(s.mealTypeId)))
                        .slice(0, 2)
                        .map((shift) => (
                          <span
                            key={shift.mealTypeId}
                            className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-blue-100"
                          >
                            <span>{shift.mealTypeName}</span>
                            <X
                              size={11}
                              className="cursor-pointer hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleShift(shift.mealTypeId);
                              }}
                            />
                          </span>
                        ))}
                      {selectedMealTypeIds.length > 2 && (
                        <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 px-1.5 py-0.5 rounded">
                          +{selectedMealTypeIds.length - 2} more
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="ml-auto text-slate-400 pl-1 shrink-0">
                  <ChevronDown size={14} />
                </div>
              </div>

              {shiftDropdownOpen && selectedPlanId && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
                  <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-600">
                      {selectedMealTypeIds.length} of {availableShifts.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleAllShifts}
                      className="text-[11px] font-bold text-[#084E92] hover:underline cursor-pointer"
                    >
                      {selectedMealTypeIds.length === availableShifts.length
                        ? 'Clear All'
                        : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
                    {availableShifts.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No shifts found for selected days.
                      </div>
                    ) : (
                      availableShifts.map((shift) => {
                        const isSelected = selectedMealTypeIds.includes(Number(shift.mealTypeId));
                        return (
                          <div
                            key={shift.mealTypeId}
                            onClick={() => handleToggleShift(shift.mealTypeId)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${isSelected
                              ? 'bg-blue-50 text-[#084E92] font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <span>{shift.mealTypeName}</span>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected
                                ? 'bg-[#084E92] border-[#084E92] text-white'
                                : 'border-slate-300'
                                }`}
                            >
                              {isSelected && <Check size={11} className="stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: STORE SELECTION & GENERATE CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-[#084E92]" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                Store Selection
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {planSubOutletId ? 'Sub-Location Level' : 'Sub-Outlet Level'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleGenerateIndent}
              disabled={generatingIndent || loadingDetails || !selectedPlanId}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {generatingIndent ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left 8 Cols: Multi-Store Picker */}
            <div className="lg:col-span-8">
              <div className="relative" ref={storeDropdownRef}>
                <div
                  onClick={() => setStoreDropdownOpen((prev) => !prev)}
                  className="min-h-10 border border-slate-200 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer bg-white hover:border-slate-300 transition shadow-2xs"
                >
                  {selectedStores.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      {loadingStores ? 'Loading stores...' : 'Select stores...'}
                    </span>
                  ) : (
                    selectedStores.map((store) => (
                      <span
                        key={store.id}
                        className="inline-flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-100"
                      >
                        <span>{store.name}</span>
                        <X
                          size={12}
                          className="cursor-pointer hover:text-red-500"
                          onClick={(e) => handleRemoveStore(store.id, e)}
                        />
                      </span>
                    ))
                  )}
                  <div className="ml-auto text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* Store Dropdown List */}
                {storeDropdownOpen && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                      <Search size={14} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search store..."
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="w-full text-xs bg-transparent focus:outline-none text-slate-700"
                      />
                      {storeOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={handleToggleAllStores}
                          className="text-[11px] font-bold text-[#084E92] hover:underline shrink-0 cursor-pointer"
                        >
                          {selectedStores.length === storeOptions.length ? 'Clear All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
                      {storeOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">
                          {loadingStores
                            ? 'Fetching stores...'
                            : 'No stores found for selected category.'}
                        </div>
                      ) : (
                        storeOptions
                          .filter(
                            (s) =>
                              !storeSearch ||
                              (s.name || '').toLowerCase().includes(storeSearch.toLowerCase()) ||
                              (s.code || '').toLowerCase().includes(storeSearch.toLowerCase())
                          )
                          .map((store) => {
                            const isSelected = selectedStores.some(
                              (s) => String(s.id) === String(store.id)
                            );
                            return (
                              <div
                                key={String(store.id)}
                                onClick={() => handleToggleStore(store)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${isSelected
                                  ? 'bg-blue-50 text-[#084E92] font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                              >
                                <div>
                                  <div className="font-bold">{store.name}</div>
                                  {store.code && (
                                    <div className="text-[10px] text-slate-400">{store.code}</div>
                                  )}
                                </div>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected
                                    ? 'bg-[#084E92] border-[#084E92] text-white'
                                    : 'border-slate-300'
                                    }`}
                                >
                                  {isSelected && <Check size={11} className="stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Selected Stores Info Box */}
            <div className="lg:col-span-4">
              <div className="border border-blue-100 bg-[#EFF4FF]/70 rounded-xl p-3.5 flex items-start gap-2.5">
                <Info size={16} className="text-[#084E92] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-[#084E92]">Selected Stores</div>
                  <div className="text-slate-700 font-semibold mt-0.5">
                    {selectedStores.length} Stores Selected
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                    ({selectedStores.map((s) => s.name).join(', ') || 'None'})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: RAW MATERIAL REQUIREMENT TABLE & SUMMARY */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Table: Left 9 Cols */}
          <div className="lg:col-span-9 min-w-0 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-[#084E92]" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  Raw Material Requirement
                </h2>
                {generatingIndent && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 size={12} className="animate-spin text-[#084E92]" />
                    Generating...
                  </span>
                )}
              </div>

              {/* Action Buttons: Refresh, Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchMenuPlans()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition cursor-pointer shadow-2xs"
                >
                  <RotateCw size={12} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition cursor-pointer shadow-2xs"
                >
                  <Download size={12} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
              <div className="w-full overflow-x-auto show-scrollbar">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            generatedRows.length > 0 &&
                            selectedRowKeys.size === generatedRows.length
                          }
                          onChange={handleToggleSelectAll}
                          className="w-3.5 h-3.5 accent-[#084E92] rounded cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center">S.No</th>
                      <th className="py-2.5 px-3">Raw Material</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Required Qty</th>
                      <th className="py-2.5 px-3 text-right">Available Stock</th>
                      <th className="py-2.5 px-3 text-right">Shortage Qty</th>
                      <th className="py-2.5 px-3 text-right">Est. Cost</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3">Store</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {generatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                          {generatingIndent
                            ? 'Generating store indent raw material requirements...'
                            : hasGenerated
                              ? 'No shortfall raw materials returned for the selected filters.'
                              : 'Select Menu Plan, Days, Shifts, and Stores, then click "Generate" to view raw material requirements.'}
                        </td>
                      </tr>
                    ) : (
                      generatedRows.map((row, idx) => {
                        const isSelected = selectedRowKeys.has(row.rowKey);
                        const numericShortage = Number(row.shortageQty) || 0;
                        const hasShortage = numericShortage > 0;
                        const rowCost = getRowShortfallCost(row);
                        const procRefs = Array.isArray(row.openProcurementReferences)
                          ? row.openProcurementReferences
                          : [];
                        const hasProcRefs = procRefs.length > 0;
                        const isProcExpanded = Boolean(expandedProcRows[row.rowKey]);

                        return (
                          <React.Fragment key={row.rowKey}>
                          <tr
                            className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-blue-50/20' : ''
                              }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRow(row.rowKey)}
                                className="w-3.5 h-3.5 accent-[#084E92] rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center font-medium text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingMaterial(row)}
                                  title="Click to view stock & requirement details"
                                  className="text-left font-bold text-[#084E92] hover:text-[#00376C] hover:underline cursor-pointer transition-colors"
                                >
                                  {row.rawMaterialName}
                                </button>
                                {hasProcRefs && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProcRow(row.rowKey)}
                                    title={
                                      isProcExpanded
                                        ? 'Collapse open procurement references'
                                        : 'Expand open procurement references'
                                    }
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200 hover:bg-blue-100 cursor-pointer transition shrink-0"
                                  >
                                    <span>
                                      {procRefs.length} {procRefs.length === 1 ? 'Ref' : 'Refs'}
                                    </span>
                                    {isProcExpanded ? (
                                      <ChevronUp size={11} />
                                    ) : (
                                      <ChevronDown size={11} />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {row.rawMaterialCode && (
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {row.rawMaterialCode}
                                  </span>
                                )}
                                {row.estimatedUnitRate > 0 && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    Rate: {formatCurrencyINR(row.estimatedUnitRate)}/{row.uom}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{row.category}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatQty(row.requiredQty)} {row.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">
                              <div>
                                {formatQty(row.availableStock)} {row.uom}
                              </div>
                              {row.priorCommittedQty > 0 && (
                                <div className="text-[10px] text-amber-600 font-medium">
                                  Committed: {formatQty(row.priorCommittedQty)} {row.uom}
                                </div>
                              )}
                              {row.pipelineInboundQty > 0 && (
                                <div className="text-[10px] text-[#084E92] font-medium">
                                  Pipeline: {formatQty(row.pipelineInboundQty)} {row.uom}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold whitespace-nowrap">
                              {isSelected ? (
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.shortageQty}
                                    onChange={(e) =>
                                      handleShortageQtyChange(row.rowKey, e.target.value)
                                    }
                                    className="w-22 h-7 px-2 text-right text-xs font-bold border border-blue-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                                  />
                                  <span className="text-[11px] font-medium text-slate-500">
                                    {row.uom}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={hasShortage ? 'text-red-500' : 'text-emerald-600'}
                                >
                                  {formatQty(row.shortageQty)} {row.uom}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                              {rowCost > 0 ? formatCurrencyINR(rowCost) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                              {row.uom}
                            </td>
                            <td className="py-2.5 px-3">
                              {Array.isArray(row.storeStocks) && row.storeStocks.length > 0 ? (
                                <select
                                  value={row.store}
                                  onChange={(e) =>
                                    handleRowStoreChange(row.rowKey, e.target.value)
                                  }
                                  className="w-36 h-7 text-xs border border-slate-200 rounded-md bg-white px-2 focus:outline-none focus:border-[#084E92] text-slate-800"
                                >
                                  {row.storeStocks.map((st, sIdx) => (
                                    <option
                                      key={String(st.storeId ?? st.subOutletId ?? st.subLocationId ?? sIdx)}
                                      value={st.storeName}
                                    >
                                      {st.storeName} ({formatQty(st.availableQty)} {st.uomSymbol || row.uom})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={row.store}
                                  onChange={(e) =>
                                    handleRowStoreChange(row.rowKey, e.target.value)
                                  }
                                  className="w-36 h-7 text-xs border border-slate-200 rounded-md bg-white px-2 focus:outline-none focus:border-[#084E92] text-slate-800"
                                >
                                  {selectedStores.map((st) => (
                                    <option key={String(st.id)} value={st.name}>
                                      {st.name}
                                    </option>
                                  ))}
                                  {!selectedStores.some((st) => st.name === row.store) && (
                                    <option value={row.store}>{row.store}</option>
                                  )}
                                </select>
                              )}
                            </td>
                          </tr>
                          {hasProcRefs && isProcExpanded && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={10} className="px-4 py-3">
                                <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProcRow(row.rowKey)}
                                    className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 text-left cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                                      <span className="text-xs font-bold text-slate-800">
                                        Open Procurement References ({procRefs.length})
                                      </span>
                                    </div>
                                    <ChevronUp size={14} className="text-slate-500" />
                                  </button>
                                  <div className="p-2">
                                    <OpenProcurementReferencesTable
                                      references={procRefs}
                                      fallbackUom={row.uom}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Generate Purchase Requisition Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                {selectedRowKeys.size} of {generatedRows.length} raw materials selected.
              </span>

              <button
                type="button"
                onClick={handleOpenPrModal}
                disabled={generatingPr || selectedRowKeys.size === 0 || generatedRows.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={14} />
                <span>Purchase Requisition ({selectedRowKeys.size} Items)</span>
              </button>
            </div>
          </div>

          {/* Requirement Summary Card: Right 3 Cols */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChartIcon size={16} className="text-[#084E92]" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                Requirement Summary
              </h2>
            </div>

            {indentSummary && (
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2 text-[11px] font-semibold text-[#084E92] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{indentSummary.includedPlansCount ?? 1} Plan</span>
                <span>•</span>
                <span>{indentSummary.includedDaysCount ?? 0} Day(s)</span>
                <span>•</span>
                <span>{indentSummary.includedShiftsCount ?? 0} Shift(s)</span>
                <span>•</span>
                <span>{indentSummary.includedRecipesCount ?? 0} Recipe(s)</span>
              </div>
            )}

            {/* Metric Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <Utensils size={14} className="text-slate-400" />
                  Total Items
                </span>
                <span className="font-extrabold text-slate-900">{totalItemsCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  Total Required Qty
                </span>
                <span className="font-extrabold text-slate-900">{totalRequiredQty}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  Total Shortage Qty
                </span>
                <span className="font-black text-red-500">{totalShortageQty}</span>
              </div>

              <div className="border-t border-slate-100 pt-2.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Est. Required Cost</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrencyINR(totalEstimatedRequiredCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Est. Shortfall Cost</span>
                  <span className="font-extrabold text-[#084E92]">
                    {formatCurrencyINR(totalEstimatedShortfallCost)}
                  </span>
                </div>
                {indentSummary &&
                  ((indentSummary.totalOpenPrCount || 0) > 0 ||
                    (indentSummary.totalOpenPoCount || 0) > 0) && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Open PR / PO</span>
                      <span className="font-semibold text-slate-700">
                        {indentSummary.totalOpenPrCount || 0} PR •{' '}
                        {indentSummary.totalOpenPoCount || 0} PO
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {responseStores.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Evaluated Stores ({responseStores.length})
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {responseStores.map((st) => (
                    <span
                      key={String(st.storeId ?? st.subOutletId ?? st.subLocationId ?? st.storeName)}
                      className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                    >
                      {st.storeName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status Box */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-2 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Stock Status</span>
              </div>
              <div className="space-y-1 text-xs font-semibold pl-5">
                <div className="text-emerald-700">
                  {indentSummary?.sufficientItemsCount ?? inStockCount} Sufficient Items
                </div>
                {(indentSummary?.netShortfallItemsCount ?? shortageCount) > 0 && (
                  <div className="text-red-600">
                    {indentSummary?.netShortfallItemsCount ?? shortageCount} Net Shortfall Items
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GENERATE PURCHASE REQUISITION MODAL (REQUIRED DATE) */}
        {/* ========================================================= */}
        {isPrModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmGeneratePR}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Generate Purchase Requisition
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Specify the required delivery date for the selected {selectedItems.length} item(s).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !generatingPr && setIsPrModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Required Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={getTodayInputDate()}
                      value={prRequiredDate}
                      onChange={(e) => setPrRequiredDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#084E92]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      PR Date
                    </label>
                    <input
                      type="date"
                      disabled
                      value={getTodayInputDate()}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={prRemarks}
                    onChange={(e) => setPrRemarks(e.target.value)}
                    placeholder="Enter remarks (optional)"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#084E92]"
                  />
                </div>

                {/* Selected Items Summary */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Selected Items ({selectedItems.filter((i) => Number(i.shortageQty) > 0).length})
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Raw Material</th>
                          <th className="py-2 px-3 text-right">Shortage Qty</th>
                          <th className="py-2 px-3 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((item) => (
                          <tr key={item.rowKey}>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {item.rawMaterialName}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#084E92]">
                              {Number(item.shortageQty) || 0}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">
                              {item.uomName || item.uom}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  disabled={generatingPr}
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingPr}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#084E92] hover:bg-[#00376C] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {generatingPr ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating PR...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={14} />
                      <span>Generate Purchase Requisition</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW BREAKDOWN MODAL */}
        {/* ========================================================= */}
        {viewingMaterial && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Package size={18} className="text-[#084E92]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {viewingMaterial.rawMaterialName} – Stock & Requirement Details
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Category: {viewingMaterial.category} • Unit: {viewingMaterial.uom}
                      {viewingMaterial.estimatedUnitRate > 0
                        ? ` • Est. Rate: ${formatCurrencyINR(viewingMaterial.estimatedUnitRate)}/${viewingMaterial.uom}`
                        : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingMaterial(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Total Required
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatQty(viewingMaterial.requiredQty)} {viewingMaterial.uom}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Effective Available
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {formatQty(viewingMaterial.availableStock)} {viewingMaterial.uom}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Live: {formatQty(viewingMaterial.liveStockQty)} • Comm:{' '}
                      {formatQty(viewingMaterial.priorCommittedQty)}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Pipeline Inbound
                    </span>
                    <span className="text-sm font-bold text-[#084E92]">
                      {formatQty(viewingMaterial.pipelineInboundQty)} {viewingMaterial.uom}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PR: {formatQty(viewingMaterial.openPrQty)} • PO:{' '}
                      {formatQty(viewingMaterial.openPoQty)}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Net Shortage
                    </span>
                    <span
                      className={`text-sm font-black ${Number(viewingMaterial.shortageQty) > 0
                        ? 'text-red-500'
                        : 'text-emerald-600'
                        }`}
                    >
                      {formatQty(viewingMaterial.shortageQty)} {viewingMaterial.uom}
                    </span>
                    {getRowShortfallCost(viewingMaterial) > 0 && (
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Est. {formatCurrencyINR(getRowShortfallCost(viewingMaterial))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Store-wise Stock Availability */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    Store-wise Stock Breakdown
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Store Name</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Current</th>
                          <th className="py-2 px-3 text-right">Reserved</th>
                          <th className="py-2 px-3 text-right">Available</th>
                          <th className="py-2 px-3 text-right">Suggested Issue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!viewingMaterial.storeStocks || viewingMaterial.storeStocks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-5 text-center text-slate-400">
                              No store stock records returned.
                            </td>
                          </tr>
                        ) : (
                          viewingMaterial.storeStocks.map((ss, ssIdx) => (
                            <tr
                              key={String(ss.storeId ?? ss.subOutletId ?? ss.subLocationId ?? ssIdx)}
                              className="hover:bg-slate-50/50"
                            >
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {ss.storeName}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">
                                {ss.storeType || '—'}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700">
                                {formatQty(ss.currentQty)} {ss.uomSymbol || viewingMaterial.uom}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700">
                                {formatQty(ss.reservedQty)} {ss.uomSymbol || viewingMaterial.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {formatQty(ss.availableQty)} {ss.uomSymbol || viewingMaterial.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-[#084E92]">
                                {formatQty(ss.suggestedIssueQty)} {ss.uomSymbol || viewingMaterial.uom}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Open Procurement References Table */}
                {Array.isArray(viewingMaterial.openProcurementReferences) &&
                  viewingMaterial.openProcurementReferences.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2">
                        Open Procurement References ({viewingMaterial.openProcurementReferences.length})
                      </h4>
                      <OpenProcurementReferencesTable
                        references={viewingMaterial.openProcurementReferences}
                        fallbackUom={viewingMaterial.uom}
                      />
                    </div>
                  )}

                {/* Contributing Recipes Table */}
                {Array.isArray(viewingMaterial.breakdown) &&
                  viewingMaterial.breakdown.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2">
                        Contributing Menu Plans & Recipes
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                            <tr>
                              <th className="py-2 px-3">Menu Plan</th>
                              <th className="py-2 px-3">Date & Shift</th>
                              <th className="py-2 px-3">Recipe / Dish</th>
                              <th className="py-2 px-3 text-right">PAX</th>
                              <th className="py-2 px-3 text-right">Contributing Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewingMaterial.breakdown.map((b, bIdx) => (
                              <tr key={bIdx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-bold text-[#084E92]">
                                  {b.planCode || selectedPlan?.planCode || '—'}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {formatDateDisplay(b.planDate)} •{' '}
                                  {b.shiftName || b.mealTypeName || '—'}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-900">
                                  {b.recipeName || b.kitchenMenuItemName || '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600">
                                  {b.pax ?? '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  {formatQty(b.qty ?? b.requiredQty ?? 0)}{' '}
                                  {b.uom || viewingMaterial.uom}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setViewingMaterial(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

// Simple bar chart icon helper
const BarChartIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default StoreIndent;
