import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const MenuPlanConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  confirmationData = null,
}) => {
  if (!isOpen) return null;

  const {
    errorMessage,
    affectedRecipesCount,
    affectedDaysCount,
    affectedMealTypes = [],
  } = confirmationData || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Confirmation Required
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {errorMessage ||
                'Modifying the date range or meal structures will permanently remove recipes already planned for the affected shifts and dates.'}
            </p>
          </div>
        </div>

        {/* Stats highlight card */}
        {(affectedRecipesCount !== undefined || affectedDaysCount !== undefined) && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Affected Recipes:</span>
              <span className="font-extrabold text-amber-800">
                {affectedRecipesCount ?? 0} recipe(s)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Affected Days:</span>
              <span className="font-extrabold text-amber-800">
                {affectedDaysCount ?? 0} day(s)
              </span>
            </div>

            {affectedMealTypes && affectedMealTypes.length > 0 && (
              <div className="pt-2 border-t border-amber-200/70">
                <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
                  Affected Meal Types:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {affectedMealTypes.map((type, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-amber-300 text-amber-900"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning Alert Note */}
        <p className="text-[11px] text-red-600 font-medium">
          Note: This action cannot be undone. All recipes inside the removed dates or structures will be deleted.
        </p>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Yes, Proceed'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuPlanConfirmModal;