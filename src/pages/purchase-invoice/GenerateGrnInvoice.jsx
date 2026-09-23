import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Trash2, Save, Loader2, Plus, ChevronRight } from 'lucide-react';
import { Container } from '@/components/common/container';
import { toast } from 'sonner';
import { formatCurrency, numberToWords } from '@/pages/purchase-order-requests/utils/taxUtils';
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getInvoiceById,
  getOrganizationByType,
  getAllActiveVendors,
  getRawMaterialById,
  updatePurchaseInvoiceStatus
} from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const todayISO = () => new Date().toISOString().split('T')[0];

const GenerateGrnInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const selectedGrns = location.state?.selectedGrns || (() => {
    try {
      return JSON.parse(sessionStorage.getItem('selectedGrns') || '[]');
    } catch {
      return [];
    }
  })();

  const [billNumber, setBillNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [outletsLoading, setOutletsLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [editVendorId, setEditVendorId] = useState('');
  const [editOutletId, setEditOutletId] = useState('');
  const [otherCosts, setOtherCosts] = useState([{ id: Date.now(), label: '', cost: 0 }]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const fetchOutlets = async () => {
      setOutletsLoading(true);
      try {
        const res = await getOrganizationByType('OUTLET');
        const raw = res?.data?.data || res?.data?.content || res?.data || [];
        setOutlets(Array.isArray(raw) ? raw.map(o => ({
          id: o.id,
          name: o.companyNameEnglish || o.name || `Outlet #${o.id}`,
          stateId: o.stateId ?? o.state?.id
        })) : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load outlets');
      } finally {
        setOutletsLoading(false);
      }
    };

    fetchOutlets();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      setVendorsLoading(true);
      try {
        const res = await getAllActiveVendors();
        const raw = res?.data?.data || res?.data || [];
        setVendors(Array.isArray(raw) ? raw.map(v => ({
          ...v,
          stateId: v.stateId ?? v.state?.id
        })) : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load vendors');
      } finally {
        setVendorsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    if (isEditMode) return;

    setRows(
      selectedGrns.flatMap(grn =>
        (grn.details || []).map(detail => {
          const allowedUnits = Array.isArray(detail.allowedUnits) ? detail.allowedUnits : [];
          const selectedUnit = allowedUnits.find(u => String(u.id) === String(detail.unitId));
          const unitId = detail.unitId ?? selectedUnit?.id ?? '';
          const unitName = detail.unitName || selectedUnit?.nameEnglish || selectedUnit?.symbolEnglish || '—';

          return {
            key: `${grn.grnId || grn.id}-${detail.grnDetailId}`,
            grnId: detail.grnId || grn.grnId || grn.id,
            grnDetailId: detail.grnDetailId,
            grnCode: detail.grnCode || grn.grnCode || '—',
            poCode: detail.poCode || '—',
            purchaseOrderDetailId: detail.purchaseOrderDetailId,
            purchaseOrderId: detail.purchaseOrderId,
            rawMaterialId: detail.rawMaterialId,
            itemName: detail.rawMaterialName || `Item #${detail.rawMaterialId}`,
            unitId,
            unitName,
            allowedUnits,
            acceptedQuantity: Number(detail.acceptedQuantity) || 0,
            previouslyInvoicedQuantity: Number(detail.previouslyInvoicedQuantity) || 0,
            invoiceableQuantity: Number(detail.invoiceableQuantity) || 0,
            qty: Number(detail.invoiceableQuantity) || 0,
            rate: Number(detail.unitPrice) || 0,
            discount: Number(detail.discountPercentage) || 0,
            hsn: detail.hsnCode || '',
            gst: Number(detail.igstRate) > 0
              ? Number(detail.igstRate)
              : (Number(detail.cgstRate) || 0) + (Number(detail.sgstRate) || 0),
            cess: Number(detail.cessRate) || 0
          };
        })
      )
    );
  }, [isEditMode, selectedGrns]);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchInvoice = async () => {
      setInvoiceLoading(true);

      try {
        const res = await getInvoiceById(id);
        const inv = res?.data?.data || res?.data;

        if (!inv) {
          toast.error('Purchase invoice not found');
          navigate('/purchase/invoice-listing');
          return;
        }

        setBillNumber(inv.vendorInvoiceNumber || '');
        setInvoiceDate(inv.invoiceDate || todayISO());
        setDiscountPercentage(Number(inv.discountPercentage) || 0);
        setEditVendorId(inv.vendorId ?? '');
        setEditOutletId(inv.organizationId ?? '');

        setOtherCosts(
          Array.isArray(inv.otherCosts) && inv.otherCosts.length
            ? inv.otherCosts.map((item, index) => ({
              id: item.id || Date.now() + index,
              label: item.label || '',
              cost: Number(item.cost) || 0
            }))
            : [{ id: Date.now(), label: '', cost: 0 }]
        );

        const invoiceRows = await Promise.all(
          (inv.details || []).map(async (detail, index) => {
            let itemDetails = null;

            try {
              if (detail.rawMaterialId) {
                const itemRes = await getRawMaterialById(detail.rawMaterialId);
                const rawMaterialDetails =
                  itemRes?.data?.data?.['Raw Material Details'] ||
                  itemRes?.data?.['Raw Material Details'] ||
                  [];

                itemDetails = rawMaterialDetails[0] || null;
              }
            } catch (error) {
              console.error('Failed to load raw material:', detail.rawMaterialId, error);
            }

            const allowedUnits = Array.isArray(itemDetails?.allowedUnits)
              ? itemDetails.allowedUnits
              : [];

            const selectedUnit =
              allowedUnits.find(u => String(u.id) === String(detail.unitId)) ||
              allowedUnits.find(u => String(u.id) === String(itemDetails?.unit?.id)) ||
              allowedUnits[0];

            const unitId = selectedUnit?.id ?? detail.unitId ?? itemDetails?.unit?.id ?? '';

            const unitName =
              selectedUnit?.nameEnglish ||
              selectedUnit?.symbolEnglish ||
              detail.unitName ||
              itemDetails?.unit?.nameEnglish ||
              itemDetails?.unit?.symbolEnglish ||
              '—';

            return {
              key: `${detail.grnDetailId || detail.id || 'row'}-${index}`,
              grnId: detail.grnId,
              grnDetailId: detail.grnDetailId,
              grnCode: detail.grnCode || '—',
              poCode: detail.poCode || '—',
              purchaseOrderDetailId: detail.purchaseOrderDetailId,
              purchaseOrderId: detail.purchaseOrderId,
              rawMaterialId: detail.rawMaterialId,
              itemName: detail.rawMaterialName || detail.itemName || itemDetails?.nameEnglish || `Item #${detail.rawMaterialId}`,
              unitId,
              unitName,
              allowedUnits,
              acceptedQuantity: Number(detail.acceptedQuantity) || 0,
              previouslyInvoicedQuantity: Number(detail.previouslyInvoicedQuantity) || 0,
              invoiceableQuantity: Number(detail.invoiceableQuantity) || 0,
              qty: Number(detail.invoiceQuantity) || 0,
              rate: Number(detail.unitPrice) || 0,
              discount: Number(detail.discountPercentage) || 0,
              hsn: detail.hsnCode || itemDetails?.hsnCode || '',
              gst: Number(detail.igstRate) > 0
                ? Number(detail.igstRate)
                : (Number(detail.cgstRate) || 0) + (Number(detail.sgstRate) || 0),
              cess: Number(detail.cessRate) || 0
            };
          })
        );

        setRows(invoiceRows);
      } catch (err) {
        console.error('Failed to load purchase invoice:', err);
        toast.error(
          err?.response?.data?.message ||
          err?.response?.data?.msg ||
          'Failed to load purchase invoice'
        );
        navigate('/purchase/invoice-listing');
      } finally {
        setInvoiceLoading(false);
      }
    };

    fetchInvoice();
  }, [id, isEditMode, navigate]);

  const selectedVendorId = isEditMode ? editVendorId : selectedGrns[0]?.vendorId;
  const selectedOutletId = isEditMode ? editOutletId : selectedGrns[0]?.organizationId;

  const vendorStateId = isEditMode
    ? vendors.find(v => Number(v.id) === Number(selectedVendorId))?.stateId
    : selectedGrns[0]?.vendorStateId ??
      vendors.find(v => Number(v.id) === Number(selectedVendorId))?.stateId;

  const outletStateId = isEditMode
    ? outlets.find(o => Number(o.id) === Number(selectedOutletId))?.stateId
    : selectedGrns[0]?.outletStateId ??
      outlets.find(o => Number(o.id) === Number(selectedOutletId))?.stateId;

  const isInterState =
    vendorStateId != null && outletStateId != null
      ? Number(vendorStateId) !== Number(outletStateId)
      : false;

  const selectedVendor = vendors.find(v => Number(v.id) === Number(selectedVendorId));

  const vendorName =
    selectedVendor?.fullName ||
    selectedVendor?.companyName ||
    selectedVendor?.vendorName ||
    selectedVendor?.name ||
    `Vendor #${selectedVendorId || '—'}`;

  const outletName = isEditMode
    ? outlets.find(o => Number(o.id) === Number(selectedOutletId))?.name ||
      `Outlet #${selectedOutletId || '—'}`
    : selectedGrns[0]?.organizationName ||
      selectedGrns[0]?.outletName ||
      selectedGrns[0]?.outlet ||
      outlets.find(o => Number(o.id) === Number(selectedOutletId))?.name ||
      '—';

  const updateRow = (key, field, value) => {
    setRows(prev =>
      prev.map(r => r.key === key ? { ...r, [field]: value } : r)
    );
  };

  const updateUnit = (key, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.key !== key) return row;

        const unit = row.allowedUnits?.find(u => String(u.id) === String(value));

        return {
          ...row,
          unitId: Number(value) || '',
          unitName: unit?.nameEnglish || unit?.symbolEnglish || row.unitName || '—'
        };
      })
    );
  };

  const removeRow = key => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const handleOverallDiscountChange = value => {
    const discount = Math.max(0, Math.min(100, Number(value) || 0));
    setDiscountPercentage(value);
    setRows(prev => prev.map(row => ({ ...row, discount })));
  };

  const updateOtherCost = (id, field, value) => {
    setOtherCosts(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const addOtherCost = () => {
    setOtherCosts(prev => [
      ...prev,
      { id: Date.now() + Math.random(), label: '', cost: 0 }
    ]);
  };

  const removeOtherCost = id => {
    setOtherCosts(prev => prev.filter(item => item.id !== id));
  };

  const rowCalculation = r => {
    const base = (Number(r.qty) || 0) * (Number(r.rate) || 0);
    const discountRate = Number(r.discount) || 0;
    const gstRate = Number(r.gst) || 0;
    const cessRate = Number(r.cess) || 0;
    const discountAmount = (base * discountRate) / 100;
    const taxableAmount = Math.max(0, base - discountAmount);
    const gstAmount = (taxableAmount * gstRate) / 100;
    const cessAmount = (taxableAmount * cessRate) / 100;
    const totalTax = gstAmount + cessAmount;
    const amountAfterTax = taxableAmount + totalTax;

    return {
      base,
      discountAmount,
      taxableAmount,
      gstAmount,
      cessAmount,
      totalTax,
      amountAfterTax,
      total: amountAfterTax
    };
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxable = 0;
    let gstAmt = 0;
    let cessAmt = 0;
    let amountAfterTax = 0;

    rows.forEach(row => {
      const calc = rowCalculation(row);
      subtotal += calc.base;
      discountAmount += calc.discountAmount;
      taxable += calc.taxableAmount;
      gstAmt += calc.gstAmount;
      cessAmt += calc.cessAmount;
      amountAfterTax += calc.amountAfterTax;
    });

    const totalTax = gstAmt + cessAmt;
    const totalOtherCosts = otherCosts.reduce(
      (sum, item) => sum + (Number(item.cost) || 0),
      0
    );

    const rawNet = amountAfterTax + totalOtherCosts;
    const netAmount = Math.round(rawNet);
    const roundOff = netAmount - rawNet;

    return {
      subtotal,
      discountAmount,
      taxable,
      gstAmt,
      cessAmt,
      totalTax,
      amountAfterTax,
      amountAfterDiscount: taxable,
      totalOtherCosts,
      rawNet,
      netAmount,
      roundOff
    };
  }, [rows, otherCosts]);

  const taxBreakdown = useMemo(() => {
    const grouped = {};

    rows.forEach(row => {
      const calc = rowCalculation(row);
      const gstRate = Number(row.gst) || 0;
      const cessRate = Number(row.cess) || 0;
      const key = `${gstRate}-${cessRate}`;

      if (!grouped[key]) {
        grouped[key] = {
          rate: gstRate,
          taxable: 0,
          gstAmt: 0,
          cgstAmt: 0,
          sgstAmt: 0,
          igstAmt: 0,
          cessAmt: 0,
          cessPct: cessRate
        };
      }

      grouped[key].taxable += calc.taxableAmount;
      grouped[key].gstAmt += calc.gstAmount;
      grouped[key].cessAmt += calc.cessAmount;

      if (isInterState) {
        grouped[key].igstAmt += calc.gstAmount;
      } else {
        grouped[key].cgstAmt += calc.gstAmount / 2;
        grouped[key].sgstAmt += calc.gstAmount / 2;
      }
    });

    return Object.values(grouped).sort((a, b) => a.rate - b.rate);
  }, [rows, isInterState]);

  const handleGenerate = async (approve = false) => {
    if (!rows.length) {
      toast.error('Please add at least one item');
      return;
    }

    if (!billNumber.trim()) {
      toast.error('Please enter vendor invoice number');
      return;
    }

    if (!selectedVendorId) {
      toast.error('Vendor is missing');
      return;
    }

    if (!selectedOutletId) {
      toast.error('Outlet is missing');
      return;
    }

    if (vendorStateId == null || outletStateId == null) {
      toast.error('Vendor or outlet state is missing');
      return;
    }

    setIsSubmitting(true);

    try {
      const details = rows.map(r => {
        const calc = rowCalculation(r);
        const gstRate = Number(r.gst) || 0;
        const cessRate = Number(r.cess) || 0;

        return {
          grnDetailId: r.grnDetailId,
          purchaseOrderDetailId: r.purchaseOrderDetailId,
          unitId: Number(r.unitId) || 0,
          unitPrice: Number(r.rate) || 0,
          invoiceQuantity: Number(r.qty) || 0,
          discountPercentage: Number(r.discount) || 0,
          discountAmount: calc.discountAmount,
          cgstRate: isInterState ? 0 : gstRate / 2,
          sgstRate: isInterState ? 0 : gstRate / 2,
          igstRate: isInterState ? gstRate : 0,
          cessRate,
          taxableAmount: calc.taxableAmount,
          cgstAmount: isInterState ? 0 : calc.gstAmount / 2,
          sgstAmount: isInterState ? 0 : calc.gstAmount / 2,
          igstAmount: isInterState ? calc.gstAmount : 0,
          cessAmount: calc.cessAmount,
          tax: calc.totalTax,
          lineTotal: calc.total
        };
      });

      const payload = {
        subtotal: totals.subtotal,
        discountPercentage: Number(discountPercentage) || 0,
        discountAmount: totals.discountAmount,
        cgstAmount: isInterState ? 0 : totals.gstAmt / 2,
        sgstAmount: isInterState ? 0 : totals.gstAmt / 2,
        igstAmount: isInterState ? totals.gstAmt : 0,
        cessAmount: totals.cessAmt,
        totalAmount: totals.netAmount,
        roundOff: totals.roundOff,
        details,
        grnIds: [...new Set(rows.map(r => r.grnId).filter(id => id != null))],
        invoiceDate,
        organizationId: Number(selectedOutletId),
        otherCosts: otherCosts
          .filter(item => item.label?.trim() || Number(item.cost))
          .map(item => ({
            id: isEditMode ? Number(item.id) || 0 : 0,
            label: item.label.trim(),
            cost: Number(item.cost) || 0,
            moduleName: 'POINVOICE'
          })),
        userId: Number(getUserIdFromToken()) || 0,
        vendorId: Number(selectedVendorId),
        vendorInvoiceNumber: billNumber.trim()
      };

      const response = isEditMode
        ? await updatePurchaseInvoice(id, payload)
        : await createPurchaseInvoice(payload);

      const responseData = response?.data?.data || response?.data || {};

      const invoiceId = isEditMode
        ? Number(id)
        : Number(responseData?.id || responseData?.invoiceId);

      if (!invoiceId) {
        throw new Error('Invoice ID was not returned after saving invoice');
      }

      if (approve) {
        await updatePurchaseInvoiceStatus(
          invoiceId,
          'APPROVED',
          Number(getUserIdFromToken()) || 0
        );
      }

      navigate('/purchase/invoice-listing');
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        `Failed to ${approve ? 'approve' : 'save'} purchase invoice`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (invoiceLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Loading purchase invoice...
        </div>
      </Container>
    );
  }

  if (!isEditMode && !selectedGrns.length) {
    return (
      <Container>
        <div className="py-10 text-center">
          <p className="text-gray-500 mb-4">No GRN selected.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </Container>
    );
  }

  const taxGridClass = isInterState
    ? totals.cessAmt > 0
      ? 'grid-cols-[1.1fr_1fr_1fr_24px_1.4fr]'
      : 'grid-cols-[1.1fr_1fr_1fr]'
    : totals.cessAmt > 0
      ? 'grid-cols-[1.1fr_1fr_1fr_24px_1fr_24px_1.5fr]'
      : 'grid-cols-[1.1fr_1fr_1fr_24px_1fr]';

  return (
    <Container>
      <div className="mx-auto p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-3 min-w-0">
          <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={12} className="shrink-0" />
          <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/purchase/invoice-listing')}>Purchase Invoice</span>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-[#084E92] font-medium truncate">{isEditMode ? 'Edit GRN Invoice' : 'Generate GRN Invoice'}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 min-w-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 w-9 shrink-0 flex items-center cursor-pointer justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {isEditMode ? 'Edit GRN Invoice' : 'Generate GRN Invoice'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {isEditMode ? 'Update purchase invoice details' : 'Create purchase invoice from selected GRNs'}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl p-3 sm:p-5 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Invoice No.</label>
              <input
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92]"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92]"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor</label>
              <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate">
                {vendorsLoading ? 'Loading...' : vendorName}
              </div>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Outlet</label>
              <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate">
                {outletsLoading ? 'Loading...' : outletName}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-3 sm:px-5 py-4 border-b border-gray-200 min-w-0">
            <h2 className="font-semibold text-gray-900">Invoice Items</h2>
            <p className="text-xs text-gray-500 mt-0.5">Overall discount updates all items. Individual discount can be changed separately.</p>
          </div>

          <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-287.5 text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Item Description</th>
                  <th className="px-2 py-3 text-left font-semibold text-gray-700">Unit</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Rate (₹)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Discount (%)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">HSN/SAC</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">GST (%)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">CESS (%)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount(₹)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Tax<br />Applied (₹)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total<br />Amount (₹)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-xs">
                {rows.map(row => {
                  const calc = rowCalculation(row);

                  return (
                    <tr key={row.key} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#084E92] max-w-55 truncate" title={row.itemName}>
                          {row.itemName}
                        </div>
                      </td>

                      <td className="px-2 py-3">
                        <Select
                          value={row.unitId != null && row.unitId !== '' ? String(row.unitId) : undefined}
                          onValueChange={value => updateUnit(row.key, value)}
                        >
                          <SelectTrigger className="h-9 min-w-27.5 border-gray-200 text-sm focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Select Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.allowedUnits?.length ? (
                              row.allowedUnits.map(unit => (
                                <SelectItem key={unit.id} value={String(unit.id)}>
                                  {unit.nameEnglish || unit.symbolEnglish || `Unit #${unit.id}`}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={String(row.unitId || 'none')} disabled>
                                {row.unitName || 'No Unit'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={e => updateRow(row.key, 'qty', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-12 h-9 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.rate}
                          onChange={e => updateRow(row.key, 'rate', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-20 h-9 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.discount}
                          onChange={e => updateRow(row.key, 'discount', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-16 h-9 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={row.hsn}
                          onChange={e => updateRow(row.key, 'hsn', e.target.value)}
                          placeholder="HSN"
                          className="w-20 h-9 px-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.gst}
                          onChange={e => updateRow(row.key, 'gst', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-16 h-9 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.cess}
                          onChange={e => updateRow(row.key, 'cess', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-16 h-9 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(calc.taxableAmount)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-orange-600 whitespace-nowrap">
                        {formatCurrency(calc.totalTax)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(calc.total)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-gray-500">No invoice items.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Plus size={17} className="text-[#084E92] shrink-0" />
              <h3 className="text-sm font-semibold text-[#084E92] uppercase truncate">
                Other Costing / Charges
              </h3>
            </div>

            <button
              type="button"
              onClick={addOtherCost}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-[#084E92] text-sm font-medium hover:bg-blue-50 whitespace-nowrap shrink-0"
            >
              <Plus size={15} />
              Add Cost
            </button>
          </div>

          <div className="pt-3 space-y-2 w-full md:w-[80%]">
            {otherCosts.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                <input
                  value={item.label}
                  onChange={e => updateOtherCost(item.id, 'label', e.target.value)}
                  placeholder="Transport"
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#084E92]"
                />

                <div className="relative w-full sm:w-36 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={item.cost}
                    onChange={e => updateOtherCost(item.id, 'cost', e.target.value)}
                    onWheel={e => e.currentTarget.blur()}
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeOtherCost(item.id)}
                  className="h-9 w-full sm:w-9 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {!otherCosts.length && (
              <p className="text-sm text-gray-400 py-2">No other costs added.</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500 uppercase">Total Other Costs:</span>
            <span className="font-semibold text-gray-900 ml-2 whitespace-nowrap">
              {formatCurrency(totals.totalOtherCosts)}
            </span>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start mb-3">
          <div className="w-full min-w-0 xl:col-span-7 bg-white rounded-xl border border-gray-200 p-3 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={17} className="text-[#084E92] shrink-0" />
                <h3 className="text-sm font-semibold text-[#084E92] uppercase">Tax Breakdown</h3>
              </div>

              <span className="self-start sm:self-auto shrink-0 px-3 py-1 rounded-full bg-blue-50 text-[#084E92] text-xs font-medium whitespace-nowrap">
                {isInterState ? 'Inter-State IGST' : 'Intra-State GST'}
              </span>
            </div>

            <div className="w-full max-w-full min-w-0 mt-3 overflow-x-auto overscroll-x-contain">
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

                {totals.cessAmt > 0 && (
                  <>
                    <div></div>
                    <div className="text-right">CESS</div>
                  </>
                )}
              </div>

              {taxBreakdown.length ? (
                taxBreakdown.map(rate => (
                  <div
                    key={`${rate.rate}-${rate.cessPct}`}
                    className={`grid ${taxGridClass} items-center px-2 py-2.5 border-b border-gray-100 min-w-max text-xs`}
                  >
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-md bg-blue-50 text-[#084E92] font-semibold text-xs whitespace-nowrap">
                        {Number(rate.rate).toFixed(2)}% GST
                      </span>
                    </div>

                    <div className="py-2.5 px-2 text-right text-xs whitespace-nowrap font-mono font-semibold text-gray-800">
                      ₹{Number(rate.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {!isInterState ? (
                      <>
                        <div className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                          ₹{Number(rate.sgstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>

                        <div className="py-2.5 w-6 px-0.5 text-center">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">+</span>
                        </div>

                        <div className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                          ₹{Number(rate.cgstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </>
                    ) : (
                      <div className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                        ₹{Number(rate.igstAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}

                    {totals.cessAmt > 0 && (
                      <>
                        <div className="py-2.5 w-6 px-0.5 text-center">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">+</span>
                        </div>

                        <div className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                          <div className="inline-flex items-center justify-end gap-1.5 font-mono">
                            <span>₹{Number(rate.cessAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            {Number(rate.cessPct || 0) > 0 && (
                              <span className="text-[10px] font-sans font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                ({Number(rate.cessPct)}% CESS)
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">No tax applicable</div>
              )}

              <div className={`grid ${taxGridClass} px-2 pt-4 text-xs font-semibold border-t-2 border-dashed border-gray-500 min-w-max`}>
                <div>TOTAL</div>
                <div className="text-right">{formatCurrency(totals.taxable)}</div>

                {!isInterState ? (
                  <>
                    <div className="text-right">{formatCurrency(totals.gstAmt / 2)}</div>
                    <div></div>
                    <div className="text-right">{formatCurrency(totals.gstAmt / 2)}</div>
                  </>
                ) : (
                  <div className="text-right text-[#084E92]">{formatCurrency(totals.gstAmt)}</div>
                )}

                {totals.cessAmt > 0 && (
                  <>
                    <div></div>
                    <div className="text-right text-[#084E92]">{formatCurrency(totals.cessAmt)}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 xl:col-span-5 bg-white rounded-xl border border-gray-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-4">
              <Receipt size={17} className="text-[#084E92] shrink-0" />
              <h3 className="text-sm font-semibold text-[#084E92] uppercase">Invoice Summary</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">{formatCurrency(totals.subtotal)}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-gray-500">Overall Discount (%):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountPercentage}
                    onChange={e => handleOverallDiscountChange(e.target.value)}
                    onWheel={e => e.currentTarget.blur()}
                    className="w-20 h-8 px-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#084E92]"
                  />
                  %
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Discount Amount:</span>
                <span className="font-medium text-red-600 whitespace-nowrap">-{formatCurrency(totals.discountAmount)}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Taxable Amount:</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">{formatCurrency(totals.taxable)}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Total Tax:</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">{formatCurrency(totals.totalTax)}</span>
              </div>

              {totals.totalOtherCosts > 0 && (() => {
                const labels = otherCosts
                  .filter(item => item.label?.trim() && Number(item.cost) > 0)
                  .map(item => item.label.trim());

                return (
                  <div className="flex justify-between gap-3 min-w-0">
                    <span
                      className="text-gray-500 min-w-0 flex-1 truncate"
                      title={`Other Costs (${labels.join(', ')})`}
                    >
                      Other Costs ({labels.join(', ')})
                    </span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      +{formatCurrency(totals.totalOtherCosts)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Round Off:</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  {totals.roundOff >= 0 ? '+' : ''}{formatCurrency(totals.roundOff)}
                </span>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-200 flex justify-between items-center gap-4">
                <span className="font-bold text-gray-900">NET AMOUNT:</span>
                <span className="font-bold text-xl text-[#084E92] whitespace-nowrap">
                  {formatCurrency(totals.netAmount)}
                </span>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-dashed border-blue-100">
                <div className="text-[11px] uppercase font-medium text-gray-500 mb-1">Amount in Words</div>
                <div className="text-sm italic font-medium text-gray-800 wrap-break-word">
                  {numberToWords(totals.netAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium cursor-pointer text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={isSubmitting || invoiceLoading || !rows.length}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#084E92] text-[#084E92] cursor-pointer text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {isEditMode ? 'Update Draft' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={isSubmitting || invoiceLoading || !rows.length}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer bg-[#084E92] text-white text-sm font-medium hover:bg-[#063d73] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Create Invoice' : 'Create Invoice')}
          </button>
        </div>
      </div>
    </Container>
  );
};

export default GenerateGrnInvoice;