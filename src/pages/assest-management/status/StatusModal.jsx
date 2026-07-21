import { Eye, Info, Loader2, Save, SlidersVertical, SquarePen, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const title = isEditMode ? 'Edit Status' : isViewMode ? 'View Status' : 'Add Status';
  const subtitle = isViewMode
    ? 'Review this asset status.'
    : 'Configure system-wide asset status settings.';

  const ModeIcon = isViewMode ? Eye : isEditMode ? SquarePen : SlidersVertical;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <ModeIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">{title}</h3>
              <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Loading status...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-primary">
                <Info className="h-4 w-4" />
                <h4 className="text-sm font-semibold">Status Information</h4>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">
                  Status Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Under Maintenance"
                  className="mt-1"
                  value={formData.name}
                  disabled={isViewMode}
                  onChange={(e) => onChange({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Add any notes about when this status applies..."
                  className="mt-1"
                  rows={3}
                  value={formData.description}
                  disabled={isViewMode}
                  onChange={(e) => onChange({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.active ? 'Active' : 'Inactive'}
                  disabled={isViewMode}
                  onValueChange={(value) => onChange({ ...formData, active: value === 'Active' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button
              onClick={onSave}
              disabled={!formData.name?.trim() || saving || loading}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Status'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusModal;