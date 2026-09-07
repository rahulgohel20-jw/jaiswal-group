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

const AcceptReturnReplacementModal = ({ isOpen, onClose, onConfirm, item, saving }) => {
    const [acceptedQuantity, setAcceptedQuantity] = useState('');
    const [remarks, setRemarks] = useState('');
    const [quantityError, setQuantityError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAcceptedQuantity('');
            setRemarks('');
            setQuantityError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (saving) return;
        onClose?.();
    };

    const handleSave = () => {
        if (!acceptedQuantity || Number(acceptedQuantity) <= 0) {
            setQuantityError('Please enter accepted quantity');
            return;
        }
        setQuantityError('');

        onConfirm?.({
            id: item?.id,
            acceptedQuantity,
            remarks,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Accepted Return</h2>
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
                    {/* Item summary card */}
                    <div className="bg-[#F5F7FB] rounded-xl px-4 py-4 grid md:grid-cols-3 gap-3 items-center">
                        <div>
                            <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                                Item Name
                            </p>
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{item?.itemName}</p>
                            {item?.itemCode && (
                                <p className="text-xs text-gray-400 mt-0.5">ID: {item.itemCode}</p>
                            )}
                        </div>
                        <div className='md:border-l border-gray-300 md:pl-4'>
                            <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                                Total Qty. Received
                            </p>
                            <p className="text-sm font-semibold text-[#084E92] mt-0.5">
                                {item?.totalQtyReceived || '-'}
                            </p>
                        </div>
                        <div className='md:border-l border-gray-300 md:pl-4 '>
                            <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                                Return Qty
                            </p>
                            <p className="text-sm font-semibold text-[#084E92] mt-0.5">
                                {item?.returnQuantity || '-'}
                            </p>
                        </div>

                    </div>

                    {/* Accepted Quantity */}
                    <div>
                        <Label required>Accepted Quantity</Label>
                        <div className="relative">
                            <input
                                type="number"
                                onWheel={(e) => e.currentTarget.blur()}
                                value={acceptedQuantity}
                                onChange={(e) => {
                                    setAcceptedQuantity(e.target.value);
                                    if (e.target.value) setQuantityError('');
                                }}
                                placeholder="Enter accepted quantity"
                                className={`${quantityError ? errorInputCls : inputCls} pr-16`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                Units
                            </span>
                        </div>
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
                            placeholder="Enter any additional notes or remarks"
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="grid sm:grid-cols-2 gap-3 px-6 py-4 border-t border-gray-100">
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
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium hover:bg-blue-800 transition cursor-pointer disabled:opacity-60"
                    >
                        <CheckCircle2 size={16} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcceptReturnReplacementModal;
