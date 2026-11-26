import React from 'react';
import { X, FileText } from 'lucide-react';

export const PurchaseRequisitionDetailsModal = ({ isOpen, onClose, prData = null }) => {
  if (!isOpen) return null;

  const data = prData || {
    prCode: 'PR-2026-015',
    itemName: 'Paneer',
    outletName: 'Maruti Main Store',
    prQuantity: '17 kg'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E7EAF0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Purchase Requisition Details</h3>
              <p className="text-xs text-gray-500">Auto-drafted requisition linked to this shortfall item.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Cards Grid matching Figma screenshot 5.6 */}
        <div className="p-6 grid grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/80">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">PR Code</span>
            <span className="text-xs font-bold text-[#084E92] mt-1 block">{data.prCode}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/80">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Item Name</span>
            <span className="text-xs font-bold text-gray-900 mt-1 block">{data.itemName}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/80">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Outlet Name</span>
            <span className="text-xs font-semibold text-gray-800 mt-1 block">{data.outletName}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/80">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">PR Quantity</span>
            <span className="text-xs font-bold text-rose-600 mt-1 block">{data.prQuantity}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisitionDetailsModal;
