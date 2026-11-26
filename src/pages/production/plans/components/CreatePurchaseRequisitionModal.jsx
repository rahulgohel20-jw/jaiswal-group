import React from 'react';
import { X, FileText, PlusCircle } from 'lucide-react';

export const CreatePurchaseRequisitionModal = ({ isOpen, onClose, shortfalls = [], onCreatePR }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-[#E7EAF0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Create Purchase Requisition</h3>
              <p className="text-xs text-gray-500">Create a purchase requisition for ingredients with shortfall in this production plan.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[10px] font-bold uppercase text-gray-400">
                <th className="pb-2">Shortfall Ingredients</th>
                <th className="pb-2">Base UOM</th>
                <th className="pb-2 text-right">Requested Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shortfalls.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">No shortfall items detected.</td>
                </tr>
              ) : (
                shortfalls.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 font-semibold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {item.rawMaterial || item.ingredient}
                    </td>
                    <td className="py-2.5 text-gray-500">{item.uom || item.baseUom}</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
                        {item.requiredQty || item.shortfall}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200/60 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onCreatePR?.();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs"
          >
            <PlusCircle size={14} />
            Create Purchase Requisition
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseRequisitionModal;
