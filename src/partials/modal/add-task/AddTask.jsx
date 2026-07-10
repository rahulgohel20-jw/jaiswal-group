'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  Hash,
  Image,
  Image as ImageIcon,
  MapPin,
  Mic,
  Plus,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SidebarModal from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';

const AddTask = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('task');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [assignModalTab, setAssignModalTab] = useState('users');
  const [assignModalFor, setAssignModalFor] = useState('subtask'); // 'maintask' or 'subtask'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Main task form data
  const [mainTaskData, setMainTaskData] = useState({
    outlet: 'ahd',
    project: '',
    groupName: '',
    description: '',
    groupOwner: '',
    assignedUsers: [],
    assignedTeams: [],
    repeatConfig: null,
    validationType: [],
  });

  // Repeat task configuration
  const [repeatConfig, setRepeatConfig] = useState({
    frequency: 'Weekly',
    repetitionPerDay: 1,
    repeatInterval: 0,
    intervalUnit: 'Hour',
    selectedDays: [],
    selectedDates: [],
    startTime: '',
    endTime: '',
  });

  const [subTasks, setSubTasks] = useState([
    {
      id: 1,
      name: '',
      assignedUsers: [],
      assignedTeams: [],
      startDate: '2026-02-07T11:16',
      endDate: '2026-02-07T23:59',
      priority: 'None',
      description: '',
      validationType: [],
      expanded: true,
    },
  ]);

  const validationTypes = [
    { value: 'Image', icon: ImageIcon },
    { value: 'Video', icon: Video },
    { value: 'Audio', icon: Mic },
    { value: 'Text', icon: FileText },
    { value: 'Number', icon: Hash },
    { value: 'Date', icon: Calendar },
  ];

  // Mock users data
  const allUsers = [
    {
      id: 1,
      name: 'Aarya Kansara',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 2,
      name: 'Aayushi Turakhia',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 3,
      name: 'Amee Masarani',
      department: 'IT Department',
      badge: 'M',
      badgeColor: 'bg-blue-500',
    },
    {
      id: 4,
      name: 'John Smith',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 5,
      name: 'Sarah Johnson',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 6,
      name: 'Mike Brown',
      department: 'Design Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 7,
      name: 'Emily Davis',
      department: 'Design Department',
      badge: 'M',
      badgeColor: 'bg-blue-500',
    },
    {
      id: 8,
      name: 'David Wilson',
      department: 'Marketing Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
  ];

  // Mock teams data with member IDs
  const allTeams = [
    { id: 1, name: 'Development Team', memberIds: [1, 2, 3, 4, 5], members: 5 },
    { id: 2, name: 'Design Team', memberIds: [6, 7], members: 2 },
    { id: 3, name: 'Marketing Team', memberIds: [8], members: 1 },
  ];

  const weekDays = [
    { short: 'S', full: 'Sunday' },
    { short: 'M', full: 'Monday' },
    { short: 'T', full: 'Tuesday' },
    { short: 'W', full: 'Wednesday' },
    { short: 'T', full: 'Thursday' },
    { short: 'F', full: 'Friday' },
    { short: 'S', full: 'Saturday' },
  ];

  const addSubTask = () => {
    setSubTasks([
      ...subTasks,
      {
        id: subTasks.length + 1,
        name: '',
        assignedUsers: [],
        assignedTeams: [],
        startDate: '2026-02-07T11:16',
        endDate: '2026-02-07T23:59',
        priority: 'None',
        description: '',
        validationType: [],
        expanded: true,
      },
    ]);
  };

  const removeSubTask = (id) => {
    if (subTasks.length > 1) {
      setSubTasks(subTasks.filter((task) => task.id !== id));
    }
  };

  const toggleSubTask = (id) => {
    setSubTasks(
      subTasks.map((task) =>
        task.id === id ? { ...task, expanded: !task.expanded } : task,
      ),
    );
  };

  const updateSubTask = (id, field, value) => {
    setSubTasks(
      subTasks.map((task) =>
        task.id === id ? { ...task, [field]: value } : task,
      ),
    );
  };

  const toggleMainValidationType = (type) => {
    setMainTaskData((prev) => {
      const currentTypes = prev.validationType || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];

      return { ...prev, validationType: newTypes };
    });
  };

  const toggleValidationType = (taskId, type) => {
    setSubTasks(
      subTasks.map((task) => {
        if (task.id === taskId) {
          const currentTypes = task.validationType || [];
          const newTypes = currentTypes.includes(type)
            ? currentTypes.filter((t) => t !== type)
            : [...currentTypes, type];
          return { ...task, validationType: newTypes };
        }
        return task;
      }),
    );
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleTeamSelection = (teamId) => {
    const team = allTeams.find((t) => t.id === teamId);
    if (!team) return;

    setSelectedTeams((prev) => {
      const isCurrentlySelected = prev.includes(teamId);

      if (isCurrentlySelected) {
        setSelectedUsers((users) =>
          users.filter((userId) => !team.memberIds.includes(userId)),
        );
        return prev.filter((id) => id !== teamId);
      } else {
        setSelectedUsers((users) => {
          const newUsers = [...users];
          team.memberIds.forEach((memberId) => {
            if (!newUsers.includes(memberId)) {
              newUsers.push(memberId);
            }
          });
          return newUsers;
        });
        return [...prev, teamId];
      }
    });
  };

  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTeams = allTeams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const openAssignModal = (taskId = null, forMainTask = false) => {
    if (forMainTask) {
      setAssignModalFor('maintask');
      setSelectedUsers(mainTaskData.assignedUsers || []);
      setSelectedTeams(mainTaskData.assignedTeams || []);
    } else {
      setAssignModalFor('subtask');
      setCurrentTaskId(taskId);
      const task = subTasks.find((t) => t.id === taskId);
      setSelectedUsers(task?.assignedUsers || []);
      setSelectedTeams(task?.assignedTeams || []);
    }
    setShowAssignModal(true);
  };

  const handleAssign = () => {
    if (assignModalFor === 'maintask') {
      setMainTaskData({
        ...mainTaskData,
        assignedUsers: selectedUsers,
        assignedTeams: selectedTeams,
      });
    } else if (currentTaskId) {
      updateSubTask(currentTaskId, 'assignedUsers', selectedUsers);
      updateSubTask(currentTaskId, 'assignedTeams', selectedTeams);
    }
    setShowAssignModal(false);
    setSelectedUsers([]);
    setSelectedTeams([]);
    setCurrentTaskId(null);
    setSearchQuery('');
  };

  const toggleDaySelection = (dayIndex) => {
    setRepeatConfig((prev) => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayIndex)
        ? prev.selectedDays.filter((d) => d !== dayIndex)
        : [...prev.selectedDays, dayIndex],
    }));
  };

  const handleAddRepeat = () => {
    setMainTaskData({
      ...mainTaskData,
      repeatConfig: { ...repeatConfig },
    });
    setShowRepeatModal(false);
  };

  const getRepeatDisplayText = () => {
    if (!mainTaskData.repeatConfig) return 'Repeat task';
    const config = mainTaskData.repeatConfig;
    if (config.frequency === 'None') return 'Repeat task';
    return `${config.frequency} - ${config.repetitionPerDay} time${config.repetitionPerDay > 1 ? 's' : ''}/day`;
  };

  return (
    <>
      <SidebarModal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Group Task"
        width="2xl"
      >
        {/* Header options */}
        <div className="flex items-center gap-4 py-4 border-b text-sm flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-primary   rounded" />
            Save Task in Template library
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-primary   rounded" />
            Need Approval
          </label>

          <Badge className="bg-primary   hover:bg-green-700 text-white flex items-center gap-1 cursor-pointer">
            <Check className="h-3 w-3" /> Add Points
          </Badge>

          <Select>
            <SelectTrigger className="w-[140px] ml-auto">
              <SelectValue placeholder="Templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template1">Template 1</SelectItem>
              <SelectItem value="template2">Template 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 py-4 border-b">
          <Button
            onClick={() => setActiveTab('task')}
            className={
              activeTab === 'task'
                ? 'bg-primary  hover:bg-green-700 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            }
          >
            Add Task
          </Button>

          <Button
            onClick={() => setActiveTab('subtask')}
            className={
              activeTab === 'subtask'
                ? 'bg-primary  hover:bg-green-700 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            }
          >
            Add Sub Task
          </Button>
        </div>

        {/* Tab Content */}
        <div className="pb-6">
          {activeTab === 'task' ? (
            // Main Task Form
            <div className="space-y-4 pt-4">
              {/* Outlet & Project */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    Selected Outlet <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={mainTaskData.outlet}
                    onValueChange={(value) =>
                      setMainTaskData({ ...mainTaskData, outlet: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahd">ahd</SelectItem>
                      <SelectItem value="blr">blr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Add Project</label>
                  <Select
                    value={mainTaskData.project}
                    onValueChange={(value) =>
                      setMainTaskData({ ...mainTaskData, project: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project1">Project 1</SelectItem>
                      <SelectItem value="project2">Project 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Task Name */}
              <div>
                <label className="text-sm font-medium">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary ">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <Input
                    placeholder="Enter task name"
                    className="pl-10"
                    value={mainTaskData.groupName}
                    onChange={(e) =>
                      setMainTaskData({
                        ...mainTaskData,
                        groupName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Enter task description"
                  className="mt-1"
                  rows={3}
                  value={mainTaskData.description}
                  onChange={(e) =>
                    setMainTaskData({
                      ...mainTaskData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              {/* Assign User */}
              <div>
                <label className="text-sm font-medium">
                  Assign User <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => openAssignModal(null, true)}
                  className="mt-1 p-2.5 border rounded-md cursor-pointer hover:border-primary  transition-colors min-h-[42px] flex items-center"
                >
                  {mainTaskData.assignedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {mainTaskData.assignedUsers.map((userId) => {
                        const user = allUsers.find((u) => u.id === userId);
                        return (
                          <span
                            key={userId}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
                          >
                            {user?.name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Select User</span>
                  )}
                </div>
              </div>

              {/* Assign Team */}
              <div>
                <label className="text-sm font-medium">Assign Team</label>
                <div
                  onClick={() => openAssignModal(null, true)}
                  className="mt-1 p-2.5 border rounded-md cursor-pointer hover:border-primary  transition-colors min-h-[42px] flex items-center"
                >
                  {mainTaskData.assignedTeams &&
                  mainTaskData.assignedTeams.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {mainTaskData.assignedTeams.map((teamId) => {
                        const team = allTeams.find((t) => t.id === teamId);
                        return (
                          <span
                            key={teamId}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                          >
                            {team?.name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Select Team</span>
                  )}
                </div>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    Start date & time
                  </label>
                  <Input type="datetime-local" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">End date & time</label>
                  <Input type="datetime-local" className="mt-1" />
                </div>
              </div>

              {/* Repeat Task */}
              <div>
                <label className="text-sm font-medium">Repeat task</label>
                <div
                  onClick={() => setShowRepeatModal(true)}
                  className="mt-1 p-3 border rounded-md flex items-center gap-2 text-gray-500 cursor-pointer hover:border-primary  transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-sm">{getRepeatDisplayText()}</span>
                </div>
              </div>

              {/* Add SOP/Description */}
              {/* <div>
                <label className="text-sm font-medium">
                  Add SOP/ Description
                </label>
                <div className="mt-1 border rounded-md">
                  <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <Image className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <Mic className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <CheckSquare className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <svg
                        className="h-4 w-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                      <MapPin className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <Textarea
                    placeholder=""
                    className="border-0 focus-visible:ring-0 resize-none"
                    rows={3}
                  />
                </div>
              </div> */}

              {/* Select Validation Type */}
              <div>
                <label className="text-sm font-medium">
                  Select Validation Type
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validationTypes.map(({ value, icon: Icon }) => {
                    const isSelected = (
                      mainTaskData.validationType || []
                    ).includes(value);

                    return (
                      <button
                        key={value}
                        onClick={() => toggleMainValidationType(value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary  text-white border-primary '
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary  '
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="bg-primary  hover:bg-green-700">
                  Create Task
                </Button>
              </div>
            </div>
          ) : (
            // Sub-Tasks Form
            <div className="space-y-4 pt-4">
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {subTasks.map((task, index) => (
                  <div key={task.id} className="border rounded-lg">
                    {/* Subtask Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubTask(task.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              task.expanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <h4 className="font-medium">Subtask-{index + 1}</h4>
                      </div>
                      <button
                        onClick={() => removeSubTask(task.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                        disabled={subTasks.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Subtask Content */}
                    {task.expanded && (
                      <div className="p-4 space-y-4">
                        {/* Task Name */}
                        <div>
                          <label className="text-sm font-medium">
                            Task Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            placeholder="Enter task name"
                            className="mt-1"
                            value={task.name}
                            onChange={(e) =>
                              updateSubTask(task.id, 'name', e.target.value)
                            }
                          />
                        </div>

                        {/* Assign User */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">
                              Assign User{' '}
                              <span className="text-red-500">*</span>
                            </label>
                            <div
                              onClick={() => openAssignModal(task.id)}
                              className="mt-1 p-2.5 border rounded-md cursor-pointer hover:border-primary  transition-colors min-h-[42px] flex items-center"
                            >
                              {task.assignedUsers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {task.assignedUsers.map((userId) => {
                                    const user = allUsers.find(
                                      (u) => u.id === userId,
                                    );
                                    return (
                                      <span
                                        key={userId}
                                        className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
                                      >
                                        {user?.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Select User
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">
                              Assign Team
                            </label>
                            <div
                              onClick={() => openAssignModal(task.id)}
                              className="mt-1 p-2.5 border rounded-md cursor-pointer hover:border-primary  transition-colors min-h-[42px] flex items-center"
                            >
                              {task.assignedTeams &&
                              task.assignedTeams.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {task.assignedTeams.map((teamId) => {
                                    const team = allTeams.find(
                                      (t) => t.id === teamId,
                                    );
                                    return (
                                      <span
                                        key={teamId}
                                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                                      >
                                        {team?.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Select Team
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">
                              Start date & time
                            </label>
                            <Input
                              type="datetime-local"
                              className="mt-1"
                              value={task.startDate}
                              onChange={(e) =>
                                updateSubTask(
                                  task.id,
                                  'startDate',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              End date & time
                            </label>
                            <Input
                              type="datetime-local"
                              className="mt-1"
                              value={task.endDate}
                              onChange={(e) =>
                                updateSubTask(
                                  task.id,
                                  'endDate',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Set Priority */}
                        <div>
                          <label className="text-sm font-medium">
                            Set priority
                          </label>
                          <Select
                            value={task.priority}
                            onValueChange={(value) =>
                              updateSubTask(task.id, 'priority', value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">— None</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Add SOP/Description */}
                        {/* <div>
                          <label className="text-sm font-medium">
                            Add SOP/ Description
                          </label>
                          <div className="mt-1 border rounded-md">
                            <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <FileText className="h-4 w-4 text-gray-600" />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <Image className="h-4 w-4 text-gray-600" />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <Mic className="h-4 w-4 text-gray-600" />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <CheckSquare className="h-4 w-4 text-gray-600" />
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <svg
                                  className="h-4 w-4 text-gray-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                              </button>
                              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                                <MapPin className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                            <Textarea
                              placeholder=""
                              className="border-0 focus-visible:ring-0 resize-none"
                              rows={3}
                              value={task.description}
                              onChange={(e) =>
                                updateSubTask(
                                  task.id,
                                  'description',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div> */}

                        {/* Select Validation Type - Multi-select */}
                        <div>
                          <label className="text-sm font-medium">
                            Select Validation Type
                          </label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {validationTypes.map(({ value, icon: Icon }) => {
                              const isSelected = (
                                mainTaskData.validationType || []
                              ).includes(value);

                              return (
                                <button
                                  key={value}
                                  onClick={() =>
                                    toggleMainValidationType(value)
                                  }
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-primary  text-white border-primary '
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary  '
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{value}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add More Subtask Button */}
              <Button
                variant="outline"
                className="w-full border-dashed border-2 border-primary  text-primary   hover:bg-green-50"
                onClick={addSubTask}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Subtask
              </Button>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="bg-primary  hover:bg-green-700 flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Create Group Task
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarModal>

      {/* Assign Users/Teams Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">Assign</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSearchQuery('');
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0">
              <button
                onClick={() => setAssignModalTab('users')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  assignModalTab === 'users'
                    ? 'border-primary  text-primary  '
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Assign Users
              </button>
              <button
                onClick={() => setAssignModalTab('teams')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  assignModalTab === 'teams'
                    ? 'border-primary  text-primary  '
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Assign Teams
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search by name, phone, email or r..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="p-4 overflow-y-auto flex-1">
              {assignModalTab === 'users' ? (
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const isChecked = selectedUsers.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary  focus:ring-primary  "
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {user.name}
                            </span>
                            <span
                              className={`${user.badgeColor} text-white text-xs w-5 h-5 rounded-full flex items-center justify-center`}
                            >
                              {user.badge}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {user.department}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTeams.map((team) => {
                    const isChecked = selectedTeams.includes(team.id);
                    return (
                      <label
                        key={team.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTeamSelection(team.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary  focus:ring-primary  "
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm block">
                            {team.name}
                          </span>
                          <p className="text-xs text-gray-500">
                            {team.members} members
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(false);
                  setSearchQuery('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                className="bg-primary  hover:bg-green-700 text-white"
              >
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Recurrence Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Custom recurrence</h3>
              <p className="text-sm text-gray-500 mt-1">
                Task Duration: 12 Hrs 2 Mins
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Repeat Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Repeat</label>
                  <Select
                    value={repeatConfig.frequency}
                    onValueChange={(value) =>
                      setRepeatConfig({ ...repeatConfig, frequency: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Repetition in a day
                  </label>
                  <Select
                    value={String(repeatConfig.repetitionPerDay)}
                    onValueChange={(value) =>
                      setRepeatConfig({
                        ...repeatConfig,
                        repetitionPerDay: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Time</SelectItem>
                      <SelectItem value="2">2 Times</SelectItem>
                      <SelectItem value="3">3 Times</SelectItem>
                      <SelectItem value="4">4 Times</SelectItem>
                      <SelectItem value="5">5 Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Repeat Interval - for Daily/Weekly/Monthly/Yearly */}
              {repeatConfig.frequency !== 'None' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Repeat Interval
                    </label>
                    <Input
                      type="number"
                      min="0"
                      className="mt-1"
                      value={repeatConfig.repeatInterval}
                      onChange={(e) =>
                        setRepeatConfig({
                          ...repeatConfig,
                          repeatInterval: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">&nbsp;</label>
                    <Select
                      value={repeatConfig.intervalUnit}
                      onValueChange={(value) =>
                        setRepeatConfig({
                          ...repeatConfig,
                          intervalUnit: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hour">Hour</SelectItem>
                        <SelectItem value="Minute">Minute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Select Days - for Weekly */}
              {repeatConfig.frequency === 'Weekly' && (
                <div>
                  <label className="text-sm font-medium">Select Days</label>
                  <div className="flex gap-2 mt-2">
                    {weekDays.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDaySelection(index)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          repeatConfig.selectedDays.includes(index)
                            ? 'bg-primary  text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={day.full}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Select Dates - for Monthly */}
              {repeatConfig.frequency === 'Monthly' && (
                <div>
                  <label className="text-sm font-medium">Select Dates</label>
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                      <button
                        key={date}
                        onClick={() => {
                          setRepeatConfig((prev) => ({
                            ...prev,
                            selectedDates: prev.selectedDates.includes(date)
                              ? prev.selectedDates.filter((d) => d !== date)
                              : [...prev.selectedDates, date],
                          }));
                        }}
                        className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                          repeatConfig.selectedDates.includes(date)
                            ? 'bg-primary  text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowRepeatModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRepeat}
                className="bg-primary  hover:bg-green-700 text-white"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddTask;
