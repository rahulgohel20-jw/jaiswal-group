'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const usersData = [
  {
    id: 'user1',
    name: 'Aarya Kansara',
    department: 'IT Department',
    avatar: 'E',
    avatarColor: 'bg-gray-500',
  },
  {
    id: 'user2',
    name: 'Aayushi Turakhia',
    department: 'IT Department',
    avatar: 'E',
    avatarColor: 'bg-gray-500',
  },
  {
    id: 'user3',
    name: 'Amee Masarani',
    department: 'IT Department',
    avatar: 'M',
    avatarColor: 'bg-blue-500',
  },
  {
    id: 'user4',
    name: 'John Doe',
    department: 'Development Team',
    avatar: 'J',
    avatarColor: 'bg-green-500',
  },
  {
    id: 'user5',
    name: 'Jane Smith',
    department: 'Design Team',
    avatar: 'J',
    avatarColor: 'bg-purple-500',
  },
  {
    id: 'user6',
    name: 'Manan Gandhi',
    department: 'Operations',
    avatar: 'M',
    avatarColor: 'bg-orange-500',
  },
  {
    id: 'user7',
    name: 'Zainab Olivia',
    department: 'Marketing',
    avatar: 'Z',
    avatarColor: 'bg-pink-500',
  },
];

const teamsData = [
  {
    id: 'team1',
    name: 'Development Team',
    members: 8,
    avatarColor: 'bg-blue-500',
  },
  {
    id: 'team2',
    name: 'Design Team',
    members: 5,
    avatarColor: 'bg-purple-500',
  },
  {
    id: 'team3',
    name: 'Marketing Team',
    members: 6,
    avatarColor: 'bg-green-500',
  },
  {
    id: 'team4',
    name: 'Operations Team',
    members: 4,
    avatarColor: 'bg-orange-500',
  },
];

const AssignUserModal = ({
  isOpen,
  onClose,
  onAssign,
  selectedUsers = [],
  mode = 'users',
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    const userIds = selectedUsers.filter((id) =>
      usersData.some((user) => user.id === id),
    );
    const teamIds = selectedUsers.filter((id) =>
      teamsData.some((team) => team.id === id),
    );

    setSelectedUserIds(userIds);
    setSelectedTeamIds(teamIds);
  }, [selectedUsers]);

  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    onClose();
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleTeam = (teamId) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  const handleAssign = () => {
    if (onAssign) {
      onAssign([...selectedUserIds, ...selectedTeamIds]);
    }
    handleClose();
  };

  const handleCancel = () => {
    const userIds = selectedUsers.filter((id) =>
      usersData.some((user) => user.id === id),
    );
    const teamIds = selectedUsers.filter((id) =>
      teamsData.some((team) => team.id === id),
    );
    setSelectedUserIds(userIds);
    setSelectedTeamIds(teamIds);
    setSearchQuery('');
    handleClose();
  };

  const filteredUsers = usersData.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTeams = teamsData.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSelectionText = () => {
    const userCount = selectedUserIds.length;
    const teamCount = selectedTeamIds.length;

    if (userCount === 0 && teamCount === 0) {
      return 'Select User';
    }

    const parts = [];
    if (userCount > 0)
      parts.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
    if (teamCount > 0)
      parts.push(`${teamCount} team${teamCount > 1 ? 's' : ''}`);

    return parts.join(' & ');
  };

  return (
    <div className="absolute left-0 bottom-0 mt-2 w-full z-50">
      {/* TRIGGER INPUT */}

      {/* POPOVER DROPDOWN */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0  mt-2  min-w-[300px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {/* Header with Tabs */}
          <div className="flex items-center border-b border-gray-200 bg-white">
            <button
              onClick={() => {
                setActiveTab('users');
                setSearchQuery('');
              }}
              className={cn(
                'flex-1 px-6 py-3.5 text-sm font-semibold transition-all relative',
                activeTab === 'users'
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Assign Users
              {activeTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('teams');
                setSearchQuery('');
              }}
              className={cn(
                'flex-1 px-6 py-3.5 text-sm font-semibold transition-all relative',
                activeTab === 'teams'
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Assign Teams
              {activeTab === 'teams' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'users'
                    ? 'Search by name, phone, email or role...'
                    : 'Search teams...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-2 max-h-[190px] overflow-y-auto bg-white">
            {activeTab === 'users' ? (
              <div className="space-y-0">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 cursor-pointer py-2.5 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                          user.avatarColor,
                        )}
                      >
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.department}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center gap-3 cursor-pointer py-2.5 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(team.id)}
                        onChange={() => toggleTeam(team.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                          team.avatarColor,
                        )}
                      >
                        <UsersIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {team.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {team.members} members
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No teams found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="px-6 h-9 border-gray-300 hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              className="px-6 h-9 bg-primary hover:bg-green-700 text-white text-sm font-medium"
            >
              Assign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignUserModal;
