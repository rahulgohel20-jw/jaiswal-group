import React from 'react';
import { AvatarGroup } from '@/partials/common/avatar-group';
import { MessageSquareText, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const TaskCard = ({ task, columnId, onDragStart }) => {
  // Priority color mapping
  const getPriorityColor = (priority) => {
    const lowerPriority = priority?.toLowerCase();
    switch (lowerPriority) {
      case 'high':
        return 'bg-red-100 text-red-600';
      case 'medium':
        return 'bg-gray-100 text-gray-600';
      case 'low':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Status color mapping
  const getStatusColor = (statusValue) => {
    const lowerStatus = statusValue?.toLowerCase();
    switch (lowerStatus) {
      case 'overdue':
        return 'bg-red-100 text-red-600';
      case 'running':
        return 'bg-yellow-100 text-yellow-600';
      case 'pending':
        return 'bg-orange-100 text-orange-600';
      case 'done':
        return 'bg-green-100 text-green-600';
      case 'under review':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Comment count color based on quantity (high, medium, low)
  const getCommentColor = (count) => {
    if (count >= 5) return 'text-red-500'; // High
    if (count >= 2) return 'text-yellow-500'; // Medium
    return 'text-green-500'; // Low
  };

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(task, columnId)}
      className="p-4 rounded-xl hover:shadow-md transition cursor-move bg-white"
    >
      {/* Header - Title with Status */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="font-semibold text-gray-900 leading-snug">
          {task.title}
        </h3>

        {task.status && (
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(task.status)}`}
          >
            {task.status}
          </span>
        )}
      </div>

      {/* Task ID & Priority */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500">
          #{task.id}
        </span>

        {task.priority && (
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}
          >
            {task.priority}
          </span>
        )}
      </div>

      {/* Assignees */}
      <div className="flex items-center justify-between mt-4">
        {/* Assignees - LEFT */}
        {task.assignee && (
          <AvatarGroup
            group={task.assignee.group}
            more={task.assignee.more}
            size="size-[34px]"
          />
        )}

        {/* Stats - RIGHT */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-purple-500">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm">{task.attachments || 0}</span>
          </div>

          <div
            className={`flex items-center gap-1 ${getCommentColor(task.comments || 0)}`}
          >
            <MessageSquareText className="w-4 h-4" />
            <span className="text-sm">{task.comments || 0}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-gray-400 text-sm mt-3">
        <span className="text-xs text-gray-400">
          {task.timeAgo || task.dueDate || '2 days ago...'}
        </span>
      </div>
    </Card>
  );
};

export default TaskCard;
