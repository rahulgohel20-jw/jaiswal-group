import { useNavigate, useParams, useLocation } from 'react-router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ScrollText,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import {
  getAllRawMaterialItems,
  getCurrentStockListGet,
  getAllSubOutletsByOrganization,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getUserIdFromToken } from '@/utils/auth';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePurchaseRequisitions } from './utils/usePurchaseRequisitions';
import { PR_STATUS, getStatusLabel } from './utils/prStatus';
import PurchaseRequisitionLog from './PurchaseRequisitionLog';
import { getUsernameFromToken } from '../../utils/auth';
import { getTodayInputDate } from '../../utils/GetCurrentToday';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import SearchableSelect from '@/utils/SearchableSelect';
import OutletChangeConfirmModal from '@/utils/OutletChangeConfirmModal';
import RawMaterialSearchPicker from '@/components/common/RawMaterialSearchPicker';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const errorInputCls =
  'w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300';

const labelCls = 'text-sm font-medium text-gray-700 mb-1.5 block';

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const getAvailableStock = (item) => {
  if (typeof item?.currentStock === 'object' && item?.currentStock !== null) {
    return Number(item.currentStock.currentStock ?? 0);
  }
  if (typeof item?.currentStock === 'number') {
    return Number(item.currentStock);
  }
  if (item?.availableStock != null) {
    return Number(item.availableStock);
  }
  return 0;
};

const getStockTone = (stock, minStock) => {
  if (stock == null) return { dot: 'bg-gray-300', text: 'text-gray-400' };
  if (minStock && stock <= minStock) return { dot: 'bg-red-500', text: 'text-gray-700' };
  if (minStock && stock <= minStock * 2) return { dot: 'bg-amber-500', text: 'text-gray-700' };
  return { dot: 'bg-emerald-500', text: 'text-gray-700' };
};

const DETAILS_PAGE_SIZE = 5;

/* -------------------------------------------------------------------------
 * Convert a DD/MM/YYYY string (API's date format) to YYYY-MM-DD for
 * <input type="date">, and back again on submit.
 * ---------------------------------------------------------------------- */

const apiDateToInputDate = (str) => {
  if (!str) return '';
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const inputDateToApiDate = (str) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  if (!d || !m || !y) return '';
  return `${d}/${m}/${y}`;
};



/* -------------------------------------------------------------------------
 * Main page — Add + Edit
 * ---------------------------------------------------------------------- */

