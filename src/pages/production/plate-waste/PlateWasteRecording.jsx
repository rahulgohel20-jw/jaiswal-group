import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Utensils,
  Truck,
  Users,
  Trash2,
  UploadCloud,
  RotateCcw,
  Save,
  Check,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { notify } from '@/utils/toast';

export const PlateWasteRecording = () => {
  const navigate = useNavigate();

  // 1. Meal Context
  const [date, setDate] = useState('2026-10-15');
  const [outlet, setOutlet] = useState('Main Outlet');
  const [subLocation, setSubLocation] = useState('Central Kitchen');
  const [meal, setMeal] = useState('Lunch');
  const [productionPlan, setProductionPlan] = useState('PP-2026-0015');

  // Form Numbers
  const totalProduction = 1250;
  const paxPlanned = 1100;
  const [paidPackServed, setPaidPackServed] = useState(800);
  const [unpaidPackServed, setUnpaidPackServed] = useState(150);
  const [unservedLeftover, setUnservedLeftover] = useState(50);
  const [totalPlateWasteKg, setTotalPlateWasteKg] = useState(85);

  // Derived / Calculated values
  const paxServed = (Number(paidPackServed) || 0) + (Number(unpaidPackServed) || 0);
  const estimatedConsumed = Math.max(0, totalProduction - unservedLeftover - totalPlateWasteKg);
  const plateWastePct = totalProduction > 0 ? ((totalPlateWasteKg / (totalProduction - unservedLeftover || 1)) * 100).toFixed(1) : 0;
  const plateWastePerPersonKg = paxServed > 0 ? (totalPlateWasteKg / paxServed).toFixed(2) : 0;

  // Metadata
  const [wasteStatus, setWasteStatus] = useState('Recorded');
  const [primaryReason, setPrimaryReason] = useState('Uneaten Food');
  const [collectionMethod, setCollectionMethod] = useState('Manual Collection');
  const [selectedReasons, setSelectedReasons] = useState(['Food Quality', 'Over Preparation', 'Customer Preference']);
  const [remarks, setRemarks] = useState('');

  const toggleReason = (tag) => {
    setSelectedReasons((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClear = () => {
    setPaidPackServed(0);
    setUnpaidPackServed(0);
    setUnservedLeftover(0);
    setTotalPlateWasteKg(0);
    setRemarks('');
    notify.info('Form cleared');
  };

  const handleSubmit = () => {
    notify.success('Plate waste record submitted successfully!');
    navigate('/production/plate-waste');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Plate Waste Recording"
          description="Record post-meal food waste for an outlet and meal service."
          backTo="/production/plate-waste"
          actions={
            <HeaderActionButton
              to="/production/plate-waste"
              icon={Utensils}
              label="View Waste Records"
              variant="outline"
            />
          }
        />

        {/* 1. Meal Context */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-[#084E92]" />
              1. Meal Context
            </span>
            <span className="text-[11px] text-gray-400">Service identification</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent outline-none mt-0.5"
              />
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Outlet</span>
              <select
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent outline-none mt-0.5"
              >
                <option value="Main Outlet">Main Outlet</option>
                <option value="Restaurant Outlet">Restaurant Outlet</option>
                <option value="Cafeteria">Cafeteria</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Sub-Location</span>
              <select
                value={subLocation}
                onChange={(e) => setSubLocation(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent outline-none mt-0.5"
              >
                <option value="Central Kitchen">Central Kitchen</option>
                <option value="Floor 2 Pantry">Floor 2 Pantry</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Meal</span>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent outline-none mt-0.5"
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Breakfast">Breakfast</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Production Plan</span>
              <select
                value={productionPlan}
                onChange={(e) => setProductionPlan(e.target.value)}
                className="text-xs font-bold text-[#084E92] bg-transparent outline-none mt-0.5"
              >
                <option value="PP-2026-0015">PP-2026-0015</option>
                <option value="PP-2026-007">PP-2026-007</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                In Progress
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quick Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#084E92]" />
              2. Quick Summary
            </span>
            <span className="text-[11px] text-gray-400">Real-time metrics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Truck} label="Total Meal Dispatched" value="1,250" subtext="(Pax)" tone="default" />
            <KpiCard icon={Users} label="Pax Planned" value="1,100" subtext="(Pax)" tone="default" />
            <KpiCard icon={Users} label="Pax Served" value={paxServed.toLocaleString()} subtext="(Pax)" tone="default" />
            <KpiCard icon={Trash2} label="Plate Waste Recorded" value="85" subtext="(Pax)" tone="amber" />
          </div>
        </div>

        {/* 3. Record Meal Plate Waste & 4. Meal-Level Calculation in Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Utensils size={16} className="text-[#084E92]" />
                <h3 className="text-sm font-bold text-gray-900">3. Record Meal Plate Waste</h3>
              </div>
              <span className="text-[11px] text-rose-500 font-semibold">* Required fields</span>
            </div>

            {/* Readonly Production metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Total Production</label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
                  <span className="w-full">{totalProduction}</span>
                  <span className="text-gray-400">Pax</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Pax Planned</label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
                  <span className="w-full">{paxPlanned}</span>
                  <span className="text-gray-400">Pax</span>
                </div>
              </div>
            </div>

            {/* Served Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Paid Pack Served <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                  <input
                    type="number"
                    value={paidPackServed}
                    onChange={(e) => setPaidPackServed(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-gray-800"
                  />
                  <span className="text-gray-400 text-xs">Pax</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Unpaid Pack Served <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                  <input
                    type="number"
                    value={unpaidPackServed}
                    onChange={(e) => setUnpaidPackServed(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-gray-800"
                  />
                  <span className="text-gray-400 text-xs">Pax</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Pax Served <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-slate-50">
                  <span className="w-full text-xs font-bold text-[#084E92]">{paxServed}</span>
                  <span className="text-gray-400 text-xs">Pax</span>
                </div>
              </div>
            </div>

            {/* Waste Quantities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Unserved / Service Leftover <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                  <input
                    type="number"
                    value={unservedLeftover}
                    onChange={(e) => setUnservedLeftover(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-gray-800"
                  />
                  <span className="text-gray-400 text-xs">Kg</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Total Plate Waste Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                  <input
                    type="number"
                    value={totalPlateWasteKg}
                    onChange={(e) => setTotalPlateWasteKg(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-gray-800"
                  />
                  <span className="text-gray-400 text-xs">Kg</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Plate Waste % <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-slate-50">
                  <span className="w-full text-xs font-bold text-rose-600">{plateWastePct}</span>
                  <span className="text-gray-400 text-xs">%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Estimated Consumed Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-slate-50">
                  <span className="w-full text-xs font-semibold text-gray-800">{estimatedConsumed}</span>
                  <span className="text-gray-400 text-xs">Kg</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Plate Waste per Person <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center h-10 px-3 rounded-xl border border-gray-200 bg-slate-50">
                  <span className="w-full text-xs font-semibold text-gray-800">{plateWastePerPersonKg}</span>
                  <span className="text-gray-400 text-xs">Kg</span>
                </div>
              </div>
            </div>

            {/* Reasons & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Meal Waste Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={wasteStatus}
                  onChange={(e) => setWasteStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                >
                  <option value="Recorded">Recorded</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Primary Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={primaryReason}
                  onChange={(e) => setPrimaryReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                >
                  <option value="Uneaten Food">Uneaten Food</option>
                  <option value="Food Quality">Food Quality</option>
                  <option value="Over Portioning">Over Portioning</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Waste Collection Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                >
                  <option value="Manual Collection">Manual Collection</option>
                  <option value="Weighing Bin">Weighing Bin</option>
                  <option value="Automated Scale">Automated Scale</option>
                </select>
              </div>
            </div>

            {/* Detailed Reason Chips */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                Detailed Reason <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Food Quality', 'Over Preparation', 'Customer Preference', 'Cold Food', 'Wrong Flavor'].map((tag) => {
                  const isSelected = selectedReasons.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleReason(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-[#084E92] border border-blue-300 shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag} {isSelected && '×'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">Remarks</label>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks (optional)..."
                  className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-gray-400 font-medium">
                  {remarks.length}/500
                </span>
              </div>
            </div>

            {/* Photo Upload Dropzone */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">Photo (Optional)</label>
              <div className="border-2 border-dashed border-gray-200 hover:border-[#084E92] rounded-2xl p-6 text-center cursor-pointer transition">
                <UploadCloud size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-[#084E92]">
                  Click to upload <span className="text-gray-500 font-normal">or drag and drop</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG (Max 5MB)</p>
              </div>
            </div>

            {/* Form Button actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                Clear Form
              </button>
              <button
                type="button"
                onClick={() => notify.success('Meal waste draft saved')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
              >
                <Save size={13} />
                Save Meal Waste
              </button>
            </div>
          </div>

          {/* 4. Meal-Level Calculation Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Utensils size={16} className="text-[#084E92]" />
                <h3 className="text-sm font-bold text-gray-900">4. Meal–Level Calculation</h3>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-[#084E92]">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span className="leading-snug">Plate waste is measured collectively after meal service.</span>
              </div>

              {/* Calculation List matching Figma 5.11 */}
              <div className="space-y-3 pt-2 text-xs divide-y divide-gray-100">
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-600 font-medium">Total meal dispatched</span>
                  <span className="font-bold text-gray-900">68.5 kg</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-600 font-medium">
                    Less service leftovers <span className="text-[10px] text-gray-400 block">(unserved food)</span>
                  </span>
                  <span className="font-bold text-gray-700">3.5 kg</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-700 font-bold">Estimated served quantity</span>
                  <span className="font-bold text-[#084E92]">65.0 kg</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-600 font-medium">
                    Less plate waste <span className="text-[10px] text-gray-400 block">(collected)</span>
                  </span>
                  <span className="font-bold text-rose-600">2.9 kg</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-700 font-bold">Estimated consumed quantity</span>
                  <span className="font-bold text-emerald-700">62.1 kg</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-600 font-medium">Pax served</span>
                  <span className="font-bold text-gray-900">78</span>
                </div>
              </div>

              {/* Waste per Person Card */}
              <div className="p-4 rounded-xl bg-[#084E92] text-white flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Waste Per Person</span>
                  <span className="text-[11px] opacity-70">Calculated average</span>
                </div>
                <span className="text-xl font-bold tracking-tight">37.1 g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => notify.success('Draft saved successfully')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <Save size={14} />
            Save
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
          >
            <Check size={14} />
            Submit Meal Waste Record
          </button>
        </div>
      </div>
    </Container>
  );
};

export default PlateWasteRecording;
