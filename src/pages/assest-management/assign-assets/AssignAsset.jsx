import React, { useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  Eye,
  MapPin,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
  Upload,
  UserCog,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  deleteAssignAsset,
  getActiveCompany,
  getAllActiveEmployees,
  getAllAssets,
  getAllAssignAssets,
  updateAssignAsset,
} from '@/services/apiServices.js';
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
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';

// Safely pulls the array out of a response, regardless of whether the
// service resolves to the raw axios response, an already-unwrapped
// `{ msg, data, success }` body, or a bare array.
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const ASSIGN_TYPE_META = {
  individual: { label: 'Individual', className: 'bg-purple-100 text-purple-700' },
  company_outlet: { label: 'Company/Outlet', className: 'bg-sky-100 text-sky-700' },
};


const AssignTypeBadge = ({ assignType }) => {
  const meta = ASSIGN_TYPE_META[assignType] ?? {
    label: '—',
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${meta.className} inline-flex items-center justify-center w-fit`}
    >
      {meta.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Assigned: 'bg-green-100 text-green-700',
    Pending: 'bg-orange-100 text-orange-700',
    Returned: 'bg-gray-100 text-gray-600',
    Overdue: 'bg-[#FEE2E2] text-[#BA1A1A]',
  };
  const dotStyle = {
    Assigned: 'bg-[#16A34A]',
    Pending: 'bg-[#C2410C]',
    Returned: 'bg-[#6B7280]',
    Overdue: 'bg-[#BA1A1A]',
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] ?? styles.Returned} flex gap-1 items-center justify-center w-fit`}
    >
      <p
        className={`w-2 h-2 rounded-full ${dotStyle[status] ?? dotStyle.Returned}`}
      ></p>
      <p>{status}</p>
    </span>
  );
};

