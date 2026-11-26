import React, { useState, useMemo } from 'react';
import { X, Search, Layers, Loader2 } from 'lucide-react';

const MealStructurePreviewModal = ({ isOpen, onClose, loading, structure }) => {
  const [search, setSearch] = useState('');

  const details = useMemo(() => {
    if (!structure?.details || !Array.isArray(structure.details)) return [];
    return structure.details;
  }, [structure]);

  const filteredDetails = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return details;
    return details.filter((item) => {
      const slotName = (item.mealSlotName || '').toLowerCase();
      const catName = (item.kitchenMenuCategoryName || '').toLowerCase();
      return slotName.includes(term) || catName.includes(term);
    });
  }, [details, search]);

  if (!isOpen) return null;

  const totalSlotsCount = details.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {structure?.name || 'Meal Structure'}
                </h3>
                <span className="text-[10px] font-semibold text-[#084E92] bg-blue-50 px-2 py-0.5 rounded-full">
                  Structure Preview
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {structure?.mealTypeName || 'Shift'} • {totalSlotsCount} configured courses/slots
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slot or category..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#084E92] bg-white transition"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 size={18} className="animate-spin text-[#084E92]" />
              Loading structure slots...
            </div>
          ) : filteredDetails.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No matching slots found.
            </div>
          ) : (
            filteredDetails.map((slot, index) => {
              const seq = slot.sequence || index + 1;
              const maxItems = slot.maximumItems ?? 1;

              return (
                <div
                  key={slot.id || index}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] text-xs font-bold flex items-center justify-center shrink-0">
                      {seq}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {slot.mealSlotName || 'Slot'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Category: {slot.kitchenMenuCategoryName || 'General'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                    {maxItems} item{maxItems > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Slots: <strong className="text-slate-800">{totalSlotsCount}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealStructurePreviewModal;