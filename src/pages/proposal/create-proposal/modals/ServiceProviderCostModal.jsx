import { useState, useEffect } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';

export const ServiceProviderCostModal = ({
  isOpen,
  onClose,
  row,
  basicDetails = {},
  onSave,
}) => {
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !row) return;

    const existingCost =
      row.totalCost !== undefined && row.totalCost !== null && row.totalCost !== ''
        ? String(row.totalCost)
        : row.serviceProviderCost !== undefined && row.serviceProviderCost !== null && row.serviceProviderCost !== ''
        ? String(row.serviceProviderCost)
        : row.price !== undefined && row.price !== null && row.price !== ''
        ? String(row.price)
        : '';
    setCost(existingCost);
    setStartDate(row.startDate || row.fromDate || basicDetails.serviceStartDate || '');
    setEndDate(row.endDate || row.toDate || basicDetails.serviceEndDate || '');
    setErrors({});
  }, [isOpen, row, basicDetails]);

  if (!isOpen || !row) return null;

  const validate = () => {
    const err = {};
    if (cost === '' || isNaN(Number(cost)) || Number(cost) < 0) {
      err.cost = 'Please enter a valid cost (0 or greater)';
    }
    if (!startDate) {
      err.startDate = 'Start date is required';
    }
    if (!endDate) {
      err.endDate = 'End date is required';
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      err.endDate = 'End date cannot be earlier than start date';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      cost: Number(cost) || 0,
      startDate,
      endDate,
    });
    onClose();
  };

  let daysDiff = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e - s;
    if (diffTime >= 0) {
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Service Provider Allocation</h2>
              <p className="text-xs text-gray-400">
                Configure expense amount and validity date range
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          {/* Target Cost Factor Badge */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 text-[11px] block">Cost Factor</span>
              <span className="font-bold text-gray-900">
                {row.costFactor || row.costType || 'Overhead Item'}
              </span>
            </div>
            <span className="px-2.5 py-1 bg-white border border-gray-200 text-[#084E92] text-[11px] font-bold rounded-lg shadow-2xs">
              {row.costType || 'General'}
            </span>
          </div>

          {/* Storing Cost */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Service Provider Cost (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  if (errors.cost) setErrors((prev) => ({ ...prev, cost: '' }));
                }}
                placeholder="e.g. 5000"
                className={`w-full h-10 pl-7 pr-3 text-xs font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                  errors.cost ? 'border-red-500' : 'border-[#C3C6D1]'
                }`}
              />
            </div>
            {errors.cost && <p className="text-[11px] text-red-500 mt-1">{errors.cost}</p>}
          </div>

          {/* Start Date & End Date Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                  className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                    errors.startDate ? 'border-red-500' : 'border-[#C3C6D1]'
                  }`}
                />
              </div>
              {errors.startDate && (
                <p className="text-[11px] text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                    errors.endDate ? 'border-red-500' : 'border-[#C3C6D1]'
                  }`}
                />
              </div>
              {errors.endDate && (
                <p className="text-[11px] text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Duration Summary */}
          {daysDiff > 0 && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 text-[11px]">Duration</span>
              <span className="font-bold text-[#084E92]">{daysDiff} Days</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#00376C] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Check size={14} />
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceProviderCostModal;
