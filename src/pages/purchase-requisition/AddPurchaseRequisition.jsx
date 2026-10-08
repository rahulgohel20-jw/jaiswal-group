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
  ChevronRight,
  ScrollText,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import {
  getAllRawMaterialItems,
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
  if (stock === null || stock === undefined || stock === '') {
    return { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200', text: 'text-gray-600' };
  }
  const num = Number(stock);
  if (isNaN(num) || num <= 0) {
    return { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
  }
  if (minStock != null && minStock !== '' && num <= Number(minStock)) {
    return { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
  }
  return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
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
    getSubOutlets,
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

  const isOutletUser = orgType === OrgTypes.OUTLET || orgType === 'OUTLET' || (!hasOutletDropdownAccess && !outletsLoading);
  const effectiveOutletId =
    outletId ||
    (isOutletUser ? String(orgScopeOutletId || getOrgIdFromToken() || '') : '');

  // Sync outletId for OUTLET users in create mode
  useEffect(() => {
    if (!isEditMode && !copyPrId && !outletId && isOutletUser && orgScopeOutletId) {
      setOutletId(String(orgScopeOutletId));
    }
  }, [isEditMode, copyPrId, outletId, isOutletUser, orgScopeOutletId]);

  /* ---- Load sub-outlets (locations) with organization scope ---- */
  const fetchSubOutlets = useCallback((targetOrgId) => {
    if (!targetOrgId) {
      setSubOutlets([]);
      return [];
    }
    const list = getSubOutlets(targetOrgId);
    const safeList = Array.isArray(list) ? list : [];
    setSubOutlets(safeList);
    return safeList;
  }, [getSubOutlets]);

  /* ---- Load raw materials with organization & sub-location scope ---- */
  const fetchRawMaterials = useCallback(
    async (targetOrgId, targetSubOutletId) => {
      const orgId = targetOrgId !== undefined ? targetOrgId : effectiveOutletId;
      if (!orgId) {
        setRawMaterials([]);
        return [];
      }
      setRawMaterialsLoading(true);
      try {
        const subId = targetSubOutletId !== undefined ? targetSubOutletId : (subOutletId || '');
        const res = await getAllRawMaterialItems(null, 0, true, '', '', '', orgId, subId);
        const list = res?.data?.data?.['Raw Material Details'] || res?.data?.['Raw Material Details'] || [];
        const rawItems = Array.isArray(list) ? list : [];

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
    [effectiveOutletId, subOutletId],
  );

  /* ---- Initial load of raw materials & sub-outlets in create mode ---- */
  useEffect(() => {
    if (!isEditMode && !copyPrId) {
      if (effectiveOutletId) {
        fetchRawMaterials(effectiveOutletId, subOutletId);
        fetchSubOutlets(effectiveOutletId);
      } else {
        setRawMaterials([]);
        setSubOutlets([]);
      }
    }
  }, [isEditMode, copyPrId, effectiveOutletId, fetchRawMaterials, fetchSubOutlets, subOutletId]);

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

        setDetails(
          (pr.details || []).map((d) => {
            const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
            const availStock = matchedRaw ? getAvailableStock(matchedRaw) : (d.availableStock ?? 0);
            const stockUnit =
              matchedRaw?.currentStock?.unitName ||
              matchedRaw?.currentStock?.unitSymbol ||
              matchedRaw?.unit?.nameEnglish ||
              matchedRaw?.unit?.symbolEnglish ||
              matchedRaw?.unitName ||
              matchedRaw?.unitSymbol ||
              d.stockUnit ||
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
      setDetails((prev) =>
        prev.map((d) => {
          const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
          const availStock = matchedRaw ? getAvailableStock(matchedRaw) : 0;
          const stockUnit =
            matchedRaw?.currentStock?.unitName ||
            matchedRaw?.currentStock?.unitSymbol ||
            matchedRaw?.unit?.nameEnglish ||
            matchedRaw?.unit?.symbolEnglish ||
            matchedRaw?.unitName ||
            matchedRaw?.unitSymbol ||
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
      setDetails((prev) =>
        prev.map((d) => {
          const matchedRaw = updatedRMs.find((r) => Number(r.id) === Number(d.rawMaterialId));
          const availStock = matchedRaw ? getAvailableStock(matchedRaw) : 0;
          const stockUnit =
            matchedRaw?.currentStock?.unitName ||
            matchedRaw?.currentStock?.unitSymbol ||
            matchedRaw?.unit?.nameEnglish ||
            matchedRaw?.unit?.symbolEnglish ||
            matchedRaw?.unitName ||
            matchedRaw?.unitSymbol ||
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
              items={effectiveOutletId ? rawMaterials : []}
              alreadyAddedIds={alreadyAddedIds}
              onSelect={handleAddItem}
              loading={rawMaterialsLoading}
              disabled={!effectiveOutletId}
              placeholder={!effectiveOutletId ? 'Please select an outlet first to search raw materials...' : 'Search raw material by name or code...'}
              isSticky={true}
            />
          )}

          {itemPickError && (
            <p className="text-xs text-red-500 mt-2">{itemPickError}</p>
          )}
          {errors.details && <p className="text-xs text-red-500 mt-2">{errors.details}</p>}

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-gray-200 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3 text-center w-16">Sr.</th>
                    <th className="px-4 py-3">Item Details</th>
                    <th className="px-4 py-3 min-w-[170px]">
                      Unit <span className="text-rose-500">*</span>
                    </th>
                    <th className="px-4 py-3 min-w-[180px]">Available Stock</th>
                    <th className="px-4 py-3 w-36">
                      Quantity <span className="text-rose-500">*</span>
                    </th>
                    {canPerformEdit && <th className="px-4 py-3 text-center w-16">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {details.length === 0 ? (
                    <tr>
                      <td colSpan={canPerformEdit ? 6 : 5} className="px-4 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="font-medium text-slate-600">No items added yet</p>
                          <p className="text-[11px] text-slate-400">Search and select raw materials above to add them to this requisition.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedDetails.map((d, i) => {
                      const tone = getStockTone(d.availableStock, d.minStock);
                      const missingUnit = !d.uomId || !d.uomName;
                      const displayUnit = d.stockUnit || d.uomName || '';
                      const stockVal = Number(d.availableStock ?? 0);

                      return (
                        <tr
                          key={d.rawMaterialId}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Serial Number */}
                          <td className="px-4 py-3.5 text-center align-middle">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 font-mono">
                              {String(detailsPage * DETAILS_PAGE_SIZE + i + 1).padStart(2, '0')}
                            </span>
                          </td>

                          {/* Item Details */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-xs">
                                {d.rawMaterialName}
                              </span>
                              {d.category && (
                                <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60 mt-1">
                                  {d.category}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Unit Selector */}
                          <td className="px-4 py-3.5 align-middle">
                            {missingUnit ? (
                              <span className="text-xs font-medium text-rose-500">Missing unit</span>
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
                                  <div className="min-w-[130px] max-w-[180px]">
                                    <SearchableSelect
                                      name={`unit-${d.rawMaterialId}`}
                                      value={d.uomId ? String(d.uomId) : ''}
                                      onChange={(e) => updateUnit(d.rawMaterialId, e.target.value)}
                                      options={options}
                                      placeholder="Select unit"
                                      disabled={!canPerformEdit}
                                      isClearable={false}
                                      hasError={!d.uomId || !d.uomName}
                                    />
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium">
                                {d.uomName}
                              </span>
                            )}
                          </td>

                          {/* Available Stock */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${tone.badge}`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                              <span>
                                {d.availableStock != null
                                  ? `${Number(d.availableStock).toFixed(2)}${displayUnit ? ` ${displayUnit}` : ''}`
                                  : '—'}
                              </span>
                              {stockVal <= 0 && (
                                <span className="text-[10px] opacity-80">
                                  (0.00)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="relative max-w-[110px]">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={d.quantity}
                                disabled={!canPerformEdit}
                                onChange={(e) => updateQuantity(d.rawMaterialId, e.target.value)}
                                className="w-full h-9 px-3 text-xs font-semibold text-slate-800 bg-white border border-gray-200 rounded-lg outline-none transition focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* Action */}
                          {canPerformEdit && (
                            <td className="px-4 py-3.5 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => removeDetail(d.rawMaterialId)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Remove item"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200/60">
                    {details.length} {details.length === 1 ? 'Item' : 'Items'}
                  </span>
                  <p className="text-xs text-slate-500">
                    Showing {pagedDetails.length} of {details.length} items
                  </p>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailsPage((p) => Math.max(0, p - 1))}
                      disabled={detailsPage === 0}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-slate-600 px-1">
                      {detailsPage + 1} / {pageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailsPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={detailsPage === pageCount - 1}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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