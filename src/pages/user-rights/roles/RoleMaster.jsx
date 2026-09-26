'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
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
import { Input } from '@/components/ui/input';
import { Container } from '@/components/common/container';
import AddRoleModal from './AddRoleModal';
import RoleDetailsModal from './RoleDetailsModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useNavigate } from 'react-router';

const PAGE_SIZE = 10;

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

const mapRole = (d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  createdAt: d.createdAt ?? null,
  createdDate: formatCreatedAt(d.createdAt),
});

const RoleMaster = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Roles');

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userId = getUserIdFromToken();
      const res = await getAllRoleMasterByUserId(userId);
      const list =
        res?.data?.data?.['Role Details'] ?? res?.data?.data ?? res?.data ?? [];
      setRoles(list.map(mapRole));
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to load roles.';
      setError(serverMsg);
      notify.error(serverMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const stats = useMemo(() => {
    const total = roles.length;
    return { total };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    return roles.filter((role) =>
      role.name?.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    );
  }, [roles, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / PAGE_SIZE),
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRoles = filteredRoles.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const handleSaveRole = async (form, { addAnother } = {}) => {
    const name = (form.name ?? '').trim();
    const description = (form.description ?? '').trim();
    const userId = getUserIdFromToken();

    try {
      if (editingRole) {
        await updateRoleMaster({
          id: editingRole.id,
          name,
          description,
          userId,
        });
        notify.success('Role updated successfully');
      } else {
        await addRoleMaster({
          name,
          description,
          userId,
        });
        notify.success('Role added successfully');
      }
      await fetchRoles();
      if (!addAnother) {
        setIsAddOpen(false);
        setEditingRole(null);
      }
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to save role.';
      setError(serverMsg);
      notify.error(serverMsg);
    }
  };

  const openDeleteConfirm = (role) => {
    setDeletingRole(role);
    setIsDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setIsDeleteOpen(false);
    setDeletingRole(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;
    const id = deletingRole.id;

    setDeleting(true);
    const prev = roles;
    setRoles((cur) => cur.filter((d) => d.id !== id));

    try {
      await deleteRoleMasterById(id);
      notify.success('Role deleted successfully');
      setIsDeleteOpen(false);
      setDeletingRole(null);
    } catch (err) {
      console.error(err);
      setRoles(prev);
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to delete role.';
      setError(serverMsg);
      notify.error(serverMsg);
    } finally {
      setDeleting(false);
    }
  };

  const openDetails = (role) => {
    setSelectedRole(role);
    setIsDetailsOpen(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setEditingRole(null);
  };

  const handleEditFromDetails = (role) => {
    setIsDetailsOpen(false);
    setEditingRole(role);
    setIsAddOpen(true);
  };

  if (!canView) {
    return <AccessDenied pageTitle="Roles" />;
  }

  return (
    <Container>
      <div className="mx-auto p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mb-2">
          <span className="cursor-pointer" onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={12} />
          <span>Users Rights Master</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Roles</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[18px] sm:text-[20px] font-bold text-[#101828]">Role Master</h1>
          </div>
          {canAdd && (
            <HeaderActionButton
              onClick={() => {
                setEditingRole(null);
                setIsAddOpen(true);
              }}
            >
              Create Role
            </HeaderActionButton>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<Boxes size={16} />}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="TOTAL"
            title="Total Roles"
            value={stats.total}
          />
          <StatCard
            icon={<History size={16} />}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="STATUS"
            title="Last Updated"
            value="Today"
          />
        </div>

        <div className="bg-white mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Enter role name..."
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                  S.NO
                </th>
                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                  Role Name
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
                    colSpan={3}
                    className="text-center py-10 text-sm text-[#737781]"
                  >
                    Loading roles...
                  </td>
                </tr>
              ) : pageRoles.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-10 text-sm text-[#737781]"
                  >
                    No roles match your search or filter.
                  </td>
                </tr>
              ) : (
                pageRoles.map((role, idx) => (
                  <tr
                    key={role.id}
                    className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC]"
                  >
                    <td className="px-4 py-3 text-[#737781]">
                      {String(pageStart + idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-semibold text-[#1B1B1F]">
                        {role.name}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {role.description || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openDetails(role)}
                          className="text-gray-500 hover:text-green-600 cursor-pointer"
                          aria-label={`View ${role.name}`}
                        >
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="text-gray-500 hover:text-blue-600 cursor-pointer"
                            aria-label={`Edit ${role.name}`}
                          >
                            <SquarePen size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(role)}
                            className="text-red-300 hover:text-red-600 cursor-pointer"
                            aria-label={`Delete ${role.name}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] text-sm text-[#737781]">
            <p>
              Showing {filteredRoles.length === 0 ? 0 : pageStart + 1} -{' '}
              {String(
                Math.min(pageStart + PAGE_SIZE, filteredRoles.length),
              ).padStart(2, '0')}{' '}
              of {filteredRoles.length} entries
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

        <AddRoleModal
          isOpen={isAddOpen}
          onClose={closeAddModal}
          onSave={handleSaveRole}
          initialData={editingRole}
        />
        <RoleDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEditFromDetails}
          role={selectedRole}
        />
        <DeleteConfirmModal
          isOpen={isDeleteOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleConfirmDelete}
          itemLabel={deletingRole?.name}
          saving={deleting}
          title="Delete Role"
        />
      </div>
    </Container>
  );
};

const StatCard = ({ icon, iconBg, iconColor, title, value }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div
      className={`w-9 h-9 rounded-xl ${iconBg || 'bg-[#D5E3FF]'} ${iconColor || 'text-[#00376C]'} flex items-center justify-center shrink-0`}
    >
      {icon}
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{title}</span>
      <span className="text-lg sm:text-xl font-bold text-[#1B1B1F] mt-0.5">{value}</span>
    </div>
  </div>
);

export default RoleMaster;
