import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ChefHat,
  UtensilsCrossed,
  Scale,
  TrendingUp,
  Save,
  CheckCircle2,
  Edit3,
  Check
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { MOCK_EXECUTION_RECIPES } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const ProductionExecution = () => {
  const navigate = useNavigate();
  const { planId = '1' } = useParams();

  const [mealType, setMealType] = useState('Lunch');
  const [recipes, setRecipes] = useState(MOCK_EXECUTION_RECIPES);
  const [expandedId, setExpandedId] = useState(3); // 3rd recipe (Shahi Paneer) expanded like Figma design
  const [productionNotes, setProductionNotes] = useState('');

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleActualQtyChange = (id, newQty) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const actual = Number(newQty) || 0;
        const yieldPct = Math.round((actual / r.plannedQty) * 100);
        return {
          ...r,
          actualQty: actual,
          yieldPct,
          status: actual > 0 ? (actual >= r.plannedQty * 0.95 ? 'COMPLETED' : 'IN_PROGRESS') : 'NOT_STARTED'
        };
      })
    );
  };

  const handleMarkComplete = (id) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'COMPLETED' } : r))
    );
    notify.success('Recipe marked as complete!');
  };

  const totalPlanned = recipes.reduce((sum, r) => sum + r.plannedQty, 0);
  const totalActual = recipes.reduce((sum, r) => sum + r.actualQty, 0);
  const overallProgress = Math.round((totalActual / totalPlanned) * 100);

  const completedCount = recipes.filter((r) => r.status === 'COMPLETED').length;
  const inProgressCount = recipes.filter((r) => r.status === 'IN_PROGRESS').length;
  const notStartedCount = recipes.filter((r) => r.status === 'NOT_STARTED').length;

  const handleCompleteProduction = () => {
    notify.success('Production completed and logged successfully!');
    navigate('/production/plans');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Production Execution"
          description="Record actual production quantity and complete kitchen batches."
          backTo="/production/plans"
          actions={
            <div className="flex items-center gap-2">
              <HeaderActionButton
                onClick={() => notify.success('Execution progress saved as draft.')}
                icon={Save}
                label="Save Draft"
                variant="outline"
              />
              <HeaderActionButton
                onClick={handleCompleteProduction}
                icon={Check}
                label="Complete Production"
              />
            </div>
          }
        />

        {/* Plan Strip */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Plan Code</span>
              <span className="text-xs font-bold text-[#084E92] mt-0.5 block">PP-2026-007</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Production Date</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">22 Oct 2026</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Meal Type</span>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-transparent outline-none cursor-pointer mt-0.5"
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Kitchen</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Maruti Main Kitchen</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Supervisor</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Chef Sanjeev</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Start Time</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">09:30 AM</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Planned Completion</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">11:30 AM</span>
            </div>
          </div>
        </div>

        {/* Production Progress KPIs */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#084E92]" />
            Production Progress
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={UtensilsCrossed} label="Recipes" value={recipes.length} tone="default" />
            <KpiCard icon={Scale} label="Planned Output" value={`${totalPlanned.toFixed(1)} kg`} tone="default" />
            <KpiCard icon={CheckCircle2} label="Actual Output" value={`${totalActual.toFixed(1)} kg`} tone="emerald" />
            <div className="p-4 rounded-2xl border border-[#E7EAF0] bg-white shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Progress</span>
                <span className="text-xl font-bold text-[#084E92]">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-[#084E92] h-full rounded-full transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Execution Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900">Recipe Execution</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                  {recipes.length} Recipes
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Record actual quantities for each recipe and track production progress.</p>
            </div>

            {/* Counters pill */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                • {completedCount} Completed
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                • {inProgressCount} In Progress
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                • {notStartedCount} Not Started
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Recipe</th>
                  <th className="py-3 px-4">Planned Quantity</th>
                  <th className="py-3 px-4">Actual Quantity</th>
                  <th className="py-3 px-4">Yield %</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipes.map((row) => {
                  const isExpanded = expandedId === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.id)}
                            className="inline-flex items-center gap-2 hover:text-[#084E92] cursor-pointer"
                          >
                            <span>{row.recipe}</span>
                            <span className="text-[10px] font-normal text-gray-400">
                              {isExpanded ? '[-] Hide' : '[+] View'}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-700">{row.plannedQty.toFixed(1)} kg</td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center h-8 px-2 rounded-lg border border-[#C3C6D1] bg-white text-xs">
                            <input
                              type="number"
                              step="0.1"
                              value={row.actualQty}
                              onChange={(e) => handleActualQtyChange(row.id, e.target.value)}
                              className="w-14 bg-transparent outline-none text-right font-bold text-gray-800"
                            />
                            <span className="ml-1 text-[11px] text-gray-400">kg</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{row.yieldPct}%</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>

                      {/* Expanded Update Recipe Batch Panel */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={5} className="p-4 border-b border-blue-100">
                            <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
                              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <Edit3 size={15} className="text-[#084E92]" />
                                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Update Recipe Batch
                                  </h4>
                                  <span className="text-[11px] text-gray-400">
                                    Record exact kitchen measurements and waste
                                  </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                                  Batch {row.id} of {recipes.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Batch Number</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={row.batchNo}
                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 cursor-not-allowed"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Planned Quantity</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={`${row.plannedQty.toFixed(1)} kg`}
                                    className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 cursor-not-allowed"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                    Actual Quantity <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="flex items-center h-9 px-3 rounded-xl border border-[#084E92] bg-white ring-1 ring-[#084E92]">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={row.actualQty}
                                      onChange={(e) => handleActualQtyChange(row.id, e.target.value)}
                                      className="w-full bg-transparent outline-none text-xs font-bold text-gray-900"
                                    />
                                    <span className="text-xs text-gray-400">kg</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Preparation Waste</label>
                                  <div className="flex items-center h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                                    <input
                                      type="number"
                                      step="0.1"
                                      defaultValue={row.prepWaste}
                                      className="w-full bg-transparent outline-none text-xs font-medium text-gray-800"
                                    />
                                    <span className="text-xs text-gray-400">kg</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Cooking Loss</label>
                                  <div className="flex items-center h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                                    <input
                                      type="number"
                                      step="0.1"
                                      defaultValue={row.cookingLoss}
                                      className="w-full bg-transparent outline-none text-xs font-medium text-gray-800"
                                    />
                                    <span className="text-xs text-gray-400">kg</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Quality Check</label>
                                  <select
                                    defaultValue={row.qualityCheck}
                                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92]"
                                  >
                                    <option value="Passed">Passed</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Completion Time</label>
                                  <input
                                    type="text"
                                    defaultValue={row.completionTime}
                                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium text-gray-800"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Remarks</label>
                                  <input
                                    type="text"
                                    placeholder="Enter any remarks about this batch..."
                                    defaultValue={row.remarks}
                                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium text-gray-800"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleMarkComplete(row.id)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
                                >
                                  <Check size={14} />
                                  Mark Recipe Complete
                                </button>
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
        </div>

        {/* Production Notes */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#084E92]" />
            Production Notes
          </span>
          <p className="text-xs text-gray-400">Add any notes about production, issues or special observations.</p>
          <div className="relative pt-1">
            <textarea
              rows={3}
              maxLength={500}
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="Enter production notes..."
              className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
            />
            <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
              {productionNotes.length}/500
            </span>
          </div>
          <span className="text-[11px] text-gray-400 block pt-1">
            🕒 Last updated by Chef Sanjeev at 10:45 AM
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/plans')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Production Plans
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => notify.success('Execution progress saved as draft.')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleCompleteProduction}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              <Check size={14} />
              Complete Production
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ProductionExecution;
