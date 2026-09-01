import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    SquarePen,
    Trash2,
    Upload,
} from 'lucide-react';
import {
    getAllRawMaterialCategory,
} from '@/services/apiServices';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import AddRawMaterialSubCategoryModal from './AddRawMaterialSubCategoryModal';
import RawMaterialSubCategoryDetailsModal from './RawMaterialSubCategoryDetailsModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { deleteRawMaterialSubCategoryById, getAllRowMaterialSubCategory, getRawMaterialSubCategoryById, saveOrUpdateRawMaterialSubCategory } from '../../../services/apiServices';

const mapSubCategory = (c) => {
    const isActive = Boolean(c.isActive ?? c.active);
    return {
        id: c.id,
        nameEnglish: c.nameEnglish || '',
        categoryName: c.categoryName || '',
        rawMaterialCatId: c.categoryId ?? null,
        isActive,
        status: isActive ? 'Active' : 'Inactive',
        createdAt: c.createdAt || null,
    };
};

const unwrapListPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        const firstArray = Object.values(payload).find((v) => Array.isArray(v));
        if (firstArray) return firstArray;
    }
    return [];
};

const RowMaterialSubCategory = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Sub Categories');

    const [subCategoriesData, setSubCategoriesData] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [showAddSubCategory, setShowAddSubCategory] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState(null);
     const [editLoadingId, setEditLoadingId] = useState(null);

    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingSubCategory, setViewingSubCategory] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // Status toggle confirm modal state
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null); // { id, nameEnglish, nextActive }
    const [statusSaving, setStatusSaving] = useState(false);

    const [categories, setCategories] = useState([]);
    const [categoryFilterId, setCategoryFilterId] = useState('0');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getAllRawMaterialCategory(0);
                const raw = unwrapListPayload(res.data?.data);
                setCategories(
                    raw.map((c) => ({ id: c.id, name: c.nameEnglish || c.name })),
                );
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);


    const fetchSubCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllRowMaterialSubCategory();
            const raw = unwrapListPayload(res);
            setSubCategoriesData(raw.map(mapSubCategory));

        } catch (err) {
            console.error(err);
            setError('Failed to load raw material sub categories');
        } finally {
            setLoading(false);
        }
    }, [categoryFilterId]);

    useEffect(() => {
        fetchSubCategories();
    }, [fetchSubCategories]);

    const openEditModal = async (row) => {
    setEditLoadingId(row.id);
    try {
      const res = await getRawMaterialSubCategoryById(row.id);

      const raw =
        res?.data?.data ??
        res?.data ??
        row;

      const detail = Array.isArray(raw) ? raw[0] : raw;

      setEditingSubCategory({
        id: detail?.id ?? row.id,
        nameEnglish: detail?.nameEnglish ?? row.nameEnglish,
        categoryId: detail?.categoryId ?? row.rawMaterialCatId,
      });
      setShowAddSubCategory(true);
    } catch (err) {
      console.error('Failed to fetch subcategory details:', err);
     
      setEditingSubCategory({
        id: row.id,
        nameEnglish: row.nameEnglish,
        categoryId: row.rawMaterialCatId,
      });
      setShowAddSubCategory(true);
    } finally {
      setEditLoadingId(null);
    }
  };

    const openCreateModal = () => {
        setEditingSubCategory(null);
        setShowAddSubCategory(true);
    };

    const closeModal = () => {
        setShowAddSubCategory(false);
        setEditingSubCategory(null);
    };

    const openViewModal = async (row) => {
        setShowViewModal(true);
        setViewLoading(true);
        setViewingSubCategory(null);
        try {
            const res = await getRawMaterialSubCategoryById(row.id);
            setViewingSubCategory(res.data);
        } catch (err) {
            console.error(err);
            setViewingSubCategory(null);
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setViewingSubCategory(null);
    };

    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            nameEnglish: row.nameEnglish,
            rawMaterialCatId: row.rawMaterialCatId,
            nextActive: !row.isActive,
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
            const payload = {
                id: statusTarget.id,
                nameEnglish: statusTarget.nameEnglish,
                categoryId: statusTarget.rawMaterialCatId,
                isActive: statusTarget.nextActive,
            };

            await saveOrUpdateRawMaterialSubCategory(payload);

            setShowStatusConfirm(false);
            setStatusTarget(null);
            fetchSubCategories();
        } catch (err) {
            console.error(err);
            alert('Failed to update status.');
        } finally {
            setStatusSaving(false);
        }
    };

    const openDeleteConfirm = (row) => {
        setDeleteTarget({ id: row.id, name: row.nameEnglish });
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
            await deleteRawMaterialSubCategoryById(deleteTarget.id);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            fetchSubCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredSubCategories = useMemo(() => {
        return subCategoriesData.filter((c) => {
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch = term
                ? c.nameEnglish.toLowerCase().includes(term) ||
                  c.categoryName.toLowerCase().includes(term)
                : true;
            const matchesStatus =
                statusFilter === 'All Status' ? true : c.status === statusFilter;
            const matchesCategory =
                !categoryFilterId || categoryFilterId === '0'
                    ? true
                    : String(c.rawMaterialCatId) === String(categoryFilterId);
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [subCategoriesData, searchTerm, statusFilter, categoryFilterId]);
    
    const stats = useMemo(() => {
        const total = subCategoriesData.length;
        const active = subCategoriesData.filter((t) => t.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [subCategoriesData]);

    const columns = useMemo(
        () => [
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="S.NO"
                        column={column}
                        className="py-4"
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
            {
                id: 'subCategoryName',
                accessorFn: (row) => row.nameEnglish,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="SUB CATEGORY NAME"
                        column={column}
                    />
                ),
                cell: ({ row }) => (
                    <div className="font-semibold text-gray-800 py-2 capitalize">
                        {row.original.nameEnglish}
                    </div>
                ),
                size: 220,
            },
            {
                id: 'categoryName',
                accessorFn: (row) => row.categoryName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="CATEGORY NAME"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <div className="font-semibold text-gray-800 py-2 capitalize">
                        {row.original.categoryName}
                    </div>
                ),
                size: 220,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="VISIBILITY STATUS"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <label className={`relative inline-flex ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                        <input
                            type="checkbox"
                            checked={row.original.status === "Active"}
                            disabled={!canEdit}
                            className="sr-only peer"
                            onChange={() => {
                                if (!canEdit) return;
                                setStatusTarget({
                                    id: row.original.id,
                                    nameEnglish: row.original.nameEnglish,
                                    rawMaterialCatId: row.original.rawMaterialCatId,
                                    nextActive: row.original.status !== "Active",
                                    nextStatusLabel:
                                        row.original.status === "Active" ? "Inactive" : "Active",
                                });
                                setShowStatusConfirm(true);
                            }}
                        />

                        <div className=" w-11 h-6  bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5
                  after:h-5 after:w-5  after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full " />
                    </label>
                ),
                size: 180,
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
                    <div className="flex items-center gap-3 py-1">
                        <button type="button" onClick={() => openViewModal(row.original)} title="View Details">
                            <Eye
                                size={18}
                                className="text-[#084E92] hover:text-blue-700 cursor-pointer"
                            />
                        </button>
                        {canEdit && (
                            <button type="button" onClick={() => openEditModal(row.original)} title="Edit">
                                <SquarePen
                                    size={18}
                                    className="text-gray-500 hover:text-green-600 cursor-pointer"
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
        data: filteredSubCategories,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const STATS = [
        {
            title: 'Total Sub Categories',
            value: String(stats.total).padStart(2, '0'),
            icon: (
                <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />
            ),
            color: 'text-[#1B1B1F]',
        },
        {
            title: 'Active Sub Categories',
            value: String(stats.active).padStart(2, '0'),
            icon: (
                <CircleCheck
                    size={22}
                    className="text-[#15803D] p-1 bg-[#DCFCE7] rounded"
                />
            ),
            color: 'text-[#15803D]',
        },
        {
            title: 'Inactive Sub Categories',
            value: String(stats.inactive).padStart(2, '0'),
            icon: (
                <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />
            ),
            color: 'text-[#1B1B1F]',
        },
    ];

    if (!canView) {
        return <AccessDenied pageTitle="Sub Categories" />;
    }

    return (
        <Container>
            <div className="p-4 md:p-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Master Data</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">
                        Raw Material Sub Categories
                    </span>
                </div>

                <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Raw Material Sub Category Master
                        </h1>
                    </div>

                    <div className="flex gap-3 self-end">
                        <button
                            type="button"
                            className="px-4 py-2 border border-[#C3C6D1] text-[#43474F] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-gray-50 transition"
                        >
                            <Upload size={16} />
                            Export
                        </button>
                        {canAdd && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                            >
                                <Plus size={16} />
                                Add Sub Category
                            </button>
                        )}
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
                    {STATS.map((item) => (
                        <div
                            key={item.title}
                            className="border border-[#C3C6D1] rounded-2xl p-4"
                        >
                            <div className="flex justify-between items-center pb-2">
                                <p>{item.icon}</p>
                            </div>
                            <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                            <h2 className={`text-xl font-bold ${item.color}`}>
                                {item.value}
                            </h2>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                    <div className="grid grid-cols-1 xl:grid-cols-4 sm:grid-col-2 gap-4">
                        <div className="relative md:col-span-2">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by sub category name..."
                                className="w-full pl-10 py-2 border rounded-lg outline-none"
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
                                <SelectItem value="All Status">
                                    All Status
                                </SelectItem>

                                <SelectItem value="Active">
                                    Active
                                </SelectItem>

                                <SelectItem value="Inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={categoryFilterId}
                            onValueChange={(value) => setCategoryFilterId(value)}
                        >
                            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="0">
                                    All Category
                                </SelectItem>

                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="capitalize">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && (
                        <p className="p-4 text-sm text-gray-500">
                            Loading raw material sub categories...
                        </p>
                    )}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    <DataGrid
                        table={table}
                        recordCount={filteredSubCategories.length}
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

                <AddRawMaterialSubCategoryModal
                    isOpen={showAddSubCategory}
                    onClose={closeModal}
                    onSaved={fetchSubCategories}
                    initialData={editingSubCategory}
                />

                <RawMaterialSubCategoryDetailsModal
                    isOpen={showViewModal}
                    onClose={closeViewModal}
                    category={viewingSubCategory}
                    loading={viewLoading}
                />

                <StatusConfirmModal
                    isOpen={showStatusConfirm}
                    onClose={closeStatusConfirm}
                    onConfirm={confirmStatusChange}
                    itemLabel={statusTarget?.nameEnglish}
                    nextStatusLabel={statusTarget?.nextActive ? 'Active' : 'Inactive'}
                    saving={statusSaving}
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

export default RowMaterialSubCategory;
