import React, { useEffect, useMemo, useState } from 'react';
import {
    ChevronRight,
    Building2,
    Calendar,
    ArrowLeft,
    ClipboardList,
    Package,
    MapPin,
    Phone,
    Mail,
    Receipt,
    Truck,
    Download,
    Loader2,
    PlusCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    getInvoiceById,
    getRawMaterialById,
} from '../../services/apiServices';
import { Container } from '@/components/common/container';
import { useExportReport } from '@/hooks/useExportReport';
import { numberToWords } from '../purchase-order-requests/utils/taxUtils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
const formatDisplayDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
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

const InvoiceStatusBadge = ({ status }) => {
    const normalized = String(status || 'DRAFT').toUpperCase();

    const styles = {
        APPROVED: 'bg-emerald-50 text-emerald-600',
        REJECTED: 'bg-rose-50 text-rose-600',
        DRAFT: 'bg-yellow-50 text-yellow-700',
        PENDING: 'bg-amber-50 text-amber-600',
        CANCELLED: 'bg-gray-100 text-gray-500',
    };

    const dots = {
        APPROVED: 'bg-emerald-500',
        REJECTED: 'bg-rose-500',
        DRAFT: 'bg-yellow-500',
        PENDING: 'bg-amber-500',
        CANCELLED: 'bg-gray-400',
    };

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${styles[normalized] || 'bg-gray-100 text-gray-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dots[normalized] || 'bg-gray-400'}`} />
            {status || 'DRAFT'}
        </span>
    );
};

