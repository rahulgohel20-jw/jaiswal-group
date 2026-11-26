import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Layers,
  Download,
  Save,
  Check,
  Info,
  Layers2
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { QtyInput } from '@/components/production/QtyInput';
import { PurchaseRequisitionDetailsModal } from './components/PurchaseRequisitionDetailsModal';
import { MOCK_STORE_ISSUE_CONFIRMATION_ITEMS } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const StoreIssueConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId = '1' } = useParams();
  const returnTo = location.state?.returnTo || '/production/store-issues';

  const [mealType, setMealType] = useState('Lunch');
  const [items, setItems] = useState(MOCK_STORE_ISSUE_CONFIRMATION_ITEMS);
  const [expandedId, setExpandedId] = useState(1); // First item expanded
  const [selectedPR, setSelectedPR] = useState(null);

  // Form Details
  const [issueDate, setIssueDate] = useState('2026-10-22');
  const [issueTime, setIssueTime] = useState('08:45');
  const [issuedBy, setIssuedBy] = useState('Rajesh Patel');
  const [receivedBy, setReceivedBy] = useState('Chef Sanjeev');
  const [reference] = useState('PP-2026-007');
  const [remarks, setRemarks] = useState('');

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleIssueQtyChange = (id, newQty) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const val = Number(newQty) || 0;
        const isShortfall = val < item.requiredQty;
        return {
          ...item,
          issueQty: val,
          isShortfall,
          issueValue: val * item.rate,
          status: isShortfall ? 'SHORTFALL' : 'READY'
        };
      })
    );
  };

  const handleFEFO = () => {
    notify.success('Auto-allocated quantities across batches using FEFO (First Expiry, First Out).');
  };

  const handleConfirmIssue = () => {
    notify.success('Store stock issued successfully! Deducted from Maruti Main Store.');
    navigate(returnTo);
  };

  const shortfallItems = items.filter((i) => i.isShortfall);

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Store Issue Confirmation"
          description="Review and issue production ingredients from the selected store."
          backTo="/production/plans"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Pending Issue
            </span>
          }
          actions={
            <HeaderActionButton
              to="/production/plans"
              label="Back to Production Plan"
              variant="outline"
              icon={ArrowLeft}
            />
          }
        />

        {/* Production Plan Summary Strip */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">
            Production Plan Summary
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Plan Code</span>
              <span className="text-xs font-bold text-[#084E92] mt-0.5 block">{reference}</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Meal Type *</span>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-transparent outline-none cursor-pointer mt-0.5"
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Breakfast">Breakfast</option>
              </select>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Production Date</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">22 Oct 2026</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Kitchen</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Maruti Main Kitchen</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Issue Store</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Maruti Main Store</span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Recipes</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">8 Recipes</span>
            </div>
          </div>
        </div>

        {/* 4 Key Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Layers} label="Total Ingredients" value="24" tone="default" />
          <KpiCard icon={CheckCircle2} label="Ready to Issue" value="21" tone="emerald" />
          <KpiCard icon={AlertTriangle} label="Shortfalls" value="3" tone="rose" />
          <KpiCard icon={Boxes} label="Estimated Issue Value" value="₹18,940" tone="default" />
        </div>

        {/* Ingredients Issue List */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ingredients Issue List</h3>
              <p className="text-xs text-gray-500">Select ingredients and specify issue quantities from Maruti Main Store.</p>
            </div>
            <button
              type="button"
              onClick={handleFEFO}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#084E92] bg-blue-50/80 hover:bg-blue-100 transition border border-blue-200 cursor-pointer"
            >
              <Layers2 size={14} />
              Use FEFO Batches
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
                  <th className="py-3 px-3 text-right">Required Qty</th>
                  <th className="py-3 px-3 text-right">Available Qty</th>
                  <th className="py-3 px-3 text-center">Issue Qty</th>
                  <th className="py-3 px-3">Batch / Expiry</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">Issue Value (₹)</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isShort = item.isShortfall;

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
                        <td className="py-3 px-3 text-right font-semibold text-gray-700">{item.requiredQty} {item.uom}</td>
                        <td className="py-3 px-3 text-right text-gray-600 font-medium">{item.availableQty} {item.uom}</td>
                        <td className="py-3 px-3 text-center">
                          <QtyInput
                            value={item.issueQty}
                            unit={item.uom}
                            error={isShort}
                            onChange={(val) => handleIssueQtyChange(item.id, val)}
                          />
                        </td>
                        <td className="py-3 px-3 text-gray-600">{item.batchExpiry}</td>
                        <td className="py-3 px-3 text-right text-gray-600">₹{item.rate.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900">₹{item.issueValue.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>

                      {/* Expanded Batches Breakdown */}
                      {isExpanded && item.batches && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={9} className="p-4 border-b border-gray-100">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
                              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                  {isShort ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  )}
                                  {item.ingredient} Batch Allocation
                                </span>
                                <div className="flex items-center gap-4 text-[11px] text-gray-600">
                                  <span>Required: <strong>{item.requiredQty} {item.uom}</strong></span>
                                  <span>In Maruti Main Store: <strong>{item.availableQty} {item.uom}</strong></span>
                                  <span>Issue Quantity: <strong className="text-[#084E92]">{item.issueQty} {item.uom}</strong></span>
                                  {isShort && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Purchase Required
                                    </span>
                                  )}
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
                                    {item.batches.map((batch, bIdx) => (
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

        {/* Shortfall Items Section */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Shortfall Items</h3>
            <p className="text-xs text-gray-500">Available quantity will be issued now; remaining quantity is tracked through purchase requisitions.</p>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2.5 px-4">Ingredient</th>
                  <th className="py-2.5 px-4 text-right">Required Qty</th>
                  <th className="py-2.5 px-4 text-right">Available Qty</th>
                  <th className="py-2.5 px-4 text-right">Shortfall Qty</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shortfallItems.map((item, idx) => {
                  const shortfallVal = item.requiredQty - item.issueQty;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{item.ingredient}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{item.requiredQty} {item.uom}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{item.availableQty} {item.uom}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">{shortfallVal} {item.uom}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPR({
                              prCode: `PR-2026-0${15 + idx}`,
                              itemName: item.ingredient,
                              outletName: 'Maruti Main Store',
                              prQuantity: `${shortfallVal} ${item.uom}`
                            })
                          }
                          className="px-3 py-1 rounded-lg border border-blue-200 text-xs font-semibold text-[#084E92] hover:bg-blue-50 transition cursor-pointer"
                        >
                          View PR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Details Form */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Issue Details</h3>
              <p className="text-xs text-gray-500">Enter additional details for this store issue.</p>
            </div>
            <button
              type="button"
              onClick={() => notify.info('Exporting issue slip...')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C3C6D1] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <Download size={13} />
              Export
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Issue Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={issueTime}
                onChange={(e) => setIssueTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Issued By <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Received By <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Remarks</label>
            <div className="relative">
              <textarea
                rows={2}
                maxLength={500}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks..."
                className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
              <span className="absolute right-3 bottom-2 text-[10px] text-gray-400 font-medium">
                {remarks.length}/500
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-xs text-[#084E92]">
            <Info size={16} className="shrink-0" />
            <span>Confirming this issue will deduct the listed quantities from Maruti Main Store inventory.</span>
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
              onClick={() => navigate('/production/plans')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to Production Plan
            </button>
            <button
              type="button"
              onClick={() => notify.success('Store issue draft saved.')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleConfirmIssue}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Confirm & Issue Stock
              <Check size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* PR Details Modal */}
      <PurchaseRequisitionDetailsModal
        isOpen={Boolean(selectedPR)}
        prData={selectedPR}
        onClose={() => setSelectedPR(null)}
      />
    </Container>
  );
};

export default StoreIssueConfirmation;
