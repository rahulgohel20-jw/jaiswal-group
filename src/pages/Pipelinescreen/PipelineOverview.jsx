import React, { useState } from 'react';
import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Download,
  Filter,
  Package,
} from 'lucide-react';
import FilterPopover from '../../components/ui/FilterPopover';

export default function PipelineOverview() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});

  const handleTaskCheck = (taskId) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const pipelineData = {
    preEvent: {
      title: 'PRE-EVENT PHASE',
      progress: 65,
      color: 'blue',
      icon: ClipboardCheck,
      sections: [
        {
          name: 'Planning & Design',
          tasks: [
            {
              id: 'menu-selection',
              title: 'Finalize seasonal menu selection',
              assignee: 'Assigned: Head Chef Mateo',
              priority: 'LOW',
              status: 'SCHEDULED',
            },
            {
              id: 'dietary-audit',
              title: 'Client dietary restriction audit',
              assignee: 'Emily Baker',
              priority: 'HIGH',
              status: 'IN_PROGRESS',
            },
          ],
        },
        {
          name: 'Procurement',
          tasks: [
            {
              id: 'seafood-order',
              title: 'Order sustainable seafood batch',
              assignee: 'Supplier: SeaHQ Fresh',
              priority: 'MED',
              status: 'SCHEDULED',
            },
            {
              id: 'rental-confirm',
              title: 'Rental equipment confirmation (Glassware)',
              assignee: 'Davis Rentals Co.',
              priority: 'MED',
              status: 'SCHEDULED',
            },
          ],
        },
        {
          name: 'Kitchen Prep',
          tasks: [
            {
              id: 'herb-marinade',
              title: 'Herb marinade batch 04 (Steak)',
              assignee: 'Manager: Giovanni R',
              priority: 'LOW',
              status: 'SCHEDULED',
            },
          ],
        },
      ],
    },
    eventDay: {
      title: 'EVENT-DAY PHASE',
      progress: 10,
      color: 'orange',
      icon: Calendar,
      sections: [
        {
          name: 'Before Service',
          tasks: [
            {
              id: 'venue-setup',
              title: 'Venue load-in & station setup',
              assignee: 'Location: Grand Hall',
              priority: 'URGENT',
              status: 'PENDING',
            },
            {
              id: 'staff-briefing',
              title: 'Staff briefing (Floor Protocol)',
              assignee: '4:30 PM - Ballroom',
              priority: 'MED',
              status: 'SCHEDULED',
            },
          ],
        },
        {
          name: 'Logistics Return',
          tasks: [
            {
              id: 'hors-doeuvres',
              title: "Hors d'oeuvres passing (Rounds 1-3)",
              assignee: 'Starts: 6:30 PM',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
            {
              id: 'plating-coord',
              title: 'Main course plating coordination',
              assignee: 'Kitchen: Gold Room',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
          ],
        },
      ],
    },
    postEvent: {
      title: 'POST-EVENT PHASE',
      progress: 0,
      color: 'gray',
      icon: Package,
      sections: [
        {
          name: 'Wrap-Up & Cleaning',
          tasks: [
            {
              id: 'station-strike',
              title: 'Station strike & site cleanup',
              assignee: 'Post-Midnight',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
            {
              id: 'leftover-storage',
              title: 'Leftover food storage/disposal protocol',
              assignee: 'Facility: Kitchen',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
          ],
        },
        {
          name: 'Logistics Return',
          tasks: [
            {
              id: 'equipment-inventory',
              title: 'Equipment inventory & breakage report',
              assignee: 'Next Day',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
          ],
        },
        {
          name: 'Admin & Billing',
          tasks: [
            {
              id: 'invoice-gen',
              title: 'Final invoice generation',
              assignee: 'Finance Dept',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
            {
              id: 'feedback-survey',
              title: 'Client feedback survey send-out',
              assignee: 'Via Email',
              priority: 'SCHEDULED',
              status: 'SCHEDULED',
            },
          ],
        },
      ],
    },
  };

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: 'bg-red-50 text-red-700 border-red-200',
      HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
      MED: 'bg-amber-50 text-amber-700 border-amber-200',
      LOW: 'bg-slate-100 text-slate-600 border-slate-200',
      SCHEDULED: 'bg-slate-50 text-slate-500 border-slate-200',
    };
    return colors[priority] || colors.SCHEDULED;
  };

  const getPhaseColor = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        progress: 'bg-blue-500',
        accent: 'bg-blue-100',
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        progress: 'bg-orange-500',
        accent: 'bg-orange-100',
      },
      gray: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        progress: 'bg-slate-400',
        accent: 'bg-slate-100',
      },
    };
    return colors[color];
  };

  const PhaseCard = ({ phase, data }) => {
    const colors = getPhaseColor(data.color);
    const Icon = data.icon;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className={`${colors.bg} ${colors.border} border-b px-5 py-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${colors.text}`} />
              <h3 className={`text-xs font-bold tracking-wide ${colors.text}`}>
                {data.title}
              </h3>
            </div>
            <div className={`${colors.accent} px-3 py-1 rounded-full`}>
              <span className={`text-xs font-semibold ${colors.text}`}>
                {data.progress}% Complete
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.progress} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${data.progress}%` }}
            />
          </div>
        </div>

        <div className="p-5 space-y-5">
          {data.sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className={`w-1 h-4 ${colors.progress} rounded-full`} />
                <h4 className="text-sm font-bold text-slate-700">
                  {section.name}
                </h4>
              </div>

              <div className="space-y-2.5">
                {section.tasks.map((task, taskIdx) => (
                  <div
                    key={taskIdx}
                    className="group bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg p-3.5 transition-all duration-200 hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-start pt-0.5">
                        <input
                          type="checkbox"
                          checked={checkedTasks[task.id] || false}
                          onChange={() => handleTaskCheck(task.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium text-slate-900 mb-1 line-clamp-1 transition-all ${
                              checkedTasks[task.id]
                                ? 'line-through text-slate-400'
                                : ''
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {task.assignee}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  Catering Pipeline Overview
                </h3>
                <p className="text-slate-600 text-sm font-medium">
                  Full lifecycle management for the Catering pipeline overview
                </p>
              </div>
              <div className="flex items-center gap-3">
                <FilterPopover />
                <button className="flex items-center gap-2 px-4 py-1.5  border border-gray-400 rounded-lg hover:bg-slate-800 transition-all duration-200 hover:shadow-lg group">
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Export</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 hover:shadow-lg group">
                  Create New Pipeline
                </button>
              </div>
            </div>
          </div>

          {/* Pipeline Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PhaseCard phase="preEvent" data={pipelineData.preEvent} />
            <PhaseCard phase="eventDay" data={pipelineData.eventDay} />
            <PhaseCard phase="postEvent" data={pipelineData.postEvent} />
          </div>

          {/* Stats Footer */}
          <div className="mt-8 bg-white rounded-lg px-6 py-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-600">
                    3 High Priority
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-600">12 Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-slate-600">24 Completed</span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Last update: 14 mins. ago by Alex P.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
