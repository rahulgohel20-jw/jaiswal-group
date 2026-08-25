import { useNavigate, useParams, useLocation } from 'react-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Search,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ScrollText,
  Link,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { getAllRawMaterialItems } from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getUserIdFromToken } from '@/utils/auth';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePurchaseRequisitions } from './utils/usePurchaseRequisitions';
import { PR_STATUS, getStatusLabel } from './utils/prStatus';
import PurchaseRequisitionLog from './PurchaseRequisitionLog';
import { getUsernameFromToken } from '../../utils/auth';
import { getTodayInputDate } from '../../utils/GetCurrentToday';

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

const getAvailableStock = (item) =>
  item?.availableStock != null ? item.availableStock : item?.opbStock;

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
 * Item picker (unchanged)
 * ---------------------------------------------------------------------- */

const RawMaterialPicker = ({ rawMaterials, alreadyAddedIds, onAdd, loading }) => {
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
    <div ref={wrapperRef} className="relative">
      <label className={labelCls}>Select Item to Add</label>
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
          className={`${inputCls} pl-9`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg">
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
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/60 transition border-b border-gray-50 last:border-b-0"
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

/* -------------------------------------------------------------------------
 * Main page — Add + Edit
 * ---------------------------------------------------------------------- */

const AddPurchaseRequisition = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present -> edit mode
  const isEditMode = Boolean(id);
  const { state } = useLocation();
  const copyPrId = state?.copyFromId || (state?.isCopy ? state?.id : null);

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
  const [prDate, setPrDate] = useState(isEditMode ? '' : getTodayInputDate());
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

  // Sync outletId for OUTLET users in create mode
  useEffect(() => {
    if (!isEditMode && !copyPrId && !outletId && orgScopeOutletId) {
      setOutletId(String(orgScopeOutletId));
    }
  }, [isEditMode, copyPrId, outletId, orgScopeOutletId]);

  /* ---- Load raw materials ---- */
  useEffect(() => {
    const fetchRawMaterials = async () => {
      setRawMaterialsLoading(true);
      try {
        const res = await getAllRawMaterialItems(0, 0, true, '', '', '');
        setRawMaterials(res?.data?.data?.['Raw Material Details'] || []);
      } catch (err) {
        console.error('Failed to load raw materials', err);
      } finally {
        setRawMaterialsLoading(false);
      }
    };
    fetchRawMaterials();
  }, []);

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

        if (pr.outletId != null) {
          setOutletId(String(pr.outletId));
        }
        setPrDate(isEditMode ? apiDateToInputDate(pr.date) : getTodayInputDate());
        setPrRequiredDate(apiDateToInputDate(pr.requiredDate));
        setRemarks(pr.remarks || '');
        setDetails(
          (pr.details || []).map((d) => ({
            id: isEditMode ? (d.id ?? 0) : 0,
            rawMaterialId: d.rawMaterialId,
            rawMaterialName: d.rawMaterialName,
            uomId: d.uomId,
            uomName: d.uomName || '',
            category: '',
            availableStock: null,
            minStock: null,
            quantity: d.quantity,
          })),
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

  const selectedOutlet = outlets.find((o) => String(o.id) === String(outletId));

  // Outlet field is editable for GROUP/SUB_COMPANY users, but only while
  // the PR is still PENDING (draft, not yet sent for approval). Once it's
  // SENT_FOR_APPROVAL or later, the outlet is locked for everyone — an
  // approver editing details shouldn't be able to reassign which outlet
  // the PR belongs to. In create mode there's no status yet, so it's
  // always editable for dropdown-access users.
  const outletFieldIsEditable =
    hasOutletDropdownAccess && (!isEditMode || loadedPr?.rawStatus === PR_STATUS.PENDING);

  const alreadyAddedIds = useMemo(
    () => new Set(details.map((d) => String(d.rawMaterialId))),
    [details],
  );

  const handleAddItem = (item) => {
    const uomId = item.unitId ?? item.unit?.id ?? 0;
    const uomName = item.unit?.nameEnglish || item.unitName || '';

    if (!uomId || !uomName) {
      setItemPickError(`"${item.nameEnglish}" has no unit configured and can't be added. Set a unit on the item first.`);
      return;
    }
    setItemPickError('');

    setDetails((prev) => [
      ...prev,
      {
        id: 0,
        rawMaterialId: item.id,
        rawMaterialName: item.nameEnglish,
        uomId,
        uomName,
        category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
        availableStock: getAvailableStock(item),
        minStock: item.minStock,
        quantity: 1,
      },
    ]);
    setDetailsPage(Math.floor(details.length / DETAILS_PAGE_SIZE));
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
    if (!prDate) next.prDate = 'PR date is required';
    if (!prRequiredDate) next.prRequiredDate = 'Required date is required';

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

  return (
    <Container>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 mt-3">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span>Purchase Requisition List</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">{isEditMode ? 'Edit' : 'Create'}</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap mt-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-semibold">
              {isEditMode ? `Edit Purchase Requisition` : 'Create Purchase Requisition'}
            </h1>
            <p className="text-[#43474F] mt-1 text-sm sm:text-base">
              {isEditMode
                ? `Editing ${loadedPr?.prCode || ''} for ${loadedPr?.outlet || 'the selected outlet'}.`
                : 'Raise a new purchase requisition for an outlet.'}
            </p>
          </div>

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

          {/* Origin details */}
<SectionCard className="mt-5 p-5 sm:p-6">
  <h2 className="text-sm font-semibold text-gray-800 mb-4">Origin Details</h2>

  <div className={`grid grid-cols-1 ${hasOutletDropdownAccess ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
    {hasOutletDropdownAccess && (
      <div>
        <label className={labelCls}>
          Outlet <span className="text-red-500">*</span>
        </label>

        {outletFieldIsEditable ? (
          <select
            value={outletId ? String(outletId) : ''}
            onChange={(e) => setOutletId(e.target.value)}
            disabled={outletsLoading}
            className={errors.outletId ? errorInputCls : inputCls}
          >
            <option value="">
              {outletsLoading ? 'Loading outlets...' : 'Select outlet'}
            </option>
            {outlets.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name} {o.code ? `(${o.code})` : ''}
              </option>
            ))}
          </select>
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
        PR Date <span className="text-red-500">*</span>
      </label>
      <input
        type="date"
        value={prDate}
        onChange={(e) => setPrDate(e.target.value)}
        className={errors.prDate ? errorInputCls : inputCls}
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
        onChange={(e) => setPrRequiredDate(e.target.value)}
        className={errors.prRequiredDate ? errorInputCls : inputCls}
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
      onChange={(e) => setRemarks(e.target.value)}
      rows={3}
      placeholder="Internal notes for this requisition..."
      className={`${inputCls} resize-none`}
    />
  </div>
</SectionCard>

        {/* Raw materials */}
        <SectionCard className="mt-5 p-5 sm:p-6">
          <RawMaterialPicker
            rawMaterials={rawMaterials}
            alreadyAddedIds={alreadyAddedIds}
            onAdd={handleAddItem}
            loading={rawMaterialsLoading}
          />

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
                  <th className="text-left font-semibold px-4 py-3 w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
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
                        <td className="px-4 py-4">
                          {missingUnit ? (
                            <span className="text-xs font-medium text-red-500">Missing unit</span>
                          ) : (
                            <span className="text-gray-600">{d.uomName}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            <span className={tone.text}>
                              {d.availableStock != null ? Number(d.availableStock).toFixed(2) : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="1"
                            value={d.quantity}
                            onChange={(e) => updateQuantity(d.rawMaterialId, e.target.value)}
                            className={`${inputCls} py-1.5`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeDetail(d.rawMaterialId)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition cursor-pointer bg-transparent border-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
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
    </Container>
  );
};

export default AddPurchaseRequisition;