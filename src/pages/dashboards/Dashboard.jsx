'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlarmClock,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  Hourglass,
  InfoIcon,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import FilterPopover from '../../components/ui/FilterPopover';
import AddMember from '../../partials/modal/add-member/AddMember';

const staffData = [
  {
    id: 1,
    name: 'Zainab Tatariya',
    role: 'Logistics Lead',
    totalTasks: 24,
    performanceScore: 80,
    overdue: 2,
    pending: 6,
    inProgress: 3,
  },
  {
    id: 2,
    name: 'Manan Gandhi',
    role: 'Head',
    totalTasks: 12,
    performanceScore: 40,
    overdue: 2,
    pending: 6,
    inProgress: 3,
  },
  {
    id: 3,
    name: 'Swapnil Godheswar',
    role: 'Lead Server',
    totalTasks: 35,
    performanceScore: 90,
    overdue: 2,
    pending: 6,
    inProgress: 3,
  },
  {
    id: 4,
    name: 'Rahul Verma',
    role: 'Senior Associate',
    totalTasks: 31,
    performanceScore: 70,
    overdue: 4,
    pending: 7,
    inProgress: 5,
  },
  {
    id: 5,
    name: 'Arjun Patel',
    role: 'Operations Manager',
    totalTasks: 28,
    performanceScore: 75,
    overdue: 3,
    pending: 5,
    inProgress: 4,
  },
  {
    id: 6,
    name: 'Priya Sharma',
    role: 'Team Lead',
    totalTasks: 19,
    performanceScore: 85,
    overdue: 1,
    pending: 4,
    inProgress: 2,
  },
  {
    id: 7,
    name: 'Sneha Desai',
    role: 'Project Coordinator',
    totalTasks: 22,
    performanceScore: 88,
    overdue: 1,
    pending: 3,
    inProgress: 2,
  },
  {
    id: 8,
    name: 'Vikram Singh',
    role: 'Assistant Manager',
    totalTasks: 26,
    performanceScore: 65,
    overdue: 3,
    pending: 6,
    inProgress: 4,
  },
];

