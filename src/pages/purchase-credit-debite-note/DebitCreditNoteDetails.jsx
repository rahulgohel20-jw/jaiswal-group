import React, { useEffect, useMemo, useState } from 'react';
import {
    Building2,
    Calendar,
    ArrowLeft,
    ClipboardList,
    Package,
    Loader2,
    UserCheck,
    Ban,
    Receipt,
    TrendingDown,
    TrendingUp,
    FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDebitCreditNoteById } from '../../services/apiServices';
import { Container } from '@/components/common/container';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { numberToWords } from '@/pages/purchase-order-requests/utils/taxUtils';

const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    const slashMatch = String(dateStr).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (slashMatch) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatAmount = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatEnumLabel = (val) => {
    if (!val) return '—';
    return String(val)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const SectionCard = ({ children, className = '' }) => (
    <div className={`min-w-0 max-w-full rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ icon: Icon, title, trailing }) => (
    <div className="flex min-w-0 items-center justify-between gap-2 px-5 pb-4 pt-5">
        <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#084E92]">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-[12px] font-bold uppercase tracking-wide text-gray-700">{title}</span>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
);

const InfoTile = ({ label, value, icon: Icon, className = '' }) => (
    <div className={`min-w-0 rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5 ${className}`}>
        <p className="mb-1 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            <span className="truncate">{label}</span>
        </p>
        <p className="min-w-0 truncate text-sm font-semibold text-gray-800" title={value ?? '—'}>
            {value ?? '—'}
        </p>
    </div>
);

const StatusBadge = ({ status }) => {
    const normalized = String(status || 'DRAFT').toUpperCase();

    const styles = {
        APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
        CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
    };

    const dots = {
        APPROVED: 'bg-emerald-500',
        DRAFT: 'bg-amber-500',
        CANCELLED: 'bg-rose-500',
    };

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${styles[normalized] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dots[normalized] || 'bg-gray-400'}`} />
            {normalized}
        </span>
    );
};

const DebitCreditNoteDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { canView } = usePagePermissions(['Debit Note Report', 'Debit Note']);

    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadNote = async () => {
        try {
            setLoading(true);
            const res = await getDebitCreditNoteById(id);
            const data = res?.data?.data || res?.data || {};
            setNote(data);
        } catch (error) {
            console.error('Failed to load note:', error);
            setNote(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadNote();
    }, [id]);

    const items = note?.details || [];
    const isQtyReturn = String(note?.adjustmentNature).toUpperCase() === 'QUANTITY_RETURN';
    const isRateDiff = String(note?.adjustmentNature).toUpperCase() === 'RATE_DIFFERENCE';
    const isDebitNote = String(note?.noteType).toUpperCase() === 'DEBIT_NOTE';

    const hasAnyCess = useMemo(() => {
        return items.some((item) => Number(item.cessRate || item.cessAmount || 0) > 0);
    }, [items]);

    const isInterState = useMemo(() => {
        return Number(note?.igstAmount || 0) > 0 || items.some((item) => Number(item.igstRate || item.igstAmount || 0) > 0);
    }, [note?.igstAmount, items]);

    // Computed totals and line-by-line calculations
    const processedItems = useMemo(() => {
        return items.map((item, idx) => {
            const origQty = Number(item.originalQuantity || 0);
            const rawAdjQty = Number(item.adjustedQuantity || 0);
            const origRate = Number(item.originalRate || 0);
            const revRate = Number(item.revisedRate !== undefined ? item.revisedRate : origRate);

            // If RATE_DIFFERENCE and adjustedQuantity was 0, it applies across entire original quantity
            const effectiveAdjQty = (isRateDiff && rawAdjQty === 0) ? origQty : rawAdjQty;
            const remainingQty = Math.max(0, origQty - effectiveAdjQty);
            const unitRateDiff = revRate - origRate;
            const absRateDiff = Number(item.rateDifference !== undefined ? Math.abs(item.rateDifference) : Math.abs(unitRateDiff));

            const taxableAmt = Number(item.taxableAmount !== undefined ? item.taxableAmount : (
                isQtyReturn ? effectiveAdjQty * origRate : absRateDiff * effectiveAdjQty
            ));

            const gstPct = Number(item.igstRate || (Number(item.cgstRate || 0) + Number(item.sgstRate || 0)) || 0);
            const cessPct = Number(item.cessRate || 0);

            const cgstAmt = Number(item.cgstAmount !== undefined ? item.cgstAmount : (isInterState ? 0 : (taxableAmt * (Number(item.cgstRate || gstPct / 2) / 100))));
            const sgstAmt = Number(item.sgstAmount !== undefined ? item.sgstAmount : (isInterState ? 0 : (taxableAmt * (Number(item.sgstRate || gstPct / 2) / 100))));
            const igstAmt = Number(item.igstAmount !== undefined ? item.igstAmount : (isInterState ? (taxableAmt * (gstPct / 100)) : 0));
            const cessAmt = Number(item.cessAmount !== undefined ? item.cessAmount : (taxableAmt * (cessPct / 100)));

            const totalTax = (isInterState ? igstAmt : (cgstAmt + sgstAmt)) + cessAmt;
            const lineTotal = Number(item.lineTotal !== undefined ? item.lineTotal : taxableAmt + totalTax);

            return {
                ...item,
                origQty,
                effectiveAdjQty,
                remainingQty,
                origRate,
                revRate,
                unitRateDiff,
                absRateDiff,
                taxableAmt,
                gstPct,
                cessPct,
                cgstAmt,
                sgstAmt,
                igstAmt,
                cessAmt,
                totalTax,
                lineTotal,
            };
        });
    }, [items, isQtyReturn, isRateDiff, isInterState]);

    const totals = useMemo(() => {
        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        let cess = 0;

        processedItems.forEach((r) => {
            taxable += r.taxableAmt;
            cgst += r.cgstAmt;
            sgst += r.sgstAmt;
            igst += r.igstAmt;
            cess += r.cessAmt;
        });

        const totalTax = isInterState ? (Number(note?.igstAmount) || igst) + cess : (Number(note?.cgstAmount) || cgst) + (Number(note?.sgstAmount) || sgst) + cess;
        const netTaxable = Number(note?.subtotal !== undefined ? note.subtotal : (note?.taxableAmount !== undefined ? note.taxableAmount : taxable));
        const rawNet = netTaxable + totalTax;
        const totalAmount = Number(note?.totalAmount !== undefined ? note.totalAmount : Math.round(rawNet));
        const roundOff = Number(note?.roundOff !== undefined ? note.roundOff : (totalAmount - rawNet).toFixed(2));

        return {
            taxable: netTaxable,
            cgst: Number(note?.cgstAmount !== undefined ? note.cgstAmount : cgst),
            sgst: Number(note?.sgstAmount !== undefined ? note.sgstAmount : sgst),
            igst: Number(note?.igstAmount !== undefined ? note.igstAmount : igst),
            cess: Number(note?.cessAmount !== undefined ? note.cessAmount : cess),
            totalTax,
            roundOff,
            netAmount: totalAmount,
        };
    }, [processedItems, note, isInterState]);

    const isCancelled = String(note?.status).toUpperCase() === 'CANCELLED';

    const { cleanRemarks, cancelReasonText } = useMemo(() => {
        const rawRemarks = note?.remarks || '';
        const cancelMatch = rawRemarks.match(/(?:\|\s*)?Cancelled:\s*(.+)$/i);

        if (cancelMatch) {
            const reason = cancelMatch[1]?.trim();
            const originalRemarks = rawRemarks.replace(/(?:\|\s*)?Cancelled:\s*.+$/i, '').trim();
            return {
                cleanRemarks: originalRemarks || 'None',
                cancelReasonText: reason || 'Not specified',
            };
        }

        return {
            cleanRemarks: rawRemarks || 'None',
            cancelReasonText: isCancelled ? 'Not specified' : '',
        };
    }, [note?.remarks, isCancelled]);

    // Grouping by tax rates for the Tax Breakdown table
    const taxRateBreakdown = useMemo(() => {
        const groups = {};
        processedItems.forEach((r) => {
            // Group only applicable tax lines
            const key = `${r.gstPct}_${r.cessPct}`;
            if (!groups[key]) {
                groups[key] = {
                    gstPct: r.gstPct,
                    cessPct: r.cessPct,
                    taxable: 0,
                    cgstAmt: 0,
                    sgstAmt: 0,
                    igstAmt: 0,
                    cessAmt: 0,
                };
            }
            groups[key].taxable += r.taxableAmt;
            groups[key].cgstAmt += r.cgstAmt;
            groups[key].sgstAmt += r.sgstAmt;
            groups[key].igstAmt += r.igstAmt;
            groups[key].cessAmt += r.cessAmt;
        });

        return Object.values(groups).sort((a, b) => b.gstPct - a.gstPct);
    }, [processedItems]);

    // Check if total tax or GST is applicable (> 0)
    const hasTaxApplicable = useMemo(() => {
        const totalTaxAmount = Number(totals.totalTax || 0);
        const hasPositiveRate = processedItems.some((r) => Number(r.gstPct || 0) > 0 || Number(r.cessPct || 0) > 0);
        return totalTaxAmount > 0 || hasPositiveRate;
    }, [totals.totalTax, processedItems]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="rounded-xl border border-[#E7EAF0] bg-white px-8 py-6 text-center shadow-sm">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#084E92]" />
                    <p className="text-sm font-medium text-[#475467]">Loading note details...</p>
                </div>
            </div>
        );
    }

    if (!canView) {
        return <AccessDenied pageTitle="Debit Note Report" />;
    }

    if (!note) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] px-6 py-6">
                <div className="mx-auto max-w-7xl">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mb-4 flex items-center gap-2 text-sm font-medium text-[#084E92]"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="rounded-xl border border-red-100 bg-white p-10 text-center">
                        <p className="text-sm font-semibold text-red-600">Note not found.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Container>
            <div className="mx-auto p-4 pt-4 space-y-4">
                {/* Header Banner */}
                <div className="flex w-full flex-col flex-wrap justify-between gap-4 rounded-2xl bg-linear-to-r from-[#084E92] to-[#0B65BD] px-6 py-5 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-white/15 text-white transition hover:bg-white/25"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold tracking-tight text-white md:text-2xl">
                                {note.noteCode || `Note #${note.id}`}
                            </h1>
                            <p className="mt-0.5 truncate text-xs text-blue-100/90 font-medium">
                                {formatEnumLabel(note.noteType)} &bull; {formatEnumLabel(note.adjustmentNature)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <StatusBadge status={note.status} />
                    </div>
                </div>

                {/* Core General Information */}
                <SectionCard className="mt-4">
                    <SectionHeader icon={Calendar} title="General Information" />
                    <div className="min-w-0 px-5 pb-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoTile label="Debit Note No." value={note.noteCode || '—'} />
                            <InfoTile label="Note Date" value={formatDisplayDate(note.noteDate)} icon={Calendar} />

                            <InfoTile label="Vendor" value={note.vendorName || `Vendor #${note.vendorId}`} />
                            <InfoTile label="Vendor Note Ref No" value={note.vendorNoteNumber || '—'} />
                            <InfoTile label="Invoice Ref Code" value={note.purchaseInvoiceCode || (note.purchaseInvoiceId ? `INV-${note.purchaseInvoiceId}` : '—')} icon={FileText} />
                            <InfoTile label="Vendor Bill No" value={note.vendorInvoiceNumber || '—'} />

                            <InfoTile label="Unit" value={note.organizationName || `Unit #${note.organizationId}`} icon={Building2} />
                            <InfoTile label="Reference Type" value={formatEnumLabel(note.referenceType || 'PURCHASE_INVOICE')} />

                            {String(note.status).toUpperCase() === 'APPROVED' && (
                                <>
                                    <InfoTile
                                        label="Approved By"
                                        value={note.approvedByName || (note.approvedBy ? `User #${note.approvedBy}` : '—')}
                                        icon={UserCheck}
                                        className="border-emerald-100 bg-emerald-50/30"
                                    />
                                    {note.approvedAt && (
                                        <InfoTile
                                            label="Approved Date"
                                            value={formatDisplayDate(note.approvedAt)}
                                            icon={Calendar}
                                            className="border-emerald-100 bg-emerald-50/30"
                                        />
                                    )}
                                </>
                            )}

                            {isCancelled && (
                                <InfoTile
                                    label="Cancellation Reason"
                                    value={cancelReasonText}
                                    icon={Ban}
                                    className="border-rose-200 bg-rose-50/40 text-rose-800 font-medium sm:col-span-2"
                                />
                            )}

                            <InfoTile
                                label="General Remarks"
                                value={cleanRemarks}
                                className={isCancelled ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-2'}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Adjusted Line Items Table */}
                <SectionCard className="mt-4 overflow-hidden">
                    <SectionHeader
                        icon={ClipboardList}
                        title="Adjusted Line Items"
                        trailing={
                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#084E92] border border-blue-100">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                            </span>
                        }
                    />
                    <div className="w-full min-w-0 border-t border-gray-100">
                        <ScrollArea className="w-full">
                            <table className="w-full text-xs border-collapse">
                                <thead className="bg-[#F8FAFC] border-b border-gray-200 uppercase text-[11px] text-gray-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 min-w-40 text-left">Item Description</th>
                                        <th className="px-2 py-3 text-center w-20">Unit</th>
                                        <th className="px-3 py-3 text-right w-20">QTY</th>
                                        
                                        <th className="px-3 py-3 text-right w-28">Inv Rate</th>
                                        {isRateDiff && (
                                            <>
                                                <th className="px-3 py-3 text-right w-24 bg-blue-50/40 text-[#084E92]">Rev Rate</th>
                                                <th className="px-3 py-3 text-right w-28">Rate Diff</th>
                                            </>
                                        )}
                                        <th className="px-2 py-3 text-right w-16">GST</th>
                                        {hasAnyCess && <th className="px-2 py-3 text-right w-16">CESS</th>}
                                        <th className="px-3 py-3 text-right w-24">Taxable</th>
                                        <th className="px-3 py-3 text-right w-20">Tax</th>
                                        <th className="px-3 py-3 text-right w-28 font-bold text-gray-800">Line Adj</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {!processedItems.length ? (
                                        <tr>
                                            <td colSpan={13} className="px-5 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className="h-6 w-6 text-gray-300" />
                                                    No adjusted items recorded.
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        processedItems.map((item, idx) => (
                                            <tr key={item.id || idx} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-4 py-3 font-medium text-[#084E92]">
                                                    <div>{item.rawMaterialName || `Material #${item.rawMaterialId}`}</div>
                                                    <span className='text-[10px] text-gray-400 italic'>{item.remarks || ''}</span>
                                                    {item.batchNo && (
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            Batch: {item.batchNo}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-2 py-3 text-center text-gray-600">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                                        {item.unitName || 'Units'}
                                                    </span>
                                                </td>

                                                <td className="px-3 py-3 text-right font-mono text-gray-600 font-medium">
                                                    {item.origQty}
                                                </td>

                                              

                                                <td className="px-3 py-3 text-right font-mono text-gray-700">
                                                    ₹{formatAmount(item.origRate)}
                                                </td>

                                                {isRateDiff && (
                                                    <>
                                                        <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800 bg-blue-50/20">
                                                            ₹{formatAmount(item.revRate)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-mono font-semibold">
                                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${item.unitRateDiff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : item.unitRateDiff < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-gray-500'}`}>
                                                                {item.unitRateDiff > 0 ? `+₹${formatAmount(item.unitRateDiff)}` : item.unitRateDiff < 0 ? `-₹${formatAmount(item.absRateDiff)}` : '₹0.00'}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}

                                                <td className="px-2 py-3 text-right font-mono text-gray-600">
                                                    {item.gstPct}%
                                                </td>

                                                {hasAnyCess && (
                                                    <td className="px-2 py-3 text-right font-mono text-gray-600">
                                                        {item.cessPct > 0 ? `${item.cessPct}%` : '—'}
                                                    </td>
                                                )}

                                                <td className="px-3 py-3 text-right font-mono font-medium text-gray-800">
                                                    ₹{formatAmount(item.taxableAmt)}
                                                </td>

                                                <td className="px-3 py-3 text-right font-mono font-medium text-orange-600">
                                                    ₹{formatAmount(item.totalTax)}
                                                </td>

                                                <td className="px-3 py-3 text-right font-mono font-bold">
                                                    <span className={isDebitNote ? 'text-rose-700' : 'text-emerald-700'}>
                                                        {isDebitNote ? '-' : '+'}₹{formatAmount(item.lineTotal)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </SectionCard>

                {/* Tax Breakdown & Adjustment Summary */}
                <div
                    className={
                        hasTaxApplicable
                            ? 'grid grid-cols-1 xl:grid-cols-12 gap-4 items-start'
                            : 'flex justify-end w-full'
                    }
                >
                    {/* Tax Breakdown Details: Render ONLY when tax/GST is applicable */}
                    {hasTaxApplicable && (
                        <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Receipt size={18} className="text-[#084E92]" />
                                    <h3 className="text-xs font-bold text-[#084E92] uppercase tracking-wide">Tax Breakdown</h3>
                                </div>
                                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-blue-50 text-[#084E92] text-xs font-medium border border-blue-100">
                                    {isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
                                </span>
                            </div>

                            <div className="w-full mt-3 overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-semibold">
                                            <th className="py-2 px-2 text-left">Tax Rate</th>
                                            <th className="py-2 px-2 text-right">Taxable Amt</th>
                                            {!isInterState ? (
                                                <>
                                                    <th className="py-2 px-2 text-right">SGST</th>
                                                    <th className="py-2 px-2 text-right">CGST</th>
                                                </>
                                            ) : (
                                                <th className="py-2 px-2 text-right">IGST</th>
                                            )}
                                            {hasAnyCess && <th className="py-2 px-2 text-right">CESS</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {taxRateBreakdown.map((rate, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="py-2.5 px-2">
                                                    <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-[#084E92] font-semibold text-xs border border-blue-100">
                                                        {Number(rate.gstPct).toFixed(2)}% GST
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800">
                                                    ₹{formatAmount(rate.taxable)}
                                                </td>
                                                {!isInterState ? (
                                                    <>
                                                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800">
                                                            ₹{formatAmount(rate.sgstAmt)}
                                                        </td>
                                                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800">
                                                            ₹{formatAmount(rate.cgstAmt)}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800">
                                                        ₹{formatAmount(rate.igstAmt)}
                                                    </td>
                                                )}
                                                {hasAnyCess && (
                                                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800">
                                                        ₹{formatAmount(rate.cessAmt)}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-dashed border-gray-200 text-xs font-bold text-gray-900">
                                            <td className="py-3 px-2">TOTAL TAX</td>
                                            <td className="py-3 px-2 text-right font-mono">₹{formatAmount(totals.taxable)}</td>
                                            {!isInterState ? (
                                                <>
                                                    <td className="py-3 px-2 text-right font-mono">₹{formatAmount(totals.sgst)}</td>
                                                    <td className="py-3 px-2 text-right font-mono">₹{formatAmount(totals.cgst)}</td>
                                                </>
                                            ) : (
                                                <td className="py-3 px-2 text-right font-mono text-[#084E92]">₹{formatAmount(totals.igst)}</td>
                                            )}
                                            {hasAnyCess && (
                                                <td className="py-3 px-2 text-right font-mono text-[#084E92]">₹{formatAmount(totals.cess)}</td>
                                            )}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Final Net Calculation Summary Card */}
                    <div
                        className={
                            hasTaxApplicable
                                ? 'xl:col-span-5 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm'
                                : 'w-full md:w-95 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm'
                        }
                    >
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                            <Receipt size={18} className="text-[#084E92]" />
                            <h3 className="text-xs font-bold text-[#084E92] uppercase tracking-wide">Adjustment Summary</h3>
                        </div>

                        {hasTaxApplicable ? (
                            /* Full Layout: Shown when Tax / GST is Applicable */
                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between gap-4 text-gray-600">
                                    <span>Taxable Adjustment:</span>
                                    <span className="font-semibold text-gray-900 font-mono">₹{formatAmount(totals.taxable)}</span>
                                </div>

                                <div className="flex justify-between gap-4 text-gray-600">
                                    <span>Total Tax ({isInterState ? 'IGST' : 'CGST + SGST'}):</span>
                                    <span className="font-semibold text-gray-900 font-mono">₹{formatAmount(totals.totalTax)}</span>
                                </div>

                                {Number(totals.roundOff) !== 0 && (
                                    <div className="flex justify-between gap-4 text-gray-600">
                                        <span>Round Off:</span>
                                        <span className="font-semibold text-gray-900 font-mono">
                                            {totals.roundOff >= 0 ? '+' : ''}₹{formatAmount(totals.roundOff)}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-800">
                                        {isDebitNote ? 'Total Deduction (Debit):' : 'Total Addition (Credit):'}
                                    </span>
                                    <span className={`font-bold text-base font-mono `}>
                                        {isDebitNote ? '-' : '+'}₹{formatAmount(totals.netAmount)}
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-[#F0F5FA] border border-blue-100 flex justify-between items-center">
                                    <div>
                                        <span className="block font-bold text-xs uppercase text-[#00376C]">Net Adjusted Amount</span>
                                        <span className="text-[10px] text-gray-500 font-medium">Final note value</span>
                                    </div>
                                    <span className="font-extrabold text-xl text-[#084E92] font-mono">
                                        ₹{formatAmount(totals.netAmount)}
                                    </span>
                                </div>

                                <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Amount in Words</div>
                                    <div className="text-xs italic font-medium text-gray-800 leading-relaxed">
                                        {numberToWords(totals.netAmount)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Clean Non-Redundant Layout: Shown when GST is 0% */
                            <div className="space-y-3.5">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Impact on Invoice:</span>
                                    <span className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-md `}>
                                        {isDebitNote ? 'Debit (Deduct Payable)' : 'Credit (Increase Payable)'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Tax Status:</span>
                                    <span className="font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                                        Non-Taxable / 0% GST
                                    </span>
                                </div>

                                {Number(totals.roundOff) !== 0 && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Round Off:</span>
                                        <span className="font-semibold text-gray-900 font-mono">
                                            {totals.roundOff >= 0 ? '+' : ''}₹{formatAmount(totals.roundOff)}
                                        </span>
                                    </div>
                                )}

                                {/* Prominent Single Net Banner */}
                                <div className={`p-4 rounded-xl border flex justify-between items-center ${isDebitNote
                                        ? 'bg-rose-50/50 border-rose-100'
                                        : 'bg-emerald-50/50 border-emerald-100'
                                    }`}>
                                    <div>
                                        <span className="block font-bold text-xs uppercase tracking-wide text-gray-700">
                                            Total {isDebitNote ? 'Debit Note' : 'Credit Note'} Amount
                                        </span>
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            {items.length} {items.length === 1 ? 'item adjusted' : 'items adjusted'}
                                        </span>
                                    </div>
                                    <span className={`font-mono text-xl font-extrabold `}>
                                        {isDebitNote ? '-' : '+'}₹{formatAmount(totals.netAmount)}
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Amount in Words</div>
                                    <div className="text-xs italic font-medium text-gray-800 leading-relaxed">
                                        {numberToWords(totals.netAmount)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default DebitCreditNoteDetails;