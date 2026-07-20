import { Eye, Loader2, Plus, SquarePen, X } from 'lucide-react'
import React from 'react'

const ConditionModal = ({
  mode,
  formData,
  loading,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}) => {
  if (!mode) return null;

  const isViewMode = mode === "view";
  const title = mode === "edit" ? "Edit Condition" : mode === "view" ? "View Condition" : "Add Condition";
  const subtitle =
    mode === "view"
      ? "Asset lifecycle condition details"
      : "Create or update an asset lifecycle condition";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div className="flex gap-3 items-center flex-1">
            <div className="w-12 h-12 rounded-xl bg-[#084E92] flex items-center justify-center">
              {mode === "view" ? (
                <Eye className="text-white" size={20} />
              ) : mode === "edit" ? (
                <SquarePen className="text-white" size={20} />
              ) : (
                <Plus className="text-white" size={20} />
              )}
            </div>

            <div>
              <h2 className="text-base md:text-lg font-semibold text-[#0F172A]">
                {title}
              </h2>

              <p className="text-sm text-[#737781]">
                {subtitle}
              </p>
            </div>
          </div>

          <button onClick={onClose}>
            <X className="text-gray-500 cursor-pointer" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#5F6368]">
              <Loader2 size={18} className="animate-spin" />
              Loading condition...
            </div>
          ) : (
            <>
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-[#43474F] mb-2">
                    Condition Name
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Near Mint"
                    value={formData.name}
                    disabled={isViewMode}
                    onChange={(e) => onChange({ ...formData, name: e.target.value })}
                    className="w-full border border-[#D9DEE8] rounded-xl px-4 py-2 outline-none disabled:bg-[#F5F6F8] disabled:text-[#5F6368]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#43474F] mb-2">
                    Status
                  </label>

                  <p className='px-3 py-2 border border-[#D9DEE8] rounded-xl'>
                    <select
                      value={formData.status}
                      disabled={isViewMode}
                      onChange={(e) => onChange({ ...formData, status: e.target.value })}
                      className="w-full outline-none disabled:bg-transparent disabled:text-[#5F6368]"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#C3C6D1] p-4 md:p-6 flex flex-col justify-between sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-[#C3C6D1] rounded-xl font-medium cursor-pointer text-[#43474F]"
          >
            {isViewMode ? "Close" : "Cancel"}
          </button>

          {!isViewMode && (
            <div className='flex gap-3 flex-col sm:flex-row'>
              <button
                onClick={onSave}
                disabled={saving || loading}
                className="px-6 py-2 bg-[#084E92] text-white rounded-xl font-medium cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Condition
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConditionModal;