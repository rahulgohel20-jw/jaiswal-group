import { ChevronRight, CircleCheck, CircleX, Plus, Ruler, Search, SquarePen, Trash2, Upload } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Container } from "@/components/common/container";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRawMaterialUnit from './AddRawMaterialUnit';
import { deleteUnitMasterById, getAllRawMaterialUnits } from '../../../services/apiServices';
import { notify } from "@/utils/toast";

const units_data = [
  {
    id: 1,
    name: "PAX",
    symbol: "PAX",
    status: "Active",
  },
  {
    id: 2,
    name: "MTR(S)",
    symbol: "MTR(S)",
    status: "Active",
  },
  {
    id: 3,
    name: "NONE",
    symbol: "NONE",
    status: "Active",
  },
  {
    id: 4,
    name: "BOTTEL",
    symbol: "BOTTEL",
    status: "Active",
  },
  {
    id: 5,
    name: "KILO",
    symbol: "KILO",
    status: "Inactive",
  },
  {
    id: 6,
    name: "PKT",
    symbol: "PKT",
    status: "Active",
  },
  {
    id: 7,
    name: "BOX",
    symbol: "BOX",
    status: "Inactive",
  },
  {
    id: 8,
    name: "LITER",
    symbol: "LITER",
    status: "Active",
  },
];

const RowMaterialUnit = () => {
  const [units, setUnit] = useState([])
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const [rowSelection, setRowSelection] = useState({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await getAllRawMaterialUnits();

      const data = (res?.data?.data["Unit Details"] || []).map((item) => ({
        ...item,
        name: item.nameEnglish,
        symbol: item.symbolEnglish,
        status: item.isActive ? "Active" : "Inactive",
      }));

      setUnit(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAddClick = () => {
    setEditingUnit(null);
    setIsUnitModalOpen(true);
  };

  const handleEditClick = (unit) => {
    setEditingUnit(unit);
    setIsUnitModalOpen(true);
  };

  const handleModalClose = () => {
    setIsUnitModalOpen(false);
    setEditingUnit(null);
  };

  const handleUnitSaved = () => {
    fetchUnits();
  };

  const handleDelete = async (unit) => {
    try {
      await deleteUnitMasterById(unit.id);

      notify.success("Unit Deleted Successfully");

      fetchUnits();
    } catch (err) {
      console.error(err);
      notify.error("Failed to delete unit");
    }
  };
  // const activeCount = units.filter((u) => u.status === 'Active').length;
  // const inactiveCount = units.length - activeCount;


  const STATS = [
    {
      title: "Total Units",
      value: "5",
      badge: "OVERVIEW",
      icon: <Ruler size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
      color: "text-[#1B1B1F]",
    },
    {
      title: "Active Units",
      value: "2",
      badge: "ACTIVE",
      icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
      color: "text-[#15803D]",
    },
    {
      title: "Inactive Units",
      value: "3",
      badge: "INACTIVE",
      icon: <CircleX size={22} className="text-[#B45309] p-1 bg-[#FEF3C7] rounded" />,
      color: "text-[#B45309]",
    },
  ];

  const filteredUnits = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return units.filter((u) => {
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.symbol.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All Status" ||
        u.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [units, searchText, statusFilter]);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [searchText, statusFilter]);

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-4 h-4 cursor-pointer accent-[#005BAC]"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 cursor-pointer accent-[#005BAC]"
        />
      ),
      enableSorting: false,
      size: 50,
    },
    {
      id: "sno",
      header: "Sr. No.",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 80,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => row.original.symbol,
    },
    {
      id: "status",

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
            checked={row.original.status === "Active"}
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <SquarePen
            size={18}
            className="text-[#005BAC] cursor-pointer hover:text-blue-700"
            onClick={() => handleEditClick(row.original)}
          />

          <Trash2
            size={18}
            className="text-red-500 cursor-pointer hover:text-red-700"
            onClick={() => handleDelete(row.original)}
          />
        </div>
      ),
      enableSorting: false,
      size: 100,
    },
  ];

  const table = useReactTable({
    data: filteredUnits,
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
          <span className="text-[#084E92] font-medium">Raw Material Unit Master</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] text-start">Measure of unit Master</h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              Manage all measurement units used throughout the Asset Management module.
            </p>
          </div>

          <div className="flex gap-3 self-end">
            <button type="button" className="px-4 py-2 border border-[#C3C6D1] rounded-lg flex gap-2 items-center text-[#43474F] hover:bg-gray-50 transition cursor-pointer bg-white">
              <Upload size={16} />
              Export
            </button>
            <button
              type="button"
              onClick={handleAddClick}
              className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
            >
              <Plus size={16} />
              Add Unit
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
          {STATS.map((item) => (
            <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
              <div className="flex justify-between items-center pb-2">
                <p>{item.icon}</p>
              </div>
              <h1 className="text-sm text-[#43474F]">{item.title}</h1>
              <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
              {item.badge && <p className="text-xs mt-1">{item.badge}</p>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">

            <div className="relative border border-[#C3C6D1] rounded-lg">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                placeholder="Search Unit Name or Symbol..."
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

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading units...</div>
          ) : (
            <DataGrid table={table} recordCount={filteredUnits.length} className="rounded-2xl">
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


        <AddRawMaterialUnit
          isOpen={isUnitModalOpen}
          onClose={handleModalClose}
          onSaved={handleUnitSaved}
          initialData={editingUnit}
        />
      </div>
    </Container>
  )
}

export default RowMaterialUnit
