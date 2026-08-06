'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  Pencil,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import {
  addRoleMaster,
  deleteRoleMasterById,
  getAllRoleMasterByUserId,
  updateRoleMaster,
} from '@/services/apiServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Container } from '@/components/common/container';
import AddDepartmentModal from './AddDepartmentModal';
import DepartmentDetailsModal from './DepartmentDetailsModal';

const PAGE_SIZE = 5;

// Backend sends createdAt as "DD/MM/YYYY" (e.g. "06/08/2026" = 06 Aug 2026).
// new Date("06/08/2026") would misparse this as MM/DD/YYYY (8 June), so
// we split it manually instead of trusting the Date constructor.
const formatCreatedAt = (value) => {
  if (!value) return '—';
  const parts = String(value).split('/');
  if (parts.length !== 3) return value;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return value;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

// Map Role Master backend shape -> the shape this UI already expects.
// Confirmed response shape from GET /rolemaster/getall:
//   { msg, success, data: { "Role Details": [ { id, name, description, createdAt }, ... ] } }
// `description` can come back as null. `createdAt` is a DD/MM/YYYY string.
const mapDepartment = (d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  totalEmployees: d.totalEmployees ?? 0,
  createdAt: d.createdAt ?? null,
  createdDate: formatCreatedAt(d.createdAt),
});

const Departmentlist = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null); // null = "add" mode

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userId = getUserIdFromToken();
      const res = await getAllRoleMasterByUserId(userId);
      // Confirmed shape: res.data.data["Role Details"] is the array.
      // Falling back to a couple of looser shapes just in case the
      // backend changes the wrapper key later.
      const list =
        res?.data?.data?.['Role Details'] ?? res?.data?.data ?? res?.data ?? [];
      setDepartments(list.map(mapDepartment));
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Failed to load roles.',
      );
      notify.error('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const stats = useMemo(() => {
    const total = departments.length;
    return { total };
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) =>
      department.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    );
  }, [departments, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / PAGE_SIZE),
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageDepartments = filteredDepartments.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const handleSaveDepartment = async (form, { addAnother } = {}) => {
    const name = (form.name ?? form.departmentName ?? '').trim();
    const description = (form.description ?? '').trim();
    // ASSUMPTION: the DB constraint error on add likely means role_master
    // rows are tied to a userId (getall is already scoped by it), even
    // though the Swagger example payload only showed name/description.
    // If this isn't it, check the backend stack trace for the actual
    // column name and swap it in here.
    const userId = getUserIdFromToken();

    try {
      if (editingDepartment) {
        await updateRoleMaster({
          id: editingDepartment.id,
          name,
          description,
          userId,
        });
        notify.success('Role updated successfully');
      } else {
        await addRoleMaster({
          name,
          description: description,
          userId,
        });
        notify.success('Role added successfully');
      }
      await fetchDepartments();
      if (!addAnother) {
        setIsAddOpen(false);
        setEditingDepartment(null);
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Failed to save role.',
      );
      notify.error('Failed to save role.');
    }
  };

  const handleDelete = async (id) => {
    const prev = departments;
    setDepartments((cur) => cur.filter((d) => d.id !== id)); // optimistic
    try {
      await deleteRoleMasterById(id);
      notify.success('Role deleted successfully');
    } catch (err) {
      console.error(err);
      setDepartments(prev); // rollback
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Failed to delete role.',
      );
      notify.error('Failed to delete role.');
    }
  };

  const openDetails = (dept) => {
    setSelectedDepartment(dept);
    setIsDetailsOpen(true);
  };

  const openEdit = (dept) => {
    setEditingDepartment(dept);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setEditingDepartment(null);
  };

  const handleEditFromDetails = (dept) => {
    setIsDetailsOpen(false);
    setEditingDepartment(dept);
    setIsAddOpen(true);
  };

  return (
    <Container>
      <div className="min-h-screen px-6 py-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Asset Management</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Department Master</span>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Department Master</h1>
            <p className="text-sm text-[#737781] mt-1">
              Manage all organizational departments for efficient asset
              allocation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button
              onClick={() => {
                setEditingDepartment(null);
                setIsAddOpen(true);
              }}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Department
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <StatCard
            icon={<Boxes size={15} />}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="TOTAL"
            title="Total Departments"
            value={stats.total}
          />
          <StatCard
            icon={<History size={15} />}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="STATUS"
            title="Last Updated"
            value="Today"
          />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Enter department name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                  S.NO
                </th>
                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                  Department Name
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-sm text-[#737781]"
                  >
                    Loading departments...
                  </td>
                </tr>
              ) : pageDepartments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-sm text-[#737781]"
                  >
                    No departments match your search or filter.
                  </td>
                </tr>
              ) : (
                pageDepartments.map((dept, idx) => (
                  <tr
                    key={dept.id}
                    className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-3 text-[#737781]">
                      {String(pageStart + idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-semibold text-[#1B1B1F]">
                        {dept.name}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {dept.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openDetails(dept)}
                          className="text-gray-500 hover:text-green-600 cursor-pointer"
                          aria-label={`View ${dept.name}`}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(dept)}
                          className="text-gray-500 hover:text-blue-600 cursor-pointer"
                          aria-label={`Edit ${dept.name}`}
                        >
                          <SquarePen size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept.id)}
                          className="text-red-300 hover:text-red-600 cursor-pointer"
                          aria-label={`Delete ${dept.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] text-sm text-[#737781]">
            <p>
              Showing {filteredDepartments.length === 0 ? 0 : pageStart + 1} -{' '}
              {String(
                Math.min(pageStart + PAGE_SIZE, filteredDepartments.length),
              ).padStart(2, '0')}{' '}
              of {filteredDepartments.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium cursor-pointer ${page === currentPage ? 'bg-primary text-white' : 'border border-[#E5E7EB] text-[#43474F] hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <AddDepartmentModal
          isOpen={isAddOpen}
          onClose={closeAddModal}
          onSave={handleSaveDepartment}
          initialData={editingDepartment}
        />
        <DepartmentDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEditFromDetails}
          department={selectedDepartment}
        />
      </div>
    </Container>
  );
};

const StatCard = ({ icon, iconBg, iconColor, label, title, value }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-start justify-between">
    <div>
      <div
        className={`w-6 h-6 rounded ${iconBg} ${iconColor} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-xs text-[#737781]">{title}</p>
      <p className="text-xl font-bold text-[#1B1B1F] mt-0.5">{value}</p>
    </div>
    <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
      {label}
    </span>
  </div>
);

export default Departmentlist;
