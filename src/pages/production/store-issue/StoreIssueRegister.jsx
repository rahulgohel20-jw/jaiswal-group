import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Calendar,
  Plus,
  Eye,
  Building2,
  PackageCheck
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { StatusBadge } from '@/components/production/StatusBadge';
import { MOCK_STORE_ISSUES_REGISTER } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const StoreIssueRegister = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState(MOCK_STORE_ISSUES_REGISTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitchen, setSelectedKitchen] = useState('All');

  const filteredIssues = issues.filter((item) => {
    const matchesSearch =
      item.issueNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kitchen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.issuedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKitchen = selectedKitchen === 'All' || item.kitchen.includes(selectedKitchen);
    return matchesSearch && matchesKitchen;
  });

  return (
    <Container>
      <div className="space-y-6 pb-12 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Store Issue Register"
          description="View and manage ingredient issues for production plans."
          actions={
            <HeaderActionButton
              to="/production/plans/1/store-issue"
              icon={Plus}
              label="New Store Issue"
            />
          }
        />

        {/* Filters */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search issue no, plan, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div>

            <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="font-medium">21 Oct 2026 – 27 Oct 2026</span>
            </div>

            <select
              value={selectedKitchen}
              onChange={(e) => setSelectedKitchen(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none focus:border-[#084E92]"
            >
              <option value="All">All Kitchens</option>
              <option value="Central Kitchen">Central Kitchen</option>
              <option value="City Center Kitchen">City Center Kitchen</option>
              <option value="Production Kitchen">Production Kitchen</option>
              <option value="Main Kitchen">Main Kitchen</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Issue No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Production Plan</th>
                  <th className="py-3 px-4">Kitchen</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Total Qty</th>
                  <th className="py-3 px-4">Issued By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIssues.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-[#084E92]">{row.issueNo}</td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{row.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{row.planCode}</td>
                    <td className="py-3.5 px-4 text-gray-700">{row.kitchen}</td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-600">{row.items} items</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{row.totalQty}</td>
                    <td className="py-3.5 px-4 text-gray-700">{row.issuedBy}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/production/plans/1/store-issue')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                      >
                        <Eye size={13} className="text-[#084E92]" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>Showing 1 to {filteredIssues.length} of 42 entries</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">Prev</button>
              <button className="w-8 h-8 rounded-lg bg-[#084E92] text-white font-bold flex items-center justify-center text-xs">1</button>
              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">2</button>
              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">3</button>
              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">4</button>
              <button className="px-2.5 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">Next</button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default StoreIssueRegister;
