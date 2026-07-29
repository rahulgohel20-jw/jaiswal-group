import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const cellInputCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const RAW_MATERIALS = ["American Corn", "Atta", "Awadhi Paneer Masala", "Coke 200 Ml", "Broccoli"];
const UNITS = ["Kg", "GM", "Ltr", "Ml", "Pcs", "Btls"];

let nextId = 3;
const emptyLine = (id) => ({ id, rawMaterial: "", stock: "", unit: "", comments: "" });

const AddStock = ({ onCancel, onSave }) => {
  const [date, setDate] = useState("2026-07-03");
  const [lineItems, setLineItems] = useState([emptyLine(1), emptyLine(2)]);

  const addLine = () => setLineItems((items) => [...items, emptyLine(nextId++)]);

  const removeLine = (id) =>
    setLineItems((items) => (items.length === 1 ? items : items.filter((li) => li.id !== id)));

  const updateLine = (id, field, value) =>
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, [field]: value } : li)));

  const handleSave = () => {
    onSave?.({ date, lineItems });
  };

  return (
    <div className="min-h-screen -mt-4">
      <div className="max-w-6xl mx-auto space-y-5 pt-2">
        {/* Page header */}
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Add Available Stock</h1>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 self-start mt-1" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6 space-y-5">
          {/* Date */}
          <div className="max-w-xs">
            <Label required>Date</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputCls} text-gray-600`}
            />
          </div>

          {/* Line items table */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3 w-1/4">Raw Material</th>
                  <th className="px-4 py-3 w-1/4">Available Stock</th>
                  <th className="px-4 py-3 w-1/5">Unit</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={li.rawMaterial}
                          onChange={(e) => updateLine(li.id, "rawMaterial", e.target.value)}
                          className={`${cellInputCls} appearance-none cursor-pointer pr-8 ${
                            !li.rawMaterial ? "text-gray-400" : ""
                          }`}
                        >
                          <option value="">Select Raw Material</option>
                          {RAW_MATERIALS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={li.stock}
                        onChange={(e) => updateLine(li.id, "stock", e.target.value)}
                        placeholder="Available Stock"
                        className={cellInputCls}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={li.unit}
                          onChange={(e) => updateLine(li.id, "unit", e.target.value)}
                          className={`${cellInputCls} appearance-none cursor-pointer pr-8 ${
                            !li.unit ? "text-gray-400" : ""
                          }`}
                        >
                          <option value="">Select Unit</option>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={li.comments}
                        onChange={(e) => updateLine(li.id, "comments", e.target.value)}
                        placeholder="Comments"
                        className={cellInputCls}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeLine(li.id)}
                        className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-300 transition cursor-pointer bg-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add new row */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New
            </button>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-lg text-white bg-blue-800 hover:bg-blue-900 text-sm font-semibold border-0 cursor-pointer transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStock;