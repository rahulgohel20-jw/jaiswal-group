
import { ChevronRight, CircleCheck, LayoutGrid, Plus, Search, Shapes, SquarePen, Trash2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Container } from "@/components/common/container";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import AddRawMaterialBrand from './AddRawMaterialBrand';

const brands_data = [
    {
        id: 1,
        name: "Alpha Steel Co.",
        description: "Metals",
        status: "Active",
    },
    {
        id: 2,
        name: "Beta Polymers",
        description: "Plastics",
        status: "Active",
    },
    {
        id: 3,
        name: "Gamma Electronics",
        description: "Components",
        status: "Inactive",
    },
];
const RowMaterialBrandMaster = () => {
    const [brands, setBrands] = useState(brands_data);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [rowSelection, setRowSelection] = useState({});
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null); // { id, name, nextActive }
    const [statusSaving, setStatusSaving] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const [deleteTarget, setDeleteTarget] = useState(null);
      const [deleteLoading, setDeleteLoading] = useState(false);

    const handleAddClick = () => {
        setEditingBrand(null);
        setShowBrandModal(true);
    };

    const handleExportClick = () => {
        // UI only - hook up export flow later
    };

    const handleEditClick = (brand) => {
        setEditingBrand(brand);
        setShowBrandModal(true);
    };

    const closeBrandModal = () => {
        setShowBrandModal(false);
        setEditingBrand(null);
    };
    const handleBrandSaved = (payload) => {
        // UI only - swap for refetch after real create/update API call later
        if (payload.id) {
            setBrands((prev) =>
                prev.map((b) =>
                    b.id === payload.id
                        ? { ...b, nameEnglish: payload.nameEnglish, description: payload.description }
                        : b
                )
            );
        } else {
            setBrands((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    nameEnglish: payload.nameEnglish,
                    description: payload.description,
                    isActive: true,
                    status: "Active",
                },
            ]);
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
 
  const handleDelete = (unit) => {
    setDeleteTarget(unit);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);

    } finally {
      setDeleteLoading(false);
    }
  };
    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            name: row.nameEnglish,
            nextActive: row.status !== 'Active',
        });
        setShowStatusConfirm(true);
    };

    const closeStatusConfirm = () => {
        if (statusSaving) return;
        setShowStatusConfirm(false);
        setStatusTarget(null);
    };

    const confirmStatusChange = () => {
        if (!statusTarget) return;
        setStatusSaving(true);

        //  swap for updateRawMaterialBrandStatus API call later
        setBrands((prev) =>
            prev.map((b) =>
                b.id === statusTarget.id
                    ? {
                        ...b,
                        isActive: statusTarget.nextActive,
                        status: statusTarget.nextActive ? "Active" : "Inactive",
                    }
                    : b
            )
        );

        setStatusSaving(false);
        setShowStatusConfirm(false);
        setStatusTarget(null);
    };


    const STATS = [
        {
            title: "Total Brands",
            value: String(brands.length),
            icon: <LayoutGrid size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Brands",
            value: String(brands.filter((b) => b.status === "Active").length),
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Most Used Type",
            value: "Metals",
            icon: <Shapes size={22} className="text-[#7C3AED] p-1 bg-[#EDE4FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];

    const filteredBrands = useMemo(() => {
        const term = searchText.trim().toLowerCase();

        return brands.filter((b) => {
            const matchesSearch =
                !term ||
                b.name.toLowerCase().includes(term) ||
                b.description.toLowerCase().includes(term);

            const matchesStatus =
                statusFilter === "All Status" ||
                b.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [brands, searchText, statusFilter]);

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, [searchText, statusFilter]);

    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => String(row.index + 1).padStart(2, "0"),
            enableSorting: false,
            size: 80,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataGridColumnHeader title="NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="font-medium text-[#1B1B1F] capitalize">{row.original.name}</span>
            ),
        },
        {
            accessorKey: "description",
            header: ({ column }) => (
                <DataGridColumnHeader title="DESCRIPTION" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => row.original.description,
        },
        {
            id: "status",
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
                        checked={row.original.status === "Active"}
                        onChange={() => openStatusConfirm(row.original)}
                        className="sr-only peer"
                    />

                    <div className=" w-11 h-6  bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5
              after:h-5 after:w-5  after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full " />
                </label>
            ),
            size: 120,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleEditClick(row.original)}
                    >
                        <SquarePen size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>

                    <button
                        type="button"
                        onClick={() => openDeleteConfirm(row.original)}
                    >
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 100,
        },
    ];

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

    return (
        <Container>
            <div className='p-4 md:p-6'>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Master Data</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Raw Material Brand Master</span>
                </div>

                <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] text-start">Raw Material Brand Master</h1>
                        <p className="text-sm text-gray-400 mt-1 max-w-xl">
                            Manage and track raw material brands used across the organization.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <Plus size={16} />
                        Create Brand
                    </button>

                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
                    {STATS.map((item) => (
                        <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4 bg-white">
                            <div className="flex justify-between items-center pb-2">
                                <p>{item.icon}</p>
                            </div>
                            <h1 className="text-xs uppercase tracking-wide text-[#43474F]">{item.title}</h1>
                            <h2 className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</h2>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="relative border border-[#C3C6D1] rounded-lg">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                size={18}
                            />

                            <input
                                placeholder="Search brands..."
                                className="w-full pl-10 py-2 outline-none rounded-lg"
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); }}
                            />
                        </div>

                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select
                                className="outline-none w-full bg-transparent"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); }}
                            >
                                <option value="All Status">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </p>

                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    <DataGrid table={table} recordCount={filteredBrands.length} className="rounded-2xl">
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
                nextStatusLabel={statusTarget?.nextActive ? "Active" : "Inactive"}
                saving={statusSaving}
            />

            <AddRawMaterialBrand
                isOpen={showBrandModal}
                onClose={closeBrandModal}
                onSaved={handleBrandSaved}
                initialData={editingBrand}
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

export default RowMaterialBrandMaster