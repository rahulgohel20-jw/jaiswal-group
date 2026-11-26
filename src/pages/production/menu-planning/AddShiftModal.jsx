import React, { useEffect, useState } from 'react';
import { X, Utensils, Tag } from 'lucide-react';
import SearchableSelect from '@/utils/SearchableSelect';
import { getAllMealTypes, getAllMealStructures } from '@/services/apiServices';
import { notify } from '@/utils/toast';

const AddShiftModal = ({
  isOpen,
  onClose,
  onConfirm,
  organizationId,
  subOutletId,
  initialData = null,
}) => {
  const isEditMode = Boolean(initialData);

  const [mealTypes, setMealTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState('');

  const [mealStructures, setMealStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState('');

  // Fetch meal types and sync initial data
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setSelectedMealTypeId(
        initialData.mealTypeId ? String(initialData.mealTypeId) : ''
      );
      setSelectedStructureId(
        initialData.mealStructureId ? String(initialData.mealStructureId) : ''
      );
    } else {
      setSelectedMealTypeId('');
      setSelectedStructureId('');
      setMealStructures([]);
    }

    const fetchMealTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await getAllMealTypes();
        const data = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : data?.items || [];
        setMealTypes(list);
      } catch (err) {
        console.error('Failed to load meal types:', err);
        setMealTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchMealTypes();
  }, [isOpen, initialData]);

  // Fetch meal structures when Meal Type changes or in edit mode
  useEffect(() => {
    if (!isOpen || !selectedMealTypeId) {
      setMealStructures([]);
      setSelectedStructureId('');
      return;
    }

    const fetchStructures = async () => {
      setLoadingStructures(true);
      try {
        const params = {
          mealTypeId: Number(selectedMealTypeId),
        };

        const res = await getAllMealStructures(params);
        const data =
          res?.data?.data?.content ??
          res?.data?.content ??
          res?.data?.data ??
          res?.data ??
          [];
        const list = Array.isArray(data) ? data : data?.items || [];
        setMealStructures(list);

        // Pre-select or restore structure if in edit mode
        if (
          initialData &&
          String(initialData.mealTypeId) === String(selectedMealTypeId)
        ) {
          setSelectedStructureId(
            initialData.mealStructureId ? String(initialData.mealStructureId) : ''
          );
        } else if (
          !initialData ||
          String(initialData.mealTypeId) !== String(selectedMealTypeId)
        ) {
          setSelectedStructureId('');
        }
      } catch (err) {
        console.error('Failed to load meal structures:', err);
        setMealStructures([]);
        setSelectedStructureId('');
      } finally {
        setLoadingStructures(false);
      }
    };

    fetchStructures();
  }, [isOpen, selectedMealTypeId, organizationId, subOutletId, initialData]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!selectedMealTypeId) {
      notify.error('Meal Type is missing.');
      return;
    }
    if (!selectedStructureId) {
      notify.error('Please select a Meal Structure.');
      return;
    }

    const currentMealTypeObj = mealTypes.find(
      (m) => String(m.id) === String(selectedMealTypeId)
    );
    const structObj = mealStructures.find(
      (s) => String(s.id) === String(selectedStructureId)
    );

    const mealTypeName =
      initialData?.mealTypeName ||
      currentMealTypeObj?.name ||
      currentMealTypeObj?.mealTypeName ||
      `Meal Type #${selectedMealTypeId}`;

    const mealStructureName =
      structObj?.name ||
      structObj?.mealStructureName ||
      `Structure #${selectedStructureId}`;

    onConfirm({
      id: initialData?.id || 0,
      mealTypeId: Number(selectedMealTypeId),
      mealTypeName,
      mealStructureId: Number(selectedStructureId),
      mealStructureName,
      expectedPax: initialData?.expectedPax ?? '',
      bufferPercentage: initialData?.bufferPercentage ?? 0,
      plannedPax: initialData?.plannedPax ?? '',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
              <Utensils size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEditMode ? 'Edit Meal Structure' : 'Add Shift'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEditMode
                  ? 'Update the assigned structure for this shift'
                  : 'Select meal shift and assign its corresponding meal structure'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* In Edit Mode: Read-only badge/preview showing Meal Type */}
          {isEditMode ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-[#084E92]" />
                <span className="text-xs font-semibold text-slate-600">Selected Meal Shift:</span>
              </div>
              <span className="text-xs font-bold text-slate-900 uppercase bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                {initialData?.mealTypeName || `Meal Type #${selectedMealTypeId}`}
              </span>
            </div>
          ) : (
            /* In Create Mode: Show searchable Meal Type selector */
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Meal Type <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                name="mealType"
                value={selectedMealTypeId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setSelectedMealTypeId(val);
                }}
                options={mealTypes.map((mt) => ({
                  value: String(mt.id),
                  label: mt.name || mt.mealTypeName,
                }))}
                placeholder={
                  loadingTypes ? 'Loading meal types...' : 'Select Meal Type'
                }
                isClearable={false}
              />
            </div>
          )}

          {/* Meal Structure Single Searchable Select */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Meal Structure <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              name="mealStructure"
              value={selectedStructureId}
              onChange={(e) => {
                const val = e?.target?.value ?? e?.value ?? '';
                setSelectedStructureId(val);
              }}
              options={mealStructures.map((ms) => ({
                value: String(ms.id),
                label: ms.name || ms.mealStructureName,
              }))}
              placeholder={
                !selectedMealTypeId
                  ? 'Select Meal Type First'
                  : loadingStructures
                  ? 'Loading meal structures...'
                  : mealStructures.length === 0
                  ? 'No Meal Structures Found'
                  : 'Select Meal Structure'
              }
              disabled={!selectedMealTypeId || loadingStructures}
              isClearable={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063d73] rounded-xl transition shadow-xs cursor-pointer"
          >
            {isEditMode ? 'Update' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddShiftModal;