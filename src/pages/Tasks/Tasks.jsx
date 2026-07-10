'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  LayoutList,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import FilterPopover from '../../components/ui/FilterPopover';
import AddTask from '../../partials/modal/add-task/AddTask';
import SelectionModal from '../../partials/modal/selection-modal/SelectionModal';
import TaskDetails from './TaskDetails';

const taskData = [
  {
    id: 'AH65-T29',
    project_title: 'Website Redesign',
    title: 'Daily Social Media Work',
    status: 'Ongoing',
    team: 'IT Department',
    assignee: {
      id: 7,
      name: 'Sarah',
      avatar: '/media/avatars/300-1.png',
    },
    dueDate: '12 Feb, 2026',
    priority: 'High',
    createdOn: '13-01-2026',
    createdBy: {
      id: 8,
      name: 'Manan',
      avatar: '/media/avatars/300-4.png',
    },
    description:
      'All profiles reels and posts work, which is to be done at the end of the day',
  },
  {
    id: 'AH65-T30',
    project_title: 'Mobile App Development',
    title: 'Fix Login Bug',
    status: 'Ongoing',
    team: 'Development Team',
    assignee: {
      id: 1,
      name: 'Sahil Solanki',
      avatar: '/media/avatars/300-2.png',
    },
    dueDate: '10 Feb, 2026',
    priority: 'Medium',
    createdOn: '05 Jan, 2026',
    createdBy: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-4.png',
    },
    description: 'Fix the authentication issue in the login module',
  },
  {
    id: 'AH65-T31',
    project_title: 'Mobile App Development',
    title: 'Update Dashboard UI',
    status: 'Pending',
    team: 'Development Team',
    assignee: {
      id: 3,
      name: 'John Doe',
      avatar: '/media/avatars/300-3.png',
    },
    dueDate: '10 Feb, 2026',
    priority: 'Low',
    createdOn: '05 Jan, 2026',
    createdBy: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-4.png',
    },
    description: 'Redesign the dashboard with new components',
  },
  {
    id: 'AH65-T32',
    project_title: 'E-commerce Platform',
    title: 'Payment Gateway Integration',
    status: 'Completed',
    team: 'Backend Developer',
    assignee: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-4.png',
    },
    dueDate: '10 Feb, 2026',
    priority: 'High',
    createdOn: '05 Jan, 2026',
    createdBy: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-4.png',
    },
    description: 'Integrate Stripe payment gateway',
  },

  {
    id: 'AH65-T36',
    project_title: 'Old Project',
    title: 'Legacy Code Cleanup',
    status: 'Trashed',
    team: 'Development Team',
    assignee: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-8.png',
    },
    dueDate: '10 Feb, 2026',
    priority: 'Low',
    createdOn: '05 Jan, 2026',
    createdBy: {
      id: 2,
      name: 'Rahul',
      avatar: '/media/avatars/300-4.png',
    },
    description: 'Remove unused code from legacy systems',
  },
];

const StatusBadge = ({ status }) => {
  const statusStyles = {
    Pending: 'border-yellow-400 text-yellow-600 bg-yellow-50',
    Ongoing: 'border-orange-400 text-orange-500 bg-orange-50',
    Completed: 'border-green-500 text-green-600 bg-green-50',
    Trashed: 'border-red-400 text-red-500 bg-red-50',
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-medium ${
        statusStyles[status] || 'border-gray-300 text-gray-500'
      }`}
    >
      {status}
    </span>
  );
};

const AssigneeCell = ({ user }) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={user.avatar}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover"
      />
      <span className="text-sm font-medium text-foreground">{user.name}</span>
    </div>
  );
};

const CreateByCell = ({ user }) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={user.avatar}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover"
      />
      <span className="text-sm font-medium text-foreground">{user.name}</span>
    </div>
  );
};

// Kanban Board Column Component
const KanbanColumn = ({ title, tasks, count, onAddTask }) => {
  return (
    <div className="flex-shrink-0 w-96 bg-gray-50/50 rounded-lg border border-gray-200">
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="text-base font-semibold text-gray-700">
          {title} <span className="text-gray-400 font-normal">{count}</span>
        </h3>
      </div>

      <div className="p-4 space-y-3 min-h-[500px]">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="w-16 h-12 bg-gray-200 rounded"></div>
            </div>
            <p className="text-sm text-gray-400">No tasks</p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onAddTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
    </div>
  );
};

// Task Card for Kanban View
const TaskCard = ({ task }) => {
  return (
    <Fragment>
      <Container>
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600">
                  {task.id}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <h4 className="font-medium text-sm mb-1">{task.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                {task.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="h-6 w-6 rounded-full"
              />
              <span className="text-xs text-gray-600">
                {task.assignee.name}
              </span>
            </div>
            <span className="text-xs text-gray-500">{task.dueDate}</span>
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

// Calendar View Component
const CalendarView = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // February 2026

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const getTasksForDay = (day) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === currentDate.getMonth() &&
        taskDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayTasks = getTasksForDay(day);

            return (
              <div
                key={day}
                className="aspect-square border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
              >
                <div className="text-sm font-medium mb-1">{day}</div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate"
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function Tasks() {
  const [activeTab, setActiveTab] = useState('Today');
  const [viewType, setViewType] = useState('list'); // 'list', 'board', 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('team'); // 'team', 'status', 'assignee'

  // Modal states
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState(null);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTask = (task) => {
    console.log('Edit task', task);
  };

  const handleDeleteTask = (taskId) => {
    console.log('Delete task', taskId);
  };

  const handleWorkflowContinue = (selectedOption) => {
    setIsWorkflowModalOpen(false);
    if (selectedOption === 'manual') {
      setIsAddTaskOpen(true);
    }
  };

  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
  };

  // Filter tasks based on search and filters
  const filteredData = useMemo(() => {
    let filtered = taskData;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.team.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply filters
    if (appliedFilters) {
      filtered = filtered.filter((task) => {
        const assigneeMatch =
          appliedFilters.assignees.length === 0 ||
          appliedFilters.assignees.includes(task.assignee.id);

        const creatorMatch =
          appliedFilters.creators.length === 0 ||
          appliedFilters.creators.includes(task.createdBy.id);

        return assigneeMatch && creatorMatch;
      });
    }

    return filtered;
  }, [searchQuery, appliedFilters]);

  // Group tasks for board view
  const groupedTasks = useMemo(() => {
    const groups = {};

    if (groupBy === 'team') {
      filteredData.forEach((task) => {
        if (!groups[task.team]) {
          groups[task.team] = [];
        }
        groups[task.team].push(task);
      });
    } else if (groupBy === 'status') {
      filteredData.forEach((task) => {
        if (!groups[task.status]) {
          groups[task.status] = [];
        }
        groups[task.status].push(task);
      });
    }

    return groups;
  }, [filteredData, groupBy]);

  const columns = [
    {
      id: 'project_title',
      accessorFn: (row) => row.project_title,
      header: ({ column }) => (
        <DataGridColumnHeader title="Project Title" column={column} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.project_title}</span>
      ),
    },
    {
      id: 'title',
      accessorFn: (row) => row.title,
      header: ({ column }) => (
        <DataGridColumnHeader title="Task Name" column={column} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: 'assignee',
      accessorFn: (row) => row.assignee,
      header: ({ column }) => (
        <DataGridColumnHeader title="Assigned To" column={column} />
      ),
      cell: ({ row }) => <AssigneeCell user={row.original.assignee} />,
    },
    {
      id: 'team',
      accessorFn: (row) => row.team,
      header: ({ column }) => (
        <DataGridColumnHeader title="Team" column={column} />
      ),
      cell: ({ row }) => row.original.team,
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
      cell: ({ row }) => row.original.priority,
    },
    {
      id: 'createdOn',
      accessorFn: (row) => row.createdOn,
      header: ({ column }) => (
        <DataGridColumnHeader title="Created on" column={column} />
      ),
      cell: ({ row }) => row.original.createdOn,
    },
    {
      id: 'dueDate',
      accessorFn: (row) => row.dueDate,
      header: ({ column }) => (
        <DataGridColumnHeader title="Due Date" column={column} />
      ),
      cell: ({ row }) => row.original.dueDate,
    },
    {
      id: 'createdBy',
      accessorFn: (row) => row.createdBy,
      header: ({ column }) => (
        <DataGridColumnHeader title="Created by" column={column} />
      ),
      cell: ({ row }) => <CreateByCell user={row.original.createdBy} />,
    },
    {
      id: 'actions',
      header: () => <span>Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewTask(row.original)}
            title="View Task"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditTask(row.original)}
            title="Edit Task"
          >
            <SquarePen className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteTask(row.original.id)}
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
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

  const taskTabs = [
    "Today's Tasks",
    'Ongoing',
    'Overdue',
    'Scheduled',
    'Complete',
    'Review',
    'Ongoing With Issue',
    'Trashed',
  ];

  const hasActiveFilters =
    appliedFilters &&
    (appliedFilters.assignees.length > 0 || appliedFilters.creators.length > 0);

  return (
    <Fragment>
      <Container>
        <div className="mb-6 flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewType('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewType('board')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'board'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>
        </div>

        {viewType === 'list' && (
          <div className="mb-4 border-b">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-6">
                {taskTabs.map((tab) => {
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
                <FilterPopover
                  onApplyFilter={handleApplyFilter}
                  appliedFilters={appliedFilters}
                />

                <Button
                  variant="ghost"
                  size="md"
                  className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="bg-[#005BA8] gap-2 text-white hover:bg-[#005BA8]/90"
                  onClick={() => setIsWorkflowModalOpen(true)}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        )}

        {viewType === 'board' && (
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
            </div>

            <div className="flex items-center gap-2">
              <FilterPopover
                onApplyFilter={handleApplyFilter}
                appliedFilters={appliedFilters}
              />
              <Button
                variant="ghost"
                size="lg"
                className="bg-[#005BA8] gap-2 text-white hover:bg-[#005BA8]/90"
                onClick={() => setIsWorkflowModalOpen(true)}
              >
                Create Task
              </Button>
            </div>
          </div>
        )}

        {/* Calendar view controls */}
        {viewType === 'calendar' && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <FilterPopover
              onApplyFilter={handleApplyFilter}
              appliedFilters={appliedFilters}
            />
            <Button
              variant="ghost"
              size="lg"
              className="bg-[#005BA8] gap-2 text-white hover:bg-[#005BA8]/90"
              onClick={() => setIsWorkflowModalOpen(true)}
            >
              Create Task
            </Button>
          </div>
        )}

        {/* ACTIVE FILTERS DISPLAY */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {appliedFilters.assignees.length > 0 && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                <span className="font-medium">Assignees:</span>
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

        {viewType === 'list' && (
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

        {/* BOARD VIEW */}
        {viewType === 'board' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
              {Object.entries(groupedTasks).map(([groupName, tasks]) => (
                <KanbanColumn
                  key={groupName}
                  title={groupName}
                  tasks={tasks}
                  count={tasks.length}
                  onAddTask={() => setIsWorkflowModalOpen(true)}
                />
              ))}
            </div>
          </div>
        )}

        {viewType === 'calendar' && <CalendarView tasks={filteredData} />}
      </Container>

      <SelectionModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        onContinue={handleWorkflowContinue}
      />

      <AddTask isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} />

      <TaskDetails
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </Fragment>
  );
}
