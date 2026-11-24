import React, { useState } from 'react';
import { FileMinus, X, Loader2, Pencil, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/pages/purchase-order-requests/utils/taxUtils';

export const CreateDebitNoteModal = ({
  isOpen,
  onClose,
  items,
  onItemChange,
  generalRemarks,
  onGeneralRemarksChange,
  onSubmit,
  isSubmitting,
}) => {
  const [activeRemarkKeys, setActiveRemarkKeys] = useState({});

  if (!isOpen) return null;

  const toggleRemark = (key) => {
    setActiveRemarkKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRevisedRateChange = (item, value) => {
    if (value === '') {
      onItemChange(item.key, 'revisedRate', '');
      return;
    }

    const numValue = Number(value);
    const originalRate = Number(item.originalRate) || 0;

    // Enforce revised rate cannot exceed invoiced rate
    if (numValue > originalRate) {
      toast.error(`Revised rate cannot exceed the invoiced rate (₹${originalRate})`);
      onItemChange(item.key, 'revisedRate', originalRate);
      return;
    }

    onItemChange(item.key, 'revisedRate', Math.max(0, numValue));
  };

  const handleModalSubmit = () => {
    // Validate that at least one item has a lower revised rate
    const hasValidReduction = items.some(
      (item) => Number(item.revisedRate) < Number(item.originalRate)
    );

    if (!hasValidReduction) {
      toast.error('At least one item must have a revised rate lower than the invoiced rate to create a Debit Note.');
      return;
    }

    // Ensure no item has an empty or invalid revised rate
    const hasInvalidRate = items.some(
      (item) => item.revisedRate === '' || Number(item.revisedRate) > Number(item.originalRate)
    );

    if (hasInvalidRate) {
      toast.error('Please enter valid revised rates lower than or equal to invoiced rates.');
      return;
    }

    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <FileMinus className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-800 text-base">Create Debit Note</h3>
              <p className="text-xs text-gray-500">Adjustment Nature: Rate Difference</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">General Remarks</label>
            <textarea
              rows={2}
              value={generalRemarks}
              onChange={(e) => onGeneralRemarksChange(e.target.value)}
              placeholder="Enter overall reason for raising this debit note..."
              className="w-full p-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92]"
            />
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5 text-right">Invoiced Qty</th>
                  <th className="px-3 py-2.5 text-right">Invoiced Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Revised Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Rate Diff (₹)</th>
                  <th className="px-3 py-2.5 text-right">Taxable Impact (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const originalRate = Number(item.originalRate) || 0;
                  const revisedRate = item.revisedRate === '' ? '' : Number(item.revisedRate);
                  const isRateInvalid = revisedRate !== '' && revisedRate > originalRate;
                  const diff = revisedRate === '' ? 0 : originalRate - revisedRate;
                  const taxableImpact = diff * item.qty;
                  const isRemarkVisible = activeRemarkKeys[item.key] || Boolean(item.remarks?.trim());

                  return (
                    <tr key={item.key} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 max-w-50 truncate" title={item.itemName}>
                            {item.itemName}
                          </span>
                          <span className="text-[10px] text-gray-400">({item.unitName})</span>
                          <button
                            type="button"
                            onClick={() => toggleRemark(item.key)}
                            title="Add / Edit item remark"
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isRemarkVisible
                                ? 'text-[#084E92] bg-blue-50'
                                : 'text-gray-400 hover:text-[#084E92] hover:bg-gray-100'
                            }`}
                          >
                            <Pencil size={12} />
                          </button>
                        </div>

                        {isRemarkVisible && (
                          <div className="mt-1.5">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => onItemChange(item.key, 'remarks', e.target.value)}
                              placeholder="Enter item remark..."
                              autoFocus
                              className="w-full max-w-64 h-7 px-2 text-[11px] rounded border border-gray-200 outline-none focus:border-[#084E92] bg-white shadow-xs"
                            />
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right font-medium text-gray-700 align-top">
                        {item.qty}
                      </td>

                      <td className="px-3 py-2.5 text-right font-medium text-gray-700 align-top">
                        {formatCurrency(originalRate)}
                      </td>

                      <td className="px-3 py-2.5 text-right align-top">
                        <div className="inline-flex flex-col items-end">
                          <input
                            type="number"
                            min="0"
                            max={originalRate}
                            step="0.01"
                            value={item.revisedRate}
                            onChange={(e) => handleRevisedRateChange(item, e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                            className={`w-24 h-8 px-2 rounded border text-sm text-right outline-none ${
                              isRateInvalid
                                ? 'border-red-500 focus:border-red-600 bg-red-50/40 text-red-700'
                                : 'border-gray-200 focus:border-[#084E92]'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-700 align-top">
                        {formatCurrency(diff)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900 align-top">
                        {formatCurrency(taxableImpact)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleModalSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            Generate Debit Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDebitNoteModal;