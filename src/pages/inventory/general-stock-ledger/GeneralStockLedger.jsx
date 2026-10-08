import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Package, Eye, FileSpreadsheet, CalendarRange } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import SearchableSelect from '@/utils/SearchableSelect';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import {
  getLedgerList,
  getLedgerListFiltered,
  getAllRawMaterialItems,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';

const formatToDDMMYYYY = (val) => {
  if (!val) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return val;
};

const formatDateShort = (val) => {
  if (!val) return '—';
  const ymdMatch = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  return val;
};

const REFERENCE_TYPE_OPTIONS = [
  { value: '', label: 'All Reference Types' },
  { value: 'GRN', label: 'GRN' },
  { value: 'STOCK_TRANSFER', label: 'Stock Transfer' },
  { value: 'OPB', label: 'Opening Balance (OPB)' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment' },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Transaction Types' },
  { value: 'OPB', label: 'Opening Balance (OPB)' },
  { value: 'GRN_INWARD', label: 'GRN Inward' },
  { value: 'TRANSFER_IN', label: 'Transfer In' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  { value: 'CONSUMPTION', label: 'Consumption' },
  { value: 'WASTAGE', label: 'Wastage' },
  { value: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment' },
  { value: 'RETURN_TO_VENDOR', label: 'Return to Vendor' },
];

const normalizeCompany = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || item.name || item.organizationName || `Company #${item.id}`,
  code: item.companyCode || item.shortCode || '',
  status: item.isActive !== false ? 'active' : 'inactive',
});

const normalizeOutlet = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || item.name || item.organizationName || `Outlet #${item.id}`,
  code: item.companyCode || item.shortCode || '',
  organizationId: item.parentId || item.organizationId,
  status: item.isActive !== false ? 'active' : 'inactive',
});

const normalizeSubOutlet = (item) => ({
  id: item.id,
  name: item.subOutletName || item.name || `Sub-Outlet #${item.id}`,
  code: item.companyCode || '',
  organizationId: item.organizationId,
  status: item.isActive !== false ? 'active' : 'inactive',
});

const normalizeSubLocation = (item) => ({
  id: item.id,
  name:
    item.locationName ||
    item.subLocationName ||
    item.name ||
    item.sub_location_name ||
    item.location_name ||
    (item.id ? `Sub-Location #${item.id}` : ''),
  code: item.locationCode || item.shortCode || item.code || '',
  organizationId: item.organizationId,
  subOutletId: item.subOutletId,
  status: item.isActive !== false ? 'active' : 'inactive',
});

