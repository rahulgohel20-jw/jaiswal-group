import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CheckCircle2,
  ChevronRight,
  Package,
  Plus,
  Search,
  SquarePen,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import {
  deleteMenuItemById,
  getAllMenuItem,
  updateMenuItemStatus,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StatCard = ({ label, value, icon, tone }) => (
  <div className="bg-white border rounded-xl py-3 px-4">
    <div
      className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${tone}`}
    >
      {icon}{' '}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-black">{value}</p>
    </div>
  </div>
);

const MenuItemsListing = ({ onAddNew }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState(null);

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const userId = getUserIdFromToken();

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllMenuItem({
        userId,
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
      });

      const payload = res?.data?.data ?? {};

      const rawList = payload['Menu Item Details'] || payload.items || [];

      const list = rawList.map((item) => ({
        id: item.id,
        image: item.imagePath,
        name: item.nameEnglish,
        category: item.menuCategory?.nameEnglish,
        subCategory: item.menuSubCategory?.nameEnglish,
        price: item.price,
        sequence: item.sequence,
        status: item.isActive ? 'Active' : 'Inactive',
        raw: item,
      }));

      setMenuItems(list);
    } catch (err) {
      console.error(err);
      setMenuItems([]);
      setError('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, [userId, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const categoryOptions = [
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];
  const totalItems = menuItems.length;

  const activeItems = menuItems.filter(
    (item) => item.status === 'Active',
  ).length;

  const inactiveItems = menuItems.filter(
    (item) => item.status === 'Inactive',
  ).length;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'All Status' || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'All' ||
        item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [menuItems, search, statusFilter, categoryFilter]);

  const openStatusConfirm = (item) => {
    setStatusTarget({
      id: item.id,
      itemLabel: item.name,
      nextStatus: item.status === 'Active' ? false : true,
      nextStatusLabel: item.status === 'Active' ? 'Inactive' : 'Active',
    });

    setShowStatusConfirm(true);
  };

  const closeStatusConfirm = () => {
    if (statusSaving) return;

    setShowStatusConfirm(false);
    setStatusTarget(null);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;

    setStatusSaving(true);

    try {
      await updateMenuItemStatus({
        id: statusTarget.id,
        isActive: statusTarget.nextStatus,
      });

      closeStatusConfirm();
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      notify.error('Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSaving(true);

    try {
      await deleteMenuItemById(deleteTarget.id);
      closeDeleteConfirm();
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete menu item');
    } finally {
      setDeleteSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold py-4 uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">
            {String(row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 70,
      },

      // IMAGE
      {
        id: 'image',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Image"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
            {row.original.image ? (
              <img
                src={row.original.image}
                alt={row.original.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package size={16} className="text-gray-300" />
            )}
          </div>
        ),
        enableSorting: false,
        size: 80,
      },

      // NAME
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Name"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-gray-800 capitalize">
            {row.original.name}
          </div>
        ),
        size: 160,
      },

      // CATEGORY
      {
        id: 'category',
        accessorFn: (row) => row.category,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Category"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700 capitalize">
            {row.original.category}
          </span>
        ),
        size: 130,
      },

      // SUB CATEGORY
      {
        id: 'subCategory',
        accessorFn: (row) => row.subCategory,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Sub Category"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700 capitalize">
            {row.original.subCategory}
          </span>
        ),
        size: 140,
      },

      // PRICE
      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Price"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700">
            ₹{Number(row.original.price ?? 0).toFixed(2)}
          </span>
        ),
        size: 100,
      },

      // SEQUENCE
      {
        id: 'sequence',
        accessorFn: (row) => row.sequence,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Seq."
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700">{row.original.sequence}</span>
        ),
        size: 80,
      },

      // STATUS
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <label className="relative inline-flex cursor-pointer">
            <input
              type="checkbox"
              checked={row.original.status === 'Active'}
              onChange={() => openStatusConfirm(row.original)}
              className="sr-only peer"
            />
            <div
              className="
                w-11 h-6
                bg-gray-300
                rounded-full
                peer
                peer-checked:bg-[#084E92]
                after:absolute
                after:top-0.5
                after:left-0.5
                after:h-5
                after:w-5
                after:bg-white
                after:rounded-full
                after:transition-all
                peer-checked:after:translate-x-full
              "
            />
          </label>
        ),
        size: 110,
      },

      // ACTIONS
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Link to={`/menu-item/edit-menu-item/${row.original.id}`}>
              <SquarePen
                size={18}
                className="text-gray-500 hover:text-blue-800 cursor-pointer"
              />
            </Link>

            <button onClick={() => openDeleteConfirm(row.original)}>
              <Trash2
                size={18}
                className="text-red-300 hover:text-red-700 cursor-pointer"
              />
            </button>
          </div>
        ),
        enableSorting: false,
        size: 120,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="p-4 md:p-6 text-gray-600 min-h-screen">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Master Data</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Menu Items</span>
        </div>

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
            to="/menu-item/add-menu-items"
            className="flex items-center gap-2 bg-[#084E92] text-white px-4 py-2.5 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Add New Item
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-3 py-4 grid md:grid-cols-4 grid-cols-1 gap-5 mb-6">
          <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 col-span-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>


          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>

              {categoryOptions.map((category) => (
                <SelectItem
                  key={category}
                  value={category}
                >
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">Loading menu items...</p>
          )}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}

          <DataGrid
            table={table}
            recordCount={filteredItems.length}
            className="rounded-2xl"
          >
            <Card className="rounded-t-none border-t-0 rounded-2xl">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                <DataGridPagination />
              </CardFooter>
            </Card>
          </DataGrid>
        </div>

        <StatusConfirmModal
          isOpen={showStatusConfirm}
          onClose={closeStatusConfirm}
          onConfirm={confirmStatusChange}
          itemLabel={statusTarget?.itemLabel}
          nextStatusLabel={statusTarget?.nextStatusLabel}
          saving={statusSaving}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
      </div>
    </Container>
  );
};

export default MenuItemsListing;
