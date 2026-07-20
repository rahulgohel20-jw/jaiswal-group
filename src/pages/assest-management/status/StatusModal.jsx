import { Eye, Loader2, Plus, SlidersVertical, SquarePen, X } from 'lucide-react'
import React from 'react'

/**
 * mode: 'add' | 'edit' | 'view'
 * formData: { id, name, description, active }
 */
const StatusModal = ({
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
  const title = mode === "edit" ? "Edit Status" : mode === "view" ? "View Status" : "Add Status";
  const subtitle = "Configure system-wide asset status settings.";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start px-6 py-5 border-b border-[#E5E7EB]">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] flex items-center justify-center">
                {mode === "view" ? (
                  <Eye size={22} className="text-[#084E92]" />
                ) : mode === "edit" ? (
                  <SquarePen size={22} className="text-[#084E92]" />
                ) : (
                  <SlidersVertical size={22} className="text-[#084E92]" />
                )}
              </div>

              <div>
                <h2 className="text-[24px] text-[#121C2A]">
                  {title}
                </h2>

                <p className="text-[#6B7280]">
                  {subtitle}
                </p>
              </div>
            </div>

            <button onClick={onClose} className='cursor-pointer'>
              <X size={22} className="text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-[#6B7280]">
                <Loader2 size={18} className="animate-spin" />
                Loading status...
              </div>
            ) : (
              <>
                {error && (
                  <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#374151]">
                      Status Name <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      value={formData.name}
                      disabled={isViewMode}
                      onChange={(e) => onChange({ ...formData, name: e.target.value })}
                      placeholder="e.g. Under Maintenance"
                      className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 outline-none disabled:bg-[#F5F6F8] disabled:text-[#6B7280]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#374151]">
                      Status
                    </label>

                    <p className='border border-[#D1D5DB] rounded-xl px-4 py-3'>
                      <select
                        value={formData.active ? "Active" : "Inactive"}
                        disabled={isViewMode}
                        onChange={(e) => onChange({ ...formData, active: e.target.value === "Active" })}
                        className="w-full outline-none disabled:bg-transparent disabled:text-[#6B7280]"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-[#374151]">
                    Description <span className="text-[#9CA3AF] font-normal">(optional)</span>
                  </label>

                  <textarea
                    rows={3}
                    value={formData.description}
                    disabled={isViewMode}
                    onChange={(e) => onChange({ ...formData, description: e.target.value })}
                    placeholder="Add any notes about when this status applies..."
                    className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 outline-none resize-none disabled:bg-[#F5F6F8] disabled:text-[#6B7280]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-[#EFF4FF] border-[#C3C6D166] px-6 py-4 flex justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-[#D1D5DB] rounded-xl text-[#4B5563] bg-[#FFFFFF] cursor-pointer"
            >
              {isViewMode ? "Close" : "Cancel"}
            </button>

            {!isViewMode && (
              <div className='flex gap-3'>
                <button
                  onClick={onSave}
                  disabled={saving || loading}
                  className="px-6 py-3 bg-[#084E92] text-white rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Status
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusModal;