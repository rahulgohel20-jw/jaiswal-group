import React from 'react';
import { FileText, X } from 'lucide-react';

const formatDisplayDate = (iso) => {
    const d = new Date(iso);

    if (isNaN(d.getTime())) return iso;

    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const PurchaseInvoiceDetailsModal = ({ invoice, open, onClose }) => {
    if (!open || !invoice) return null;

    // Temporary dummy GRN items. Replace these with API data later.
    const items = [
        {
            description: 'TMT Rebars 12mm Fe-550D',
            unit: 'MT',
            qty: '10.00',
            rate: '52,500.00',
            hsn: '7214',
            cgst: '9.0%',
            sgst: '9.0%',
            cess: '0.0%',
            amount: '5,25,000.00',
        },
        {
            description: 'MS Structural Angles 50×50×6mm',
            unit: 'MT',
            qty: '5.00',
            rate: '48,200.00',
            hsn: '7216',
            cgst: '9.0%',
            sgst: '9.0%',
            cess: '0.0%',
            amount: '2,41,000.00',
        },
        {
            description: 'Binding Wire 18 Gauge Mild Steel',
            unit: 'KG',
            qty: '250.0',
            rate: '78.00',
            hsn: '7217',
            cgst: '9.0%',
            sgst: '9.0%',
            cess: '0.0%',
            amount: '19,500.00',
        },
        {
            description: 'Galvanized Corrugated Sheets 0.5mm',
            unit: 'NO',
            qty: '120.0',
            rate: '1,150.00',
            hsn: '7210',
            cgst: '9.0%',
            sgst: '9.0%',
            cess: '0.0%',
            amount: '1,38,000.00',
        },
    ];

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#1F2D3D]/80 p-5">
            <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-[#F8FAFC] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E7EAF0] bg-white px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                            <FileText size={18} className='text-blue-500'/>
                        </div>

                        <div>
                            <h2 className="text-[15px] font-bold text-[#101828]">Purchase Invoice Details</h2>
                            <p className="text-[9px] text-[#667085]">Jaiswal Group ERP • Procurement & Inventory</p>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#98A2B3] hover:bg-gray-100 hover:text-gray-700">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">

                    {/* Invoice Information */}
                    <div className="rounded-xl border border-[#E7EAF0] bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">

                            <div>
                                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">Vendor Bill Number</p>
                                <span className="inline-flex rounded-md bg-[#F8FAFC] px-2 py-1 font-mono text-[10px] font-semibold text-[#101828]">{invoice.vendorInvoiceNumber || '—'}</span>
                            </div>

                            <div>
                                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">Invoice Date</p>
                                <p className="text-[11px] font-semibold text-[#101828]">{formatDisplayDate(invoice.date)}</p>
                            </div>

                            <div>
                                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">Vendor Name</p>
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#101828]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#084E92]" />
                                    {invoice.vendorName || '—'}
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">Receiving Outlet / Plant</p>
                                <p className="text-[11px] font-semibold text-[#101828]">{invoice.outletName || '—'}</p>
                            </div>

                        </div>

                        <div className="my-4 border-t border-[#F0F2F5]" />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">GRN Code</p>
                                <span className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#084E92]">GRN-070926-PO-OUTLET-2026-0080-0001</span>
                            </div>
                            <span className="text-[9px] text-[#98A2B3]">Verified against PO</span>
                        </div>
                    </div>

                    {/* GRN Items */}
                    <div className="mt-5">
                        <div className="mb-2 flex items-center gap-2">
                            <h3 className="text-[12px] font-bold text-[#101828]">GRN Items</h3>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-[#084E92]">{items.length} Items</span>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-170 border-collapse">
                                    <thead>
                                        <tr className="bg-[#F8FAFC]">
                                            <th className="px-3 py-3 text-left text-[8px] font-bold uppercase tracking-wide text-[#667085]">Item Description</th>
                                            <th className="px-2 py-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#667085]">Unit</th>
                                            <th className="px-2 py-3 text-right text-[8px] font-bold uppercase tracking-wide text-[#667085]">Qty</th>
                                            <th className="px-2 py-3 text-right text-[8px] font-bold uppercase tracking-wide text-[#667085]">Rate (₹)</th>
                                            <th className="px-2 py-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#667085]">HSN/SAC</th>
                                            <th className="px-2 py-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#667085]">CGST<br />(%)</th>
                                            <th className="px-2 py-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#667085]">SGST<br />(%)</th>
                                            <th className="px-2 py-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#667085]">CESS<br />(%)</th>
                                            <th className="px-3 py-3 text-right text-[8px] font-bold uppercase tracking-wide text-[#667085]">Amount (₹)</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index} className="border-t border-[#EEF1F5]">
                                                <td className="max-w-47.5 px-3 py-3 text-[10px] font-semibold text-[#101828]">{item.description}</td>
                                                <td className="px-2 py-3 text-center"><span className="rounded bg-[#F1F4F8] px-1.5 py-1 text-[10px] font-semibold text-[#475467]">{item.unit}</span></td>
                                                <td className="px-2 py-3 text-right font-mono text-[10px] text-[#344054]">{item.qty}</td>
                                                <td className="px-2 py-3 text-right font-mono text-[10px] text-[#344054]">{item.rate}</td>
                                                <td className="px-2 py-3 text-center font-mono text-[10px] text-[#667085]">{item.hsn}</td>
                                                <td className="px-2 py-3 text-center text-[10px] text-[#475467]">{item.cgst}</td>
                                                <td className="px-2 py-3 text-center text-[10px] text-[#475467]">{item.sgst}</td>
                                                <td className="px-2 py-3 text-center text-[10px] text-[#98A2B3]">{item.cess}</td>
                                                <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-[#101828]">{item.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-5 grid grid-cols-2 gap-4">

                        {/* Tax Breakdown */}
                        <div className="overflow-hidden rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#EEF1F5] px-4 py-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">Tax Breakdown</h3>
                                <span className="text-[10px] text-[#98A2B3]">GST Summary</span>
                            </div>

                            <div className="space-y-3 px-4 py-3">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">Taxable Amount</span>
                                    <span className="font-mono font-semibold text-[#344054]">₹9,23,500.00</span>
                                </div>

                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">CGST Amount</span>
                                    <span className="font-mono font-semibold text-[#344054]">₹83,115.00</span>
                                </div>

                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">SGST Amount</span>
                                    <span className="font-mono font-semibold text-[#344054]">₹83,115.00</span>
                                </div>

                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">CESS Amount</span>
                                    <span className="font-mono text-[#98A2B3]">₹0.00</span>
                                </div>
                            </div>

                            <div className="flex justify-between border-t border-[#EEF1F5] bg-[#FAFBFC] px-4 py-3">
                                <span className="text-[10px] font-bold uppercase text-[#475467]">Total Tax (GST + Cess)</span>
                                <span className="font-mono text-[12px] font-bold text-[#084E92]">₹1,66,230.00</span>
                            </div>
                        </div>

                        {/* Invoice Summary */}
                        <div className="overflow-hidden rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#EEF1F5] px-4 py-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">Invoice Summary</h3>
                                <span className="text-[10px] text-[#98A2B3]">Final Calculation</span>
                            </div>

                            <div className="space-y-3 px-4 py-3">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">Sub Total (Taxable)</span>
                                    <span className="font-mono font-semibold text-[#344054]">₹9,23,500.00</span>
                                </div>

                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">Total Tax</span>
                                    <span className="font-mono font-semibold text-[#344054]">₹1,66,230.00</span>
                                </div>

                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#667085]">Round Off</span>
                                    <span className="font-mono text-[#98A2B3]">+₹0.00</span>
                                </div>
                            </div>

                            <div className="mx-3 mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-[#084E92]">Net Amount</p>

                                <div className="mt-1 flex items-end justify-between gap-2">
                                    <span className="text-[10px] text-[#084E92]">Final Payable (INR)</span>
                                    <span className="font-mono text-[17px] font-bold text-[#084E92]">₹10,89,730.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-[#E7EAF0] bg-white px-6 py-3">
                    <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-[11px] font-semibold text-[#344054] hover:bg-gray-50">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseInvoiceDetailsModal;