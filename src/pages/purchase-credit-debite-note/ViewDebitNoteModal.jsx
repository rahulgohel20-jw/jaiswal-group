import React from 'react';
import { FileMinus, X } from 'lucide-react';

const formatAmount = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const ViewDebitNoteModal = ({ isOpen, onClose, debitNote }) => {
  if (!isOpen || !debitNote) return null;

  const items = Array.isArray(debitNote.details) ? debitNote.details : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <FileMinus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800">
                  {debitNote.noteCode || 'Debit Note Details'}
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  {debitNote.noteType?.replace(/_/g, ' ') || 'DEBIT NOTE'}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {debitNote.status || 'DRAFT'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Adjustment Nature: {debitNote.adjustmentNature?.replace(/_/g, ' ') || 'Rate Difference'}
                {debitNote.noteDate ? ` • Date: ${debitNote.noteDate}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto p-5">
          {/* General Remarks Banner */}
          {debitNote.remarks && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                General Remarks
              </span>
              <p className="wrap-break-word text-xs text-gray-700">{debitNote.remarks}</p>
            </div>
          )}

          {/* Details Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5 text-center">Unit</th>
                  <th className="px-3 py-2.5 text-right">Invoiced Qty</th>
                  <th className="px-3 py-2.5 text-right">Invoiced Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Revised Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Rate Diff (₹)</th>
                  <th className="px-3 py-2.5 text-right">Taxable Impact (₹)</th>
                  <th className="px-3 py-2.5 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!items.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center italic text-gray-400">
                      No line items found in this note.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const originalRate = Number(item.originalRate) || 0;
                    const revisedRate = Number(item.revisedRate) || 0;
                    const diff =
                      Number(item.rateDifference) ||
                      Math.max(0, originalRate - revisedRate);
                    const taxableImpact =
                      Number(item.taxableAmount) ||
                      diff * (Number(item.originalQuantity) || 0);

                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 align-top">
                          <span
                            className="font-medium text-gray-800"
                            title={item.rawMaterialName}
                          >
                            {item.rawMaterialName || `Item #${item.rawMaterialId}`}
                          </span>
                          {item.remarks && (
                            <p className="mt-0.5 text-[10px] italic text-gray-400">
                              Note: {item.remarks}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center align-top text-gray-600">
                          {item.unitName || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-700 align-top">
                          {Number(item.originalQuantity || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-700 align-top">
                          ₹{formatAmount(originalRate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-700 align-top">
                          ₹{formatAmount(revisedRate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-700 align-top">
                          ₹{formatAmount(diff)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900 align-top">
                          ₹{formatAmount(taxableImpact)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 align-top">
                          ₹{formatAmount(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full max-w-xs space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">₹{formatAmount(debitNote.subtotal)}</span>
              </div>

              {(Number(debitNote.cgstAmount) > 0 || Number(debitNote.sgstAmount) > 0) && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST:</span>
                    <span className="font-mono">₹{formatAmount(debitNote.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST:</span>
                    <span className="font-mono">₹{formatAmount(debitNote.sgstAmount)}</span>
                  </div>
                </>
              )}

              {Number(debitNote.igstAmount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST:</span>
                  <span className="font-mono">₹{formatAmount(debitNote.igstAmount)}</span>
                </div>
              )}

              {Number(debitNote.cessAmount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>CESS:</span>
                  <span className="font-mono">₹{formatAmount(debitNote.cessAmount)}</span>
                </div>
              )}

              {Number(debitNote.roundOff) !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Round Off:</span>
                  <span className="font-mono">
                    {Number(debitNote.roundOff) >= 0
                      ? `+₹${formatAmount(debitNote.roundOff)}`
                      : `-₹${formatAmount(Math.abs(Number(debitNote.roundOff)))}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900">
                <span>Total Amount:</span>
                <span className="font-mono text-sm text-[#084E92]">
                  ₹{formatAmount(debitNote.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDebitNoteModal;