import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  LayoutDashboard,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddTask from '../../../../partials/modal/add-task/AddTask'; // Your AddTask modal component

import SelectionModal from '../../../../partials/modal/selection-modal/SelectionModal';
import TaskColumn from './TaskColumn';

const TaskBoard = ({ tasks: initialTasks }) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal states
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const navigate = useNavigate();

  const handleDragStart = (task, columnId) => {
    setDraggedTask(task);
    setDraggedFrom(columnId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Map column IDs to their status values
  const getStatusForColumn = (columnId) => {
    const statusMap = {
      pending: 'Overdue',
      inProgress: 'Running',
      underReview: 'Under Review',
      done: 'Done',
    };
    return statusMap[columnId] || '';
  };

  const handleDrop = (columnId) => {
    if (!draggedTask || !draggedFrom) return;

    // If dropped in the same column, do nothing
    if (draggedFrom === columnId) {
      setDraggedTask(null);
      setDraggedFrom(null);
      return;
    }

    // Update the task's status based on the new column
    const updatedTask = {
      ...draggedTask,
      status: getStatusForColumn(columnId),
    };

    const updatedTasks = { ...tasks };

    // Remove from old column
    updatedTasks[draggedFrom] = updatedTasks[draggedFrom].filter(
      (t) => t.id !== draggedTask.id,
    );

    // Add to new column with updated status
    updatedTasks[columnId] = [...updatedTasks[columnId], updatedTask];

    setTasks(updatedTasks);
    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const handleAddTask = (columnId) => {
    // Open workflow selection modal
    setIsWorkflowModalOpen(true);
  };

  // Handle workflow selection
  const handleWorkflowContinue = (selectedOption) => {
    // Close workflow modal
    setIsWorkflowModalOpen(false);

    // Open appropriate modal based on selection
    if (selectedOption === 'manual') {
      // Open manual task creation modal
      setIsAddTaskOpen(true);
    } else if (selectedOption === 'predefined') {
      // Navigate to predefined pipeline
      navigate('/');
    }
  };

  const columns = [
    {
      id: 'pending',
      title: 'Pending Tasks',
      count: tasks.pending?.length || 0,
      status: 'Overdue',
      tasks: tasks.pending || [],
      color: 'bg-red-100 text-red-700',
      headerColor: 'bg-gradient-to-r from-red-50 to-red-100',
      dotColor: 'bg-red-500',
      showAddButton: true,
    },
    {
      id: 'inProgress',
      title: 'In Progress Tasks',
      count: tasks.inProgress?.length || 0,
      status: 'Running',
      tasks: tasks.inProgress || [],
      color: 'bg-blue-100 text-blue-700',
      headerColor: 'bg-gradient-to-r from-blue-50 to-blue-100',
      dotColor: 'bg-blue-500',
      showAddButton: false,
    },
    {
      id: 'underReview',
      title: 'Under Review',
      count: tasks.underReview?.length || 0,
      status: 'Under Review',
      tasks: tasks.underReview || [],
      color: 'bg-yellow-100 text-yellow-700',
      headerColor: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
      dotColor: 'bg-yellow-500',
      showAddButton: false,
    },
    {
      id: 'done',
      title: 'Done',
      count: tasks.done?.length || 0,
      status: 'Done',
      tasks: tasks.done || [],
      color: 'bg-green-100 text-green-700',
      headerColor: 'bg-gradient-to-r from-green-50 to-green-100',
      dotColor: 'bg-green-500',
      showAddButton: false,
    },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Enhanced Toolbar */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left Section - Tab Buttons */}

              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                  size="md"
                  onClick={() => {
                    setActiveTab('dashboard');
                    navigate('/');
                  }}
                  className={
                    activeTab === 'dashboard'
                      ? 'bg-primary shadow-md text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>

                <Button
                  variant={activeTab === 'pipeline' ? 'default' : 'outline'}
                  onClick={()=> {
                    setActiveTab('pipeline')
                    navigate('/createpipeline');
                  }}
                  size="md"
                  className={
                    activeTab === 'pipeline'
                      ? 'bg-primary shadow-md text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Pipeline Over View
                </Button>

                <Button
                  variant={activeTab === 'performance' ? 'default' : 'outline'}
                  size="md"
                  onClick={() => {
                    setActiveTab('performance');
                    navigate('/');
                  }}
                  className={
                    activeTab === 'performance'
                      ? 'bg-primary shadow-md text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }
                >
                  <Users className="w-4 h-4 mr-2" />
                  Team Performance
                </Button>
              </div>
              {/* Right Section */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-9 w-64 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsWorkflowModalOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board - Responsive Grid Layout */}
        <div className="p-6 bg-white via-white to-gray-50">
          {/* Responsive grid that shrinks like CardProject */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {columns.map((column) => (
              <div
                key={column.id}
                className="transition-all duration-300 hover:scale-[1.01]"
              >
                <TaskColumn
                  columnId={column.id}
                  title={column.title}
                  count={column.count}
                  tasks={column.tasks}
                  color={column.color}
                  status={column.status}
                  headerColor={column.headerColor}
                  dotColor={column.dotColor}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onAddTask={handleAddTask}
                  showAddButton={column.showAddButton}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Selection Modal - Opens first */}
      <SelectionModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        onContinue={handleWorkflowContinue}
      />

      {/* Manual Task Creation Modal */}
      <AddTask isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} />
    </>
  );
};

export default TaskBoard;
