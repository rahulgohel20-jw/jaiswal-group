import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Calendar,
  Download,
  Plus,
  Eye,
  Utensils
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { MOCK_PLATE_WASTE_REGISTER } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const PlateWasteRegister = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState(MOCK_PLATE_WASTE_REGISTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('All');

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.wasteNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.recordedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMeal = selectedMealType === 'All' || r.mealType === selectedMealType;
    return matchesSearch && matchesMeal;
  });

  return (
    <Container>
      <div className="space-y-6 pb-12 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Plate Waste Register"
          description="Record post-meal food waste for an outlet and meal service."
          actions={
            <HeaderActionButton
              to="/production/plate-waste/create"
              icon={Plus}
              label="New Plate Waste"
            />
          }
        />

        {/* Filter Bar */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search plate waste no, plan, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div>

            <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="font-medium">21 Oct 2026 – 27 Oct 2026</span>
            </div>

            <select className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none">
              <option>All Kitchens</option>
              <option>Central Kitchen</option>
              <option>City Center Kitchen</option>
            </select>

            <select
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none"
            >
              <option value="All">All Meal Types</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Breakfast">Breakfast</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => notify.info('Exporting plate waste register...')}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-[#C3C6D1] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Plate Waste No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Production Plan</th>
                  <th className="py-3 px-4">Meal Type</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-[#084E92]">{item.wasteNo}</td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{item.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{item.planCode}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200">
                        {item.mealType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-gray-700">{item.recordedBy}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/production/plate-waste/create')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
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

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing 1 to {filtered.length} of 42 entries</span>
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

export default PlateWasteRegister;