const AssignmentPreviewDrawer = ({
  assignment,
  onClose,
  onTransfer,
  onMarkReturned,
  actionSaving,
  canEdit = true,
}) => {
  if (!assignment) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-blue-50/50 border border-blue-100 flex items-start justify-between px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#265FA4]">
              Assignment Preview
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {assignment.assignmentId} Details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Item summary */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
              {assignment.assetImageUrl ? (
                <img
                  src={assignment.assetImageUrl}
                  alt={assignment.itemName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <QrCode className="w-7 h-7" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{assignment.assignmentId}</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {assignment.itemName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                S/N: {assignment.serialNumber}
              </p>
            </div>
          </div>

          {/* Current assignment */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCog className="w-4 h-4 text-[#265FA4]" />
              <h3 className="text-sm font-bold text-[#265FA4]">
                Current Assignment
              </h3>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Type
                </p>
                <div className="mt-1">
                  <AssignTypeBadge assignType={assignment.assignType} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={assignment.status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Assigned To
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.assignedTo}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Quantity
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.qty}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Location / Outlet
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.location}
                  {assignment.city && assignment.city !== '—'
                    ? `, ${assignment.city}`
                    : ''}
                  {assignment.state && assignment.state !== '—'
                    ? `, ${assignment.state}`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => onTransfer?.(assignment)}
              disabled={actionSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition disabled:opacity-60"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AssignAssets = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Assigned Asset');

  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [previewAssignment, setPreviewAssignment] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [outletInput, setOutletInput] = useState('All');
  const [categoryInput, setCategoryInput] = useState('All');
  const [statusInput, setStatusInput] = useState('All');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const navigate = useNavigate();
  const loadAll = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [assignRes, assetRes, empRes, orgRes] = await Promise.all([
        getAllAssignAssets(),
        getAllAssets(),
        getAllActiveEmployees(),
        getActiveCompany(),
      ]);
      setAssignments(extractArray(assignRes));
      setAssets(extractArray(assetRes));
      setEmployees(extractArray(empRes));
      setOrganizations(extractArray(orgRes));
    } catch (err) {
      console.error(err);
      setLoadError('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Joins a raw assign-assets record (ids only) with asset/employee/org
  // details so the table and drawer have real names to show.
  const enrichedAssignments = useMemo(() => {
    return (assignments ?? []).map((record) => {
      const asset = (assets ?? []).find((a) => a.id === record.assetId);
      const employee = record.assignToId
        ? (employees ?? []).find((e) => e.id === record.assignToId)
        : null;
      const org = record.companiesId
        ? (organizations ?? []).find((o) => o.id === record.companiesId)
        : null;

      return {
        id: record.id,
        // NOTE: no assignmentId string field confirmed on the API record —
        // derived from the numeric id until/unless the API provides one.
        assignmentId: `ASGN-${String(record.id).padStart(4, '0')}`,
        assetDbId: record.assetId,
        assetCode: asset?.assetCode ?? '—',
        itemName: asset?.itemName ?? '—',
        category: asset?.categoryName ?? '—',
        serialNumber: asset?.serialNumber ?? '—',
        assetImageUrl: Array.isArray(asset?.assetImagePaths)
          ? asset.assetImagePaths[0]
          : null,
        assignType: record.assetType,
        assignedTo: employee?.fullName ?? org?.companyNameEnglish ?? '—',
        companiesId: record.companiesId ?? null,
        companiesName: record.companiesName ?? org?.companyNameEnglish ?? '—',

        // Sub Unit
        subOutletId: record.subOutletId ?? null,
        subOutletName: record.suboutletname ?? '-',
        location: org?.companyNameEnglish ?? '-',
        city: org?.cityName ?? '-',
        state: org?.stateName ?? '-',
        qty: record.quantity ?? 0,
        active: record.active,
        // NOTE: no status enum confirmed on the API record — derived from
        // `active` until/unless the API returns a real status field.
        status: record.active ? 'Assigned' : 'Returned',
        createdAt: record.createdAt ?? null,
        assignedDate: record.createdAt ? record.createdAt.split(' ')[0] : '-',
      };
    });
  }, [assignments, assets, employees, organizations]);

  const outletOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (organizations ?? [])
            .filter(
              (o) => o.orgType === 'OUTLET' || o.orgType === 'SUB_COMPANY',
            )
            .map((o) => o.companyNameEnglish)
            .filter(Boolean),
        ),
      ),
    [organizations],
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set((assets ?? []).map((a) => a.categoryName).filter(Boolean)),
      ),
    [assets],
  );

  const filteredAssignments = useMemo(() => {
    return enrichedAssignments.filter((item) => {
      const search = searchInput.toLowerCase().trim();

      const searchMatch =
        !search ||
        item.assignmentId.toLowerCase().includes(search) ||
        item.assetCode.toLowerCase().includes(search) ||
        item.itemName.toLowerCase().includes(search) ||
        item.assignedTo.toLowerCase().includes(search);

      const outletMatch =
        outletInput === 'All' || item.location === outletInput;
      const categoryMatch =
        categoryInput === 'All' || item.category === categoryInput;
      const statusMatch = statusInput === 'All' || item.status === statusInput;

      return searchMatch && outletMatch && categoryMatch && statusMatch;
    });
  }, [
    enrichedAssignments,
    searchInput,
    outletInput,
    categoryInput,
    statusInput,
  ]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchInput, outletInput, categoryInput, statusInput]);

  // Real, lightweight stat derivations from the loaded data. The other
  // stat cards (Pending Returns, Transfer Requests, Under Maintenance)
  // have no backing concept in the current API and stay static.
  const totalAssignments = enrichedAssignments.length;
  const activeAssignments = enrichedAssignments.filter(
    (a) => a.status === 'Assigned',
  ).length;
  const returnedAssignments = enrichedAssignments.filter(
    (a) => a.status === 'Returned',
  ).length;

  const STATS = [
    {
      title: 'Total Assignments',
      value: String(totalAssignments),
      icon: <Package size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#00376C]',
      color: 'text-[#1B1B1F]',
    },
    {
      title: 'Active Assignments',
      value: String(activeAssignments),
      icon: <CircleCheck size={18} />,
      iconBg: 'bg-[#DCFCE7]',
      iconColor: 'text-[#15803D]',
      color: 'text-[#15803D]',
    },
    {
      title: 'Returned Assets',
      value: String(returnedAssignments),
      icon: <RotateCcw size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#265FA4]',
      color: 'text-[#1B1B1F]',
    },
    {
      title: 'Pending Returns',
      value: '—',
      icon: <Clock size={18} />,
      iconBg: 'bg-[#FFEDD5]',
      iconColor: 'text-[#C2410C]',
      color: 'text-[#C2410C]',
    },
    {
      title: 'Transfer Requests',
      value: '—',
      icon: <ArrowLeftRight size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#265FA4]',
      color: 'text-[#265FA4]',
    },
    {
      title: 'Under Maintenance',
      value: '—',
      icon: <Wrench size={18} />,
      iconBg: 'bg-[#FEE2E2]',
      iconColor: 'text-[#BA1A1A]',
      color: 'text-[#BA1A1A]',
    },
  ];

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, itemLabel: row.itemName });
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
      await deleteAssignAsset(deleteTarget.id);
      setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      closeDeleteConfirm();
    } catch (err) {
      console.error(err);
      // Surface the error instead of silently closing the modal.
      setLoadError('Failed to delete assignment.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleMarkReturned = async (assignment) => {
    setActionSaving(true);
    try {
      // ASSUMPTION: marking as returned = flipping `active` to false.
      // Confirm this matches your backend's actual return semantics.
      await updateAssignAsset({ id: assignment.id, active: false });
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? { ...a, active: false } : a)),
      );
      setPreviewAssignment(null);
    } catch (err) {
      console.error(err);
      setLoadError('Failed to mark assignment as returned.');
    } finally {
      setActionSaving(false);
    }
  };
  const handleTransfer = (assignment) => {
    // TODO: no transfer endpoint exists yet in apiServices.js — wire this
    // up once a `/assign-assets/transfer` (or similar) API is available.
    console.log('Transfer requested for', assignment);
    setPreviewAssignment(null);
  };

  const columns = useMemo(() => [
    {
      id: 'assignmentId',
      accessorFn: (row) => row.assignmentId,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSIGNMENT ID"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setPreviewAssignment(row.original)}
          className="font-semibold text-[#123B6D] leading-5 py-2 hover:underline cursor-pointer text-left"
        >
          {row.original.assignmentId}
        </button>
      ),
      size: 140,
    },
    {
      id: 'assetCode',
      accessorFn: (row) => row.assetCode,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSET ID"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 py-1">{row.original.assetCode}</span>
      ),
      size: 110,
    },
    {
      id: 'itemName',
      accessorFn: (row) => row.itemName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ITEM NAME"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-gray-800 py-1">
          {row.original.itemName}
        </span>
      ),
      size: 160,
    },
    {
      id: 'assignee',
      accessorFn: (row) => row.assignedTo,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSIGNED TO"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <div className="py-1">
          <p className="font-semibold text-gray-800 leading-tight">
            {row.original.assignedTo}
          </p>
        </div>
      ),
      size: 170,
    },
    {
      id: 'outlet',
      accessorFn: (row) => row.companiesName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="OUTLET"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 py-1">{row.original.companiesName}</span>
      ),
      size: 140,
    },
    {
      id: 'subOutlet',
      accessorFn: (row) => row.subOutletName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="SUB OUTLET"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 py-1">{row.original.subOutletName}</span>
      ),
      size: 140,
    },
    {
      id: 'assignedDate',
      accessorFn: (row) => row.assignedDate,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSIGNED DATE"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 py-1">{row.original.assignedDate}</span>
      ),
      size: 130,
    },
    {
      id: 'qty',
      accessorFn: (row) => row.qty,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="QTY"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 font-medium py-1">
          {row.original.qty}
        </span>
      ),
      size: 70,
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="STATUS"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 120,
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
          <button
            type="button"
            onClick={() => setPreviewAssignment(row.original)}
            title="View Assignment"
          >
            <Eye
              size={18}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
            />
          </button>
          {canEdit && (
            <Link to={`/assets/assign-asset/edit/${row.original.id}`}>
              <SquarePen
                size={18}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
              />
            </Link>
          )}
          {canDelete && (
            <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete Assignment">
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
  ], [canEdit, canDelete]);

  const table = useReactTable({
    data: filteredAssignments,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Assigned Asset" />;
  }

  return (
    <Container>
      <div className="p-4 mx-auto">
        <div className="flex items-center gap-1.5 sm:text-xs text-[10px] text-gray-400 mb-2">
          <span className='cursor-pointer hover:text-blue-300' onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={12} />
          <span>Asset Management</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Assign Assets</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="font-bold text-[#101828] text-xl sm:text-2xl">Assign Assets</h1>
          </div>

          {canAdd && (
            <HeaderActionButton to="/assets/assign-asset">
              Assign Asset
            </HeaderActionButton>
          )}
        </div>

        {loadError && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
            {loadError}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 py-4 text-[#43474F]">
          {STATS.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
            >
              <div
                className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}
              >
                {item.icon}
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                <span className={`text-lg sm:text-xl font-bold mt-0.5 ${item.color}`}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ID, Name, Kitchen..."
                className="w-full border border-[#C3C6D1] rounded-xl pl-10 pr-3 py-2 outline-none focus:border-[#084E92]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Outlet */}
              <div>
                <Select value={outletInput} onValueChange={setOutletInput}>
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Outlets</SelectItem>
                    {outletOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Select value={statusInput} onValueChange={setStatusInput}>
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Select value={categoryInput} onValueChange={setCategoryInput}>
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                    <SelectValue placeholder="All Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Category</SelectItem>
                    {categoryOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          <DataGrid
            table={table}
            recordCount={filteredAssignments.length}
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

        {previewAssignment && (
          <AssignmentPreviewDrawer
            assignment={previewAssignment}
            onClose={() => setPreviewAssignment(null)}
            onTransfer={handleTransfer}
            onMarkReturned={handleMarkReturned}
            actionSaving={actionSaving}
            canEdit={canEdit}
          />
        )}
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

export default AssignAssets;
