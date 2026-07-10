import React from 'react';
import { Breadcrumb } from '@/layouts/demo1/components/breadcrumb';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardList,
} from 'lucide-react';
import HeroSection from './components/HeroSection';
import StatsCard from './components/StatsCard';
import TaskBoard from './components/TaskBoard';

const TaskViewDashboard = () => {
  // Mock data - replace with your actual data
  const tasks = {
    pending: [
      {
        id: 1,
        title: 'Ice Sculpture Delivery',
        priority: 'high',
        status: 'running',
        categories: ['Design'],
        assignee: {
          group: [{ filename: '300-1.png' }, { filename: '300-2.png' }],
        },
        comments: 2,
        attachments: 1,
        subtasks: 3,
        dueDate: '2 Days Ago',
      },
      {
        id: 2,
        title: 'Staff Briefing',
        priority: 'medium',
        status: 'overdue',
        categories: [],
        assignee: {
          group: [{ filename: '300-3.png' }, { filename: '300-4.png' }],
        },
        comments: 1,
        attachments: 2,
        subtasks: 1,
        dueDate: '1 Day Ago',
      },
      // Add more tasks...
    ],
    inProgress: [
      {
        id: 3,
        title: 'Model Answer',
        priority: 'low',
        status: 'under-review',
        categories: ['Testing'],
        assignee: {
          group: [{ filename: '300-5.png' }],
        },
        comments: 0,
        attachments: 1,
        subtasks: 2,
        dueDate: '5 Days Ago',
      },
      // Add more tasks...
    ],
    underReview: [
      {
        id: 4,
        title: 'Model Answer',
        priority: 'high',
        status: 'done',
        categories: ['In-Progress'],
        assignee: {
          group: [{ filename: '300-6.png' }],
        },
        comments: 2,
        attachments: 0,
        subtasks: 4,
        dueDate: '7 Days Ago',
      },
      // Add more tasks...
    ],
    done: [
      {
        id: 5,
        title: 'Model Answer',
        priority: 'low',
        status: 'overdue',
        categories: [],
        assignee: {
          group: [{ filename: '300-7.png' }],
        },
        comments: 2,
        attachments: 2,
        subtasks: 4,
        dueDate: '2021 Oct',
      },
      // Add more tasks...
    ],
  };

  return (
    <div className="h-full w-full overflow-x-hidden flex flex-col min-w-0">
      <div className="flex flex-col min-w-0 p-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Hero Section */}
        <HeroSection />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={ClipboardList}
            count="178+"
            label="Total Tasks"
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatsCard
            icon={Calendar}
            count="20+"
            label="Today Task"
            iconBgColor="bg-yellow-50"
            iconColor="text-yellow-600"
          />
          <StatsCard
            icon={AlertCircle}
            count="190+"
            label="Overdue Tasks"
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
          <StatsCard
            icon={CheckCircle}
            count="12+"
            label="Complete Tasks"
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
        </div>

        {/* Task Board - Will handle its own horizontal scroll */}
        <div className="relative -mx-6 overflow-x-hidden">
          <div className="mx-6">
            <TaskBoard tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskViewDashboard;
