

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TeamViewSidebar = ({ teamMembers }) => {
  const [expandedTeams, setExpandedTeams] = useState({});

  // Calculate statistics
  const totalManagers = teamMembers.filter(
    (member) => member.role === 'Manager'
  ).length;
  const totalEmployees = teamMembers.filter(
    (member) => member.role === 'Employee'
  ).length;

  // Group members by team
  const teamGroups = teamMembers.reduce((acc, member) => {
    const teamName = member.team || 'Unassigned';
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(member);
    return acc;
  }, {});

  // Calculate team statistics
  const teamStats = Object.entries(teamGroups).map(([teamName, members]) => {
    const managers = members.filter((m) => m.role === 'Manager').length;
    const employees = members.filter((m) => m.role === 'Employee').length;
    return {
      teamName,
      managers,
      employees,
      total: members.length,
      members,
    };
  });

  const toggleTeam = (teamName) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamName]: !prev[teamName],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Total Staff Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-4">Total staff</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Managers Card */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {totalManagers}
            </div>
            <div className="text-sm text-gray-600">Managers</div>
          </div>

          {/* Employees Card */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {totalEmployees}
            </div>
            <div className="text-sm text-gray-600">Employees</div>
          </div>
        </div>
      </div>

      {/* Team List Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-4">Team List</h3>
        <div className="space-y-2">
          {teamStats.map((team) => (
            <div key={team.teamName} className="border rounded-lg">
              {/* Team Header */}
              <button
                onClick={() => toggleTeam(team.teamName)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900 mb-1">
                    {team.teamName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {team.managers} Manager{team.managers !== 1 ? 's' : ''}{' '}
                    {team.employees} Employee{team.employees !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedTeams[team.teamName] ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Expanded Team Members */}
              {expandedTeams[team.teamName] && (
                <div className="border-t bg-gray-50">
                  <div className="p-4 space-y-3">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {member.designation}
                          </div>
                        </div>
                        <div className="text-xs">
                          <span
                            className={`px-2 py-1 rounded-full ${
                              member.role === 'Manager'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamViewSidebar;