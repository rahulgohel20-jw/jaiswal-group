import React, { useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChartNoAxesCombined,
  CheckSquare,
  CircleCheckBig,
  Clock,
  CreditCard,
  Settings,
  Shield,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import

import { Button } from '@/components/ui/button';
import InsightCard from './InsightCard';
import PhaseCard from './PhaseCard';

const CateringPipeline = () => {
  const navigate = useNavigate(); // Add this hook

  const [phases, setPhases] = useState([
    {
      id: 'pre-event',
      title: 'Pre-Event Phase',
      icon: CalendarPlus,
      iconColor: 'text-blue-600',
      sections: [
        {
          id: 'planning',
          title: 'Planning',
          icon: 'target',
          tasks: [
            {
              id: 1,
              name: 'Draft Menu Layout',
              status: 'completed',
            },
          ],
        },
        {
          id: 'procurement',
          title: 'Procurement',
          icon: 'shopping-cart',
          tasks: [
            {
              id: 2,
              name: 'Other Ingredients',
              status: 'in-progress',
            },
          ],
        },
        {
          id: 'staffing',
          title: 'Staffing',
          icon: 'users',
          tasks: [
            {
              id: 3,
              name: 'Brief Staff',
              status: 'pending',
            },
          ],
        },
      ],
    },
    {
      id: 'event-day',
      title: 'Event-Day Phase',
      icon: CalendarDays,
      iconColor: 'text-blue-600',
      sections: [
        {
          id: 'setup',
          title: 'Setup',
          icon: 'tool',
          tasks: [
            {
              id: 4,
              name: 'Venue Buffet Setup',
              status: 'active',
            },
          ],
        },
        {
          id: 'service',
          title: 'Service',
          icon: 'utensils',
          tasks: [
            {
              id: 5,
              name: 'Live Counter Monitoring',
              status: 'pending',
            },
          ],
        },
        {
          id: 'coordination',
          title: 'Coordination',
          icon: 'headphones',
          tasks: [
            {
              id: 6,
              name: 'Guest Feedback Collection',
              status: 'pending',
            },
          ],
        },
      ],
    },
    {
      id: 'post-event',
      title: 'Post-Event Phase',
      icon: CalendarCheck,
      iconColor: 'text-blue-600',
      sections: [
        {
          id: 'wrap-up',
          title: 'Wrap-Up',
          icon: 'package',
          tasks: [
            {
              id: 7,
              name: 'Equipment Clearance',
              status: 'pending',
            },
          ],
        },
        {
          id: 'payments',
          title: 'Payments',
          icon: 'credit-card',
          tasks: [
            {
              id: 8,
              name: 'Process Final Invoice',
              status: 'pending',
            },
          ],
        },
        {
          id: 'closure',
          title: 'Closure',
          icon: 'check-circle',
          tasks: [
            {
              id: 9,
              name: 'Send Thankyou Note',
              status: 'pending',
            },
          ],
        },
      ],
    },
  ]);

  const insights = [
    {
      id: 1,
      title: 'Average Lead Time',
      description:
        'Pre-event planning typically takes 14-21 days for large corporate events.',
      icon: ChartNoAxesCombined,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      id: 2,
      title: 'Compliance & Safety',
      description:
        'Critical food safety checks are integrated into the Event-Day phase.',
      icon: CircleCheckBig,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      id: 3,
      title: 'Payment Cycle',
      description:
        'Post-event invoicing ensures payment reconciliation within 48 hours.',
      icon: CreditCard,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
  ];

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Catering Pipeline Template
          </h1>
          <p className="text-gray-600">
            Manage and monitor your event lifecycle from planning to closure.
          </p>
        </div>

        {/* Phase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>

        {/* Customize Button */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium shadow-lg"
            onClick={() => navigate('/viewpipeline/customizedpipe')} // Add this onClick handler
          >
            <Settings className="w-5 h-5 mr-2" />
            Customize & Apply Pipeline
          </Button>
        </div>

        {/* Process Insights Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Process Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CateringPipeline;
