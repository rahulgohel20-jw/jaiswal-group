import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    SquarePen,
    Tag,
    Trash2,
    Upload,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddCategoryModal from './AddCategoryModal';
import AssetCategoryDetailsModal from './AssetCategoryDetailsModal';
import { getAssetCategories, deleteAssetCategory } from '@/services/apiServices';
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router';


const StatusBadge = ({ status }) => {
    const styles = {
        Active: "bg-green-100 text-green-700",
        Inactive: "bg-gray-200 text-gray-600",
    };
    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
            {status}
        </span>
    );
};

// Maps a raw API category object to the shape the table/UI expects
const mapCategory = (c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.active ? "Active" : "Inactive",
    totalAssets: c.totalAssets,
    createdDate: c.createdDate,
    activity: c.activity,
});

const AssetCategory = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Category Master');
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [viewingCategory, setViewingCategory] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [userFilter, setUserFilter] = useState('All')
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
            await deleteAssetCategory(deleteTarget.id);
            closeDeleteConfirm();
            fetchCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };
    const openEditModal = (row) => {
        setEditingCategory(row);
        setShowAddCategory(true);
    };

    const openCreateModal = () => {
        setEditingCategory(null);
        setShowAddCategory(true);
    };

    const closeModal = () => {
        setShowAddCategory(false);
        setEditingCategory(null);
    };

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetCategories();
            // Adjust this line once you confirm the actual API response shape
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setCategories(Array.isArray(raw) ? raw.map(mapCategory) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load categories');
            notify.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = useMemo(() => {
        const keyword = search.toLowerCase().trim();

        return categories.filter((category) => {
            const matchesSearch =
                category.name.toLowerCase().includes(keyword) ||
                category.description.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                category.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [categories, search, statusFilter]);
    const STATS = [
        {
            title: "Total Categories",
            value: `${categories.length}`,
            icon: <Blocks size={18} />,
            iconBg: "bg-[#D5E3FF]",
            iconColor: "text-[#00376C]",
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Categories",
            value: `${categories.filter((c) => c.status == 'Active').length}`,
            icon: <CircleCheck size={18} />,
            iconBg: "bg-[#DCFCE7]",
            iconColor: "text-[#15803D]",
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Categories",
            value: `${categories.filter((c) => c.status == 'Inactive').length}`,
            icon: <CircleX size={18} />,
            iconBg: "bg-[#FEE2E2]",
            iconColor: "text-[#DC2626]",
            color: "text-[#DC2626]",
        },
    ];
    const columns = useMemo(() => [
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="CATEGORY NAME" column={column} className="text-[#43474F] font-semibold py-4" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.name}</div>
            ),
            size: 190,
        },
        {
            id: "description",
            accessorFn: (row) => row.description,
            header: ({ column }) => (
                <DataGridColumnHeader title="DESCRIPTION" column={column} className="text-[#43474F] font-semibold my-3" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2 line-clamp-1">{row.original.description}</span>
            ),
            size: 320,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 120,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => setViewingCategory(row.original)} title="View Category">
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    {canEdit && (
                        <button type="button" onClick={() => openEditModal(row.original)} title="Edit Category">
                            <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete Category">
                            <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                        </button>
                    )}
                </div>
            ),
            enableSorting: false,
            size: 110,
        },
    ], [canEdit, canDelete])

    const table = useReactTable({
        data: filteredCategories,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Category Master" />;
    }

    return (
       <Container>
         <div className="p-4 mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mb-2">
                <span className='cursor-pointer hover:text-blue-300' onClick={() => navigate('/')}>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Category Master</span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
                <div>
                    <h1 className="font-bold text-[#101828] text-xl sm:text-2xl">Asset Categories</h1>
                </div>

                {canAdd && (
                    <HeaderActionButton onClick={openCreateModal}>
                        Add Category
                    </HeaderActionButton>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 py-4 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                            {item.icon}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                            <span className={`text-lg sm:text-xl font-bold mt-0.5 ${item.color}`}>{item.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-center">
                    <div className="relative col-span-1 min-w-0 border border-[#C3C6D1] rounded-lg">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value)}}
                            placeholder="Search by name or description..."
                            className="w-full min-w-0 pl-10 py-2 outline-none rounded-xl"
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
                                <SelectItem value="All">All Status</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={userFilter}
                            onValueChange={(value) => setUserFilter(value)}
                        >
                            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="All">All Users</SelectItem>
                                <SelectItem value="super-admin">Super Admin</SelectItem>
                                <SelectItem value="rajesh-kumar">Rajesh Kumar</SelectItem>
                            </SelectContent>
                        </Select>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading categories...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredCategories.length} className="rounded-2xl">
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

            <AddCategoryModal
                isOpen={showAddCategory}
                onClose={closeModal}
                onSaved={fetchCategories}
                initialData={editingCategory}
            />
            <AssetCategoryDetailsModal
                isOpen={!!viewingCategory}
                onClose={() => setViewingCategory(null)}
                category={viewingCategory}
                loading={viewLoading}
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

export default AssetCategory;