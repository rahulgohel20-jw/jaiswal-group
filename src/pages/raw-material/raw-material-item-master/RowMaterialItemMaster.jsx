import { AlertTriangle, ChevronRight, CircleCheck, CircleX, ClipboardList, Eye, ListFilter, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRawMaterialItemModal from './AddRawMaterialItemModal';
import { Container } from "@/components/common/container";
import StatusConfirmModal from "@/utils/StatusConfirmModal";
import { updateRawMaterialItemStatusById } from "@/services/apiServices";
import { deleteRawMaterialItemById, getAllRawMaterialCategory, getAllRawMaterialItems, getRawMaterialById } from '../../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const RowMaterialItemMaster = () => {
    const [itemData, setItemData] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [categoryList, setCategoryList] = useState([]);
    const [typeFilter, setTypeFilter] = useState("");
    const [showAddItem, setShowAddItem] = useState(false);
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
    });

    const fetchStats = useCallback(async () => {
        try {
            const res = await getAllRawMaterialItems(
                0,
                0,
                "",
                ""
            );

            const responseData = res?.data?.data || {};

            const list = responseData["Raw Material Details"] || [];

            setStats({
                total: responseData.totalItems || 0,
                active: list.filter(item => item.isActive).length,
                inactive: list.filter(item => !item.isActive).length,
            });
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const openCreateModal = () => {
        setSelectedItem(null);
        setShowAddItem(true);
    };

    const closeModal = () => {
        setShowAddItem(false);
        setSelectedItem(null);
    };


    const fetchCategories = useCallback(async () => {
        try {
            const res = await getAllRawMaterialCategory(0);

            const list =
                res?.data?.data?.["Raw Material Category Details"] || [];

            setCategoryList(list);
        } catch (err) {
            console.error("Category API Error:", err);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);
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

            await deleteRawMaterialItemById(deleteTarget.id);

            await fetchRawMaterialList();
            await fetchStats();

            setShowDeleteConfirm(false);
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(false);
        }
    };

    const fetchRawMaterialList = useCallback(async () => {
        try {
            setLoading(true);

            let isActive = "";

            if (statusFilter === "Active") {
                isActive = true;
            } else if (statusFilter === "Inactive") {
                isActive = false;
            }
            const res = await getAllRawMaterialItems(
                typeFilter || 0,   //raw category id
                0,
                isActive,
                searchTerm.trim()
            );

            const responseData = res?.data?.data || {};

            const list = responseData["Raw Material Details"] || [];

            const totalItems = responseData.totalItems || 0;
            const totalPages = responseData.totalPages || 0;

            const mapped = list.map((item) => ({
                id: item.id,
                image: item.imagePath,
                name: item.nameEnglish,
                nameEnglish: item.nameEnglish,
                category:
                    item.rawMaterialCat?.nameEnglish ||
                    item.rawMaterialCategoryName ||
                    "",
                unit:
                    item.unit?.nameEnglish ||
                    item.unitName ||
                    "",
                rate: item.supplierRate,
                status: item.isActive ? "Active" : "Inactive",

                rawMaterialCatId: item.rawMaterialCatId ?? item.rawMaterialCategory?.id,
                unitId: item.unitId ?? item.unit?.id,
                supplierRate: item.supplierRate,
                dailyConsumption: item.dailyConsumption,
                expiryDate: item.expiryDate,
                opbStock: item.opbStock,
                minStock: item.minStock,
                minOrder: item.minOrder,
                sequence: item.sequence,
                weightPer100Pax: item.weightPer100Pax,
                isGeneralFix: item.isGeneralFix ?? false,
                isApplyCal: item.isApplyCal ?? false,
            }));

            setItemData(mapped);
            setTotalItems(responseData.totalItems || 0);
            setTotalPages(responseData.totalPages || 0);
        } catch (err) {
            console.error(err);
            setError("Failed to load raw materials");
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, typeFilter]);
    const handleEdit = async (id) => {
        try {
            const res = await getRawMaterialById(id);

            const item =
                res?.data?.data?.["Raw Material Details"]?.[0];

            if (!item) return;

            setSelectedItem(item);
            setShowAddItem(true);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRawMaterialList();
    }, [fetchRawMaterialList]);

    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="S.NO"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">
                    {String(row.index + 1).padStart(2, "0")}
                </span>
            ),
            enableSorting: false,
            size: 70,
        },

        {
            accessorKey: "image",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="IMAGE"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            cell: ({ row }) => (
                row.original.image ? (
                    <img
                        src={row.original.image}
                        alt={row.original.name}
                        className="w-12 h-12 rounded-lg object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                )
            ),
            size: 100,
        },

        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="RAW MATERIAL NAME"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2 capitalize">
                    {row.original.name}
                </div>
            ),
            size:180
        },

        {
            accessorKey: "category",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ROW MATERIAL CATEGORY"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            size: 220,
        },

        {
            accessorKey: "unit",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="UNIT"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            size: 110,
        },

        {
            accessorKey: "rate",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="RATE"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            size: 90,
        },

        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),
            cell: ({ row }) => (
                <label className="relative inline-flex cursor-pointer">

                    <input
                        type="checkbox"
                        checked={row.original.status === "Active"}
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
            size:100
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-sm"
                />
            ),

            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <SquarePen
                        size={17}
                        onClick={() => handleEdit(row.original.id)}
                        className="text-gray-500 hover:text-blue-600 cursor-pointer"
                    />

                    <Trash2
                        size={17}
                        onClick={() => openDeleteConfirm(row.original)}
                        className="text-red-300 cursor-pointer hover:text-red-700"
                    />
                </div>
            ),
        },
    ];

    const STATS = [
        {
            title: "Total Item",
            value: `${stats.total}`,
            icon: (
                <ClipboardList
                    size={22}
                    className="text-[#084E92] p-1 bg-[#E8F1FF] rounded"
                />
            ),
            color: 'text-[#084E92]'
        },
        {
            title: "Active Item",
            value: `${stats.active}`,
            icon: (
                <CircleCheck
                    size={22}
                    className="text-[#16A34A] p-1 bg-[#DCFCE7] rounded"
                />
            ),
            color: 'text-[#16A34A]'
        },
        {
            title: "Inactive Item",
            value: `${stats.inactive}`,
            icon: (
                <CircleX
                    size={22}
                    className="text-[#DC2626] p-1 bg-[#FEE2E2] rounded"
                />
            ),
            color: 'text-[#DC2626]'
        },
    ];
    const filteredItems = itemData;
    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            itemLabel: row.name,
            nextActive: row.status !== "Active",
            nextStatusLabel: row.status === "Active" ? "Inactive" : "Active",
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
            await updateRawMaterialItemStatusById(
                statusTarget.id,
                statusTarget.nextActive
            );
            setItemData((prev) =>
                prev.map((item) =>
                    item.id === statusTarget.id
                        ? {
                            ...item,
                            status: statusTarget.nextActive
                                ? "Active"
                                : "Inactive",
                        }
                        : item
                )
            );

            await fetchStats();
            closeStatusConfirm();
        } catch (err) {
            console.error(err);
        } finally {
            setStatusSaving(false);
        }
    };
    const table = useReactTable({
        data: filteredItems,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
        <Container>
            <div className='p-4 md:p-6'>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Master Data</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Raw Material Items</span>
                </div>

                <div className="flex justify-between items-start flex-col lg:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] text-start">
                            Raw Material Items Master
                        </h1>

                        <p className="text-sm text-gray-400 mt-1 max-w-xl">
                            Centralized inventory registry for global raw material tracking,
                            specification management, and real-time stock valuation monitoring.
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="bg-[#00376C] hover:bg-[#074486] cursor-pointer transition-colors duration-200 text-white rounded-xl px-6 py-3 flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={18} />
                        Add New Item
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
                    {STATS.map((item) => (
                        <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                            <div className="flex justify-between items-center pb-2">
                                <p>{item.icon}</p>
                            </div>
                            <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                            <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative md:col-span-2">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by type name..."
                                className="w-full pl-10 py-2 border rounded-lg outline-none "
                            />
                        </div>

                        {/* Status */}
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


                        {/* Category Type */}
                        <Select
                            value={typeFilter || "all"}
                            onValueChange={(value) => {
                                setTypeFilter(value === "all" ? "" : value);
                            }}
                        >
                            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All Categories
                                </SelectItem>

                                {categoryList.map((category) => (
                                    <SelectItem
                                        key={category.id}
                                        value={String(category.id)}
                                    >
                                        {category.nameEnglish}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && <p className="p-4 text-sm text-gray-500">Loading raw material types...</p>}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    <DataGrid table={table} recordCount={filteredItems.length} className="rounded-2xl">
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

                <AddRawMaterialItemModal
                    isOpen={showAddItem}
                    onClose={closeModal}
                    editData={selectedItem}
                    fetchRawMaterialList={fetchRawMaterialList}
                    fetchStats={fetchStats}
                />
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
                itemLabel={deleteTarget?.name}
                saving={deleteLoading}
            />
        </Container>
    )
}

export default RowMaterialItemMaster
