'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Pencil,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';
import {
  addDepartmentMaster,
  deleteDepartmentMasterById,
  getAllDepartmentMaster,
  updateDepartmentMaster,
} from '@/services/apiServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Container } from '@/components/common/container';
import AddDepartmentModal from './AddDepartmentModal';
import DepartmentDetailsModal from './DepartmentDetailsModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useNavigate } from 'react-router';

const PAGE_SIZE = 5;

// Backend sends createdAt as "DD/MM/YYYY" (e.g. "06/08/2026" = 06 Aug 2026).
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

const mapDepartment = (d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  totalEmployees: d.totalEmployees ?? 0,
  createdAt: d.createdAt ?? null,
  createdDate: formatCreatedAt(d.createdAt),
});

const Departmentlist = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Departments');

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null); // null = "add" mode

  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllDepartmentMaster();
      const list =
        res?.data?.data?.['Department Details'] ?? res?.data?.data ?? res?.data ?? [];
      setDepartments(Array.isArray(list) ? list.map(mapDepartment) : []);
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to load departments.';
      setError(serverMsg);
      notify.error(serverMsg);
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
      department.name?.toLowerCase().includes(searchTerm.trim().toLowerCase()),
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

    try {
      if (editingDepartment) {
        await updateDepartmentMaster({
          id: editingDepartment.id,
          name,
          description: description || undefined,
        });
        notify.success('Department updated successfully');
      } else {
        await addDepartmentMaster({
          name,
          description: description || undefined,
        });
        notify.success('Department added successfully');
      }
      await fetchDepartments();
      if (!addAnother) {
        setIsAddOpen(false);
        setEditingDepartment(null);
      }
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to save department.';
      setError(serverMsg);
      notify.error(serverMsg);
    }
  };

  // Step 1: user clicks the trash icon -> open the confirm modal
  const openDeleteConfirm = (dept) => {
    setDeletingDepartment(dept);
    setIsDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return; // don't allow closing mid-request
    setIsDeleteOpen(false);
    setDeletingDepartment(null);
  };

  // Step 2: user confirms inside the modal -> actually delete
  const handleConfirmDelete = async () => {
    if (!deletingDepartment) return;
    const id = deletingDepartment.id;

    setDeleting(true);
    const prev = departments;
    setDepartments((cur) => cur.filter((d) => d.id !== id)); // optimistic

    try {
      await deleteDepartmentMasterById(id);
      notify.success('Department deleted successfully');
      setIsDeleteOpen(false);
      setDeletingDepartment(null);
    } catch (err) {
      console.error(err);
      setDepartments(prev); // rollback
      const serverMsg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        (err?.response?.data?.msg && err.response.data.msg !== 'FAILED' ? err.response.data.msg : null) ||
        'Failed to delete department.';
      setError(serverMsg);
      notify.error(serverMsg);
    } finally {
      setDeleting(false);
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

  if (!canView) {
    return <AccessDenied pageTitle="Departments" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Department Master"
          actions={
            canAdd && (
              <HeaderActionButton
                onClick={() => {
                  setEditingDepartment(null);
                  setIsAddOpen(true);
                }}
              >
                Create Department
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={fetchDepartments}
        />

        <div className="w-full">
          <SearchBar
            placeholder="Search Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            isStandalone={true}
          />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
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
                    colSpan={3}
                    className="text-center py-10 text-sm text-[#737781]"
                  >
                    Loading departments...
                  </td>
                </tr>
              ) : pageDepartments.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
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
                    <td className="px-4 py-3 text-[#737781]">
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
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(dept)}
                            className="text-gray-500 hover:text-blue-600 cursor-pointer"
                            aria-label={`Edit ${dept.name}`}
                          >
                            <SquarePen size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(dept)}
                            className="text-red-300 hover:text-red-600 cursor-pointer"
                            aria-label={`Delete ${dept.name}`}
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
        <DeleteConfirmModal
          isOpen={isDeleteOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleConfirmDelete}
          itemLabel={deletingDepartment?.name}
          saving={deleting}
          title="Delete Department"
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
      <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{value}</span>
    </div>
  </div>
);

export default Departmentlist;