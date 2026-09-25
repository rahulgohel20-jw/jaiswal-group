import React, { useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  CircleCheck,
  Eye,
  LayoutGrid,
  Plus,
  Search,
  Shapes,
  SquarePen,
  Trash2,
} from 'lucide-react';
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
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import {
  deleteRawMaterialBrandById,
  getAllActiveRawMaterialBrand,
  getAllRawMaterialBrand,
  getRawMaterialBrandById,
  updateRawMaterialBrand,
} from '../../../services/apiServices';
import AddRawMaterialBrand from './AddRawMaterialBrand';
import { useNavigate } from 'react-router';

const RowMaterialBrandMaster = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Raw Material Brand Master');

  const [brands, setBrands] = useState([]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const [rowSelection, setRowSelection] = useState({});
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null); // { id, name, nextActive }
  const [statusSaving, setStatusSaving] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeBrandCount, setActiveBrandCount] = useState(0);
  const navigate = useNavigate();
  const fetchBrands = async () => {
    try {
      const response = await getAllRawMaterialBrand();
      const brandData = response?.data?.data || [];
      setBrands(brandData);
    } catch (error) {
      console.error('Failed to fetch raw material brands:', error);
      setBrands([]);
    }
  };

  const fetchActiveBrands = async () => {
    try {
      const response = await getAllActiveRawMaterialBrand();
      const activeBrands = response?.data?.data || [];
      setActiveBrandCount(activeBrands.length);
    } catch (error) {
      console.error('Failed to fetch active raw material brands:', error);
      setActiveBrandCount(0);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchActiveBrands();
  }, []);

  const handleAddClick = () => {
    setIsViewOnly(false);
    setEditingBrand(null);
    setShowBrandModal(true);
  };

  const handleEditClick = async (brand) => {
    try {
      setIsViewOnly(false);
      const response = await getRawMaterialBrandById(brand.id);
      const brandData = response?.data?.data;

      if (!brandData) {
        console.error('Brand data not found');
        return;
      }

      setEditingBrand(brandData);
      setShowBrandModal(true);
    } catch (error) {
      console.error('Failed to fetch brand by id:', error);
    }
  };

  const handleViewClick = async (brand) => {
    try {
      setIsViewOnly(true);
      const response = await getRawMaterialBrandById(brand.id);
      const brandData = response?.data?.data || brand;

      setEditingBrand(brandData);
      setShowBrandModal(true);
    } catch (error) {
      console.error('Failed to fetch brand by id:', error);
      setEditingBrand(brand);
      setShowBrandModal(true);
    }
  };

  const closeBrandModal = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    setIsViewOnly(false);
  };

  const handleBrandSaved = async () => {
    await Promise.all([fetchBrands(), fetchActiveBrands()]);
  };

  // ---- Delete ----
  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, name: row.name }); // fixed: was bare `name`
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
      await deleteRawMaterialBrandById(deleteTarget.id);
      await Promise.all([fetchBrands(), fetchActiveBrands()]);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- Status toggle ----
  const openStatusConfirm = (row) => {
    setStatusTarget({
      id: row.id,
      name: row.name,
      nextActive: !row.active,
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

    try {
      setStatusSaving(true);

      const currentBrand = brands.find((brand) => brand.id === statusTarget.id);

      if (!currentBrand) {
        throw new Error('Brand not found');
      }

      const payload = {
        active: statusTarget.nextActive,
        createdBy: currentBrand.createdBy ?? 0,
        description: currentBrand.description ?? '',
        name: currentBrand.name ?? '',
      };

      await updateRawMaterialBrand(statusTarget.id, payload);

      await Promise.all([fetchBrands(), fetchActiveBrands()]);

      setShowStatusConfirm(false);
      setStatusTarget(null);
    } catch (error) {
      console.error('Failed to update brand status:', error);
    } finally {
      setStatusSaving(false);
    }
  };

  const STATS = [
    {
      title: 'Total Brands',
      value: String(brands.length),
      icon: <LayoutGrid size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#00376C]',
      color: 'text-[#1B1B1F]',
    },
    {
      title: 'Active Brands',
      value: String(activeBrandCount),
      icon: <CircleCheck size={18} />,
      iconBg: 'bg-[#DCFCE7]',
      iconColor: 'text-[#15803D]',
      color: 'text-[#15803D]',
    },
    {
      title: 'Most Used Type',
      value: 'Metals',
      icon: <Shapes size={18} />,
      iconBg: 'bg-[#EDE4FF]',
      iconColor: 'text-[#7C3AED]',
      color: 'text-[#1B1B1F]',
    },
  ];

  const filteredBrands = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return brands.filter((b) => {
      const name = (b.name ?? '').toLowerCase();
      const description = (b.description ?? '').toLowerCase();

      const matchesSearch =
        !term || name.includes(term) || description.includes(term);

      const matchesStatus =
        statusFilter === 'All Status' ||
        (b.active ? 'Active' : 'Inactive') === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [brands, searchText, statusFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchText, statusFilter]);

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm py-4"
          />
        ),
        cell: ({ row }) => String(row.index + 1).padStart(2, '0'),
        enableSorting: false,
        size: 80,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="NAME"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-[#1B1B1F] capitalize">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="DESCRIPTION"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-[#1B1B1F] capitalize">
            {row.original.description}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => row.active,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <label className={`relative inline-flex ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <input
              type="checkbox"
              checked={row.original.active === true}
              disabled={!canEdit}
              onChange={() => {
                if (!canEdit) return;
                openStatusConfirm(row.original);
              }}
              className="sr-only peer"
            />
            <div
              className=" w-11 h-6  bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5
                after:h-5 after:w-5  after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full "
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
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleViewClick(row.original)} title="View Details">
              <Eye
                size={18}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
              />
            </button>

            {canEdit && (
              <button type="button" onClick={() => handleEditClick(row.original)} title="Edit">
                <SquarePen
                  size={18}
                  className="text-gray-500 hover:text-blue-600 cursor-pointer"
                />
              </button>
            )}

            {canDelete && (
              <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete">
                <Trash2
                  size={18}
                  className="text-red-300 hover:text-red-600 cursor-pointer"
                />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 110,
      },
    ],
    [canEdit, canDelete],
  );

  const table = useReactTable({
    data: filteredBrands,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Raw Material Brand Master" />;
  }

  return (
    <Container>
      <div className="p-4 mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mb-2">
          <span className='cursor-pointer hover:text-blue-300' onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={12} />
          <span>Raw Material</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            Raw Material Brand Master
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#101828] text-start">
              Raw Material Brand Master
            </h1>
          </div>

          {canAdd && (
            <HeaderActionButton onClick={handleAddClick}>
              Create Brand
            </HeaderActionButton>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 py-4 text-[#43474F]">
          {STATS.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
            >
              <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                {item.icon}
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                <span className={`text-lg sm:text-xl font-bold mt-0.5 ${item.color}`}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative border border-[#C3C6D1] rounded-xl">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                placeholder="Search brands..."
                className="w-full pl-10 py-2 outline-none rounded-xl"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          <DataGrid
            table={table}
            recordCount={filteredBrands.length}
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
      </div>

      <StatusConfirmModal
        isOpen={showStatusConfirm}
        onClose={closeStatusConfirm}
        onConfirm={confirmStatusChange}
        targetName={statusTarget?.name}
        nextStatusLabel={statusTarget?.nextActive ? 'Active' : 'Inactive'}
        saving={statusSaving}
      />

      <AddRawMaterialBrand
        isOpen={showBrandModal}
        onClose={closeBrandModal}
        onSaved={handleBrandSaved}
        initialData={editingBrand}
        isViewOnly={isViewOnly}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.name}
        saving={deleteLoading}
      />
    </Container>
  );
};

export default RowMaterialBrandMaster;
