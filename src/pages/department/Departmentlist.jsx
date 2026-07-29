'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Boxes, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye,
    History, Pencil, Plus, Search, SquarePen, Trash2, XCircle,
} from 'lucide-react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddDepartmentModal from './AddDepartmentModal';
import DepartmentDetailsModal from './DepartmentDetailsModal';
import {
    getAllDepartments,
    saveDepartment,
    updateDepartment,
    deleteDepartmentById,
} from '@/services/apiServices';
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";

const PAGE_SIZE = 5;

// Map backend shape -> the shape this UI already expects
const mapDepartment = (d) => ({
    id: d.id,
    name: d.departmentName,
    description: d.description || 'Organization Unit',
    status: d.isActive ? 'Active' : 'Inactive',
    totalEmployees: d.totalEmployees ?? 0,
    organizationId: d.id ?? d.organizationUnitId ?? null,
    createdAt: d.createdAt ?? null,
    createdDate: d.createdDate
        ? new Date(d.createdDate).toLocaleDateString('en-US', {
            month: 'short', day: '2-digit', year: 'numeric',
        })
        : '—',
});

const Departmentlist = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [editingDepartment, setEditingDepartment] = useState(null); // null = "add" mode

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getAllDepartments();
            const list = res?.data?.data ?? res?.data ?? [];
            setDepartments(list.map(mapDepartment));
        } catch (err) {
            console.error(err);
            setError(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to load departments.',
            );
            notify.error('Failed to load departments.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const stats = useMemo(() => {
        const total = departments.length;
        const active = departments.filter((d) => d.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [departments]);

    const filteredDepartments = useMemo(() => {
        return departments.filter((department) => {
            const matchesSearch =
                department.name
                    .toLowerCase()
                    .includes(searchTerm.trim().toLowerCase());

            const matchesStatus =
                statusFilter === "all" ||
                department.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [departments, searchTerm, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageDepartments = filteredDepartments.slice(pageStart, pageStart + PAGE_SIZE);

    const handleSaveDepartment = async (form, { addAnother } = {}) => {
        // Pull org context however your app currently determines it —
        // e.g. from localStorage set at login, or a user/session context.
        const username = localStorage.getItem('username') || '';
        const isActive = form.status === 'Active';
        const departmentName = (form.name ?? form.departmentName ?? '').trim();
        const description = (form.description ?? '').trim();
        const organizationId =
            form.organizationId ?? (Number(localStorage.getItem('organizationId')) || 1);

        try {
            if (editingDepartment) {
                await updateDepartment({
                    id: editingDepartment.id,
                    departmentName,
                    isActive,
                    description,
                    organizationId,
                    username,
                });
                notify.success('Update Department successfully');
            } else {
                await saveDepartment({
                    departmentName,
                    description: description || 'Organization Unit',
                    organizationId,
                    isActive,
                    username: username || 'User',
                });
                notify.success('Department Added successfully');
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
                'Failed to save department.',
            );
            notify.error('Failed to save department.');
        }
    };

    const handleDelete = async (id) => {
        const prev = departments;
        setDepartments((cur) => cur.filter((d) => d.id !== id)); // optimistic
        try {
            await deleteDepartmentById(id);
            notify.success("Department Deleted successfully");
        } catch (err) {
            console.error(err);
            setDepartments(prev); // rollback
            setError(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to delete department.',
            );
            notify.error('Failed to delete department.');
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
                            Manage all organizational departments for efficient asset allocation.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export Data
                        </Button>
                        <Button
                            onClick={() => { setEditingDepartment(null); setIsAddOpen(true); }}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard icon={<Boxes size={15} />} iconBg="bg-[#D5E3FF]" iconColor="text-[#00376C]" label="TOTAL" title="Total Departments" value={stats.total} />
                    <StatCard icon={<CheckCircle2 size={15} />} iconBg="bg-green-100" iconColor="text-green-700" label="ACTIVE" title="Active Units" value={String(stats.active).padStart(2, '0')} />
                    <StatCard icon={<XCircle size={15} />} iconBg="bg-gray-100" iconColor="text-gray-500" label="PAUSED" title="Inactive Units" value={String(stats.inactive).padStart(2, '0')} />
                    <StatCard icon={<History size={15} />} iconBg="bg-[#D5E3FF]" iconColor="text-[#00376C]" label="STATUS" title="Last Updated" value="Today" />
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4 flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="w-full md:w-1/2">
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

                    {/* Status Filter */}
                    <div className="w-full md:w-1/2">
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                            <tr>
                                <th className="w-10 px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">S.NO</th>
                                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">Department Name</th>
                                <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-10 text-sm text-[#737781]">Loading departments...</td></tr>
                            ) : pageDepartments.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-sm text-[#737781]">No departments match your search or filter.</td></tr>
                            ) : (
                                pageDepartments.map((dept, idx) => (
                                    <tr key={dept.id} className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC]">
                                        <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="px-2 py-3 text-[#737781]">{String(pageStart + idx + 1).padStart(2, '0')}</td>
                                        <td className="px-2 py-3">
                                            <p className="font-semibold text-[#1B1B1F]">{dept.name}</p>
                                            <p className="text-xs text-[#9CA3AF]">{dept.description}</p>
                                        </td>
                                        <td className="px-2 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${dept.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${dept.status === 'Active' ? 'bg-green-600' : 'bg-gray-500'}`} />
                                                {dept.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-3">
                                                <button type="button" onClick={() => openDetails(dept)} className="text-gray-500 hover:text-green-600 cursor-pointer"  aria-label={`View ${dept.name}`}>
                                                    <Eye size={18} />
                                                </button>
                                                <button type="button" onClick={() => openEdit(dept)} className="text-gray-500 hover:text-blue-600 cursor-pointer" aria-label={`Edit ${dept.name}`}>
                                                    <SquarePen size={18} />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(dept.id)} className="text-red-300 hover:text-red-600 cursor-pointer" aria-label={`Delete ${dept.name}`}>
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
                            {String(Math.min(pageStart + PAGE_SIZE, filteredDepartments.length)).padStart(2, '0')}{' '}
                            of {filteredDepartments.length} entries
                        </p>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium cursor-pointer ${page === currentPage ? 'bg-primary text-white' : 'border border-[#E5E7EB] text-[#43474F] hover:bg-gray-50'}`}>
                                    {page}
                                </button>
                            ))}
                            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
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
            <div className={`w-6 h-6 rounded ${iconBg} ${iconColor} flex items-center justify-center mb-3`}>{icon}</div>
            <p className="text-xs text-[#737781]">{title}</p>
            <p className="text-xl font-bold text-[#1B1B1F] mt-0.5">{value}</p>
        </div>
        <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{label}</span>
    </div>
);

export default Departmentlist;