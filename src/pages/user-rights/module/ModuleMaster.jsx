import React, { useEffect, useMemo, useState } from 'react';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SearchBar } from '@/components/common/SearchBar';
import { ChevronRight, Eye, Plus, SquarePen, Trash2 } from 'lucide-react';
import { deleteModuleRight, getModuleRights } from '@/services/apiServices';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import AddModuleRightModal from './AddModuleRightModal';
import { useNavigate } from 'react-router';

// Maps a raw API module-right object (+ its row position) to the shape the table expects.
// Adjust the ?? fallbacks once you confirm the exact field names getModuleRights returns.
const mapModuleRight = (m, index) => ({
  id: m.id,
  srNo: index + 1,
  name: m.name,
  createdAt: m.createdAt ?? m.createdDate,
  isActive: m.isActive ?? m.active ?? true,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '');
};

const ModuleMaster = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Module Rights');

  const [moduleRights, setModuleRights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();
  const openViewModal = (row) => {
    setIsViewOnly(true);
    setEditingModule(row);
    setShowAddModule(true);
  };

  const openEditModal = (row) => {
    setIsViewOnly(false);
    setEditingModule(row);
    setShowAddModule(true);
  };

  const openCreateModal = () => {
    setIsViewOnly(false);
    setEditingModule(null);
    setShowAddModule(true);
  };

  const closeModal = () => {
    setShowAddModule(false);
    setEditingModule(null);
    setIsViewOnly(false);
  };

  const fetchModuleRights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModuleRights();
      // Adjust this line once you confirm the actual getall response shape
      const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setModuleRights(list.map((m, i) => mapModuleRight(m, i)));
    } catch (err) {
      console.error(err);
      setError('Failed to load module rights');
      notify.error('Failed to load module rights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModuleRights();
  }, []);

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, name: row.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteModuleRight(deleteTarget.id);
      notify.success('Module right deleted successfully');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchModuleRights();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete module right.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredModuleRights = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return moduleRights;
    return moduleRights.filter((m) => m.name?.toLowerCase().includes(keyword));
  }, [moduleRights, search]);

  const columns = useMemo(
    () => [
      {
        id: 'srNo',
        accessorFn: (row) => row.srNo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">{row.original.srNo}</span>
        ),
        enableSorting: false,
        size: 90,
      },
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
          <button
            type="button"
            onClick={() => (canEdit ? openEditModal(row.original) : openViewModal(row.original))}
            className="text-[#084E92] font-medium hover:underline text-left cursor-pointer"
          >
            {row.original.name}
          </button>
        ),
        size: 260,
      },
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="CreatedAt"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        size: 220,
      },
      {
        id: 'isActive',
        accessorFn: (row) => row.isActive,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Is Active"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-800">{String(row.original.isActive)}</span>
        ),
        size: 120,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Action"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openViewModal(row.original)}
              aria-label={`View ${row.original.name}`}
              title="View Details"
            >
              <Eye
                size={17}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
              />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => openEditModal(row.original)}
                aria-label={`Edit ${row.original.name}`}
                title="Edit"
              >
                <SquarePen
                  size={17}
                  className="text-[#084E92] hover:text-[#063a6b] cursor-pointer"
                />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                aria-label={`Delete ${row.original.name}`}
                title="Delete"
              >
                <Trash2
                  size={17}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
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
    data: filteredModuleRights,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Module Rights" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-3.5">
        <PageHeader
          title="Module Right Name Master"
          actions={
            canAdd && (
              <HeaderActionButton onClick={openCreateModal}>
                Add Module Name
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert error={error} onRetry={fetchModuleRights} />

        {/* Search */}
        <div className="w-full">
          <SearchBar
            placeholder="Search Template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            isStandalone={true}
          />
        </div>

        {/* Table */}
        <div className="w-full border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">
              Loading module rights...
            </p>
          )}
          <DataGrid
            table={table}
            recordCount={filteredModuleRights.length}
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

        <AddModuleRightModal
          isOpen={showAddModule}
          onClose={closeModal}
          onSaved={fetchModuleRights}
          initialData={editingModule}
          isViewOnly={isViewOnly}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.name}
          saving={deleteLoading}
        />
      </div>
    </Container>
  );
};

export default ModuleMaster;
