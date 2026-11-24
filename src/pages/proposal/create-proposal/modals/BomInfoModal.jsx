import { X, Layers, Flame, Package, Info } from 'lucide-react';

export const BomInfoModal = ({
  isOpen,
  onClose,
  recipeName = 'Recipe',
  slotName = '',
  materials = [],
  rawMaterialCost = 0,
  fuelUtilityCost = 0,
  totalPortionCost = 0,
  isSnapshot = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">{recipeName}</h3>
                {slotName && (
                  <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {slotName}
                  </span>
                )}
                {isSnapshot && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Saved Snapshot
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">Bill of Materials (BOM) & Portion Cost Breakdown</p>
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

        {/* Cost Summary Banner */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-white px-6 py-3.5 text-center">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Raw Material Cost
            </span>
            <span className="text-sm font-bold text-gray-900 block mt-0.5">
              ₹{Number(rawMaterialCost || 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              LPG / Fuel Utility
            </span>
            <span className="text-sm font-bold text-amber-600 block mt-0.5 flex items-center justify-center gap-1">
              <Flame size={13} className="text-amber-500" />
              ₹{Number(fuelUtilityCost || 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Portion Cost
            </span>
            <span className="text-sm font-bold text-[#084E92] block mt-0.5">
              ₹{Number(totalPortionCost || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Materials Table */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <Package size={14} className="text-gray-400" />
              Ingredient List ({materials.length})
            </h4>
            <span className="text-[11px] text-gray-400 italic">
              Rates derived from live stock & last purchase pricing
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Raw Material</th>
                  <th className="py-2.5 px-3 text-right">Portion Qty</th>
                  <th className="py-2.5 px-3 text-center">UOM</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                  <th className="py-2.5 px-3 text-center">Rate Source</th>
                  <th className="py-2.5 px-3 text-right">Total Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      No materials configured for this recipe.
                    </td>
                  </tr>
                ) : (
                  materials.map((mat, idx) => (
                    <tr key={mat.rawMaterialId || idx} className="hover:bg-gray-50/50 transition">
                      <td className="py-2 px-3 text-gray-400 text-[11px]">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900 whitespace-nowrap">
                        {mat.rawMaterialName || mat.materialName || '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-800 font-semibold">
                        {Number(mat.quantityPerPortion || mat.quantity || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center text-gray-500 text-[11px]">
                        {mat.uomSymbol || mat.uom || '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">
                        ₹{Number(mat.effectiveUnitRate || mat.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {mat.rateSource || 'LAST_PURCHASE'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        ₹{Number(mat.totalMaterialCost || mat.cost || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {materials.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200 font-bold text-xs text-[#084E92]">
                    <td colSpan={6} className="py-2.5 px-3 text-right">
                      Total Ingredient Cost:
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-900">
                      ₹{Number(rawMaterialCost || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-900">
            <Info size={14} className="text-[#084E92] shrink-0 mt-0.5" />
            <p>
              Costs are automatically recalculated by the backend based on store pricing basis, portion size, and fuel utility overheads.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BomInfoModal;
