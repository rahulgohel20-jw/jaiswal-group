'use client';

import { Fragment, useState } from 'react';
import { Search, CheckCircle2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const IssueSidebar = ({ onAssign, onClose }) => {
  const [selectedTeams, setSelectedTeams] = useState([
    { id: 1, name: 'IT Department', members: 20, managers: 7 },
  ]);
  const [selectedEmployees, setSelectedEmployees] = useState([
    { id: 1, name: 'Amee Masarani', avatar: '/media/avatars/300-1.png' },
    { id: 2, name: 'Deep Jain', avatar: '/media/avatars/300-2.png' },
  ]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const teams = [
    {
      id: 1,
      name: 'IT Department',
      members: 20,
      managers: 7,
    },
    {
      id: 2,
      name: 'Admin',
      members: 1,
      managers: 1,
    },
    {
      id: 3,
      name: 'Marketing',
      members: 15,
      managers: 3,
    },
  ];

  const employees = [
    {
      id: 1,
      name: 'Amee Masarani',
      avatar: '/media/avatars/300-1.png',
      department: 'IT Department',
    },
    {
      id: 2,
      name: 'Deep Jain',
      avatar: '/media/avatars/300-2.png',
      department: 'IT Department',
    },
    {
      id: 3,
      name: 'Aanya Kansara',
      avatar: '/media/avatars/300-3.png',
      department: 'IT Department',
    },
    {
      id: 4,
      name: 'Aayushi Turakhia',
      avatar: '/media/avatars/300-4.png',
      department: 'IT Department',
    },
  ];

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  const toggleTeamSelection = (team) => {
    const isSelected = selectedTeams.some((t) => t.id === team.id);
    if (isSelected) {
      setSelectedTeams(selectedTeams.filter((t) => t.id !== team.id));
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const removeSelectedTeam = (teamId) => {
    setSelectedTeams(selectedTeams.filter((t) => t.id !== teamId));
  };

  const toggleEmployeeSelection = (employee) => {
    const isSelected = selectedEmployees.some((emp) => emp.id === employee.id);
    if (isSelected) {
      setSelectedEmployees(
        selectedEmployees.filter((emp) => emp.id !== employee.id)
      );
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const removeSelectedEmployee = (employeeId) => {
    setSelectedEmployees(
      selectedEmployees.filter((emp) => emp.id !== employeeId)
    );
  };

  const handleAssign = () => {
    if (onAssign) {
      onAssign({
        teams: selectedTeams,
        employees: selectedEmployees,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Select Team Section */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Select Team
            </label>

            {/* Team Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for team"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            {/* Selected Teams Badges */}
            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
                  >
                    <span className="text-sm font-medium text-blue-900">
                      {team.name}
                    </span>
                    <button
                      onClick={() => removeSelectedTeam(team.id)}
                      className="hover:bg-blue-100 rounded-full cursor-pointer p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-blue-700" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Teams List */}
            <div className="space-y-2">
              {filteredTeams.map((team) => {
                const isSelected = selectedTeams.some((t) => t.id === team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleTeamSelection(team)}
                    className={cn(
                      'w-full flex items-center justify-between p-3.5 rounded-lg border-2 transition-all text-left',
                      isSelected
                        ? 'bg-blue-50 border-[#005BA8]'
                        : 'bg-background border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-[#005BA8] flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{team.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {team.members} members ({team.managers} managers)
                        </div>
                      </div>
                    </div>
                    {!isSelected && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Employee Section */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Select Employee
            </label>

            {/* Employee Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, phone, email or role"
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            {/* Selected Employees */}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
                  >
                    <img
                      src={employee.avatar}
                      alt={employee.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-blue-900">
                      {employee.name}
                    </span>
                    <button
                      onClick={() => removeSelectedEmployee(employee.id)}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-blue-700" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Employees List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.some(
                  (emp) => emp.id === employee.id
                );
                return (
                  <button
                    key={employee.id}
                    onClick={() => toggleEmployeeSelection(employee)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-background border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={employee.avatar}
                        alt={employee.name}
                        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {employee.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {employee.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-blue-500 transition-colors" />
                      )}
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="border-t bg-background pt-4 pb-2 sticky bottom-0">
        <Button
          onClick={handleAssign}
          disabled={selectedTeams.length === 0 || selectedEmployees.length === 0}
          className="w-full bg-[#005BA8] hover:bg-[#005BA8] text-white py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Assign To
        </Button>
      </div>
    </div>
  );
};

export default IssueSidebar;