import { CircleAlert, Folder } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AvatarGroup } from '../common/avatar-group';

const CardProject = ({
  id,
  logo,
  name,
  description,
  tag,
  createdBy,
  createdOn,
  singleTask,
  groupTask,
  progress,
  team,
}) => {
  const navigate = useNavigate();

  const handleViewProgress = () => {
    navigate('/projectdashboard/taskview');
  };

  return (
    <Card className="p-6">
      {/* Header with ID and Tag */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">ID #{id}</span>
        {tag && (
          <Badge
            size="lg"
            variant="success"
            appearance="light"
            className="bg-green-50 text-green-700"
          >
            {tag}
          </Badge>
        )}
      </div>

      {/* Project Name and Icon */}
      <div className="flex items-center gap-3 mb-3">
        <Folder className="w-5 h-5 text-green-600" />
        <Link
          to="/projectdashboard/taskview"
          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
        >
          {name}
        </Link>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {/* Created By */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm text-gray-500 min-w-[90px]">Created by</span>
        <span className="text-sm font-medium text-gray-900">22/11/22</span>
      </div>

      {/* Created On */}
      <div className="flex items-start gap-2 mb-4">
        <span className="text-sm text-gray-500 min-w-[90px]">Created on</span>
        <span className="text-sm font-medium text-gray-900">20/12/25</span>
      </div>

      {/* Task Stats */}
      <div className=" gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-1 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">20</div>
          <div className="text-xs text-gray-600">Single Task</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress
          value={progress?.value}
          indicatorClassName={progress?.variant}
          className="h-2"
        />
        <div className="flex justify-end mt-1">
          <span className="text-sm font-medium text-gray-700">
            {progress?.value}%
          </span>
        </div>
      </div>

      {/* View Progress Button and Avatar Group */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleViewProgress}
          className="flex items-center gap-2 px-2 py-2 rounded-full
               bg-blue-50 text-blue-600
               hover:bg-blue-100 hover:text-blue-700
               text-sm font-medium transition-all cursor-pointer"
        >
          <CircleAlert className="w-4 h-4" />
          View Progress
        </button>

        <AvatarGroup group={team?.group} size={team?.size} more={team?.more} />
      </div>
    </Card>
  );
};

export { CardProject };
