import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Eye,
  Edit2,
  UtensilsCrossed,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import { MOCK_RECIPE_ALLOCATIONS } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const RecipeAllocation = () => {
  const navigate = useNavigate();
  const { planId = '1' } = useParams();

  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const [recipes, setRecipes] = useState(MOCK_RECIPE_ALLOCATIONS);
  const [expandedRecipeId, setExpandedRecipeId] = useState(1); // First row expanded like Figma design

  const toggleExpand = (id) => {
    setExpandedRecipeId((prev) => (prev === id ? null : id));
  };

  const handleSaveDraft = () => {
    notify.success('Recipe allocations saved as draft.');
  };

  const handlePreviewAllocation = () => {
    notify.info('Generating allocation preview summary...');
  };

  const handleContinue = () => {
    notify.success('Recipe allocation confirmed. Moving to Material Sourcing.');
    navigate(`/production/plans/${planId}/sourcing`);
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Recipe and Multi–Outlet Allocation"
          description="Distribute planned recipes across production outlets using portion-based quantities."
          backTo="/production/plans/create"
          actions={
            <HeaderActionButton
              onClick={handleSaveDraft}
              icon={Save}
              label="Save Draft"
              variant="outline"
            />
          }
        />

        {/* Stepper */}
        <PlanStepper
          currentStep={2}
          onStepClick={(num) => {
            if (num === 1) navigate('/production/plans/create');
            if (num === 3) navigate(`/production/plans/${planId}/sourcing`);
          }}
        />

        {/* Allocation Controls Strip */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Allocation Controls</h3>
              <p className="text-xs text-gray-500">Specify core operational boundaries and volume scopes</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Plan Code</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">PP-2026-007</span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Production Date</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">22 Oct 2026</span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Producing Kitchen</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">Maruti Main Kitchen</span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Total PAX</span>
              <span className="text-xs font-bold text-[#084E92] mt-1 block">1,200 Pax</span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Destinations</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">4 Centers</span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Recipes</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">8 Recipes</span>
            </div>
          </div>
        </div>

        {/* All Recipe Allocation Overview Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">All Recipe Allocation Overview</h3>
                <p className="text-xs text-gray-500">Review recipe quantities and manage destination-wise allocation for each recipe.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Meal Type</span>
              <select
                value={mealTypeFilter}
                onChange={(e) => setMealTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-[#084E92]" />
                  </th>
                  <th className="py-3 px-3">Recipe</th>
                  <th className="py-3 px-3">Portion Size</th>
                  <th className="py-3 px-3">Total Planned Quantity</th>
                  <th className="py-3 px-3">Allocated Quantity</th>
                  <th className="py-3 px-3">Variance</th>
                  <th className="py-3 px-3">Destinations</th>
                  <th className="py-3 px-3">Transfer Quantity</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipes.map((recipe) => {
                  const isExpanded = expandedRecipeId === recipe.id;
                  const hasVariance = recipe.variance && recipe.variance !== '0 kg';

                  return (
                    <React.Fragment key={recipe.id}>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-3 text-center">
                          <input type="checkbox" defaultChecked={recipe.selected} className="rounded border-gray-300 text-[#084E92]" />
                        </td>
                        <td className="py-3.5 px-3 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => toggleExpand(recipe.id)}
                            className="inline-flex items-center gap-2 hover:text-[#084E92] cursor-pointer"
                          >
                            <span>{recipe.recipe}</span>
                            <span className="text-[10px] font-normal text-gray-400">
                              {isExpanded ? '[-] Hide' : '[+] View'}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-gray-700">{recipe.portionSize}</td>
                        <td className="py-3.5 px-3 font-bold text-gray-900">{recipe.totalPlannedQty}</td>
                        <td className="py-3.5 px-3 font-semibold text-gray-800">{recipe.allocatedQty}</td>
                        <td className={`py-3.5 px-3 font-bold ${hasVariance ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {recipe.variance}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-gray-700">{recipe.destinations}</td>
                        <td className="py-3.5 px-3 font-semibold text-gray-700">{recipe.transferQty}</td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => notify.info(`Editing allocation for ${recipe.recipe}`)}
                            className="p-1.5 rounded-lg border border-blue-200 text-[#084E92] hover:bg-blue-50 transition"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Destination Allocation Table */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={9} className="p-4 border-b border-blue-100">
                            <div className="bg-white rounded-xl border border-blue-200/80 p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#084E92]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                                  Destination Allocation for {recipe.recipe}
                                </span>
                                <span className="text-[11px] text-gray-500 font-normal">
                                  Portion Size: <strong>{recipe.portionSize}</strong>
                                </span>
                              </div>

                              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                                      <th className="py-2.5 px-3 w-8 text-center">
                                        <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                                      </th>
                                      <th className="py-2.5 px-3 text-left">Destination Outlet</th>
                                      <th className="py-2.5 px-3 text-left">Sub-Location</th>
                                      <th className="py-2.5 px-3 text-center">Planned PAX</th>
                                      <th className="py-2.5 px-3 text-right">Planned Quantity</th>
                                      <th className="py-2.5 px-3 text-right">Portion Size</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {recipe.allocations.map((alloc) => (
                                      <tr key={alloc.id} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-3 text-center">
                                          <input type="checkbox" defaultChecked={alloc.selected} className="rounded border-gray-300" />
                                        </td>
                                        <td className="py-2 px-3 font-semibold text-gray-900">{alloc.outlet}</td>
                                        <td className="py-2 px-3 text-gray-500">{alloc.subLocation}</td>
                                        <td className="py-2 px-3 text-center font-medium text-gray-700">{alloc.plannedPax}</td>
                                        <td className="py-2 px-3 text-right font-bold text-gray-900">{alloc.plannedQty}</td>
                                        <td className="py-2 px-3 text-right text-gray-500">{alloc.portionSize}</td>
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
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/plans/create')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to General Setup
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handlePreviewAllocation}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <Eye size={14} />
              Preview Allocation
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Continue to Material Sourcing
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default RecipeAllocation;
