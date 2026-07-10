import React from 'react';

const InsightCard = ({ insight }) => {
  const Icon = insight.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Icon */}
      <div className={`inline-flex p-3 rounded-lg ${insight.iconBg} mb-4`}>
        <Icon className={`w-6 h-6 ${insight.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {insight.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {insight.description}
      </p>
    </div>
  );
};

export default InsightCard;
