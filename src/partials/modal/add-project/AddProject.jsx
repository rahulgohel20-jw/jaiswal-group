'use client';

import React, { useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  FileText,
  FolderKanban,
  Grid3x3,
  Hash,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Tag,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AssignUserModal from '../../../components/ui/Assignusermodal';
import SidebarModal from '../../../components/ui/sidebar';
import AddProjectTag from './AddProjectTag';

// Mock data for users and teams
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

const AddProject = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    outlet: '',
    projectName: '',
    projectTag: '',
    description: '',
    assignUser: '',
    assignedUsers: [],
    assignedTeams: [],
    attachedFiles: [],
    customFields: [],
  });

  const [dragActive, setDragActive] = useState(false);
  const [customFieldTypes, setCustomFieldTypes] = useState([
    'Text',
    'Number',
    'Email',
    'Phone',
    'Date',
  ]);
  const [newFieldTypeName, setNewFieldTypeName] = useState('');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [projectTags, setProjectTags] = useState([
    {
      id: '1',
      name: 'Development',
      value: 'development',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
    },
    {
      id: '2',
      name: 'Design',
      value: 'design',
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
    },
    {
      id: '3',
      name: 'Marketing',
      value: 'marketing',
      color: 'bg-green-500',
      textColor: 'text-green-500',
    },
    {
      id: '4',
      name: 'Research',
      value: 'research',
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
    },
  ]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // File upload handlers
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const validTypes = [
        'image/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/',
        'application/zip',
      ];

      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Max size is 50MB.`);
        return false;
      }

      if (!validTypes.some((type) => file.type.startsWith(type))) {
        alert(`File ${file.name} has an unsupported format.`);
        return false;
      }

      return true;
    });

    setFormData((prev) => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...validFiles],
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((_, i) => i !== index),
    }));
  };

  // Custom fields handlers
  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { label: '', type: 'Text', value: '' },
      ],
    }));
  };

  const updateCustomField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  const getFieldTypeIcon = (type) => {
    switch (type) {
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'Phone':
        return <Phone className="w-4 h-4" />;
      case 'Date':
        return <Calendar className="w-4 h-4" />;
      case 'Number':
        return <Hash className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleTagsUpdate = (updatedTags) => {
    setProjectTags(updatedTags);
  };

  const handleAssignUsersAndTeams = (selectedIds) => {
    // Separate user IDs from team IDs
    const userIds = selectedIds.filter((id) =>
      usersData.some((user) => user.id === id),
    );
    const teamIds = selectedIds.filter((id) =>
      teamsData.some((team) => team.id === id),
    );

    setFormData((prev) => ({
      ...prev,
      assignUser: userIds.length > 0 ? userIds[0] : '',
      assignedUsers: userIds,
      assignedTeams: teamIds,
    }));
  };

  const removeUser = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.filter((id) => id !== userId),
      assignUser: prev.assignedUsers.filter((id) => id !== userId)[0] || '',
    }));
  };

  const removeTeam = (teamId) => {
    setFormData((prev) => ({
      ...prev,
      assignedTeams: prev.assignedTeams.filter((id) => id !== teamId),
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (
      !formData.outlet ||
      !formData.projectName ||
      !formData.projectTag ||
      (formData.assignedUsers.length === 0 &&
        formData.assignedTeams.length === 0)
    ) {
      alert('Please fill in all required fields');
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }

    // Reset form
    setFormData({
      outlet: '',
      projectName: '',
      projectTag: '',
      description: '',
      assignUser: '',
      assignedUsers: [],
      assignedTeams: [],
      attachedFiles: [],
      customFields: [],
    });
    setNewFieldTypeName('');

    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      outlet: '',
      projectName: '',
      projectTag: '',
      description: '',
      assignUser: '',
      assignedUsers: [],
      assignedTeams: [],
      attachedFiles: [],
      customFields: [],
    });
    setNewFieldTypeName('');

    onClose();
  };
  const getAssignDisplayText = () => {
    const userCount = formData.assignedUsers.length;
    const teamCount = formData.assignedTeams.length;

    if (userCount === 0 && teamCount === 0) {
      return 'Select User';
    }

    // If only 1 user & no team → show name
    if (userCount === 1 && teamCount === 0) {
      const user = usersData.find((u) => u.id === formData.assignedUsers[0]);
      return user?.name || 'Select User';
    }

    const parts = [];
    if (userCount > 0)
      parts.push(`${userCount} User${userCount > 1 ? 's' : ''}`);
    if (teamCount > 0)
      parts.push(`${teamCount} Team${teamCount > 1 ? 's' : ''}`);

    return parts.join(' & ');
  };

  return (
    <>
      <SidebarModal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Project"
        width="2xl"
      >
        <div className="flex flex-col h-full">
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-6 py-2">
              {/* Select Outlet */}
              <div className="space-y-2">
                <Label
                  htmlFor="outlet"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-gray-500" />
                  Events<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.outlet}
                  onValueChange={(value) => handleInputChange('outlet', value)}
                >
                  <SelectTrigger
                    id="outlet"
                    className="w-full h-11 border-gray-300"
                  >
                    <SelectValue placeholder="Select outlet location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ahd">Kamleshbhai - Function</SelectItem>
                    <SelectItem value="mumbai">
                      Paritoshbhai Mehta - Wedding
                    </SelectItem>
                    <SelectItem value="delhi">
                      Ketanbhai Bhatt - Function
                    </SelectItem>
                    <SelectItem value="bangalore">
                      Shambhu Bhai (Dayadji) - Function
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Name & Tag Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="projectName"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <FolderKanban className="w-4 h-4 text-gray-500" />
                    Project Name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="Enter project name"
                    value={formData.projectName}
                    onChange={(e) =>
                      handleInputChange('projectName', e.target.value)
                    }
                    className="w-full h-11 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="projectTag"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <Tag className="w-4 h-4 text-gray-500" />
                    Select Project Tag<span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.projectTag}
                      onValueChange={(value) =>
                        handleInputChange('projectTag', value)
                      }
                    >
                      <SelectTrigger
                        id="projectTag"
                        className="flex-1 h-11 border-gray-300"
                      >
                        <SelectValue placeholder="Select tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTags.map((tag) => (
                          <SelectItem
                            key={tag.id}
                            value={tag.value || tag.name.toLowerCase()}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-3 h-3 rounded-full',
                                  tag.color,
                                )}
                              />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsTagModalOpen(true)}
                      className="h-11 w-11 border-gray-300 hover:bg-gray-50 flex-shrink-0"
                      title="Manage tags"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add project description..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  className="w-full min-h-[100px] resize-none border-gray-300"
                />
              </div>

              {/* Assign Users & Teams */}
              <div className="space-y-2">
                <Label
                  htmlFor="assignUser"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-gray-500" />
                  Assign Users & Teams<span className="text-red-500">*</span>
                </Label>

                {/* AssignUserModal Component (Popover style) */}
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value="Select User"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="w-full h-11 px-4 border rounded-lg cursor-pointer"
                  />

                  {isAssignModalOpen && (
                    <AssignUserModal
                      isOpen={isAssignModalOpen}
                      onClose={() => setIsAssignModalOpen(false)}
                      onAssign={handleAssignUsersAndTeams}
                      selectedUsers={[
                        ...formData.assignedUsers,
                        ...formData.assignedTeams,
                      ]}
                    />
                  )}
                </div>

                {/* Selected Users and Teams Display */}
                {(formData.assignedUsers.length > 0 ||
                  formData.assignedTeams.length > 0) && (
                  <div className="border border-gray-300 rounded-lg p-3 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {/* Display Selected Users */}
                      {formData.assignedUsers.map((userId) => {
                        const user = usersData.find(
                          (item) => item.id === userId,
                        );
                        if (!user) return null;

                        return (
                          <div
                            key={userId}
                            className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 group hover:bg-green-100 transition-colors"
                          >
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                                user.avatarColor,
                              )}
                            >
                              {user.avatar}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {user.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeUser(userId)}
                              className="p-0.5 hover:bg-green-200 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-green-700" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Display Selected Teams */}
                      {formData.assignedTeams.map((teamId) => {
                        const team = teamsData.find(
                          (item) => item.id === teamId,
                        );
                        if (!team) return null;

                        return (
                          <div
                            key={teamId}
                            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 group hover:bg-blue-100 transition-colors"
                          >
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0',
                                team.avatarColor,
                              )}
                            >
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {team.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {team.members} members
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTeam(teamId)}
                              className="p-0.5 hover:bg-blue-200 rounded transition-colors ml-1"
                            >
                              <X className="w-3.5 h-3.5 text-blue-700" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  Attach Files
                </Label>

                {/* Drag & Drop Area */}
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                    dragActive
                      ? 'border-green-500 bg-green-50/50'
                      : 'border-gray-300 bg-gray-50/50 hover:bg-gray-100/50',
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                  />
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      Drag & Drop Files or{' '}
                      <label
                        htmlFor="file-upload"
                        className="text-primary hover:text-green-700 cursor-pointer underline"
                      >
                        Browse
                      </label>
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported: Images, PDF, Word, Excel, Text, CSV, ZIP (Max
                      50MB)
                    </p>
                  </div>
                </div>

                {/* Uploaded Files List */}
                {formData.attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-600">
                              {file.name.split('.').pop().toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 group"
                        >
                          <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Fields Section */}
              <div className="space-y-3 pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Grid3x3 className="w-4 h-4 text-gray-500" />
                    Custom Fields ({formData.customFields.length}/5)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                    disabled={formData.customFields.length >= 5}
                    className="h-9 text-primary border-primary hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Fields
                  </Button>
                </div>

                {formData.customFields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <Grid3x3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No custom fields added yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Add Fields" to create custom fields
                    </p>
                  </div>
                )}

                {formData.customFields.map((field, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                  >
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-4">
                        <Label className="text-xs text-gray-600 mb-1.5 block">
                          Field Label
                        </Label>
                        <Input
                          placeholder="e.g., Project Code"
                          value={field.label}
                          onChange={(e) =>
                            updateCustomField(index, 'label', e.target.value)
                          }
                          className="w-full h-10 border-gray-300"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600 mb-1.5 block">
                          Field Type
                        </Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => {
                            updateCustomField(index, 'type', value);
                          }}
                        >
                          <SelectTrigger className="w-full h-10 border-gray-300">
                            <div className="flex items-center gap-2">
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {customFieldTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  {getFieldTypeIcon(type)}
                                  {type}
                                </div>
                              </SelectItem>
                            ))}

                            {/* Add New Field Type Section */}
                            <div className="px-2 py-2 mt-1">
                              <div className="flex gap-2 items-center">
                                <Input
                                  placeholder="Enter new field type"
                                  value={newFieldTypeName}
                                  onChange={(e) =>
                                    setNewFieldTypeName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (
                                        newFieldTypeName.trim() &&
                                        !customFieldTypes.includes(
                                          newFieldTypeName.trim(),
                                        )
                                      ) {
                                        const newType = newFieldTypeName.trim();
                                        setCustomFieldTypes([
                                          ...customFieldTypes,
                                          newType,
                                        ]);
                                        updateCustomField(
                                          index,
                                          'type',
                                          newType,
                                        );
                                        setNewFieldTypeName('');
                                      }
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 h-9 text-sm"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      newFieldTypeName.trim() &&
                                      !customFieldTypes.includes(
                                        newFieldTypeName.trim(),
                                      )
                                    ) {
                                      const newType = newFieldTypeName.trim();
                                      setCustomFieldTypes([
                                        ...customFieldTypes,
                                        newType,
                                      ]);
                                      updateCustomField(index, 'type', newType);
                                      setNewFieldTypeName('');
                                    }
                                  }}
                                  className="h-9 w-9 p-0 bg-white hover:bg-gray-100 text-gray-600 border border-gray-300"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs text-gray-600 mb-1.5 block">
                          Value
                        </Label>
                        <Input
                          placeholder={`Enter ${field.type.toLowerCase()} value`}
                          value={field.value}
                          onChange={(e) =>
                            updateCustomField(index, 'value', e.target.value)
                          }
                          type={
                            field.type === 'Number'
                              ? 'number'
                              : field.type === 'Date'
                                ? 'date'
                                : field.type === 'Email'
                                  ? 'email'
                                  : 'text'
                          }
                          className="w-full h-10 border-gray-300"
                        />
                      </div>
                      <div className="col-span-1 flex items-end h-full pb-0.5">
                        <button
                          onClick={() => removeCustomField(index)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group w-full"
                          title="Remove field"
                        >
                          <X className="w-4 h-4 text-gray-400 group-hover:text-red-500 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t bg-white -mx-6 px-6 py-4 flex items-center justify-end gap-3 mt-auto">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="min-w-[100px] h-10 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="min-w-[140px] h-10 bg-primary hover:bg-green-700 text-white shadow-sm"
            >
              Create Project
            </Button>
          </div>
        </div>
      </SidebarModal>

      {/* Add Project Tag Modal */}
      <AddProjectTag
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSubmit={handleTagsUpdate}
        existingTags={projectTags}
      />
    </>
  );
};

export default AddProject;
