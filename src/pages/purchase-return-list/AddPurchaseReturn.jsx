import { useState, useMemo } from "react";
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  MoreVertical,
  SquarePen,
  Trash2,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router";
import { OtherChargesModal } from "../stock-purchase/models/purchases.models";
import { Container } from '@/components/common/container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

let nextId = 2;
const emptyLine = (id = 1) => ({
  id,
  rawMaterial: "",
  qty: "",
  unit: "",
  price: "",
});

const AddPurchaseReturn = () => {
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [poNumber] = useState("PO0000000001");
  const [debitNoteNo, setDebitNoteNo] = useState("");

  const [lineItems, setLineItems] = useState([emptyLine(1)]);

  const [charges, setCharges] = useState([]);
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false);

  const [paymentType, setPaymentType] = useState("unpaid");
  const [recipientCanEdit, setRecipientCanEdit] = useState(true);

  const addLine = () => setLineItems((items) => [...items, emptyLine(nextId++)]);

  const removeLine = (id) =>
    setLineItems((items) => (items.length === 1 ? items : items.filter((li) => li.id !== id)));

  const updateLine = (id, field, value) =>
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, [field]: value } : li)));

  const lineAmount = (li) => (Number(li.qty) || 0) * (Number(li.price) || 0);

  const subTotal = useMemo(() => lineItems.reduce((sum, li) => sum + lineAmount(li), 0), [lineItems]);

  const chargesTotal = useMemo(
    () =>
      charges.reduce((sum, c) => {
        const amt = Number(c.amount) || 0;
        const taxPct = (Number(c.cgst) || 0) + (Number(c.sgst) || 0);
        return sum + amt + (amt * taxPct) / 100;
      }, 0),
    [charges],
  );

  const grandTotal = useMemo(() => Math.max(0, subTotal + chargesTotal), [subTotal, chargesTotal]);

  const handleSave = () => {
    navigate("/purchases");
  };

  return (
     <Container>
    <div className="mx-auto px-4">
      <div>
        <div className="mb-3">
          <h1 className="font-bold text-[#101828] text-[28px]">Add Purchase Return</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6 space-y-5">
          {/* Purchase from */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Purchase From :</span>
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              </span>
              Supplier
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <Label required>Supplier/Third Party</Label>
              <div className="relative">
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="shubh">Shubh Enterprises</SelectItem>
                      <SelectItem value="nexora">Nexora Traders</SelectItem>
                      <SelectItem value="vertex">Vertex Fabrics Pvt Ltd</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>
            <div className="flex-1">
              <Label required>Debit Note Date</Label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className={`${inputCls} text-gray-500`}
              />
            </div>
            <div className="flex-1">
              <Label>Debit Note No</Label>
              <input
                type="text"
                value={debitNoteNo}
                onChange={(e) => setDebitNoteNo(e.target.value)}
                placeholder="Enter Debit Note No"
                className={`${inputCls} text-gray-400`}
              />
            </div>
            <div className="flex-1">
              <Label>Purchase Invoice Number</Label>
              <input value={poNumber} disabled className={`${inputCls} text-gray-400 bg-gray-50 cursor-not-allowed`} />
            </div>
            <button
              type="button"
              onClick={() => alert("Other details")}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white whitespace-nowrap"
            >
              Other Details
            </button>
          </div>

          {/* Line item toolbar */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New
            </button>
            <button
              type="button"
              onClick={() => alert("More actions")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              More Action
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Line items table */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox" className="accent-blue-600 cursor-pointer" />
                  </th>
                  <th className="px-3 py-3">Raw Material *</th>
                  <th className="px-3 py-3 w-20">Qty *</th>
                  <th className="px-3 py-3 w-24">Unit *</th>
                  <th className="px-3 py-3 w-24">Price</th>
                  <th className="px-3 py-3 w-28">Amount</th>
                  <th className="px-3 py-3 w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" className="accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={li.rawMaterial}
                        onValueChange={(value) =>
                          updateLine(li.id, "rawMaterial", value)
                        }
                      >
                        <SelectTrigger className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
                          <SelectValue placeholder="Select/Add Raw Material" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="flour">Refined Flour</SelectItem>
                          <SelectItem value="sugar">Sugar</SelectItem>
                          <SelectItem value="oil">Cooking Oil</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={li.unit}
                        onValueChange={(value) =>
                          updateLine(li.id, "unit", value)
                        }
                      >
                        <SelectTrigger className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-300">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="pcs">pcs</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <div className="text-gray-400 font-medium">{lineAmount(li).toFixed(2)}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => alert("Edit line item")}
                          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-blue-500 hover:text-blue-600 hover:border-blue-300 transition cursor-pointer bg-white"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(li.id)}
                          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-300 transition cursor-pointer bg-white"
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
          <div className="flex justify-between">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>

                <span className="text-gray-500">Sub Total :</span>
                </div>
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
                  onClick={() => setIsChargesModalOpen(true)}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-700 transition cursor-pointer bg-white border-0 p-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Delivery Charges
                </button>
                <span className="font-semibold text-gray-700">{chargesTotal.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-base font-bold text-gray-800">Grand Total :</span>
                <span className="text-base font-bold text-gray-900">{grandTotal.toFixed(3)}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-500">Payment Type :</span>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setPaymentType("unpaid")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      paymentType === "unpaid"
                        ? "bg-white border-blue-300 text-blue-700 shadow-sm"
                        : "bg-transparent border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("paid")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      paymentType === "paid"
                        ? "bg-white border-emerald-300 text-emerald-700 shadow-sm"
                        : "bg-transparent border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient permission + footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
            <button
              type="button"
              onClick={() => setRecipientCanEdit((v) => !v)}
              className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer bg-white border-0 p-0"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center transition ${
                  recipientCanEdit ? "bg-emerald-500" : "border border-gray-300 bg-white"
                }`}
              >
                {recipientCanEdit && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
             Update Inventory Stock
            </button>

             <button
              type="button"
              onClick={() => setRecipientCanEdit((v) => !v)}
              className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer bg-white border-0 p-0"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center transition ${
                  recipientCanEdit ? "bg-emerald-500" : "border border-gray-300 bg-white"
                }`}
              >
                {recipientCanEdit && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
              Recipient can edit the invoice
            </button>
            </div>
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
                className="px-6 py-2.5 rounded-lg text-white bg-blue-700 hover:bg-blue-800 text-sm font-semibold border-0 cursor-pointer transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {isChargesModalOpen && (
        <OtherChargesModal
          charges={charges}
          onClose={() => setIsChargesModalOpen(false)}
          onSave={(rows) => {
            setCharges(rows);
            setIsChargesModalOpen(false);
          }}
        />
      )}
    </div>
    </Container>
  );
};

export default AddPurchaseReturn;