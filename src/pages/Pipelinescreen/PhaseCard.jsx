import React from 'react';
import {
  CheckCircle,
  CreditCard,
  Headphones,
  Package,
  ShoppingCart,
  Target,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';

const iconMap = {
  target: Target,
  'shopping-cart': ShoppingCart,
  users: Users,
  tool: Wrench,
  utensils: UtensilsCrossed,
  headphones: Headphones,
  package: Package,
  'credit-card': CreditCard,
  'check-circle': CheckCircle,
};

const PhaseCard = ({ phase }) => {
  const PhaseIcon = phase.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${phase.iconBg}`}>
            <PhaseIcon className={`w-5 h-5 ${phase.iconColor}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{phase.title}</h3>
        </div>
      </div>

      {/* Sections */}
      <div className="p-6 space-y-6">
        {phase.sections.map((section) => {
          const SectionIcon = iconMap[section.icon];
          return (
            <div key={section.id}>
              {/* Section Title */}
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {section.title}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 ml-6">
                {section.tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TaskItem = ({ task }) => {
  const getStatusBadge = (status) => {
    switch (status) {
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <span className="text-sm text-gray-800">{task.name}</span>
      {getStatusBadge(task.status)}
    </div>
  );
};

export default PhaseCard;
