import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Calendar,
  Download,
  Plus,
  Eye,
  Truck,
  Printer,
  RotateCcw,
  Check,
  Save,
  Thermometer,
  ShieldCheck,
  Phone,
  User,
  Layers,
  Filter
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { StatusBadge } from '@/components/production/StatusBadge';
import {
  MOCK_FOOD_TRANSFERS_REGISTER,
  MOCK_DISPATCH_ITEMS
} from '../mockData/productionMockData';
import { notify } from '@/utils/toast';

export const FoodTransferTracker = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('workspace'); // 'register' or 'workspace'

  // Register filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitchen, setSelectedKitchen] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Workspace form state
  const [dispatchDate, setDispatchDate] = useState('2026-10-22');
  const [sourceKitchen, setSourceKitchen] = useState('Maruti Main Kitchen');
  const [destination, setDestination] = useState('All Outlets');
  const [meal, setMeal] = useState('Lunch');

  const [selectedPlanInList, setSelectedPlanInList] = useState('PP-2026-001');
  const [vehicleNo, setVehicleNo] = useState('GJ-01-AB-2845');
  const [dispatchTemp, setDispatchTemp] = useState('72');
  const [driverName, setDriverName] = useState('Mukesh Patel');
  const [driverMobile, setDriverMobile] = useState('+91 98765 43210');
  const [sealNo, setSealNo] = useState('SEAL-007-101');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [dispatchItems, setDispatchItems] = useState(MOCK_DISPATCH_ITEMS);

  const filteredTransfers = MOCK_FOOD_TRANSFERS_REGISTER.filter((t) => {
    const matchesSearch =
      t.transferNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fromKitchen.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDispatchNow = () => {
    notify.success('Food transfer dispatched successfully! Vehicle logged.');
    setActiveTab('register');
  };

  const handlePrint = () => {
    notify.info('Preparing print preview for dispatch gate-pass...');
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Food Dispatch & Transfer Tracker"
          description="Track and manage food dispatches and transfers between kitchens and outlets."
          actions={
            <div className="flex items-center gap-3">
              {/* View Switcher Pill */}
              <div className="p-1 bg-gray-100 rounded-xl flex items-center border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'workspace' ? 'bg-white text-[#084E92] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Dispatch Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'register' ? 'bg-white text-[#084E92] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Transfers Register
                </button>
              </div>

              {activeTab === 'workspace' ? (
                <HeaderActionButton
                  onClick={handlePrint}
                  icon={Printer}
                  label="Print Dispatch Details"
                  variant="outline"
                />
              ) : (
                <HeaderActionButton
                  onClick={() => setActiveTab('workspace')}
                  icon={Plus}
                  label="New Transfer"
                />
              )}
            </div>
          }
        />

        {/* VIEW A: TRANSFERS REGISTER */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px] flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transfer no., plan, item..."
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
                  className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none"
                >
                  <option value="All">All Kitchens</option>
                  <option value="Central Kitchen">Central Kitchen</option>
                  <option value="City Center Kitchen">City Center Kitchen</option>
                  <option value="Production Kitchen">Production Kitchen</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs text-gray-700 font-medium focus:outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => notify.info('Exporting transfer logs...')}
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
                      <th className="py-3 px-4">Transfer No.</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Production Plan</th>
                      <th className="py-3 px-4">From Kitchen</th>
                      <th className="py-3 px-4">To Kitchen / Outlet</th>
                      <th className="py-3 px-4 text-center">Item Count</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransfers.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#084E92]">{item.transferNo}</td>
                        <td className="py-3.5 px-4 text-gray-700 font-medium">{item.date}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{item.planCode}</td>
                        <td className="py-3.5 px-4 text-gray-700">{item.fromKitchen}</td>
                        <td className="py-3.5 px-4 text-gray-700">{item.toOutlet}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-gray-600">{item.itemCount} items</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{item.qty}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveTab('workspace')}
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
            </div>
          </div>
        )}

        {/* VIEW B: DISPATCH WORKSPACE */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            {/* Workspace Filters */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={14} className="text-[#084E92]" />
                  Filters
                </span>
                <span className="text-[11px] text-gray-400">Filter production schedule & transfers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Source Kitchen</label>
                  <select
                    value={sourceKitchen}
                    onChange={(e) => setSourceKitchen(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  >
                    <option value="Maruti Main Kitchen">Maruti Main Kitchen</option>
                    <option value="Central Kitchen">Central Kitchen</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Destination</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  >
                    <option value="All Outlets">All Outlets</option>
                    <option value="Tata Motors Plant Canteen">Tata Motors Plant Canteen</option>
                    <option value="Reliance Mall Food Court">Reliance Mall Food Court</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Meal</label>
                  <select
                    value={meal}
                    onChange={(e) => setMeal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  >
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Breakfast">Breakfast</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => notify.info('Filters reset')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => notify.success('Filters applied')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70]"
                >
                  <Filter size={12} />
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Scheduled Dispatch List Preview */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dispatch List</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92]">
                    5 Plans
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Scheduled dispatches for selected period</span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {[
                  { code: 'PP-2026-001', dest: 'Tata Motors Plant Canteen', meal: 'Lunch' },
                  { code: 'PP-2026-002', dest: 'Reliance Mall Food Court', meal: 'Dinner' },
                  { code: 'PP-2026-003', dest: 'Tech Park Canteen', meal: 'Breakfast' },
                  { code: 'PP-2026-004', dest: 'Phoenix Mall', meal: 'Lunch' },
                  { code: 'PP-2026-005', dest: 'IBM Campus Canteen', meal: 'Dinner' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPlanInList(item.code)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                      selectedPlanInList === item.code ? 'bg-blue-50/70 border-l-4 border-[#084E92]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-[#084E92]">{item.code}</span>
                    <span className="text-gray-700 font-medium">{item.dest}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {item.meal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer and Dispatch Details Card */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Transfer and Dispatch Details</h3>
                  <p className="text-xs text-gray-500">Assign destination, driver credentials and manifest validation.</p>
                </div>
                <button
                  type="button"
                  onClick={() => notify.success('Transfer created')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70]"
                >
                  <Plus size={14} />
                  Create Transfer
                </button>
              </div>

              {/* Transfer Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Source</span>
                  <select className="text-xs font-bold text-gray-900 bg-transparent outline-none mt-0.5">
                    <option>Maruti Finished Food Store</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Destination</span>
                  <select className="text-xs font-bold text-gray-900 bg-transparent outline-none mt-0.5">
                    <option>Tata Motors Plant Canteen</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Production Plan</span>
                  <select className="text-xs font-bold text-[#084E92] bg-transparent outline-none mt-0.5">
                    <option>PP-2026-007</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Scheduled Dispatch</span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">22 Oct 2026, 12:30 PM</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Status</span>
                  <select className="text-xs font-bold text-emerald-700 bg-transparent outline-none mt-0.5">
                    <option>Ready to Dispatch</option>
                  </select>
                </div>
              </div>

              {/* Dispatch Credentials Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Dispatch Temperature (°C)</label>
                  <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                    <input
                      type="text"
                      value={dispatchTemp}
                      onChange={(e) => setDispatchTemp(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs font-bold text-gray-800"
                    />
                    <span className="text-xs font-bold text-emerald-600">°C</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Driver Mobile</label>
                  <input
                    type="text"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Seal Number</label>
                  <input
                    type="text"
                    value={sealNo}
                    onChange={(e) => setSealNo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Enter any additional notes about the dispatch..."
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Items to Dispatch Table */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Items to Dispatch</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {dispatchItems.length} Items Ready
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Itemized recipes & thermal conditions</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Item / Recipe</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4 text-right">Transfer Quantity</th>
                      <th className="py-3 px-4 text-center">Container Count</th>
                      <th className="py-3 px-4 text-center">Temperature</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dispatchItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">{item.item}</td>
                        <td className="py-3 px-4 font-medium text-gray-600">{item.batchNo}</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-800">{item.transferQty}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-700">{item.containerCount}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {item.temp}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Workspace Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs font-bold text-gray-700">
                  <span className="text-[#084E92] text-sm">68.5 kg</span>
                  <span>Total Container Count: <strong className="text-gray-900">42</strong></span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => notify.success('Dispatch draft saved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchNow}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
                  >
                    Dispatch Now
                    <Truck size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default FoodTransferTracker;
