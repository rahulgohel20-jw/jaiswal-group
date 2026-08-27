import React, { useEffect, useState } from 'react';
import { notify, getApiErrorMessage } from '@/utils/toast';
import { FileText, Save, X } from 'lucide-react';
import {
  createPage,
  getModuleRights,
  updatePage,
} from '@/services/apiServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const emptyForm = { pagename: '', moduleId: '' };

const AddPageModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        pagename: initialData.name || initialData.pagename || '',
        moduleId:
          initialData.moduleId != null ? String(initialData.moduleId) : '',
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);

    // Load module options from the Module Right Name master
    (async () => {
      setModulesLoading(true);
      try {
        const res = await getModuleRights();
        // Adjust this line once you confirm the actual getall response shape
        const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
        setModules(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error(err);
        notify.error('Failed to load modules');
      } finally {
        setModulesLoading(false);
      }
    })();
  }, [isOpen, initialData]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const isValid = form.pagename.trim() && form.moduleId.trim();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        pagename: form.pagename.trim(),
        moduleId: form.moduleId.trim(),
      };

      if (isEditMode) {
        await updatePage(initialData.id, payload);
        notify.success('Page updated successfully');
      } else {
        await createPage(payload);
        notify.success('Page created successfully');
      }

      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const errMsg = getApiErrorMessage(err, `Failed to ${isEditMode ? 'update' : 'create'} page.`);
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
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Page' : 'Add Page'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this page config.'
                  : 'Configure a new page for system permissions.'}
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

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Page Name
              </label>
              <Input
                placeholder="e.g., User Rights"
                className="mt-1.5 border-[#C3C6D1] focus:border-[#084E92]"
                value={form.pagename}
                onChange={(e) => set('pagename', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Module Name
              </label>
              <select
                value={form.moduleId}
                onChange={(e) => set('moduleId', e.target.value)}
                disabled={modulesLoading}
                className="mt-1.5 w-full border border-[#C3C6D1] rounded-lg px-3 py-2 outline-none focus:border-[#084E92] bg-white disabled:bg-gray-50"
              >
                <option value="">
                  {modulesLoading ? 'Loading modules...' : 'Select module'}
                </option>
                {modules.map((m) => (
                  <option key={m.id ?? m.name} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
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
            {saving ? 'Saving...' : isEditMode ? 'Update Page' : 'Save Page'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPageModal;
