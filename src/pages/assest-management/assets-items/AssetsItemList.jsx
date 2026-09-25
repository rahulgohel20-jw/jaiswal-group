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
import { notify } from "@/utils/toast";
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';

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

const StatCard = ({ icon: Icon, iconBg = 'bg-[#D5E3FF]', iconColor = 'text-[#00376C]', label, value, valueColor = 'text-[#1B1B1F]' }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{label}</span>
      <span className={`text-lg sm:text-xl font-bold mt-0.5 ${valueColor}`}>{value}</span>
    </div>
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
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Asset Items');
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
      notify.success("Asset Item Updated Successfully");
      setEditingItem(null);
    } else {
      const newItem = {
        ...form,
        id: `AST-${1000 + items.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setItems((prev) => [newItem, ...prev]);
      notify.success("Asset Item Added Successfully");
    }
     setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    notify.success("Asset Item Deleted Successfully");
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

  const activeCount = items.filter((it) => it.status === 'Active').length;
  const inactiveCount = items.length - activeCount;
  const categoriesCovered = new Set(items.map((it) => it.category)).size;

  if (!canView) {
    return <AccessDenied pageTitle="Asset Items" />;
  }

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
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#101828]">Asset Items</h1>
          </div>
          {canAdd && (
            <HeaderActionButton onClick={openAddModal}>
              Add Asset Item
            </HeaderActionButton>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 py-4 text-[#43474F]">
          <StatCard
            icon={Layers}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="Total Asset Items"
            value={items.length}
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-[#DCFCE7]"
            iconColor="text-[#15803D]"
            label="Active Items"
            value={activeCount}
            valueColor="text-[#15803D]"
          />
          <StatCard
            icon={XCircle}
            iconBg="bg-[#FEE2E2]"
            iconColor="text-[#DC2626]"
            label="Inactive Items"
            value={inactiveCount}
            valueColor="text-[#DC2626]"
          />
          <StatCard
            icon={Boxes}
            iconBg="bg-[#EDE9FE]"
            iconColor="text-[#7C3AED]"
            label="Categories Covered"
            value={categoriesCovered}
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
                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                      No asset items match your filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
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
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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