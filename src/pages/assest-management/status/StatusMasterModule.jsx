import React, { useEffect, useMemo, useState } from 'react'
import {
    CircleCheck,
    CircleX,
    RefreshCw,
    Download,
    Plus,
    ChevronRight,
    List,
    Search,
    Trash2,
    SquarePen,
    Eye,
    Loader2,
} from "lucide-react";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import StatusModal from "./StatusModal";
import {
    getStatuses,
    getStatusById,
    createStatus,
    updateStatus,
    deleteStatus,
} from "@/services/apiServices";
import { notify } from "@/utils/toast";

// TODO: replace with the actual logged-in user id from your auth/session context
const CURRENT_USER_ID = 1;



const VisibilityBadge = ({ status }) => (
    <span
        className={`px-3 py-1 rounded-full text-[10px] font-semibold ${status === "Active"
            ? "bg-[#DCFCE7] text-[#15803D]"
            : "bg-[#D9E3F6] text-[#6B7280]"
            }`}
    >
        {status}
    </span>
);

// Normalizes the API record into what the table row needs to display.
const normalizeStatusRow = (raw = {}, index = 0) => ({
    id: raw.id,
    srNo: raw.srNo ?? String(index + 1).padStart(2, "0"),
    statusName: raw.name ?? "",
    description: raw.description ?? "",
    visibilityStatus: raw.active ? "Active" : "Inactive",
});

// Normalizes the API record into what the modal form needs.
const normalizeStatusForm = (raw = {}) => ({
    id: raw.id ?? null,
    name: raw.name ?? "",
    description: raw.description ?? "",
    active: raw.active ?? true,
});

const EMPTY_FORM = { id: null, name: "", description: "", active: true };

const StatusMasterModule = () => {
    const [statusData, setStatusData] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});

    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState(null);

    // modal: mode is 'add' | 'edit' | 'view' | null
    const [modalMode, setModalMode] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const [deletingId, setDeletingId] = useState(null);

    const [searchInput, setSearchInput] = useState("");
    const [statusInput, setStatusInput] = useState("All Status");

    // -------------------------------------------------------------------
    // Load list
    // -------------------------------------------------------------------
    const loadStatus = async () => {
        setListLoading(true);
        setListError(null);
        try {
            const res = await getStatuses();
            const list = res?.data?.data ?? [];
            setStatusData(list.map(normalizeStatusRow));
        } catch (err) {
            setListError(err?.message || "Failed to load Status");
            notify.error("Failed to load status");
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);
    const STATS = [
        {
            title: "Total Status",
            value: `${statusData.length}`,
            badge: "OVERVIEW",
            icon: List,
            iconBg: "bg-[#EAF3FF]",
            iconColor: "text-[#084E92]",
        },
        {
            title: "Active Status",
            value: `${statusData.filter((c) => c.visibilityStatus == 'Active').length}`,
            badge: "ACTIVE",
            icon: CircleCheck,
            iconBg: "bg-[#ECFDF3]",
            iconColor: "text-[#16A34A]",
        },
        {
            title: "Inactive Status",
            value: `${statusData.filter((c) => c.visibilityStatus == 'Inactive').length}`,
            badge: "INACTIVE",
            icon: CircleX,
            iconBg: "bg-[#FFF7ED]",
            iconColor: "text-[#F97316]",
        },
    ];
    // -------------------------------------------------------------------
    // Modal open handlers — View and Edit both call getStatusById first
    // so the modal always renders the freshest record from the server.
    // -------------------------------------------------------------------
    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setModalError(null);
        setModalMode("add");
    };

    const openWithFetchedRecord = async (id, mode) => {
        setModalMode(mode);
        setModalLoading(true);
        setModalError(null);
        setFormData(EMPTY_FORM);
        try {
            const res = await getStatusById(id);
            const record = res?.data?.data ?? res?.data ?? res;
            setFormData(normalizeStatusForm(record));
        } catch (err) {
            setModalError(err?.message || "Failed to load status");
        } finally {
            setModalLoading(false);
        }
    };

    const openViewModal = (id) => openWithFetchedRecord(id, "view");
    const openEditModal = (id) => openWithFetchedRecord(id, "edit");

    const closeModal = () => {
        setModalMode(null);
        setModalError(null);
        setFormData(EMPTY_FORM);
    };

    // -------------------------------------------------------------------
    // Save (create or update depending on mode)
    // -------------------------------------------------------------------
    const handleSave = async () => {
        if (!formData.name.trim()) {
            setModalError("Status name is required");
            return;
        }

        setSaving(true);
        setModalError(null);
        try {
            if (modalMode === "edit") {
                const payload = {
                    name: formData.name.trim(),
                    description: formData.description?.trim() || undefined,
                    active: formData.active,
                };
                await updateStatus({ id: formData.id, ...payload });
                notify.success("Status Updated Successfully");
            } else {
                // create body: { active, createdBy, description, name } — description is optional
                const payload = {
                    active: formData.active,
                    createdBy: CURRENT_USER_ID,
                    name: formData.name.trim(),
                    ...(formData.description?.trim() ? { description: formData.description.trim() } : {}),
                };
                await createStatus(payload);
                notify.success("Status Created Successfully");
            }

            await loadStatus();
            closeModal();
        } catch (err) {
            setModalError(err?.message || "Failed to save status");
            notify.error("Failed to save status");
        } finally {
            setSaving(false);
        }
    };

    // -------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this status? This cannot be undone.")) return;

        setDeletingId(id);
        try {
            await deleteStatus(id);
            notify.success("Status Deleted Successfully");
            await loadStatus();
        } catch (err) {
            setListError(err?.message || "Failed to delete status");
        } finally {
            setDeletingId(null);
        }
    };

    // -------------------------------------------------------------------
    // Table columns
    // -------------------------------------------------------------------
    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className='my-4'
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            enableSorting: false,
            size: 50,
        },

        {
            accessorKey: "srNo",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="font-semibold my-4" />
            ),
            size: 50,
        },

        {
            accessorKey: "statusName",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS NAME"
                    column={column}
                    className="font-semibold my-4"
                />
            ),
            cell: ({ row }) => (
                <span className="font-medium text-[#0F172A]">
                    {row.original.statusName}
                </span>
            ),
        },

        {
            accessorKey: "visibilityStatus",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="VISIBILITY STATUS"
                    column={column}
                    className="font-semibold"
                />
            ),
            cell: ({ row }) => (
                <VisibilityBadge
                    status={row.original.visibilityStatus}
                />
            ),
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="font-semibold"
                />
            ),

            cell: ({ row }) => (
                <div className="flex items-center gap-4">
                    <Eye
                        size={16}
                        className="text-[#265FA4] cursor-pointer"
                        onClick={() => openViewModal(row.original.id)}
                    />

                    <SquarePen
                        size={16}
                        className="cursor-pointer"
                        onClick={() => openEditModal(row.original.id)}
                    />

                    {deletingId === row.original.id ? (
                        <Loader2 size={16} className="animate-spin text-red-500" />
                    ) : (
                        <Trash2
                            size={16}
                            className="text-red-500 cursor-pointer"
                            onClick={() => handleDelete(row.original.id)}
                        />
                    )}
                </div>
            ),

            enableSorting: false,
        },
    ];

    const filteredStatusData = useMemo(() => {
        return statusData.filter((status) => {
            const matchesSearch =
                searchInput === "" ||
                status.statusName
                    .toLowerCase()
                    .includes(searchInput.toLowerCase());

            const matchesStatus =
                statusInput === "All Status" ||
                status.visibilityStatus === statusInput;

            return matchesSearch && matchesStatus;
        });
    }, [statusData, searchInput, statusInput]);

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, [searchInput, statusInput]);
    const table = useReactTable({
        data: filteredStatusData,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className='p-4 md:px-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Status Master</span>
            </div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">
                        Status Master
                    </h1>

                    <p className="text-[#737781] mt-1">
                        Streamline operational tracking with comprehensive asset status management.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2 bg-[#084E92] text-white rounded-lg cursor-pointer">
                        <Plus size={16} />
                        Add Status
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="border border-[#C3C6D1] rounded-2xl p-4"
                        >
                            <div
                                className={`w-6 h-6 rounded ${item.iconBg} flex items-center justify-center`}
                            >
                                <Icon
                                    size={15}
                                    className={item.iconColor}
                                />
                            </div>

                            <div className='mt-2'>
                                <p className="text-sm text-[#43474F]">
                                    {item.title}
                                </p>

                                <h3 className="text-xl font-bold">
                                    {item.value}
                                </h3>
                                <span
                                    className={`text-xs ${item.iconColor}`}
                                >
                                    {item.badge}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>


            <div className="bg-white rounded-2xl border border-[#D9DEE8] p-5 my-6">
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="relative mt-1 rounded-lg md:col-span-2 col-span-1 border border-[#C3C6D1]">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by name..."
                            className="w-full pl-10 py-2 outline-none"
                        />
                    </div>

                    <p className='border rounded-lg px-3 py-2 mt-1 border-[#C3C6D1]'>
                        <select
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            className="w-full outline-none"
                        >
                            <option value="All Status">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </p>
                </div>
            </div>

            {listError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                    {listError}
                </div>
            )}

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {listLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-[#5F6368]">
                        <Loader2 size={18} className="animate-spin" />
                        Loading Status...
                    </div>
                ) : (
                    <DataGrid table={table} recordCount={filteredStatusData.length} className="rounded-2xl">
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

            <StatusModal
                mode={modalMode}
                formData={formData}
                loading={modalLoading}
                error={modalError}
                saving={saving}
                onChange={setFormData}
                onClose={closeModal}
                onSave={handleSave}
            />
        </div>
    )
}

export default StatusMasterModule