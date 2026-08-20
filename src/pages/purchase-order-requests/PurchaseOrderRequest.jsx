import React, { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardList,
  Package,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Link } from 'react-router';
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
import SearchableSelect from '@/utils/searchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import { OrgTypes } from '@/constants/orgTypes';
import { PO_STATUS, PO_STATUS_LIST } from './utils/poStatus';
import { getUserIdFromToken } from '../../utils/auth';

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const StatusBadge = ({ status }) => {
  const styles = {
    Approved: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Rejected: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {(status || '').toUpperCase()}
    </span>
  );
};

// Only rendered for GROUP / SUB_COMPANY — same dropdown used on the PR list page.
function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = units.map((u) => ({ value: u.id, label: u.name }));
  return (
    <div className="w-56 shrink-0">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        placeholder={units.length === 0 ? 'No outlets available' : 'Select outlet...'}
        disabled={units.length === 0}
      />
    </div>
  );
}

const PurchaseOrderRequest = () => {
  const {
    loading: scopeLoading,
    error: scopeError,
    orgType,
    units,
    selectedUnitId,
    setSelectedUnitId,
    retry: retryScope,
  } = useOrgScope();

  const {
    list: poList,
    loading: poLoading,
    error: poError,
    fetchByOutlet,
    reject,
  } = usePurchaseOrders();

  const showUnitDropdown = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All Companies');
  const [outletFilter, setOutletFilter] = useState('All Outlets');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [rejectingId, setRejectingId] = useState(null);

  const loadData = () => {
    if (selectedUnitId) fetchByOutlet(selectedUnitId);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, companyFilter, outletFilter, statusFilter, selectedUnitId]);

  const handleReject = async (row) => {
    setRejectingId(row.id);
    try {
      await reject(row.id, { actionBy: getUserIdFromToken() });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRejectingId(null);
    }
  };

  // Filter dropdown options are derived from whatever's actually in the
  // fetched list, rather than the hardcoded mock values.
  const companyOptions = useMemo(
    () => Array.from(new Set(poList.map((p) => p.company).filter(Boolean))),
    [poList],
  );
  const outletOptions = useMemo(
    () => Array.from(new Set(poList.map((p) => p.outlet).filter(Boolean))),
    [poList],
  );

  const columns = [
    {
      accessorKey: 'prCode',
      header: ({ column }) => (
        <DataGridColumnHeader title="PR CODE" column={column} className="text-[#43474F] font-semibold" />
      ),
      size: 140,
    },
    {
      accessorKey: 'poCode',
      header: ({ column }) => (
        <DataGridColumnHeader title="PO CODE" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) =>
        row.original.poCode === 'TO BE GENERATED' ? (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-xs">TO BE GENERATED</span>
        ) : (
          row.original.poCode
        ),
      size: 170,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataGridColumnHeader title="DATE" column={column} className="text-[#43474F] font-semibold" />
      ),
      size: 120,
    },
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <DataGridColumnHeader title="COMPANY NAME" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => <TruncatedCell value={row.original.company} widthClass="max-w-[190px]" />,
    },
    {
      accessorKey: 'outlet',
      header: ({ column }) => (
        <DataGridColumnHeader title="OUTLET NAME" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[190px] py-3" />,
    },
    {
      accessorKey: 'raisedBy',
      header: ({ column }) => (
        <DataGridColumnHeader title="RAISED BY" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
            {(row.original.raisedBy || '?').slice(0, 2).toUpperCase()}
          </div>
          {row.original.raisedBy}
        </div>
      ),
      size: 190,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 110,
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold py-6" />
      ),
      cell: ({ row }) => {
        const original = row.original;
        const isRejecting = rejectingId === original.id;
        return (
          <div className="flex gap-2">
            {original.poCode === 'TO BE GENERATED' ? (
              <>
                <Link to="/purchase/create-purchase-order-requests" state={original}>
                  <button className="bg-[#084E92] text-white px-4 py-1 rounded-lg text-xs cursor-pointer">
                    Generate PO
                  </button>
                </Link>
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => handleReject(original)}
                  className="border px-4 py-1 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            ) : (
              <Link to={`/purchase/edit-purchase-order/${original.id}`} state={original}>
                <button className="border px-4 py-1 rounded text-xs cursor-pointer">Edit</button>
              </Link>
            )}
          </div>
        );
      },
      size: 230,
    },
  ];

  const filteredRequests = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return poList.filter((item) => {
      const matchesSearch =
        item.prCode.toLowerCase().includes(keyword) ||
        item.company.toLowerCase().includes(keyword) ||
        item.raisedBy.toLowerCase().includes(keyword);

      const matchesCompany = companyFilter === 'All Companies' || item.company === companyFilter;
      const matchesOutlet = outletFilter === 'All Outlets' || item.outlet === outletFilter;
      const matchesStatus = statusFilter === 'All Status' || item.rawStatus === statusFilter;

      return matchesSearch && matchesCompany && matchesOutlet && matchesStatus;
    });
  }, [poList, search, companyFilter, outletFilter, statusFilter]);

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
      title: 'Total Requests',
      value: String(poList.length),
      icon: <ClipboardList size={22} className="text-blue-600 p-1 bg-blue-100 rounded" />,
    },
    {
      title: 'Pending POs',
      value: String(poList.filter((p) => p.rawStatus === PO_STATUS.PENDING).length),
      icon: <Package size={22} className="text-orange-500 p-1 bg-orange-100 rounded" />,
    },
    {
      title: 'PO Generated',
      value: String(poList.filter((p) => p.poCode !== 'TO BE GENERATED').length),
      icon: <CircleCheck size={22} className="text-green-600 p-1 bg-green-100 rounded" />,
    },
    {
      title: 'Rejected',
      value: String(poList.filter((p) => p.rawStatus === PO_STATUS.REJECTED).length),
      icon: <CircleX size={22} className="text-red-500 p-1 bg-red-100 rounded" />,
    },
  ];

  return (
    <Container>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Order Requests</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Purchase Order Requests</h1>
            <p className="text-[#737781] mt-1 md:w-[90%]">
              Review approved purchase requisitions and generate purchase orders for procurement workflows.
            </p>
          </div>

          <div className="flex gap-3 self-end">
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] text-[#334155] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-gray-50 transition"
            >
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {scopeError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
            {scopeError}
            <button onClick={retryScope} className="text-xs font-semibold underline shrink-0 ml-3">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
          {STATS.map((item) => (
            <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
              <div className="flex justify-between items-center pb-2">
                <p>{item.icon}</p>
              </div>
              <h1 className="text-sm text-[#43474F]">{item.title}</h1>
              <h2 className="text-xl font-bold">{item.value}</h2>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="relative pr-4 py-2 border border-[#C3C6D1] rounded-lg w-full">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PR Code, Company or Raised By..."
                className="w-full pl-10 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Companies">All Companies</SelectItem>
                  {companyOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={outletFilter} onValueChange={setOutletFilter}>
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue placeholder="All Outlets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Outlets">All Outlets</SelectItem>
                  {outletOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {PO_STATUS_LIST.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showUnitDropdown && (
            <div className="mt-4">
              <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
            </div>
          )}
        </div>

        {poError && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {poError}
            <button
              type="button"
              onClick={loadData}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {poLoading || scopeLoading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              Loading purchase orders...
            </div>
          ) : (
            <DataGrid table={table} recordCount={filteredRequests.length} className="rounded-2xl">
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
      </div>
    </Container>
  );
};

export default PurchaseOrderRequest;