'use client';

import React, { useState } from 'react';
import { ChevronDown, Search, User, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/* -------------------- DATA -------------------- */

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

/* -------------------- COMPONENT -------------------- */

const AssignUserDropdown = ({ selectedUsers = [], onAssign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(selectedUsers);

  const filteredUsers = usersData.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTeams = teamsData.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleSelection = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAssign = () => {
    onAssign?.(selected);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelected(selectedUsers);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>
            {selected.length > 0
              ? `${selected.length} selected`
              : 'Assign Users'}
          </span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[450px] p-0"
        align="start"
        sideOffset={6}
        /* 🔥 CRITICAL FIXES */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b">
          <h3 className="font-semibold text-base">Assign Users</h3>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-3">
            <TabsList className="grid grid-cols-2 h-10">
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                Users
              </TabsTrigger>
              <TabsTrigger
                value="teams"
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                Teams
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or department"
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* USERS */}
          <TabsContent value="users" className="px-4">
            <div className="max-h-[260px] overflow-y-auto space-y-1 pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-7 h-7 mx-auto mb-2" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleSelection(user.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(user.id)}
                      onCheckedChange={() => toggleSelection(user.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold',
                        user.avatarColor,
                      )}
                    >
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.department}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TEAMS */}
          <TabsContent value="teams" className="px-4">
            <div className="max-h-[260px] overflow-y-auto space-y-1 pr-2">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => toggleSelection(team.id)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(team.id)}
                    onCheckedChange={() => toggleSelection(team.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white',
                      team.avatarColor,
                    )}
                  >
                    <UsersIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-gray-500">
                      {team.members} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-green-600 text-white"
            onClick={handleAssign}
          >
            Assign
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AssignUserDropdown;
