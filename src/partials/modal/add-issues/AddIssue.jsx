'use client';

import { Fragment, useState } from 'react';
import { X, FileText, Image, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SidebarModal from '@/components/ui/sidebar';

const AddIssue = ({ isOpen,  onClose }) => {
  const [formData, setFormData] = useState({
    outlet: 'ahd',
    issueName: '',
    assignedUsers: [],
    priority: '',
    description: '',
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignModalTab, setAssignModalTab] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Mock users data (same as AddTask)
  const allUsers = [
    {
      id: 1,
      name: 'Tarun Kumar',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 2,
      name: 'Rahul Gohel',
      department: 'IT Department',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 3,
      name: 'Aarya Kansara',
      department: 'IT Department',
      badge: 'M',
      badgeColor: 'bg-blue-500',
    },
    {
      id: 4,
      name: 'Aayushi Turakhia',
      department: 'Design Team',
      badge: 'E',
      badgeColor: 'bg-gray-500',
    },
    {
      id: 5,
      name: 'Amee Masarani',
      department: 'Design Team',
      badge: 'M',
      badgeColor: 'bg-blue-500',
    },
  ];

  const allTeams = [
    { id: 1, name: 'Development Team', memberIds: [1, 2, 3], members: 3 },
    { id: 2, name: 'Design Team', memberIds: [4, 5], members: 2 },
    { id: 3, name: 'Marketing Team', memberIds: [8], members: 1 },
  ];

  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTeams = allTeams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

   const toggleTeamSelection = (teamId) => {
    const team = allTeams.find((t) => t.id === teamId);
    if (!team) return;

    setSelectedTeams((prev) => {
      const isCurrentlySelected = prev.includes(teamId);

      if (isCurrentlySelected) {
        setSelectedUsers((users) =>
          users.filter((userId) => !team.memberIds.includes(userId)),
        );
        return prev.filter((id) => id !== teamId);
      } else {
        setSelectedUsers((users) => {
          const newUsers = [...users];
          team.memberIds.forEach((memberId) => {
            if (!newUsers.includes(memberId)) {
              newUsers.push(memberId);
            }
          });
          return newUsers;
        });
        return [...prev, teamId];
      }
    });
  };

  const handleAssign = () => {
    setFormData({ ...formData, assignedUsers: selectedUsers });
    setShowAssignModal(false);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    console.log('Create Issue:', formData);
    onClose();
  };

  return (
    <>
      <SidebarModal
  isOpen={isOpen}
  onClose={onClose}
  title="Create Issue"
  width="lg"
>
        <div className="space-y-5 pb-6">
          {/* Selected Outlet */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Selected Outlet<span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.outlet}
              onValueChange={(value) =>
                setFormData({ ...formData, outlet: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahd">ahd</SelectItem>
                <SelectItem value="blr">blr</SelectItem>
                <SelectItem value="mum">mum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Issue Name */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Issue Name<span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter issue name"
              value={formData.issueName}
              onChange={(e) =>
                setFormData({ ...formData, issueName: e.target.value })
              }
            />
           
          </div>

          {/* Assign User */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Assign User<span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => setShowAssignModal(true)}
              className="p-2.5 border rounded-md cursor-pointer hover:border-blue-700 transition-colors min-h-[42px] flex items-center"
            >
              {formData.assignedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {formData.assignedUsers.map((userId) => {
                    const user = allUsers.find((u) => u.id === userId);
                    return (
                      <span
                        key={userId}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        {user?.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select User</span>
              )}
            </div>
          </div>

          {/* Set Priority */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Set priority
            </label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">— None</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SOP/Description */}
          <div>
            <label className="text-sm font-medium block mb-2">
              SOP/Description
            </label>
            <div className="border rounded-md">
              <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                  <FileText className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                  <Image className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                  <Mic className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <Textarea
                placeholder="Type your description here..."
                className="border-0 focus-visible:ring-0 resize-none"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#005BA8] hover:bg-[#005BA8] text-white"
          >
            Create Issue
          </Button>
        </div>
      </SidebarModal>

      {/* Assign Users Modal (reusing AddTask style) */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                      <h3 className="text-lg font-semibold">Assign</h3>
                      <button
                        onClick={() => {
                          setShowAssignModal(false);
                          setSearchQuery('');
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
        
                    {/* Tabs */}
                    <div className="flex border-b flex-shrink-0">
                      <button
                        onClick={() => setAssignModalTab('users')}
                        className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          assignModalTab === 'users'
                            ? 'border-blue-600 text-blue-800'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Assign Users
                      </button>
                      <button
                        onClick={() => setAssignModalTab('teams')}
                        className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          assignModalTab === 'teams'
                            ? 'border-blue-600 text-blue-800'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Assign Teams
                      </button>
                    </div>
        
                    {/* Search Bar */}
                    <div className="p-4 border-b flex-shrink-0">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <Input
                          type="text"
                          placeholder="Search by name, phone, email or r..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
        
                    {/* Content - Scrollable */}
                    <div className="p-4 overflow-y-auto flex-1">
                      {assignModalTab === 'users' ? (
                        <div className="space-y-2">
                          {filteredUsers.map((user) => {
                            const isChecked = selectedUsers.includes(user.id);
                            return (
                              <label
                                key={user.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleUserSelection(user.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {user.name}
                                    </span>
                                    <span
                                      className={`${user.badgeColor} text-white text-xs w-5 h-5 rounded-full flex items-center justify-center`}
                                    >
                                      {user.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {user.department}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredTeams.map((team) => {
                            const isChecked = selectedTeams.includes(team.id);
                            return (
                              <label
                                key={team.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleTeamSelection(team.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                                />
                                <div className="flex-1">
                                  <span className="font-medium text-sm block">
                                    {team.name}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {team.members} members
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
        
                    {/* Footer - Fixed */}
                    <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAssignModal(false);
                          setSearchQuery('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAssign}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
      )}
    </>
  );
};

export default AddIssue;