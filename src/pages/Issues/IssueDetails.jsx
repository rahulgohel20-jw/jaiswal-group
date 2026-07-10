'use client';

import { Fragment, useState } from 'react';
import {
  ArrowLeft,
  Paperclip,
  X,
  Calendar,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const IssueDetails = ({ isOpen, onClose, issue }) => {
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('Comment');

  if (!issue) return null;

  const tabs = ['Comment', 'Resolution', 'Tasks'];

  // Sample task data - in real app, this would come from props or API
  const linkedTasks = [
    {
      id: 'AH65-T986',
      title: 'TASK',
      date: '3 Feb 2026',
      time: '11:59 PM',
      status: 'Completed',
      team: 'No Team',
      commentCount: 0,
      isCompleted: true,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={onClose}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-blue-600">
                    AH65-I12
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-400 text-emerald-600 bg-emerald-50"
                  >
                    {issue.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-500 text-emerald-600 bg-emerald-50"
                  >
                    {issue.team}
                  </Badge>
                </div>

                <h2 className="text-xl font-semibold text-foreground">
                  {issue.issueName}
                </h2>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col">
            {/* Tabs */}
            <div className="mb-6 border-b shrink-0">
              <div className="flex items-center gap-8">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'relative pb-3 text-sm font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'text-emerald-600'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {/* Comment Tab */}
              {activeTab === 'Comment' && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="mb-6 rounded-2xl bg-muted/30 p-12 relative">
                      <div className="absolute top-3 right-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200/60 flex items-center justify-center">
                          <X className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <div className="h-32 w-48 bg-white rounded-lg shadow-sm p-4 flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 bg-muted rounded w-3/4" />
                            <div className="h-2 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="h-2 bg-muted rounded w-full" />
                          <div className="h-2 bg-muted rounded w-5/6" />
                          <div className="h-2 bg-muted rounded w-4/6" />
                        </div>
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      No comments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      There are no data available
                    </p>
                  </div>
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'Tasks' && (
                <div className="space-y-3">
                  {linkedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-border rounded-lg p-4 bg-background hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={task.isCompleted}
                            readOnly
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-sm text-muted-foreground">
                            # ID {task.id}
                          </span>
                        </div>
                        <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{task.commentCount}</span>
                        </button>
                      </div>

                      <h3 className="text-base font-semibold text-foreground mb-3">
                        {task.title}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{task.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{task.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-emerald-400 text-emerald-600 bg-emerald-50 text-xs"
                          >
                            {task.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.team}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {linkedTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        No tasks linked
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        There are no tasks associated with this issue
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Tab */}
              {activeTab === 'Resolution' && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center justify-center py-16">
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      No resolution data
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      There are no data available
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input - Only show on Comment tab */}
            {activeTab === 'Comment' && (
              <div className="border-t pt-4 mt-auto shrink-0">
                <div className="relative">
                  <Textarea
                    placeholder="Type message..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[60px] resize-none pr-12 rounded-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 hover:bg-muted"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Issue Metadata */}
          <div className="w-80 border-l bg-muted/10 px-6 py-6 overflow-y-auto shrink-0">
            <div className="space-y-5">
              {/* Created By */}
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created by
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={issue.created?.avatar || '/media/avatars/300-1.png'}
                      alt={issue.created?.name || 'User'}
                    />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm">
                      {(issue.created?.name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Aarya Kansara
                    </p>
                    <p className="text-xs text-muted-foreground">
                      04-02-2026, 01:40 PM
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/60" />

              {/* Assigned To */}
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assigned to
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={
                        Array.isArray(issue.assignedTo)
                          ? issue.assignedTo[0]?.avatar
                          : issue.assignedTo?.avatar
                      }
                      alt="Assignee"
                    />
                    <AvatarFallback className="bg-blue-600 text-white text-sm">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold text-foreground">
                    Aarya Kansara
                  </p>
                </div>
              </div>

              <Separator className="bg-border/60" />

              {/* Issue Resolved By */}
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Issue resolved by
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src="/media/avatars/300-3.png"
                      alt="Resolver"
                    />
                    <AvatarFallback className="bg-purple-600 text-white text-sm">
                      T
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Tarun Maheshwari
                    </p>
                    <p className="text-xs text-muted-foreground">
                      04-02-2026, 02:54 PM
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/60" />

              {/* Start Date */}
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Start date
                </p>
                <p className="text-sm font-semibold text-foreground">
                  04-02-2026, 01:40 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default IssueDetails;