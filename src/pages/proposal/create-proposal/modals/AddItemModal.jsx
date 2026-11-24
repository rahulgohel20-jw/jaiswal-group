import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { getAllKitchenMenuItem } from '@/services/apiServices';
import { extractArray } from '../types';

export const AddItemModal = ({ isOpen, onClose, onAddItem, shiftName }) => {
  const [kitchenItems, setKitchenItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [foodName, setFoodName] = useState('');
  const [supplyDays, setSupplyDays] = useState('30');
  const [rmcMonthCost, setRmcMonthCost] = useState('15000');
  const [lpgCost, setLpgCost] = useState('2000');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await getAllKitchenMenuItem({ page: 1, size: 100, isAsc: true });
        const list = extractArray(res);
        setKitchenItems(list);
      } catch (err) {
        console.error('Failed to load kitchen menu items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [isOpen]);

  if (!isOpen) return null;

  const days = Number(supplyDays) || 1;
  const rmc = Number(rmcMonthCost) || 0;
  const lpg = Number(lpgCost) || 0;

  const avgRmcDay = Number((rmc / days).toFixed(2));
  const lpgCostPerDay = Number((lpg / days).toFixed(2));
  const totalCost = Number((rmc + lpg).toFixed(2));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!foodName.trim()) {
      setErrors({ foodName: 'Food item name is required' });
      return;
    }

    onAddItem({
      id: Date.now(),
      foodName: foodName.trim(),
      supplyDays: Number(supplyDays) || 30,
      rmcMonthCost: rmc,
      avgRmcDay,
      lpgCost: lpg,
      lpgCostPerDay,
      totalCost,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add Item to {shiftName}</h2>
            <p className="text-xs text-gray-400">Configure ingredient and overhead costs</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Food Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="kitchen-item-options"
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                if (errors.foodName) setErrors({});
              }}
              placeholder="e.g. Masala Dosa, Dal Makhani, Poha Special"
              className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
            />
            <datalist id="kitchen-item-options">
              {kitchenItems.map((item) => (
                <option key={item.id} value={item.itemName || item.name} />
              ))}
            </datalist>
            {errors.foodName && <p className="text-[11px] text-red-500 mt-1">{errors.foodName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Supply Days / Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={supplyDays}
                onChange={(e) => setSupplyDays(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                RMC / Month Cost (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rmcMonthCost}
                onChange={(e) => setRmcMonthCost(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                LPG Cost (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lpgCost}
                onChange={(e) => setLpgCost(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Calculated Total
              </label>
              <div className="w-full h-10 px-3 text-xs rounded-xl border border-gray-200 bg-gray-50 flex items-center font-bold text-gray-800">
                ₹{totalCost.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#00376C] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
