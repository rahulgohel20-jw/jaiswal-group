import React from 'react';
import { X, UtensilsCrossed } from 'lucide-react';

export const IngredientDetailsModal = ({ isOpen, onClose, ingredientName = 'Paneer' }) => {
  if (!isOpen) return null;

  const mockAllocations = [
    { recipe: 'Paneer Butter Masala', requiredQty: '250 g', rate: 120, cost: 3000 },
    { recipe: 'Paneer Tikka', requiredQty: '200 g', rate: 120, cost: 2400 },
    { recipe: 'Paneer Kadhai', requiredQty: '150 g', rate: 120, cost: 1800 },
    { recipe: 'Paneer Bhurji', requiredQty: '100 g', rate: 120, cost: 1200 },
    { recipe: 'Veg Pulav', requiredQty: '80 g', rate: 120, cost: 960 },
    { recipe: 'Paneer Wrap', requiredQty: '70 g', rate: 120, cost: 840 },
    { recipe: 'Paneer Sandwich', requiredQty: '50 g', rate: 120, cost: 600 },
    { recipe: 'Special Thali', requiredQty: '40 g', rate: 120, cost: 480 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-[#E7EAF0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ingredient Details</h3>
              <p className="text-xs text-gray-500">View ingredient requirements and estimated costs across recipes.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Ingredient */}
        <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-500">Ingredient Name:</span>
          <span className="text-xs font-bold text-gray-900">{ingredientName}</span>
        </div>

        {/* Table */}
        <div className="p-5 max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[10px] font-bold uppercase text-gray-400">
                <th className="pb-2">Recipe/Item Name</th>
                <th className="pb-2 text-right">Required Quantity</th>
                <th className="pb-2 text-right">Rate (₹)</th>
                <th className="pb-2 text-right">Estimated Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockAllocations.map((alloc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-medium text-gray-800">{alloc.recipe}</td>
                  <td className="py-2.5 text-right text-gray-600 font-semibold">{alloc.requiredQty}</td>
                  <td className="py-2.5 text-right text-gray-500">₹ {alloc.rate}</td>
                  <td className="py-2.5 text-right font-bold text-gray-900">₹ {alloc.cost.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Showing all {mockAllocations.length} allocations for {ingredientName}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientDetailsModal;
