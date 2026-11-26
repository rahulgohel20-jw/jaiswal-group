import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Calendar,
  Clock,
  User,
  Flag,
  Store,
  ChefHat,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  Building2,
  Truck,
  Thermometer,
  Boxes
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import { MOCK_MENU_PLANS, MOCK_DESTINATION_OUTLETS } from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const CreateProductionPlan = () => {
  const navigate = useNavigate();

  // Planning Source
  const [selectedMenuPlanId, setSelectedMenuPlanId] = useState('MP-01');
  const selectedPlan = MOCK_MENU_PLANS.find((p) => p.id === selectedMenuPlanId) || MOCK_MENU_PLANS[0];

  // Production Details
  const [planCode] = useState('PP-2025-001');
  const [productionDate, setProductionDate] = useState('2025-04-01');
  const [startTime, setStartTime] = useState('08:00');
  const [expectedCompletion, setExpectedCompletion] = useState('14:00');
  const [supervisor, setSupervisor] = useState('Rahul Sharma');
  const [priority, setPriority] = useState('High');
  const [issueStore, setIssueStore] = useState('Main Store');
  const [producingKitchen, setProducingKitchen] = useState('Maruti Main Kitchen');
  const [notes, setNotes] = useState('');

  // Destination & Stock-In
  const [stockInLocation, setStockInLocation] = useState('Cold Storage');
  const [dispatchMode, setDispatchMode] = useState('Refrigerated Transport');
  const [tempCheckRequired, setTempCheckRequired] = useState(true);
  const [batchTrackingRequired, setBatchTrackingRequired] = useState(true);

  // Destination Outlets List
  const [destinations, setDestinations] = useState(MOCK_DESTINATION_OUTLETS);

  const toggleSelectDestination = (id) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const handlePaxChange = (id, val) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, plannedPax: val } : d))
    );
  };

  const handleDeliveryTimeChange = (id, val) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, deliveryTime: val } : d))
    );
  };

  const toggleTransferRequired = (id) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, transferRequired: !d.transferRequired } : d))
    );
  };

  const handleDeleteDestination = (id) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    notify.info('Destination removed');
  };

  const handleAddDestination = () => {
    const newId = destinations.length + 1;
    setDestinations((prev) => [
      ...prev,
      {
        id: newId,
        selected: true,
        outlet: `Outlet - New City ${newId}`,
        subLocation: 'Main Kitchen',
        plannedPax: 100,
        deliveryTime: '01:00 PM',
        transferRequired: true,
        notes: ''
      }
    ]);
    notify.success('New destination outlet added');
  };

  const totalDestinations = destinations.filter((d) => d.selected).length;
  const totalPlannedPax = destinations
    .filter((d) => d.selected)
    .reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);

  const handleSaveDraft = () => {
    notify.success('Plan setup saved as draft.');
  };

  const handleContinue = () => {
    if (totalDestinations === 0) {
      notify.error('Please select at least one destination outlet.');
      return;
    }
    notify.success('Step 1 saved. Proceeding to Recipe Allocation.');
    navigate('/production/plans/1/allocation');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Create Production Plan"
          description="Set production scope, recipes, destinations and stock-in preferences."
          backTo="/production/plans"
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
          currentStep={1}
          onStepClick={(num) => {
            if (num === 2) navigate('/production/plans/1/allocation');
            if (num === 3) navigate('/production/plans/1/sourcing');
          }}
        />

        {/* Section 1: Planning Source */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Planning Source</h3>
              <p className="text-xs text-gray-500">Choose how you want to create this production plan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Approved Menu Plan <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMenuPlanId}
                onChange={(e) => setSelectedMenuPlanId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#C3C6D1] text-xs font-medium bg-white focus:outline-none focus:border-[#084E92] transition"
              >
                {MOCK_MENU_PLANS.map((mp) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Selected approved master menu recipe framework.</p>
            </div>

            {/* Read-only Menu Plan Summary Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#084E92]" />
                  Menu Plan Summary
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={11} />
                  {selectedPlan.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Outlet</span>
                  <span className="font-semibold text-gray-800">{selectedPlan.outlet}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Duration</span>
                  <span className="font-semibold text-gray-800">{selectedPlan.duration}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Menu Items</span>
                  <span className="font-semibold text-gray-800">{selectedPlan.menuItems} Items</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Planned Demand</span>
                  <span className="font-semibold text-[#084E92]">{selectedPlan.plannedDemand}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Production Details */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Production Details</h3>
              <p className="text-xs text-gray-500">Define the basic details for this production plan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Production Plan Code</label>
              <input
                type="text"
                readOnly
                value={planCode}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Expected Completion <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Supervisor <span className="text-rose-500">*</span>
              </label>
              <select
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="Rahul Sharma">Rahul Sharma</option>
                <option value="Chef Sanjeev">Chef Sanjeev</option>
                <option value="Amit Kumar">Amit Kumar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Raw Material Issue Store <span className="text-rose-500">*</span>
              </label>
              <select
                value={issueStore}
                onChange={(e) => setIssueStore(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="Main Store">Main Store</option>
                <option value="Central Cold Storage">Central Cold Storage</option>
                <option value="Dry Provision Store">Dry Provision Store</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Producing Kitchen <span className="text-rose-500">*</span>
              </label>
              <select
                value={producingKitchen}
                onChange={(e) => setProducingKitchen(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="Maruti Main Kitchen">Maruti Main Kitchen</option>
                <option value="Central Kitchen">Central Kitchen</option>
                <option value="City Center Kitchen">City Center Kitchen</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Notes (Optional)</label>
            <div className="relative">
              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional notes..."
                className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
              <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
                {notes.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Destination & Stock-In */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Destination & Stock-In</h3>
              <p className="text-xs text-gray-500">Configure stock-in location and destination outlets for the produced food.</p>
            </div>
          </div>

          {/* Controls & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Primary Stock-In Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={stockInLocation}
                onChange={(e) => setStockInLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="Cold Storage">Cold Storage</option>
                <option value="Hot Hold Counter">Hot Hold Counter</option>
                <option value="Dispatch Area">Dispatch Area</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Default Dispatch Mode <span className="text-rose-500">*</span>
              </label>
              <select
                value={dispatchMode}
                onChange={(e) => setDispatchMode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="Refrigerated Transport">Refrigerated Transport</option>
                <option value="Insulated Hot Van">Insulated Hot Van</option>
                <option value="Standard Van">Standard Van</option>
              </select>
            </div>

            {/* Toggle 1 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Temperature Check Required</span>
                <span className="text-[10px] text-gray-400 block">Ensure temperature check before dispatch.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={tempCheckRequired}
                  onChange={(e) => setTempCheckRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#084E92]" />
              </label>
            </div>

            {/* Toggle 2 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Batch Tracking Required</span>
                <span className="text-[10px] text-gray-400 block">Track batches for quality and traceability.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={batchTrackingRequired}
                  onChange={(e) => setBatchTrackingRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#084E92]" />
              </label>
            </div>
          </div>

          {/* Destination Outlets Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Destination Outlets</h4>
                <p className="text-[11px] text-gray-400">Configure destination distribution quotas and timings.</p>
              </div>
              <span className="text-xs text-gray-500 font-medium">Showing {destinations.length} active locations</span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={destinations.every((d) => d.selected)}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setDestinations((prev) => prev.map((d) => ({ ...d, selected: val })));
                        }}
                        className="rounded border-gray-300 text-[#084E92]"
                      />
                    </th>
                    <th className="py-3 px-3">Destination Outlet</th>
                    <th className="py-3 px-3">Sub-Location</th>
                    <th className="py-3 px-3">Planned PAX (Per Day)</th>
                    <th className="py-3 px-3">Delivery Time</th>
                    <th className="py-3 px-3 text-center">Transfer Required</th>
                    <th className="py-3 px-3">Notes</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {destinations.map((dest) => (
                    <tr key={dest.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={dest.selected}
                          onChange={() => toggleSelectDestination(dest.id)}
                          className="rounded border-gray-300 text-[#084E92]"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{dest.outlet}</td>
                      <td className="py-2.5 px-3 text-gray-500">{dest.subLocation}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={dest.plannedPax}
                          onChange={(e) => handlePaxChange(dest.id, Number(e.target.value))}
                          className="w-24 h-8 px-2 rounded-lg border border-[#C3C6D1] text-xs font-semibold text-gray-800 text-center focus:border-[#084E92] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={dest.deliveryTime}
                          onChange={(e) => handleDeliveryTimeChange(dest.id, e.target.value)}
                          className="w-28 h-8 px-2 rounded-lg border border-[#C3C6D1] text-xs font-medium text-gray-700 text-center focus:border-[#084E92] focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dest.transferRequired}
                            onChange={() => toggleTransferRequired(dest.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#084E92]" />
                        </label>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">{dest.notes || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteDestination(dest.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Destination summary & add button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs font-bold text-gray-700 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                <span>Total Destinations: <strong className="text-[#084E92]">{totalDestinations}</strong></span>
                <span className="w-1 h-3 bg-gray-300 rounded-full" />
                <span>Total Planned Pax: <strong className="text-[#084E92]">{totalPlannedPax}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleAddDestination}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                Add Destination
              </button>
            </div>
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
              Back to Production Plans
            </button>
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
              onClick={handleContinue}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Continue to Recipes and Allocation
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default CreateProductionPlan;
