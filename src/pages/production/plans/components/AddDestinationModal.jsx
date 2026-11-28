import React, { useState, useEffect, useMemo } from 'react';
import { Truck, X, Clock } from 'lucide-react';
import SearchableSelect from '@/utils/SearchableSelect';
import { notify } from '@/utils/toast';

export const AddDestinationModal = ({
  isOpen,
  onClose,
  onConfirm,
  units = [],
  subUnits = [],
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedSubUnitId, setSelectedSubUnitId] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isTransferRequired, setIsTransferRequired] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedUnitId('');
      setSelectedSubUnitId('');
      setDeliveryTime('');
      setNotes('');
      setIsTransferRequired(true);
    }
  }, [isOpen]);

  const unitOptions = useMemo(() => {
    return (units || []).map((unit) => ({
      value: String(unit.id),
      label:
        unit.name ||
        unit.companyNameEnglish ||
        unit.companyName ||
        unit.organizationName ||
        `Unit #${unit.id}`,
    }));
  }, [units]);

  const subUnitOptions = useMemo(() => {
    if (!selectedUnitId) return [];
    const matched = (subUnits || []).filter((su) => {
      const parentId = su.organizationId ?? su.orgId ?? su.outletId ?? su.parentId;
      return String(parentId) === String(selectedUnitId);
    });
    return matched.map((su) => ({
      value: String(su.id),
      label: su.subOutletName || su.name || su.locationName || `Sub-Unit #${su.id}`,
    }));
  }, [subUnits, selectedUnitId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      notify.error('Please select a Unit.');
      return;
    }

    const foundUnit = (units || []).find((u) => String(u.id) === String(selectedUnitId));
    const unitName =
      foundUnit?.name ||
      foundUnit?.companyNameEnglish ||
      foundUnit?.companyName ||
      foundUnit?.organizationName ||
      `Unit #${selectedUnitId}`;

    const foundSubUnit = (subUnits || []).find(
      (su) => String(su.id) === String(selectedSubUnitId)
    );
    const subUnitName = foundSubUnit
      ? foundSubUnit.subOutletName ||
        foundSubUnit.name ||
        foundSubUnit.locationName ||
        `Sub-Unit #${foundSubUnit.id}`
      : 'Main Kitchen';

    onConfirm({
      destinationOrganizationId: Number(selectedUnitId),
      unitName,
      outlet: unitName,
      destinationSubOutletId: selectedSubUnitId ? Number(selectedSubUnitId) : null,
      destinationLocationId: null,
      subUnitName,
      subLocation: subUnitName,
      deliveryTime: deliveryTime || '',
      notes: notes.trim(),
      transferRequired: isTransferRequired,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#E7EAF0] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Destination</h3>
              <p className="text-[11px] text-slate-500">
                Select destination unit and optional distribution details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Unit <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                name="destinationUnit"
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setSelectedSubUnitId('');
                }}
                options={unitOptions}
                placeholder="Select Unit"
                isClearable={false}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Sub-Unit <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <SearchableSelect
                name="destinationSubUnit"
                value={selectedSubUnitId}
                onChange={(e) => setSelectedSubUnitId(e.target.value)}
                options={subUnitOptions}
                placeholder={
                  !selectedUnitId
                    ? 'Select Unit First'
                    : subUnitOptions.length === 0
                      ? 'No Sub-Units Found'
                      : 'Select Sub-Unit'
                }
                disabled={!selectedUnitId || subUnitOptions.length === 0}
                isClearable={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Delivery Time{' '}
                <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="--:-- --"
                  className="w-full h-10 px-3.5 pr-9 text-xs rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:border-[#084E92] transition"
                />
                <Clock
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Notes <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Veg meals only"
                className="w-full h-10 px-3.5 text-xs rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:border-[#084E92] transition"
              />
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              role="switch"
              aria-checked={isTransferRequired}
              onClick={() => setIsTransferRequired((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isTransferRequired ? 'bg-[#084E92]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isTransferRequired ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Transfer Required
              </span>
              <span className="text-[11px] text-slate-400">Optional dispatch flag</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Add Destination
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDestinationModal;
