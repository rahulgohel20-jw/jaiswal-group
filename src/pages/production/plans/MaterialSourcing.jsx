import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  PlusCircle,
  Search,
  Eye,
  Boxes,
  Layers,
  FileCheck2
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import { PlanSummaryStrip } from './components/PlanSummaryStrip';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { QtyInput } from '@/components/production/QtyInput';
import { CreatePurchaseRequisitionModal } from './components/CreatePurchaseRequisitionModal';
import { IngredientDetailsModal } from './components/IngredientDetailsModal';
import { MOCK_BOM_INGREDIENTS, MOCK_AUTO_PR_LIST } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const MaterialSourcing = () => {
  const navigate = useNavigate();
  const { planId = '1' } = useParams();

  const [mealType, setMealType] = useState('Lunch');
  const [issueStore, setIssueStore] = useState('Maruti Main Store');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [ingredients, setIngredients] = useState(MOCK_BOM_INGREDIENTS);
  const [expandedId, setExpandedId] = useState(1); // First row expanded

  // Modals state
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [selectedIngredientForModal, setSelectedIngredientForModal] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleIssueQtyChange = (id, newQty) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const shortfall = Math.max(0, item.requiredQty - (newQty || 0));
        return {
          ...item,
          issueQty: newQty,
          shortfall,
          status: shortfall > 0 ? 'SHORTFALL' : 'FULLY_AVAILABLE'
        };
      })
    );
  };

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch = item.ingredient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const shortfallCount = ingredients.filter((item) => item.shortfall > 0).length;
  const availableCount = ingredients.length - shortfallCount;

  const handleConfirmPlan = () => {
    notify.success('Production plan confirmed successfully!');
    navigate('/production/plans');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Material Sourcing and BOM Explosion"
          description="Review consolidated ingredient requirements, track shortfalls, and issue stock from the selected store."
          backTo={`/production/plans/${planId}/allocation`}
          actions={
            <HeaderActionButton
              onClick={() => notify.success('Sourcing draft saved.')}
              icon={Save}
              label="Save Sourcing"
              variant="outline"
            />
          }
        />

        {/* Stepper */}
        <PlanStepper
          currentStep={3}
          onStepClick={(num) => {
            if (num === 1) navigate('/production/plans/create');
            if (num === 2) navigate(`/production/plans/${planId}/allocation`);
          }}
        />

        {/* Plan Summary Strip */}
        <PlanSummaryStrip
          planCode="PP-2026-007"
          productionDate="01 Apr 2026"
          producingKitchen="Main Kitchen"
          recipes={8}
          totalPax="1,200 Pax"
          destinations="4 Centers"
          mealType={mealType}
          issueStore={issueStore}
          onMealTypeChange={setMealType}
          onIssueStoreChange={setIssueStore}
        />

        {/* BOM Summary KPIs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">BOM Summary</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => notify.info('Recalculating stock availability across stores...')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C3C6D1] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                Recalculate Stock
              </button>
              <button
                type="button"
                onClick={() => notify.info('Exporting BOM requirements spreadsheet...')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C3C6D1] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                <Download size={13} />
                Export BOM
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Layers} label="Total Ingredients" value="24" tone="default" />
            <KpiCard icon={CheckCircle2} label="Fully Available" value="21" subtext="87.5%" tone="emerald" />
            <KpiCard icon={AlertTriangle} label="Shortfalls" value="3" tag="Action Req." tone="rose" />
            <KpiCard icon={Boxes} label="Estimated RM Cost" value="₹18,940" tone="default" />
          </div>
        </div>

        {/* Filters and Sourcing Rules */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ingredient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
            >
              <option value="All">All Categories (24)</option>
              <option value="Pulses">Pulses</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Grains">Grains</option>
              <option value="Oils & Fats">Oils & Fats</option>
            </select>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {shortfallCount} Items Action Req.
            </span>
          </div>

          <div className="text-xs font-semibold text-gray-500">
            Sourcing Status: <strong className="text-rose-600">{shortfallCount} Shortfalls</strong> | <strong className="text-emerald-600">{availableCount} Available</strong>
          </div>
        </div>

        {/* Consolidated Ingredient Requirements Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consolidated Ingredient Requirements</h3>
              <p className="text-xs text-gray-500">Review required quantities, available stock, and source allocation for all recipe items.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPRModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              <PlusCircle size={14} />
              Create Purchase Requisition
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                  </th>
                  <th className="py-3 px-3">Ingredient</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Required Qty</th>
                  <th className="py-3 px-3">Base UOM</th>
                  <th className="py-3 px-3 text-right">Available at Issue Store</th>
                  <th className="py-3 px-3 text-center">Issue Qty</th>
                  <th className="py-3 px-3 text-right">Shortfall</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">Estimated Cost (₹)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIngredients.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isShortfall = item.shortfall > 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3 text-center">
                          <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="inline-flex items-center gap-1.5 hover:text-[#084E92] cursor-pointer"
                          >
                            <span>{item.ingredient}</span>
                            <span className="text-[10px] font-normal text-gray-400">
                              {isExpanded ? '[-] Hide' : '[+] View'}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-medium">{item.category}</td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900">{item.requiredQty}</td>
                        <td className="py-3 px-3 text-gray-500 font-medium">{item.baseUom}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-700">{item.availableStore} {item.baseUom}</td>
                        <td className="py-3 px-3 text-center">
                          <QtyInput
                            value={item.issueQty}
                            unit={item.baseUom}
                            onChange={(val) => handleIssueQtyChange(item.id, val)}
                          />
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isShortfall ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.shortfall} {item.baseUom}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 font-medium">₹ {item.rate}</td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900">₹ {item.estimatedCost.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            title="View Ingredient Details"
                            onClick={() => setSelectedIngredientForModal(item.ingredient)}
                            className="p-1 rounded-lg text-gray-400 hover:text-[#084E92] hover:bg-blue-50 transition"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Batch Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={12} className="p-4 border-b border-gray-100">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
                              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                  {isShortfall ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  )}
                                  {item.ingredient} Breakdown
                                </span>
                                <div className="flex items-center gap-4 text-[11px] text-gray-600 font-medium">
                                  <span>Required: <strong>{item.requiredQty} {item.baseUom}</strong></span>
                                  <span>In {issueStore}: <strong>{item.availableStore} {item.baseUom}</strong></span>
                                  <span>Issue Quantity: <strong className="text-[#084E92]">{item.issueQty} {item.baseUom}</strong></span>
                                  {isShortfall && <span className="text-rose-600 font-bold">Shortfall: {item.shortfall} {item.baseUom}</span>}
                                </div>
                              </div>

                              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                                      <th className="py-2 px-3 text-left">Batch No.</th>
                                      <th className="py-2 px-3 text-left">Expiry Date</th>
                                      <th className="py-2 px-3 text-right">Available Stock</th>
                                      <th className="py-2 px-3 text-right">Stock Age (Days)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(item.batches || []).map((batch, bIdx) => (
                                      <tr key={bIdx}>
                                        <td className="py-2 px-3 font-semibold text-gray-900">{batch.batchNo}</td>
                                        <td className="py-2 px-3 text-gray-600">{batch.expiryDate}</td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-800">{batch.availableStock}</td>
                                        <td className="py-2 px-3 text-right text-gray-500">{batch.stockAge}</td>
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

        {/* Auto-generated Purchase Requisitions */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                <FileCheck2 size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Auto-Generated Purchase Requisitions
                </h3>
                <p className="text-[11px] text-gray-400">Requisitions drafted for ingredients with shortfall to be confirmed by procurement.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Overall Status: Partially Ready
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2.5 px-3">Raw Material</th>
                  <th className="py-2.5 px-3 text-right">Required Quantity</th>
                  <th className="py-2.5 px-3">UOM</th>
                  <th className="py-2.5 px-3">Preferred Vendor</th>
                  <th className="py-2.5 px-3">Required By</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_AUTO_PR_LIST.map((pr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-[#084E92]">{pr.rawMaterial}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">{pr.requiredQty}</td>
                    <td className="py-2.5 px-3 text-gray-500">{pr.uom}</td>
                    <td className="py-2.5 px-3 text-gray-700">{pr.vendor}</td>
                    <td className="py-2.5 px-3 text-gray-700">{pr.requiredBy}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/plans')}
            className="px-4 py-2.5 rounded-xl border border-rose-300 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/production/plans/${planId}/allocation`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to Recipe Allocation
            </button>
            <button
              type="button"
              onClick={() => notify.success('Sourcing draft saved.')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleConfirmPlan}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Confirm Production Plan
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePurchaseRequisitionModal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        shortfalls={MOCK_AUTO_PR_LIST}
        onCreatePR={() => notify.success('Purchase Requisition created successfully!')}
      />

      <IngredientDetailsModal
        isOpen={Boolean(selectedIngredientForModal)}
        ingredientName={selectedIngredientForModal || 'Paneer'}
        onClose={() => setSelectedIngredientForModal(null)}
      />
    </Container>
  );
};

export default MaterialSourcing;
