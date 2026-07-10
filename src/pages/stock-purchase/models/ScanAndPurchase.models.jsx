import { useState, useMemo } from "react";
import { ChevronDown, ScanLine, Trash2 } from "lucide-react";
import { ModalShell, ModalHeader, ModalFooter } from "./purchases.models";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const cellInputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white " +
  "outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const TAX_TAGS = ["CGST", "SGST", "IGST"];

let nextId = 2;
const emptyLine = (id = 1) => ({
  id,
  rawMaterial: "",
  qty: "",
  unit: "",
  price: "",
  activeTaxes: [],
});

/**
 * Scan & Purchase modal.
 * Render conditionally from the parent, e.g.:
 *   const [scanOpen, setScanOpen] = useState(false);
 *   <button onClick={() => setScanOpen(true)}>Scan & Purchase</button>
 *   {scanOpen && (
 *     <ScanPurchaseModal
 *       onClose={() => setScanOpen(false)}
 *       onAddPurchase={(purchase) => { ...save it...; setScanOpen(false); }}
 *     />
 *   )}
 */
const ScanPurchaseModal = ({ onClose, onAddPurchase }) => {
  const [supplier, setSupplier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [scanQuery, setScanQuery] = useState("");
  const [lineItems, setLineItems] = useState([emptyLine(1)]);

  const updateLine = (id, field, value) =>
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, [field]: value } : li)));

  const toggleTax = (id, tag) =>
    setLineItems((items) =>
      items.map((li) =>
        li.id === id
          ? {
              ...li,
              activeTaxes: li.activeTaxes.includes(tag)
                ? li.activeTaxes.filter((t) => t !== tag)
                : [...li.activeTaxes, tag],
            }
          : li,
      ),
    );

  const removeLine = (id) =>
    setLineItems((items) => (items.length === 1 ? items : items.filter((li) => li.id !== id)));

  const lineAmount = (li) => (Number(li.qty) || 0) * (Number(li.price) || 0);

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;
    // Wire this up to your barcode/raw-material lookup.
    setLineItems((items) => [...items, emptyLine(nextId++)]);
    setScanQuery("");
  };

  const subTotal = useMemo(() => lineItems.reduce((sum, li) => sum + lineAmount(li), 0), [lineItems]);

  // Placeholder tax calc: swap in real CGST/SGST/IGST rates per raw material.
  const totalTax = 0;
  const roundOff = 0;
  const grandTotal = subTotal + totalTax + roundOff;

  const handleAddPurchase = () => {
    const purchase = { supplier, invoiceDate, lineItems, subTotal, totalTax, roundOff, grandTotal };
    if (onAddPurchase) {
      onAddPurchase(purchase);
    } else {
      alert("Purchase added");
      onClose();
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-3xl">
      <ModalHeader
        title="Scan & Purchase"
        subtitle="Scan raw materials or add them manually to build this purchase."
        onClose={onClose}
      />

      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">Purchase From :</span>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="scanPurchaseFrom"
              checked
              readOnly
              className="accent-sky-900 w-4 h-4 cursor-pointer"
            />
            Supplier
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Supplier</Label>
            <div className="relative">
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer pr-8`}
              >
                <option value="">Select Supplier</option>
                <option value="shubh">Shubh Enterprises</option>
                <option value="nexora">Nexora Traders</option>
                <option value="vertex">Vertex Fabrics Pvt Ltd</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <Label required>Invoice Date</Label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <form onSubmit={handleScanSubmit}>
          <div className="relative">
            <ScanLine className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              placeholder="Scan Raw Materials or type to search..."
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 bg-gray-50 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition placeholder-gray-400"
            />
          </div>
        </form>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" className="accent-sky-900 cursor-pointer" />
                </th>
                <th className="px-3 py-3">Raw Material *</th>
                <th className="px-3 py-3 w-20">Qty *</th>
                <th className="px-3 py-3 w-24">Unit *</th>
                <th className="px-3 py-3 w-24">Price</th>
                <th className="px-3 py-3 w-28">Amount</th>
                <th className="px-3 py-3 w-40">Tax (%)</th>
                <th className="px-3 py-3 w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" className="accent-sky-900 cursor-pointer" />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={li.rawMaterial}
                      onChange={(e) => updateLine(li.id, "rawMaterial", e.target.value)}
                      className={`${cellInputCls} cursor-pointer`}
                    >
                      <option value="">Select/Add Raw Material</option>
                      <option value="flour">Refined Flour</option>
                      <option value="sugar">Sugar</option>
                      <option value="oil">Cooking Oil</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      value={li.qty}
                      onChange={(e) => updateLine(li.id, "qty", e.target.value)}
                      placeholder="0"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={li.unit}
                      onChange={(e) => updateLine(li.id, "unit", e.target.value)}
                      className={`${cellInputCls} cursor-pointer`}
                    >
                      <option value="">Unit</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      value={li.price}
                      onChange={(e) => updateLine(li.id, "price", e.target.value)}
                      placeholder="0.05"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-gray-400 font-medium">{lineAmount(li).toFixed(2)}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {TAX_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTax(li.id, tag)}
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                            li.activeTaxes.includes(tag)
                              ? "border-sky-300 bg-sky-50 text-sky-900"
                              : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeLine(li.id)}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition cursor-pointer bg-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-8 text-sm pt-1">
          <span className="text-gray-500 font-semibold">
            Total Tax : <span className="font-bold text-gray-700">Rs. {totalTax.toFixed(2)}</span>
          </span>
          <span className="text-gray-500 font-semibold">
            Round off : <span className="font-bold text-gray-700">Rs. {roundOff.toFixed(2)}</span>
          </span>
          <span className="text-gray-700 font-semibold">
            Grand Total : <span className="font-bold text-sky-900">Rs. {grandTotal.toFixed(2)}</span>
          </span>
        </div>
      </div>

      <ModalFooter onCancel={onClose} onSave={handleAddPurchase} saveLabel="+ Add Purchase" />
    </ModalShell>
  );
};

export default ScanPurchaseModal;