const GeneralStockLedger = () => {
  const navigate = useNavigate();

  // Organization Scope from logged in user token & role
  const {
    loading: scopeLoading,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units: scopedOutlets,
    effectiveOutletId,
    selfOrg,
    companies: scopeCompanies,
    getSubOutlets,
    getSubLocations,
  } = useOrgScope();

  // Dropdown lists
  const [companies, setCompanies] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [subOutlets, setSubOutlets] = useState([]);
  const [subLocations, setSubLocations] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Selected filters
  const [company, setCompany] = useState('');
  const [outlet, setOutlet] = useState('');
  const [subOutlet, setSubOutlet] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [itemType] = useState('RAW_MATERIAL');
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });
  const [tempDateRange, setTempDateRange] = useState({ from: '', to: '' });
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [referenceType, setReferenceType] = useState('');
  const [transactionType, setTransactionType] = useState('');

  // Loading states
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);
  const [loadingSubLocations, setLoadingSubLocations] = useState(false);
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Search input & debounced search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Data & Total count
  const [ledgerData, setLedgerData] = useState([]);
  const [currentStockData, setCurrentStockData] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  // Pagination & Sorting
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Initialize and load companies / outlets based on user scope
  useEffect(() => {
    if (scopeLoading) return;

    if (isGroupUser) {
      setCompanies((scopeCompanies || []).map(normalizeCompany));
      setLoadingCompanies(false);
    } else if (isCompanyUser) {
      // Company user: company is fixed to user's company (Company dropdown hidden)
      const userCompanyId = selfOrg?.id || getOrgIdFromToken();
      if (userCompanyId) {
        setCompany(String(userCompanyId));
        if (selfOrg) {
          setCompanies([normalizeCompany(selfOrg)]);
        }
      }
      const mappedOutlets = scopedOutlets.map(normalizeOutlet);
      setOutlets(mappedOutlets);
      if (mappedOutlets.length === 1) {
        setOutlet(String(mappedOutlets[0].id));
      }
    } else if (isOutletUser) {
      // Outlet user: company and outlet are fixed (Company & Outlet dropdowns hidden)
      if (selfOrg?.parentId || selfOrg?.parentOrganizationId) {
        setCompany(String(selfOrg.parentId || selfOrg.parentOrganizationId));
      }
      const targetOutletId = effectiveOutletId || selfOrg?.id || getOrgIdFromToken();
      if (targetOutletId) {
        setOutlet(String(targetOutletId));
      }
      setOutlets(scopedOutlets.map(normalizeOutlet));
    }
  }, [scopeLoading, isGroupUser, isCompanyUser, isOutletUser, selfOrg, scopedOutlets, effectiveOutletId, scopeCompanies]);

  // Handle Company change (Group user only)
  const handleCompanyChange = (newCompanyId) => {
    setCompany(newCompanyId);
    setOutlet('');
    setSubOutlet('');
    setSubLocation('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));

    if (!newCompanyId) {
      setOutlets([]);
      return;
    }

    const filtered = (scopedOutlets || []).filter(
      (o) => Number(o.subCompanyId || o.parentId) === Number(newCompanyId)
    );
    const mapped = filtered.map(normalizeOutlet);
    setOutlets(mapped);
    if (mapped.length === 1) {
      setOutlet(String(mapped[0].id));
    }
    setLoadingOutlets(false);
  };

  // Fetch Sub-Outlets when Outlet changes
  useEffect(() => {
    if (!outlet) {
      setSubOutlets([]);
      setSubOutlet('');
      setSubLocations([]);
      setSubLocation('');
      return;
    }

    const list = getSubOutlets(outlet);
    setSubOutlets((Array.isArray(list) ? list : []).map(normalizeSubOutlet));
    setLoadingSubOutlets(false);
  }, [outlet, getSubOutlets]);

  // Fetch Sub-Locations on selecting Sub-Outlet
  useEffect(() => {
    if (!subOutlet) {
      setSubLocations([]);
      setSubLocation('');
      return;
    }

    const list = getSubLocations(subOutlet);
    setSubLocations((Array.isArray(list) ? list : []).map(normalizeSubLocation));
    setLoadingSubLocations(false);
  }, [subOutlet, getSubLocations]);

  // Fetch Raw Materials (Fetch all raw materials)
  const fetchRawMaterials = useCallback(async () => {
    setLoadingRawMaterials(true);
    try {
      const res = await getAllRawMaterialItems();
      const responseData = res?.data?.data || res?.data || {};
      const list =
        responseData['Raw Material Details'] ||
        responseData.content ||
        responseData.list ||
        (Array.isArray(responseData) ? responseData : []);
      setRawMaterials(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load raw materials:', error);
      setRawMaterials([]);
    } finally {
      setLoadingRawMaterials(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  // Fetch Stock Ledger List from /api/stock-ledger/list
  const fetchStockLedger = useCallback(async () => {
    if (!outlet || !rawMaterialId) {
      setLedgerData([]);
      setCurrentStockData(null);
      setTotalRecords(0);
      return;
    }

    setLoadingLedger(true);
    try {
      const hasDateFilter = Boolean(appliedDateRange.from && appliedDateRange.to);

      let res;
      if (hasDateFilter) {
        const payload = {
          organizationId: Number(outlet),
          itemId: Number(rawMaterialId),
          itemType: itemType,
          pageNo: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          fromDate: formatToDDMMYYYY(appliedDateRange.from),
          toDate: formatToDDMMYYYY(appliedDateRange.to),
        };

        if (subOutlet) {
          payload.subOutletId = Number(subOutlet);
        }
        if (subLocation) {
          payload.subLocationId = Number(subLocation);
        }
        if (referenceType) {
          payload.referenceType = referenceType;
        }
        if (transactionType) {
          payload.transactionType = transactionType;
        }
        if (search) {
          payload.search = search;
        }

        res = await getLedgerListFiltered(payload);
      } else {
        const params = {
          organizationId: Number(outlet),
          itemId: Number(rawMaterialId),
          itemType: itemType,
          pageNo: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
        };

        if (subOutlet) {
          params.subOutletId = Number(subOutlet);
        }
        if (subLocation) {
          params.subLocationId = Number(subLocation);
        }
        if (referenceType) {
          params.referenceType = referenceType;
        }
        if (transactionType) {
          params.transactionType = transactionType;
        }
        if (search) {
          params.search = search;
        }

        res = await getLedgerList(params);
      }
      const resData = res?.data?.data ?? res?.data?.content ?? res?.data?.list ?? [];
      const list = Array.isArray(resData) ? resData : [];
      const currentStock = Array.isArray(res?.data?.currentStock)
        ? res?.data?.currentStock[0]
        : (res?.data?.currentStock || null);

      setLedgerData(list);
      setCurrentStockData(currentStock);
      setTotalRecords(
        Number(res?.data?.totalElements ?? res?.data?.totalRecords ?? res?.data?.total ?? list.length)
      );
    } catch (error) {
      console.error('Failed to load stock ledger:', error);
      notify.error('Failed to load stock ledger records');
      setLedgerData([]);
      setCurrentStockData(null);
      setTotalRecords(0);
    } finally {
      setLoadingLedger(false);
    }
  }, [
    outlet,
    subOutlet,
    subLocation,
    rawMaterialId,
    itemType,
    referenceType,
    transactionType,
    appliedDateRange.from,
    appliedDateRange.to,
    search,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  // Trigger ledger fetch whenever dependencies change
  useEffect(() => {
    fetchStockLedger();
  }, [fetchStockLedger]);

  // Handle viewing a ledger record details page
  const handleViewRecord = (record) => {
    if (!record?.id) return;
    navigate(`/inventory/general-stock-ledger/view/${record.id}`, {
      state: { ledgerRecord: record, id: record.id },
    });
  };

  // Dropdown options
  const companyOptions = useMemo(
    () =>
      companies
        .filter((c) => c.status === 'active')
        .map((c) => ({
          value: String(c.id),
          label: c.name,
        })),
    [companies]
  );

  const outletOptions = useMemo(
    () =>
      outlets
        .filter((o) => o.status === 'active')
        .map((o) => ({
          value: String(o.id),
          label: o.name,
        })),
    [outlets]
  );

  const subOutletOptions = useMemo(
    () =>
      subOutlets
        .filter((s) => s.status === 'active')
        .map((s) => ({
          value: String(s.id),
          label: s.name,
        })),
    [subOutlets]
  );

  const subLocationOptions = useMemo(
    () =>
      subLocations
        .filter((l) => l.status === 'active')
        .map((l) => ({
          value: String(l.id),
          label: l.name,
        })),
    [subLocations]
  );

  const rawMaterialOptions = useMemo(
    () =>
      rawMaterials
        .map((r) => {
          const name =
            r.nameEnglish ||
            r.name ||
            r.itemName ||
            r.rawMaterialName ||
            r.item_name ||
            r.raw_material_name ||
            (r.id ? `Item #${r.id}` : '');
          return {
            value: String(r.id),
            label: name,
          };
        })
        .filter((opt) => Boolean(opt.label && opt.value)),
    [rawMaterials]
  );

  // Table Columns (Clean, compact font, fits without horizontal scrolling, sorting on Date, Item Name, and Expiry Date only)
  const columns = useMemo(
    () => [
      {
        id: 'transactionDate',
        accessorFn: (row) => row.transactionDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const raw = row.original.transactionDate || '—';
          const dateOnly = raw.includes(' ') ? raw.split(' ')[0] : raw;
          return (
            <span className="text-xs font-medium text-gray-900 whitespace-nowrap">
              {dateOnly}
            </span>
          );
        },
        enableSorting: true,
        size: 110,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Name"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span
            className="text-xs font-bold text-gray-900 truncate block"
            title={row.original.itemName}
          >
            {row.original.itemName || '—'}
          </span>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'expiryDate',
        accessorFn: (row) => row.expiryDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Expiry Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {row.original.expiryDate || '—'}
          </span>
        ),
        enableSorting: true,
        size: 110,
      },
      {
        id: 'transactionType',
        accessorFn: (row) => row.transactionType,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Transaction Type"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
            {row.original.transactionType || '—'}
          </span>
        ),
        enableSorting: false,
        size: 140,
      },
      {
        id: 'quantity',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Quantity"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const inQty = Number(row.original.inQuantity || 0);
          const outQty = Number(row.original.outQuantity || 0);
          const unit = row.original.unitSymbol || '';

          if (inQty > 0) {
            return (
              <span className="text-xs font-bold text-emerald-600 font-mono whitespace-nowrap">
                +{inQty} {unit}
              </span>
            );
          }
          if (outQty > 0) {
            return (
              <span className="text-xs font-bold text-rose-600 font-mono whitespace-nowrap">
                -{outQty} {unit}
              </span>
            );
          }
          return <span className="text-gray-400 text-xs">—</span>;
        },
        enableSorting: false,
        size: 100,
      },
      {
        id: 'balanceAfter',
        accessorFn: (row) => row.balanceAfter,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Balance"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-bold text-[#084E92] font-mono whitespace-nowrap">
            {row.original.balanceAfter ?? 0} {row.original.unitSymbol || ''}
          </span>
        ),
        enableSorting: false,
        size: 100,
      },
      {
        id: 'pricing',
        accessorFn: (row) => row.unitRate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Rate"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-700 font-mono whitespace-nowrap">
            ₹{Number(row.original.unitRate || 0).toFixed(2)}
            {row.original.unitSymbol ? `/${row.original.unitSymbol}` : ''}
          </span>
        ),
        enableSorting: false,
        size: 100,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Action"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleViewRecord(row.original)}
            className="text-gray-500 hover:text-green-600 cursor-pointer p-1 transition"
            title="View Ledger Details"
          >
            <Eye size={17} />
          </button>
        ),
        enableSorting: false,
        size: 50,
      },
    ],
    []
  );

  // Server-side page count calculation
  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil((totalRecords || 0) / pagination.pageSize));
  }, [totalRecords, pagination.pageSize]);

  const table = useReactTable({
    data: ledgerData,
    columns,
    pageCount,
    state: { pagination, sorting },
    manualPagination: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page Header */}
        <PageHeader
          title="General Stock Ledger"
          description="Track comprehensive stock movement entries, batch movements, valuations, and ledger history."
        />

        {/* Filter Panel (Company, Outlet, Sub-Outlet, Sub-Location, Raw Material) */}
        <div
          className={`grid gap-4 items-end ${
            isGroupUser
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
              : !isOutletUser
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
          }`}
        >
          {/* 1. Company Selection (Hidden for Company & Outlet users, visible ONLY for Group user) */}
          {isGroupUser && (
            <div>
              <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">
                Company <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={companyOptions}
                value={company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                disabled={loadingCompanies}
                placeholder={
                  loadingCompanies
                    ? 'Loading companies...'
                    : 'Select Company'
                }
                isClearable={true}
              />
            </div>
          )}

          {/* 2. Outlet Selection (Compulsory, Hidden for Outlet user, visible for Group & Company users) */}
          {!isOutletUser && (
            <div>
              <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">
                Outlet <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={outletOptions}
                value={outlet}
                onChange={(e) => {
                  setOutlet(e.target.value);
                  setSubOutlet('');
                  setSubLocation('');
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                disabled={(isGroupUser && !company) || loadingOutlets}
                placeholder={
                  loadingOutlets
                    ? 'Loading outlets...'
                    : isGroupUser && !company
                    ? 'Select Company first'
                    : 'Select Outlet'
                }
              />
            </div>
          )}

          {/* 3. Sub-Outlet Selection (Optional) */}
          <div>
            <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">
              Sub-Outlet <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <SearchableSelect
              options={subOutletOptions}
              value={subOutlet}
              onChange={(e) => {
                setSubOutlet(e.target.value);
                setSubLocation('');
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              disabled={!outlet || loadingSubOutlets}
              placeholder={
                !outlet
                  ? 'Select Outlet first'
                  : loadingSubOutlets
                  ? 'Loading...'
                  : 'Select Sub-Outlet'
              }
            />
          </div>

          {/* 4. Sub-Location Selection (Optional) */}
          <div>
            <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">
              Sub-Location <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <SearchableSelect
              options={subLocationOptions}
              value={subLocation}
              onChange={(e) => {
                setSubLocation(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              disabled={!subOutlet || loadingSubLocations}
              placeholder={
                !subOutlet
                  ? 'Select Sub-Outlet first'
                  : loadingSubLocations
                  ? 'Loading...'
                  : 'Select Sub-Location'
              }
            />
          </div>

          {/* 5. Raw Material Selection (Compulsory) */}
          <div>
            <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">
              Raw Material <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={rawMaterialOptions}
              value={rawMaterialId}
              onChange={(e) => {
                setRawMaterialId(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              disabled={loadingRawMaterials}
              placeholder={
                loadingRawMaterials
                  ? 'Loading raw materials...'
                  : 'Select Raw Material'
              }
            />
          </div>
        </div>

        {/* Current Stock Summary Cards (When Raw Material and Outlet are loaded) */}
        {currentStockData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-gray-500">Current Stock</span>
                <span className="text-base sm:text-lg font-bold text-gray-900 font-mono truncate">
                  {currentStockData.currentStock ?? 0} {currentStockData.unitSymbol || ''}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-gray-500">Avg Cost Rate</span>
                <span className="text-base sm:text-lg font-bold text-gray-900 font-mono truncate">
                  ₹{Number(currentStockData.avgCostRate || 0).toFixed(2)}
                  {currentStockData.unitSymbol ? `/${currentStockData.unitSymbol}` : ''}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0 font-bold text-xs">
                ₹
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-gray-500">Total Valuation</span>
                <span className="text-base sm:text-lg font-bold text-[#084E92] font-mono truncate">
                  ₹{Number(currentStockData.totalValuation || 0).toFixed(2)}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0 font-bold text-xs">
                ₹
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-gray-500">Min Stock Alert</span>
                <span className="text-base sm:text-lg font-bold text-gray-700 font-mono truncate">
                  {currentStockData.minStockAlert ?? 0} {currentStockData.unitSymbol || ''}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                !
              </div>
            </div>
          </div>
        )}

        {/* Toolbar with SearchBar, Reference Type, Transaction Type dropdowns, and Date Range */}
        <div className="flex flex-col md:flex-row items-center gap-2.5 w-full flex-wrap">
          <div className="flex-1 min-w-[220px] w-full">
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput('')}
              placeholder="Search by transaction code, item, batch..."
            />
          </div>

          <div className="w-full md:w-52 shrink-0">
            <SearchableSelect
              options={REFERENCE_TYPE_OPTIONS}
              value={referenceType}
              onChange={(e) => {
                setReferenceType(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder="All Reference Types"
            />
          </div>

          <div className="w-full md:w-52 shrink-0">
            <SearchableSelect
              options={TRANSACTION_TYPE_OPTIONS}
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder="All Transaction Types"
            />
          </div>

          <Popover
            open={dateRangeOpen}
            onOpenChange={(open) => {
              if (open) {
                setTempDateRange(appliedDateRange);
              }
              setDateRangeOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-10 w-full md:w-auto flex items-center justify-center gap-2 border border-[#C3C6D1] bg-white text-[#101828] px-3.5 text-xs rounded-xl font-medium hover:bg-gray-50 whitespace-nowrap cursor-pointer shrink-0"
              >
                <CalendarRange size={14} className="text-[#98A2B3]" />
                {appliedDateRange.from && appliedDateRange.to
                  ? `${formatDateShort(appliedDateRange.from)} - ${formatDateShort(appliedDateRange.to)}`
                  : 'Date Range'}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-3 bg-white shadow-xl rounded-xl border border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tempDateRange.from}
                  onChange={(e) => setTempDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  max={tempDateRange.to || undefined}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  To <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tempDateRange.to}
                  onChange={(e) => setTempDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  min={tempDateRange.from || undefined}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTempDateRange({ from: '', to: '' });
                    setAppliedDateRange({ from: '', to: '' });
                    setDateRangeOpen(false);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tempDateRange.from || !tempDateRange.to) {
                      notify.error('Both From Date and To Date are compulsory.');
                      return;
                    }
                    if (tempDateRange.from > tempDateRange.to) {
                      notify.error('From Date cannot be later than To Date.');
                      return;
                    }
                    setAppliedDateRange({ from: tempDateRange.from, to: tempDateRange.to });
                    setDateRangeOpen(false);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className="bg-[#084E92] text-white text-xs font-medium px-3.5 py-1.5 rounded-lg hover:bg-[#063d73] cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* DataGrid Table Card */}
        <div className="w-full border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white shadow-2xs">
          {!outlet || !rawMaterialId ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-gray-400">
              <Package size={38} className="text-gray-300 stroke-1" />
              <p className="text-sm font-semibold text-gray-700">
                {!outlet
                  ? 'Please select an Outlet and Raw Material to load the Stock Ledger'
                  : 'Please select a Raw Material to load the Stock Ledger'}
              </p>
              <p className="text-xs text-gray-400 max-w-md">
                Select an outlet and raw material item to view stock movements, current stock valuation, batches, and ledger history.
              </p>
            </div>
          ) : loadingLedger ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-gray-400">
              <div className="w-7 h-7 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-700">
                Fetching stock ledger records...
              </p>
            </div>
          ) : ledgerData.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-gray-400">
              <FileSpreadsheet size={38} className="text-gray-300 stroke-1" />
              <p className="text-sm font-semibold text-gray-700">
                No stock ledger records found
              </p>
              <p className="text-xs text-gray-400">
                Try adjusting your search query, reference type, or transaction type filters.
              </p>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalRecords || ledgerData.length}
              tableLayout={{ dense: true, width: 'fixed' }}
              className="rounded-2xl"
            >
              <Card className="rounded-2xl border-0 shadow-none">
                <CardTable className="overflow-x-hidden w-full">
                  <DataGridTable />
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

export default GeneralStockLedger;