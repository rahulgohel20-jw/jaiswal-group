'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar as CalendarIcon,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  SquarePen,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SidebarModal from '@/components/ui/sidebar';
import { Container } from '@/components/common/container';
import AddIssue from '../../partials/modal/add-issues/AddIssue';
import IssueDetails from './IssueDetails';
import IssueSidebar from './IssueSidebar';

const issueData = [
  {
    id: 1,
    issueName: 'task issue',
    assignedTo: {
      id: 1,
      name: 'Aarya Kansara',
      avatar: '/media/avatars/300-1.png',
    },
    team: 'IT Department',
    status: 'Resolved',
    priority: 'Medium',
    startDate: '04-02-2026, 01:40 PM',
    created: {
      id: 2,
      name: 'Aar',
      avatar: '/media/avatars/300-2.png',
    },
  },
  {
    id: 2,
    issueName: 'working on Dhanraj',
    assignedTo: {
      id: 1,
      name: 'Aarya Kansara',
      avatar: '/media/avatars/300-1.png',
    },
    team: 'IT Department',
    status: 'Resolved',
    priority: 'Low',
    startDate: '22-01-2026, 04:20 PM',
    created: {
      id: 2,
      name: 'Aar',
      avatar: '/media/avatars/300-2.png',
    },
  },
  {
    id: 3,
    issueName: 'one task added that why reopen',
    assignedTo: {
      id: 1,
      name: 'Aarya Kansara',
      avatar: '/media/avatars/300-1.png',
    },
    team: 'IT Department',
    status: 'Resolved',
    priority: 'Low',
    startDate: '22-01-2026, 11:52 AM',
    created: {
      id: 2,
      name: 'Aar',
      avatar: '/media/avatars/300-2.png',
    },
  },
  {
    id: 4,
    issueName: 'teblet vali Seystam ma biji hato /',
    assignedTo: [
      {
        id: 3,
        name: 'User 1',
        avatar: '/media/avatars/300-3.png',
      },
      {
        id: 4,
        name: 'User 2',
        avatar: '/media/avatars/300-4.png',
      },
    ],
    team: 'IT Department',
    status: 'Open',
    priority: 'Low',
    startDate: '22-01-2026, 11:35 AM',
    created: {
      id: 5,
      name: 'Dig',
      avatar: '/media/avatars/300-5.png',
    },
  },
  {
    id: 5,
    issueName: 'menu report',
    assignedTo: {
      id: 6,
      name: 'Chirag Koshti',
      avatar: '/media/avatars/300-6.png',
    },
    team: 'IT Department',
    status: 'Open',
    priority: 'Low',
    startDate: '21-01-2026, 06:37 PM',
    created: {
      id: 7,
      name: 'Aay',
      avatar: '/media/avatars/300-7.png',
    },
  },
  {
    id: 6,
    issueName: 'Menu Report',
    assignedTo: {
      id: 6,
      name: 'Chirag Koshti',
      avatar: '/media/avatars/300-6.png',
    },
    team: 'IT Department',
    status: 'Open',
    priority: 'Low',
    startDate: '21-01-2026, 06:37 PM',
    created: {
      id: 7,
      name: 'Aay',
      avatar: '/media/avatars/300-7.png',
    },
  },
  {
    id: 7,
    issueName: 'Menu report',
    assignedTo: {
      id: 6,
      name: 'Chirag Koshti',
      avatar: '/media/avatars/300-6.png',
    },
    team: 'IT Department',
    status: 'Open',
    priority: 'Low',
    startDate: '21-01-2026, 06:36 PM',
    created: {
      id: 7,
      name: 'Aay',
      avatar: '/media/avatars/300-7.png',
    },
  },
  {
    id: 8,
    issueName: 'Dhanraj Menu report',
    assignedTo: {
      id: 8,
      name: 'Rietsh Sharma',
      avatar: '/media/avatars/300-8.png',
    },
    team: 'IT Department',
    status: 'Resolved',
    priority: 'Low',
    startDate: '21-01-2026, 06:36 PM',
    created: {
      id: 7,
      name: 'Aay',
      avatar: '/media/avatars/300-7.png',
    },
  },
  {
    id: 9,
    issueName: 'Website Work',
    assignedTo: [
      {
        id: 9,
        name: 'User 3',
        avatar: '/media/avatars/300-9.png',
      },
      {
        id: 10,
        name: 'User 4',
        avatar: '/media/avatars/300-4.png',
      },
    ],
    team: 'IT Department',
    status: 'Resolved',
    priority: 'High',
    startDate: '20-01-2026, 01:30 PM',
    created: {
      id: 11,
      name: 'Riet',
      avatar: '/media/avatars/300-5.png',
    },
  },
];

const StatusBadge = ({ status }) => {
  const statusStyles = {
    Open: 'border-amber-400 text-amber-600 bg-amber-50',
    Resolved: 'border-emerald-400 text-emerald-600 bg-emerald-50',
    Closed: 'border-gray-400 text-gray-600 bg-gray-50',
    Ignored: 'border-red-400 text-red-600 bg-red-50',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium ${
        statusStyles[status] || 'border-gray-300 text-gray-500 bg-gray-50'
      }`}
    >
      {status}
    </span>
  );
};

const PriorityIndicator = ({ priority }) => {
  const priorityColors = {
    High: 'text-red-500',
    Medium: 'text-blue-500',
    Low: 'text-gray-400',
  };

  return (
    <div className="flex items-center justify-center">
      <span
        className={cn('text-lg', priorityColors[priority] || 'text-gray-400')}
      >
        ≡
      </span>
    </div>
  );
};

const AssignedToCell = ({ assignedTo }) => {
  // Handle both single user and multiple users
  if (Array.isArray(assignedTo)) {
    return (
      <div className="flex items-center -space-x-2">
        {assignedTo.slice(0, 2).map((user, index) => (
          <img
            key={user.id}
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
            style={{ zIndex: assignedTo.length - index }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={assignedTo.avatar}
        alt={assignedTo.name}
        className="h-8 w-8 rounded-full object-cover"
      />
      <span className="text-sm font-medium text-foreground">
        {assignedTo.name}
      </span>
    </div>
  );
};

const CreatedByCell = ({ user }) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={user.avatar}
        alt={user.name}
        className="h-8 w-8 rounded-full object-cover"
      />
      <span className="text-sm font-medium text-foreground">{user.name}</span>
    </div>
  );
};

// Board View Components
const IssueCard = ({ issue, onView, onEdit, onAssign }) => {
  const formatDate = (dateStr) => {
    const [date, time] = dateStr.split(', ');
    return { date, time };
  };

  const { date, time } = formatDate(issue.startDate);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header with ID and Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-0.5 bg-gray-400"></span>
            <span>ID #{issue.id.toString().padStart(6, '0')}</span>
          </span>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      {/* Issue Name */}
      <h3 className="font-medium text-sm text-gray-900 mb-3 line-clamp-2">
        {issue.issueName}
      </h3>

      {/* Date and Time */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          {date}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeWidth="2" d="M12 6v6l4 2" />
          </svg>
          {time}
        </span>
      </div>

      {/* Team and Assigned User */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            {issue.team}
          </span>
        </div>

        <div className="flex items-center">
          {Array.isArray(issue.assignedTo) ? (
            <div className="flex items-center -space-x-2">
              {issue.assignedTo.map((user) => (
                <div
                  key={user.id}
                  className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                >
                  {user.name.charAt(0)}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium">
              {issue.assignedTo.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BoardColumn = ({
  team,
  issues,
  count,
  onView,
  onEdit,
  onAssign,
  onAddIssue,
}) => {
  return (
    <div className="flex-shrink-0 w-96 bg-gray-50/50 rounded-lg border border-gray-200">
      {/* Column Header */}
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="text-base font-semibold text-gray-700">
          {team} <span className="text-gray-400 font-normal">{count}</span>
        </h3>
      </div>

      {/* Issues List */}
      <div className="p-4 space-y-3 min-h-[500px]">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onView={onView}
              onEdit={onEdit}
              onAssign={onAssign}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="w-16 h-12 bg-gray-200 rounded"></div>
            </div>
            <p className="text-sm text-gray-400">No issues</p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onAddIssue}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Issue
        </Button>
      </div>
    </div>
  );
};

const BoardView = ({ data, onView, onEdit, onAssign, onAddIssue }) => {
  // Group issues by team
  const groupedIssues = useMemo(() => {
    const groups = {};
    data.forEach((issue) => {
      if (!groups[issue.team]) {
        groups[issue.team] = [];
      }
      groups[issue.team].push(issue);
    });
    return groups;
  }, [data]);

  // Get all unique teams including Admin with 0 issues
  const teams = [
    'Admin',
    ...Object.keys(groupedIssues).filter((t) => t !== 'Admin'),
  ];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {teams.map((team) => (
          <BoardColumn
            key={team}
            team={team}
            issues={groupedIssues[team] || []}
            count={groupedIssues[team]?.length || 0}
            onView={onView}
            onEdit={onEdit}
            onAssign={onAssign}
            onAddIssue={onAddIssue}
          />
        ))}
      </div>
    </div>
  );
};

export function IssuesDashboard() {
  const [viewMode, setViewMode] = useState('list'); // 'list', 'board', 'calendar'
  const [activeTab, setActiveTab] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isIssueDetailOpen, setIsIssueDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('team'); // 'team', 'status'
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [issueToAssign, setIssueToAssign] = useState(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);

  const handleViewIssue = (issue) => {
    setSelectedIssue(issue);
    setIsIssueDetailOpen(true);
  };

  const handleEditIssue = (issue) => {
    console.log('Edit issue', issue);
  };

  const handleAssignUser = (issue) => {
    setIssueToAssign(issue);
    setIsAssignModalOpen(true);
  };

  const handleAssignComplete = (data) => {
    console.log('Assigned:', data);
    console.log('Issue:', issueToAssign);
    // Handle the assignment logic here
    setIsAssignModalOpen(false);
    setIssueToAssign(null);
  };

  const filteredData = useMemo(() => {
    let filtered = issueData;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (issue) =>
          issue.issueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.status.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply tab filter
    if (activeTab === 'All') return filtered;
    return filtered.filter((issue) => {
      if (activeTab === 'Open') return issue.status === 'Open';
      if (activeTab === 'Close') return issue.status === 'Resolved';
      if (activeTab === 'Ignore') return issue.status === 'Ignored';
      return true;
    });
  }, [activeTab, searchQuery]);

  const columns = [
    {
      id: 'issueName',
      accessorFn: (row) => row.issueName,
      header: ({ column }) => (
        <DataGridColumnHeader title="Issue Name" column={column} />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.issueName}</span>
      ),
    },
    {
      id: 'assignedTo',
      accessorFn: (row) => row.assignedTo,
      header: ({ column }) => (
        <DataGridColumnHeader title="Assigned to" column={column} />
      ),
      cell: ({ row }) => (
        <AssignedToCell assignedTo={row.original.assignedTo} />
      ),
    },
    {
      id: 'team',
      accessorFn: (row) => row.team,
      header: ({ column }) => (
        <DataGridColumnHeader title="Team" column={column} />
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.team}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" column={column} />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'priority',
      accessorFn: (row) => row.priority,
      header: ({ column }) => (
        <DataGridColumnHeader title="Priority" column={column} />
      ),
      cell: ({ row }) => <PriorityIndicator priority={row.original.priority} />,
    },
    {
      id: 'startDate',
      accessorFn: (row) => row.startDate,
      header: ({ column }) => (
        <DataGridColumnHeader title="Start Date" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.startDate}</span>
      ),
    },
    {
      id: 'created',
      accessorFn: (row) => row.created,
      header: ({ column }) => (
        <DataGridColumnHeader title="Created" column={column} />
      ),
      cell: ({ row }) => <CreatedByCell user={row.original.created} />,
    },
    {
      id: 'actions',
      header: () => <span>Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewIssue(row.original)}
            title="View Issue"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleEditIssue(row.original)}
            title="Edit Issue"
          >
            <SquarePen className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleAssignUser(row.original)}
            title="Assign User"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const issueTabs = ['All', 'Open', 'Close', 'Ignore'];

  const viewModes = [
    { id: 'list', icon: List, label: 'List' },
    { id: 'board', icon: LayoutGrid, label: 'Board' },
    // { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  ];

  return (
    <Fragment>
      <Container>
        {/* View Mode Tabs and Filter Tabs */}
        <div className="mb-6">
          {/* View Mode Selector */}
          <div className="mb-6 flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter Tabs - Only show in list view */}
          {viewMode === 'list' && (
            <div className="border-b">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-6">
                  {issueTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-3 text-[15px] font-normal whitespace-nowrap transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab}
                        {isActive && (
                          <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    onClick={() => setIsCreateIssueOpen(true)}
                    className="gap-2 bg-[#005BA8] hover:bg-[#005BA8]/90 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Create Issue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Board view controls */}
          {viewMode === 'board' && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search Board"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-80"
                  />
                </div>

                {/* Uncomment if you want group by selector
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Group : </span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="text-sm font-medium border-none outline-none bg-transparent"
                  >
                    <option value="team">Team</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                */}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  View
                </Button>
                <Button
                  onClick={() => setIsCreateIssueOpen(true)}
                  className="gap-2 bg-[#005BA8] hover:bg-[#005BA8]/90 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create Issue
                </Button>
              </div>
            </div>
          )}

          {/* Calendar view controls */}
          {viewMode === 'calendar' && (
            <div className="mb-4 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="md"
                className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400"
              >
                <SlidersHorizontal className="h-4 w-4" />
                View
              </Button>
              <Button
                onClick={() => setIsCreateIssueOpen(true)}
                className="gap-2 bg-[#005BA8] hover:bg-[#005BA8]/90 text-white"
              >
                <Plus className="h-4 w-4" />
                Create Issue
              </Button>
            </div>
          )}
        </div>

        {/* Conditional Rendering based on View Mode */}
        {viewMode === 'list' && (
          <DataGrid table={table} recordCount={filteredData.length}>
            <Card>
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
        )}

        {viewMode === 'board' && (
          <BoardView
            data={filteredData}
            onView={handleViewIssue}
            onEdit={handleEditIssue}
            onAssign={handleAssignUser}
            onAddIssue={() => setIsCreateIssueOpen(true)}
          />
        )}

        {/* {viewMode === 'calendar' && (
          <div className="flex items-center justify-center h-96 border rounded-lg bg-gray-50">
            <p className="text-gray-500">Calendar view coming soon...</p>
          </div>
        )} */}
      </Container>

      {/* Issue Details Modal */}
      <IssueDetails
        isOpen={isIssueDetailOpen}
        onClose={() => {
          setIsIssueDetailOpen(false);
          setSelectedIssue(null);
        }}
        issue={selectedIssue}
      />

      <SidebarModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setIssueToAssign(null);
        }}
        title="Assign Issue"
        width="lg"
      >
        <IssueSidebar
          onAssign={handleAssignComplete}
          onClose={() => {
            setIsAssignModalOpen(false);
            setIssueToAssign(null);
          }}
        />
      </SidebarModal>

      <AddIssue
        onClose={() => setIsCreateIssueOpen(false)}
        isOpen={isCreateIssueOpen}
      />
    </Fragment>
  );
}
