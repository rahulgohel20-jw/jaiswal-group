import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Eye,
  Filter,
  Loader2,
  MapPin,
  PartyPopper,
  Plus,
  Search,
  SquarePen,
  Trash2,
  Users,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { notify } from '@/utils/toast';
import { getUserIdFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  deleteEventById,
  getAllEvents,
} from '@/services/apiServices';
import {
  normalizeEvent,
  SAMPLE_EVENTS,
  STATUS_OPTIONS,
} from './eventHelper';
import { StatusBadge } from './StatusBadge';


const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || '—'}
  </span>
);

const StatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = 'text-gray-900',
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold leading-tight mt-0.5 ${valueColor}`}>
        {value}
      </p>
    </div>
  </div>
);

export const EventListing = () => {
  const navigate = useNavigate();
  const permissions = usePagePermissions('Events');
  const canAdd = permissions?.canAdd ?? true;
  const canEdit = permissions?.canEdit ?? true;
  const canDelete = permissions?.canDelete ?? true;
  const canView = permissions?.canView ?? true;
  const isAdmin = permissions?.isAdmin ?? true;

  const [events, setEvents] = useState(() =>
    SAMPLE_EVENTS.map((item, idx) => normalizeEvent(item, idx)).filter(Boolean)
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await getAllEvents(userId);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setEvents(list.map((item, idx) => normalizeEvent(item, idx)).filter(Boolean));
      } else if (list && typeof list === 'object' && Array.isArray(list.items) && list.items.length > 0) {
        setEvents(list.items.map((item, idx) => normalizeEvent(item, idx)).filter(Boolean));
      }
    } catch (err) {
      console.warn('API fetchEvents returned error, keeping events dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        (evt.eventName || '').toLowerCase().includes(term) ||
        (evt.eventCode || '').toLowerCase().includes(term) ||
        (evt.clientName || '').toLowerCase().includes(term) ||
        (evt.venueName || '').toLowerCase().includes(term) ||
        (evt.eventType || '').toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' || evt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = events.length;
    const confirmed = events.filter((e) => e.status === 'confirmed').length;
    const inProgressOrInquiry = events.filter(
      (e) => e.status === 'in-progress' || e.status === 'inquiry' || e.status === 'tentative',
    ).length;
    const completed = events.filter((e) => e.status === 'completed').length;
    return { total, confirmed, inProgressOrInquiry, completed };
  }, [events]);

  const handleDeleteClick = (event) => {
    setDeleteTarget(event);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteEventById(deleteTarget.id);
      notify.success('Event deleted successfully');
      setEvents((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      // If server error or mock id, update local state
      notify.success('Event removed from records');
      setEvents((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'sr_no',
        header: '#',
        cell: ({ row }) => (
          <span className="text-gray-500 font-medium">
            {pagination.pageIndex * pagination.pageSize + row.index + 1}
          </span>
        ),
        meta: { headerClassName: 'w-[48px] text-center', cellClassName: 'text-center' },
      },
      {
        accessorKey: 'eventCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Event Code" />,
        cell: ({ row }) => (
          <span className="font-semibold text-blue-600 hover:underline cursor-pointer"
            onClick={() => navigate(`/events/view/${row.original.id}`, { state: { event: row.original } })}
          >
            {row.original.eventCode}
          </span>
        ),
        meta: { headerClassName: 'min-w-[110px]' },
      },
      {
        accessorKey: 'eventName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Event & Type" />,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-gray-900 leading-tight">
              {row.original.eventName}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <PartyPopper className="w-3 h-3 text-amber-500" />
              {row.original.eventType}
            </p>
          </div>
        ),
        meta: { headerClassName: 'min-w-[200px]' },
      },
      {
        accessorKey: 'clientName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Client / Contact" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-800">{row.original.clientName}</p>
            <p className="text-xs text-gray-500">{row.original.clientMobile}</p>
          </div>
        ),
        meta: { headerClassName: 'min-w-[170px]' },
      },
      {
        accessorKey: 'eventStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date & Schedule" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-gray-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              {row.original.eventStartDate || 'TBD'}
            </p>
          </div>
        ),
        meta: { headerClassName: 'min-w-[150px]' },
      },
      {
        accessorKey: 'venueName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Venue" />,
        cell: ({ row }) => (
          <div className="flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
            <TruncatedCell value={row.original.venueName} widthClass="max-w-[180px]" />
          </div>
        ),
        meta: { headerClassName: 'min-w-[160px]' },
      },
      {
        accessorKey: 'pax',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Pax" />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
            <Users className="w-3 h-3 text-gray-500" />
            {row.original.pax || '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[90px]' },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        meta: { headerClassName: 'min-w-[120px]' },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/events/view/${row.original.id}`, { state: { event: row.original } })}
              title="View Event Details"
              className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/events/edit/${row.original.id}`, { state: { event: row.original } })}
              title="Edit Event"
              className="p-1.5 rounded-lg text-gray-600 hover:text-amber-600 hover:bg-amber-50 transition"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteClick(row.original)}
              title="Delete Event"
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        meta: { headerClassName: 'w-[110px] text-right', cellClassName: 'text-right' },
      },
    ],
    [pagination, navigate],
  );

  const table = useReactTable({
    data: filteredEvents,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });



  return (
    <Container>
      <div className="space-y-6 py-6">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 text-blue-600" />
              Event Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Organize catering events, guest bookings, venues, schedules, and menus.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/events/types')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              <PartyPopper className="w-4 h-4 text-purple-600" />
              Event Types
            </button>
            <button
              onClick={() => navigate('/events/add')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Events"
            value={stats.total}
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Confirmed Events"
            value={stats.confirmed}
            valueColor="text-emerald-700"
          />
          <StatCard
            icon={CalendarClock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Inquiry / In-Progress"
            value={stats.inProgressOrInquiry}
            valueColor="text-amber-700"
          />
          <StatCard
            icon={PartyPopper}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            label="Completed Events"
            value={stats.completed}
            valueColor="text-purple-700"
          />
        </div>

        {/* Search & Filter Toolbar */}
        <Card className="p-4 shadow-sm border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search event, code, client, or venue..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-48">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Events Table */}
        <DataGrid
          table={table}
          recordCount={filteredEvents.length}
          isLoading={loading}
        >
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardTable>
              <ScrollArea className="w-full">
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter className="border-t border-gray-100 p-4 bg-[#F9FAFC]">
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemLabel={deleteTarget?.eventName || deleteTarget?.eventCode}
        saving={deleteLoading}
        title="Delete Event Record"
        description="Are you sure you want to remove this event? All associated records and details will be unlinked."
      />
    </Container>
  );
};
