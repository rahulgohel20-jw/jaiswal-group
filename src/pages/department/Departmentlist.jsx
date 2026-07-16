'use client';

import React, { useMemo, useState } from 'react';
import {
    Boxes,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    History,
    Pencil,
    Plus,
    Search,
    Trash2,
    XCircle,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddDepartmentModal from './AddDepartmentModal';
import DepartmentDetailsModal from './DepartmentDetailsModal';

const PAGE_SIZE = 5;

const INITIAL_DEPARTMENTS = [
    { id: 1, name: 'Site Operations', description: 'Core Field Management', status: 'Active', totalEmployees: 48, createdDate: 'Jan 12, 2024' },
    { id: 2, name: 'Management', description: 'Administrative Functions', status: 'Active', totalEmployees: 12, createdDate: 'Jan 15, 2024' },
    { id: 3, name: 'Finance', description: 'Budgeting & Accounts', status: 'Active', totalEmployees: 9, createdDate: 'Feb 02, 2024' },
    { id: 4, name: 'Human Resources', description: 'People & Culture', status: 'Active', totalEmployees: 7, createdDate: 'Feb 18, 2024' },
    { id: 5, name: 'Information Technology', description: 'Systems & Infrastructure', status: 'Inactive', totalEmployees: 15, createdDate: 'Mar 04, 2024' },
    { id: 6, name: 'Procurement', description: 'Vendor & Supply Chain', status: 'Active', totalEmployees: 6, createdDate: 'Mar 22, 2024' },
    { id: 7, name: 'Legal & Compliance', description: 'Contracts & Governance', status: 'Active', totalEmployees: 4, createdDate: 'Apr 09, 2024' },
    { id: 8, name: 'Maintenance', description: 'Asset Upkeep & Repairs', status: 'Active', totalEmployees: 22, createdDate: 'Apr 27, 2024' },
    { id: 9, name: 'Quality Assurance', description: 'Standards & Inspection', status: 'Inactive', totalEmployees: 5, createdDate: 'May 11, 2024' },
    { id: 10, name: 'Logistics', description: 'Transport & Warehousing', status: 'Active', totalEmployees: 18, createdDate: 'Jun 03, 2024' },
    { id: 11, name: 'Customer Support', description: 'Client Relations', status: 'Active', totalEmployees: 11, createdDate: 'Jun 21, 2024' },
    { id: 12, name: 'Research & Development', description: 'Innovation & Planning', status: 'Active', totalEmployees: 8, createdDate: 'Jul 08, 2024' },
];

const DepartmentMaster = () => {
    const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [appliedStatusFilter, setAppliedStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const stats = useMemo(() => {
        const total = departments.length;
        const active = departments.filter((d) => d.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [departments]);

    const filteredDepartments = useMemo(() => {
        return departments.filter((dept) => {
            const matchesSearch = dept.name
                .toLowerCase()
                .includes(appliedSearch.trim().toLowerCase());
            const matchesStatus =
                appliedStatusFilter === 'all' || dept.status === appliedStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [departments, appliedSearch, appliedStatusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageDepartments = filteredDepartments.slice(pageStart, pageStart + PAGE_SIZE);

    const handleApplyFilter = () => {
        setAppliedSearch(searchTerm);
        setAppliedStatusFilter(statusFilter);
        setCurrentPage(1);
    };

    const handleReset = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setAppliedSearch('');
        setAppliedStatusFilter('all');
        setCurrentPage(1);
    };

    const handleSaveDepartment = (form, { addAnother } = {}) => {
        setDepartments((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((d) => d.id)) + 1 : 1,
                name: form.name.trim(),
                description: 'Organization Unit',
                status: form.status,
                totalEmployees: 0,
                createdDate: new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                }),
            },
        ]);
        if (!addAnother) setIsAddOpen(false);
    };

    const handleDelete = (id) => {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
    };

    const openDetails = (dept) => {
        setSelectedDepartment(dept);
        setIsDetailsOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#F7F8FA] px-6 py-6">
            {/* Breadcrumb */}
            <p className="text-xs text-[#737781] mb-2">
                Dashboard / Asset Management /{' '}
                <span className="text-primary font-medium">Department Master</span>
            </p>

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-[#1B1B1F]">Department Master</h1>
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
                        onClick={() => setIsAddOpen(true)}
                        className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Department
                    </Button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={<Boxes size={18} />}
                    iconBg="bg-[#D5E3FF]"
                    iconColor="text-[#00376C]"
                    label="TOTAL"
                    title="Total Departments"
                    value={stats.total}
                />
                <StatCard
                    icon={<CheckCircle2 size={18} />}
                    iconBg="bg-green-100"
                    iconColor="text-green-700"
                    label="ACTIVE"
                    title="Active Units"
                    value={String(stats.active).padStart(2, '0')}
                />
                <StatCard
                    icon={<XCircle size={18} />}
                    iconBg="bg-gray-100"
                    iconColor="text-gray-500"
                    label="PAUSED"
                    title="Inactive Units"
                    value={String(stats.inactive).padStart(2, '0')}
                />
                <StatCard
                    icon={<History size={18} />}
                    iconBg="bg-[#D5E3FF]"
                    iconColor="text-[#00376C]"
                    label="STATUS"
                    title="Last Updated"
                    value="Today"
                />
            </div>

            {/* Search & Filter */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[220px]">
                    <label className="text-xs font-semibold text-[#43474F] mb-1 block">
                        Search Department
                    </label>
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
                <div className="w-48">
                    <label className="text-xs font-semibold text-[#43474F] mb-1 block">
                        Filter by Status
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={handleApplyFilter}
                    className="bg-primary hover:bg-[#073e77] text-white"
                >
                    Apply Filter
                </Button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-sm text-[#43474F] hover:text-[#1B1B1F] font-medium px-2 cursor-pointer"
                >
                    Reset
                </button>
            </div>

            {/* Table */}
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
                            <th className="text-left px-2 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                                Status
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-[#737781] uppercase tracking-wide">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageDepartments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-sm text-[#737781]">
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
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </td>
                                    <td className="px-2 py-3 text-[#737781]">
                                        {String(pageStart + idx + 1).padStart(2, '0')}
                                    </td>
                                    <td className="px-2 py-3">
                                        <p className="font-semibold text-[#1B1B1F]">{dept.name}</p>
                                        <p className="text-xs text-[#9CA3AF]">{dept.description}</p>
                                    </td>
                                    <td className="px-2 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                dept.status === 'Active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    dept.status === 'Active' ? 'bg-green-600' : 'bg-gray-500'
                                                }`}
                                            />
                                            {dept.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => openDetails(dept)}
                                                className="text-primary hover:text-[#073e77] cursor-pointer"
                                                aria-label={`View ${dept.name}`}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="text-[#43474F] hover:text-[#1B1B1F] cursor-pointer"
                                                aria-label={`Edit ${dept.name}`}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(dept.id)}
                                                className="text-red-500 hover:text-red-700 cursor-pointer"
                                                aria-label={`Delete ${dept.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Footer / Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] text-sm text-[#737781]">
                    <p>
                        Showing {filteredDepartments.length === 0 ? 0 : pageStart + 1} -{' '}
                        {String(Math.min(pageStart + PAGE_SIZE, filteredDepartments.length)).padStart(2, '0')}{' '}
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium cursor-pointer ${
                                    page === currentPage
                                        ? 'bg-primary text-white'
                                        : 'border border-[#E5E7EB] text-[#43474F] hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddDepartmentModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleSaveDepartment}
            />
            <DepartmentDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                department={selectedDepartment}
            />
        </div>
    );
};

const StatCard = ({ icon, iconBg, iconColor, label, title, value }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-start justify-between">
        <div>
            <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center mb-3`}>
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

export default DepartmentMaster;