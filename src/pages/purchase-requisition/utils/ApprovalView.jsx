import { useState, useMemo, useEffect } from "react";
import {
  Download,
  Trash2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { getAllRawMaterialItems } from "@/services/apiServices";
import SearchableSelect from "@/utils/SearchableSelect";
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import RawMaterialSearchPicker from '@/components/common/RawMaterialSearchPicker';

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";

const InfoField = ({ label, value, mono, accent }) => (
  <div>
    <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1">
      {label}
    </div>
    <div
      className={`text-sm font-semibold ${
        accent ? 'text-[#084E92]' : 'text-[#101828]'
      } ${mono ? 'font-mono' : ''}`}
    >
      {value || '—'}
    </div>
  </div>
);

const TotalStat = ({ label, value }) => (
  <div>
    <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">
      {label}
    </div>
    <div className="text-base font-bold text-[#101828] mt-0.5">
      {value}
    </div>
  </div>
);

const getAvailableStock = (item) => {
  if (typeof item?.currentStock === 'object' && item?.currentStock !== null) {
    return Number(item.currentStock.currentStock ?? item.currentStock.availableStock ?? item.currentStock.stock ?? 0);
  }
  if (typeof item?.currentStock === 'number') {
    return Number(item.currentStock);
  }
  if (item?.availableStock != null) {
    return Number(item.availableStock);
  }
  if (item?.stock != null) {
    return Number(item.stock);
  }
  return 0;
};

const mapItem = (d) => ({
  id: d.id ?? 0,
  rawMaterialId: d.rawMaterialId,
  name: d.rawMaterialName || d.name || '',
  uomId: d.uomId,
  unit: d.uomName || d.unit || '',
  allowedUnits: d.allowedUnits || [],
  availableStock: d.availableStock ?? 0,
  stockUnit: d.stockUnit || '',
  quantity: d.quantity != null ? (Number(d.quantity) || 0) : 1,
});

// ---------------------------------------------------------------------------
// ApprovalView
// ---------------------------------------------------------------------------
export default function ApprovalView({
  requisition,
  mode = "approve",
  canEdit = true,
  onBack,
  onSave,
  onApprove,
  onReject,
}) {
  const isReject = mode === "reject";

  // ---- Item state ----
  const [items, setItems] = useState(() =>
    (requisition?.details ?? []).map(mapItem)
  );

  useEffect(() => {
    if (requisition?.details) {
      setItems((requisition.details || []).map(mapItem));
    }
  }, [requisition?.id, requisition?.details]);

  const [searchTerm, setSearchTerm] = useState("");

  // ---- Raw materials (for the add-item picker) ----
  const [rawMaterials, setRawMaterials] = useState([]);
  const [rmLoading, setRmLoading] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  // ---- Form state ----
  const [remarks, setRemarks] = useState("");
  const [remarksTouched, setRemarksTouched] = useState(false);

  // ---- Button loading states ----
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const busy = saving || approving || rejecting;

  useEffect(() => {
    const load = async () => {
      setRmLoading(true);
      try {
        const orgId = requisition?.outletId || '';
        const subId = requisition?.subOutletId || '';
        const res = await getAllRawMaterialItems(null, 0, true, "", "", "", orgId, subId);
        const list = res?.data?.data?.["Raw Material Details"] || res?.data?.["Raw Material Details"] || [];
        const rawItems = Array.isArray(list) ? list : [];

        setRawMaterials(rawItems);

        setItems((prev) =>
          prev.map((it) => {
            const matchedRaw = rawItems.find((r) => Number(r.id) === Number(it.rawMaterialId));
            const availStock = matchedRaw ? getAvailableStock(matchedRaw) : it.availableStock;

            const allowedUnits =
              Array.isArray(matchedRaw?.allowedUnits) && matchedRaw.allowedUnits.length > 0
                ? matchedRaw.allowedUnits
                : matchedRaw?.unit
                ? [matchedRaw.unit]
                : it.allowedUnits || [];

            const stockUnit =
              matchedRaw?.currentStock?.unitName ||
              matchedRaw?.currentStock?.unitSymbol ||
              matchedRaw?.unit?.nameEnglish ||
              matchedRaw?.unit?.symbolEnglish ||
              matchedRaw?.unitName ||
              matchedRaw?.unitSymbol ||
              it.stockUnit ||
              '';

            return {
              ...it,
              availableStock: availStock,
              stockUnit,
              allowedUnits,
            };
          })
        );
      } catch (err) {
        console.error('Failed to load raw materials in approval view', err);
      } finally {
        setRmLoading(false);
      }
    };
    load();
  }, [requisition?.outletId, requisition?.subOutletId, requisition?.details]);

  // ---- Item mutations ----
  const alreadyAddedIds = useMemo(
    () => new Set(items.map((it) => String(it.rawMaterialId))),
    [items]
  );

  const handleAddItem = (raw) => {
    const uomId = raw.currentStock?.unitId ?? raw.unitId ?? raw.unit?.id ?? 0;
    const uomName =
      raw.currentStock?.unitName ||
      raw.currentStock?.unitSymbol ||
      raw.unit?.nameEnglish ||
      raw.unit?.symbolEnglish ||
      raw.unitName ||
      "";
    let allowedUnits =
      Array.isArray(raw.allowedUnits) && raw.allowedUnits.length > 0
        ? [...raw.allowedUnits]
        : raw.unit
        ? [raw.unit]
        : [];

    if (
      raw.currentStock?.unitId &&
      !allowedUnits.some((u) => Number(u.id) === Number(raw.currentStock.unitId))
    ) {
      allowedUnits = [
        {
          id: raw.currentStock.unitId,
          nameEnglish: raw.currentStock.unitName || raw.currentStock.unitSymbol || 'Unit',
          symbolEnglish: raw.currentStock.unitSymbol || '',
        },
        ...allowedUnits,
      ];
    }

    if (!uomId || !uomName) {
      setAddItemError(
        `"${raw.nameEnglish}" has no unit configured and can't be added.`
      );
      return;
    }
    setAddItemError("");
    const stockUnit =
      (typeof raw.currentStock === 'object' && raw.currentStock !== null
        ? raw.currentStock.unitName || raw.currentStock.unitSymbol
        : '') || '';

    setItems((prev) => [
      ...prev,
      {
        id: 0,
        rawMaterialId: raw.id,
        name: raw.nameEnglish,
        uomId,
        unit: uomName,
        allowedUnits,
        availableStock: getAvailableStock(raw),
        stockUnit,
        quantity: 1,
      },
    ]);
  };

  const updateUnit = (rawMaterialId, selectedUnitId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (Number(it.rawMaterialId) === Number(rawMaterialId)) {
          const rm = rawMaterials.find((r) => Number(r.id) === Number(rawMaterialId));
          const unitsList = it.allowedUnits?.length
            ? it.allowedUnits
            : (Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
                ? rm.allowedUnits
                : (rm?.unit ? [rm.unit] : []));
          const selected = unitsList.find((u) => String(u.id) === String(selectedUnitId));
          const uName = selected?.nameEnglish || selected?.symbolEnglish || it.unit;
          return {
            ...it,
            uomId: selectedUnitId ? Number(selectedUnitId) : it.uomId,
            unit: selectedUnitId ? uName : it.unit,
          };
        }
        return it;
      })
    );
  };

  const updateQty = (rawMaterialId, value) => {
    setItems((prev) =>
      prev.map((it) =>
        Number(it.rawMaterialId) === Number(rawMaterialId)
          ? { ...it, quantity: value === '' ? '' : Math.max(0, Number(value) || 0) }
          : it
      )
    );
  };

  const removeItem = (rawMaterialId) =>
    setItems((prev) => prev.filter((it) => Number(it.rawMaterialId) !== Number(rawMaterialId)));

  // ---- Filtered view ----
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.name || '').toLowerCase().includes(q));
  }, [items, searchTerm]);

  // ---- Totals ----
  const totals = useMemo(
    () => ({
      count: items.length,
      quantity: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    }),
    [items]
  );

  // ---- Validation ----
  const remarksMissing = isReject && remarks.trim().length === 0;

  const buildDetailsPayload = () =>
    items.map((it) => ({
      id: it.id ?? 0,
      rawMaterialId: it.rawMaterialId,
      rawMaterialName: it.name,
      uomId: it.uomId,
      uomName: it.unit,
      quantity: Number(it.quantity) || 0,
    }));

  // ---- Actions ----
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ details: buildDetailsPayload(), remarks: remarks.trim() });
    } catch (err) {
      console.error('Failed to save requisition', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove?.({ details: buildDetailsPayload(), remarks: remarks.trim() });
    } catch (err) {
      console.error('Failed to approve requisition', err);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRemarksTouched(true);
    if (remarksMissing) return;
    setRejecting(true);
    try {
      await onReject?.({ remarks: remarks.trim() });
    } catch (err) {
      console.error('Failed to reject requisition', err);
    } finally {
      setRejecting(false);
    }
  };

  // ---- Render ----
  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title={isReject ? "Reject Purchase Requisition" : "Purchase Approval View"}
          description={
            isReject
              ? "Enter a reason for rejecting this requisition. This will be shared with the requester."
              : "Review and adjust line item quantities before saving or approving."
          }
          actions={
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] transition-colors bg-transparent border-0 p-0"
              >
                <ArrowLeft size={16} />
                Back to approvals
              </button>
              <button
                type="button"
                className="cursor-pointer h-10 px-4 rounded-xl border border-[#E7EAF0] bg-white text-sm font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F9FAFC] transition-colors shrink-0"
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          }
          className="mb-8"
        />

        {/* Requisition info card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] px-6 py-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-[#101828] font-semibold text-sm">
              <ClipboardList size={16} className="text-[#2952E3]" />
              Requisition information
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#FDF1E3] text-[#B5590B]">
              PR status: {requisition?.status || 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            <InfoField label="PR code" value={requisition?.code || requisition?.prCode} mono accent />
            <InfoField label="PR date" value={requisition?.date || requisition?.prDate} />
            <InfoField label="Outlet" value={requisition?.outlet || requisition?.outletName} />
            <InfoField label="Sub-Unit / Location" value={requisition?.subOutletName || requisition?.locationName} />
            <InfoField label="Required by" value={requisition?.requiredDate || requisition?.prRequiredDate} />
          </div>

          <div className="mt-5 pt-5 border-t border-[#EFF1F5]">
            <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-2">
              Approver remarks
              {isReject && <span className="text-[#C0293D]"> *</span>}
            </div>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onBlur={() => isReject && setRemarksTouched(true)}
              placeholder={
                isReject
                  ? "Explain why this requisition is being rejected…"
                  : "Optional notes for the requester…"
              }
              className={`w-full max-w-md h-9 px-3 rounded-lg border text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 ${
                remarksTouched && remarksMissing
                  ? "border-[#F0B4BC] focus:border-[#C0293D]"
                  : "border-[#E7EAF0] focus:border-[#2952E3]"
              }`}
            />
            {remarksTouched && remarksMissing && (
              <p className="text-[11px] text-[#C0293D] mt-1.5">
                Remarks are required to reject a requisition.
              </p>
            )}
            {requisition?.remarks && (
              <p className="text-[11px] text-[#98A2B3] mt-1.5">
                Requester remarks: {requisition.remarks}
              </p>
            )}
          </div>
        </div>

        {/* Add-item row — approve mode only */}
        {!isReject && canEdit && (
          <div className="flex items-center gap-3 mb-5">
            <RawMaterialSearchPicker
              items={rawMaterials}
              alreadyAddedIds={alreadyAddedIds}
              onSelect={handleAddItem}
              loading={rmLoading}
              isSticky={true}
            />
          </div>
        )}

        {addItemError && (
          <p className="text-xs text-[#C0293D] mb-3">{addItemError}</p>
        )}

        {/* Item table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7EAF0]">
            <div className="flex items-center gap-2 text-[#101828] font-semibold text-sm">
              <ClipboardList size={16} className="text-[#2952E3]" />
              Item details list
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFC] border-b border-[#E7EAF0]">
                {[
                  "Sr. no.",
                  "Item name",
                  "Unit",
                  "Available Stock",
                  "Quantity",
                  ...(isReject || !canEdit ? [] : ["Action"]),
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left font-semibold text-[#667085] text-[11px] uppercase tracking-wide px-5 py-3.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={isReject || !canEdit ? 5 : 6}
                    className="px-5 py-14 text-center text-sm text-[#98A2B3]"
                  >
                    {items.length === 0
                      ? "No items on this requisition."
                      : "No items match your search."}
                  </td>
                </tr>
              )}

              {filteredItems.map((it, idx) => (
                <tr
                  key={it.rawMaterialId || it.id || idx}
                  className={idx !== filteredItems.length - 1 ? "border-b border-[#EFF1F5]" : ""}
                >
                  <td className="px-5 py-4 text-[#667085] font-medium">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#101828] font-semibold">{it.name}</div>
                  </td>
                  <td className="px-5 py-4 min-w-[150px]">
                    {isReject || !canEdit ? (
                      <span className="text-[#475467]">{it.unit || "—"}</span>
                    ) : (
                      (() => {
                        const rm = rawMaterials.find((r) => Number(r.id) === Number(it.rawMaterialId));
                        const allowedList = it.allowedUnits?.length
                          ? it.allowedUnits
                          : (Array.isArray(rm?.allowedUnits) && rm.allowedUnits.length > 0
                              ? rm.allowedUnits
                              : (rm?.unit ? [rm.unit] : []));

                        let options = allowedList
                          .filter((u) => u && (u.id || u.unitId))
                          .map((u) => ({
                            value: String(u.id || u.unitId),
                            label: u.nameEnglish || u.symbolEnglish || u.unitName || `Unit #${u.id || u.unitId}`,
                          }));

                        if (it.uomId && !options.some((opt) => String(opt.value) === String(it.uomId))) {
                          options = [
                            { value: String(it.uomId), label: it.unit || `Unit #${it.uomId}` },
                            ...options,
                          ];
                        }

                        return (
                          <div className="min-w-[120px] max-w-[170px]">
                            <SearchableSelect
                              name={`unit-${it.rawMaterialId || it.id}`}
                              value={it.uomId ? String(it.uomId) : ""}
                              onChange={(e) => updateUnit(it.rawMaterialId, e.target.value)}
                              options={options}
                              placeholder="Select unit"
                              disabled={isReject || !canEdit}
                            />
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[#475467] font-medium">
                      {it.availableStock != null
                        ? `${Number(it.availableStock).toFixed(2)}${it.stockUnit ? ` ${it.stockUnit}` : ''}`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {isReject || !canEdit ? (
                      <span className="text-[#475467] font-medium">{(Number(it.quantity) || 0).toFixed(2)}</span>
                    ) : (
                      <input
                        value={it.quantity}
                        onChange={(e) => updateQty(it.rawMaterialId, e.target.value)}
                        type="number"
                        min={0}
                        className="w-24 h-9 px-2.5 rounded-lg border border-[#E7EAF0] text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                      />
                    )}
                  </td>

                  {!isReject && canEdit && (
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removeItem(it.rawMaterialId)}
                        className="cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center text-[#C0293D] hover:bg-[#FBEAEC] transition-colors"
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals footer */}
          <div className="grid grid-cols-2 px-5 py-4 border-t border-[#E7EAF0] bg-[#F9FAFC]">
            <TotalStat label="Total items" value={String(totals.count).padStart(2, "0")} />
            <TotalStat label="Total quantity" value={(Number(totals.quantity) || 0).toFixed(2)} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          {isReject ? (
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="cursor-pointer h-11 px-5 rounded-xl bg-[#C0293D] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#a52233] transition-colors disabled:opacity-60"
            >
              {rejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Reject requisition
            </button>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="cursor-pointer h-11 px-5 rounded-xl border border-[#E7EAF0] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F9FAFC] transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Save
                </button>
              )}

              <button
                type="button"
                onClick={handleApprove}
                disabled={busy}
                className="cursor-pointer h-11 px-5 rounded-xl bg-[#2952E3] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#2444c4] transition-colors disabled:opacity-60"
              >
                {approving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {canEdit ? 'Save & Approve' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}