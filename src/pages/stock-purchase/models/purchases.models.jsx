import { useState } from "react";
import { X, Lightbulb, UploadCloud, Truck, Plus, Trash2 } from "lucide-react";

export const ModalShell = ({ children, onClose, maxWidth = "max-w-md" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div
      className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
    >
      {children}
    </div>
  </div>
);

export const ModalHeader = ({ title, subtitle, onClose }) => (
  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
    <div>
      <h2 className="text-lg font-bold text-gray-900 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={onClose}
      className="text-gray-400 hover:text-gray-600 transition cursor-pointer bg-white border-0 p-0 flex-shrink-0"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

export const ModalFooter = ({ onCancel, onSave, saveLabel = "Save Changes" }) => (
  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
    <button
      type="button"
      onClick={onCancel}
      className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onSave}
      className="px-5 py-2.5 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-sm font-semibold border-0 cursor-pointer transition"
    >
      {saveLabel}
    </button>
  </div>
);

export const InfoNote = ({ children }) => (
  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-100">
    <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-900/80 leading-relaxed">{children}</p>
  </div>
);

export const RadioDot = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <span
      className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
        checked ? "border-blue-600" : "border-gray-300"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-blue-600" />}
    </span>
    <input type="radio" checked={checked} onChange={onChange} className="hidden" />
    {label}
  </label>
);

