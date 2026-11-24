import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Info, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { numberToWords, checkIsInterState, formatCurrency } from '../purchase-order-requests/utils/taxUtils';
import { updatePurchaseInvoice, getRawMaterialById } from '@/services/apiServices';
import { getInvoiceById } from '../../services/apiServices';

const toNumber = (value) => Number(value || 0);

const ApproveInvoice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const incoming = location.state?.invoice;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rawMaterialDetails, setRawMaterialDetails] = useState({});
    const [editingRow, setEditingRow] = useState(null);

    const [header, setHeader] = useState({
        vendorBillNumber: '',
        invoiceDate: '',
        vendorName: '',
        outletName: '',
        selectedGrnCount: 0,
        isIntraState: true,
        vendorId: null,
        organizationId: null,
        discountPercentage: 0,
        discountAmount: 0,
        roundOff: 0,
        remarks: '',
    });

    const [items, setItems] = useState([]);

    const [otherCosts, setOtherCosts] = useState([
        { key: Date.now(), serverId: 0, label: '', cost: 0 }
    ]);

    useEffect(() => {
        if (!id) {
            toast.error('Purchase invoice id is missing.');
            navigate(-1);
            return;
        }

        const loadInvoice = async () => {
            try {
                setLoading(true);

                const res = await getInvoiceById(id);
                const data = res?.data?.data;

                if (!data) {
                    toast.error('Purchase invoice not found.');
                    navigate(-1);
                    return;
                }

                setHeader({
                    vendorBillNumber: data.vendorInvoiceNumber || '',
                    invoiceDate: data.invoiceDate || '',
                    vendorName: incoming?.vendorName || data.vendorName || `Vendor #${data.vendorId}`,
                    outletName: incoming?.outletName || data.organizationName || `Outlet #${data.organizationId}`,
                    selectedGrnCount: data.grnIds?.length || 0,
                    isIntraState: Number(data.igstAmount || 0) === 0,
                    vendorId: data.vendorId,
                    organizationId: data.organizationId,
                    discountPercentage: Number(data.discountPercentage || 0),
                    discountAmount: Number(data.discountAmount || 0),
                    roundOff: Number(data.roundOff || 0),
                    remarks: data.remarks || '',
                });

                setItems(
                    (data.details || []).map((detail) => ({
                        id: detail.id,
                        itemName: detail.rawMaterialName || `Raw Material #${detail.rawMaterialId}`,
                        brand: detail.brandName || '',
                        added: true,
                        unit: detail.unitName || `Unit #${detail.unitId}`,
                        qty: Number(detail.invoiceQuantity) || 0,
                        rate: Number(detail.unitPrice) || 0,
                        hsn: detail.hsnCode || detail.hsn || '',
                        cgst: Number(detail.cgstRate) || 0,
                        sgst: Number(detail.sgstRate) || 0,
                        igst: Number(detail.igstRate) || 0,
                        cess: Number(detail.cessRate) || 0,
                        grnId: detail.grnId,
                        grnDetailId: detail.grnDetailId,
                        purchaseOrderDetailId: detail.purchaseOrderDetailId,
                        purchaseOrderId: detail.purchaseOrderId,
                        rawMaterialId: detail.rawMaterialId,
                        unitId: detail.unitId,
                        remarks: detail.remarks || '',
                    }))
                );

                setOtherCosts(
                    (data.otherCosts && data.otherCosts.length)
                        ? data.otherCosts.map((oc, idx) => ({
                            key: oc.id || `oc-${idx}-${Date.now()}`,
                            serverId: oc.id || 0,
                            label: oc.label || '',
                            cost: Number(oc.cost) || 0,
                        }))
                        : [{ key: Date.now(), serverId: 0, label: '', cost: 0 }]
                );
            } catch (error) {
                console.error('Failed to load purchase invoice:', error);
                toast.error(
                    error?.response?.data?.msg ||
                    error?.response?.data?.message ||
                    'Failed to load purchase invoice.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadInvoice();
    }, [id]);


    useEffect(() => {
        const loadRawMaterials = async () => {
            const ids = [...new Set(items.map((item) => item.rawMaterialId).filter(Boolean))];

            if (!ids.length) return;

            try {
                const results = await Promise.all(
                    ids.map(async (rawMaterialId) => {
                        try {
                            const res = await getRawMaterialById(rawMaterialId);
                            const data = res?.data?.data?.['Raw Material Details']?.[0];
                            return data ? [rawMaterialId, data] : null;
                        } catch (error) {
                            console.error(`Failed to load raw material ${rawMaterialId}:`, error);
                            return null;
                        }
                    })
                );

                const mapped = {};
                results.filter(Boolean).forEach(([rawMaterialId, data]) => {
                    mapped[rawMaterialId] = data;
                });

                setRawMaterialDetails(mapped);
            } catch (error) {
                console.error('Failed to load raw material details:', error);
            }
        };

        if (items.length) loadRawMaterials();
    }, [items]);

    const isInterState = useMemo(() => {
        if (incoming?.billTo && incoming?.shipTo) {
            return checkIsInterState(incoming.billTo, incoming.shipTo);
        }

        if (items.some((item) => toNumber(item.igst) > 0)) {
            return true;
        }

        return !header.isIntraState;
    }, [incoming, header.isIntraState, items]);

    const updateOtherCost = (key, field, value) => {
        setOtherCosts((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
    };

    const addOtherCost = () => {
        setOtherCosts((prev) => [
            ...prev,
            { key: Date.now() + Math.random(), serverId: 0, label: '', cost: 0 }
        ]);
    };

    const removeOtherCost = (key) => {
        setOtherCosts((prev) => prev.filter((item) => item.key !== key));
    };

      const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.rate), 0);
        const discountPercentage = toNumber(header.discountPercentage);
        const discountAmount = subtotal * discountPercentage / 100;
        const taxableAmount = Math.max(0, subtotal - discountAmount);

        const getTaxableLine = (item) => {
            const lineBase = toNumber(item.qty) * toNumber(item.rate);
            const lineDiscount = lineBase * discountPercentage / 100;
            return Math.max(0, lineBase - lineDiscount);
        };

        const cgstAmount = items.reduce((sum, item) => sum + getTaxableLine(item) * toNumber(item.cgst) / 100, 0);
        const sgstAmount = items.reduce((sum, item) => sum + getTaxableLine(item) * toNumber(item.sgst) / 100, 0);
        const igstAmount = items.reduce((sum, item) => sum + getTaxableLine(item) * toNumber(item.igst) / 100, 0);
        const cessAmount = items.reduce((sum, item) => sum + getTaxableLine(item) * toNumber(item.cess) / 100, 0);

        const totalTax = cgstAmount + sgstAmount + igstAmount + cessAmount;
        const roundOff = toNumber(header.roundOff);
        const totalOtherCosts = otherCosts.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
        const totalAmount = taxableAmount + totalTax + roundOff + totalOtherCosts;

        return {
            subtotal,
            discountAmount,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            cessAmount,
            totalTax,
            roundOff,
            totalOtherCosts,
            totalAmount,
        };
    }, [items, header.discountPercentage, header.roundOff, otherCosts]);

    const updateItem = (index, field, value) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const removeItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const buildInvoicePayload = () => {
        const grnIds = [
            ...new Set(
                items
                    .map((item) => item.grnId)
                    .filter((value) => value != null)
            ),
        ];

        const discountPercentage = toNumber(header.discountPercentage);

        const details = items.map((item) => {
            const base = toNumber(item.qty) * toNumber(item.rate);
            const lineDiscountAmount = base * discountPercentage / 100;

            return {
                cessRate: toNumber(item.cess),
                cgstRate: toNumber(item.cgst),
                discountAmount: lineDiscountAmount,
                grnDetailId: item.grnDetailId,
                igstRate: toNumber(item.igst),
                invoiceQuantity: toNumber(item.qty),
                purchaseOrderDetailId: item.purchaseOrderDetailId,
                remarks: item.remarks || '',
                sgstRate: toNumber(item.sgst),
                unitPrice: toNumber(item.rate),
            };
        });

        return {
            details,
            discountAmount: toNumber(header.discountAmount) || totals.discountAmount,
            discountPercentage,
            grnIds,
            invoiceDate: header.invoiceDate,
            organizationId: Number(header.organizationId),
            otherCosts: otherCosts
                .filter((item) => item.label.trim() || Number(item.cost))
                .map((item) => ({
                    id: item.serverId || 0,
                    label: item.label.trim(),
                    cost: Number(item.cost) || 0,
                    moduleName: 'GRN_INVOICE',
                })),
            remarks: header.remarks || '',
            roundOff: totals.roundOff,
            userId: Number(localStorage.getItem('userId')) || 0,
            vendorId: Number(header.vendorId),
            vendorInvoiceNumber: header.vendorBillNumber.trim(),
        };
    };

    const validate = () => {
        if (!header.vendorBillNumber?.trim()) {
            toast.error('Enter the vendor bill number.');
            return false;
        }

        if (!header.invoiceDate) {
            toast.error('Select the invoice date.');
            return false;
        }

        if (!header.vendorId) {
            toast.error('Vendor information is missing.');
            return false;
        }

        if (!header.organizationId) {
            toast.error('Outlet information is missing.');
            return false;
        }

        if (!items.length) {
            toast.error('At least one invoice item is required.');
            return false;
        }

        const invalidQty = items.some((item) => toNumber(item.qty) <= 0);

        if (invalidQty) {
            toast.error('Invoice quantity must be greater than 0.');
            return false;
        }

        const invalidRate = items.some((item) => toNumber(item.rate) < 0);

        if (invalidRate) {
            toast.error('Unit price cannot be negative.');
            return false;
        }

        return true;
    };

    const handleSaveDraft = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);

            const payload = buildInvoicePayload();

            await updatePurchaseInvoice(id, payload);

            toast.success('Purchase invoice updated successfully.');
            navigate(-1);
        } catch (error) {
            console.error('Failed to update purchase invoice:', error);

            toast.error(
                error?.response?.data?.msg ||
                error?.response?.data?.message ||
                error?.message ||
                'Failed to update purchase invoice.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendForApproval = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);

            const payload = buildInvoicePayload();

            await updatePurchaseInvoice(id, payload);

            toast.success('Purchase invoice updated successfully.');
            navigate(-1);
        } catch (error) {
            console.error('Failed to update purchase invoice:', error);

            toast.error(
                error?.response?.data?.msg ||
                error?.response?.data?.message ||
                error?.message ||
                'Failed to update purchase invoice.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const getItemName = (row) => {
        const rawMaterial = rawMaterialDetails[row.rawMaterialId];
        return rawMaterial?.nameEnglish || row.itemName || `Raw Material #${row.rawMaterialId}`;
    };

    const getItemUnit = (row) => {
        const rawMaterial = rawMaterialDetails[row.rawMaterialId];
        return rawMaterial?.unit?.nameEnglish || row.unit || `Unit #${row.unitId}`;
    };

    const getItemHsn = (row) => {
        const rawMaterial = rawMaterialDetails[row.rawMaterialId];
        return rawMaterial?.hsnCode || row.hsn || '-';
    };

    const formatDate = (date) => {
        if (!date) return '-';

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return date;
        }

        return parsed.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <Container>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-sm text-gray-500">Loading purchase invoice...</div>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="space-y-4 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Purchase Invoice Approval
                            </h1>
                            <p className="text-sm text-gray-500">
                                Update existing purchase invoice
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                            Existing Invoice
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                        <FileText size={18} className="text-[#084E92]" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Invoice Information
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                Vendor Bill Number
                            </label>
                            <input
                                type="text"
                                value={header.vendorBillNumber}
                                onChange={(e) =>
                                    setHeader((prev) => ({
                                        ...prev,
                                        vendorBillNumber: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#084E92]"
                                placeholder="Enter vendor bill number"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={header.invoiceDate}
                                onChange={(e) =>
                                    setHeader((prev) => ({
                                        ...prev,
                                        invoiceDate: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#084E92]"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                Vendor
                            </label>
                            <div className="flex min-h-[42px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                                {header.vendorName || '-'}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                Outlet
                            </label>
                            <div className="flex min-h-[42px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                                {header.outletName || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Receipt size={18} className="text-[#084E92]" />
                            <h2 className="text-base font-semibold text-gray-900">
                                Invoice Items
                            </h2>
                        </div>

                        <span className="text-sm text-gray-500">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                                        Item
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                                        HSN
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                                        Unit
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                        Qty
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                        Rate
                                    </th>

                                    {!isInterState ? (
                                        <>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                                CGST %
                                            </th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                                SGST %
                                            </th>
                                        </>
                                    ) : (
                                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                            IGST %
                                        </th>
                                    )}

                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                        Cess %
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={isInterState ? 9 : 10}
                                            className="px-4 py-10 text-center text-sm text-gray-500"
                                        >
                                            No invoice items found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((row, index) => {
                                        const rawMaterial = rawMaterialDetails[row.rawMaterialId];
                                        const displayName = getItemName(row);
                                        const displayUnit = getItemUnit(row);
                                        const displayHsn = getItemHsn(row);
                                        const amount = toNumber(row.qty) * toNumber(row.rate);

                                        return (
                                            <tr
                                                key={row.id || `${row.rawMaterialId}-${index}`}
                                                className="border-b border-gray-100 last:border-b-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="max-w-[220px] truncate font-medium text-gray-800">
                                                        {displayName}
                                                    </div>

                                                    {row.brand && (
                                                        <div className="mt-0.5 max-w-[220px] truncate text-xs text-gray-500">
                                                            {row.brand}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    {editingRow === index ? (
                                                        <input
                                                            type="text"
                                                            value={row.hsn || ''}
                                                            onChange={(e) =>
                                                                updateItem(index, 'hsn', e.target.value)
                                                            }
                                                            className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#084E92]"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-700">
                                                            {displayHsn}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="text-gray-700">
                                                        {displayUnit}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={row.qty}
                                                        onChange={(e) =>
                                                            updateItem(index, 'qty', e.target.value)
                                                        }
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={row.rate}
                                                        onChange={(e) =>
                                                            updateItem(index, 'rate', e.target.value)
                                                        }
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className="w-28 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                    />
                                                </td>

                                                {!isInterState ? (
                                                    <>
                                                        <td className="px-4 py-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.cgst}
                                                                onChange={(e) =>
                                                                    updateItem(index, 'cgst', e.target.value)
                                                                }
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.sgst}
                                                                onChange={(e) =>
                                                                    updateItem(index, 'sgst', e.target.value)
                                                                }
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                            />
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="px-4 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={row.igst}
                                                            onChange={(e) =>
                                                                updateItem(index, 'igst', e.target.value)
                                                            }
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                        />
                                                    </td>
                                                )}

                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={row.cess}
                                                        onChange={(e) =>
                                                            updateItem(index, 'cess', e.target.value)
                                                        }
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#084E92]"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                                    {formatCurrency(amount)}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditingRow(
                                                                    editingRow === index ? null : index
                                                                )
                                                            }
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-[#084E92]"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                                                            title="Remove"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* OTHER COSTING */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div className="flex items-center gap-2">
                            <Plus size={17} className="text-[#084E92]" />
                            <h3 className="text-sm font-semibold text-[#084E92] uppercase">
                                Other Costing / Charges (Transportation, Handling, etc.)
                            </h3>
                        </div>

                        <button
                            type="button"
                            onClick={addOtherCost}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-[#084E92] hover:bg-blue-50"
                        >
                            <Plus size={15} />
                            Add Cost
                        </button>
                    </div>

                    <div className="space-y-2 pt-3">
                        {otherCosts.map((item) => (
                            <div key={item.key} className="flex items-center gap-2">
                                <input
                                    value={item.label}
                                    onChange={(e) => updateOtherCost(item.key, 'label', e.target.value)}
                                    placeholder="Transport"
                                    className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#084E92]"
                                />

                                <div className="relative w-36">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                        ₹
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        value={item.cost}
                                        onChange={(e) => updateOtherCost(item.key, 'cost', e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="h-9 w-full rounded-lg border border-gray-200 pl-7 pr-3 text-right text-sm outline-none focus:border-[#084E92]"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeOtherCost(item.key)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}

                        {!otherCosts.length && (
                            <p className="py-2 text-sm text-gray-400">
                                No other costs added.
                            </p>
                        )}
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
                        <span className="text-gray-500 uppercase">
                            Total Other Costs:
                        </span>
                        <span className="ml-2 font-semibold text-gray-900">
                            {formatCurrency(totals.totalOtherCosts)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Tax Breakdown */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-5 flex items-center gap-2">
                            <Info size={17} className="text-gray-400" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                                Tax Breakdown ({isInterState ? 'Inter-State IGST' : 'Intra-State CGST + SGST'})
                            </h3>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Taxable Amount:</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(totals.subtotal)}
                                </span>
                            </div>

                            {!isInterState ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">CGST Amount:</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(totals.cgstAmount)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">SGST Amount:</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(totals.sgstAmount)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700">IGST Amount:</span>
                                    <span className="font-semibold text-gray-900">
                                        {formatCurrency(totals.igstAmount)}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">CESS Amount:</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(totals.cessAmount)}
                                </span>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Total Tax (GST + CESS):
                                    </span>
                                    <span className="font-bold text-gray-900">
                                        {formatCurrency(
                                            totals.cgstAmount +
                                            totals.sgstAmount +
                                            totals.igstAmount +
                                            totals.cessAmount
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Sub Total (Taxable):</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(totals.subtotal)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Discount (%):</span>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={header.discountPercentage}
                                        onChange={(e) =>
                                            setHeader((prev) => ({
                                                ...prev,
                                                discountPercentage: e.target.value,
                                            }))
                                        }
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-[100px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm outline-none focus:border-[#084E92]"
                                    />
                                    <span className="text-gray-500">%</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Taxable After Discount:</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(totals.taxableAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Total Tax:</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(
                                        totals.cgstAmount +
                                        totals.sgstAmount +
                                        totals.igstAmount +
                                        totals.cessAmount
                                    )}
                                </span>
                            </div>

                            {totals.totalOtherCosts > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-700">Other Costs:</span>
                                    <span className="font-semibold text-gray-900">
                                        +{formatCurrency(totals.totalOtherCosts)}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">Round Off:</span>

                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500">
                                        {toNumber(header.roundOff) >= 0 ? '+' : ''}
                                    </span>
                                    <input
                                        type="number"
                                        value={header.roundOff}
                                        onChange={(e) =>
                                            setHeader((prev) => ({
                                                ...prev,
                                                roundOff: e.target.value,
                                            }))
                                        }
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-[80px] border-0 bg-transparent p-0 text-right text-sm font-medium text-gray-800 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 border-t border-gray-200 pt-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-gray-900">
                                        NET AMOUNT:
                                    </span>

                                    <span className="text-2xl font-bold text-[#084E92]">
                                        {formatCurrency(totals.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-1">
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    Amount in Words
                                </div>

                                <div className="mt-1 text-sm italic text-[#084E92]">
                                    {numberToWords(Math.round(totals.totalAmount))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        disabled={submitting}
                        className="rounded-lg border cursor-pointer border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        className="rounded-lg border cursor-pointer border-[#084E92] bg-white px-5 py-2.5 text-sm font-medium text-[#084E92] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? 'Updating...' : 'Update Draft'}
                    </button>

                    <button
                        type="button"
                        onClick={handleSendForApproval}
                        disabled={submitting}
                        className="flex items-center gap-2 cursor-pointer rounded-lg bg-[#084E92] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#063d73] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} />
                        {submitting ? 'Updating...' : 'Update Invoice'}
                    </button>
                </div>
            </div>
        </Container>
    );
};

export default ApproveInvoice;