const AddPurchaseRequisition = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present -> edit mode
  const isEditMode = Boolean(id);
  const { state } = useLocation();
  const copyPrId = state?.copyFromId || (state?.isCopy ? state?.id : null);

  const { canAdd, canEdit, canView } = usePagePermissions('Purchase Requisition');

  const { fetchById, createDraft, createAndSendForApproval, updateDraft, updateAndSendForApproval } =
    usePurchaseRequisitions();

  // ---- Outlet scope (GROUP/SUB_COMPANY -> dropdown of own outlets, OUTLET -> self, locked) ----
  const {
    loading: outletsLoading,
    orgType,
    units: outlets, // [{ id, name, code }]
    selectedUnitId: orgScopeOutletId,
  } = useOrgScope();

  const hasOutletDropdownAccess = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;

  // ---- Raw materials ----
  const [rawMaterials, setRawMaterials] = useState([]);
  const [rawMaterialsLoading, setRawMaterialsLoading] = useState(false);

  // ---- Form fields ----
  const [outletId, setOutletId] = useState(state?.outletId != null ? String(state.outletId) : '');
  const [subOutletId, setSubOutletId] = useState(state?.subOutletId != null ? String(state.subOutletId) : '');
  const [subOutlets, setSubOutlets] = useState([]);
  const [subOutletsLoading, setSubOutletsLoading] = useState(false);
  const [prDate, setPrDate] = useState(getTodayInputDate());
  const [prRequiredDate, setPrRequiredDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [details, setDetails] = useState([]);
  const [detailsPage, setDetailsPage] = useState(0);
  const [itemPickError, setItemPickError] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [sendingForApproval, setSendingForApproval] = useState(false);

  // ---- Edit-mode-only state ----
  const [loadingPr, setLoadingPr] = useState(isEditMode || Boolean(copyPrId));
  const [loadedPr, setLoadedPr] = useState(null);
  const [notEditable, setNotEditable] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // ---- Outlet change confirmation modal state ----
  const [pendingOutletChange, setPendingOutletChange] = useState(null);
  const [isOutletConfirmOpen, setIsOutletConfirmOpen] = useState(false);
  const [outletChangeLoading, setOutletChangeLoading] = useState(false);

  // Sync outletId for OUTLET users in create mode
  useEffect(() => {
    if (!isEditMode && !copyPrId && !outletId && orgScopeOutletId) {
      setOutletId(String(orgScopeOutletId));
    }
  }, [isEditMode, copyPrId, outletId, orgScopeOutletId]);

  /* ---- Load sub-outlets (locations) with organization scope ---- */
  const fetchSubOutlets = useCallback(async (targetOrgId) => {
    if (!targetOrgId) {
      setSubOutlets([]);
      return [];
    }
    setSubOutletsLoading(true);
    try {
      const res = await getAllSubOutletsByOrganization(targetOrgId);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setSubOutlets(safeList);
      return safeList;
    } catch (err) {
      console.error('Failed to load sub-outlets/locations:', err);
      setSubOutlets([]);
      return [];
    } finally {
      setSubOutletsLoading(false);
    }
  }, []);

  /* ---- Load raw materials with organization & sub-location scope ---- */
  const fetchRawMaterials = useCallback(
    async (targetOrgId, targetSubOutletId) => {
      setRawMaterialsLoading(true);
      try {
        const orgId = targetOrgId !== undefined ? targetOrgId : (outletId || orgScopeOutletId || '');
        const subId = targetSubOutletId !== undefined ? targetSubOutletId : (subOutletId || '');
        const res = await getAllRawMaterialItems(null, 0, true, '', '', '', orgId, subId);
        const list = res?.data?.data?.['Raw Material Details'] || res?.data?.['Raw Material Details'] || [];
        let rawItems = Array.isArray(list) ? list : [];

        if (orgId && rawItems.length > 0) {
          try {
            const stockParams = {
              itemIds: rawItems.map((r) => r.id),
              itemType: 'RAW_MATERIAL',
              organizationId: Number(orgId),
            };
            if (subId) {
              stockParams.subOutletId = Number(subId);
            }
            const stockRes = await getCurrentStockListGet(stockParams);
            const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
            const stockList = Array.isArray(stockData)
              ? stockData
              : Array.isArray(stockData?.content)
              ? stockData.content
              : Array.isArray(stockData?.list)
              ? stockData.list
              : [];

            if (stockList.length > 0) {
              rawItems = rawItems.map((item) => {
                const matched = stockList.find((s) => Number(s.itemId || s.id) === Number(item.id));
                if (matched) {
                  return {
                    ...item,
                    currentStock: matched,
                  };
                }
                return item;
              });
            }
          } catch (stockErr) {
            console.error('Failed to fetch stock list for raw materials:', stockErr);
          }
        }

        setRawMaterials(rawItems);
        return rawItems;
      } catch (err) {
        console.error('Failed to load raw materials', err);
        setRawMaterials([]);
        return [];
      } finally {
        setRawMaterialsLoading(false);
      }
    },
    [outletId, subOutletId, orgScopeOutletId],
  );

  /* ---- Initial load of raw materials & sub-outlets in create mode ---- */
  useEffect(() => {
    if (!isEditMode && !copyPrId) {
      const initialOrg = outletId || orgScopeOutletId || '';
      if (initialOrg) {
        fetchRawMaterials(initialOrg, subOutletId);
        fetchSubOutlets(initialOrg);
      }
    }
  }, [isEditMode, copyPrId, outletId, orgScopeOutletId, fetchRawMaterials, fetchSubOutlets]);

  /* ---- Edit mode or Copy mode: load the existing PR and pre-fill ---- */
  useEffect(() => {
    if (!isEditMode && !copyPrId) return;
    const load = async () => {
      setLoadingPr(true);
      try {
        const targetId = isEditMode ? id : copyPrId;
        const pr = await fetchById(targetId);
        setLoadedPr(pr);

        if (isEditMode && pr.rawStatus !== PR_STATUS.PENDING) {
          // Guard: only PENDING PRs are editable. Someone may have hit
          // this URL directly for a PR that's moved on since the list
          // was last refreshed.
          setNotEditable(true);
          return;
        }

        const effectiveOrgId = pr.outletId != null ? String(pr.outletId) : '';
        const effectiveSubId = pr.subOutletId != null ? String(pr.subOutletId) : '';
        if (effectiveOrgId) {
          setOutletId(effectiveOrgId);
          await fetchSubOutlets(effectiveOrgId);
        }
        if (effectiveSubId) {
          setSubOutletId(effectiveSubId);
        }
        setPrDate(isEditMode ? apiDateToInputDate(pr.date) : getTodayInputDate());
        setPrRequiredDate(apiDateToInputDate(pr.requiredDate));
        setRemarks(pr.remarks || '');

        // Fetch raw materials for this outlet & sub-unit/location
        const updatedRMs = await fetchRawMaterials(effectiveOrgId, effectiveSubId);

        // Fetch current stock for existing items
        let stockList = [];
        const itemIds = (pr.details || []).map((d) => d.rawMaterialId).filter(Boolean);
        if (effectiveOrgId && itemIds.length > 0) {
          try {
            const stockParams = {
              itemIds,
              itemType: 'RAW_MATERIAL',
              organizationId: Number(effectiveOrgId),
            };
            if (effectiveSubId) {
              stockParams.subOutletId = Number(effectiveSubId);
            }
            const stockRes = await getCurrentStockListGet(stockParams);
            const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
            stockList = Array.isArray(stockData)
              ? stockData
              : Array.isArray(stockData?.content)
              ? stockData.content
              : Array.isArray(stockData?.list)
              ? stockData.list
              : [];
          } catch (stockErr) {
            console.error('Failed to fetch stock list in edit mode', stockErr);
          }
        }

        setDetails(
          (pr.details || []).map((d) => {
            const matchedStock = stockList.find(
              (s) => Number(s.itemId || s.id) === Number(d.rawMaterialId),
            );
            const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
            const availStock =
              matchedStock != null
                ? Number(matchedStock.currentStock ?? 0)
                : matchedRaw
                ? getAvailableStock(matchedRaw)
                : (d.availableStock ?? 0);
            const stockUnit =
              matchedStock?.unitName ||
              matchedStock?.unitSymbol ||
              matchedRaw?.currentStock?.unitName ||
              matchedRaw?.currentStock?.unitSymbol ||
              '';

            const allowedUnits =
              Array.isArray(matchedRaw?.allowedUnits) && matchedRaw.allowedUnits.length > 0
                ? matchedRaw.allowedUnits
                : matchedRaw?.unit
                ? [matchedRaw.unit]
                : [];

            return {
              id: isEditMode ? (d.id ?? 0) : 0,
              rawMaterialId: d.rawMaterialId,
              rawMaterialName: d.rawMaterialName,
              uomId: d.uomId,
              uomName: d.uomName || '',
              allowedUnits,
              category:
                matchedRaw?.rawMaterialCat?.nameEnglish ||
                matchedRaw?.rawMaterialCategoryName ||
                '',
              availableStock: availStock,
              stockUnit,
              minStock: matchedRaw?.minStock ?? null,
              quantity: d.quantity,
            };
          }),
        );
      } catch (err) {
        console.error('Failed to load purchase requisition', err);
      } finally {
        setLoadingPr(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode, copyPrId]);

  const handleApplyOutletChange = async (newOrgId) => {
    setOutletId(newOrgId ? String(newOrgId) : '');
    setSubOutletId('');
    if (newOrgId) {
      await fetchSubOutlets(newOrgId);
    } else {
      setSubOutlets([]);
    }
    const updatedRMs = await fetchRawMaterials(newOrgId, '');

    if (details.length > 0 && newOrgId) {
      const itemIds = details.map((d) => d.rawMaterialId).filter(Boolean);
      let stockList = [];
      try {
        const stockRes = await getCurrentStockListGet({
          itemIds,
          itemType: 'RAW_MATERIAL',
          organizationId: Number(newOrgId),
        });
        const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
        stockList = Array.isArray(stockData)
          ? stockData
          : Array.isArray(stockData?.content)
          ? stockData.content
          : Array.isArray(stockData?.list)
          ? stockData.list
          : [];
      } catch (stockErr) {
        console.error('Failed to fetch stock list on outlet change', stockErr);
      }

      setDetails((prev) =>
        prev.map((d) => {
          const matchedStock = stockList.find(
            (s) => Number(s.itemId || s.id) === Number(d.rawMaterialId),
          );
          const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
          const availStock =
            matchedStock != null
              ? Number(matchedStock.currentStock ?? 0)
              : matchedRaw
              ? getAvailableStock(matchedRaw)
              : 0;
          const stockUnit =
            matchedStock?.unitName ||
            matchedStock?.unitSymbol ||
            matchedRaw?.currentStock?.unitName ||
            matchedRaw?.currentStock?.unitSymbol ||
            d.stockUnit ||
            '';

          return {
            ...d,
            availableStock: availStock,
            stockUnit,
          };
        }),
      );
    }
  };

  const handleSubOutletChange = async (newSubId) => {
    setSubOutletId(newSubId ? String(newSubId) : '');
    const activeOrgId = outletId || orgScopeOutletId || '';
    const updatedRMs = await fetchRawMaterials(activeOrgId, newSubId);

    if (details.length > 0 && activeOrgId) {
      const itemIds = details.map((d) => d.rawMaterialId).filter(Boolean);
      let stockList = [];
      try {
        const stockParams = {
          itemIds,
          itemType: 'RAW_MATERIAL',
          organizationId: Number(activeOrgId),
        };
        if (newSubId) {
          stockParams.subOutletId = Number(newSubId);
        }
        const stockRes = await getCurrentStockListGet(stockParams);
        const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
        stockList = Array.isArray(stockData)
          ? stockData
          : Array.isArray(stockData?.content)
          ? stockData.content
          : Array.isArray(stockData?.list)
          ? stockData.list
          : [];
      } catch (stockErr) {
        console.error('Failed to fetch stock list on location change', stockErr);
      }

      setDetails((prev) =>
        prev.map((d) => {
          const matchedStock = stockList.find(
            (s) => Number(s.itemId || s.id) === Number(d.rawMaterialId),
          );
          const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
          const availStock =
            matchedStock != null
              ? Number(matchedStock.currentStock ?? 0)
              : matchedRaw
              ? getAvailableStock(matchedRaw)
              : 0;
          const stockUnit =
            matchedStock?.unitName ||
            matchedStock?.unitSymbol ||
            matchedRaw?.currentStock?.unitName ||
            matchedRaw?.currentStock?.unitSymbol ||
            d.stockUnit ||
            '';

          return {
            ...d,
            availableStock: availStock,
            stockUnit,
          };
        }),
      );
    }
  };

  const handleOutletSelectChange = (e) => {
    const newOrgId = e.target.value;
    if (newOrgId === outletId) return;

    if (details.length > 0) {
      setPendingOutletChange(newOrgId);
      setIsOutletConfirmOpen(true);
    } else {
      handleApplyOutletChange(newOrgId);
    }
  };

  const handleConfirmOutletChange = async () => {
    setOutletChangeLoading(true);
    try {
      await handleApplyOutletChange(pendingOutletChange);
    } finally {
      setOutletChangeLoading(false);
      setIsOutletConfirmOpen(false);
      setPendingOutletChange(null);
    }
  };

  const handleCancelOutletChange = () => {
    setIsOutletConfirmOpen(false);
    setPendingOutletChange(null);
  };

  const selectedOutlet = outlets.find((o) => String(o.id) === String(outletId));
  const pendingOutletObj = outlets.find((o) => String(o.id) === String(pendingOutletChange));
  const pendingOutletName = pendingOutletObj?.name || 'the selected outlet';

  const isPrEditable = !isEditMode || loadedPr?.rawStatus === PR_STATUS.PENDING;
  const outletFieldIsEditable = hasOutletDropdownAccess && isPrEditable;

  const alreadyAddedIds = useMemo(
    () => new Set(details.map((d) => String(d.rawMaterialId))),
    [details],
  );

  const handleAddItem = (item) => {
    const uomId = item.currentStock?.unitId ?? item.unitId ?? item.unit?.id ?? 0;
    const uomName =
      item.currentStock?.unitName ||
      item.currentStock?.unitSymbol ||
      item.unit?.nameEnglish ||
      item.unit?.symbolEnglish ||
      item.unitName ||
      '';
    let allowedUnits =
      Array.isArray(item.allowedUnits) && item.allowedUnits.length > 0
        ? [...item.allowedUnits]
        : item.unit
        ? [item.unit]
        : [];

    if (
      item.currentStock?.unitId &&
      !allowedUnits.some((u) => Number(u.id) === Number(item.currentStock.unitId))
    ) {
      allowedUnits = [
        {
          id: item.currentStock.unitId,
          nameEnglish: item.currentStock.unitName || item.currentStock.unitSymbol || 'Unit',
          symbolEnglish: item.currentStock.unitSymbol || '',
        },
        ...allowedUnits,
      ];
    }

    if (!uomId || !uomName) {
      setItemPickError(`"${item.nameEnglish}" has no unit configured and can't be added. Set a unit on the item first.`);
      return;
    }
    setItemPickError('');

    const stockUnit =
      (typeof item.currentStock === 'object' && item.currentStock !== null
        ? item.currentStock.unitName || item.currentStock.unitSymbol
        : '') || '';

    setDetails((prev) => [
      ...prev,
      {
        id: 0,
        rawMaterialId: item.id,
        rawMaterialName: item.nameEnglish,
        uomId,
        uomName,
        allowedUnits,
        category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
        availableStock: getAvailableStock(item),
        stockUnit,
        minStock: item.minStock,
        quantity: 1,
      },
    ]);
    setDetailsPage(Math.floor(details.length / DETAILS_PAGE_SIZE));
  };

  const updateUnit = (rawMaterialId, selectedUnitId) => {
    setDetails((prev) =>
      prev.map((d) => {
        if (d.rawMaterialId === rawMaterialId) {
          const rm = rawMaterials.find((r) => r.id === rawMaterialId);
          const unitsList = d.allowedUnits?.length
            ? d.allowedUnits
            : (Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
                ? rm.allowedUnits
                : (rm?.unit ? [rm.unit] : []));
          const selected = unitsList.find((u) => String(u.id) === String(selectedUnitId));
          const uName = selected?.nameEnglish || selected?.symbolEnglish || d.uomName;
          return {
            ...d,
            uomId: selectedUnitId ? Number(selectedUnitId) : d.uomId,
            uomName: selectedUnitId ? uName : d.uomName,
          };
        }
        return d;
      }),
    );
  };

  const updateQuantity = (rawMaterialId, quantity) => {
    setDetails((prev) =>
      prev.map((d) =>
        d.rawMaterialId === rawMaterialId
          ? { ...d, quantity: quantity === '' ? '' : Number(quantity) }
          : d,
      ),
    );
  };

  const removeDetail = (rawMaterialId) => {
    setDetails((prev) => prev.filter((d) => d.rawMaterialId !== rawMaterialId));
  };

  const pageCount = Math.max(1, Math.ceil(details.length / DETAILS_PAGE_SIZE));
  const pagedDetails = details.slice(
    detailsPage * DETAILS_PAGE_SIZE,
    detailsPage * DETAILS_PAGE_SIZE + DETAILS_PAGE_SIZE,
  );

  const validate = () => {
    const next = {};
    if (!outletId) next.outletId = 'Outlet is required';
    if (!prDate) {
      next.prDate = 'PR date is required';
    }
    if (!prRequiredDate) {
      next.prRequiredDate = 'Required date is required';
    } else if (prDate && prRequiredDate < prDate) {
      next.prRequiredDate = 'Required date cannot be less than PR date';
    }

    if (details.length === 0) {
      next.details = 'Add at least one item';
    } else if (details.some((d) => !d.quantity || Number(d.quantity) <= 0)) {
      next.details = 'Every line item needs a quantity greater than 0';
    } else if (details.some((d) => !d.uomId || !d.uomName)) {
      next.details = 'Every line item requires a unit — remove or fix items missing a unit';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const selectedSubOutlet = subOutlets.find((s) => String(s.id) === String(subOutletId));

  // buildPayload no longer sets status — the hook functions add it based
  // on which button was clicked.
  const buildPayload = () => ({
    userId: getUserIdFromToken(),
    actionBy: getUsernameFromToken(),
    details: details.map((d) => ({
      id: d.id || 0,
      quantity: Number(d.quantity),
      rawMaterialId: d.rawMaterialId,
      rawMaterialName: d.rawMaterialName,
      uomId: d.uomId,
      uomName: d.uomName,
    })),
    outletId: Number(outletId),
    outletName: selectedOutlet?.name || '',
    outletShortCode: selectedOutlet?.code || '',
    subOutletId: subOutletId ? Number(subOutletId) : null,
    subOutletName: subOutletId
      ? (selectedSubOutlet?.name || selectedSubOutlet?.subOutletName || selectedSubOutlet?.locationName || '')
      : null,
    prDate: prDate,
    prRequiredDate: prRequiredDate,
    remarks,
  });

  // "Save" — sends status: PENDING
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditMode) {
        await updateDraft(id, buildPayload()); // status: PENDING, embedded in payload
      } else {
        await createDraft(buildPayload()); // status: PENDING, embedded in payload
      }
      navigate('/purchase-requisition/list');
    } catch (err) {
      console.error('Failed to save purchase requisition', err);
    } finally {
      setSaving(false);
    }
  };

  // "Send For Approval" — sends status: SENT_FOR_APPROVAL
  const handleSendForApproval = async () => {
    if (!validate()) return;
    setSendingForApproval(true);
    try {
      if (isEditMode) {
        await updateAndSendForApproval(id, buildPayload()); // status: SENT_FOR_APPROVAL
      } else {
        await createAndSendForApproval(buildPayload()); // status: SENT_FOR_APPROVAL
      }
      navigate('/purchase-requisition/list');
    } catch (err) {
      console.error('Failed to send purchase requisition for approval', err);
    } finally {
      setSendingForApproval(false);
    }
  };

  const busy = saving || sendingForApproval;

  /* ---- Edit mode: loading / not-editable states ---- */

  if (isEditMode && loadingPr) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Container>
    );
  }

  if (isEditMode && notEditable) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-10">
          <SectionCard className="mt-10 p-8 text-center">
            <p className="text-sm text-gray-500">
              This requisition is <strong>{getStatusLabel(loadedPr?.rawStatus)}</strong> and can no
              longer be edited. Only requisitions in <strong>Pending</strong> status are editable.
            </p>
            <button
              type="button"
              onClick={() => navigate('/purchase-requisition')}
              className="mt-4 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Back to list
            </button>
          </SectionCard>
        </div>
      </Container>
    );
  }

  if (!canView) {
    return <AccessDenied pageTitle="Purchase Requisition" />;
  }

  if (!isEditMode && !canAdd) {
    return <AccessDenied pageTitle="Purchase Requisition" />;
  }

  const canPerformEdit = isEditMode ? canEdit : canAdd;

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title={isEditMode ? `Edit Purchase Requisition` : 'Create Purchase Requisition'}
          description={
            isEditMode
              ? `Editing ${loadedPr?.prCode || ''} for ${loadedPr?.outlet || 'the selected outlet'}.`
              : 'Raise a new purchase requisition for your outlet or location.'
          }
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/purchase-requisition/list')}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Requisitions
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowLog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-sm font-semibold text-white hover:bg-[#073e77] transition-colors cursor-pointer border-0 shadow-sm shrink-0"
                >
                  <ScrollText className="w-4 h-4 shrink-0" />
                  <span>See Activity Log</span>
                </button>
              )}
            </div>
          }
          className="mt-2"
        />

          {/* Origin details */}
<SectionCard className="mt-5 p-5 sm:p-6">
  <h2 className="text-sm font-semibold text-gray-800 mb-4">Origin Details</h2>

  <div className={`grid grid-cols-1 ${hasOutletDropdownAccess ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
    {hasOutletDropdownAccess && (
      <div>
        <label className={labelCls}>
          Outlet <span className="text-red-500">*</span>
        </label>

        {outletFieldIsEditable ? (
                  <SearchableSelect
                    name="outletId"
                    value={outletId ? String(outletId) : ''}
                    onChange={handleOutletSelectChange}
                    options={outlets.map((o) => ({
                      value: String(o.id),
                      label: `${o.name}${o.code ? ` (${o.code})` : ''}`,
                    }))}
                    placeholder={outletsLoading ? 'Loading outlets...' : 'Select outlet'}
                    disabled={outletsLoading || !outletFieldIsEditable}
                    hasError={!!errors.outletId}
                  />
        ) : (
          <div className={`${inputCls} bg-gray-50 text-gray-600`}>
            {outletsLoading
              ? 'Loading...'
              : selectedOutlet?.name || outlets[0]?.name || '—'}
          </div>
        )}

        {errors.outletId && (
          <p className="text-xs text-red-500 mt-1">{errors.outletId}</p>
        )}
      </div>
    )}

    <div>
      <label className={labelCls}>
        Sub-Unit / Location
      </label>
      {canPerformEdit && isPrEditable ? (
        <SearchableSelect
          name="subOutletId"
          value={subOutletId ? String(subOutletId) : ''}
          onChange={(e) => handleSubOutletChange(e.target.value)}
          options={subOutlets.map((s) => ({
            value: String(s.id),
            label: `${s.name || s.subOutletName || s.locationName || ''}${s.shortCode || s.code || s.subOutletCode ? ` (${s.shortCode || s.code || s.subOutletCode})` : ''}`,
          }))}
          placeholder={
            subOutletsLoading
              ? 'Loading locations...'
              : !outletId
              ? 'Select outlet first'
              : subOutlets.length === 0
              ? 'No locations found'
              : 'Select location (Optional)'
          }
          disabled={subOutletsLoading || !outletId || busy}
          hasError={!!errors.subOutletId}
        />
      ) : (
        <div className={`${inputCls} bg-gray-50 text-gray-600`}>
          {subOutletsLoading
            ? 'Loading...'
            : selectedSubOutlet?.name || selectedSubOutlet?.subOutletName || loadedPr?.subOutletName || '—'}
        </div>
      )}
      {errors.subOutletId && (
        <p className="text-xs text-red-500 mt-1">{errors.subOutletId}</p>
      )}
    </div>

    <div>
      <label className={labelCls}>
        PR Date <span className="text-red-500">*</span>
      </label>
      <input
        type="date"
        value={prDate || getTodayInputDate()}
        disabled
        readOnly
        className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
      />
      {errors.prDate && <p className="text-xs text-red-500 mt-1">{errors.prDate}</p>}
    </div>

    <div>
      <label className={labelCls}>
        Required Date <span className="text-red-500">*</span>
      </label>
      <input
        type="date"
        value={prRequiredDate}
        min={prDate || getTodayInputDate()}
        disabled={!canPerformEdit}
        onChange={(e) => setPrRequiredDate(e.target.value)}
        className={`${errors.prRequiredDate ? errorInputCls : inputCls} disabled:bg-gray-50 disabled:text-gray-500`}
      />
      {errors.prRequiredDate && (
        <p className="text-xs text-red-500 mt-1">{errors.prRequiredDate}</p>
      )}
    </div>
  </div>

  <div className="mt-4">
    <label className={labelCls}>Remarks</label>
    <textarea
      value={remarks}
      disabled={!canPerformEdit}
      onChange={(e) => setRemarks(e.target.value)}
      rows={3}
      placeholder="Internal notes for this requisition..."
      className={`${inputCls} resize-none disabled:bg-gray-50 disabled:text-gray-500`}
    />
  </div>
</SectionCard>

        {/* Raw materials */}
        <SectionCard className="mt-5 p-5 sm:p-6">
          {canPerformEdit && (
            <RawMaterialSearchPicker
              items={rawMaterials}
              alreadyAddedIds={alreadyAddedIds}
              onSelect={handleAddItem}
              loading={rawMaterialsLoading}
              isSticky={true}
            />
          )}

          {itemPickError && (
            <p className="text-xs text-red-500 mt-2">{itemPickError}</p>
          )}
          {errors.details && <p className="text-xs text-red-500 mt-2">{errors.details}</p>}

          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-4 py-3 w-16">Sr. No.</th>
                  <th className="text-left font-semibold px-4 py-3">Item Name</th>
                  <th className="text-left font-semibold px-4 py-3">
                    Unit <span className="text-red-500">*</span>
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Available Stock</th>
                  <th className="text-left font-semibold px-4 py-3 w-32">Quantity</th>
                  {canPerformEdit && <th className="text-left font-semibold px-4 py-3 w-16">Action</th>}
                </tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={canPerformEdit ? 6 : 5} className="px-4 py-10 text-center text-gray-400">
                      No items added yet — search above to add raw materials.
                    </td>
                  </tr>
                ) : (
                  pagedDetails.map((d, i) => {
                    const tone = getStockTone(d.availableStock, d.minStock);
                    const missingUnit = !d.uomId || !d.uomName;
                    return (
                      <tr key={d.rawMaterialId} className="border-t border-gray-100">
                        <td className="px-4 py-4 text-gray-400">
                          {String(detailsPage * DETAILS_PAGE_SIZE + i + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[#084E92]">{d.rawMaterialName}</p>
                          {d.category && (
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                              {d.category}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 min-w-[160px]">
                          {missingUnit ? (
                            <span className="text-xs font-medium text-red-500">Missing unit</span>
                          ) : canPerformEdit ? (
                            (() => {
                              const rm = rawMaterials.find((r) => r.id === d.rawMaterialId);
                              const allowedList = d.allowedUnits?.length
                                ? d.allowedUnits
                                : (Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
                                    ? rm.allowedUnits
                                    : (rm?.unit ? [rm.unit] : []));

                              let options = allowedList.map((u) => ({
                                value: String(u.id),
                                label: u.nameEnglish || u.symbolEnglish || `Unit #${u.id}`,
                              }));

                              if (d.uomId && !options.some((opt) => String(opt.value) === String(d.uomId))) {
                                options = [
                                  { value: String(d.uomId), label: d.uomName || `Unit #${d.uomId}` },
                                  ...options,
                                ];
                              }

                              return (
                                <div className="min-w-[130px] max-w-[190px]">
                                  <SearchableSelect
                                    name={`unit-${d.rawMaterialId}`}
                                    value={d.uomId ? String(d.uomId) : ''}
                                    onChange={(e) => updateUnit(d.rawMaterialId, e.target.value)}
                                    options={options}
                                    placeholder="Select unit"
                                    disabled={!canPerformEdit}
                                    hasError={!d.uomId || !d.uomName}
                                  />
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-gray-600">{d.uomName}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            <span className={tone.text}>
                              {d.availableStock != null
                                ? `${Number(d.availableStock).toFixed(2)}${d.stockUnit ? ` ${d.stockUnit}` : ''}`
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="1"
                            value={d.quantity}
                            disabled={!canPerformEdit}
                            onChange={(e) => updateQuantity(d.rawMaterialId, e.target.value)}
                            className={`${inputCls} py-1.5 disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                        </td>
                        {canPerformEdit && (
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => removeDetail(d.rawMaterialId)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition cursor-pointer bg-transparent border-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {details.length > 0 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                Showing {pagedDetails.length} of {details.length} items added to this requisition.
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailsPage((p) => Math.max(0, p - 1))}
                    disabled={detailsPage === 0}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={detailsPage === pageCount - 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Footer actions */}
        {canPerformEdit && (
          <div className="flex items-center justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleSendForApproval}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition disabled:opacity-60"
            >
              {sendingForApproval ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Send For Approval
            </button>
          </div>
        )}
      </div>

    {isEditMode && loadedPr && (
      <PurchaseRequisitionLog
        open={showLog}
        onClose={() => setShowLog(false)}
        prCode={loadedPr.prCode}
        moduleId={loadedPr.id}
        moduleName="PURCHASE_REQUISITION"
      />
    )}

    <OutletChangeConfirmModal
      isOpen={isOutletConfirmOpen}
      onClose={handleCancelOutletChange}
      onConfirm={handleConfirmOutletChange}
      outletName={pendingOutletName}
      itemCount={details.length}
      loading={outletChangeLoading}
    />
    </Container>
  );
};

export default AddPurchaseRequisition;