export const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition cursor-pointer border-0 flex-shrink-0 ${
      checked ? "bg-blue-600 justify-end" : "bg-gray-200 justify-start"
    }`}
    style={{ height: "22px" }}
  >
    <span className="w-4 h-4 rounded-full bg-white shadow" />
  </button>
);

const fieldCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 " +
  "outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

export const UploadInvoiceModal = ({ currentFileName, onClose, onSave }) => {
  const [fileName, setFileName] = useState(currentFileName || "");

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white">
          <UploadCloud className="w-4 h-4" />
          Update File
          <input type="file" accept=".png,.jpg,.jpeg,.gif,.pdf" onChange={handlePick} className="hidden" />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition cursor-pointer bg-white border-0 p-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="border-t border-gray-100 px-6 py-5">
        <InfoNote>
          Note: Upload only PNG, JPEG, JPG, GIF or PDF file and file size should be less than 2MB.
        </InfoNote>
        {fileName && (
          <p className="text-xs text-gray-500 mt-3">
            Selected file: <span className="font-semibold text-gray-700">{fileName}</span>
          </p>
        )}
      </div>
      <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(fileName)}
          className="px-6 py-2.5 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-sm font-semibold border-0 cursor-pointer transition"
        >
          Update
        </button>
      </div>
    </ModalShell>
  );
};

export const DiscountModal = ({ config, subTotal, onClose, onSave }) => {
  const [type, setType] = useState(config.type);
  const [value, setValue] = useState(config.value);
  const [taxTiming, setTaxTiming] = useState(config.taxTiming);

  const applicable = type === "percentage" ? (subTotal * (Number(value) || 0)) / 100 : Number(value) || 0;

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        title="Discount Details"
        subtitle="Configure discounts for this purchase"
        onClose={onClose}
      />
      <div className="px-6 py-5 space-y-4">
        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-800">Discount Type</p>
          <div className="flex items-center gap-6">
            <RadioDot checked={type === "amount"} onChange={() => setType("amount")} label="Amount ($)" />
            <RadioDot
              checked={type === "percentage"}
              onChange={() => setType("percentage")}
              label="Percentage (%)"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1.5">
              Total discount included in invoice
            </p>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className={`${fieldCls} pr-14`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                {type === "percentage" ? "%" : "INR"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Total applicable: <span className="font-semibold text-gray-600">Rs. {applicable.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-800">Determine when tax is applicable</p>
          <div className="flex items-center gap-6">
            <RadioDot
              checked={taxTiming === "before"}
              onChange={() => setTaxTiming("before")}
              label="Before tax"
            />
            <RadioDot
              checked={taxTiming === "after"}
              onChange={() => setTaxTiming("after")}
              label="After tax"
            />
          </div>
          <InfoNote>
            Discounts apply <span className="font-semibold">Before Tax</span> by default. Select the
            option if applying <span className="font-semibold">After Tax</span>.
          </InfoNote>
        </div>
      </div>
      <ModalFooter
        onCancel={onClose}
        onSave={() => onSave({ type, value: Number(value) || 0, taxTiming })}
      />
    </ModalShell>
  );
};

export const OtherChargesModal = ({ charges, onClose, onSave }) => {
  const [rows, setRows] = useState(
    charges.length ? charges : [{ id: 1, label: "Delivery Charge", amount: 0, cgst: 0, sgst: 0 }],
  );
  let nextId = useState(rows.length + 1)[0];

  const updateRow = (id, field, val) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: val } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: Date.now(), label: "Additional Charge", amount: 0, cgst: 0, sgst: 0 },
    ]);

  const removeRow = (id) => setRows((r) => (r.length === 1 ? r : r.filter((row) => row.id !== id)));

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader
        title="Other Charge Details"
        subtitle="Manage additional costs associated with this purchase."
        onClose={onClose}
      />
      <div className="px-6 py-5 space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-blue-500" />
                <input
                  value={row.label}
                  onChange={(e) => updateRow(row.id, "label", e.target.value)}
                  className="text-sm font-bold text-gray-800 bg-transparent outline-none border-0 p-0 w-40"
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition cursor-pointer bg-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">
                  {row.label} included in invoice
                </p>
                <input
                  type="number"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                  placeholder="Rs. 0.00"
                  className={fieldCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">CGST %</p>
                  <input
                    type="number"
                    min="0"
                    value={row.cgst}
                    onChange={(e) => updateRow(row.id, "cgst", e.target.value)}
                    placeholder="0%"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">SGST %</p>
                  <input
                    type="number"
                    min="0"
                    value={row.sgst}
                    onChange={(e) => updateRow(row.id, "sgst", e.target.value)}
                    placeholder="0%"
                    className={fieldCls}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition cursor-pointer bg-white"
        >
          <Plus className="w-4 h-4" />
          Add Another Charge
        </button>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => onSave(rows)} saveLabel="Save Details" />
    </ModalShell>
  );
};

const TaxSourceCard = ({ title, config, onChange }) => (
  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-sm font-bold text-gray-800">{title}</p>
      <div className="flex items-center gap-2">
        <ToggleSwitch
          checked={config.percentageWise}
          onChange={(v) => onChange({ ...config, percentageWise: v })}
        />
        <span className="text-xs font-medium text-gray-500">Percentage Wise</span>
      </div>
    </div>
    <div className="relative">
      <input
        type="number"
        min="0"
        value={config.value}
        onChange={(e) => onChange({ ...config, value: e.target.value })}
        placeholder="0.00"
        className={`${fieldCls} pr-10`}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
        {config.percentageWise ? "%" : "INR"}
      </span>
    </div>
    <p className="text-xs text-gray-400 flex items-center justify-between">
      <span>Total {title.includes("TCS") ? "TCS applicable" : "TDS deducted"} :</span>
      <span className="font-semibold text-gray-700">{(Number(config.value) || 0).toFixed(2)}</span>
    </p>
  </div>
);

export const TaxDetailsModal = ({ taxConfig, onClose, onSave }) => {
  const [tcs, setTcs] = useState(taxConfig.tcs);
  const [tds, setTds] = useState(taxConfig.tds);

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        title="Tax Details"
        subtitle="Configure tax collection and deduction details for this invoice."
        onClose={onClose}
      />
      <div className="px-6 py-5 space-y-4">
        <TaxSourceCard title="Tax collected at source (TCS)" config={tcs} onChange={setTcs} />
        <TaxSourceCard title="Tax deducted at source (TDS)" config={tds} onChange={setTds} />
      </div>
      <ModalFooter onCancel={onClose} onSave={() => onSave({ tcs, tds })} saveLabel="Save" />
    </ModalShell>
  );
};