import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const errorInputCls =
  'w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const TransferModal = ({ isOpen, onClose, onConfirm, item, saving }) => {
  const [transferQuantity, setTransferQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quantityError, setQuantityError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTransferQuantity('');
      setRemarks('');
      setQuantityError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleAccept = () => {
    if (!transferQuantity || Number(transferQuantity) <= 0) {
      setQuantityError('Please enter transfer quantity');
      return;
    }
    setQuantityError('');

    onConfirm?.({
      id: item?.id,
      transferQuantity,
      remarks,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Transfer Accept</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Item details card */}
          <div className="bg-[#F5F7FB] rounded-xl px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                Item Details
              </p>
              {item?.transferCode && (
                <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-2.5 py-1">
                  {item.transferCode}
                </span>
              )}
            </div>

            <p className="text-base font-bold text-gray-800 mt-2">{item?.itemName}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Total Transferred Qty: {item?.currentStock || item?.transferredQty || '-'}
            </p>
          </div>

          {/* Transfer Quantity */}
          <div>
            <Label>Transfer Quantity</Label>
            <input
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={transferQuantity}
              onChange={(e) => {
                setTransferQuantity(e.target.value);
                if (e.target.value) setQuantityError('');
              }}
              placeholder="Enter transfer quantity"
              className={quantityError ? errorInputCls : inputCls}
            />
            {quantityError && (
              <p className="text-xs text-red-500 mt-1">{quantityError}</p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <Label>Remarks</Label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks"
              className={inputCls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium hover:bg-blue-800 transition cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {saving ? 'Saving...' : 'Accept Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
