'use client';

import { Fragment, useState } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const TaskDetails = ({ isOpen, onClose, task, onEdit, onDelete }) => {
  const [comment, setComment] = useState('');

  if (!task) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onClose}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-destructive">
                      {task.id}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-yellow-400 text-yellow-600"
                    >
                      {task.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-600"
                    >
                      {task.team}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">
                        {task.priority === 'High' ? '0' : '0'}
                      </span>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold mb-2">{task.title}</h2>

                  <p className="text-sm text-muted-foreground">
                    Description:{' '}
                    {task.description ||
                      'All profiles reels and posts work, which is to be done at the end of the day'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 me-6">
                <Button
                  variant="default"
                  size="lg"
                  className="bg-[#00944A] hover:bg-[#00944A]/90 text-white"
                >
                  Start Task
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Task
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDelete}
                  className="gap-2 text-destructive hover:text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Task
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Comment Tab */}
              <div className="mb-6">
                <button className="relative pb-2 text-sm font-medium text-[#00944A]">
                  Comment
                  <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#00944A]" />
                </button>
              </div>

              {/* Empty Comments State */}
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-lg bg-muted p-8">
                  <div className="h-16 w-16 rounded bg-background" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No comments</h3>
                <p className="text-sm text-muted-foreground">
                  There are no data available
                </p>
              </div>
            </div>

            {/* Right Sidebar - Task Metadata */}
            <div className="w-80 border-l bg-muted/20 px-6 py-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Created By */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Created by
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={task.createdBy.avatar}
                        alt={task.createdBy.name}
                      />
                      <AvatarFallback className="bg-[#00944A] text-white">
                        {task.createdBy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {task.createdBy.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.createdOn}, 12:28 PM
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Assigned To */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Assigned to
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage
                          src={task.assignee.avatar}
                          alt={task.assignee.name}
                        />
                        <AvatarFallback>
                          {task.assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage
                          src="/media/avatars/300-2.png"
                          alt="User"
                        />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage
                          src="/media/avatars/300-3.png"
                          alt="User"
                        />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                    >
                      0+
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Start Date */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Start date
                  </p>
                  <p className="text-sm font-medium">07-02-2026, 10:30 AM</p>
                </div>

                <Separator />

                {/* Due Date */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Due date</p>
                  <p className="text-sm font-medium">07-02-2026, 07:30 PM</p>
                </div>

                <Separator />

                {/* Repeat Task */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Repeat Task
                  </p>
                  <p className="text-sm font-medium">
                    Daily, Repeat after 0:0 Hours, 1 Time
                  </p>
                </div>

                <Separator />

                {/* Reviewer */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Reviewer</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={task.createdBy.avatar}
                        alt={task.createdBy.name}
                      />
                      <AvatarFallback className="bg-[#00944A] text-white">
                        {task.createdBy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{task.createdBy.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Comment Input */}
          <div className="border-t px-6 py-4">
            <div className="relative">
              <Textarea
                placeholder="Type message..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px] resize-none pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetails;
