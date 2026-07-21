'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  Search,
  Upload,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Layers,
  CheckCircle2,
  XCircle,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AddAssetItemModal, { CATEGORIES } from './AddAssetsItemModal';

// Seed data so the listing has something to show on first load
const SEED_ITEMS = [
  {
    id: 'AST-1001',
    category: 'IT Equipment',
    subCategory: 'Laptop',
    name: 'Dell Latitude 5440',
    description: '14" business laptop, i5, 16GB RAM.',
    status: 'Active',
  },
  {
    id: 'AST-1002',
    category: 'Kitchen Equipment',
    subCategory: 'Induction Hob',
    name: 'Bosch 4-Zone Induction Hob',
    description: 'Commercial-grade induction hob for main kitchen.',
    status: 'Active',
  },
  {
    id: 'AST-1003',
    category: 'Office Furniture',
    subCategory: 'Chair',
    name: 'Herman Miller Aeron',
    description: 'Ergonomic office chair, size B.',
    status: 'Inactive',
  },
  {
    id: 'AST-1004',
    category: 'IT Equipment',
    subCategory: 'Monitor',
    name: 'LG UltraWide 34"',
    description: 'Curved ultrawide monitor for design workstations.',
    status: 'Active',
  },
  {
    id: 'AST-1005',
    category: 'Vehicles',
    subCategory: 'Forklift',
    name: 'Toyota 8FBE15 Forklift',
    description: 'Electric forklift, 1.5T capacity, warehouse use.',
    status: 'Active',
  },
  {
    id: 'AST-1006',
    category: 'Office Furniture',
    subCategory: 'Desk',
    name: 'IKEA Bekant Standing Desk',
    description: 'Height-adjustable desk for open-plan office.',
    status: 'Inactive',
  },
];

const STATUS_OPTIONS = ['Active', 'Inactive'];
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
      status === 'Active'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}
  >
    {status.toUpperCase()}
  </span>
);

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, note, noteColor }) => (
  <div className="border border-[#C3C6D1] rounded-2xl p-4">
    <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-3 ${iconBg} ${iconColor}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-sm text-[#43474F]">{label}</p>
    <p className="text-xl font-semibold text-gray-900 mt-0.5">{value}</p>
    <p className={`text-xs mt-1 ${noteColor}`}>{note}</p>
  </div>
);

const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const isActive = sortConfig.key === sortKey;
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-1 ${isActive ? 'text-primary' : ''}`}>
        {label}
        <ChevronsUpDown className="h-3 w-3" />
      </span>
    </th>
  );
};

const AssetItemsList = () => {
  const [items, setItems] = useState(SEED_ITEMS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  // Draft filter values (what the person is typing/selecting)
  const [searchDraft, setSearchDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('All Categories');
  const [statusDraft, setStatusDraft] = useState('All Status');

  // Applied filter values (only updated when "Apply Filters" is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category: 'All Categories',
    status: 'All Status',
  });

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = (form) => {
    if (editingItem) {
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...form } : it)));
      setIsModalOpen(false);
      setEditingItem(null);
    } else {
      const newItem = {
        ...form,
        id: `AST-${1000 + items.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  };

  const applyFilters = () => {
    setAppliedFilters({ search: searchDraft, category: categoryDraft, status: statusDraft });
    setPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
    );
  };

  const filteredItems = useMemo(() => {
    const term = appliedFilters.search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term);
      const matchesCategory =
        appliedFilters.category === 'All Categories' || item.category === appliedFilters.category;
      const matchesStatus = appliedFilters.status === 'All Status' || item.status === appliedFilters.status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, appliedFilters]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      return aVal.localeCompare(bVal);
    });
    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [filteredItems, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageItems = sortedItems.slice(pageStart, pageStart + rowsPerPage);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((it) => selectedIds.includes(it.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageItems.some((it) => it.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageItems.map((it) => it.id)])]);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]));
  };

  const activeCount = items.filter((it) => it.status === 'Active').length;
  const inactiveCount = items.length - activeCount;
  const categoriesCovered = new Set(items.map((it) => it.category)).size;

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Asset Management</span>
          <ChevronRight size={12} />
          <span className="text-primary font-semibold">Asset Items</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-primary">Asset Items</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage individual asset items under each category and sub category for tracking and inventory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={openAddModal}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Asset Item
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
          <StatCard
            icon={Layers}
            iconBg="bg-blue-50"
            iconColor="text-primary"
            label="Total Asset Items"
            value={items.length}
            note={`${categoriesCovered} categories in use`}
            noteColor="text-primary"
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            label="Active Items"
            value={activeCount}
            note={`${items.length ? Math.round((activeCount / items.length) * 100) : 0}% of total`}
            noteColor="text-green-600"
          />
          <StatCard
            icon={XCircle}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            label="Inactive Items"
            value={inactiveCount}
            note="Requires review"
            noteColor="text-gray-400"
          />
          <StatCard
            icon={Boxes}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            label="Categories Covered"
            value={categoriesCovered}
            note={`Across ${CATEGORIES.length} available`}
            noteColor="text-purple-600"
          />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, code or description..."
              className="pl-9"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <Select value={categoryDraft} onValueChange={setCategoryDraft}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusDraft} onValueChange={setStatusDraft}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Status">All Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={applyFilters} className="bg-primary hover:bg-[#073e77] text-white">
            Apply Filters
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500 border-b">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 rounded border-gray-300 accent-[#0a4a8f]"
                    />
                  </th>
                  <SortableHeader label="Asset Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Category" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader
                    label="Sub Category"
                    sortKey="subCategory"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      No asset items match your filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#0a4a8f]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-primary">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.category}</td>
                      <td className="px-4 py-3 text-gray-600">{item.subCategory}</td>
                      <td
                        className="px-4 py-3 text-gray-500 max-w-xs truncate"
                        title={item.description}
                      >
                        {item.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[72px] h-8 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {sortedItems.length === 0
                  ? '0 of 0'
                  : `${pageStart + 1}-${Math.min(pageStart + rowsPerPage, sortedItems.length)} of ${sortedItems.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddAssetItemModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        editingItem={editingItem}
        defaultCategory={categoryDraft !== 'All Categories' ? categoryDraft : undefined}
      />

      <AddAssetItemModal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onSave={() => {}}
        editingItem={viewingItem}
        readOnly
      />
    </div>
  );
};

export default AssetItemsList;