const PurchaseInvoiceDetailsModal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const vendorName = location.state?.vendorName;
    const organizationName = location.state?.organizationName;

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rawMaterialDetails, setRawMaterialDetails] = useState({});

    const { exporting, exportReport } = useExportReport();

    const handleExportReport = () => {
        if (!invoice?.id) {
            toast.error('Purchase Invoice ID not found.');
            return;
        }

        exportReport(
            {
                id: Number(invoice.id),
                type: 'Purchase invoice 1',
            },
            {
                fileName: `Purchase_Invoice_Report_${invoice.invoiceCode || invoice.id}.pdf`,
                successMessage: 'Purchase Invoice report downloaded successfully.',
                errorMessage: 'Failed to export Purchase Invoice report.',
            }
        );
    };

    useEffect(() => {
        const loadInvoice = async () => {
            try {
                setLoading(true);
                const res = await getInvoiceById(id);
                const data = res?.data?.data || res?.data || {};
                setInvoice(data);
            } catch (error) {
                console.error('Failed to load invoice:', error);
                setInvoice(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) loadInvoice();
    }, [id]);

    const items = invoice?.details || [];

    const billTo = invoice?.billTo || invoice?.billingAddress || null;
    const shipTo = invoice?.shipTo || invoice?.shippingAddress || null;

    const isInterState =
        billTo?.stateId != null && shipTo?.stateId != null
            ? Number(billTo.stateId) !== Number(shipTo.stateId)
            : Number(invoice?.igstAmount || 0) > 0;

    const isGstApplicable =
        Number(invoice?.cgstAmount || 0) > 0 ||
        Number(invoice?.sgstAmount || 0) > 0 ||
        Number(invoice?.igstAmount || 0) > 0 ||
        Number(invoice?.cessAmount || 0) > 0;

    useEffect(() => {
        if (!invoice?.details?.length) {
            setRawMaterialDetails({});
            return;
        }

        const loadRawMaterials = async () => {
            try {
                const uniqueRawMaterialIds = [
                    ...new Set(
                        invoice.details
                            .map((item) => item.rawMaterialId)
                            .filter(Boolean)
                    ),
                ];

                const responses = await Promise.all(
                    uniqueRawMaterialIds.map(async (rawMaterialId) => {
                        try {
                            const res = await getRawMaterialById(rawMaterialId);
                            const details =
                                res?.data?.data?.['Raw Material Details'] || [];

                            return {
                                id: rawMaterialId,
                                data: details[0] || null,
                            };
                        } catch (error) {
                            console.error(
                                `Failed to load raw material ${rawMaterialId}:`,
                                error
                            );
                            return {
                                id: rawMaterialId,
                                data: null,
                            };
                        }
                    })
                );

                const mapped = {};

                responses.forEach(({ id: rawMaterialId, data }) => {
                    if (data) mapped[rawMaterialId] = data;
                });

                setRawMaterialDetails(mapped);
            } catch (error) {
                console.error('Failed to load raw material details:', error);
            }
        };

        loadRawMaterials();
    }, [invoice]);

    const getUnitName = (item) => {
        const rawMaterial = rawMaterialDetails[item.rawMaterialId];
        const invoiceUnitId = Number(item.unitId);

        const currentUnit = rawMaterial?.unit;
        const parentUnit = currentUnit?.parentUnit;

        if (currentUnit && Number(currentUnit.id) === invoiceUnitId) {
            return currentUnit.nameEnglish || currentUnit.name || `Unit #${item.unitId}`;
        }

        if (parentUnit && Number(parentUnit.id) === invoiceUnitId) {
            return parentUnit.nameEnglish || parentUnit.name || `Unit #${item.unitId}`;
        }

        if (item.unitName) return item.unitName;

        return `Unit #${item.unitId}`;
    };

    const grnCodes = useMemo(() => {
        if (Array.isArray(invoice?.grnCode) && invoice.grnCode.length) {
            return [...new Set(invoice.grnCode.filter(Boolean))];
        }

        return [
            ...new Set(items.map((item) => item.grnCode).filter(Boolean)),
        ];
    }, [invoice, items]);

    const poCodes = useMemo(() => {
        if (Array.isArray(invoice?.poCode) && invoice.poCode.length) {
            return [...new Set(invoice.poCode.filter(Boolean))];
        }

        return [
            ...new Set(items.map((item) => item.poCode).filter(Boolean)),
        ];
    }, [invoice, items]);

    const calculations = useMemo(() => {
        return items.map((item) => {
            const quantity = Number(item.invoiceQuantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const base = quantity * unitPrice;
            const discountAmount = Number(item.discountAmount) || 0;

            const taxableAmount =
                Number(item.taxableAmount) ||
                Math.max(0, base - discountAmount);

            const cgstRate = Number(item.cgstRate) || 0;
            const sgstRate = Number(item.sgstRate) || 0;
            const igstRate = Number(item.igstRate) || 0;
            const cessRate = Number(item.cessRate) || 0;

            const cgstAmount = Number(item.cgstAmount) || 0;
            const sgstAmount = Number(item.sgstAmount) || 0;
            const igstAmount = Number(item.igstAmount) || 0;
            const cessAmount = Number(item.cessAmount) || 0;

            const gstAmount = isInterState
                ? igstAmount
                : cgstAmount + sgstAmount;

            const totalTax = gstAmount + cessAmount;

            const lineTotal = Number(item.lineTotal);

            const total = Number.isFinite(lineTotal)
                ? lineTotal
                : taxableAmount + totalTax;

            const gstRate = isInterState
                ? igstRate
                : cgstRate + sgstRate;

            return {
                ...item,
                quantity,
                unitPrice,
                base,
                discountRate: Number(item.discountPercentage) || 0,
                discountAmount,
                taxableAmount,
                cgstRate,
                sgstRate,
                igstRate,
                cessRate,
                cgstAmount,
                sgstAmount,
                igstAmount,
                cessAmount,
                gstRate,
                gstAmount,
                totalTax,
                lineTotal: total,
                total,
            };
        });
    }, [items, isInterState]);

    const totals = useMemo(() => {
        const subtotal = Number(invoice?.subtotal) || 0;
        const discountPercentage =
            Number(invoice?.discountPercentage) || 0;
        const discountAmount = Number(invoice?.discountAmount) || 0;

        const taxable = Math.max(0, subtotal - discountAmount);

        const cgst = Number(invoice?.cgstAmount) || 0;
        const sgst = Number(invoice?.sgstAmount) || 0;
        const igst = Number(invoice?.igstAmount) || 0;
        const cess = Number(invoice?.cessAmount) || 0;

        const gst = isInterState ? igst : cgst + sgst;
        const totalTax = gst + cess;
        const amountAfterTax = taxable + totalTax;

        const otherCosts =
            Number(invoice?.totalOtherCosts) ||
            (Array.isArray(invoice?.otherCosts)
                ? invoice.otherCosts.reduce(
                    (sum, item) => sum + (Number(item.cost) || 0),
                    0
                )
                : 0);

        const backendRoundOff = Number(invoice?.roundOff);

        const roundOff = Number.isFinite(backendRoundOff)
            ? backendRoundOff
            : 0;

        const backendNetAmount = Number(invoice?.totalAmount);

        const netAmount = Number.isFinite(backendNetAmount)
            ? backendNetAmount
            : amountAfterTax + otherCosts + roundOff;

        return {
            subtotal,
            discountPercentage,
            discountAmount,
            taxable,
            cgst,
            sgst,
            igst,
            gst,
            cess,
            totalTax,
            amountAfterTax,
            otherCosts,
            roundOff,
            netAmount,
        };
    }, [invoice, isInterState]);

    const taxBreakdown = useMemo(() => {
        const grouped = {};

        calculations.forEach((item) => {
            const gstRate = isInterState
                ? Number(item.igstRate) || 0
                : (Number(item.cgstRate) || 0) +
                (Number(item.sgstRate) || 0);

            const cessRate = Number(item.cessRate) || 0;
            const key = `${gstRate}-${cessRate}`;

            if (!grouped[key]) {
                grouped[key] = {
                    rate: gstRate,
                    taxable: 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0,
                    cess: 0,
                    cessPct: cessRate,
                };
            }

            grouped[key].taxable += Number(item.taxableAmount) || 0;
            grouped[key].cess += Number(item.cessAmount) || 0;
            grouped[key].cgst += Number(item.cgstAmount) || 0;
            grouped[key].sgst += Number(item.sgstAmount) || 0;
            grouped[key].igst += Number(item.igstAmount) || 0;
        });

        return Object.values(grouped).sort((a, b) => a.rate - b.rate);
    }, [calculations, isInterState]);

    const otherCostLabels = Array.isArray(invoice?.otherCosts)
        ? invoice.otherCosts
            .filter(
                (item) =>
                    item.label?.trim() && Number(item.cost) > 0
            )
            .map((item) => item.label.trim())
        : [];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="rounded-xl border border-[#E7EAF0] bg-white px-8 py-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#084E92] border-t-transparent" />
                    <p className="text-sm font-medium text-[#475467]">
                        Loading invoice details...
                    </p>
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] px-6 py-6">
                <div className="mx-auto max-w-7xl">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mb-4 flex items-center gap-2 text-sm font-medium text-[#084E92]"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="rounded-xl border border-red-100 bg-white p-10 text-center">
                        <p className="text-sm font-semibold text-red-600">
                            Invoice not found.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Container>
            <div className="mx-auto p-4">
                <div className="mb-3 flex min-w-0 items-center gap-1.5 text-xs text-gray-400">
                    <span
                        className="shrink-0 cursor-pointer hover:text-blue-400"
                        onClick={() => navigate('/')}
                    >
                        Dashboard
                    </span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span
                        className="shrink-0 cursor-pointer hover:text-blue-400"
                        onClick={() => navigate(-1)}
                    >
                        Purchase Invoice Listing
                    </span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span className="min-w-0 truncate font-medium text-[#084E92]">
                        {invoice.vendorInvoiceNumber ||
                            invoice.invoiceCode ||
                            'Purchase Invoice'}
                    </span>
                </div>

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
                                {invoice.vendorInvoiceNumber ||
                                    invoice.invoiceCode ||
                                    'Purchase Invoice'}
                            </h1>
                            <p className="mt-0.5 truncate text-xs text-blue-100/80">
                                Purchase invoice details, addresses, items and payment summary
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <InvoiceStatusBadge status={invoice.status || 'DRAFT'} />

                        <button
                            type="button"
                            disabled={exporting}
                            onClick={handleExportReport}
                            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#084E92] shadow-sm transition hover:bg-white disabled:opacity-60"
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    <span>Export Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <SectionCard className="mt-5">
                    <SectionHeader icon={Calendar} title="Invoice Details" />

                    <div className="min-w-0 px-5 pb-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <InfoTile
                                label="Invoice Code"
                                value={invoice.invoiceCode || '—'}
                            />
                            <InfoTile
                                label="Vendor Bill Number"
                                value={invoice.vendorInvoiceNumber || '—'}
                            />
                            <InfoTile
                                label="Invoice Date"
                                value={formatDisplayDate(invoice.invoiceDate)}
                            />
                            <InfoTile
                                label="Vendor Name"
                                value={vendorName || invoice.vendorName || '—'}
                            />
                            <InfoTile
                                label="Receiving Outlet"
                                value={
                                    organizationName ||
                                    invoice.organizationName ||
                                    invoice.outletName ||
                                    '—'
                                }
                                icon={Building2}
                            />
                            <InfoTile
                                label="GRN Code"
                                value={
                                    grnCodes.length
                                        ? grnCodes.join(', ')
                                        : '—'
                                }
                                className="sm:col-span-2"
                            />
                            <InfoTile
                                label="PO Code"
                                value={
                                    poCodes.length
                                        ? poCodes.join(', ')
                                        : '—'
                                }
                                className="sm:col-span-2"
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard className="mt-5 overflow-hidden">
                    <SectionHeader
                        icon={MapPin}
                        title="Address & Tax Configuration"
                        trailing={
                            isGstApplicable ? (
                                <span
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${isInterState
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isInterState
                                                ? 'bg-amber-500'
                                                : 'bg-emerald-500'
                                            }`}
                                    />
                                    {isInterState
                                        ? 'Inter-State Supply (IGST)'
                                        : 'Intra-State Supply (CGST + SGST)'}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                                    Non-GST Supply
                                </span>
                            )
                        }
                    />

                    <div className="grid min-w-0 grid-cols-1 gap-5 border-t border-gray-100 p-5 md:grid-cols-2">
                        <div className="relative min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-[#084E92]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                                        Bill To (Vendor Address)
                                    </span>
                                </div>
                            </div>

                            {billTo ? (
                                <div className="min-w-0 space-y-1 break-words text-xs text-gray-700">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                        {vendorName ||
                                            invoice.vendorName ||
                                            billTo.vendorName ||
                                            'Vendor'}
                                    </p>

                                    {billTo.addressLine1 && (
                                        <p>{billTo.addressLine1}</p>
                                    )}

                                    {billTo.addressLine2 && (
                                        <p>{billTo.addressLine2}</p>
                                    )}

                                    <p className="font-medium text-gray-800">
                                        {[
                                            billTo.cityName,
                                            billTo.stateName,
                                            billTo.pincode,
                                            billTo.countryName,
                                        ]
                                            .filter(Boolean)
                                            .join(', ') || '—'}
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-200/60 pt-2 text-gray-600">
                                        {billTo.phoneNumber && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                                                {billTo.phoneNumber}
                                            </span>
                                        )}

                                        {billTo.gstNumber && (
                                            <span className="break-all">
                                                <strong className="text-gray-700">
                                                    GSTIN:
                                                </strong>{' '}
                                                {billTo.gstNumber}
                                            </span>
                                        )}

                                        {billTo.panNumber && (
                                            <span className="break-all">
                                                <strong className="text-gray-700">
                                                    PAN:
                                                </strong>{' '}
                                                {billTo.panNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="min-w-0 space-y-1 text-xs text-gray-500">
                                    <p className="truncate font-semibold text-gray-800">
                                        {vendorName ||
                                            invoice.vendorName ||
                                            'Vendor'}
                                    </p>
                                    <p className="italic text-gray-400">
                                        No detailed billing address record available.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="relative min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-[#084E92]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                                        Ship To (Outlet Delivery Address)
                                    </span>
                                </div>
                            </div>

                            {shipTo ? (
                                <div className="min-w-0 space-y-1 break-words text-xs text-gray-700">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                        {shipTo.companyNameEnglish ||
                                            invoice.organizationName ||
                                            invoice.outletName ||
                                            'Outlet'}
                                        {shipTo.companyCode
                                            ? ` (${shipTo.companyCode})`
                                            : ''}
                                    </p>

                                    {shipTo.addressEnglish && (
                                        <p>{shipTo.addressEnglish}</p>
                                    )}

                                    {shipTo.addressline2 && (
                                        <p>{shipTo.addressline2}</p>
                                    )}

                                    <p className="font-medium text-gray-800">
                                        {[
                                            shipTo.cityName,
                                            shipTo.stateName,
                                            shipTo.pincode,
                                            shipTo.countryName,
                                        ]
                                            .filter(Boolean)
                                            .join(', ') || '—'}
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-200/60 pt-2 text-gray-600">
                                        {(shipTo.mobilenumber ||
                                            shipTo.alternatemobilenumber) && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                                                    {shipTo.mobilenumber ||
                                                        shipTo.alternatemobilenumber}
                                                </span>
                                            )}

                                        {shipTo.emailid && (
                                            <span className="flex items-center gap-1 break-all">
                                                <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                                                {shipTo.emailid}
                                            </span>
                                        )}

                                        {shipTo.gstNumber && (
                                            <span className="break-all">
                                                <strong className="text-gray-700">
                                                    GSTIN:
                                                </strong>{' '}
                                                {shipTo.gstNumber}
                                            </span>
                                        )}

                                        {shipTo.panNumber && (
                                            <span className="break-all">
                                                <strong className="text-gray-700">
                                                    PAN:
                                                </strong>{' '}
                                                {shipTo.panNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="min-w-0 space-y-1 text-xs text-gray-500">
                                    <p className="truncate font-semibold text-gray-800">
                                        {organizationName ||
                                            invoice.organizationName ||
                                            invoice.outletName ||
                                            'Outlet'}
                                    </p>
                                    <p className="italic text-gray-400">
                                        No detailed shipping address record available.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard className="mt-5 overflow-hidden">
                    <SectionHeader
                        icon={ClipboardList}
                        title="Purchase Items"
                        trailing={
                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#084E92]">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                            </span>
                        }
                    />


                    <div className="w-full min-w-0 border-t border-gray-100">
                        <ScrollArea className="w-full">
                            <div className="min-w-max">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                                            <th className="w-48 px-2 py-3 text-left font-semibold">Item Description</th>
                                            <th className="w-20 px-2 py-3 text-center font-semibold">Unit</th>
                                            <th className="w-20 px-2 py-3 text-center font-semibold">Qty</th>
                                            <th className="w-24 px-2 py-3 text-right font-semibold">Rate (₹)</th>
                                            <th className="w-20 px-2 py-3 text-center font-semibold">GST (%)</th>
                                            <th className="w-20 px-2 py-3 text-center font-semibold">CESS (%)</th>
                                            <th className="w-28 px-2 py-3 text-right font-semibold">Amount</th>
                                            <th className="w-28 px-2 py-3 text-right font-semibold">Taxable</th>
                                            <th className="w-24 px-2 py-3 text-right font-semibold">Tax</th>
                                            <th className="w-24 px-2 py-3 text-right font-semibold">Discount</th>
                                            <th className="w-28 px-3 py-3 text-right font-semibold">Total</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {!items.length ? (
                                            <tr>
                                                <td colSpan={11} className="px-5 py-14 text-center text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Package className="h-6 w-6 text-gray-300" />
                                                        No items on this purchase invoice.
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            calculations.map((item) => {
                                                const rawMaterial =
                                                    rawMaterialDetails[item.rawMaterialId];

                                                const itemName =
                                                    rawMaterial?.nameEnglish ||
                                                    rawMaterial?.name ||
                                                    item.rawMaterialName ||
                                                    `Raw Material #${item.rawMaterialId}`;

                                                const unitName = getUnitName(item);

                                                return (
                                                    <tr
                                                        key={
                                                            item.id ||
                                                            item.grnDetailId ||
                                                            item.rawMaterialId
                                                        }
                                                        className="border-t border-gray-100 transition-colors hover:bg-gray-50/50"
                                                    >
                                                        <td className="w-48 px-2 py-3 align-top text-xs text-gray-800">
                                                            <p
                                                                className="truncate font-semibold text-gray-900"
                                                                title={itemName}
                                                            >
                                                                {itemName}
                                                            </p>

                                                            {item.grnCode && (
                                                                <p className="mt-1 text-[10px] text-gray-400">
                                                                    GRN: {item.grnCode}
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="w-20 px-2 py-3 text-center align-top">
                                                            <span
                                                                className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600"
                                                                title={`Unit ID: ${item.unitId}`}
                                                            >
                                                                {unitName}
                                                            </span>
                                                        </td>

                                                        <td className="w-20 px-2 py-3 text-center align-top font-mono text-xs font-medium text-gray-700">
                                                            {Number(
                                                                item.invoiceQuantity || 0
                                                            ).toFixed(2)}
                                                        </td>

                                                        <td className="w-24 px-2 py-3 text-right align-top font-mono text-xs text-gray-600">
                                                            ₹{formatAmount(item.unitPrice)}
                                                        </td>

                                                        <td className="w-20 px-2 py-3 text-center align-top font-mono text-xs text-gray-600">
                                                            {Number(item.gstRate || 0).toFixed(2)}%
                                                        </td>

                                                        <td className="w-20 px-2 py-3 text-center align-top font-mono text-xs text-gray-600">
                                                            {Number(item.cessRate || 0).toFixed(2)}%
                                                        </td>

                                                        <td className="w-28 px-2 py-3 text-right align-top font-mono text-xs font-medium text-gray-700">
                                                            ₹{formatAmount(item.base)}
                                                        </td>

                                                        <td className="w-28 px-2 py-3 text-right align-top font-mono text-xs font-medium text-gray-700">
                                                            ₹{formatAmount(item.taxableAmount)}
                                                        </td>

                                                        <td className="w-24 px-2 py-3 text-right align-top font-mono text-xs font-medium text-amber-700">
                                                            ₹{formatAmount(item.totalTax)}
                                                        </td>

                                                        <td className="w-24 px-2 py-3 text-right align-top font-mono text-xs font-medium text-red-600">
                                                            -₹{formatAmount(item.discountAmount)}
                                                        </td>

                                                        <td className="w-28 px-3 py-3 text-right align-top font-mono text-xs font-bold text-gray-900">
                                                            ₹{formatAmount(item.total)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    <div className="min-w-0 border-t border-gray-100 bg-[#F8FAFC] p-5">
                        {Array.isArray(invoice.otherCosts) &&
                            invoice.otherCosts.filter(
                                (item) =>
                                    item.label?.trim() &&
                                    Number(item.cost) > 0
                            ).length > 0 && (
                                <div className="mb-5 min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#084E92]">
                                        <PlusCircle className="h-4 w-4 shrink-0" />
                                        Other Costing / Charges
                                    </h3>

                                    <div className="space-y-2">
                                        {invoice.otherCosts
                                            .filter(
                                                (item) =>
                                                    item.label?.trim() &&
                                                    Number(item.cost) > 0
                                            )
                                            .map((item, index) => (
                                                <div
                                                    key={item.id || index}
                                                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs"
                                                >
                                                    <span className="min-w-0 truncate font-medium text-gray-800">
                                                        {item.label}
                                                    </span>
                                                    <span className="shrink-0 font-mono font-bold text-gray-900">
                                                        ₹{formatAmount(item.cost)}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>

                                    <div className="mt-3 flex items-center justify-start gap-2 border-t border-gray-100 pt-2 text-xs">
                                        <span className="font-semibold uppercase tracking-wider text-gray-500">
                                            Total Other Costs:
                                        </span>
                                        <span className="font-mono font-bold text-gray-900">
                                            ₹{formatAmount(totals.otherCosts)}
                                        </span>
                                    </div>
                                </div>
                            )}

                        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-12">
                            <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-7">
                                <div className="mb-4 flex min-w-0 items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                    <h3 className="flex min-w-0 items-center gap-1.5 truncate text-xs font-bold uppercase tracking-wider text-[#084E92]">
                                        <Receipt className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            Tax Breakdown{' '}
                                            {isInterState
                                                ? '(Inter-State IGST)'
                                                : '(Intra-State CGST + SGST)'}
                                        </span>
                                    </h3>

                                    <span className="shrink-0 whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#084E92]">
                                        GST Rate Breakdown
                                    </span>
                                </div>

                                <div className="w-full min-w-0 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500">
                                                <th className="whitespace-nowrap px-2 pb-2.5">
                                                    Tax Rate
                                                </th>
                                                <th className="whitespace-nowrap px-2 pb-2.5 text-right">
                                                    Taxable Amt
                                                </th>

                                                {isInterState ? (
                                                    <th className="whitespace-nowrap px-2 pb-2.5 text-right">
                                                        IGST
                                                    </th>
                                                ) : (
                                                    <>
                                                        <th className="whitespace-nowrap px-2 pb-2.5 text-right">
                                                            SGST
                                                        </th>
                                                        <th className="whitespace-nowrap px-2 pb-2.5 text-right">
                                                            CGST
                                                        </th>
                                                    </>
                                                )}

                                                {totals.cess > 0 && (
                                                    <th className="whitespace-nowrap px-2 pb-2.5 text-right">
                                                        CESS
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100 font-mono">
                                            {taxBreakdown.length ? (
                                                taxBreakdown.map((rate, index) => (
                                                    <tr
                                                        key={`${rate.rate}-${rate.cessPct}-${index}`}
                                                        className="transition-colors hover:bg-gray-50/60"
                                                    >
                                                        <td className="whitespace-nowrap px-2 py-2.5 font-sans">
                                                            <span className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#084E92]">
                                                                {Number(rate.rate).toFixed(2)}% GST
                                                            </span>
                                                        </td>

                                                        <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-800">
                                                            ₹{formatAmount(rate.taxable)}
                                                        </td>

                                                        {isInterState ? (
                                                            <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-800">
                                                                ₹{formatAmount(rate.igst)}
                                                            </td>
                                                        ) : (
                                                            <>
                                                                <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-800">
                                                                    ₹{formatAmount(rate.sgst)}
                                                                </td>
                                                                <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-800">
                                                                    ₹{formatAmount(rate.cgst)}
                                                                </td>
                                                            </>
                                                        )}

                                                        {totals.cess > 0 && (
                                                            <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-800">
                                                                ₹{formatAmount(rate.cess)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={isInterState ? 4 : 5}
                                                        className="py-4 text-center italic text-gray-400"
                                                    >
                                                        No taxable line items
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>

                                        <tfoot>
                                            <tr className="border-t-2 border-dashed border-gray-300 font-mono font-bold text-gray-900">
                                                <td className="px-2 pt-3 font-sans text-xs uppercase tracking-wider">
                                                    Total
                                                </td>

                                                <td className="px-2 pt-3 text-right">
                                                    ₹{formatAmount(totals.taxable)}
                                                </td>

                                                {isInterState ? (
                                                    <td className="px-2 pt-3 text-right text-[#084E92]">
                                                        ₹{formatAmount(totals.igst)}
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-2 pt-3 text-right text-[#084E92]">
                                                            ₹{formatAmount(totals.sgst)}
                                                        </td>
                                                        <td className="px-2 pt-3 text-right text-[#084E92]">
                                                            ₹{formatAmount(totals.cgst)}
                                                        </td>
                                                    </>
                                                )}

                                                {totals.cess > 0 && (
                                                    <td className="px-2 pt-3 text-right text-[#084E92]">
                                                        ₹{formatAmount(totals.cess)}
                                                    </td>
                                                )}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-5">
                                <div className="min-w-0 space-y-1.5 text-xs">
                                    <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                        <span className="text-gray-500">
                                            Total Amount:
                                        </span>
                                        <span className="shrink-0 font-mono font-semibold text-gray-800">
                                            ₹{formatAmount(totals.subtotal)}
                                        </span>
                                    </div>

                                    {totals.discountAmount > 0 && (
                                        <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                            <span className="text-gray-500">
                                                Discount (
                                                {Number(
                                                    totals.discountPercentage
                                                ).toFixed(2)}
                                                %):
                                            </span>
                                            <span className="shrink-0 font-mono font-semibold text-red-600">
                                                -₹{formatAmount(totals.discountAmount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                        <span className="text-gray-500">
                                            Taxable Amount:
                                        </span>
                                        <span className="shrink-0 font-mono font-semibold text-gray-800">
                                            ₹{formatAmount(totals.taxable)}
                                        </span>
                                    </div>

                                    <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                        <span className="text-gray-500">
                                            Total Tax:
                                        </span>
                                        <span className="shrink-0 font-mono font-semibold text-gray-800">
                                            ₹{formatAmount(totals.totalTax)}
                                        </span>
                                    </div>

                                    {totals.otherCosts > 0 && (
                                        <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                            <span
                                                className="min-w-0 max-w-55 truncate text-gray-500"
                                                title={otherCostLabels.join(', ')}
                                            >
                                                Other Costs ({otherCostLabels.join(', ')}):
                                            </span>
                                            <span className="shrink-0 whitespace-nowrap font-mono font-semibold text-gray-800">
                                                +{formatAmount(totals.otherCosts)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex min-w-0 justify-between gap-3 border-b border-gray-100 py-1">
                                        <span className="text-gray-500">
                                            Round Off:
                                        </span>
                                        <span className="shrink-0 font-mono font-semibold text-gray-600">
                                            {totals.roundOff >= 0
                                                ? `+₹${formatAmount(
                                                    Math.abs(totals.roundOff)
                                                )}`
                                                : `-₹${formatAmount(
                                                    Math.abs(totals.roundOff)
                                                )}`}
                                        </span>
                                    </div>

                                    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-gray-200 py-2">
                                        <span className="text-sm font-bold uppercase tracking-wide text-gray-800">
                                            Net Total:
                                        </span>
                                        <span className="shrink-0 font-mono text-xl font-bold text-[#084E92]">
                                            ₹{formatAmount(totals.netAmount)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 min-w-0 rounded-lg border-t border-dashed border-gray-200 bg-blue-50/50 p-2.5">
                                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Amount in Words
                                    </p>
                                    <p className="break-words text-xs font-semibold italic text-[#084E92]">
                                        {invoice.amountInWords ||
                                            numberToWords(totals.netAmount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <div className="flex justify-end py-5">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                </div>
            </div>
        </Container>
    );
};

export default PurchaseInvoiceDetailsModal;
