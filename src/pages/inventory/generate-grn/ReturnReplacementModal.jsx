import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RETURN_REPLACEMENT_OPTIONS = [
  'Return to Vendor',
  'Replace Item',
  'Damaged - Write Off',
];

// `item`  — pre-selected item (row-level "Return" click). Skips the picker.
// `items` — full list to choose from when no `item` is pre-selected
//           (footer "Return and Replacement" click).
const ReturnReplacementModal = ({
  isOpen,
  onClose,
  item,
  items = [],
  onSave,
  saving,
}) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [option, setOption] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedItemId(item ? String(item.id) : '');
      setOption('');
      setQuantity('');
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  // Resolve the item to show details for: the pre-selected one, or
  // whichever the user picked from the dropdown.
  const selectedItem =
    item || items.find((i) => String(i.id) === selectedItemId) || null;

  const handleSave = () => {
    if (!selectedItem) return;
    onSave?.({ itemId: selectedItem.id, option, quantity });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0]">
          <h3 className="text-lg font-semibold text-black">
            Return and Replacement
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Item picker — only shown when no item was pre-selected */}
          {!item && (
            <div className="mb-4">
              <label className="text-sm font-medium text-black mb-1.5 block">
                Item
              </label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue placeholder="Select an item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.itemName} ({i.itemCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedItem && (
            <div className="bg-[#F7F8FA] rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase mb-0.5">
                  Item Name
                </p>
                <p className="text-sm font-semibold text-black">
                  {selectedItem.itemName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase mb-0.5">
                  Item Code
                </p>
                <p className="text-sm font-semibold text-black">
                  {selectedItem.itemCode}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase mb-0.5">
                  Sub Unit
                </p>
                <p className="text-sm font-semibold text-black">
                  {selectedItem.subUnit}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase mb-0.5">
                  Received Qty
                </p>
                <p className="text-sm font-semibold text-black">
                  {selectedItem.recQty}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-sm font-medium text-black mb-1.5 block">
              Return and Replacement
            </label>
            <Select value={option} onValueChange={setOption} disabled={!selectedItem}>
              <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg disabled:bg-gray-50 disabled:text-gray-400">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REPLACEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-1.5 block">
              Quantity Received
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!selectedItem}
              placeholder="Enter quantity"
              className="w-full border border-[#C3C6D1] rounded-lg px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EAECF0]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="border border-[#C3C6D1] text-gray-700 cursor-pointer px-6 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedItem}
            className="flex items-center gap-2 bg-[#084E92] cursor-pointer text-white px-6 py-2 rounded-lg font-medium hover:bg-[#063d73] disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnReplacementModal;
