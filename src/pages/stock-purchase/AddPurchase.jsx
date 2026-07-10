import { useState, useMemo } from "react";
import {
  ChevronDown,
  Plus,
  Percent,
  MoreHorizontal,
  MoreVertical,
  UploadCloud,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  UploadInvoiceModal,
  DiscountModal,
  OtherChargesModal,
  TaxDetailsModal,
} from "./models/purchases.models";

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

const DEFAULT_DISCOUNT = { type: "amount", value: 0, taxTiming: "before" };
const DEFAULT_TAX_CONFIG = {
  tcs: { enabled: true, percentageWise: true, value: 0 },
  tds: { enabled: true, percentageWise: true, value: 0 },
};

const AddPurchase = () => {
  const navigate = useNavigate();

  const [purchaseFrom, setPurchaseFrom] = useState("supplier");
  const [supplier, setSupplier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceLevelDiscount, setInvoiceLevelDiscount] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState(null);

  const [lineItems, setLineItems] = useState([emptyLine(1)]);

  const [discountConfig, setDiscountConfig] = useState(DEFAULT_DISCOUNT);
  const [charges, setCharges] = useState([]);
  const [taxConfig, setTaxConfig] = useState(DEFAULT_TAX_CONFIG);

  const [paymentType, setPaymentType] = useState("unpaid");
  const [updateInventory, setUpdateInventory] = useState(true);

  // which modal is open: 'upload' | 'discount' | 'charges' | 'tax' | null
  const [activeModal, setActiveModal] = useState(null);

  const addLine = () => setLineItems((items) => [...items, emptyLine(nextId++)]);

  const removeLine = (id) =>
    setLineItems((items) => (items.length === 1 ? items : items.filter((li) => li.id !== id)));

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

  const lineAmount = (li) => (Number(li.qty) || 0) * (Number(li.price) || 0);

  const subTotal = useMemo(() => lineItems.reduce((sum, li) => sum + lineAmount(li), 0), [lineItems]);

  const discountAmount = useMemo(
    () =>
      discountConfig.type === "percentage"
        ? (subTotal * (Number(discountConfig.value) || 0)) / 100
        : Number(discountConfig.value) || 0,
    [discountConfig, subTotal],
  );

  const chargesTotal = useMemo(
    () =>
      charges.reduce((sum, c) => {
        const amt = Number(c.amount) || 0;
        const taxPct = (Number(c.cgst) || 0) + (Number(c.sgst) || 0);
        return sum + amt + (amt * taxPct) / 100;
      }, 0),
    [charges],
  );

  const otherTaxesTotal = useMemo(() => {
    const tcs = taxConfig.tcs.percentageWise
      ? (subTotal * (Number(taxConfig.tcs.value) || 0)) / 100
      : Number(taxConfig.tcs.value) || 0;
    const tds = taxConfig.tds.percentageWise
      ? (subTotal * (Number(taxConfig.tds.value) || 0)) / 100
      : Number(taxConfig.tds.value) || 0;
    return tcs - tds;
  }, [taxConfig, subTotal]);

  const grandTotal = useMemo(
    () => Math.max(0, subTotal - discountAmount + chargesTotal + otherTaxesTotal),
    [subTotal, discountAmount, chargesTotal, otherTaxesTotal],
  );

  const handleSave = () => {
    // Wire this up to your create-purchase API call
    alert("Purchase saved");
    navigate("/purchases");
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-4">
      <div className="max-w-5xl mx-auto space-y-5 pt-2">
        <div className="mb-1">
          <h1 className="text-2xl font-bold text-sky-900 leading-none">Add Purchase</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6 space-y-5">
          {/* Purchase from */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Purchase From :</span>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="purchaseFrom"
                checked={purchaseFrom === "supplier"}
                onChange={() => setPurchaseFrom("supplier")}
                className="accent-sky-900 w-4 h-4 cursor-pointer"
              />
              Supplier
            </label>
            <button
              type="button"
              onClick={() => alert("Select an existing Purchase Order / Sales record")}
              className="ml-auto px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Select Purchase Order/Sales
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label>Invoice Number</Label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className={inputCls}
              />
            </div>
          </div>

          {/* Line item toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New
            </button>
            <button
              type="button"
              onClick={() => setInvoiceLevelDiscount((v) => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                invoiceLevelDiscount
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              At Invoice Level
            </button>
            <button
              type="button"
              onClick={() => alert("More actions")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              More Action
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("upload")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white ml-auto"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {invoiceFile || "Upload Invoice"}
            </button>
          </div>

          {/* Line items table */}
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
                  <th className="px-3 py-3 w-20">Action</th>
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
                        placeholder="0.00"
                        className={cellInputCls}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-500 font-medium">{lineAmount(li).toFixed(2)}</div>
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => alert("Edit line item")}
                          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition cursor-pointer bg-white"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(li.id)}
                          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition cursor-pointer bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + payment type block, right-aligned like the reference */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sub Total :</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800">{subTotal.toFixed(3)}</span>
                  <button
                    type="button"
                    onClick={() => alert("Subtotal breakdown")}
                    className="text-gray-300 hover:text-gray-500 transition cursor-pointer bg-white border-0 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setActiveModal("discount")}
                  className="flex items-center gap-1 text-gray-500 hover:text-sky-900 transition cursor-pointer bg-white border-0 p-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Total Discount
                </button>
                <span className="font-semibold text-red-500">- {discountAmount.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setActiveModal("charges")}
                  className="flex items-center gap-1 text-gray-500 hover:text-sky-900 transition cursor-pointer bg-white border-0 p-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Other Charges
                </button>
                <span className="font-semibold text-gray-700">{chargesTotal.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setActiveModal("tax")}
                  className="flex items-center gap-1 text-gray-500 hover:text-sky-900 transition cursor-pointer bg-white border-0 p-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Other Taxes
                </button>
                <span className="font-semibold text-gray-700">{otherTaxesTotal.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-base font-bold text-gray-800">Grand Total :</span>
                <span className="text-base font-bold text-gray-900">{grandTotal.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-500">Payment Type :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType("unpaid")}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      paymentType === "unpaid"
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("paid")}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      paymentType === "paid"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory + footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={updateInventory}
                onChange={(e) => setUpdateInventory(e.target.checked)}
                className="accent-sky-900 w-4 h-4 cursor-pointer"
              />
              Update Inventory Stock
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-lg text-white bg-sky-900 hover:bg-sky-800 text-sm font-semibold border-0 cursor-pointer transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeModal === "upload" && (
        <UploadInvoiceModal
          currentFileName={invoiceFile}
          onClose={() => setActiveModal(null)}
          onSave={(fileName) => {
            setInvoiceFile(fileName);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === "discount" && (
        <DiscountModal
          config={discountConfig}
          subTotal={subTotal}
          onClose={() => setActiveModal(null)}
          onSave={(config) => {
            setDiscountConfig(config);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === "charges" && (
        <OtherChargesModal
          charges={charges}
          onClose={() => setActiveModal(null)}
          onSave={(rows) => {
            setCharges(rows);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === "tax" && (
        <TaxDetailsModal
          taxConfig={taxConfig}
          onClose={() => setActiveModal(null)}
          onSave={(config) => {
            setTaxConfig(config);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
};

export default AddPurchase;