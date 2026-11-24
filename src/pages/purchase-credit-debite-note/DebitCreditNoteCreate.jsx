import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Receipt,
    Trash2,
    Save,
    Loader2,
    CheckCircle2,
    Pencil,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { toast } from 'sonner';
import { formatCurrency, numberToWords } from '@/pages/purchase-order-requests/utils/taxUtils';
import {
    getDebitCreditNoteById,
    createDebitCreditNote,
    updateDebitCreditNote,
    approveDebitCreditNote,
    cancelDebitCreditNote,
    getAllActiveVendors,
    getOrganizationByType,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const todayISO = () => new Date().toISOString().split('T')[0];

const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
        return dateStr.replace(/-/g, '/');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const parseDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    const slashMatch = String(dateStr).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (slashMatch) {
        const [, d, m, y] = slashMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DebitCreditNoteCreate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { canView } = usePagePermissions([
        'Purchase Invoice List',
        'Generate Purchase Invoice',
        'Debit Credit Note',
    ]);

    const [loading, setLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Vendor & Unit metadata for state-based tax resolution
    const [vendors, setVendors] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [outletsLoading, setOutletsLoading] = useState(false);

    // Form Headers - Fixed Values
    const [noteCode, setNoteCode] = useState('');
    const [noteDate, setNoteDate] = useState(todayISO());
    const noteType = 'DEBIT_NOTE';
    const adjustmentNature = 'RATE_DIFFERENCE';
    const [vendorNoteNumber, setVendorNoteNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    // Reference Document Metadata
    const [refDocInfo, setRefDocInfo] = useState({
        referenceType: 'PURCHASE_INVOICE',
        invoiceCode: '',
        vendorInvoiceNumber: '',
        vendorName: '',
        vendorId: null,
        vendorGstNumber: '',
        organizationName: '',
        organizationId: null,
        invoiceTotalAmount: 0,
        netPayableAmount: 0,
        purchaseInvoiceId: null,
        grnId: null,
        purchaseOrderId: null,
    });

    // Table rows
    const [rows, setRows] = useState([]);
    const [openRemarksMap, setOpenRemarksMap] = useState({});

    const toggleItemRemarks = (rowKey) => {
        setOpenRemarksMap((prev) => ({
            ...prev,
            [rowKey]: !prev[rowKey],
        }));
    };

    // Cancellation Modal States
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState('');

    const openCancelModal = () => {
        setCancelReason('');
        setCancelError('');
        setCancelModalOpen(true);
    };

    const closeCancelModal = () => {
        if (isSubmitting) return;
        setCancelModalOpen(false);
        setCancelReason('');
        setCancelError('');
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            setCancelError('Please provide a valid cancellation reason.');
            return;
        }

        setIsSubmitting(true);
        setCancelError('');
        try {
            const userId = Number(getUserIdFromToken()) || 1;
            await cancelDebitCreditNote(id, userId, cancelReason.trim());
            setCancelModalOpen(false);
            navigate('/purchase/debit-credit-notes');
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message ||
                err?.response?.data?.msg ||
                'Failed to cancel note'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            const userId = Number(getUserIdFromToken()) || 1;
            await approveDebitCreditNote(id, userId);
            navigate('/purchase/debit-credit-notes');
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message ||
                err?.response?.data?.msg ||
                'Failed to approve note'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch Outlets & Vendors for State IDs
    useEffect(() => {
        const fetchOrgData = async () => {
            setOutletsLoading(true);
            setVendorsLoading(true);
            try {
                const [outletRes, vendorRes] = await Promise.all([
                    getOrganizationByType('OUTLET'),
                    getAllActiveVendors(),
                ]);

                const rawOutlets = outletRes?.data?.data || outletRes?.data?.content || outletRes?.data || [];
                setOutlets(Array.isArray(rawOutlets) ? rawOutlets.map(o => ({
                    id: o.id,
                    name: o.companyNameEnglish || o.name || `Unit #${o.id}`,
                    stateId: o.stateId ?? o.state?.id,
                })) : []);

                const rawVendors = vendorRes?.data?.data || vendorRes?.data || [];
                setVendors(Array.isArray(rawVendors) ? rawVendors.map(v => ({
                    ...v,
                    stateId: v.stateId ?? v.state?.id,
                })) : []);
            } catch (err) {
                console.error('Failed to load org/vendor scope:', err);
            } finally {
                setOutletsLoading(false);
                setVendorsLoading(false);
            }
        };

        fetchOrgData();
    }, []);

    // 1. EDIT MODE: Load existing draft note
    useEffect(() => {
        if (!isEditMode) return;

        const loadNote = async () => {
            try {
                setLoading(true);
                const res = await getDebitCreditNoteById(id);
                const data = res?.data?.data || res?.data || {};

                if (data.status && String(data.status).toUpperCase() !== 'DRAFT') {
                    toast.error('Only DRAFT notes can be modified.');
                    navigate(`/purchase/debit-credit-notes/details/${id}`);
                    return;
                }

                setNoteCode(data.noteCode || '');
                setVendorNoteNumber(data.vendorNoteNumber || '');
                setRemarks(data.remarks || '');
                setNoteDate(parseDateToYYYYMMDD(data.noteDate) || todayISO());

                const computedOriginalInvoiceTotal = (data.details || []).reduce((acc, curr) => {
                    const itemBase = Number(curr.originalQuantity || 0) * Number(curr.originalRate || 0);
                    const itemGstPct = Number(curr.igstRate || (Number(curr.cgstRate || 0) + Number(curr.sgstRate || 0)) || 0);
                    const itemCessPct = Number(curr.cessRate || 0);
                    const tax = (itemBase * (itemGstPct + itemCessPct)) / 100;
                    return acc + itemBase + tax;
                }, 0);

                const refCode = data.purchaseInvoiceCode || data.invoiceCode || data.grnCode || data.purchaseOrderCode || (data.purchaseInvoiceId ? `INV-${data.purchaseInvoiceId}` : '—');

                setRefDocInfo({
                    referenceType: data.referenceType || 'PURCHASE_INVOICE',
                    invoiceCode: refCode,
                    vendorInvoiceNumber: data.vendorInvoiceNumber || data.vendorBillNumber || '—',
                    vendorName: data.vendorName || `Vendor #${data.vendorId}`,
                    vendorId: data.vendorId,
                    vendorGstNumber: data.vendorGstNumber || '',
                    organizationName: data.organizationName || `Unit #${data.organizationId}`,
                    organizationId: data.organizationId,
                    invoiceTotalAmount: Number(data.invoiceTotalAmount || data.originalInvoiceTotal || computedOriginalInvoiceTotal || data.totalAmount || 0),
                    netPayableAmount: Number(data.netPayableAmount || data.originalNetPayable || computedOriginalInvoiceTotal || data.totalAmount || 0),
                    purchaseInvoiceId: data.purchaseInvoiceId || null,
                    grnId: data.grnId || null,
                    purchaseOrderId: data.purchaseOrderId || null,
                });

                const loadedRows = (data.details || []).map((d, index) => {
                    const origQty = Number(d.originalQuantity || 0);
                    const adjQty = Number(d.adjustedQuantity || 0);
                    const effectiveQty = adjQty === 0 ? origQty : adjQty;

                    return {
                        key: `${d.purchaseInvoiceDetailId || d.id || 'row'}-${index}`,
                        id: d.id,
                        purchaseInvoiceDetailId: d.purchaseInvoiceDetailId,
                        grnDetailId: d.grnDetailId,
                        purchaseOrderDetailId: d.purchaseOrderDetailId,
                        rawMaterialId: d.rawMaterialId,
                        itemName: d.rawMaterialName || `Material #${d.rawMaterialId}`,
                        unitId: d.unitId,
                        unitName: d.unitName || 'Units',
                        batchNo: d.batchNo || null,
                        invoicedQty: origQty,
                        returnableQty: Number(d.returnableQuantity ?? origQty),
                        qty: effectiveQty,
                        invoicedRate: Number(d.originalRate || 0),
                        revisedRate: Number(d.revisedRate !== undefined ? d.revisedRate : d.originalRate || 0),
                        cgstRate: Number(d.cgstRate || 0),
                        sgstRate: Number(d.sgstRate || 0),
                        igstRate: Number(d.igstRate || 0),
                        cessRate: Number(d.cessRate || 0),
                        remarks: d.remarks || '',
                    };
                });

                setRows(loadedRows);
            } catch (err) {
                console.error('Failed to load note details:', err);
                toast.error(err?.response?.data?.msg || 'Failed to load note details');
                navigate('/purchase/debit-credit-notes');
            } finally {
                setLoading(false);
            }
        };

        loadNote();
    }, [id, isEditMode, navigate]);

    // 2. CREATE MODE: Load from navigation route state
    useEffect(() => {
        if (isEditMode) return;

        const selectedInvoice = location.state?.selectedInvoice;
        if (!selectedInvoice) return;

        setRefDocInfo({
            referenceType: 'PURCHASE_INVOICE',
            invoiceCode: selectedInvoice.invoiceCode || '—',
            vendorInvoiceNumber: selectedInvoice.vendorInvoiceNumber || '—',
            vendorName: selectedInvoice.vendorName || `Vendor #${selectedInvoice.vendorId}`,
            vendorId: selectedInvoice.vendorId,
            vendorGstNumber: selectedInvoice.vendorGstNumber || '',
            organizationName: selectedInvoice.organizationName || `Unit #${selectedInvoice.organizationId}`,
            organizationId: selectedInvoice.organizationId,
            invoiceTotalAmount: Number(selectedInvoice.invoiceTotalAmount || selectedInvoice.netPayableAmount || 0),
            netPayableAmount: Number(selectedInvoice.netPayableAmount || selectedInvoice.invoiceTotalAmount || 0),
            purchaseInvoiceId: selectedInvoice.purchaseInvoiceId,
            grnId: null,
            purchaseOrderId: null,
        });

        const initialRows = (selectedInvoice.details || []).map((d, index) => {
            const retQty = Number(d.returnableQuantity !== undefined ? d.returnableQuantity : d.invoicedQuantity);
            const invoicedUnitPrice = Number(d.invoicedUnitPrice || 0);
            const origQty = Number(d.invoicedQuantity || 0);

            return {
                key: `${d.purchaseInvoiceDetailId || 'row'}-${index}`,
                purchaseInvoiceDetailId: d.purchaseInvoiceDetailId,
                grnDetailId: d.grnDetailId,
                purchaseOrderDetailId: d.purchaseOrderDetailId,
                rawMaterialId: d.rawMaterialId,
                itemName: d.rawMaterialName || `Item #${d.rawMaterialId}`,
                unitId: d.unitId,
                unitName: d.unitName || 'Units',
                batchNo: d.batchNo || null,
                invoicedQty: origQty,
                returnableQty: retQty,
                qty: origQty,
                invoicedRate: invoicedUnitPrice,
                revisedRate: invoicedUnitPrice,
                cgstRate: Number(d.cgstRate || 0),
                sgstRate: Number(d.sgstRate || 0),
                igstRate: Number(d.igstRate || 0),
                cessRate: Number(d.cessRate || 0),
                remarks: '',
            };
        });

        setRows(initialRows);
    }, [isEditMode, location.state]);

    // Interstate Supply Detection
    const vendorStateId = useMemo(() => {
        return vendors.find(v => Number(v.id) === Number(refDocInfo.vendorId))?.stateId;
    }, [vendors, refDocInfo.vendorId]);

    const outletStateId = useMemo(() => {
        return outlets.find(o => Number(o.id) === Number(refDocInfo.organizationId))?.stateId;
    }, [outlets, refDocInfo.organizationId]);

    const isInterState = useMemo(() => {
        if (vendorStateId != null && outletStateId != null) {
            return Number(vendorStateId) !== Number(outletStateId);
        }
        return rows.some(r => Number(r.igstRate) > 0);
    }, [vendorStateId, outletStateId, rows]);

    const updateRow = (key, field, value) => {
        setRows(prev =>
            prev.map(r => {
                if (r.key !== key) return r;
                let val = value;
                if (field === 'revisedRate') {
                    val = Number(value) < 0 ? 0 : value;
                }
                return { ...r, [field]: val };
            })
        );
    };

    const removeRow = key => {
        setRows(prev => prev.filter(r => r.key !== key));
    };

    // Row Calculation strictly for RATE DIFFERENCE (Debit Note: invoicedRate - revisedRate)
    const rowCalculation = (r) => {
        const invoicedQty = Number(r.invoicedQty) || 0;
        const adjustedQty = Number(r.qty) || invoicedQty;
        const invoicedRate = Number(r.invoicedRate) || 0;
        const revisedRate = Number(r.revisedRate) || 0;

        const unitRateDiff = revisedRate - invoicedRate;
        const absRateDiff = Math.abs(unitRateDiff);
        const taxableAmount = absRateDiff * adjustedQty;

        const cessPct = Number(r.cessRate) || 0;
        const cessAmt = (taxableAmount * cessPct) / 100;

        let gstPct = 0;
        let cgstPct = 0;
        let sgstPct = 0;
        let igstPct = 0;
        let cgstAmt = 0;
        let sgstAmt = 0;
        let igstAmt = 0;
        let gstAmt = 0;

        if (isInterState) {
            igstPct = Number(r.igstRate) || (Number(r.cgstRate) || 0) + (Number(r.sgstRate) || 0);
            igstAmt = (taxableAmount * igstPct) / 100;
            gstAmt = igstAmt;
            gstPct = igstPct;
        } else {
            cgstPct = Number(r.cgstRate) || (Number(r.igstRate) ? Number(r.igstRate) / 2 : 0);
            sgstPct = Number(r.sgstRate) || (Number(r.igstRate) ? Number(r.igstRate) / 2 : 0);
            cgstAmt = (taxableAmount * cgstPct) / 100;
            sgstAmt = (taxableAmount * sgstPct) / 100;
            gstAmt = cgstAmt + sgstAmt;
            gstPct = cgstPct + sgstPct;
        }

        const totalTax = gstAmt + cessAmt;
        const lineTotal = taxableAmount + totalTax;

        return {
            unitRateDiff,
            absRateDiff,
            taxableAmount,
            gstPct,
            cgstPct,
            sgstPct,
            igstPct,
            cgstAmt,
            sgstAmt,
            igstAmt,
            gstAmt,
            cessPct,
            cessAmt,
            totalTax,
            lineTotal,
        };
    };

    // Summary Totals
    const totals = useMemo(() => {
        let totalTaxableAdjustment = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        let totalCESS = 0;
        let netAdjustment = 0;

        rows.forEach(row => {
            const calc = rowCalculation(row);
            totalTaxableAdjustment += calc.taxableAmount;
            totalCESS += calc.cessAmt;

            if (isInterState) {
                totalIGST += calc.igstAmt;
            } else {
                totalCGST += calc.cgstAmt;
                totalSGST += calc.sgstAmt;
            }

            netAdjustment += calc.lineTotal;
        });

        const totalGST = isInterState ? totalIGST : totalCGST + totalSGST;
        const totalTax = totalGST + totalCESS;
        const rawAdjustmentNet = totalTaxableAdjustment + totalTax;
        const roundedAdjustmentNet = Math.round(rawAdjustmentNet);
        const roundOff = Number((roundedAdjustmentNet - rawAdjustmentNet).toFixed(2));
        const netAdjustmentAmount = roundedAdjustmentNet;

        const originalInvoiceTotal = Number(refDocInfo.invoiceTotalAmount) || 0;
        const revisedPayable = Math.max(0, Math.round(originalInvoiceTotal - netAdjustmentAmount));

        return {
            originalInvoiceTotal,
            taxable: totalTaxableAdjustment,
            totalCGST,
            totalSGST,
            totalIGST,
            totalGST,
            totalCESS,
            totalTax,
            roundOff,
            netAmount: netAdjustmentAmount,
            revisedPayable,
        };
    }, [rows, isInterState, refDocInfo.invoiceTotalAmount]);

    // Check if any GST/Tax applies across items or totals in Edit Mode
    const hasAnyGst = useMemo(() => {
        if (!isEditMode) return true;

        const hasItemGst = rows.some((r) => {
            const gst = Number(r.igstRate || 0) + Number(r.cgstRate || 0) + Number(r.sgstRate || 0);
            return gst > 0;
        });

        return hasItemGst || (totals.totalGST > 0) || (totals.totalTax > 0);
    }, [isEditMode, rows, totals.totalGST, totals.totalTax]);

    const hasAnyCess = useMemo(() => {
        return rows.some(r => Number(r.cessRate) > 0);
    }, [rows]);

    // Tax Breakdown Groups
    const taxBreakdown = useMemo(() => {
        const taxRateGroups = {};

        rows.forEach(row => {
            const calc = rowCalculation(row);
            const rateKey = `${calc.gstPct}_${calc.cessPct}`;

            if (!taxRateGroups[rateKey]) {
                taxRateGroups[rateKey] = {
                    rate: calc.gstPct,
                    gstPct: calc.gstPct,
                    cessPct: calc.cessPct,
                    cgstPct: calc.cgstPct,
                    sgstPct: calc.sgstPct,
                    igstPct: calc.igstPct,
                    taxable: 0,
                    cgstAmt: 0,
                    sgstAmt: 0,
                    igstAmt: 0,
                    gstAmt: 0,
                    cessAmt: 0,
                };
            }

            taxRateGroups[rateKey].taxable += calc.taxableAmount;
            taxRateGroups[rateKey].cgstAmt += calc.cgstAmt;
            taxRateGroups[rateKey].sgstAmt += calc.sgstAmt;
            taxRateGroups[rateKey].igstAmt += calc.igstAmt;
            taxRateGroups[rateKey].gstAmt += calc.gstAmt;
            taxRateGroups[rateKey].cessAmt += calc.cessAmt;
        });

        return Object.values(taxRateGroups).sort((a, b) => b.gstPct - a.gstPct || b.cessPct - a.cessPct);
    }, [rows, isInterState]);

    const taxGridClass = isInterState
        ? totals.totalCESS > 0
            ? 'grid-cols-[r1.1f_1fr_1fr_24px_1.4fr]'
            : 'grid-cols-[1.1fr_1fr_1fr]'
        : totals.totalCESS > 0
            ? 'grid-cols-[1.1fr_1fr_1fr_24px_1fr_24px_1.5fr]'
            : 'grid-cols-[1.1fr_1fr_1fr_24px_1fr]';

    // Form Submission
    const handleSubmit = async (approve = false) => {
        if (!rows.length) {
            toast.error('Please add at least one item');
            return;
        }

        // Validation: In a Debit Note for Rate Difference, revisedRate must be less than invoicedRate
        for (const r of rows) {
            const invRate = Number(r.invoicedRate) || 0;
            const revRate = Number(r.revisedRate) || 0;

            if (revRate === invRate) {
                toast.error(`Please adjust the revised rate for "${r.itemName}"`);
                return;
            }

            if (revRate > invRate) {
                toast.error(`Revised rate for "${r.itemName}" cannot exceed invoiced rate in a Debit Note`);
                return;
            }
        }

        if (!refDocInfo.vendorId) {
            toast.error('Vendor information is missing');
            return;
        }

        if (!refDocInfo.organizationId) {
            toast.error('Unit information is missing');
            return;
        }

        setIsSubmitting(true);

        try {
            const details = rows.map(r => {
                const calc = rowCalculation(r);

                return {
                    id: r.id || undefined,
                    purchaseInvoiceDetailId: r.purchaseInvoiceDetailId || null,
                    grnDetailId: r.grnDetailId || null,
                    purchaseOrderDetailId: r.purchaseOrderDetailId || null,
                    rawMaterialId: r.rawMaterialId,
                    unitId: Number(r.unitId) || 0,
                    batchNo: r.batchNo || null,
                    originalQuantity: Number(r.invoicedQty) || 0,
                    adjustedQuantity: Number(r.qty) || Number(r.invoicedQty) || 0,
                    originalRate: Number(r.invoicedRate) || 0,
                    revisedRate: Number(r.revisedRate) || 0,
                    rateDifference: Number(calc.absRateDiff.toFixed(2)),
                    taxableAmount: Number(calc.taxableAmount.toFixed(2)),
                    cgstRate: Number(calc.cgstPct || 0),
                    sgstRate: Number(calc.sgstPct || 0),
                    igstRate: Number(calc.igstPct || 0),
                    cessRate: Number(calc.cessPct || 0),
                    remarks: r.remarks || '',
                };
            });

            const payload = {
                noteType,
                adjustmentNature,
                referenceType: refDocInfo.referenceType || (refDocInfo.purchaseInvoiceId ? 'PURCHASE_INVOICE' : 'GRN'),
                purchaseInvoiceId: refDocInfo.purchaseInvoiceId || undefined,
                grnId: refDocInfo.grnId || undefined,
                purchaseOrderId: refDocInfo.purchaseOrderId || undefined,
                vendorId: Number(refDocInfo.vendorId),
                organizationId: Number(refDocInfo.organizationId),
                userId: Number(getUserIdFromToken()) || 1,
                vendorNoteNumber: vendorNoteNumber.trim() || undefined,
                remarks: remarks.trim() || undefined,
                autoApprove: approve,
                noteDate: formatDateToDDMMYYYY(noteDate),
                details,
            };

            if (isEditMode) {
                await updateDebitCreditNote(id, payload);
                if (approve) {
                    await approveDebitCreditNote(id, Number(getUserIdFromToken()) || 1);
                }
            } else {
                await createDebitCreditNote(payload);
            }
            navigate('/purchase/debit-credit-notes');
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || err?.response?.data?.msg || 'Failed to save note');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!canView) {
        return <AccessDenied pageTitle={isEditMode ? 'Edit Debit Note' : 'Generate Debit Note'} />;
    }

    if (loading) {
        return (
            <Container>
                <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500">
                    <Loader2 size={18} className="animate-spin text-[#084E92]" />
                    Loading note details...
                </div>
            </Container>
        );
    }

    if (!isEditMode && !location.state?.selectedInvoice) {
        return (
            <Container>
                <div className="py-10 text-center">
                    <p className="text-gray-500 mb-4">No eligible purchase invoice selected.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/purchase/debit-credit-notes/create-selection')}
                        className="inline-flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white text-sm"
                    >
                        <ArrowLeft size={16} />
                        Back to Invoices
                    </button>
                </div>
            </Container>
        );
    }

    const vendorDisplayName = refDocInfo.vendorName;

    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-4 w-full max-w-full overflow-x-hidden">
                <PageHeader
                    title={isEditMode ? 'Edit Debit Note' : 'Generate Debit Note'}
                    description={
                        isEditMode
                            ? 'Update draft debit note rate differences against the original invoice'
                            : 'Create a debit note rate difference adjustment against the selected invoice'
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate('/purchase/debit-credit-notes')}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0 whitespace-nowrap"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Notes
                        </button>
                    }
                    className="mb-2"
                />

                {/* Top Header Card: Form Inputs & Document Metadata */}
                <div className="w-full bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Debit Note No.</label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-[#084E92] truncate">
                                {isEditMode ? (noteCode || `DN-${id}`) : 'Auto Generated'}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                                Note Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={noteDate}
                                disabled={isEditMode}
                                onChange={e => setNoteDate(e.target.value)}
                                className={`w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none ${isEditMode
                                        ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                                        : 'bg-white focus:border-[#084E92]'
                                    }`}
                            />
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Invoice Code</label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 truncate">
                                {refDocInfo.invoiceCode || '—'}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Vendor Invoice No.</label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate font-mono">
                                {refDocInfo.vendorInvoiceNumber || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-gray-100">
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Vendor</label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 truncate" title={vendorDisplayName}>
                                {vendorsLoading ? 'Loading...' : vendorDisplayName}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Unit</label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate">
                                {outletsLoading ? 'Loading...' : refDocInfo.organizationName}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                                Reason / Nature <span className="text-red-500">*</span>
                            </label>
                            <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 select-none">
                                Rate Difference
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Vendor Note Ref No.</label>
                            <input
                                value={vendorNoteNumber}
                                onChange={e => setVendorNoteNumber(e.target.value)}
                                placeholder="e.g. DN-ACK-2026-001"
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92] bg-white"
                            />
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">General Remarks </label>
                        <input
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            placeholder="Reason for adjustment / notes..."
                            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92] bg-white"
                        />
                    </div>
                </div>

                {/* Adjusted Items Table */}
                <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="px-5 py-3.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="font-semibold text-gray-900 text-sm">Adjusted Line Items</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Change the revised rate. Lowering the rate reduces payable amounts via Debit Note.
                            </p>
                        </div>
                        <span className="self-start sm:self-auto text-xs font-semibold text-[#084E92] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            {rows.length} {rows.length === 1 ? 'Item' : 'Items'}
                        </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#F8FAFC] border-b border-gray-200 uppercase text-[11px] text-gray-500 font-semibold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 min-w-35">Item Description</th>
                                    <th className="px-2 py-3 text-center w-24">Unit</th>
                                    <th className="px-3 py-3 text-right w-20">Invoiced Qty</th>
                                    <th className="px-3 py-3 text-right w-24">Inv Rate</th>
                                    <th className="px-3 py-3 text-right w-28 bg-blue-50/40 text-[#084E92]">
                                        Revised Rate *
                                    </th>
                                    <th className="px-3 py-3 text-right w-28">Rate Diff</th>
                                    {hasAnyGst && <th className="px-2 py-3 text-right w-20">GST</th>}
                                    {hasAnyCess && <th className="px-2 py-3 text-right w-16">CESS</th>}
                                    <th className="px-3 py-3 text-right w-28">Taxable</th>
                                    {hasAnyGst && <th className="px-3 py-3 text-right w-24">Tax</th>}
                                    <th className="px-3 py-3 text-right w-28 font-bold text-gray-800">Total Adj</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {rows.map((row) => {
                                    const calc = rowCalculation(row);
                                    const isRemarksOpen = Boolean(openRemarksMap[row.key]);

                                    return (
                                        <tr key={row.key} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-4 py-3 font-medium text-[#084E92]" title={row.itemName}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate">{row.itemName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleItemRemarks(row.key)}
                                                        title={isRemarksOpen ? 'Close remarks' : 'Add/Edit remarks'}
                                                        className={`p-0.5 rounded hover:bg-blue-50 transition cursor-pointer shrink-0 ${row.remarks ? 'text-[#084E92]' : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>

                                                {isRemarksOpen ? (
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={row.remarks || ''}
                                                            onChange={(e) => updateRow(row.key, 'remarks', e.target.value)}
                                                            placeholder="Remarks..."
                                                            className="w-full max-w-37.5 h-6 border border-[#CBD5E1] rounded px-1.5 text-[10px] text-[#1E293B] outline-none focus:border-[#084E92] bg-white"
                                                        />
                                                    </div>
                                                ) : row.remarks ? (
                                                    <p
                                                        onClick={() => toggleItemRemarks(row.key)}
                                                        title="Click to edit remarks"
                                                        className="text-[10px] text-gray-500 italic truncate max-w-37.5 cursor-pointer hover:text-gray-700 mt-0.5"
                                                    >
                                                        {row.remarks}
                                                    </p>
                                                ) : null}
                                            </td>

                                            <td className="px-2 py-3 text-center text-gray-600">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                                    {row.unitName || '—'}
                                                </span>
                                            </td>

                                            <td className="px-3 py-3 text-right font-mono font-medium text-gray-700">
                                                {row.invoicedQty}
                                            </td>

                                            <td className="px-3 py-3 text-right font-mono text-gray-700">
                                                ₹{Number(row.invoicedRate || 0).toFixed(2)}
                                            </td>

                                            <td className="px-3 py-3 text-right bg-blue-50/20">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={row.invoicedRate}
                                                    value={row.revisedRate}
                                                    onChange={(e) => updateRow(row.key, 'revisedRate', e.target.value)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className="w-24 h-8 px-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-right outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]"
                                                />
                                            </td>

                                            <td className="px-3 py-3 text-right font-mono font-semibold">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${calc.unitRateDiff < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-gray-500'}`}>
                                                    {calc.unitRateDiff !== 0 ? `-₹${Math.abs(calc.unitRateDiff).toFixed(2)}` : '₹0.00'}
                                                </span>
                                            </td>

                                            {hasAnyGst && (
                                                <td className="px-2 py-3 text-right font-mono text-gray-600">
                                                    {calc.gstPct}%
                                                </td>
                                            )}

                                            {hasAnyCess && (
                                                <td className="px-2 py-3 text-right font-mono text-gray-600">
                                                    {calc.cessPct > 0 ? `${calc.cessPct}%` : '—'}
                                                </td>
                                            )}

                                            <td className="px-3 py-3 text-right font-medium text-gray-800 font-mono">
                                                {formatCurrency(calc.taxableAmount)}
                                            </td>

                                            {hasAnyGst && (
                                                <td className="px-3 py-3 text-right font-medium text-orange-600 font-mono">
                                                    {formatCurrency(calc.totalTax)}
                                                </td>
                                            )}

                                            <td className="px-3 py-3 text-right font-bold font-mono text-rose-700">
                                                -{formatCurrency(calc.lineTotal)}
                                            </td>

                                           
                                        </tr>
                                    );
                                })}

                                {!rows.length && (
                                    <tr>
                                        <td colSpan={hasAnyGst ? 12 : 10} className="px-4 py-12 text-center text-gray-400">
                                            No items available for adjustment.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Lower Grid: Tax Distribution & Summary */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                    {/* Tax Breakdown Panel (Hidden if no GST) */}
                    {hasAnyGst && (
                        <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <Receipt size={18} className="text-[#084E92]" />
                                    <h3 className="text-sm font-semibold text-[#084E92] uppercase">Tax Distribution</h3>
                                </div>
                                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-blue-50 text-[#084E92] text-xs font-medium border border-blue-100">
                                    {isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
                                </span>
                            </div>

                            <div className="w-full mt-3 overflow-x-auto">
                                <div className={`grid ${taxGridClass} items-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 min-w-max`}>
                                    <div>Tax Rate</div>
                                    <div className="text-right">Taxable Amt</div>

                                    {!isInterState ? (
                                        <>
                                            <div className="text-right">SGST</div>
                                            <div></div>
                                            <div className="text-right">CGST</div>
                                        </>
                                    ) : (
                                        <div className="text-right">IGST</div>
                                    )}

                                    {totals.totalCESS > 0 && (
                                        <>
                                            <div></div>
                                            <div className="text-right">CESS</div>
                                        </>
                                    )}
                                </div>

                                {taxBreakdown.length ? (
                                    taxBreakdown.map((rate, idx) => (
                                        <div
                                            key={`${rate.gstPct}_${rate.cessPct}_${idx}`}
                                            className={`grid ${taxGridClass} items-center px-2 py-2.5 border-b border-gray-100 min-w-max text-xs`}
                                        >
                                            <div>
                                                <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-[#084E92] font-semibold text-xs border border-blue-100">
                                                    {Number(rate.gstPct).toFixed(2)}% GST
                                                </span>
                                            </div>

                                            <div className="py-2 px-2 text-right font-mono font-semibold text-gray-800">
                                                ₹{Number(rate.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>

                                            {!isInterState ? (
                                                <>
                                                    <div className="py-2 text-right font-mono font-semibold text-gray-800">
                                                        ₹{Number(rate.sgstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="py-2 w-6 text-center text-gray-400 font-bold">+</div>
                                                    <div className="py-2 text-right font-mono font-semibold text-gray-800">
                                                        ₹{Number(rate.cgstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-2 text-right font-mono font-semibold text-gray-800">
                                                    ₹{Number(rate.igstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            )}

                                            {totals.totalCESS > 0 && (
                                                <>
                                                    <div className="py-2 w-6 px-2 text-center text-gray-400 font-bold">+</div>
                                                    <div className="py-2 text-right font-mono font-semibold text-gray-800">
                                                        ₹{Number(rate.cessAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center text-xs text-gray-400">No tax applicable</div>
                                )}

                                <div className={`grid ${taxGridClass} px-2 pt-3 text-xs font-bold border-t-2 border-dashed border-gray-300 min-w-max text-gray-900`}>
                                    <div>TOTAL TAX</div>
                                    <div className="text-right font-mono">{formatCurrency(totals.taxable)}</div>

                                    {!isInterState ? (
                                        <>
                                            <div className="text-right font-mono">{formatCurrency(totals.totalSGST)}</div>
                                            <div></div>
                                            <div className="text-right font-mono">{formatCurrency(totals.totalCGST)}</div>
                                        </>
                                    ) : (
                                        <div className="text-right font-mono text-[#084E92]">{formatCurrency(totals.totalIGST)}</div>
                                    )}

                                    {totals.totalCESS > 0 && (
                                        <>
                                            <div></div>
                                            <div className="text-right font-mono text-[#084E92]">{formatCurrency(totals.totalCESS)}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Card (Occupies the right half when tax breakdown is hidden) */}
                    <div className={`${hasAnyGst ? 'xl:col-span-5' : 'xl:col-start-7 xl:col-span-6'} bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs`}>
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-4">
                            <Receipt size={18} className="text-[#084E92]" />
                            <h3 className="text-sm font-semibold text-[#084E92] uppercase">Adjustment & Net Bill Summary</h3>
                        </div>

                        <div className="space-y-3 text-xs font-medium">
                            <div className="flex justify-between gap-4 text-gray-600">
                                <span>Original Invoice Amount:</span>
                                <span className="font-semibold text-gray-900 font-mono">{formatCurrency(totals.originalInvoiceTotal)}</span>
                            </div>

                            <div className="flex justify-between gap-4 text-gray-600">
                                <span>Total Taxable Adjustment:</span>
                                <span className="font-semibold text-gray-900 font-mono">{formatCurrency(totals.taxable)}</span>
                            </div>

                            {hasAnyGst && (
                                <div className="flex justify-between gap-4 text-gray-600">
                                    <span>Total Tax ({isInterState ? 'IGST' : 'CGST + SGST'}):</span>
                                    <span className="font-semibold text-gray-900 font-mono">{formatCurrency(totals.totalTax)}</span>
                                </div>
                            )}

                            <div className="flex justify-between gap-4 text-gray-600">
                                <span>Round Off:</span>
                                <span className="font-semibold text-gray-900 font-mono">
                                    {totals.roundOff >= 0 ? '+' : ''}{formatCurrency(totals.roundOff)}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-800">
                                    Note Total (Debit -):
                                </span>
                                <span className="font-bold text-base font-mono text-rose-600">
                                    -{formatCurrency(totals.netAmount)}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#F0F5FA] border border-blue-100 flex justify-between items-center">
                                <div>
                                    <span className="block font-bold text-xs uppercase text-[#00376C]">Revised Net Payable</span>
                                    <span className="text-[10px] text-gray-500 font-medium">After applying this debit note</span>
                                </div>
                                <span className="font-extrabold text-lg text-[#084E92] font-mono">
                                    {formatCurrency(totals.revisedPayable)}
                                </span>
                            </div>

                            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Note Amount in Words</div>
                                <div className="text-xs italic font-medium text-gray-800 leading-relaxed">
                                    {numberToWords(totals.netAmount)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2 pb-5">
                    {isEditMode ? (
                        <>
                            <button
                                type="button"
                                onClick={openCancelModal}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-red-200 text-xs font-semibold cursor-pointer text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
                                Cancel Note
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting || !rows.length}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#084E92] text-[#084E92] cursor-pointer text-xs font-semibold hover:bg-blue-50 transition disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
                                Update Draft
                            </button>

                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg cursor-pointer bg-[#084E92] text-white text-xs font-semibold hover:bg-[#063d73] transition disabled:opacity-50 shadow-xs"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                Approve Note
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Discard
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting || !rows.length}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#084E92] text-[#084E92] cursor-pointer text-xs font-semibold hover:bg-blue-50 transition disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
                                Save as Draft
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={isSubmitting || !rows.length}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg cursor-pointer bg-[#084E92] text-white text-xs font-semibold hover:bg-[#063d73] transition disabled:opacity-50 shadow-xs"
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={15} />}
                                Save & Approve
                            </button>
                        </>
                    )}
                </div>

                {/* Cancellation Modal */}
                {cancelModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <div
                            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Cancel Debit Note
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Please enter the reason for cancelling this note. This action cannot be undone.
                                </p>
                            </div>

                            <div className="p-5 space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                                        Cancellation Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={cancelReason}
                                        onChange={(e) => {
                                            setCancelReason(e.target.value);
                                            if (cancelError) setCancelError('');
                                        }}
                                        placeholder="e.g., Invoiced under incorrect rates, duplicate entry..."
                                        disabled={isSubmitting}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92] resize-none"
                                        autoFocus
                                    />
                                    {cancelError && (
                                        <p className="text-[11px] text-red-600 font-medium mt-1">
                                            {cancelError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={closeCancelModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50 cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSubmitting || !cancelReason.trim()}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                                    Confirm Cancellation
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default DebitCreditNoteCreate;