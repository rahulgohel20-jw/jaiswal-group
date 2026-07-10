'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Hourglass,
  Mail,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SidebarModal from '../../../components/ui/sidebar';

const AddMember = ({ isOpen, onClose, staffData }) => {
  if (!staffData) return null;

  // Calculate efficiency breakdown
  const getEfficiencyData = () => {
    const total = staffData.totalTasks;
    const completed =
      total - (staffData.overdue + staffData.pending + staffData.inProgress);

    return [
      {
        label: 'On Time',
        value: Math.floor((completed / total) * 100),
        color: 'text-green-600',
      },
      { label: 'Early Work', value: 12, color: 'text-blue-600' },
      { label: 'Delayed', value: 16, color: 'text-red-600' },
    ];
  };

  const efficiencyData = getEfficiencyData();
  const efficiencyScore = staffData.performanceScore;

  // Service quality rating
  const serviceRating = (staffData.performanceScore / 20).toFixed(1);

  return (
    <SidebarModal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Analytics & Profile"
      subtitle="Performance metrics and details"
      width="2xl"
    >
      {/* Profile Section */}
      <div className="p-6 border-b">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={staffData.avatar || ''} alt={staffData.name} />
            <AvatarFallback className="bg-blue-500 text-white text-lg">
              {staffData.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{staffData.name}</h3>
            <Badge variant="secondary" className="mt-1 mb-2">
              {staffData.role}
            </Badge>
            <p className="text-xs text-muted-foreground">
              ID: OC-3621, Reports to Manan Gandhi
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>zainab.olivia5@gmail.com</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>9328793633</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b h-auto p-0">
          <TabsTrigger
            value="analytics"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Task Analytics
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Teams & Groups
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Attendances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="p-6 space-y-6 mt-0">
          {/* Performance Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-sm">Performance Overview</h4>
                <p className="text-xs text-muted-foreground">
                  Real-time tracking of workload distribution
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                  MONTHLY
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                  WEEKLY
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium">OVERDUE</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {String(staffData.overdue).padStart(2, '0')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium">DELAYED</span>
                  </div>
                  <p className="text-2xl font-bold">03</p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Hourglass className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs font-medium">IN-PROGRESS</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {String(staffData.inProgress).padStart(2, '0')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium">IN-TIME</span>
                  </div>
                  <p className="text-2xl font-bold">42</p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium">PENDING</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {String(staffData.pending).padStart(2, '0')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium">COMPLETE</span>
                  </div>
                  <p className="text-2xl font-bold">50</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Efficiency and Service Quality */}
          <div className="grid grid-cols-2 gap-4">
            {/* Efficiency Breakdown */}
            <div>
              <h4 className="font-semibold text-sm mb-3">
                Efficiency Breakdown
              </h4>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  {/* Circular Progress */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={Math.floor(
                        (efficiencyScore / 100) * 352,
                      )}
                      className="text-green-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">
                      {efficiencyScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      AVERAGE
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {efficiencyData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          item.color.replace('text-', 'bg-'),
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    <span className={cn('font-semibold', item.color)}>
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Quality Ratio */}
            <div>
              <h4 className="font-semibold text-sm mb-3">
                Service Quality Ratio
              </h4>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  {/* Circular Progress */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={Math.floor((serviceRating / 5) * 352)}
                      className="text-yellow-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{serviceRating}</span>
                    <span className="text-xs text-muted-foreground">
                      RATING
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Excellent</span>
                  </div>
                  <span className="font-semibold text-yellow-600">88%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Average</span>
                  </div>
                  <span className="font-semibold text-blue-600">13%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Task Execution */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm">Recent Task Execution</h4>
              <Button variant="link" size="sm" className="text-xs h-auto p-0">
                Export Report <FileText className="ml-1 h-3 w-3" />
              </Button>
            </div>

            <div className="border rounded-lg">
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 border-b text-xs font-medium text-muted-foreground">
                <div>Date Range</div>
                <div>Total Assigned</div>
                <div>Incomplete</div>
                <div>Completed</div>
                <div>Status</div>
              </div>
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  No active records
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tasks will appear here once available
                </p>
                <Button variant="link" size="sm" className="mt-3 text-xs">
                  Sync Now
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="p-6">
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Teams & Groups data</p>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="p-6">
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Attendance records</p>
          </div>
        </TabsContent>
      </Tabs>
    </SidebarModal>
  );
};

export default AddMember;
