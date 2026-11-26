import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calendar,
  Download,
  Plus,
  PackageCheck,
  Trash2,
  Truck,
  ArrowDownLeft,
  Utensils,
  Eye
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { INITIAL_PLANS } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const ProductionPlanListing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [expandedPlanId, setExpandedPlanId] = useState(1); // First row expanded like design
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitchen, setSelectedKitchen] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const toggleExpand = (id) => {
    setExpandedPlanId((prev) => (prev === id ? null : id));
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.kitchen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.site.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKitchen = selectedKitchen === 'All' || plan.kitchen.includes(selectedKitchen);
    const matchesStatus = selectedStatus === 'All' || plan.status === selectedStatus;
    return matchesSearch && matchesKitchen && matchesStatus;
  });

  return (
    <Container>
      <div className="space-y-6 pb-12 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Production Plan Listing"
          description="Manage production plans and access all related kitchen operations from one place."
          actions={
            <HeaderActionButton
              to="/production/plans/create"
              icon={Plus}
              label="Create Production Plan"
            />
          }
        />

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FileText} label="Total Plans" value="128" tone="default" />
          <KpiCard icon={Clock} label="In Progress" value="18" tone="default" />
          <KpiCard icon={CheckCircle2} label="Completed Today" value="24" tone="emerald" />
          <KpiCard icon={AlertTriangle} label="Pending Actions" value="12" tone="amber" />
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search plan, menu, kitchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92] transition placeholder:text-gray-400"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="font-medium">21 Oct 2026 – 27 Oct 2026</span>
            </div>

            {/* Kitchen Filter */}
            <select
              value={selectedKitchen}
              onChange={(e) => setSelectedKitchen(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none focus:border-[#084E92] cursor-pointer"
            >
              <option value="All">All Kitchens / Sites</option>
              <option value="Central Kitchen">Central Kitchen</option>
              <option value="City Center Kitchen">City Center Kitchen</option>
              <option value="Production Kitchen">Production Kitchen</option>
              <option value="Plant Canteen">Plant Canteen</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none focus:border-[#084E92] cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={() => notify.info('Exporting Production Plans...')}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-[#C3C6D1] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Plans Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Plan ID</th>
                  <th className="py-3 px-4">Date & Shift</th>
                  <th className="py-3 px-4">Site / Kitchen</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Planned Qty</th>
                  <th className="py-3 px-4">Completed Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlans.map((plan) => {
                  const isExpanded = expandedPlanId === plan.id;
                  const isLow = plan.progress <= 60;
                  const isDone = plan.progress === 100;

                  return (
                    <React.Fragment key={plan.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#084E92]">
                          <button
                            type="button"
                            onClick={() => toggleExpand(plan.id)}
                            className="inline-flex items-center gap-1.5 hover:underline focus:outline-none cursor-pointer"
                          >
                            <span>{plan.planCode}</span>
                            <span className="text-[10px] font-normal text-gray-400">
                              {isExpanded ? '[-] Hide' : '[+] View'}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-gray-800">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            <span className="font-semibold">{plan.date}</span>
                          </div>
                          <span className="text-[11px] text-gray-400 block pl-5">({plan.shift})</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-800">
                          <span className="font-semibold block">{plan.site}</span>
                          <span className="text-[11px] text-gray-400 block">{plan.kitchen}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isDone ? 'bg-emerald-500' : isLow ? 'bg-amber-500' : 'bg-[#084E92]'
                                }`}
                                style={{ width: `${plan.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700">{plan.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{plan.plannedQty}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{plan.completedQty}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={plan.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          {/* Operations Action Buttons matching Figma 5.1 */}
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              title="Store Issue"
                              onClick={() => navigate(`/production/plans/${plan.id}/store-issue`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-[#084E92] transition cursor-pointer"
                            >
                              <PackageCheck size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">Store Issue</span>
                            </button>

                            <button
                              title="Kitchen Waste"
                              onClick={() => navigate(`/production/plans/${plan.id}/prep-waste`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-amber-700 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">Kitchen Waste</span>
                            </button>

                            <button
                              title="Food Transfer"
                              onClick={() => navigate(`/production/transfers`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 transition cursor-pointer"
                            >
                              <Truck size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">Food Transfer</span>
                            </button>

                            <button
                              title="Accept Transfer"
                              onClick={() => notify.success(`Transfer for ${plan.planCode} accepted successfully.`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 transition cursor-pointer"
                            >
                              <ArrowDownLeft size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">Accept Transfer</span>
                            </button>

                            <button
                              title="Plate Waste"
                              onClick={() => navigate(`/production/plate-waste/create`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 transition cursor-pointer"
                            >
                              <Utensils size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">Plate Waste</span>
                            </button>

                            <button
                              title="View Plan"
                              onClick={() => navigate(`/production/plans/${plan.id}/sourcing`)}
                              className="inline-flex flex-col items-center justify-center w-12 h-11 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            >
                              <Eye size={14} />
                              <span className="text-[9px] font-semibold mt-0.5 leading-tight">View Plan</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Meal Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20">
                          <td colSpan={8} className="py-4 px-8 border-b border-gray-100">
                            <div className="space-y-2.5 max-w-3xl">
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                <Utensils size={13} className="text-[#084E92]" />
                                Meal Breakdown
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-2xs">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                                      <th className="py-2.5 px-4 text-left">Meal Type</th>
                                      <th className="py-2.5 px-4 text-left">Time</th>
                                      <th className="py-2.5 px-4 text-left">Planned Quantity</th>
                                      <th className="py-2.5 px-4 text-left">Completed Quantity</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {plan.meals.map((meal, mIdx) => (
                                      <tr key={mIdx}>
                                        <td className="py-2.5 px-4 font-semibold text-gray-900">{meal.mealType}</td>
                                        <td className="py-2.5 px-4 text-gray-500">{meal.time}</td>
                                        <td className="py-2.5 px-4 text-gray-800 font-medium">{meal.planned}</td>
                                        <td className="py-2.5 px-4 text-gray-800 font-medium">{meal.completed}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>Showing 1 to {filteredPlans.length} of 128 entries</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select className="h-8 px-2 rounded-lg border border-[#C3C6D1] bg-white text-xs font-semibold focus:outline-none">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="px-2.5 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 text-xs font-medium">
                  Prev
                </button>
                <button className="w-8 h-8 rounded-lg bg-[#084E92] text-white font-bold flex items-center justify-center text-xs">
                  1
                </button>
                <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">
                  2
                </button>
                <button className="px-2.5 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-xs font-medium">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ProductionPlanListing;
