import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Info,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import PurchaseRequisitionLog from './PurchaseRequisitionLog';

/* -------------------------------------------------------------------------
 * Shared style tokens & primitives
 * These mirror the conventions used across the Asset module (AddAsset.jsx)
 * so every ERP form in the app looks and behaves the same way.
 * ---------------------------------------------------------------------- */

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer';

const Label = ({ children, required, hint }) => (
  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500">*</span>}
    {hint && (
      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-[9px] leading-3.25 text-gray-400 text-center font-semibold">
        i
      </span>
    )}
  </label>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

// Options can be plain strings or { value, label } objects (dynamic API-backed lists).
const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectCls} disabled={disabled}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => {
        const val = typeof o === 'object' && o !== null ? o.value : o;
        const label = typeof o === 'object' && o !== null ? o.label : o;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
    {items.map((item, i) => (
      <span key={item} className="flex items-center gap-1.5">
        {i > 0 && <span className="text-gray-300">/</span>}
        <span className={i === items.length - 1 ? 'text-[#084E92] font-medium' : ''}>{item}</span>
      </span>
    ))}
  </nav>
);

// Stock-health indicator dot used in the item table.
const stockDotColor = {
  low: 'bg-red-500',
  medium: 'bg-amber-500',
  good: 'bg-emerald-500',
};

const StockBadge = ({ value, status }) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
    <span className={`w-1.5 h-1.5 rounded-full ${stockDotColor[status] || 'bg-gray-300'}`} />
    {Number(value).toFixed(2)}
  </span>
);

/* -------------------------------------------------------------------------
 * Mock catalogue ΓÇö stand-in for an item-master API in this standalone demo.
 * ---------------------------------------------------------------------- */

const ITEM_CATALOGUE = [
  { id: 'itm-1', code: 'GRC-LUB-050', name: 'Industrial Grade Lubricant XT-50', category: 'Grocery', unit: 'Litres', availableStock: 120, stockStatus: 'low' },
  { id: 'itm-2', code: 'VEG-FLG-012', name: 'Stainless Steel Flange 12"', category: 'Vegetable', unit: 'Units', availableStock: 45, stockStatus: 'medium' },
  { id: 'itm-3', code: 'GRC-CMP-240', name: 'Heavy Duty Compressor G-240', category: 'Grocery', unit: 'Units', availableStock: 3, stockStatus: 'good' },
  { id: 'itm-4', code: 'GRC-RCE-025', name: 'Basmati Rice Premium 25kg', category: 'Grocery', unit: 'Bags', availableStock: 210, stockStatus: 'good' },
  { id: 'itm-5', code: 'VEG-TOM-001', name: 'Fresh Tomatoes', category: 'Vegetable', unit: 'Kg', availableStock: 18, stockStatus: 'low' },
  { id: 'itm-6', code: 'GRC-OIL-005', name: 'Refined Sunflower Oil 15L', category: 'Grocery', unit: 'Cans', availableStock: 60, stockStatus: 'medium' },
];

const OUTLET_OPTIONS = [
  { value: 'wh-mumbai', label: 'Main Warehouse - Mumbai' },
  { value: 'wh-pune', label: 'Central Store - Pune' },
  { value: 'wh-delhi', label: 'Regional Depot - Delhi' },
];

const genPRCode = () => {
  const year = new Date().getFullYear();
  return `PDPU-PR-${year}-001`;
};

const todayInputDate = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

/* -------------------------------------------------------------------------
 * Item picker ΓÇö shared between the search box and the "Add Item" button.
 * ---------------------------------------------------------------------- */

