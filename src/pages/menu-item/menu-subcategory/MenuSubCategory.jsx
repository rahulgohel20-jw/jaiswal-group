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
  ChevronRight,
  Eye,
  Plus,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import {
  deleteMenuSubCategoryById,
  getAllMenuSubCategoryById,
  updateMenuSubCategoryStatus,
} from '../../../services/apiServices';
import CreateSubCategory from './CreateSubCategory';

const MenuSubCategory = () => {
  const [search, setSearch] = useState('');
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [openCategory, setOpenCategory] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const handleEdit = (row) => {
    setEditData(row.raw ?? row);
    setOpenCategory(true);
  };

  const handleDelete = (id) => {
    setDeleteTarget({
      id: id,
      itemLabel:
        subCategories.find((item) => item.id === id)?.name ??
        'this sub category',
    });
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
      await deleteMenuSubCategoryById(deleteTarget.id);
      closeDeleteConfirm();
      fetchSubCategories();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete sub category');
    } finally {
      setDeleteSaving(false);
    }
  };

  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(''),
      );
      const payload = JSON.parse(json);

      return payload.userId ?? payload.id ?? payload.sub ?? null;
    } catch (err) {
      console.error('Failed to decode authToken:', err);
      return null;
    }
  };

  const userId = getUserIdFromToken();
  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllMenuSubCategoryById(userId);

      const payload = res?.data?.data ?? res?.data ?? res;

      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.['Menu Sub Category Details'])
          ? payload['Menu Sub Category Details']
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

      const list = rawList.map((item) => ({
        id: item.id,
        name: item.nameEnglish ?? item.name ?? '',
        category: item.menuCategory?.nameEnglish ?? '',
        menuCategoryId: item.menuCategory?.id ?? '',
        status: item.isActive ?? false,
        raw: item,
      }));

      setSubCategories(list);
    } catch (err) {
      console.error(err);
      setError('Failed to load sub categories');
      setSubCategories([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  const openStatusConfirm = (row) => {
    setStatusTarget({
      id: row.id,
      itemLabel: row.name,
      nextStatusLabel: row.status ? 'Inactive' : 'Active',
      nextActive: !row.status,
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
      await updateMenuSubCategoryStatus({
        id: statusTarget.id,
        isActive: statusTarget.nextActive,
      });

      closeStatusConfirm();
      fetchSubCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setStatusSaving(false);
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
            className="text-[#43474F] font-semibold py-6 text-xs"
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

      // NAME
      {
        id: 'name',

        accessorFn: (row) => row.name,

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Name"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),

        cell: ({ row }) => (
          <div className="font-semibold text-gray-800 capitalize">{row.original.name}</div>
        ),

        size: 120,
      },

      // category
      {
        id: 'category',

        accessorFn: (row) => row.category,

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Category"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),

        cell: ({ row }) => (
          <span className="text-gray-700 capitalize">{row.original.category}</span>
        ),

        size: 120,
      },

      // STATUS
      {
        id: 'status',

        accessorFn: (row) => row.status,

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),

        cell: ({ row }) => (
          <label className="relative inline-flex cursor-pointer">
            <input
              type="checkbox"
              checked={!!row.original.status}
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

        size: 120,
      },

      // ACTIONS
      {
        id: 'actions',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),

        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button onClick={() => handleEdit(row.original)}>
              <SquarePen
                size={18}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              />
            </button>

            <button onClick={() => handleDelete(row.original.id)}>
              <Trash2
                size={18}
                className="text-red-500 hover:text-red-700 cursor-pointer"
              />
            </button>
          </div>
        ),

        enableSorting: false,
        size: 120,
      },
    ],
    [subCategories],
  );

  const filteredCategories = useMemo(() => {
    return subCategories.filter((item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, subCategories]);

  const table = useReactTable({
    data: filteredCategories,
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
      <div className="p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Menu Item</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Sub Category</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] text-start">
              Menu Item Sub Category
            </h1>
          </div>

          <div className="flex gap-3 self-end">
            <button
              type="button"
              onClick={() => {
                setEditData(null);
                setOpenCategory(true);
              }}
              className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-[#ffffff] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition"
            >
              <Plus size={16} />
              Create New
            </button>
          </div>
        </div>

        <div className="bg-white  py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search Sub Category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
              />
            </div>

            <p className="text-sm text-gray-500">
              Showing {filteredCategories.length} of {subCategories.length} sub
              categories
            </p>
          </div>
        </div>

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">
              Loading sub categories...
            </p>
          )}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          <DataGrid
            table={table}
            recordCount={filteredCategories.length}
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
        <CreateSubCategory
          open={openCategory}
          editData={editData}
          onClose={() => {
            setOpenCategory(false);
            setEditData(null);
          }}
          onSuccess={fetchSubCategories}
        />

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

export default MenuSubCategory;