const Dashboard = () => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState([
    { id: 'performanceScore', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Filter state - NEW
  const [appliedFilters, setAppliedFilters] = useState(null);

  const handleViewStaff = (staff) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  // Handle filter apply - NEW
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    console.log('Filters applied:', filters);
  };

  // Apply search filter
  const searchFilteredData = useMemo(() => {
    if (!searchQuery) return staffData;
    return staffData.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  // Apply additional filters (assignees/creators) - NEW
  const filteredData = useMemo(() => {
    if (!appliedFilters) return searchFilteredData;

    return searchFilteredData.filter((staff) => {
      // If you want to filter by staff members (assignees in this context)
      // Assuming the FilterPopover uses staff.id for filtering
      const staffMatch =
        appliedFilters.assignees.length === 0 ||
        appliedFilters.assignees.includes(staff.id);

      // You can add more filter conditions here if needed
      // For example, if you have a "creators" filter:
      // const creatorMatch = appliedFilters.creators.length === 0 || ...

      return staffMatch;
    });
  }, [searchFilteredData, appliedFilters]);

  // Calculate stats from filtered data - UPDATED to use filteredData
  const stats = useMemo(() => {
    const totalOverdue = filteredData.reduce(
      (acc, staff) => acc + staff.overdue,
      0,
    );
    const totalPending = filteredData.reduce(
      (acc, staff) => acc + staff.pending,
      0,
    );
    const totalInProgress = filteredData.reduce(
      (acc, staff) => acc + staff.inProgress,
      0,
    );
    const totalInTime = filteredData.reduce((acc, staff) => {
      const inTime =
        staff.totalTasks - (staff.overdue + staff.pending + staff.inProgress);
      return acc + inTime;
    }, 0);
    const totalDelayed = Math.floor(totalOverdue * 0.17);

    return [
      {
        label: 'Overdue',
        count: totalOverdue,
        detail: '+2 from yesterday',
        icon: <InfoIcon className="w-5 h-5 text-red-600" />,
        color: 'text-gray-600',
        iconBg: 'bg-red-100',
      },
      {
        label: 'Pending',
        count: totalPending,
        icon: <Clock className="w-5 h-5 text-gray-600" />,
        color: 'text-gray-600',
        iconBg: 'bg-gray-100',
      },
      {
        label: 'In-Progress',
        count: totalInProgress,
        icon: <Hourglass className="w-5 h-5 text-yellow-600" />,
        color: 'text-gray-600',
        iconBg: 'bg-yellow-50',
      },
      {
        label: 'In-Time',
        count: totalInTime,
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        color: 'text-gray-600',
        iconBg: 'bg-green-100',
      },
      {
        label: 'Delayed',
        count: totalDelayed,
        icon: <AlarmClock className="w-5 h-5 text-orange-600" />,
        color: 'text-gray-600',
        iconBg: 'bg-orange-100',
      },
    ];
  }, [filteredData]);

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 48,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Staff Member" column={column} />
        ),

        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs',
                getPerformanceColor(row.original.performanceScore),
              )}
            >
              {row.original.performanceScore}%
            </div>
            <div className="flex flex-col gap-1">
              <span className="leading-none font-medium text-sm hover:text-primary">
                {row.original.name}
              </span>
              <span className="text-xs text-muted-foreground font-normal leading-3">
                {row.original.role}
              </span>
            </div>
          </div>
        ),

        enableSorting: true,
        size: 280,
        meta: {
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-[125px]" />
                <Skeleton className="h-2.5 w-[90px]" />
              </div>
            </div>
          ),
        },
      },
      {
        id: 'totalTasks',
        accessorFn: (row) => row.totalTasks,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total Tasks" column={column} />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.totalTasks}</span>
        ),

        enableSorting: true,
        size: 120,
        meta: {
          skeleton: <Skeleton className="h-5 w-[40px]" />,
        },
      },
      {
        id: 'performanceScore',
        accessorFn: (row) => row.performanceScore,
        header: ({ column }) => (
          <DataGridColumnHeader title="Performance Score" column={column} />
        ),

        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.performanceScore}%
          </span>
        ),

        enableSorting: true,
        size: 160,
        meta: {
          skeleton: <Skeleton className="h-5 w-[50px]" />,
        },
      },
      {
        id: 'overdue',
        accessorFn: (row) => row.overdue,
        header: ({ column }) => (
          <DataGridColumnHeader title="Overdue" column={column} />
        ),

        cell: ({ row }) => (
          <span className="text-red-600 font-medium">
            {String(row.original.overdue).padStart(2, '0')}
          </span>
        ),

        enableSorting: true,
        size: 100,
        meta: {
          skeleton: <Skeleton className="h-5 w-[30px]" />,
        },
      },
      {
        id: 'pending',
        accessorFn: (row) => row.pending,
        header: ({ column }) => (
          <DataGridColumnHeader title="Pending" column={column} />
        ),

        cell: ({ row }) => (
          <span className="text-gray-600 font-medium">
            {String(row.original.pending).padStart(2, '0')}
          </span>
        ),

        enableSorting: true,
        size: 100,
        meta: {
          skeleton: <Skeleton className="h-5 w-[30px]" />,
        },
      },
      {
        id: 'inProgress',
        accessorFn: (row) => row.inProgress,
        header: ({ column }) => (
          <DataGridColumnHeader title="In Progress" column={column} />
        ),

        cell: ({ row }) => (
          <span className="text-yellow-600 font-medium">
            {String(row.original.inProgress).padStart(2, '0')}
          </span>
        ),

        enableSorting: true,
        size: 120,
        meta: {
          skeleton: <Skeleton className="h-5 w-[30px]" />,
        },
      },
      {
        id: 'actions',
        header: () => <span>Actions</span>,
        cell: ({ row }) => (
          <Button
            mode="icon"
            variant="ghost"
            size="sm"
            onClick={() => handleViewStaff(row.original)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        ),
        enableSorting: false,
        size: 80,
        meta: {
          skeleton: <Skeleton className="h-8 w-8 rounded" />,
        },
      },
    ],
    [handleViewStaff],
  );

  const table = useReactTable({
    columns,
    data: filteredData, // UPDATED to use filteredData
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row) => String(row.id),
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Check if we have active filters - NEW
  const hasActiveFilters =
    appliedFilters &&
    (appliedFilters.assignees.length > 0 || appliedFilters.creators.length > 0);

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Greeting Section */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={cn('rounded-xl p-5 shadow-sm', stat.color)}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                  stat.iconBg,
                )}
              >
                {stat.icon}
              </div>

              <div className="text-sm font-medium mb-1">{stat.label}</div>
              <div className="flex gap-3">
                <div className="text-2xl font-bold">
                  {String(stat.count).padStart(2, '0')}
                </div>
                {stat.detail && (
                  <div className="text-sm text-red-700 mt-2 opacity-75">
                    {stat.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Staff Productivity Table */}
        <DataGrid
          table={table}
          recordCount={filteredData?.length || 0}
          tableLayout={{
            columnsPinnable: true,
            columnsMovable: true,
            columnsVisibility: true,
            cellBorder: true,
          }}
        >
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Staff Productivity Table</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Performance metrics across all active staff
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* FILTER POPOVER - NEW */}
                  <FilterPopover
                    onApplyFilter={handleApplyFilter}
                    appliedFilters={appliedFilters}
                  />

                  <Button variant="outline" size="md">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* ACTIVE FILTERS DISPLAY - NEW */}
              {hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    Active filters:
                  </span>
                  {appliedFilters.assignees.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                      <span className="font-medium">Staff:</span>
                      <span>{appliedFilters.assignees.length}</span>
                    </div>
                  )}
                  {appliedFilters.creators.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                      <span className="font-medium">Creators:</span>
                      <span>{appliedFilters.creators.length}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAppliedFilters(null)}
                    className="h-7 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear all filters
                  </Button>
                </div>
              )}

              <CardToolbar className="relative mt-4">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search team member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-64"
                />

                {searchQuery.length > 0 && (
                  <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X />
                  </Button>
                )}
              </CardToolbar>
            </CardHeader>
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </main>

      {/* Staff Analytics Modal */}
      <AddMember  
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        staffData={selectedStaff}
      />
    </div>
  );
};

export default Dashboard;
