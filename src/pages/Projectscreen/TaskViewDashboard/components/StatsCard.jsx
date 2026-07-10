import React from 'react';
import { Card } from '@/components/ui/card';

const StatsCard = ({ icon: Icon, count, label, iconBgColor, iconColor }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-5">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{count}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