const ItemPicker = ({ open, onClose, query, onQueryChange, results, onPick }) => {
  if (!open) return null;
  return (
    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      <div className="max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">No items match "{query}"</p>
        ) : (
          results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-blue-50/60 transition cursor-pointer border-0 bg-transparent"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#084E92] truncate">{item.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.category}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{item.code}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

const PAGE_SIZE = 3;

const PurchaseRequisition = () => {
  const [form, setForm] = useState({
    prCode: genPRCode(),
    date: todayInputDate(),
    outlet: 'wh-mumbai',
    remarks: '',
  });
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const [rows, setRows] = useState([
    { rowId: 1, ...ITEM_CATALOGUE[0], quantity: 500 },
    { rowId: 2, ...ITEM_CATALOGUE[1], quantity: 10 },
    { rowId: 3, ...ITEM_CATALOGUE[2], quantity: 2 },
  ]);
  const [nextRowId, setNextRowId] = useState(4);

  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchWrapRef = useRef(null);

  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const addedItemIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  const filteredCatalogue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ITEM_CATALOGUE.filter((item) => !addedItemIds.has(item.id)).filter(
      (item) => !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    );
  }, [searchQuery, addedItemIds]);

  const handlePickItem = (item) => {
    setRows((r) => [...r, { rowId: nextRowId, ...item, quantity: 1 }]);
    setNextRowId((n) => n + 1);
    setSearchQuery('');
    setPickerOpen(false);
  };

  const handleQuantityChange = (rowId, value) => {
    const numeric = value.replace(/[^\d]/g, '');
    setRows((r) => r.map((row) => (row.rowId === rowId ? { ...row, quantity: numeric } : row)));
  };

  const handleRemoveRow = (rowId) => {
    setRows((r) => r.filter((row) => row.rowId !== rowId));
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildRequisitionPayload = () => ({
    prCode: form.prCode,
    date: form.date,
    outletId: form.outlet,
    remarks: form.remarks,
    items: rows.map((r) => ({ itemId: r.id, code: r.code, quantity: Number(r.quantity) || 0 })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: wire to createPurchaseRequisition(buildRequisitionPayload())
      await new Promise((res) => setTimeout(res, 500));
    } finally {
      setSaving(false);
    }
  };

  const handleSendForApproval = async () => {
    setSaving(true);
    try {
      // TODO: wire to submitPurchaseRequisition(buildRequisitionPayload())
      await new Promise((res) => setTimeout(res, 500));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-screen pb-10">
      <Breadcrumb items={['Dashboard', 'Purchase', 'Purchase Requisition']} />

      <div className="flex flex-col gap-1 mt-3">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">Purchase Requisition</h1>
        <p className="text-[#43474F] mt-1 text-sm sm:text-base">
          Create a purchase requisition by selecting items and required quantities.
        </p>
      </div>

      {/* Requisition details */}
      <SectionCard className="mt-5">
        <SectionHeader icon={Info} title="Purchase Requisition Information" />
        <div className="px-4 sm:px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>PR Code</Label>
              <input
                value={form.prCode}
                disabled
                className={`${inputCls} bg-blue-50/60 text-[#084E92] font-medium cursor-not-allowed`}
              />
            </div>
            <div>
              <Label>Date</Label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Outlet Name</Label>
              <Select
                value={form.outlet}
                onChange={(e) => set('outlet', e.target.value)}
                placeholder="Select outlet"
                options={OUTLET_OPTIONS}
              />
            </div>
          </div>

          <div>
            <Label>Remarks</Label>
            <textarea
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              rows={3}
              placeholder="Add any specific instructions or reason for requisition..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </SectionCard>

      {/* Items to add */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Package}
          title="Items to Add"
          subtitle="Search the catalogue and add items with the required quantities."
        />
        <div className="px-4 sm:px-6 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1" ref={searchWrapRef}>
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPickerOpen(true);
                }}
                onFocus={() => setPickerOpen(true)}
                onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                placeholder="Search item by name or code..."
                className={`${inputCls} pl-9`}
              />
              <ItemPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                query={searchQuery}
                results={filteredCatalogue}
                onPick={handlePickItem}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold border-0 cursor-pointer hover:bg-emerald-600 transition shrink-0"
            >
              <ClipboardList className="w-4 h-4" />
              Log
            </button>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Items table */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                    <th className="text-left font-semibold px-4 py-3 w-16">Sr. No.</th>
                    <th className="text-left font-semibold px-4 py-3">Item Name</th>
                    <th className="text-left font-semibold px-4 py-3">Unit</th>
                    <th className="text-left font-semibold px-4 py-3">Available Stock</th>
                    <th className="text-left font-semibold px-4 py-3 w-32">Quantity</th>
                    <th className="text-left font-semibold px-4 py-3 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                        No items added yet. Use search or "Add Item" to get started.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, idx) => (
                      <tr key={row.rowId} className="border-t border-gray-100">
                        <td className="px-4 py-3.5 text-gray-500">
                          {String((page - 1) * PAGE_SIZE + idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[#084E92] font-medium">{row.name}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">{row.category}</p>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">{row.unit}</td>
                        <td className="px-4 py-3.5">
                          <StockBadge value={row.availableStock} status={row.stockStatus} />
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            value={row.quantity}
                            onChange={(e) => handleQuantityChange(row.rowId, e.target.value)}
                            inputMode="numeric"
                            className={`${inputCls} py-2`}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowId)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer bg-transparent border-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              {rows.length > 0 && `ΓÇô${Math.min(page * PAGE_SIZE, rows.length)}`} of {rows.length} items added to this
              requisition.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pb-2 mt-6 border-t border-gray-200 pt-6 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleSendForApproval}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 hover:bg-[#073e77] transition cursor-pointer disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          {saving ? 'Sending...' : 'Send For Approval'}
        </button>
      </div>

      <PurchaseRequisitionLog open={showLog} onClose={() => setShowLog(false)} prCode={form.prCode} />
    </div>
  );
};

export default PurchaseRequisition;