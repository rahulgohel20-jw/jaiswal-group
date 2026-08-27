import React, { useEffect, useState } from 'react';
import { notify, getApiErrorMessage } from '@/utils/toast';
import { Save, ShieldCheck, X } from 'lucide-react';
import { createModuleRight, updateModuleRight } from '@/services/apiServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AddModuleRightModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const isEditMode = Boolean(initialData?.id);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? '');
    setError(null);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleClose = () => {
    setName('');
    setError(null);
    onClose?.();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Module name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = { name: name.trim() };

      if (isEditMode) {
        await updateModuleRight(initialData.id, payload);
        notify.success('Module right updated successfully');
      } else {
        await createModuleRight(payload);
        notify.success('Module right created successfully');
      }

      setName('');
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const errMsg = getApiErrorMessage(err, `Failed to ${isEditMode ? 'update' : 'create'} module right.`);
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Module Right' : 'Add Module Right'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this module right.'
                  : 'Configure a new module right for page assignment.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter Module Right Name"
              className="mt-1.5 border-[#C3C6D1] focus:border-[#084E92]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="bg-[#084E92] hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddModuleRightModal;
