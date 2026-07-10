import React, { useMemo, useState } from 'react';
import { Breadcrumb } from '@/layouts/demo1/components/breadcrumb';
import { CardProject } from '@/partials/cards';
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Folder,
  Grid3x3,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import FilterPopover from '../../components/ui/FilterPopover';
import AddProject from '../../partials/modal/add-project/AddProject';

// Stats Card Component
const StatsCard = ({ icon: Icon, title, stats }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-600">{stat.label}</span>
            <span className={`font-semibold px-3 py-1 rounded ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Task Summary Component
const TaskSummary = () => {
  const taskStats = [
    { label: 'Ongoing', value: 4, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Overdue', value: 8, color: 'bg-red-100 text-red-700' },
    { label: 'Completed', value: 1, color: 'bg-green-100 text-green-700' },
    { label: 'Scheduled', value: 0, color: 'bg-gray-100 text-gray-700' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <CheckSquare className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold">13 Tasks</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {taskStats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-600">{stat.label}</span>
            <span className={`font-semibold px-3 py-1 rounded ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Project Card for Board View
const ProjectBoardCard = ({ project }) => {
  const getTagColor = (label) => {
    const colors = {
      Soft: 'border-teal-400 text-teal-600 bg-teal-50',
      themes: 'border-teal-400 text-teal-600 bg-teal-50',
      'In Progress': 'border-blue-400 text-blue-600 bg-blue-50',
      Upcoming: 'border-gray-400 text-gray-600 bg-gray-50',
    };
    return colors[label] || 'border-gray-400 text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header with ID and Tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-0.5 bg-gray-400"></span>
            <span>ID #{project.id}</span>
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium ${getTagColor(project.status.label)}`}
        >
          {project.status.label}
        </span>
      </div>

      {/* Project Icon and Name */}
      <div className="flex items-center gap-2 mb-3">
        <Folder className="h-5 w-5 text-gray-500" />
        <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
          {project.name}
        </h3>
      </div>

      {/* Date and Time */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {project.startDate}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {project.endDate}
        </span>
      </div>

      {/* Task Stats */}
      <div className=" mb-4 bg-gray-50 rounded-lg p-3 justify-content-center">
        <div className="text-center justify-content-center">
          <div className="text-lg font-semibold text-gray-900">
            {project.taskStats?.singleTask || 0}
          </div>
          <div className="text-xs text-gray-500">Single Task</div>
        </div>
      </div>

      {/* Team and Avatars */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            {project.teamName || 'IT Department'}
          </span>
        </div>

        <div className="flex items-center -space-x-2">
          {project.team.group.slice(0, 3).map((member, idx) => (
            <div
              key={idx}
              className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
            >
              {member.fallback ||
                member.filename?.charAt(0).toUpperCase() ||
                'U'}
            </div>
          ))}
          {project.team.group.length > 3 && (
            <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white">
              +{project.team.group.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Board Column Component
const BoardColumn = ({ tag, projects, count, onAddProject }) => {
  return (
    <div className="flex-shrink-0 w-96 bg-gray-50/50 rounded-lg border border-gray-200">
      {/* Column Header */}
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="text-base font-semibold text-teal-600">
          {tag} <span className="text-gray-400 font-normal">{count}</span>
        </h3>
      </div>

      {/* Projects List */}
      <div className="p-4 space-y-3 min-h-[500px]">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectBoardCard key={project.id} project={project} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="w-16 h-12 bg-gray-200 rounded"></div>
            </div>
            <p className="text-sm text-gray-400">No Projects</p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onAddProject}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>
    </div>
  );
};

// Board View Component
const BoardView = ({ projects, onAddProject }) => {
  // Group projects by tag
  const groupedProjects = useMemo(() => {
    const groups = {};
    projects.forEach((project) => {
      const tag = project.status.label;
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(project);
    });
    return groups;
  }, [projects]);

  // Get all unique tags including those with 0 projects
  const allTags = ['SASS APPLICATION', 'Soft'];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {allTags.map((tag) => (
          <BoardColumn
            key={tag}
            tag={tag}
            projects={groupedProjects[tag] || []}
            count={groupedProjects[tag]?.length || 0}
            onAddProject={onAddProject}
          />
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component
const ProjectDashboard = () => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'board', 'list'
  const [selectedTag, setSelectedTag] = useState('');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('Tag');
  const [appliedFilters, setAppliedFilters] = useState(null);

  const [projects, setProjects] = useState([
    {
      id: 7,
      logo: 'plurk.svg',
      name: 'Jaishwal Project',
      description: 'Jaishwal Project',
      startDate: '21 Jan, 2026',
      endDate: '6:33 pm',
      status: {
        label: 'Soft',
        variant: 'success',
      },
      progress: {
        variant: 'bg-green-500',
        value: 65,
      },
      team: {
        size: 'size-[30px]',
        group: [
          { filename: '300-4.png', fallback: 'H' },
          { filename: '300-2.png', fallback: 'R' },
          { filename: '300-3.png', fallback: 'S' },
        ],
      },
      teamName: 'IT Department',
      taskStats: {
        singleTask: 2,
        groupTask: 0,
      },
    },
    {
      id: 2,
      logo: 'telegram.svg',
      name: 'JCX',
      description: 'No description available',
      startDate: '13 Jan, 2026',
      endDate: '12:24 pm',
      status: {
        label: 'Soft',
        variant: 'primary',
      },
      progress: {
        variant: 'bg-primary',
        value: 45,
      },
      team: {
        size: 'size-[30px]',
        group: [
          { filename: '300-24.png', fallback: 'A' },
          { filename: '300-7.png', fallback: 'J' },
          { filename: '300-8.png', fallback: 'K' },
          { filename: '300-9.png', fallback: 'L' },
        ],
      },
      teamName: 'IT Department',
      taskStats: {
        singleTask: 79,
        groupTask: 1,
      },
    },
    {
      id: 3,
      logo: 'kickstarter.svg',
      name: 'Just Tab',
      description: 'No description available',
      startDate: '16 Jan, 2026',
      endDate: '04:31 PM',
      status: {
        label: 'Upcoming',
        variant: 'secondary',
      },
      progress: {
        variant: 'bg-input',
        value: 100,
      },
      team: {
        size: 'size-[30px]',
        group: [
          { filename: '300-21.png', fallback: 'M' },
          { filename: '300-1.png', fallback: 'N' },
          { filename: '300-2.png', fallback: 'O' },
        ],
        more: {
          number: 3,
          variant: 'text-white ring-background bg-green-500',
        },
      },
      teamName: 'Design Team',
      taskStats: {
        singleTask: 5,
        groupTask: 2,
      },
    },
    {
      id: 4,
      logo: 'quickbooks.svg',
      name: 'JCx Reports Theme',
      description: 'No description available',
      startDate: '16 Jan, 2026',
      endDate: '1:20 pm',
      status: {
        label: 'themes',
        variant: 'primary',
      },
      progress: {
        variant: 'bg-purple-500',
        value: 25,
      },
      team: {
        size: 'size-[30px]',
        group: [
          { filename: '300-1.png', fallback: 'A' },
          {
            fallback: 'L',
            variant:
              'text-destructive-foreground ring-background bg-destructive',
          },
          { fallback: 'S', variant: 'text-white ring-background bg-green-500' },
        ],
      },
      teamName: 'IT Department',
      taskStats: {
        singleTask: 1,
        groupTask: 0,
      },
    },
  ]);

  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    console.log('Filters applied:', filters);
  };

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.status.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [projects, searchQuery]);

  const projectStats = [
    { label: 'Tasks', value: 822, color: 'bg-orange-100 text-orange-700' },
    { label: 'Subtasks', value: 44, color: 'bg-green-100 text-green-700' },
  ];

  // Handle project creation
  const handleCreateProject = (projectData) => {
    console.log('New Project Data:', projectData);

    const newId = Math.max(...projects.map((p) => p.id), 0) + 1;

    const newProject = {
      id: newId,
      logo: 'folder.svg',
      name: projectData.projectName,
      description: projectData.description || 'No description available',
      startDate: new Date().toLocaleDateString('en-GB'),
      endDate: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      status: {
        label: projectData.projectTag,
        variant: 'primary',
      },
      progress: {
        variant: 'bg-primary',
        value: 0,
      },
      team: {
        size: 'size-[30px]',
        group: [{ filename: '300-1.png', fallback: 'U' }],
      },
      teamName: 'IT Department',
      taskStats: {
        singleTask: 0,
        groupTask: 0,
      },
    };

    setProjects((prevProjects) => [newProject, ...prevProjects]);
    console.log('Project created successfully:', newProject);
  };

  const viewModes = [
    { id: 'overview', icon: Grid3x3, label: 'Overview' },
    { id: 'board', icon: LayoutGrid, label: 'Board' },
    // { id: 'list', icon: ListIcon, label: 'List' },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <Breadcrumb />

          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg
               hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Create Project
          </button>
        </div>

        {/* Header Stats - Only show in overview */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
            <StatsCard
              icon={Folder}
              title={`${projects.length} Projects`}
              stats={projectStats}
            />
            <TaskSummary />
          </div>
        )}

        {/* View Mode Selector */}
        <div className="mb-6 flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
          {viewModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Board view controls */}
        {viewMode === 'board' && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search Board"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-80"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        )}

        {/* Overview - Projects Section */}
        {viewMode === 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Section Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-6 h-6 text-gray-700" />
                  <div>
                    <h2 className="text-base font-semibold leading-none tracking-tight">
                      All Projects
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FilterPopover onApplyFilter={handleApplyFilter} />

                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />

                    {searchQuery.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Grid */}
            <div className="p-6">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredProjects.map((project) => (
                    <CardProject
                      key={project.id}
                      logo={project.logo}
                      name={project.name}
                      description={project.description}
                      startDate={project.startDate}
                      endDate={project.endDate}
                      status={project.status}
                      progress={project.progress}
                      team={project.team}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No projects found
                  </h3>
                  <p className="text-sm text-gray-500">
                    Try adjusting your search to find what you're looking for
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Board View */}
        {viewMode === 'board' && (
          <BoardView
            projects={filteredProjects}
            onAddProject={() => setIsAddProjectOpen(true)}
          />
        )}

        {/* List View Placeholder */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <ListIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              List view coming soon
            </h3>
            <p className="text-sm text-gray-500">
              This feature is under development
            </p>
          </div>
        )}
      </div>

      {/* AddProject Modal */}
      <AddProject
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default ProjectDashboard;
