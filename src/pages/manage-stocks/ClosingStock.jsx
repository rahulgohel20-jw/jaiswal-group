import { useState, useMemo } from "react";
import { ChevronDown, Plus, Folder, Star } from "lucide-react";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const cellInputCls =
  "w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white " +
  "outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children }) => (
  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
    {children}
  </label>
);

const STOCK_ROWS = [
  { id: 1, category: "Fruits/vegetables", rawMaterial: "American Corn", stock: 0, unit: "TIN" },
  { id: 2, category: "Fruits/vegetables", rawMaterial: "American Corn", stock: 0, unit: "Bag" },
  { id: 3, category: "Fruits/vegetables", rawMaterial: "American Corn", stock: 0, unit: "pkt" },
  { id: 4, category: "Fruits/vegetables", rawMaterial: "American Corn", stock: 0, unit: "jar" },
];

const PAGE_COUNT = 4;

const ClosingStock = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("2026-07-02");
  const [updateFreq, setUpdateFreq] = useState("daily");
  const [currentPage, setCurrentPage] = useState(1);

  const [rows, setRows] = useState(
    STOCK_ROWS.reduce((acc, r) => {
      acc[r.id] = { value: "0", comment: "" };
      return acc;
    }, {}),
  );

  const categories = useMemo(() => [...new Set(STOCK_ROWS.map((r) => r.category))], []);

  const filteredRows = useMemo(() => {
    return STOCK_ROWS.filter((r) => {
      const matchesSearch = r.rawMaterial.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || r.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const updateRow = (id, field, value) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleClear = () => {
    setSearch("");
    setCategory("");
    setRows(
      STOCK_ROWS.reduce((acc, r) => {
        acc[r.id] = { value: "0", comment: "" };
        return acc;
      }, {}),
    );
  };

  const handleSave = () => {
    alert("Closing stock saved");
  };

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-50 -mt-4">
      <div className="max-w-6xl mx-auto space-y-5 pt-2">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Closing Stock</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => alert("Add Stock")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-white bg-blue-800 hover:bg-blue-900 text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
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
          <div className="grid grid-cols-5 gap-4 items-end">
            <div>
              <Label>Raw Material</Label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Material..."
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
              <Label>Update Frequency</Label>
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => alert("Loaded")}
                className="flex-1 px-4 py-2.5 rounded-lg text-white bg-blue-800 hover:bg-blue-900 text-sm font-semibold border-0 cursor-pointer transition"
              >
                Load
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
              >
                Clear
              </button>
            </div>
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
                <th className="px-4 py-3">Closing Stock ({formattedDate})</th>
                <th className="px-4 py-3">Update Your Closing Stock</th>
                <th className="px-4 py-3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3.5">
                    <Star className="w-4 h-4 text-gray-300 hover:text-amber-400 cursor-pointer transition" />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-800">{r.rawMaterial}</td>
                  <td className="px-4 py-3.5 text-gray-700">
                    {r.stock} {r.unit}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 max-w-[160px]">
                      <input
                        value={rows[r.id]?.value ?? ""}
                        onChange={(e) => updateRow(r.id, "value", e.target.value)}
                        className={cellInputCls}
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">/ {r.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      value={rows[r.id]?.comment || ""}
                      onChange={(e) => updateRow(r.id, "comment", e.target.value)}
                      placeholder="Add comment..."
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

        {/* Pagination + Save */}
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            {Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold transition cursor-pointer border ${
                  currentPage === p
                    ? "bg-blue-800 border-blue-800 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(PAGE_COUNT, p + 1))}
              className="px-3.5 h-8 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(PAGE_COUNT)}
              className="px-3.5 h-8 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Last
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg text-white bg-blue-900 hover:bg-blue-950 text-sm font-semibold border-0 cursor-pointer transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClosingStock;