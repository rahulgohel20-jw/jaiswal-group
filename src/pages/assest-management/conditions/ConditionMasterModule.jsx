import { ChevronRight, CircleCheck, CircleX, Download, Eye, FileText, MoreVertical, Package, Plus, RotateCcw, Search, SquarePen, Trash2, X } from 'lucide-react'
import React, { useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const INITIAL_CONDITIONS = [
  {
    id: 1,
    srNo: "01",
    name: "New",
    status: "Active",
    color: "bg-[#22C55E]",
  },
  {
    id: 2,
    srNo: "02",
    name: "Excellent",
    status: "Active",
    color: "bg-[#22C55E]",
  },
  {
    id: 3,
    srNo: "03",
    name: "Good",
    status: "Active",
    color: "bg-[#22C55E]",
  },
  {
    id: 4,
    srNo: "04",
    name: "Fair",
    status: "Active",
    color: "bg-[#FBBF24]",
  },
  {
    id: 5,
    srNo: "05",
    name: "Damaged",
    status: "Active",
    color: "bg-[#F97316]",
  },
  {
    id: 6,
    srNo: "06",
    name: "Scrap",
    status: "Inactive",
    color: "bg-[#C3C6D1]",
  },
];

const STATS = [
  {
    title: "TOTAL CONDITIONS",
    value: "08",
    badge: "+2 new",
    icon: Package,
    iconBg: "bg-[#EAF3FF]",
    iconColor: "text-[#084E92]",
  },
  {
    title: "OPERATIONAL",
    value: "07",
    badge: "ACTIVE",
    icon: CircleCheck,
    iconBg: "bg-[#ECFDF3]",
    iconColor: "text-[#16A34A]",
  },
  {
    title: "ARCHIVED",
    value: "01",
    badge: "INACTIVE",
    icon: CircleX,
    iconBg: "bg-[#EEF2F6]",
    iconColor: "text-[#6B7280]",
  },
  {
    title: "LAST UPDATED",
    value: "10:45 AM",
    subText: "Today, June 24",
    icon: RotateCcw,
    iconBg: "bg-[#EEF4FF]",
    iconColor: "text-[#265FA4]",
  },
];
const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-semibold ${status === "Active"
      ? "bg-[#DCFCE7] text-[#15803D]"
      : "bg-[#E5EAF5] text-[#6B7280]"
      }`}
  >
    {status.toUpperCase()}
  </span>
);

const ConditionCell = ({ name, color }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full ${color}`} />
    <span className="font-medium text-[#0F172A]">{name}</span>
  </div>
);


const ConditionMasterModule = () => {
  const [conditions, setConditions] = useState(INITIAL_CONDITIONS);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [showConditionModal, setShowConditionModal] = useState(false);

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className='mx-4 my-5'
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className='mx-4 my-2'
        />
      ),
      enableSorting: false,
      size: 50,
    },

    {
      accessorKey: "srNo",
      header: ({ column }) => (
        <DataGridColumnHeader title="S.NO" column={column} className="font-semibold text-[#43474F]"/>
      ),
      cell: ({ row }) => (
        <span className="text-[#737781]">
          {row.original.srNo}
        </span>
      ),
      size: 50,
    },

    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="CONDITION NAME"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),
      cell: ({ row }) => (
        <ConditionCell
          name={row.original.name}
          color={row.original.color}
        />
      ),
    },

    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="STATUS"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },

    {
      id: "actions",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ACTIONS"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),

      cell: () => (
        <div className="flex items-center gap-4">
          <Eye
            size={16}
            className="text-[#265FA4] cursor-pointer"
          />

          <SquarePen
            size={16}
            className="cursor-pointer"
          />

          <Trash2
            size={16}
            className="text-red-500 cursor-pointer"
          />
        </div>
      ),

      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: conditions,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <span>Dashboard</span>
        <ChevronRight size={12} />
        <span>Asset Management</span>
        <ChevronRight size={12} />
        <span className="text-[#084E92] font-medium">Condition Master</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0B3B75]">
            Condition Master
          </h1>

          <p className="text-[#5F6368] mt-2 max-w-2xl">
            Configure and standardize asset health states
            across the enterprise.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#D9DEE8] rounded-lg bg-white cursor-pointer text-[#121C2A]">
            <Download size={16} />
            Export
          </button>

          <button onClick={() => setShowConditionModal(true)} className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-[#084E92] to-[#002246] text-white cursor-pointer rounded-lg">
            <Plus size={16} />
            Add Condition
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
        {STATS.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="bg-white rounded-3xl border border-[#E6EBF4] p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}
                >
                  <Icon
                    size={18}
                    className={item.iconColor}
                  />
                </div>

                {index === 0 && (
                  <MoreVertical
                    size={16}
                    className="text-[#9CA3AF]"
                  />
                )}
              </div>

              <div>
                <p className="text-sm tracking-[2px] font-semibold text-[#43474F]">
                  {item.title}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <h3 className="text-[18px] font-bold text-[#002246]">
                    {item.value}
                  </h3>

                  {item.badge && (
                    <span
                      className={`text-[9px] px-2 py-1 rounded-full font-semibold ${item.badge === "ACTIVE"
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : "bg-[#EEF2F6] text-[#6B7280]"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.extra && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] font-semibold">
                      {item.extra}
                    </span>
                  )}
                </div>

                {item.subText && (
                  <p className="text-sm text-[#5F6368] mt-1">
                    {item.subText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className=" rounded-2xl border border-[#D9DEE8] p-5 my-10 bg-[#FFFFFF01]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[#43474F]">
              Condition Search
            </label>

            <div className="relative mt-1 border border-[#C3C6D1] rounded-lg">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                placeholder="Type to search conditions..."
                className="w-full pl-10 py-2 border rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#43474F]">
              Status View
            </label>

            <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0 mt-1">
              <select className="outline-none w-full min-w-0 bg-transparent">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </p>
          </div>

          <div className='flex items-end mb-1'>
            <div className="flex gap-3 items-center">
              <button className="bg-[#084E92] text-white px-5 py-2 rounded-lg cursor-pointer">
                Apply Filter
              </button>

              <button className="text-[#43474F] font-semibold cursor-pointer">
                Reset
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
        <DataGrid table={table} recordCount={conditions.length} className="rounded-2xl">
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


      {showConditionModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConditionModal(false)}
          >
            <div className="w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-start justify-between px-6 py-4 border-b">
                <div className="flex gap-3 items-center flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#084E92] flex items-center justify-center">
                    <Plus className="text-white" size={20} />
                  </div>

                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-[#0F172A]">
                      Add Condition
                    </h2>

                    <p className="text-sm text-[#737781]">
                      Create or update an asset lifecycle condition
                    </p>
                  </div>
                </div>

                <button onClick={() => setShowConditionModal(false)}>
                  <X className="text-gray-500 cursor-pointer" size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>
                    <label className="block text-sm font-semibold text-[#43474F] mb-2">
                      Condition Name
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Near Mint"
                      className="w-full border border-[#D9DEE8] rounded-xl px-4 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#43474F] mb-2">
                      Status
                    </label>

                    <p className='px-3 py-2  border border-[#D9DEE8] rounded-xl'>
                      <select className="w-full outline-none">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </p>
                  </div>
                </div>

                {/* Preview Title */}
                <div className='relative'>
                  <h3 className="text-[#084E92] font-bold tracking-wider text-sm">
                    LIVE PREVIEW
                    <div className='h-px w-[78%] bg-[#D9DEE8] absolute top-2.5 left-28' />
                  </h3>
                </div>

                {/* Preview Card */}
                <div className="border border-[#D9DEE8] bg-[#F5F8FF] rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">

                  <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                      <FileText
                        size={24}
                        className="text-[#265FA4]"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg text-[#0F172A]">
                        New Condition
                      </h3>

                      <p className="text-sm text-[#737781] font-mono font-normal">
                        ID: AUTO-GEN-001
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 self-start sm:self-auto rounded-full bg-[#DCFCE7] text-[#15803D] text-xs md:text-sm font-semibold border border-[#C3C6D1]">
                    ● ACTIVE
                  </span>
                </div>

                {/* Banner */}
                <div className="relative overflow-hidden rounded-2xl h-32 bg-linear-to-r from-[#0A4D92] to-[#DCE9FF]">

                  <div className="absolute inset-0 opacity-20" />

                  <div className="relative z-10 p-6">
                    <h2 className="text-white text-xl font-normal max-w-xs pr-5">
                      Define asset lifecycle states with precision.
                    </h2>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#C3C6D1] p-4 md:p-6 flex flex-col sm:flex-row gap-3 cursor-pointer">
            
                <button
                  onClick={() => setShowConditionModal(false)}
                    className="px-6 py-2 border border-[#C3C6D1] rounded-xl font-medium cursor-pointer text-[#43474F]"
                >
                  Cancel
                </button>

                <div className='flex gap-3 flex-col sm:flex-row'>
                  <button className="px-6 py-2 border border-[#084E9233] text-[#084E92] rounded-xl font-semibold cursor-pointer">
                  Save & Add Another
                </button>

                <button className="px-6 py-2 bg-[#084E92] text-white rounded-xl font-medium cursor-pointer">
                  Save Condition
                </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}

export default ConditionMasterModule
