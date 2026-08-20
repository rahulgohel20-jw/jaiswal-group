import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  Trash2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { getAllRawMaterialItems } from "@/services/apiServices";

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";

// Normalises one `pr.details[]` entry into what the table expects.
// Only ONE quantity now — no separate requested vs approved split.
function mapItem(detail, idx) {
  return {
    id: detail.id ?? idx,
    name: detail.rawMaterialName ?? "Untitled item",
    rawMaterialId: detail.rawMaterialId,
    uomId: detail.uomId,
    unit: detail.uomName ?? "",
    quantity: Number(detail.quantity ?? 0),
  };
}

function Field({ label, value, mono, accent }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1.5">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${accent ? "text-[#2952E3]" : "text-[#101828]"}`}
        style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function TotalStat({ label, value }) {
  return (
    <div className="text-right px-4">
      <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className="text-lg font-bold text-[#101828]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raw-material item picker
// ---------------------------------------------------------------------------
function RawMaterialPicker({ rawMaterials, alreadyAddedIds, onAdd, loading }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matches = useMemo(() => {
    const q = term.trim().toLowerCase();
    return rawMaterials
      .filter((rm) => !alreadyAddedIds.has(String(rm.id)))
      .filter((rm) =>
        q
          ? String(rm.nameEnglish || "").toLowerCase().includes(q) ||
            String(rm.itemCode || rm.code || "").toLowerCase().includes(q)
          : true
      )
      .slice(0, 8);
  }, [rawMaterials, term, alreadyAddedIds]);

  const handleSelect = (item) => {
    onAdd(item);
    setTerm("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] z-10" />
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={loading ? "Loading items…" : "Search item by name or code…"}
        disabled={loading}
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      />

      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full max-h-64 overflow-y-auto bg-white border border-[#E7EAF0] rounded-xl shadow-lg">
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/60 transition border-b border-[#EFF1F5] last:border-b-0"
            >
              <span className="text-sm font-semibold text-[#2952E3] truncate">
                {item.nameEnglish}
              </span>
              <span className="text-xs text-[#475467] shrink-0">
                {item.unit?.nameEnglish || item.unitName || "—"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && term.trim() && matches.length === 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-white border border-[#E7EAF0] rounded-xl shadow-lg px-4 py-4 text-sm text-[#98A2B3] text-center">
          No matching items found.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApprovalView
// ---------------------------------------------------------------------------
export default function ApprovalView({
  requisition,
  onBack,
  mode = "approve",
  onSave,
  onApprove,
  onReject,
}) {
  const isReject = mode === "reject";

  // ---- Item state ----
  const [items, setItems] = useState(() =>
    (requisition?.details ?? []).map(mapItem)
  );
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
    if (isReject) return;
    const load = async () => {
      setRmLoading(true);
      try {
        const res = await getAllRawMaterialItems(0, 0, true, "", "", "");
        setRawMaterials(res?.data?.data?.["Raw Material Details"] || []);
      } catch {
        // non-fatal — picker just stays empty
      } finally {
        setRmLoading(false);
      }
    };
    load();
  }, [isReject]);

  // ---- Item mutations ----
  const alreadyAddedIds = useMemo(
    () => new Set(items.map((it) => String(it.rawMaterialId))),
    [items]
  );

  const handleAddItem = (raw) => {
    const uomId = raw.unitId ?? raw.unit?.id ?? 0;
    const uomName = raw.unit?.nameEnglish || raw.unitName || "";

    if (!uomId || !uomName) {
      setAddItemError(
        `"${raw.nameEnglish}" has no unit configured and can't be added.`
      );
      return;
    }
    setAddItemError("");
    setItems((prev) => [
      ...prev,
      {
        id: 0,
        rawMaterialId: raw.id,
        name: raw.nameEnglish,
        uomId,
        unit: uomName,
        quantity: 1,
      },
    ]);
  };

  const updateQty = (id, value) => {
    const num = Math.max(0, Number(value) || 0);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: num } : it))
    );
  };

  const removeItem = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  // ---- Filtered view ----
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, searchTerm]);

  // ---- Totals ----
  const totals = useMemo(
    () => ({
      count: items.length,
      quantity: items.reduce((s, i) => s + i.quantity, 0),
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
      quantity: it.quantity,
    }));

  // ---- Actions ----
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ details: buildDetailsPayload(), remarks: remarks.trim() });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove?.({ details: buildDetailsPayload(), remarks: remarks.trim() });
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
    } finally {
      setRejecting(false);
    }
  };

  // ---- Render ----
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <style>{`@import url('${FONT_IMPORT_URL}'); * { font-family: 'Inter', sans-serif; }`}</style>

      <button
        onClick={onBack}
        className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-[#475467] hover:text-[#101828] mb-5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to approvals
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-[28px] font-bold text-[#101828]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {isReject ? "Reject Purchase Requisition" : "Purchase Approval View"}
          </h1>
          <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
            {isReject
              ? "Enter a reason for rejecting this requisition. This will be shared with the requester."
              : "Review and adjust line item quantities before saving or approving."}
          </p>
        </div>
        <button className="cursor-pointer h-10 px-4 rounded-xl border border-[#E7EAF0] bg-white text-sm font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F9FAFC] transition-colors shrink-0">
          <Download size={15} />
          Download PDF
        </button>
      </div>

      {/* Requisition info card */}
      <div className="bg-white rounded-2xl border border-[#E7EAF0] px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-[#101828] font-semibold text-sm">
            <ClipboardList size={16} className="text-[#2952E3]" />
            Requisition information
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#FDF1E3] text-[#B5590B]">
            PR status: Pending
          </span>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <Field label="PR code" value={requisition?.code} mono accent />
          <Field label="PR date" value={requisition?.date} />
          <Field label="Outlet location" value={requisition?.outlet} />
          <Field label="Required by" value={requisition?.requiredDate} />
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
      {!isReject && (
        <div className="flex items-center gap-3 mb-5">
          <RawMaterialPicker
            rawMaterials={rawMaterials}
            alreadyAddedIds={alreadyAddedIds}
            onAdd={handleAddItem}
            loading={rmLoading}
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
                "Quantity",
                ...(isReject ? [] : ["Action"]),
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
                  colSpan={isReject ? 4 : 5}
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
                key={it.id || it.rawMaterialId}
                className={idx !== filteredItems.length - 1 ? "border-b border-[#EFF1F5]" : ""}
              >
                <td className="px-5 py-4 text-[#667085] font-medium">
                  {String(idx + 1).padStart(2, "0")}
                </td>
                <td className="px-5 py-4">
                  <div className="text-[#101828] font-semibold">{it.name}</div>
                </td>
                <td className="px-5 py-4 text-[#475467]">{it.unit}</td>
                <td className="px-5 py-4">
                  {isReject ? (
                    <span className="text-[#475467]">{it.quantity.toFixed(2)}</span>
                  ) : (
                    <input
                      value={it.quantity}
                      onChange={(e) => updateQty(it.id ?? it.rawMaterialId, e.target.value)}
                      type="number"
                      min={0}
                      className="w-24 h-9 px-2.5 rounded-lg border border-[#E7EAF0] text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                    />
                  )}
                </td>

                {!isReject && (
                  <td className="px-5 py-4">
                    <button
                      onClick={() => removeItem(it.id ?? it.rawMaterialId)}
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
          <TotalStat label="Total quantity" value={totals.quantity.toFixed(2)} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {isReject ? (
          <button
            onClick={handleReject}
            disabled={busy}
            className="cursor-pointer h-11 px-5 rounded-xl bg-[#C0293D] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#a52233] transition-colors disabled:opacity-60"
          >
            {rejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Reject requisition
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={busy}
              className="cursor-pointer h-11 px-5 rounded-xl border border-[#E7EAF0] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F9FAFC] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save
            </button>

            <button
              onClick={handleApprove}
              disabled={busy}
              className="cursor-pointer h-11 px-5 rounded-xl bg-[#2952E3] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#2444c4] transition-colors disabled:opacity-60"
            >
              {approving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Save & Approve
            </button>
          </>
        )}
      </div>
    </div>
  );
}