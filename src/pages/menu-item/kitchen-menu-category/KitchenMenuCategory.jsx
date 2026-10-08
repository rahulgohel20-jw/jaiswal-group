import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  Loader2,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import {
  deleteKitchenMenuCategoryById,
  getAllKitchenMenuCategory,
  updateKitchenMenuCategoryStatus,
} from '@/services/apiServices.js';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Container } from '@/components/common/container';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { useNavigate } from 'react-router';
import { SearchBar } from '@/components/common/SearchBar';
import { PageHeader } from '@/components/common/PageHeader';
import KitchenCreateMenuCategory from './KitchenCreateMenuCategory';

const KitchenMenuCategory = () => {
  const { canView, canAdd, canEdit, canDelete } = usePagePermissions('Categories');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [openCategory, setOpenCategory] = useState(false);
  const [editData, setEditData] = useState(null);

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const navigate = useNavigate();

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, itemLabel: row.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.isActive = statusFilter === 'true';

      const res = await getAllKitchenMenuCategory(params);

      const payload = res?.data?.data ?? res?.data ?? res;

      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.['Menu Category Details'])
          ? payload['Menu Category Details']
          : Object.values(payload || {}).find(Array.isArray) || [];

      const list = rawList.map((item) => {
        const latestImage = Array.isArray(item.images)
          ? [...item.images].sort((a, b) => Number(b.id) - Number(a.id))[0]
          : null;

        return {
          id: item.id,
          name: item.nameEnglish ?? item.name ?? '',
          orgId: item.orgId,
          price: item.price,
          sequence: item.sequence,
          status: item.isActive ?? item.status ?? false,
          image: latestImage?.path || '',
          raw: item,
        };
      });

      setCategories(list);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteSaving(true);
    try {
      await deleteKitchenMenuCategoryById(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      notify.error('Failed to delete category.');
    } finally {
      setDeleteSaving(false);
    }
  };

  // Search by category name or outlet name
  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.name?.toLowerCase().includes(term)
    );
  }, [search, categories]);

  // Back to page 1 when the search or filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter]);

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
      await updateKitchenMenuCategoryStatus({
        id: statusTarget.id,
        isActive: statusTarget.nextActive,
      });
      closeStatusConfirm();
      fetchCategories();
    } catch (err) {
      console.error(err);
      notify.error('Failed to update status.');
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
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">
            {String(row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 70,
        minSize: 60,
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
              className="w-10 h-10 rounded-lg object-cover border"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center text-[10px] text-gray-400">
              N/A
            </div>
          ),
        enableSorting: false,
        size: 55,
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
          <div className="font-semibold text-gray-800 capitalize">
            {row.original.name}
          </div>
        ),
        size: 220,
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
          <label className={`relative inline-flex ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <input
              type="checkbox"
              checked={!!row.original.status}
              disabled={!canEdit}
              onChange={() => canEdit && openStatusConfirm(row.original)}
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
        enableSorting: false,
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
            {canEdit && (
              <button type="button" onClick={() => handleEdit(row.original)}>
                <SquarePen
                  size={18}
                  className="text-gray-500 hover:text-blue-800 cursor-pointer"
                />
              </button>

            )}

            {canDelete && (
              <button type="button" onClick={() => openDeleteConfirm(row.original)}>
                <Trash2
                  size={18}
                  className="text-red-300 hover:text-red-700 cursor-pointer"
                />
              </button>
            )}


          </div>
        ),
        enableSorting: false,
        size: 120,
      },
    ],
    [canEdit, canDelete],
  );

  const table = useReactTable({
    data: filteredCategories,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  if (!canView) {
    return <AccessDenied pageTitle="Categories" />;
  }
  return (
    <Container>
      <div className='pt-2 pb-6 mx-auto space-y-4'>
        <PageHeader
          title="Menu Category Master"
          actions={
            canAdd && (
              <HeaderActionButton
                onClick={() => {
                  setEditData(null);
                  setOpenCategory(true);
                }}
              >
                Create New
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert error={error} onRetry={fetchCategories} className="my-3" />

        <div className="bg-white mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-[70%]">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by category name..."
                wrapperClassName="w-full"
              />
            </div>
            <div className="w-full md:w-[30%]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-full border-[#C3C6D1] bg-white text-sm rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading categories..
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredCategories.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
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
          )}
        </div>

        <KitchenCreateMenuCategory
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

export default KitchenMenuCategory;