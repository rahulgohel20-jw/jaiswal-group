'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllRoleMasterByUserId } from '@/services/apiServices';
import { Container } from '@/components/common/container';
import PermissionsModal from './PermissionsModal';

// Backend sends createdAt as "DD/MM/YYYY" (e.g. "06/08/2026" = 06 Aug 2026).
// Reused verbatim from Departmentlist.jsx's date-parsing logic.
const formatCreatedAt = (value) => {
  if (!value) return '—';
  const parts = String(value).split('/');
  if (parts.length !== 3) return value;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return value;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY to match the screenshot
};

// ADJUST: confirm actual field names from GET /department/get-all-active.
// The screenshot's "Role" column (manger, Team leader, demo, IT, new) implies
// each item has at least an id, a name, and a created date.
const mapRole = (d) => ({
  id: d.id,
  name: d.name ?? d.roleName ?? d.departmentName,
  createdAt: d.createdAt ?? d.createdDate ?? null,
  createdDate: formatCreatedAt(d.createdAt ?? d.createdDate),
});

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const UserRights = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // mode: 'rights' | 'reportRights'
  const [permissionsModal, setPermissionsModal] = useState({
    open: false,
    mode: null,
    role: null,
  });

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userId = getUserIdFromToken();
      const res = await getAllRoleMasterByUserId(userId); // Replace 'userId' with the actual user ID
      // ADJUST: confirm actual response wrapper shape — following the same
      // defensive fallback pattern used in Departmentlist.jsx since the two
      // endpoints likely share a response convention.
      const list =
        res?.data?.data?.['Role Details'] ?? res?.data?.data ?? res?.data ?? [];
      setRoles(list.map(mapRole));
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Failed to load roles.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRoles = roles.slice(pageStart, pageStart + pageSize);

  const openRights = (role) =>
    setPermissionsModal({ open: true, mode: 'rights', role });
  const openReportRights = (role) =>
    setPermissionsModal({ open: true, mode: 'reportRights', role });
  const closeModal = () =>
    setPermissionsModal({ open: false, mode: null, role: null });

  return (
    <Container>
      <div className="min-h-screen px-6 py-6">
        <h1 className="text-2xl font-bold text-[#084E92] mb-6">User Rights</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#43474F]">
                  Sr No#
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#43474F]">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#43474F]">
                  Created Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#43474F]">
                  Rights
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-sm text-gray-500"
                  >
                    Loading roles...
                  </td>
                </tr>
              ) : pageRoles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-sm text-gray-500"
                  >
                    No roles found.
                  </td>
                </tr>
              ) : (
                pageRoles.map((role, idx) => (
                  <tr
                    key={role.id}
                    className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC]"
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {pageStart + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{role.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {role.createdDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRights(role)}
                          className="px-4 py-1.5 rounded-md bg-[#084E92] text-white text-sm font-medium hover:bg-[#073e77] cursor-pointer"
                        >
                          Rights
                        </button>
                        <button
                          onClick={() => openReportRights(role)}
                          className="px-4 py-1.5 rounded-md bg-[#16A34A] text-white text-sm font-medium hover:bg-[#128a3e] cursor-pointer"
                        >
                          Report Rights
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] text-sm text-[#737781]">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded-md px-2 py-1 text-sm outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {roles.length === 0 ? 0 : pageStart + 1} -{' '}
                {Math.min(pageStart + pageSize, roles.length)} of {roles.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="w-7 h-7 flex items-center justify-center rounded bg-primary text-white text-xs font-medium">
                  {currentPage}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <PermissionsModal
          isOpen={permissionsModal.open}
          onClose={closeModal}
          role={permissionsModal.role}
          mode={permissionsModal.mode}
        />
      </div>
    </Container>
  );
};

export default UserRights;
