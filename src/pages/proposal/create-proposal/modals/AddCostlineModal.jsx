import { useState, useEffect } from 'react';
import { X, Plus, Calendar, Check } from 'lucide-react';
import { getAllProposalCostTypes } from '@/services/apiServices';
import { extractArray } from '../types';

export const AddCostlineModal = ({
  isOpen,
  onClose,
  onAddCostline,
  onUpdateCostline,
  editingLine = null,
  costTypes: parentCostTypes,
  basicDetails = {},
}) => {
  const isEditMode = Boolean(editingLine);
  const [costTypes, setCostTypes] = useState(parentCostTypes || []);
  const [costType, setCostType] = useState('');
  const [costFactor, setCostFactor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isServiceProvider, setIsServiceProvider] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    if (editingLine) {
      setCostFactor(editingLine.costFactor || '');
      const rawQty =
        editingLine.quantity !== undefined && editingLine.quantity !== null && editingLine.quantity !== ''
          ? String(editingLine.quantity)
          : '1';
      setQuantity(rawQty);

      const rawPrice =
        editingLine.price !== undefined && editingLine.price !== null && editingLine.price !== ''
          ? String(editingLine.price)
          : '';
      setPrice(rawPrice);

      const numQty = Number(rawQty) || 0;
      const numPrice = Number(rawPrice) || 0;

      let initialCost = '';
      if (rawPrice !== '' && numQty >= 0 && numPrice >= 0) {
        initialCost = (numQty * numPrice).toFixed(2);
      } else if (
        editingLine.actualCost !== undefined &&
        editingLine.actualCost !== null &&
        editingLine.actualCost !== '' &&
        Number(editingLine.actualCost) > 0
      ) {
        initialCost = String(editingLine.actualCost);
      } else if (
        editingLine.totalCost !== undefined &&
        editingLine.totalCost !== null &&
        editingLine.totalCost !== '' &&
        Number(editingLine.totalCost) > 0
      ) {
        initialCost = String(editingLine.totalCost);
      } else if (
        editingLine.serviceProviderCost !== undefined &&
        editingLine.serviceProviderCost !== null &&
        editingLine.serviceProviderCost !== '' &&
        Number(editingLine.serviceProviderCost) > 0
      ) {
        initialCost = String(editingLine.serviceProviderCost);
      } else {
        initialCost = '0';
      }
      setActualCost(initialCost);

      const isClientPayer =
        editingLine.responsibility === 'CLIENT' ||
        (editingLine.isClient && !editingLine.isServiceProvider);
      setIsClient(isClientPayer);
      setIsServiceProvider(!isClientPayer);

      setStartDate(editingLine.startDate || editingLine.fromDate || basicDetails.serviceStartDate || '');
      setEndDate(editingLine.endDate || editingLine.toDate || basicDetails.serviceEndDate || '');
      setRemarks(editingLine.remarks || '');
      setErrors({});
    } else {
      // Reset fields
      setCostFactor('');
      setQuantity('1');
      setPrice('');
      setActualCost('');
      setIsClient(false);
      setIsServiceProvider(true);
      setStartDate(basicDetails.serviceStartDate || '');
      setEndDate(basicDetails.serviceEndDate || '');
      setRemarks('');
      setErrors({});
    }

    const fetchCostTypes = async () => {
      let list = parentCostTypes;
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const res = await getAllProposalCostTypes();
          list = extractArray(res);
        } catch (err) {
          console.error('Failed to load proposal cost types:', err);
          list = [];
        }
      }
      setCostTypes(list);
      if (editingLine?.costType) {
        setCostType(editingLine.costType);
      } else if (editingLine?.costTypeId && Array.isArray(list)) {
        const found = list.find((ct) => Number(ct.id) === Number(editingLine.costTypeId));
        setCostType(found ? (found.costName || found.name) : (list[0]?.costName || list[0]?.name || ''));
      } else if (list.length > 0) {
        setCostType(list[0]?.costName || list[0]?.name || '');
      }
    };

    fetchCostTypes();
  }, [isOpen, editingLine, parentCostTypes, basicDetails]);

  if (!isOpen) return null;

  // Toggle responsibility: only one checkbox can be checked at any time
  const handlePayerChange = (type) => {
    if (type === 'CLIENT') {
      setIsClient(true);
      setIsServiceProvider(false);
      setErrors((prev) => {
        const { quantity, price, actualCost, startDate, endDate, ...rest } = prev;
        return rest;
      });
    } else {
      setIsClient(false);
      setIsServiceProvider(true);
      if (quantity !== '' && price !== '') {
        const calc = (Number(quantity) * Number(price)).toFixed(2);
        setActualCost(calc);
      }
    }
  };

  const handleQuantityChange = (val) => {
    if (val === '' || Number(val) >= 0) {
      setQuantity(val);
      if (val !== '' && price !== '') {
        const calc = (Number(val) * Number(price)).toFixed(2);
        setActualCost(Number(calc) === 0 && val === '0' ? '0' : calc);
      }
      if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
      if (errors.actualCost) setErrors((prev) => ({ ...prev, actualCost: '' }));
    }
  };

  const handlePriceChange = (val) => {
    if (val === '' || Number(val) >= 0) {
      setPrice(val);
      if (quantity !== '' && val !== '') {
        const calc = (Number(quantity) * Number(val)).toFixed(2);
        setActualCost(calc);
      }
      if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
      if (errors.actualCost) setErrors((prev) => ({ ...prev, actualCost: '' }));
    }
  };

  const handleActualCostChange = (val) => {
    if (val === '' || Number(val) >= 0) {
      setActualCost(val);
      if (errors.actualCost) setErrors((prev) => ({ ...prev, actualCost: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!costFactor.trim()) {
      newErrors.costFactor = 'Cost factor is required';
    }

    if (!isClient) {
      if (quantity !== '' && Number(quantity) < 0) {
        newErrors.quantity = 'Quantity cannot be negative';
      }
      if (price !== '' && Number(price) < 0) {
        newErrors.price = 'Price cannot be negative';
      }
      if (actualCost === '' || isNaN(Number(actualCost)) || Number(actualCost) < 0) {
        newErrors.actualCost = 'Please enter a valid actual cost (0 or greater)';
      }
      if (!startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!endDate) {
        newErrors.endDate = 'End date is required';
      } else if (startDate && new Date(endDate) < new Date(startDate)) {
        newErrors.endDate = 'End date cannot be earlier than start date';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const numericCost = !isClient ? (Number(actualCost) || 0) : 0;
    const selectedCostTypeObj = costTypes.find((ct) => (ct.costName || ct.name) === costType) || costTypes[0];
    const costTypeId = Number(selectedCostTypeObj?.id || editingLine?.costTypeId || 0);

    const dataObj = {
      costTypeId,
      costType: costType || (costTypes[0]?.costName || costTypes[0]?.name || 'General'),
      costFactor: costFactor.trim(),
      quantity: !isClient ? (quantity === '' ? 1 : Number(quantity)) : 0,
      price: !isClient ? (price === '' ? 0 : Number(price)) : 0,
      actualCost: numericCost,
      totalCost: numericCost,
      isClient,
      isServiceProvider: !isClient,
      responsibility: isClient ? 'CLIENT' : 'SERVICE_PROVIDER',
      startDate: !isClient ? startDate : '',
      endDate: !isClient ? endDate : '',
      fromDate: !isClient ? startDate : '',
      toDate: !isClient ? endDate : '',
      remarks: remarks.trim(),
      serviceProviderCost: !isClient ? numericCost : 0,
      calculationBasis: editingLine?.calculationBasis || 'FIXED_MONTHLY',
    };

    if (isEditMode) {
      onUpdateCostline?.({
        ...editingLine,
        ...dataObj,
      });
    } else {
      onAddCostline?.({
        id: Date.now(),
        ...dataObj,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isEditMode ? 'Update Cost Line' : 'Add Cost Line'}
            </h2>
            <p className="text-xs text-gray-400">
              {isEditMode ? 'Update overhead expenses and responsibilities' : 'Allocate overhead expenses and responsibilities'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* 1. Cost Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cost Type <span className="text-red-500">*</span>
            </label>
            <select
              value={costType}
              onChange={(e) => setCostType(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
            >
              {costTypes.length === 0 ? (
                <option value="">No cost types available</option>
              ) : (
                costTypes.map((ct) => {
                  const name = ct.costName || ct.name;
                  return (
                    <option key={ct.id || name} value={name}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* 2. Cost Factor Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cost Factor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={costFactor}
              onChange={(e) => {
                setCostFactor(e.target.value);
                if (errors.costFactor) setErrors((prev) => ({ ...prev, costFactor: '' }));
              }}
              placeholder="e.g. Vehicle Hire, Electricity, Maintenance"
              className={`w-full h-10 px-3 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                errors.costFactor ? 'border-red-500' : 'border-[#C3C6D1]'
              }`}
            />
            {errors.costFactor && <p className="text-[11px] text-red-500 mt-1">{errors.costFactor}</p>}
          </div>

          {/* 3. Paid By (Modern small custom checkbox selector) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Paid By <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handlePayerChange('CLIENT')}
                className={`h-9 px-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  isClient
                    ? 'border-[#084E92] bg-blue-50/60 shadow-2xs text-[#084E92]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 text-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                    isClient
                      ? 'bg-[#084E92] border-[#084E92] text-white shadow-xs'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isClient && <Check size={11} className="stroke-[3]" />}
                </div>
                <span className={`text-xs ${isClient ? 'font-bold' : 'font-medium'}`}>
                  Client
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePayerChange('SERVICE_PROVIDER')}
                className={`h-9 px-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  isServiceProvider
                    ? 'border-[#084E92] bg-blue-50/60 shadow-2xs text-[#084E92]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 text-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                    isServiceProvider
                      ? 'bg-[#084E92] border-[#084E92] text-white shadow-xs'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isServiceProvider && <Check size={11} className="stroke-[3]" />}
                </div>
                <span className={`text-xs ${isServiceProvider ? 'font-bold' : 'font-medium'}`}>
                  Service Provider
                </span>
              </button>
            </div>
          </div>

          {/* 4. Cost & Schedule Fields (Hidden if Client is selected) */}
          {!isClient && (
            <>
              {/* Quantity & Price (Non-negative) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={quantity}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="1"
                    className={`w-full h-10 px-3 text-xs font-medium rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.quantity ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                  {errors.quantity && <p className="text-[11px] text-red-500 mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="0.00"
                      className={`w-full h-10 pl-7 pr-3 text-xs font-medium rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                        errors.price ? 'border-red-500' : 'border-[#C3C6D1]'
                      }`}
                    />
                  </div>
                  {errors.price && <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>

              {/* Actual Cost */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Actual Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualCost}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => handleActualCostChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full h-10 pl-7 pr-3 text-xs font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.actualCost ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                </div>
                {errors.actualCost && <p className="text-[11px] text-red-500 mt-1">{errors.actualCost}</p>}
              </div>

              {/* Service Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Service Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-medium rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.startDate ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Service End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-medium rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.endDate ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 6. Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Monthly utility estimate"
              className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
            />
          </div>

          {/* Form Actions */}
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
              {isEditMode ? <Check size={14} /> : <Plus size={14} />}
              {isEditMode ? 'Update Costline' : 'Add Costline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCostlineModal;
