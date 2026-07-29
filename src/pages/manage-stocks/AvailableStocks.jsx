import { useState, useMemo } from "react";
import { ChevronDown, Plus, Folder, Star } from "lucide-react";
import { Link } from "react-router";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const cellInputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white text-center " +
  "outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children }) => (
  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
    {children}
  </label>
);

const STOCK_ROWS = [
  {
    id: 1,
    category: "Fruits/vegetables",
    rawMaterial: "American Corn",
    conversionQty: 1000,
    stock: "1000 Kg",
    unit1: "Kg",
    unit2: "GM",
    favorite: true,
  },
  {
    id: 2,
    category: "Rice/pulses/flours",
    rawMaterial: "Atta",
    conversionQty: 1000,
    stock: "800 Kg",
    unit1: "Kg",
    unit2: "GM",
    favorite: true,
  },
  {
    id: 3,
    category: "Oils/masala/salt/sugar",
    rawMaterial: "Awadhi Paneer Masala",
    conversionQty: 1000,
    stock: "1500 Kg, 500 GM",
    unit1: "Kg",
    unit2: "GM",
    favorite: true,
  },
  {
    id: 4,
    category: "Beverage",
    rawMaterial: "Coke 200 Ml",
    conversionQty: null,
    stock: "1400 Btls",
    unit1: "Btls",
    unit2: null,
    favorite: true,
  },
  {
    id: 5,
    category: "Fruits/vegetables",
    rawMaterial: "Broccoli",
    conversionQty: 1000,
    stock: "600 Kg",
    unit1: "Kg",
    unit2: "GM",
    favorite: true,
  },
];

const AvailableStocks = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("2026-07-03");
  const [updateFreq, setUpdateFreq] = useState("daily");

  const [rows, setRows] = useState(
    STOCK_ROWS.reduce((acc, r) => {
      acc[r.id] = { val1: "", val2: "", comment: "" };
      return acc;
    }, {}),
  );

  const filteredRows = useMemo(() => {
    return STOCK_ROWS.filter((r) => {
      const matchesSearch = r.rawMaterial.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || r.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const categories = useMemo(() => [...new Set(STOCK_ROWS.map((r) => r.category))], []);

  const updateRow = (id, field, value) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleClear = () => {
    setSearch("");
    setCategory("");
    setRows(
      STOCK_ROWS.reduce((acc, r) => {
        acc[r.id] = { val1: "", val2: "", comment: "" };
        return acc;
      }, {}),
    );
  };

  const handleSave = () => {
    alert("Stock changes saved");
  };

  return (
    <div className="min-h-screen -mt-4">
      <div className="max-w-6xl mx-auto space-y-5 pt-2">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Available Stock</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/stocks/add-stock"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-white bg-blue-800 hover:bg-blue-900 text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </Link>
            <button
              type="button"
              onClick={() => alert("Files")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <Folder className="w-4 h-4" />
              Files
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <div className="grid grid-cols-4 gap-4 items-end">
            <div>
              <Label>Raw Material</Label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item.."
                className={inputCls}
              />
            </div>
            <div>
              <Label>Category</Label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer pr-8`}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} text-gray-500`}
              />
            </div>
            <div>
              <Label>Closing Stock Updated on</Label>
              <div className="relative">
                <select
                  value={updateFreq}
                  onChange={(e) => setUpdateFreq(e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer pr-8`}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => alert("Loaded")}
              className="px-6 py-2 rounded-lg text-white bg-blue-900 hover:bg-blue-950 text-sm font-semibold border-0 cursor-pointer transition"
            >
              Load
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Raw Material</th>
                <th className="px-4 py-3">Available Stock</th>
                <th className="px-4 py-3 bg-blue-50/60 text-blue-900">Update Your Available Stock</th>
                <th className="px-4 py-3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3.5">
                    <Star
                      className={`w-4 h-4 ${
                        r.favorite ? "fill-amber-400 text-amber-400" : "text-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{r.category}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-gray-800">{r.rawMaterial}</div>
                    {r.conversionQty && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Conversion Qty: {r.conversionQty}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">{r.stock}</td>
                  <td className="px-4 py-3.5 bg-blue-50/40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          value={rows[r.id]?.val1 || ""}
                          onChange={(e) => updateRow(r.id, "val1", e.target.value)}
                          placeholder=""
                          className={cellInputCls}
                        />
                        <div className="text-[11px] text-gray-400 text-center mt-1">
                          / {r.unit1}
                        </div>
                      </div>
                      {r.unit2 && (
                        <div className="flex-1">
                          <input
                            value={rows[r.id]?.val2 || ""}
                            onChange={(e) => updateRow(r.id, "val2", e.target.value)}
                            placeholder=""
                            className={cellInputCls}
                          />
                          <div className="text-[11px] text-gray-400 text-center mt-1">
                            / {r.unit2}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      value={rows[r.id]?.comment || ""}
                      onChange={(e) => updateRow(r.id, "comment", e.target.value)}
                      className={cellInputCls}
                    />
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No raw materials match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer action */}
        <div className="flex justify-end pb-6">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg text-white bg-blue-900 hover:bg-blue-950 text-sm font-semibold border-0 cursor-pointer transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailableStocks;