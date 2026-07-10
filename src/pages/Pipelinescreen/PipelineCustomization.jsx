import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PipelineCustomization = () => {
  const navigate = useNavigate();
  const [preEventExpanded, setPreEventExpanded] = useState(true);
  const [eventDayExpanded, setEventDayExpanded] = useState(false);
  const [postEventExpanded, setPostEventExpanded] = useState(false);

  const [preEventTasks, setPreEventTasks] = useState([
    {
      id: 1,
      name: 'Menu Finalization & Tastings',
      category: 'Logistic',
      status: true,
      priority: 'High',
      assignedRole: 'Swapli',
    },
    {
      id: 2,
      name: 'Staff Scheduling & Briefing',
      category: 'Operation',
      status: true,
      priority: 'Medium',
      assignedRole: 'Rajesh Kumar',
    },
  ]);

  const [eventDayTasks, setEventDayTasks] = useState([
    {
      id: 3,
      name: 'Setup & Venue Preparation',
      category: 'Logistic',
      status: true,
      priority: 'High',
      assignedRole: 'Priya Sharma',
    },
    {
      id: 4,
      name: 'Food Service & Guest Management',
      category: 'Operation',
      status: true,
      priority: 'low',
      assignedRole: 'Amit Patel',
    },
  ]);

  const [postEventTasks, setPostEventTasks] = useState([
    {
      id: 5,
      name: 'Cleanup & Equipment Return',
      category: 'Logistic',
      status: true,
      priority: 'Medium',
      assignedRole: 'Swapli',
    },
    {
      id: 6,
      name: 'Client Feedback & Invoicing',
      category: 'Administrative',
      status: true,
      priority: 'High',
      assignedRole: 'Neha Singh',
    },
  ]);

  const toggleStatus = (taskId, section) => {
    const updateTasks = (tasks) =>
      tasks.map((task) =>
        task.id === taskId ? { ...task, status: !task.status } : task,
      );

    if (section === 'pre') setPreEventTasks(updateTasks(preEventTasks));
    else if (section === 'event') setEventDayTasks(updateTasks(eventDayTasks));
    else if (section === 'post') setPostEventTasks(updateTasks(postEventTasks));
  };

  const onDragStart = (e, taskId, section) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.setData('fromSection', section);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, dropTaskId, dropSection) => {
    e.preventDefault();

    const draggedTaskId = parseInt(e.dataTransfer.getData('taskId'));
    const fromSection = e.dataTransfer.getData('fromSection');

    if (!draggedTaskId || !fromSection) return;

    // Same section - reorder only
    if (fromSection === dropSection) {
      let tasks =
        fromSection === 'pre'
          ? [...preEventTasks]
          : fromSection === 'event'
            ? [...eventDayTasks]
            : [...postEventTasks];

      const draggedIndex = tasks.findIndex((t) => t.id === draggedTaskId);
      const dropIndex = tasks.findIndex((t) => t.id === dropTaskId);

      if (draggedIndex === dropIndex) return;

      // Remove dragged item
      const [draggedTask] = tasks.splice(draggedIndex, 1);

      // Insert at new position
      tasks.splice(dropIndex, 0, draggedTask);

      // Update state once
      if (fromSection === 'pre') setPreEventTasks(tasks);
      else if (fromSection === 'event') setEventDayTasks(tasks);
      else if (fromSection === 'post') setPostEventTasks(tasks);
    }
    // Different sections - move task
    else {
      let fromTasks =
        fromSection === 'pre'
          ? [...preEventTasks]
          : fromSection === 'event'
            ? [...eventDayTasks]
            : [...postEventTasks];

      let toTasks =
        dropSection === 'pre'
          ? [...preEventTasks]
          : dropSection === 'event'
            ? [...eventDayTasks]
            : [...postEventTasks];

      // Find the dragged task
      const draggedTaskIndex = fromTasks.findIndex(
        (t) => t.id === draggedTaskId,
      );
      const draggedTask = fromTasks[draggedTaskIndex];

      if (!draggedTask) return;

      // Remove from source
      fromTasks.splice(draggedTaskIndex, 1);

      // Find drop position
      const dropIndex = toTasks.findIndex((t) => t.id === dropTaskId);

      // Insert at drop position
      toTasks.splice(dropIndex, 0, draggedTask);

      // Update state for both sections
      if (fromSection === 'pre') setPreEventTasks(fromTasks);
      else if (fromSection === 'event') setEventDayTasks(fromTasks);
      else if (fromSection === 'post') setPostEventTasks(fromTasks);

      if (dropSection === 'pre') setPreEventTasks(toTasks);
      else if (dropSection === 'event') setEventDayTasks(toTasks);
      else if (dropSection === 'post') setPostEventTasks(toTasks);
    }
  };

  const handleSave = () => {
    // Implement save logic here
    console.log('Saving pipeline customization...', {
      preEventTasks,
      eventDayTasks,
      postEventTasks,
    });
    // You can add API call or other save logic here
    // Optionally navigate after save
    // navigate('/viewpipeline');
  };

  const handleCancel = () => {
    // Navigate back to view pipeline
    navigate('/viewpipeline');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-orange-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const TaskSection = ({
    title,
    activeCount,
    expanded,
    setExpanded,
    tasks,
    section,
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            {activeCount} Active Tasks
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  draggable={true}
                  onDragStart={(e) => onDragStart(e, task.id, section)}
                  onDragOver={(e) => onDragOver(e)}
                  onDrop={(e) => onDrop(e, task.id, section)}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ cursor: 'move' }}
                >
                  <td className="px-2 py-4">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {task.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {task.category}
                  </td>
                  <td
                    className="px-4 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.status}
                        onChange={() => toggleStatus(task.id, section)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                        task.priority,
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarColor(
                            task.assignedRole,
                          )} flex items-center justify-center text-white text-xs font-semibold`}
                        >
                          {getInitials(task.assignedRole)}
                        </div>
                        <span className="text-sm text-gray-900">
                          {task.assignedRole}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 border-t border-gray-200">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Custom Task
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pipeline Customization
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure and sequence automated task workflows for this specific
            event timeline.
          </p>
        </div>

        <TaskSection
          title="Pre-Event Tasks"
          activeCount={preEventTasks.length}
          expanded={preEventExpanded}
          setExpanded={setPreEventExpanded}
          tasks={preEventTasks}
          section="pre"
        />

        <TaskSection
          title="Event-Day Tasks"
          activeCount={eventDayTasks.length}
          expanded={eventDayExpanded}
          setExpanded={setEventDayExpanded}
          tasks={eventDayTasks}
          section="event"
        />

        <TaskSection
          title="Post-Event Tasks"
          activeCount={postEventTasks.length}
          expanded={postEventExpanded}
          setExpanded={setPostEventExpanded}
          tasks={postEventTasks}
          section="post"
        />

        {/* Action Buttons */}
        <div className="">
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Save Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineCustomization;
