import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Trash2,
  Scale,
  Edit2,
  Plus,
  Save,
  Check,
  Info
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { QtyInput } from '@/components/production/QtyInput';
import { MOCK_PREP_WASTE_ENTRIES } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const PreparationWasteEntry = () => {
  const navigate = useNavigate();
  const { planId = '1' } = useParams();

  const [selectedPlan, setSelectedPlan] = useState('PP-2026-007');
  const [mealType, setMealType] = useState('Lunch');
  const [entries, setEntries] = useState(MOCK_PREP_WASTE_ENTRIES);
  const [notes, setNotes] = useState('');

  const handleWasteChange = (id, newWaste) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const waste = Number(newWaste) || 0;
        const usable = Math.max(0, parseFloat((item.totalQty - waste).toFixed(2)));
        return { ...item, wasteQty: waste, usableQty: usable };
      })
    );
  };

  const handleWasteTypeChange = (id, newType) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, wasteType: newType } : item))
    );
  };

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    notify.info('Entry removed');
  };

  const totalQtyRecorded = entries.reduce((sum, item) => sum + item.totalQty, 0).toFixed(1);
  const totalWasteRecorded = entries.reduce((sum, item) => sum + item.wasteQty, 0).toFixed(1);
  const totalUsableRecorded = entries.reduce((sum, item) => sum + item.usableQty, 0).toFixed(1);

  const handleSubmit = () => {
    notify.success('Preparation waste records submitted successfully!');
    navigate('/production/plans');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Preparation Waste Entry"
          description="Record ingredient waste generated during cleaning, peeling, trimming and preparation."
          backTo={`/production/plans/${planId}/execution`}
          actions={
            <div className="flex items-center gap-2">
              <HeaderActionButton
                onClick={() => notify.success('Draft saved successfully.')}
                icon={Save}
                label="Save as Draft"
                variant="outline"
              />
              <HeaderActionButton
                onClick={handleSubmit}
                icon={Check}
                label="Submit Waste Records"
              />
            </div>
          }
        />

        {/* Production Context */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#084E92]" />
              Production Context
            </span>
            <span className="text-[11px] text-gray-400">Reference active operational scope</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Production Plan</span>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="text-xs font-bold text-[#084E92] bg-transparent outline-none cursor-pointer mt-0.5"
              >
                <option value="PP-2026-007">PP-2026-007</option>
                <option value="PP-2026-0148">PP-2026-0148</option>
              </select>
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
                <option value="Breakfast">Breakfast</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Kitchen</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Maruti Main Kitchen</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Issue Store</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">Maruti Main Store</span>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#084E92]" />
            Quick Summary
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard icon={Layers} label="Ingredients Issued" value="24" tone="default" />
            <KpiCard icon={Trash2} label="Waste Entries" value={entries.length} tone="amber" />
            <KpiCard icon={Scale} label="Total Prep Waste" value={`${totalWasteRecorded} kg`} tone="emerald" />
          </div>
        </div>

        {/* Today's Entries Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                <h3 className="text-sm font-bold text-gray-900">Today's Entries</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {entries.length} Records
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Preparation waste entries recorded for today.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Waste Type</th>
                  <th className="py-3 px-4 text-right">Total Quantity</th>
                  <th className="py-3 px-4 text-center">Waste Quantity</th>
                  <th className="py-3 px-4 text-right">Usable Quantity</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{row.ingredient}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={row.wasteType}
                        onChange={(e) => handleWasteTypeChange(row.id, e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                      >
                        <option value="Peeling">Peeling</option>
                        <option value="Trimming">Trimming</option>
                        <option value="Spoiled">Spoiled</option>
                        <option value="Cleaning">Cleaning</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-gray-700">{row.totalQty} kg</td>
                    <td className="py-3.5 px-4 text-center">
                      <QtyInput
                        value={row.wasteQty}
                        unit="kg"
                        onChange={(val) => handleWasteChange(row.id, val)}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">{row.usableQty} kg</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => notify.info(`Editing ${row.ingredient}`)}
                          className="p-1 rounded text-gray-400 hover:text-[#084E92]"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="p-1 rounded text-gray-400 hover:text-rose-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-gray-200 text-xs">
                  <td colSpan={2} className="py-3.5 px-4 text-gray-900 uppercase tracking-wider">
                    Total Prep Waste Recorded
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#084E92]">{totalQtyRecorded} kg</td>
                  <td className="py-3.5 px-4 text-center text-rose-600">{totalWasteRecorded} kg</td>
                  <td className="py-3.5 px-4 text-right text-emerald-700">{totalUsableRecorded} kg</td>
                  <td className="py-3.5 px-4" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#084E92]" />
              Notes
            </span>
            <span className="text-[11px] text-gray-400">Optional remarks</span>
          </div>
          <p className="text-xs text-gray-400">Add any notes about preparation waste, observations or issues.</p>
          <div className="relative pt-1">
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your notes here..."
              className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
            />
            <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
              {notes.length}/500
            </span>
          </div>
          <span className="text-[11px] text-gray-400 block pt-1">
            🕒 Last entry by Rajesh Patel at 10:24 AM
          </span>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-xs text-[#084E92]">
          <Info size={16} className="shrink-0" />
          <span>Submitted records will be used in actual production costing.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(`/production/plans/${planId}/execution`)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Production Execution
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => notify.success('Draft saved successfully.')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              <Check size={14} />
              Submit Waste Records
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default PreparationWasteEntry;
