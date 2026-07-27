import React, { useState } from "react";
import {
    Plus,
    Search,
    SlidersHorizontal,
    RotateCcw,
    Eye,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Package,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
import { Link } from "react-router";

// Dummy data — replace with API data
const MENU_ITEMS = [
    {
        id: 1,
        image: null,
        name: "Margherita Pizza",
        category: "Pizza",
        subCategory: "Veg Pizza",
        price: 8.5,
        sequence: 1,
        status: "Active",
    },
    {
        id: 2,
        image: null,
        name: "Chicken Alfredo Pasta",
        category: "Pasta",
        subCategory: "Non-Veg Pasta",
        price: 11.0,
        sequence: 2,
        status: "Active",
    },
    {
        id: 3,
        image: null,
        name: "Caesar Salad",
        category: "Salad",
        subCategory: "Starters",
        price: 6.25,
        sequence: 3,
        status: "Inactive",
    },
    {
        id: 4,
        image: null,
        name: "Chocolate Lava Cake",
        category: "Dessert",
        subCategory: "Cakes",
        price: 5.0,
        sequence: 4,
        status: "Active",
    },
];

const StatCard = ({ label, value, icon, tone }) => (
    <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-black mt-1">{value}</p>
        </div>
        <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}
        >
            {icon}
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const isActive = status === "Active";
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isActive
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-500"
            }`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-green-500" : "bg-red-500"
                }`}
            />
            {status}
        </span>
    );
};

const MenuItemsListing = ({ onAddNew }) => {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [categoryFilter, setCategoryFilter] = useState("Category Type");
    const [page, setPage] = useState(1);

    const totalItems = MENU_ITEMS.length;
    const activeItems = MENU_ITEMS.filter((i) => i.status === "Active").length;
    const inactiveItems = totalItems - activeItems;

    const filtered = MENU_ITEMS.filter((item) => {
        const matchesSearch = item.name
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === "All Status" || item.status === statusFilter;
        const matchesCategory =
            categoryFilter === "Category Type" || item.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All Status");
        setCategoryFilter("Category Type");
    };

    return (
        <div className="p-4 md:p-6 text-gray-600 bg-[#F8FAFC] min-h-screen">
            {/* Breadcrumb */}
            <p className="text-xs text-gray-400 mb-1">
                DASHBOARD &gt; MASTER DATA &gt;{" "}
                <span className="text-[#084E92] font-medium">MENU ITEMS</span>
            </p>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-black">
                        Menu Items Master
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 max-w-xl">
                        Manage your restaurant's menu catalog, pricing, and category
                        organization in one place.
                    </p>
                </div>

                <Link
                    to="/menu-item/add-menu-items   "
                    className="flex items-center gap-2 bg-[#084E92] text-white px-4 py-2.5 rounded-lg font-medium cursor-pointer whitespace-nowrap"
                >
                    <Plus size={18} />
                    Add New Item
                </Link>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Total Items"
                    value={totalItems}
                    icon={<Package size={18} className="text-[#084E92]" />}
                    tone="bg-blue-50"
                />
                <StatCard
                    label="Active Items"
                    value={activeItems}
                    icon={<CheckCircle2 size={18} className="text-green-600" />}
                    tone="bg-green-50"
                />
                <StatCard
                    label="Inactive Items"
                    value={inactiveItems}
                    icon={<XCircle size={18} className="text-red-500" />}
                    tone="bg-red-50"
                />
                <StatCard
                    label="Last Updated"
                    value="Today, 10:45 AM"
                    icon={<Clock size={18} className="text-[#084E92]" />}
                    tone="bg-blue-50"
                />
            </div>

            {/* Filters */}
            <div className="bg-white border rounded-xl p-3 flex flex-col md:flex-row gap-3 md:items-center mb-4">
                <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 bg-[#F8FAFC]">
                    <Search size={16} className="text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by item name..."
                        className="flex-1 bg-transparent outline-none text-sm"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] outline-none"
                >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                </select>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] outline-none"
                >
                    <option>Category Type</option>
                    <option>Pizza</option>
                    <option>Pasta</option>
                    <option>Salad</option>
                    <option>Dessert</option>
                </select>

                <button className="flex items-center justify-center gap-2 bg-[#084E92] text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
                    <SlidersHorizontal size={15} />
                    Apply Filters
                </button>

                <button
                    onClick={resetFilters}
                    className="flex items-center justify-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                >
                    <RotateCcw size={15} />
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b bg-[#F8FAFC]">
                                <th className="px-4 py-3 font-medium">S.NO</th>
                                <th className="px-4 py-3 font-medium">IMAGE</th>
                                <th className="px-4 py-3 font-medium">ITEM NAME</th>
                                <th className="px-4 py-3 font-medium">CATEGORY</th>
                                <th className="px-4 py-3 font-medium">SUB CATEGORY</th>
                                <th className="px-4 py-3 font-medium">PRICE</th>
                                <th className="px-4 py-3 font-medium">SEQ.</th>
                                <th className="px-4 py-3 font-medium">STATUS</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className="border-b last:border-0 hover:bg-gray-50"
                                >
                                    <td className="px-4 py-3">
                                        {String(idx + 1).padStart(2, "0")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Package size={16} className="text-gray-300" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-black">
                                        {item.name}
                                    </td>
                                    <td className="px-4 py-3">{item.category}</td>
                                    <td className="px-4 py-3">{item.subCategory}</td>
                                    <td className="px-4 py-3">${item.price.toFixed(2)}</td>
                                    <td className="px-4 py-3">{item.sequence}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <button className="hover:text-[#084E92] cursor-pointer">
                                                <Eye size={16} />
                                            </button>
                                            <button className="hover:text-[#084E92] cursor-pointer">
                                                <Pencil size={16} />
                                            </button>
                                            <button className="hover:text-red-500 cursor-pointer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-10 text-center text-gray-400"
                                    >
                                        No menu items match your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t text-sm">
                    <p className="text-gray-400">
                        Showing {filtered.length} of {totalItems} entries
                    </p>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {[1, 2, 3].map((n) => (
                            <button
                                key={n}
                                onClick={() => setPage(n)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${
                                    page === n
                                        ? "bg-[#084E92] text-white"
                                        : "border text-gray-500"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(3, p + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenuItemsListing;