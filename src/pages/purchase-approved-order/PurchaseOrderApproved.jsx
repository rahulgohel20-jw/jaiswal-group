import { BadgeCheck, ChevronRight, Clock3, Download, Eye, MapPin, Plus, Search, SlidersHorizontal, TrendingUp } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import PurchaseOrderDetailsModel from './PurchaseOrderDetailsModel';
const requests = [
  {
    poCode: "PO-2024-101",
    date: "Oct 24, 2023",
    company: "Reliance Retail Ltd.",
    outlet: "Mumbai - Main Hub",
  },
  {
    poCode: "PO-2024-102",
    date: "Oct 25, 2023",
    company: "Tata Consumer Products",
    outlet: "Bangalore North Center",
  },
  {
    poCode: "PO-2024-105",
    date: "Oct 26, 2023",
    company: "Adani Wilmar Ltd.",
    outlet: "Ahmedabad Logistics",
  },
  {
    poCode: "PO-2024-109",
    date: "Oct 27, 2023",
    company: "Hindustan Unilever",
    outlet: "Delhi Central Warehouse",
  },
  {
    poCode: "PO-2024-112",
    date: "Oct 28, 2023",
    company: "Britannia Industries",
    outlet: "Kolkata Regional",
  },
  {
    poCode: "PO-2024-115",
    date: "Oct 30, 2023",
    company: "Nestle India Ltd.",
    outlet: "Pune Distribution Hub",
  },
];
const PurchaseOrderApproved = () => {
  const [poApproved, setPoApproved] = useState(requests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [outletFilter, setOutletFilter] = useState("All Outlets");
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);


  const columns = [
    {
      accessorKey: "poCode",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="PO CODE"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <span className="bg-[#EEF5FF] text-[#0B5CAD] rounded-full px-4 py-2 text-xs font-semibold">
          {row.original.poCode}
        </span>
      ),
      size: 170,
    },

    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataGridColumnHeader title="PO DATE" column={column} />
      ),
      size: 140,
    },

    {
      accessorKey: "company",
      header: ({ column }) => (
        <DataGridColumnHeader title="COMPANY NAME" column={column} />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-slate-700">
          {row.original.company}
        </span>
      ),
      size: 240,
    },

    {
      accessorKey: "outlet",
      header: ({ column }) => (
        <DataGridColumnHeader title="OUTLET NAME" column={column} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-500">
          <MapPin size={15} />
          {row.original.outlet}
        </div>
      ),
      size: 240,
    },

    {
      id: "action",
      header: ({ column }) => (
        <DataGridColumnHeader title="ACTION" column={column} />
      ),
      cell: ({row}) => (
        <button onClick={() => {
          setSelectedOrder(row.original);
          setOpenModal(true);
        }}
          className="bg-[#0B5CAD] cursor-pointer text-white rounded-full px-5 py-2 flex items-center gap-2 text-sm hover:bg-[#094d90]">
          <Eye size={16} />
          View Order
        </button>
      ),
      size: 170,
    },
  ];
  const filteredRequests = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return poApproved.filter((item) => {
      const matchesSearch =
        item.poCode.toLowerCase().includes(keyword) ||
        item.company.toLowerCase().includes(keyword);

      const matchesCompany =
        companyFilter === "All Companies" ||
        item.company === companyFilter;

      const matchesOutlet =
        outletFilter === "All Outlets" ||
        item.outlet === outletFilter;

      return (
        matchesSearch &&
        matchesCompany &&
        matchesOutlet
      );
    });
  }, [poApproved, search, companyFilter, outletFilter]);
  const table = useReactTable({
    data: filteredRequests,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const STATS = [
    {
      title: "Total Approved Value",
      value: "₹ 4.28 Cr",
      icon: (
        <div className="w-7 h-7 rounded bg-[#EDF4FF] flex items-center justify-center">
          <BadgeCheck className="text-[#0B5CAD]" size={20} />
        </div>
      ),
    },
    {
      title: "Pending Fulfillment",
      value: "32 Orders",
      icon: (
        <div className="w-7 h-7 rounded bg-[#FFF5E8] flex items-center justify-center">
          <Clock3 className="text-[#F59E0B]" size={20} />
        </div>
      ),
    },
    {
      title: "Procurement Efficiency",
      value: "+12.4 %",
      icon: (
        <div className="w-7 h-7 rounded bg-[#ECFDF5] flex items-center justify-center">
          <TrendingUp className="text-[#10B981]" size={20} />
        </div>
      ),
    },
  ];
  return (
    <div className='p-4 md:p-6'>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <span>Dashboard</span>
        <ChevronRight size={12} />
        <span>Purchase</span>
        <ChevronRight size={12} />
        <span className="text-[#084E92] font-medium">Approved Orders</span>
      </div>

      <div className='flex justify-between items-center'>
        <div className='my-3'>
          <h1 className="text-3xl font-semibold text-[#092B56]">
            Approved Purchase Orders
          </h1>

          <p className="text-gray-500 mt-2">
            Efficiently manage and track all validated procurement orders.
          </p>

        </div>
        <button
          className="flex items-center gap-2 bg-[#0757A8] text-white px-6 py-3 rounded-full shadow-md  hover:bg-blue-700 cursor-pointer"
        >
          <Plus size={18} />
          Create New PO
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
        {STATS.map((item) => (
          <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
            <div className="flex justify-between items-center pb-2">
              <p>{item.icon}</p>
              {item.badge && (
                <p className={`text-xs rounded font-semibold px-1.5 py-1 ${item.badgeStyle}`}>{item.badge}</p>
              )}
            </div>
            <h1 className="text-sm text-[#43474F] py-1">{item.title}</h1>
            <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Search */}
          <div className="relative col-span-2">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO Code or Company..."
              className="w-full h-11 rounded-xl border border-[#D6DCE5] pl-11 pr-4 outline-none focus:ring-2 focus:ring-[#0B5CAD]/20"
            />
          </div>

          {/* Company */}
          <p className='border border-[#C3C6D1] rounded-lg px-3 py-2.5'>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full outline-none"
            >
              <option value="All Companies">All Companies</option>
              <option value="Reliance Retail Ltd.">Reliance Retail Ltd.</option>
              <option value="Tata Consumer Products">Tata Consumer Products</option>
              <option value="Adani Wilmar Ltd.">Adani Wilmar Ltd.</option>
              <option value="Hindustan Unilever">Hindustan Unilever</option>
              <option value="Britannia Industries">Britannia Industries</option>
              <option value="Nestle India Ltd.">Nestle India Ltd.</option>
            </select>
          </p>

          {/* Outlet */}
          <p className='border border-[#C3C6D1] rounded-lg px-3 py-2.5'>
            <select
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="w-full outline-none"
            >
              <option value="All Outlets">All Outlets</option>
              <option value="Mumbai - Main Hub">Mumbai - Main Hub</option>
              <option value="Bangalore North Center">Bangalore North Center</option>
              <option value="Ahmedabad Logistics">Ahmedabad Logistics</option>
              <option value="Delhi Central Warehouse">Delhi Central Warehouse</option>
              <option value="Kolkata Regional">Kolkata Regional</option>
              <option value="Pune Distribution Hub">Pune Distribution Hub</option>
            </select>
          </p>

        </div>
      </div>

      <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">

        {loading && (
          <p className="p-4 text-sm text-gray-500">
            Loading purchase requests...
          </p>
        )}

        {error && (
          <p className="p-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <DataGrid
          table={table}
          recordCount={filteredRequests.length}
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

      <PurchaseOrderDetailsModel
        open={openModal}
        onClose={() => setOpenModal(false)}
        order={selectedOrder}
      />
    </div>
  )
}

export default PurchaseOrderApproved
