import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getEligibleSlotRecipes,
  getRecipeCosting,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';

const UNIT_SHORT_FORMS = {
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  gram: 'g',
  grams: 'g',
  g: 'g',
  milligram: 'mg',
  milligrams: 'mg',
  mg: 'mg',
  liter: 'L',
  litre: 'L',
  liters: 'L',
  litres: 'L',
  l: 'L',
  milliliter: 'ml',
  millilitre: 'ml',
  milliliters: 'ml',
  millilitres: 'ml',
  ml: 'ml',
  numbers: 'nos',
  number: 'nos',
  nos: 'nos',
  pieces: 'pcs',
  piece: 'pcs',
  pcs: 'pcs',
  packet: 'pkt',
  packets: 'pkt',
  pkt: 'pkt',
};

const getShortUnit = (unit) => {
  if (!unit) return '';
  const cleaned = String(unit).trim().toLowerCase();
  return UNIT_SHORT_FORMS[cleaned] || unit;
};

const ItemMultiSelect = ({
  options = [],
  selectedIds = [],
  onToggle,
  onRemove,
  onClear,
  loading = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) =>
      (o.nameEnglish || o.name || o.menuItemName || '').toLowerCase().includes(term)
    );
  }, [options, query]);

  const isSelected = (id) => selectedIds.includes(String(id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`min-h-10 w-full border rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
              : 'bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92] focus-within:ring-2 focus-within:ring-[#084E92]/15'
            } border-[#C3C6D1]`}
        >
          {selectedIds.map((selectedId) => {
            const itemObj = options.find((o) => String(o.id) === String(selectedId));
            const name = itemObj?.nameEnglish || itemObj?.name || itemObj?.menuItemName || `Item #${selectedId}`;

            return (
              <span
                key={selectedId}
                className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded-md"
              >
                <span className="truncate max-w-40" title={name}>
                  {name}
                </span>
                {!disabled && (
                  <X
                    size={12}
                    className="cursor-pointer hover:text-red-500 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(selectedId);
                    }}
                  />
                )}
              </span>
            );
          })}

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={
              selectedIds.length === 0
                ? loading
                  ? 'Loading items...'
                  : 'Search and select kitchen menu item...'
                : ''
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            className="flex-1 min-w-24 bg-transparent text-xs text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
          />

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {selectedIds.length > 0 && !disabled && (
              <X
                size={14}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  setQuery('');
                }}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1 w-[--radix-popover-trigger-width] min-w-64 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-xl shadow-xl z-50 text-xs"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
            <Loader2 size={14} className="animate-spin text-[#084E92]" />
            Loading items...
          </div>
        ) : filteredOptions.length === 0 ? (
          <p className="px-3 py-3 text-gray-400 text-center">No eligible recipes for this slot.</p>
        ) : (
          filteredOptions.map((opt) => {
            const optId = String(opt.id);
            const selected = isSelected(optId);
            const label = opt.nameEnglish || opt.name || opt.menuItemName;

            return (
              <label
                key={optId}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-blue-50/70 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(opt)}
                  className="accent-[#084E92] rounded"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
};

const AddKitchenItemModal = ({
  isOpen,
  onClose,
  onSaveSlotRecipes,
  slots = [],
  unitId,
  subUnitId,
  activeShift,
  preselectedSlotDetailId = null,
  initialSelectedMenuItemIds = [],
}) => {
  const [selectedSlotDetailId, setSelectedSlotDetailId] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  // Auto-resolve slot object from preselected ID or first available slot
  useEffect(() => {
    if (!isOpen) return;

    if (preselectedSlotDetailId) {
      setSelectedSlotDetailId(String(preselectedSlotDetailId));
    } else if (slots.length > 0) {
      const firstId = slots[0].mealStructureDetailId || slots[0].daySlotId;
      setSelectedSlotDetailId(String(firstId));
    } else {
      setSelectedSlotDetailId('');
    }

    if (Array.isArray(initialSelectedMenuItemIds) && initialSelectedMenuItemIds.length > 0) {
      setSelectedIds(initialSelectedMenuItemIds.map(String));
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, preselectedSlotDetailId, initialSelectedMenuItemIds, slots]);

  const activeSlotObj = useMemo(() => {
    return (
      (slots || []).find(
        (s) => String(s.mealStructureDetailId || s.daySlotId) === String(selectedSlotDetailId)
      ) || null
    );
  }, [slots, selectedSlotDetailId]);

  const activeCategoryName =
    activeSlotObj?.kitchenMenuCategoryName ||
    activeSlotObj?.mealSlotName ||
    'Category';

  // Fetch eligible recipes for this slot's category + shift meal type + unit
  useEffect(() => {
    const categoryId = activeSlotObj?.kitchenMenuCategoryId;
    const mealTypeId = activeShift?.mealTypeId;

    if (!isOpen || !categoryId || !mealTypeId || !unitId) {
      setMenuItems([]);
      return;
    }

    let cancelled = false;

    const fetchEligibleItems = async () => {
      setLoadingItems(true);
      try {
        const res = await getEligibleSlotRecipes({
          kitchenMenuCategoryId: Number(categoryId),
          mealTypeId: Number(mealTypeId),
          organizationId: Number(unitId),
        });

        const data = res?.data?.data ?? res?.data ?? [];
        const rawList = Array.isArray(data)
          ? data
          : data.items || data.content || data.recipes || [];

        // Normalize so the rest of the modal keeps using `item.id` as the kitchen menu item id
        const normalized = rawList.map((item) => ({
          ...item,
          id: item.kitchenMenuItemId ?? item.menuItemId ?? item.id,
          nameEnglish:
            item.nameEnglish ||
            item.kitchenMenuItemName ||
            item.recipeName ||
            item.menuItemName ||
            item.name,
        }));

        // De-duplicate by id
        const seen = new Set();
        const unique = normalized.filter((it) => {
          const key = String(it.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) setMenuItems(unique);
      } catch (err) {
        console.error('Failed to load eligible slot recipes:', err);
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    fetchEligibleItems();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeSlotObj, activeShift?.mealTypeId, unitId]);

  if (!isOpen) return null;

  const handleToggle = (item) => {
    const strId = String(item.id);
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
    );
  };

  const handleRemove = (id) => {
    setSelectedIds((prev) => prev.filter((i) => i !== String(id)));
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const handleConfirm = async () => {
    if (!activeSlotObj) {
      notify.error('Slot detail is missing.');
      return;
    }
    if (selectedIds.length === 0) {
      notify.error('Please select at least one menu item.');
      return;
    }

    const chosenItems = menuItems.filter((m) => selectedIds.includes(String(m.id)));

    setSavingSlot(true);
    try {
      const targetPaxVal = Number(activeShift?.plannedPax) || Number(activeShift?.expectedPax) || 1;

      const enrichedChosenItems = await Promise.all(
        chosenItems.map(async (item) => {
          try {
            const costingRes = await getRecipeCosting(item.id, {
              isLpgRequired: false,
              isOtherCostRequired: false,
              isPerPersonConsumptionBasedCalculate: true,
              materialCenterOrgId: Number(unitId),
              organizationId: Number(unitId),
              targetPax: targetPaxVal,
              subOutletId: subUnitId ? Number(subUnitId) : undefined,
            });
            const cData = costingRes?.data?.data ?? costingRes?.data;
            if (cData) {
              const portionQty = cData.perPersonConsumptionQuantity ?? '';
              const unitSymbol = getShortUnit(
                cData.perPersonConsumptionUnitSymbol || cData.uomSymbol || 'g'
              );
              const unitIdVal = cData.perPersonPortionUnitId || cData.portionUnitId || null;

              return {
                ...item,
                costPerPortion: cData.costPerPerson !== undefined && cData.costPerPerson !== null ? cData.costPerPerson : (item.price || 0),
                portionQuantity: portionQty ? String(portionQty) : '150',
                perPersonConsumptionUnitSymbol: unitSymbol,
                portionUnitSymbol: unitSymbol,
                perPersonPortionUnitId: unitIdVal,
                portionUnitId: unitIdVal,
                portion: portionQty ? `${portionQty} ${unitSymbol}` : '',
                pricingBasis: cData.pricingBasis || 'LAST_PURCHASE',
                recipeCostingData: cData,
              };
            }
          } catch (costErr) {
            console.error(`Failed to fetch costing for item #${item.id}:`, costErr);
          }
          return {
            ...item,
            costPerPortion: item.price || 0,
            portionQuantity: '150',
            perPersonConsumptionUnitSymbol: 'g',
            portionUnitSymbol: 'g',
            perPersonPortionUnitId: null,
            portionUnitId: null,
            portion: '150 g',
            pricingBasis: 'LAST_PURCHASE',
          };
        })
      );

      const targetSlotId = Number(activeSlotObj.mealStructureDetailId || activeSlotObj.daySlotId);
      onSaveSlotRecipes({
        slotDetailId: targetSlotId,
        chosenItems: enrichedChosenItems,
      });
      onClose();
    } catch (err) {
      console.error('Error preparing slot recipes:', err);
    } finally {
      setSavingSlot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {initialSelectedMenuItemIds.length > 0 ? 'Edit Recipe' : 'Add Recipe'}
              </h3>
              <p className="text-xs text-gray-500">
                Shift: {activeShift?.mealTypeName} • Category: <strong className="text-slate-800">{activeCategoryName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Only MenuItem Dropdown */}
        <div className="p-6 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Kitchen Menu Item(s) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 px-2 py-0.5 rounded-md">
                {activeCategoryName}
              </span>
            </div>

            <ItemMultiSelect
              options={menuItems}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onClear={handleClear}
              loading={loadingItems}
              disabled={loadingItems}
            />
            <span className="text-[10px] text-slate-400 mt-1.5 block">
              Showing eligible recipes for {activeCategoryName} in this shift.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#C3C6D1] rounded-xl hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || savingSlot}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#084E92] rounded-xl hover:bg-[#00376C] transition disabled:opacity-50 cursor-pointer"
          >
            {savingSlot ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Calculating...
              </>
            ) : initialSelectedMenuItemIds.length > 0 ? (
              'Update'
            ) : (
              '+ Add'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddKitchenItemModal;