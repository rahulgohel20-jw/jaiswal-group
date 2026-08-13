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
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import {
  deleteMenuCategoryById,
  getAllMenuCategory,
  updateMenuCategoryStatus,
} from '@/services/apiServices.js';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import CreateMenuCategory from './CreateMenuCategory';

const MenuCategory = () => {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
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

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, itemLabel: row.name });
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
      await deleteMenuCategoryById(deleteTarget.id);
      closeDeleteConfirm();
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setDeleteSaving(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllMenuCategory();

      // API response shape can vary between environments. The real shape
      // observed is: res.data.data["Menu Category Details"] = [...]
      // with fields like nameEnglish / isActive / imagePath.
      // We normalize to a flat array with the field names the table uses,
      // no matter what shape comes back.
      const payload = res?.data?.data ?? res?.data ?? res;

      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.['Menu Category Details'])
          ? payload['Menu Category Details']
          : Array.isArray(payload?.categories)
            ? payload.categories
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

      // Normalize field names: API uses nameEnglish / isActive / imagePath,
      // table/columns use name / status / image.
      const list = rawList.map((item) => ({
        id: item.id,
        name: item.nameEnglish ?? item.name ?? '',
        price: item.price,
        sequence: item.sequence,
        status: item.isActive ?? item.status ?? false,
        image: item.imagePath || item.image || '',
        raw: item, // keep the original record around (e.g. Hindi/Gujarati names)
      }));

      setCategories(list);

      if (!Array.isArray(payload) && list.length === 0) {
        console.warn('getAllMenuCategory: unexpected response shape', res);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list.filter((item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, categories]);

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
      await updateMenuCategoryStatus({
        id: statusTarget.id,
        isActive: statusTarget.nextActive,
      });
      closeStatusConfirm();
      fetchCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditData(row.raw ?? row);
    setOpenCategory(true);
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 cursor-pointer my-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
          />
        ),
        enableSorting: false,
        size: 50,
      },

      {
        id: 'image',
        accessorFn: (row) => row.image,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="IMAGE"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) =>
          row.original.image ? (
            <img
              src={row.original.image}
              alt={row.original.name}
              className="w-12 h-12 rounded-lg object-cover border"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 border flex items-center justify-center text-[10px] text-gray-400">
              N/A
            </div>
          ),
        size: 100,
      },

      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="NAME"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-gray-800 capitalize">{row.original.name}</div>
        ),
        size: 220,
      },

      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="PRICE"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700">
            {row.original.price != null ? `₹ ${row.original.price}` : '-'}
          </span>
        ),
        size: 120,
      },

      {
        id: 'sequence',
        accessorFn: (row) => row.sequence,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="SEQUENCE"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700">{row.original.sequence ?? '-'}</span>
        ),
        size: 120,
      },

      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
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

      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ACTIONS"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button onClick={() => handleEdit(row.original)}>
              <SquarePen
                size={18}
                className="text-gray-500 hover:text-blue-800 cursor-pointer"
              />
            </button>

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
          <span className="text-[#084E92] font-medium">Category</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] text-start">
              Menu Category Master
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

        <div className="bg-white py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search Category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
              />
            </div>

            <p className="text-sm text-gray-500">
              Showing {filteredCategories.length} of{' '}
              {Array.isArray(categories) ? categories.length : 0} categories
            </p>
          </div>
        </div>

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">Loading categories...</p>
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

        <CreateMenuCategory
          open={openCategory}
          editData={editData}
          onClose={() => {
            setOpenCategory(false);
            setEditData(null);
          }}
          onSuccess={fetchCategories}
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

export default MenuCategory;
