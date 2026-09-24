import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Info,
    Pencil,
    Receipt,
    Trash2,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { numberToWords, checkIsInterState, formatCurrency, } from '../purchase-order-requests/utils/taxUtils';

/* ---------------- dummy data ---------------- */
const DUMMY_HEADER = {
    vendorBillNumber: 'INV/2026-27/8942',
    invoiceDate: '2026-10-24',
    vendorName: 'Tata Steel BSL Ltd',
    outletName: 'pdpu-test-abc',
    selectedGrnCount: 2,
    isIntraState: true,
};

const DUMMY_LINE_ITEMS = [
    {
        id: 1,
        itemName: 'Coriander',
        brand: 'Amul',
        added: true,
        unit: 'Gram',
        qty: 1,
        rate: 10,
        hsn: '',
        cgst: 0,
        sgst: 0,
        cess: 0,
    },
    {
        id: 2,
        itemName: 'test3',
        brand: 'New Brand',
        added: true,
        unit: 'new unit',
        qty: 1,
        rate: 0,
        hsn: '',
        cgst: 0,
        sgst: 0,
        cess: 0,
    },
    {
        id: 3,
        itemName: 'Paneer',
        brand: 'Amul',
        added: true,
        unit: 'Gram',
        qty: 1,
        rate: 70,
        hsn: '',
        cgst: 9,
        sgst: 9,
        cess: 2,
    },
    {
        id: 4,
        itemName: 'Masala Powder',
        brand: 'Everest',
        added: false,
        unit: 'Kilogram',
        qty: 2,
        rate: 120,
        hsn: '09109100',
        cgst: 2.5,
        sgst: 2.5,
        cess: 0,
    },
];

const UNIT_OPTIONS = [
    'Gram',
    'Kilogram',
    'Litre',
    'Millilitre',
    'Piece',
    'Packet',
    'new unit',
];

/* ---------------- helpers ---------------- */
const toNumber = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

const formatDisplayDate = (iso) => {
    const d = new Date(iso);

    if (isNaN(d.getTime())) return iso;

    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

/* ---------------- small building blocks ---------------- */
const CardShell = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-[#E7EAF0] ${className}`}>
        {children}
    </div>
);

const FieldLabel = ({ children, required }) => (
    <label className="block text-xs font-semibold text-[#344054] mb-1.5">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const inputBase =
    'w-full h-10 px-3 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]';

const readOnlyBase =
    'w-full h-10 px-3 rounded-lg border border-[#E7EAF0] bg-[#F9FAFC] text-sm text-[#475467] cursor-not-allowed';

const cellInput =
    'h-8 w-full px-2 rounded-md border border-[#E7EAF0] bg-white text-xs text-[#101828] text-center placeholder:text-[#C3C6D1] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]';

const AddedBadge = () => (
    <span className="inline-flex items-center rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#084E92]">
        Added
    </span>
);

const SummaryRow = ({ label, value, muted = false }) => (
    <div className="flex items-center justify-between text-xs">
        <span className={muted ? 'text-[#98A2B3]' : 'text-[#475467]'}>
            {label}
        </span>
        <span className="font-semibold text-[#101828]">{value}</span>
    </div>
);

/* ---------------- screen ---------------- */
const ApproveInvoice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const incoming = location.state?.invoice;

    const [header, setHeader] = useState({
        ...DUMMY_HEADER,
        vendorBillNumber:
            incoming?.vendorInvoiceNumber ?? DUMMY_HEADER.vendorBillNumber,
        invoiceDate: incoming?.date ?? DUMMY_HEADER.invoiceDate,
        vendorName: incoming?.vendorName ?? DUMMY_HEADER.vendorName,
        outletName: incoming?.outletName ?? DUMMY_HEADER.outletName,
    });

    const [items, setItems] = useState(DUMMY_LINE_ITEMS);
    const [submitting, setSubmitting] = useState(false);

    const updateItem = (itemId, patch) =>
        setItems((prev) =>
            prev.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it
            )
        );

    const removeItem = (itemId) => {
        setItems((prev) => prev.filter((it) => it.id !== itemId));
        toast.success('Line item removed.');
    };

    /* ---------------- calculations ---------------- */

    const isInterState = useMemo(() => {
        if (incoming?.billTo && incoming?.shipTo) {
            return checkIsInterState(
                incoming.billTo,
                incoming.shipTo
            );
        }

        return !header.isIntraState;
    }, [incoming, header.isIntraState]);

    const rows = useMemo(
        () =>
            items.map((it) => {
                const taxable =
                    toNumber(it.qty) * toNumber(it.rate);

                const cgstRate = isInterState
                    ? 0
                    : toNumber(it.cgst);

                const sgstRate = isInterState
                    ? 0
                    : toNumber(it.sgst);

                const igstRate = isInterState
                    ? toNumber(it.cgst) + toNumber(it.sgst)
                    : 0;

                const cgstAmt =
                    (taxable * cgstRate) / 100;

                const sgstAmt =
                    (taxable * sgstRate) / 100;

                const igstAmt =
                    (taxable * igstRate) / 100;

                const cessAmt =
                    (taxable * toNumber(it.cess)) / 100;

                return {
                    ...it,
                    taxable,
                    cgstAmt,
                    sgstAmt,
                    igstAmt,
                    cessAmt,
                    amount:
                        taxable +
                        cgstAmt +
                        sgstAmt +
                        igstAmt +
                        cessAmt,
                };
            }),
        [items, isInterState]
    );

    const totals = useMemo(() => {
        const taxable = rows.reduce(
            (s, r) => s + r.taxable,
            0
        );

        const cgst = rows.reduce(
            (s, r) => s + r.cgstAmt,
            0
        );

        const sgst = rows.reduce(
            (s, r) => s + r.sgstAmt,
            0
        );

        const igst = rows.reduce(
            (s, r) => s + r.igstAmt,
            0
        );

        const cess = rows.reduce(
            (s, r) => s + r.cessAmt,
            0
        );

        const totalTax =
            cgst +
            sgst +
            igst +
            cess;

        const gross =
            taxable +
            totalTax;

        const net = Math.round(gross);

        return {
            taxable,
            cgst,
            sgst,
            igst,
            cess,
            totalTax,
            gross,
            net,
            roundOff: net - gross,
        };
    }, [rows]);

    /* ---------------- actions ---------------- */

    const validate = () => {
        if (!header.vendorBillNumber.trim()) {
            toast.error('Enter the vendor bill number.');
            return false;
        }

        if (!header.invoiceDate) {
            toast.error('Select the invoice date.');
            return false;
        }

        if (rows.length === 0) {
            toast.error('Add at least one line item.');
            return false;
        }

        return true;
    };

    const handleSaveDraft = () => {
        if (!header.vendorBillNumber.trim()) {
            toast.error('Enter the vendor bill number.');
            return;
        }

        toast.success('Saved as draft.');
    };

    const handleSendForApproval = () => {
        if (!validate()) return;

        setSubmitting(true);

        // TODO: replace with the real submit API once it exists
        setTimeout(() => {
            setSubmitting(false);
            toast.success('Sent for approval.');
            navigate(-1);
        }, 600);
    };

    return (
        <Container>
            <div className="mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                    <div>
                        <h1
                            className="text-[28px] font-bold text-[#101828]"
                            style={{
                                fontFamily:
                                    "'Plus Jakarta Sans', sans-serif",
                            }}
                        >
                            GRN Invoice Approval
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-3.5 h-10 rounded-full border border-[#E7EAF0] bg-white text-sm font-semibold text-[#101828] hover:bg-gray-50 transition"
                    >
                        <ArrowLeft size={15} />
                        Back to GRN Listing
                    </button>
                </div>

                {/* Invoice details */}
                <CardShell className="p-5 mb-5">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#EFF6FF] text-[#084E92]">
                            <Receipt size={15} />
                        </span>

                        <h2 className="text-sm font-bold text-[#101828]">
                            Invoice
                        </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <FieldLabel required>
                                Vendor Bill Number
                            </FieldLabel>

                            <input
                                value={header.vendorBillNumber}
                                onChange={(e) =>
                                    setHeader((h) => ({
                                        ...h,
                                        vendorBillNumber:
                                            e.target.value,
                                    }))
                                }
                                placeholder="Enter vendor bill number"
                                className={inputBase}
                            />
                        </div>

                        <div>
                            <FieldLabel required>
                                Invoice Date
                            </FieldLabel>

                            <input
                                type="date"
                                value={header.invoiceDate}
                                onChange={(e) =>
                                    setHeader((h) => ({
                                        ...h,
                                        invoiceDate:
                                            e.target.value,
                                    }))
                                }
                                className={inputBase}
                            />
                        </div>

                        <div>
                            <FieldLabel>
                                Vendor Name
                            </FieldLabel>

                            <input
                                value={header.vendorName}
                                readOnly
                                className={readOnlyBase}
                            />
                        </div>

                        <div>
                            <FieldLabel>
                                Receiving Outlet / Plant
                            </FieldLabel>

                            <input
                                value={header.outletName}
                                readOnly
                                className={readOnlyBase}
                            />
                        </div>
                    </div>
                </CardShell>

                {/* GRN items */}
                <CardShell className="mb-5 overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E7EAF0] bg-[#FCFDFE]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-sm font-bold text-[#101828]">
                                GRN Items ({header.selectedGrnCount}{' '}
                                Selected GRNs)
                            </h2>

                            <span className="inline-flex items-center rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#084E92]">
                                {rows.length} Line Item
                                {rows.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <p className="text-xs text-[#98A2B3] mt-1">
                            Verify rates, HSN, and applicable GST
                            rates for incoming items against
                            received consignment vouchers.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-245">
                            <thead>
                                <tr className="border-b border-[#E7EAF0] bg-white">
                                    {[
                                        'Item Description',
                                        'Unit',
                                        'Qty',
                                        'Rate (₹)',
                                        'HSN/SAC',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]"
                                        >
                                            {h}
                                        </th>
                                    ))}

                                    {[
                                        'CGST (%)',
                                        'SGST (%)',
                                        'CESS (%)',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]"
                                        >
                                            {h}
                                        </th>
                                    ))}

                                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                        Amount (₹)
                                    </th>

                                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className="px-4 py-14 text-center text-sm text-[#98A2B3]"
                                        >
                                            No line items left. Go back
                                            and pick GRNs to invoice.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-[#F2F4F7] last:border-0"
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-xs font-semibold text-[#101828]">
                                                    {row.itemName}
                                                    {row.brand
                                                        ? ` (${row.brand})`
                                                        : ''}
                                                </div>

                                                <div className="mt-1 flex items-center gap-1.5">
                                                    {row.added && (
                                                        <AddedBadge />
                                                    )}

                                                    <button
                                                        type="button"
                                                        title="Edit item"
                                                        onClick={() =>
                                                            toast.info(
                                                                `Edit ${row.itemName}`
                                                            )
                                                        }
                                                        className="text-[#98A2B3] hover:text-[#084E92] transition"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 align-top w-32.5">
                                                <Select
                                                    value={row.unit}
                                                    onValueChange={(v) =>
                                                        updateItem(
                                                            row.id,
                                                            {
                                                                unit: v,
                                                            }
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-27.5 text-xs border-[#E7EAF0] rounded-md">
                                                        <SelectValue placeholder="Unit" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        {Array.from(
                                                            new Set([
                                                                ...UNIT_OPTIONS,
                                                                row.unit,
                                                            ])
                                                        )
                                                            .filter(Boolean)
                                                            .map((u) => (
                                                                <SelectItem
                                                                    key={u}
                                                                    value={u}
                                                                    className="text-xs"
                                                                >
                                                                    {u}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>

                                            <td className="px-4 py-3 align-top w-20">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={row.qty}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            row.id,
                                                            {
                                                                qty: e
                                                                    .target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    className={cellInput}
                                                />
                                            </td>

                                            <td className="px-4 py-3 align-top w-25">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={row.rate}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            row.id,
                                                            {
                                                                rate: e
                                                                    .target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    className={cellInput}
                                                />
                                            </td>

                                            <td className="px-4 py-3 align-top w-27.5">
                                                <input
                                                    value={row.hsn}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            row.id,
                                                            {
                                                                hsn: e
                                                                    .target
                                                                    .value,
                                                            }
                                                        )
                                                    }
                                                    placeholder="HSN"
                                                    className={cellInput}
                                                />
                                            </td>

                                            {[
                                                'cgst',
                                                'sgst',
                                                'cess',
                                            ].map((key) => (
                                                <td
                                                    key={key}
                                                    className="px-3 py-3 align-top w-20"
                                                >
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={row[key]}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                row.id,
                                                                {
                                                                    [key]: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        className={cellInput}
                                                    />
                                                </td>
                                            ))}

                                            <td className="px-4 py-3 align-top text-right text-xs font-semibold text-[#101828] whitespace-nowrap">
                                                {formatCurrency(
                                                    row.amount
                                                )}
                                            </td>

                                            <td className="px-4 py-3 align-top text-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeItem(
                                                            row.id
                                                        )
                                                    }
                                                    title="Remove line item"
                                                    className="text-[#98A2B3] hover:text-red-500 transition cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Tax breakdown + totals */}
                    <div className="grid gap-4 p-5 lg:grid-cols-2">
                        {/* Tax breakdown */}
                        <div className="rounded-xl border border-[#E7EAF0] bg-[#FCFDFE] p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText
                                    size={13}
                                    className="text-[#084E92]"
                                />

                                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#084E92]">
                                    Tax Breakdown (
                                    {isInterState
                                        ? 'Inter-State IGST'
                                        : 'Intra-State CGST + SGST'}
                                    )
                                </h3>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1 text-[#475467]">
                                        Taxable Amount
                                        <Info
                                            size={11}
                                            className="text-[#C3C6D1]"
                                        />
                                    </span>

                                    <span className="font-semibold text-[#101828]">
                                        {formatCurrency(
                                            totals.taxable
                                        )}
                                    </span>
                                </div>

                                {!isInterState ? (
                                    <>
                                        <SummaryRow
                                            label="CGST Amount:"
                                            value={formatCurrency(
                                                totals.cgst
                                            )}
                                        />

                                        <SummaryRow
                                            label="SGST Amount:"
                                            value={formatCurrency(
                                                totals.sgst
                                            )}
                                        />
                                    </>
                                ) : (
                                    <SummaryRow
                                        label="IGST Amount:"
                                        value={formatCurrency(
                                            totals.igst
                                        )}
                                    />
                                )}

                                <SummaryRow
                                    label="CESS Amount:"
                                    value={formatCurrency(
                                        totals.cess
                                    )}
                                />

                                <div className="border-t border-[#E7EAF0] pt-2.5 flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#101828]">
                                        Total Tax (GST + CESS):
                                    </span>

                                    <span className="font-bold text-[#084E92]">
                                        {formatCurrency(
                                            totals.totalTax
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Invoice totals */}
                        <div className="rounded-xl p-4">
                            <div className="space-y-2.5">
                                <SummaryRow
                                    label="Sub Total (Taxable):"
                                    value={formatCurrency(
                                        totals.taxable
                                    )}
                                />

                                <SummaryRow
                                    label="Total Tax:"
                                    value={formatCurrency(
                                        totals.totalTax
                                    )}
                                />

                                <SummaryRow
                                    label="Round Off:"
                                    value={`${totals.roundOff >= 0 ? '+' : '-'}${formatCurrency(
                                        Math.abs(totals.roundOff)
                                    )}`}
                                />
                            </div>

                            <div className="mt-4 border-t border-[#E7EAF0] pt-4 flex items-center justify-between">
                                <span className="text-sm font-bold text-[#101828]">
                                    NET AMOUNT:
                                </span>

                                <span className="text-xl font-bold text-[#084E92]">
                                    {formatCurrency(totals.net)}
                                </span>
                            </div>

                            <div className="mt-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                    Amount in words
                                </p>

                                <p className="text-xs font-semibold italic text-[#084E92] mt-1">
                                    {numberToWords(totals.net)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardShell>

                {/* Footer actions */}
                <CardShell className="flex items-center justify-between gap-3 flex-wrap p-4">
                    <p className="text-xs text-[#98A2B3]">
                        Invoice dated{' '}
                        {formatDisplayDate(
                            header.invoiceDate
                        )}{' '}
                        · {rows.length} line item
                        {rows.length !== 1 ? 's' : ''}
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="h-11 px-5 rounded-lg border cursor-pointer border-[#C3C6D1] bg-white text-sm font-semibold text-[#101828] hover:bg-gray-50 transition"
                        >
                            Save As Draft
                        </button>

                        <button
                            type="button"
                            onClick={handleSendForApproval}
                            disabled={submitting}
                            className="flex items-center gap-2 h-11 px-5 cursor-pointer rounded-lg bg-[#084E92] text-white text-sm font-semibold hover:bg-[#073e77] disabled:opacity-60 transition"
                        >
                            <CheckCircle2 size={16} />
                            {submitting
                                ? 'Sending...'
                                : 'Send For Approval'}
                        </button>
                    </div>
                </CardShell>
            </div>
        </Container>
    );
};

export default ApproveInvoice;