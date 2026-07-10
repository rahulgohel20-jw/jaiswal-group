'use client';

import { useState } from 'react';
import { Camera, ChevronUp, ChevronDown, Bell, Star } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Container } from '@/components/common/container';
import { useNavigate, useLocation } from 'react-router';

// ─── Hook: pull edit state from router ────────────────────────────────────────
const useEditState = () => {
  const location = useLocation();
  return {
    isEdit: location.state?.isEdit ?? false,
    editUserData: location.state?.editUserData ?? null,
  };
};

// ─── Collapsible User Rights Card ─────────────────────────────────────────────
const RightsCard = ({ icon, title, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50/60 transition cursor-pointer border-0"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
          <span className="text-gray-400">{icon}</span>
          {title}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="bg-gray-50/50 divide-y divide-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Single Rights Row ─────────────────────────────────────────────────────────
const RightsRow = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between px-5 py-3.5">
    <span className="text-sm text-gray-600">{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary"
    />
  </div>
);

// ─── User Rights Section ───────────────────────────────────────────────────────
const UserRights = ({ rights, onChange }) => (
  <div className="mt-8">
    <h3 className="text-base font-semibold text-gray-800 mb-4">User Rights</h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Notification Centre */}
      <RightsCard icon={<Bell className="w-4 h-4" />} title="Notification centre">
        <RightsRow
          label="Push notification"
          checked={rights.pushNotification}
          onChange={(v) => onChange('pushNotification', v)}
        />
        <RightsRow
          label="Email notification"
          checked={rights.emailNotification}
          onChange={(v) => onChange('emailNotification', v)}
        />
        <RightsRow
          label="What's app notification"
          checked={rights.whatsappNotification}
          onChange={(v) => onChange('whatsappNotification', v)}
        />
      </RightsCard>

      {/* Point Allocation */}
      <RightsCard icon={<Star className="w-4 h-4" />} title="Point allocation">
        <RightsRow
          label="View Points of Other Users"
          checked={rights.viewOtherPoints}
          onChange={(v) => onChange('viewOtherPoints', v)}
        />
      </RightsCard>
    </div>
  </div>
);

// ─── Main AddUser / EditUser Component ────────────────────────────────────────
export function AddUser() {
  const router = useNavigate();
  const { isEdit, editUserData } = useEditState();

  const [formData, setFormData] = useState({
    name: editUserData?.name ?? '',
    role: editUserData?.role ?? '',
    phoneNumber: editUserData?.phoneNumber ?? '',
    countryCode: 'IN',
    email: editUserData?.email ?? '',
    employeeCode: editUserData?.employeeCode ?? '784JEMGN',
    outlet: editUserData?.outlet ?? '',
    team: editUserData?.team ?? '',
    designation: editUserData?.designation ?? '',
    status: editUserData?.status ?? true,
    avatar: editUserData?.avatar ?? null,
  });

  const [rights, setRights] = useState({
    pushNotification: true,
    emailNotification: false,
    whatsappNotification: false,
    viewOtherPoints: false,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRightsChange = (field, value) => {
    setRights((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData, rights);
    router('/user-management');
  };

  const handleCancel = () => {
    router('/user-management');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleInputChange('avatar', reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Container>
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Form Content */}
          <div className="p-8">
            <div className="grid grid-cols-[320px_1fr] gap-12">
              {/* Left Side - Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300">
                      <div className="w-20 h-20 rounded-lg bg-white flex items-center justify-center mb-2">
                        <Camera className="w-10 h-10 text-gray-300" />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Camera className="w-4 h-4" />
                  Add image
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Right Side - Form Fields */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-6">Basic Details</h3>

                  {/* Full Name and User Role */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="fullName" className="text-sm text-gray-500 font-normal mb-2 block">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userRole" className="text-sm text-gray-500 font-normal mb-2 block">
                        User role
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => handleInputChange('role', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Mobile Number and Email */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="mobileNumber" className="text-sm text-gray-500 font-normal mb-2 block">
                        Mobile number
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.countryCode}
                          onValueChange={(value) => handleInputChange('countryCode', value)}
                        >
                          <SelectTrigger className="w-28 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">IN</SelectItem>
                            <SelectItem value="US">US</SelectItem>
                            <SelectItem value="UK">UK</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="mobileNumber"
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          placeholder="Enter mobile number"
                          className="flex-1 h-11"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm text-gray-500 font-normal mb-2 block">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Employee Code */}
                  <div className="mb-6">
                    <Label htmlFor="employeeCode" className="text-sm text-gray-500 font-normal mb-2 block">
                      Employee Code
                    </Label>
                    <Input
                      id="employeeCode"
                      value={formData.employeeCode}
                      onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                      placeholder="784JEMGN"
                      className="h-11"
                    />
                  </div>

                  {/* Outlet */}
                  <div className="mb-6">
                    <Label htmlFor="outlet" className="text-sm text-gray-500 font-normal mb-2 block">
                      Outlet
                    </Label>
                    <div className="flex items-center gap-3 border rounded-md px-4 py-3 text-gray-400 h-11 cursor-pointer hover:border-gray-400 transition-colors">
                      <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm">Select outlet</span>
                    </div>
                  </div>

                  {/* Team and Designation */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <Label htmlFor="team" className="text-sm text-gray-500 font-normal mb-2 block">
                        Team
                      </Label>
                      <Select
                        value={formData.team}
                        onValueChange={(value) => handleInputChange('team', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select Team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT Department">IT Department</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="designation" className="text-sm text-gray-500 font-normal mb-2 block">
                        Designation
                      </Label>
                      <Select
                        value={formData.designation}
                        onValueChange={(value) => handleInputChange('designation', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select Designation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                          <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                          <SelectItem value="Senior Java Developer">Senior Java Developer</SelectItem>
                          <SelectItem value="Mobile Application Developer">Mobile Application Developer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <Label className="text-sm text-gray-500 font-normal mb-3 block">
                      Status of user
                    </Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.status}
                        onCheckedChange={(checked) => handleInputChange('status', checked)}
                        className="data-[state=checked]:bg-[#005BA8]"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base">Active</span>
                        <span className="text-sm text-gray-400">
                          The user is available in outlet
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── User Rights — only on edit ── */}
                {isEdit && (
                  <UserRights rights={rights} onChange={handleRightsChange} />
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 px-8 py-5 bg-blue-50 border-t">
            <Button variant="outline" onClick={handleCancel} className="px-6 h-11">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#005BA8] hover:bg-[#005BA8] text-white px-6 h-11"
            >
              {isEdit ? 'Update user' : 'Add user'}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}