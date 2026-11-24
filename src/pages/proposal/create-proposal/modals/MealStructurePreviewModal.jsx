import { useState, useMemo } from 'react';
import { X, Layers, Loader2, Search, UtensilsCrossed } from 'lucide-react';

export const MealStructurePreviewModal = ({
  isOpen,
  onClose,
  structure = null,
  loading = false,
  zIndex = 'z-[60]',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const slots = useMemo(() => {
    if (!structure) return [];
    const raw =
      structure.details ||
      structure.slots ||
      structure.mealStructureSlots ||
      structure.items ||
      [];
    return Array.isArray(raw) ? raw : [];
  }, [structure]);

  const filteredSlots = useMemo(() => {
    if (!searchTerm.trim()) return slots;
    const q = searchTerm.toLowerCase();
    return slots.filter((slot, idx) => {
      const name = (slot.mealSlotName || slot.slotName || slot.name || `Slot ${idx + 1}`).toLowerCase();
      const cat = (slot.kitchenMenuCategoryName || slot.categoryName || '').toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [slots, searchTerm]);

  if (!isOpen) return null;

  const structName =
    structure?.structureName || structure?.name || 'Meal Structure Preview';
  const mealTypeName =
    structure?.mealTypeName || structure?.mealType?.name || '';

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 truncate">{structName}</h3>
                <span className="text-[10px] font-bold bg-blue-100 text-[#084E92] px-2 py-0.5 rounded-full shrink-0">
                  Structure Preview
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {mealTypeName ? `${mealTypeName} • ` : ''}
                {slots.length} configured {slots.length === 1 ? 'course/slot' : 'courses/slots'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search bar (only if slots > 3) */}
        {slots.length > 3 && (
          <div className="px-5 pt-3 pb-1 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search slot or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#084E92] bg-gray-50/50"
              />
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 size={20} className="animate-spin text-[#084E92]" />
              <span>Loading meal structure details...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-1.5">
              <UtensilsCrossed size={24} className="text-gray-300" />
              <span>No courses or slots configured in this meal structure.</span>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              No slots match &quot;{searchTerm}&quot;
            </div>
          ) : (
            filteredSlots.map((slot, sIdx) => {
              const slotName =
                slot.mealSlotName || slot.slotName || slot.name || `Slot ${sIdx + 1}`;
              const catName =
                slot.kitchenMenuCategoryName || slot.categoryName || '';
              const min = slot.minimumItems ?? slot.minCount ?? 0;
              const max = slot.maximumItems ?? slot.maxCount ?? 0;

              return (
                <div
                  key={slot.id || sIdx}
                  className="flex items-center justify-between bg-white border border-gray-200/80 rounded-xl px-3 py-2.5 shadow-2xs hover:border-blue-200 hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#084E92] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-gray-800 truncate block">
                        {slotName}
                      </span>
                      {catName && (
                        <span className="text-[10px] text-gray-400 font-medium truncate block">
                          Category: {catName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 shrink-0 ml-2">
                    {min === max
                      ? `${min} item${min !== 1 ? 's' : ''}`
                      : `${min} - ${max} items`}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Total Slots: <strong className="text-gray-800">{slots.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealStructurePreviewModal;
