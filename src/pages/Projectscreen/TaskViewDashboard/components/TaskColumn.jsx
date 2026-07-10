import React from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const TaskColumn = ({
  columnId,
  title,
  count,
  tasks,
  color,
  status,
  onDragStart,
  onDragOver,
  onDrop,
  onAddTask,
  showAddButton = false,
}) => {
  const handleNewTaskClick = () => {
    if (onAddTask) {
      onAddTask(columnId);
    }
  };

  return (
    <div
      className="w-full"
      onDragOver={onDragOver}
      onDrop={() => onDrop(columnId)}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          {count}
        </span>
      </div>

      {/* COLUMN BACKGROUND BOX */}
      <div className="bg-gray-50 rounded-xl p-3 shadow-sm">
        {/* Task Cards - Drop Zone with Vertical Scroll */}
        <div
          className="
            space-y-3 
            p-2 rounded-lg
            border-2 border-dashed border-gray-300
            hover:border-blue-400
            transition-colors
            max-h-[600px]
            overflow-y-auto
            min-h-[200px]
          "
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnId={columnId}
              columnStatus={status}
              onDragStart={onDragStart}
            />
          ))}

          {/* Add Task Button */}
          {showAddButton && (
            <button
              onClick={handleNewTaskClick}
              className="
                w-full p-2 border-2 border-gray-300 rounded-lg
                hover:border-blue-400 hover:bg-blue-50 transition-all
                flex items-center justify-center gap-2
                text-gray-500 hover:text-blue-600 
                group mb-5 mt-5
                cursor-pointer
              "
            >
              <div
                className="
                  w-8 h-8 rounded-full bg-gray-100
                  group-hover:bg-blue-100
                  flex items-center justify-center transition-colors
                "
              >
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium">New Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskColumn;
