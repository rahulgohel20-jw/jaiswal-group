import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Trash2, Save, Loader2, Plus, FileCheck, FileText, Eye, FileMinus, X } from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { toast } from 'sonner';
import { formatCurrency, numberToWords } from '@/pages/purchase-order-requests/utils/taxUtils';
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getInvoiceById,
  getOrganizationByType,
  getAllActiveVendors,
  getRawMaterialById,
  updatePurchaseInvoiceStatus,
  getEligibleGrnDetails,
  createDebitCreditNote,
} from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import CreateDebitNoteModal from '../purchase-credit-debite-note/CreateDebitNoteModal';

const todayISO = () => new Date().toISOString().split('T')[0];

const formatToDDMMYYYY = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const GenerateGrnInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
  const { canAdd, canEdit, canView } = usePagePermissions([
    'Purchase Invoice List',
    'Generate Purchase Invoice',
  ]);

  const rawGrnIds = useMemo(() => {
    const fromQuery = searchParams.get('grnIds');
    if (fromQuery) return fromQuery;
    if (location.state?.grnIds) {
      return Array.isArray(location.state.grnIds)
        ? location.state.grnIds.join(',')
        : String(location.state.grnIds);
    }
    if (Array.isArray(location.state?.selectedGrns)) {
      return location.state.selectedGrns
        .map((g) => g.id || g.grnId)
        .filter(Boolean)
        .join(',');
    }
    return '';
  }, [searchParams, location.state]);

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
  const [editVendorName, setEditVendorName] = useState('');
  const [editOutletName, setEditOutletName] = useState('');
  const [editVendorStateId, setEditVendorStateId] = useState(null);
  const [editOutletStateId, setEditOutletStateId] = useState(null);
  const [otherCosts, setOtherCosts] = useState([{ id: Date.now(), label: '', cost: 0 }]);
  const [rows, setRows] = useState([]);
  const [attachedImages, setAttachedImages] = useState([]);
  const [activeGrnIds, setActiveGrnIds] = useState([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
  const [debitNoteGeneralRemarks, setDebitNoteGeneralRemarks] = useState('');
  const [debitNoteItems, setDebitNoteItems] = useState([]);
  const [isCreatingDebitNote, setIsCreatingDebitNote] = useState(false);
  const [pendingDebitNotes, setPendingDebitNotes] = useState([]);

  useEffect(() => {
    if (isEditMode) return;
    const fetchOutlets = async () => {
      setOutletsLoading(true);
      try {
        const res = await getOrganizationByType('OUTLET');
        const raw = res?.data?.data || res?.data?.content || res?.data || [];
        setOutlets(Array.isArray(raw) ? raw.map(o => ({
          id: o.id,
          name: o.companyNameEnglish || o.name || `Unit #${o.id}`,
          stateId: o.stateId ?? o.state?.id
        })) : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load units');
      } finally {
        setOutletsLoading(false);
      }
    };

    fetchOutlets();
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
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
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode) return;

    if (!rawGrnIds) {
      setRows([]);
      return;
    }

    const fetchGrnDetails = async () => {
      setInvoiceLoading(true);
      try {
        const res = await getEligibleGrnDetails(rawGrnIds);
        const resData = res?.data?.data || {};

        const detailDtos = Array.isArray(resData.eligibleGrnDetailResponseDtos)
          ? resData.eligibleGrnDetailResponseDtos
          : [];
        const otherCostList = Array.isArray(resData.otherCostResponseDtos)
          ? resData.otherCostResponseDtos
          : [];
        const imageList = Array.isArray(resData.images)
          ? resData.images
          : [];

        setAttachedImages(imageList);

        if (otherCostList.length > 0) {
          setOtherCosts(
            otherCostList.map((item, index) => ({
              id: item.id || Date.now() + index,
              label: item.label || '',
              cost: Number(item.cost) || 0,
              moduleName: item.moduleName || 'POINVOICE'
            }))
          );
        } else {
          setOtherCosts([{ id: Date.now(), label: '', cost: 0 }]);
        }

        const grnIdList = [...new Set(detailDtos.map((d) => d.grnId).filter(Boolean))];
        setActiveGrnIds(grnIdList);

        const primaryGrn = location.state?.selectedGrns?.[0] || {};
        if (primaryGrn.vendorId) setEditVendorId(String(primaryGrn.vendorId));
        if (primaryGrn.organizationId) setEditOutletId(String(primaryGrn.organizationId));

        let initialSubtotal = 0;
        let initialTotalDiscount = 0;

        const mappedRows = detailDtos.map(detail => {
          const allowedUnits = Array.isArray(detail.allowedUnits) ? detail.allowedUnits : [];
          const selectedUnit = allowedUnits.find(u => String(u.id) === String(detail.unitId));
          const unitId = detail.unitId ?? selectedUnit?.id ?? '';
          const unitName = detail.unitName || selectedUnit?.nameEnglish || selectedUnit?.symbolEnglish || '—';

          const unitPrice = Number(detail.unitPrice) || 0;
          const invoiceableQty = Number(detail.invoiceableQuantity) || 0;
          let prefilledDiscount = Number(detail.discountPercentage) || 0;

          const baseAmount = unitPrice * invoiceableQty;
          let discountAmt = Number(detail.discountAmount) || 0;

          if (!prefilledDiscount && discountAmt > 0 && baseAmount > 0) {
            prefilledDiscount = Number(((discountAmt / baseAmount) * 100).toFixed(2));
          } else if (prefilledDiscount > 0 && !discountAmt) {
            discountAmt = (baseAmount * prefilledDiscount) / 100;
          }

          initialSubtotal += baseAmount;
          initialTotalDiscount += discountAmt;

          return {
            key: `${detail.grnId}-${detail.grnDetailId}`,
            grnId: detail.grnId,
            grnDetailId: detail.grnDetailId,
            grnCode: detail.grnCode || '—',
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
            invoiceableQuantity: invoiceableQty,
            qty: invoiceableQty,
            rate: unitPrice,
            discount: prefilledDiscount,
            hsn: detail.hsnCode || '',
            gst: Number(detail.igstRate) > 0
              ? Number(detail.igstRate)
              : (Number(detail.cgstRate) || 0) + (Number(detail.sgstRate) || 0),
            cess: Number(detail.cessRate) || 0,
            isCessApplicable: Boolean(detail.isCessApplicable),
            hasDebitNote: false,
            debitNoteInfo: null,
          };
        });

        setRows(mappedRows);

    // Auto-calculate and show overall discount percentage on load
        if (initialSubtotal > 0 && initialTotalDiscount > 0) {
          const calculatedOverallPct = Number(((initialTotalDiscount / initialSubtotal) * 100).toFixed(2));
          setDiscountPercentage(calculatedOverallPct);
        } else {
          setDiscountPercentage(0);
        }
      } catch (err) {
        console.error('Failed to load eligible GRN details:', err);
        toast.error(
          err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Failed to load eligible GRN details'
        );
      } finally {
        setInvoiceLoading(false);
      }
    };

    fetchGrnDetails();
  }, [isEditMode, rawGrnIds, location.state]);

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
        setEditVendorName(inv.vendorName || '');
        setEditOutletName(inv.organizationName || '');
        setEditVendorStateId(inv.billTo?.stateId ?? null);
        setEditOutletStateId(inv.shipTo?.stateId ?? null);
        setActiveGrnIds(Array.isArray(inv.grnIds) ? inv.grnIds : []);

        setOtherCosts(
          Array.isArray(inv.otherCosts) && inv.otherCosts.length
            ? inv.otherCosts.map((item, index) => ({
              id: item.id || Date.now() + index,
              label: item.label || '',
              cost: Number(item.cost) || 0
            }))
            : [{ id: Date.now(), label: '', cost: 0 }]
        );
        setAttachedImages(Array.isArray(inv.images) ? inv.images : []);

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

            const unitPrice = Number(detail.unitPrice) || 0;
            const invoiceQty = Number(detail.invoiceQuantity) || 0;
            const discountAmt = Number(detail.discountAmount) || 0;
            let itemDiscountPct = Number(detail.discountPercentage) || 0;

            if ((itemDiscountPct > 100 || !itemDiscountPct) && discountAmt > 0 && unitPrice * invoiceQty > 0) {
              itemDiscountPct = Number(((discountAmt / (unitPrice * invoiceQty)) * 100).toFixed(2));
            }

            return {
              key: `${detail.grnDetailId || detail.id || 'row'}-${index}`,
              id: detail.id,
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
              qty: invoiceQty,
              rate: unitPrice,
              discount: itemDiscountPct,
              hsn: detail.hsnCode || itemDetails?.hsnCode || '',
              gst: Number(detail.igstRate) > 0
                ? Number(detail.igstRate)
                : (Number(detail.cgstRate) || 0) + (Number(detail.sgstRate) || 0),
              cess: Number(detail.cessRate) || 0,
              isCessApplicable: Boolean(detail.isCessApplicable ?? itemDetails?.isCessApplicable),
              hasDebitNote: false,
              debitNoteInfo: null,
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

  const selectedVendorId = isEditMode
    ? editVendorId
    : editVendorId || location.state?.selectedGrns?.[0]?.vendorId || location.state?.vendorId || location.state?.data?.vendorId;

  const selectedOutletId = isEditMode
    ? editOutletId
    : editOutletId || location.state?.selectedGrns?.[0]?.organizationId || location.state?.selectedGrns?.[0]?.outletId || location.state?.organizationId || location.state?.data?.organizationId;

  const vendorStateId = isEditMode
    ? (editVendorStateId ?? vendors.find(v => Number(v.id) === Number(selectedVendorId))?.stateId)
    : location.state?.selectedGrns?.[0]?.vendorStateId ??
    vendors.find(v => Number(v.id) === Number(selectedVendorId))?.stateId;

  const outletStateId = isEditMode
    ? (editOutletStateId ?? outlets.find(o => Number(o.id) === Number(selectedOutletId))?.stateId)
    : location.state?.selectedGrns?.[0]?.outletStateId ??
    outlets.find(o => Number(o.id) === Number(selectedOutletId))?.stateId;

  const isInterState =
    vendorStateId != null && outletStateId != null
      ? Number(vendorStateId) !== Number(outletStateId)
      : false;

  const selectedVendor = vendors.find(v => Number(v.id) === Number(selectedVendorId));

  const vendorName = isEditMode
    ? editVendorName || selectedVendor?.fullName || selectedVendor?.companyName || selectedVendor?.vendorName || `Vendor #${selectedVendorId || '—'}`
    : selectedVendor?.fullName ||
    selectedVendor?.companyName ||
    selectedVendor?.vendorName ||
    selectedVendor?.name ||
    `Vendor #${selectedVendorId || '—'}`;

  const outletName = isEditMode
    ? editOutletName || outlets.find(o => Number(o.id) === Number(selectedOutletId))?.name || `Outlet #${selectedOutletId || '—'}`
    : location.state?.selectedGrns?.[0]?.organizationName ||
    location.state?.selectedGrns?.[0]?.outletName ||
    location.state?.selectedGrns?.[0]?.outlet ||
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
    setSelectedRowKeys(prev => prev.filter(k => k !== key));
    setPendingDebitNotes(prev => prev.filter(n => !n.rowKeys.includes(key)));
  };

  const handleRemoveDebitNote = (rowKey) => {
    setRows(prev =>
      prev.map(r => {
        if (r.key === rowKey) {
          const originalRate = r.debitNoteInfo?.originalRate ?? r.rate;
          return {
            ...r,
            rate: originalRate,
            hasDebitNote: false,
            debitNoteInfo: null,
          };
        }
        return r;
      })
    );

    setPendingDebitNotes(prev =>
      prev
        .map(note => ({
          ...note,
          details: note.details.filter(d => d.key !== rowKey),
          rowKeys: note.rowKeys.filter(k => k !== rowKey),
        }))
        .filter(note => note.details.length > 0)
    );

    toast.success('Debit note removed');
  };

  const handleOverallDiscountChange = value => {
    const discount = value === '' ? '' : Math.max(0, Math.min(100, Number(value) || 0));
    setDiscountPercentage(value);
    setRows(prev => prev.map(row => ({ ...row, discount: discount === '' ? 0 : discount })));
  };

  const handleItemDiscountChange = (key, value) => {
    const v = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    setRows(prev => {
      const nextRows = prev.map(r => r.key === key ? { ...r, discount: v } : r);
      let sub = 0;
      let disc = 0;
      nextRows.forEach(r => {
        const q = Number(r.qty) || 0;
        const p = Number(r.rate) || 0;
        const d = Number(r.discount) || 0;
        const base = q * p;
        sub += base;
        disc += (base * d) / 100;
      });
      const effectivePct = sub > 0 ? Number(((disc / sub) * 100).toFixed(2)) : (Number(v) || 0);
      setDiscountPercentage(effectivePct);
      return nextRows;
    });
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
    const qty = Number(r.qty) || 0;
    const price = Number(r.rate) || 0;
    const discountPct = Number(r.discount) || 0;
    const gstPct = Number(r.gst) || 0;
    const cessPct = r.isCessApplicable ? (Number(r.cess) || 0) : 0;

    const baseAmount = qty * price;
    const discountAmt = (baseAmount * discountPct) / 100;
    const taxable = Math.max(0, baseAmount - discountAmt);

    const cessAmt = (taxable * cessPct) / 100;

    let itemTax = 0;
    let cgstPct = 0;
    let sgstPct = 0;
    let igstPct = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;
    let gstAmt = 0;

    if (isInterState) {
      igstPct = gstPct;
      igstAmt = (taxable * igstPct) / 100;
      gstAmt = igstAmt;
    } else {
      cgstPct = gstPct / 2;
      sgstPct = gstPct / 2;
      cgstAmt = (taxable * cgstPct) / 100;
      sgstAmt = (taxable * sgstPct) / 100;
      gstAmt = cgstAmt + sgstAmt;
    }

    itemTax = gstAmt + cessAmt;
    const itemTotal = taxable + itemTax;

    return {
      base: baseAmount,
      baseAmount,
      discountPct,
      discountAmt,
      discountAmount: discountAmt,
      taxable,
      taxableAmount: taxable,
      gstPct,
      gstAmount: gstAmt,
      gstAmt,
      cgstPct,
      sgstPct,
      igstPct,
      cgstAmt,
      sgstAmt,
      igstAmt,
      cessPct,
      cessAmt,
      cessAmount: cessAmt,
      totalTax: itemTax,
      itemTax,
      amountAfterTax: itemTotal,
      total: itemTotal,
      itemTotal
    };
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCESS = 0;

    rows.forEach(row => {
      const calc = rowCalculation(row);
      subtotal += calc.baseAmount;
      totalDiscount += calc.discountAmt;
      totalTaxable += calc.taxable;
      totalCESS += calc.cessAmt;
      if (isInterState) {
        totalIGST += calc.igstAmt;
      } else {
        totalCGST += calc.cgstAmt;
        totalSGST += calc.sgstAmt;
      }
    });

    const totalGST = isInterState ? totalIGST : totalCGST + totalSGST;
    const totalTax = totalGST + totalCESS;

    const totalOtherCosts = otherCosts.reduce((sum, item) => {
      const val = Number(item.cost);
      return sum + (!isNaN(val) && val > 0 ? val : 0);
    }, 0);

    const rawNet = totalTaxable + totalTax + totalOtherCosts;
    const roundedNet = Math.round(rawNet);
    const roundOff = Number((roundedNet - rawNet).toFixed(2));
    const netAmount = roundedNet;

    return {
      subtotal,
      discountAmount: totalDiscount,
      totalDiscount,
      taxable: totalTaxable,
      totalTaxable,
      gstAmt: totalGST,
      totalGST,
      totalCGST,
      totalSGST,
      totalIGST,
      cessAmt: totalCESS,
      totalCESS,
      totalTax,
      amountAfterTax: totalTaxable + totalTax,
      amountAfterDiscount: totalTaxable,
      totalOtherCosts,
      rawNet,
      netAmount,
      roundedNet,
      roundOff
    };
  }, [rows, otherCosts, isInterState]);

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
          cessAmt: 0
        };
      }

      taxRateGroups[rateKey].taxable += calc.taxable;
      taxRateGroups[rateKey].cgstAmt += calc.cgstAmt;
      taxRateGroups[rateKey].sgstAmt += calc.sgstAmt;
      taxRateGroups[rateKey].igstAmt += calc.igstAmt;
      taxRateGroups[rateKey].gstAmt += calc.gstAmt;
      taxRateGroups[rateKey].cessAmt += calc.cessAmt;
    });

    return Object.values(taxRateGroups).sort((a, b) => b.gstPct - a.gstPct || b.cessPct - a.cessPct);
  }, [rows, isInterState]);

  const selectableRows = useMemo(() => rows.filter(r => !r.hasDebitNote), [rows]);

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedRowKeys(selectableRows.map(r => r.key));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleToggleSelectRow = (key) => {
    const targetRow = rows.find(r => r.key === key);
    if (targetRow?.hasDebitNote) return;

    setSelectedRowKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleOpenDebitNoteModal = () => {
    const selected = rows.filter(r => selectedRowKeys.includes(r.key) && !r.hasDebitNote);
    if (!selected.length) {
      toast.error('Select at least one eligible item to create a debit note');
      return;
    }

    setDebitNoteItems(
      selected.map(r => ({
        key: r.key,
        rawMaterialId: r.rawMaterialId,
        itemName: r.itemName,
        unitId: r.unitId,
        unitName: r.unitName,
        qty: Number(r.qty) || 0,
        originalRate: Number(r.rate) || 0,
        revisedRate: Number(r.rate) || 0,
        remarks: '',
        grnDetailId: r.grnDetailId,
        purchaseOrderDetailId: r.purchaseOrderDetailId,
        purchaseOrderId: r.purchaseOrderId,
        grnId: r.grnId,
        rowRef: r
      }))
    );
    setDebitNoteGeneralRemarks('');
    setIsDebitModalOpen(true);
  };

  const updateDebitModalItem = (key, field, value) => {
    setDebitNoteItems(prev =>
      prev.map(item => item.key === key ? { ...item, [field]: value } : item)
    );
  };

  const handleStageDebitNote = () => {
    const hasInvalidDifference = debitNoteItems.some(
      item => Number(item.revisedRate) >= Number(item.originalRate)
    );
    if (hasInvalidDifference) {
      toast.warning('Revised rate should be lower than original rate for rate difference.');
    }

    const details = debitNoteItems.map(item => {
      const calc = rowCalculation(item.rowRef);
      const originalRate = Number(item.originalRate) || 0;
      const revisedRate = Number(item.revisedRate) || 0;
      const rateDiff = Number((originalRate - revisedRate).toFixed(2));
      const taxableAmount = Number((rateDiff * item.qty).toFixed(2));

      return {
        key: item.key,
        rawMaterialId: Number(item.rawMaterialId) || 0,
        unitId: Number(item.unitId) || 0,
        originalQuantity: Number(item.qty) || 0,
        adjustedQuantity: Number(item.qty) || 0,
        originalRate: originalRate,
        revisedRate: revisedRate,
        rateDifference: rateDiff,
        taxableAmount: taxableAmount,
        cgstRate: Number(calc.cgstPct || 0),
        sgstRate: Number(calc.sgstPct || 0),
        igstRate: Number(calc.igstPct || 0),
        cessRate: Number(calc.cessPct || 0),
        remarks: item.remarks || '',
        batchNo: '',
        grnDetailId: Number(item.grnDetailId) || 0,
        purchaseOrderDetailId: Number(item.purchaseOrderDetailId) || 0,
        purchaseInvoiceDetailId: isEditMode && item.rowRef.id ? Number(item.rowRef.id) : 0,
      };
    });

    const stagedNote = {
      purchaseOrderId: debitNoteItems[0]?.purchaseOrderId ? Number(debitNoteItems[0].purchaseOrderId) : 0,
      grnId: debitNoteItems[0]?.grnId ? Number(debitNoteItems[0].grnId) : (activeGrnIds[0] ? Number(activeGrnIds[0]) : 0),
      remarks: debitNoteGeneralRemarks || 'Debit note created for rate difference',
      details,
      rowKeys: debitNoteItems.map(item => item.key)
    };

    setPendingDebitNotes(prev => [...prev, stagedNote]);

    setRows(prevRows =>
      prevRows.map(r => {
        const matchedModalItem = debitNoteItems.find(item => item.key === r.key);
        if (matchedModalItem) {
          const originalRate = Number(matchedModalItem.originalRate) || 0;
          const revisedRate = Number(matchedModalItem.revisedRate) || 0;
          return {
            ...r,
            rate: revisedRate || r.rate,
            hasDebitNote: true,
            debitNoteInfo: {
              originalRate,
              revisedRate,
              rateDifference: Number((originalRate - revisedRate).toFixed(2))
            }
          };
        }
        return r;
      })
    );

    toast.success('Debit note staged! It will be generated when you create the invoice.');
    setIsDebitModalOpen(false);
    setSelectedRowKeys([]);
  };

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
      toast.error('Unit is missing');
      return;
    }

    if (vendorStateId == null || outletStateId == null) {
      toast.error('Vendor or unit state is missing');
      return;
    }

    setIsSubmitting(true);

    try {
      const details = rows.map(r => {
        const calc = rowCalculation(r);

        return {
          grnDetailId: r.grnDetailId,
          purchaseOrderDetailId: r.purchaseOrderDetailId,
          unitId: Number(r.unitId) || 0,
          unitPrice: Number(r.rate) || 0,
          invoiceQuantity: Number(r.qty) || 0,
          discountPercentage: Number(r.discount) || 0,
          discountAmount: Number(calc.discountAmt.toFixed(2)),
          cgstRate: Number(calc.cgstPct || 0),
          sgstRate: Number(calc.sgstPct || 0),
          igstRate: Number(calc.igstPct || 0),
          cessRate: Number(calc.cessPct || 0),
          taxableAmount: Number(calc.taxable.toFixed(2)),
          cgstAmount: Number(calc.cgstAmt.toFixed(2)),
          sgstAmount: Number(calc.sgstAmt.toFixed(2)),
          igstAmount: Number(calc.igstAmt.toFixed(2)),
          cessAmount: Number(calc.cessAmt.toFixed(2)),
          tax: Number(calc.totalTax.toFixed(2)),
          lineTotal: Number(calc.total.toFixed(2))
        };
      });

      const payload = {
        subtotal: Number(totals.subtotal.toFixed(2)),
        discountPercentage: Number(discountPercentage) || 0,
        discountAmount: Number(totals.discountAmount.toFixed(2)),
        cgstAmount: Number(totals.totalCGST.toFixed(2)),
        sgstAmount: Number(totals.totalSGST.toFixed(2)),
        igstAmount: Number(totals.totalIGST.toFixed(2)),
        cessAmount: Number(totals.cessAmt.toFixed(2)),
        totalAmount: Number(totals.netAmount),
        roundOff: Number(totals.roundOff),
        details,
        grnIds: activeGrnIds.length > 0 ? activeGrnIds : [...new Set(rows.map(r => r.grnId).filter(id => id != null))],
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
        vendorInvoiceNumber: billNumber.trim(),
        images: attachedImages,
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

      const shouldApprove = approve || pendingDebitNotes.length > 0;
      if (shouldApprove) {
        await updatePurchaseInvoiceStatus(
          invoiceId,
          'APPROVED',
          Number(getUserIdFromToken()) || 0
        );
      }

      if (pendingDebitNotes.length > 0) {
        for (const note of pendingDebitNotes) {
          const debitPayload = {
            noteType: 'DEBIT_NOTE',
            adjustmentNature: 'RATE_DIFFERENCE',
            referenceType: 'PURCHASE_INVOICE',
            autoApprove: false,
            organizationId: Number(selectedOutletId) || 0,
            subOutletId: 0,
            subLocationId: 0,
            vendorId: Number(selectedVendorId) || 0,
            purchaseInvoiceId: invoiceId,
            purchaseOrderId: note.purchaseOrderId,
            grnId: note.grnId,
            noteDate: formatToDDMMYYYY(invoiceDate),
            remarks: note.remarks,
            vendorNoteNumber: '',
            userId: Number(getUserIdFromToken()) || 0,
            details: note.details.map(({ key, ...item }) => item)
          };

          try {
            await createDebitCreditNote(debitPayload);
          } catch (debitErr) {
            console.error('Failed to create debit note for invoice:', debitErr);
            toast.error(
              debitErr?.response?.data?.message ||
              debitErr?.response?.data?.msg ||
              'Invoice approved, but failed to generate debit note'
            );
          }
        }
      }

      toast.success(
        isEditMode
          ? 'Purchase invoice updated successfully'
          : 'Purchase invoice created and approved successfully'
      );
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

  const taxGridClass = isInterState
    ? totals.cessAmt > 0
      ? 'grid-cols-[1.1fr_1fr_1fr_24px_1.4fr]'
      : 'grid-cols-[1.1fr_1fr_1fr]'
    : totals.cessAmt > 0
      ? 'grid-cols-[1.1fr_1fr_1fr_24px_1fr_24px_1.5fr]'
      : 'grid-cols-[1.1fr_1fr_1fr_24px_1fr]';

  const hasAnyCessApplicable = useMemo(() => {
    return rows.some((row) => Boolean(row.isCessApplicable));
  }, [rows]);
  
  if (!canView) {
    return <AccessDenied pageTitle={isEditMode ? "Purchase Invoice List" : "Generate Purchase Invoice"} />;
  }

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

  if (!isEditMode && !rawGrnIds && !rows.length) {
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

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title={isEditMode ? 'Edit Purchase Invoice' : 'Generate Purchase Invoice'}
          description={isEditMode ? 'Update purchase invoice details' : 'Create purchase invoice from selected GRNs'}
          actions={
            <button
              type="button"
              onClick={() => navigate('/purchase/invoice-listing')}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </button>
          }
          className="mb-6"
        />

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
              <div className="w-full h-10 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate">
                {outletsLoading ? 'Loading...' : outletName}
              </div>
            </div>
          </div>
        </div>

        {/* Attached Invoices & Documents */}
        {attachedImages.length > 0 && (
          <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl p-3 sm:p-5 mb-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck size={17} className="text-[#084E92] shrink-0" />
                <h3 className="text-sm font-semibold text-[#084E92] uppercase truncate">
                  Attached Invoices & Documents
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {attachedImages.length} {attachedImages.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {attachedImages.map((img, idx) => {
                const filePath = img.path || img.filePath;
                const fileName = filePath ? filePath.split('/').pop() : 'invoice_document';

                return (
                  <div
                    key={img.id || idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-blue-100 text-[#084E92] flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {img.fileType || img.moduleName || 'Document'}
                        </p>
                      </div>
                    </div>

                    {filePath && (
                      <a
                        href={filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#084E92] hover:border-[#084E92] transition shrink-0"
                        title="View document"
                      >
                        <Eye size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-3 sm:px-5 py-4 border-b border-gray-200 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold text-gray-900">Invoice Items</h2>
              <p className="text-xs text-gray-500 mt-0.5">Overall discount updates all items. Individual discount can be changed separately.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenDebitNoteModal}
              disabled={selectedRowKeys.length === 0}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedRowKeys.length > 0
                  ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <FileMinus size={15} />
              Create Debit Note {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
            </button>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 uppercase text-gray-700">
                <tr>
                  <th className="w-8 px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectableRows.length > 0 && selectedRowKeys.length === selectableRows.length}
                      disabled={selectableRows.length === 0}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-[#084E92] focus:ring-0 cursor-pointer h-3.5 w-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="w-[18%] px-2 py-2.5 text-left font-semibold">Item Description</th>
                  <th className="w-[10%] px-1 py-2.5 text-left font-semibold">Unit</th>
                  <th className="w-[6%] px-1 py-2.5 text-right font-semibold">Qty</th>
                  <th className="w-[8%] px-1 py-2.5 text-right font-semibold">Rate (₹)</th>
                  <th className="w-[7%] px-1 py-2.5 text-right font-semibold">Disc(%)</th>
                  <th className="w-[8%] px-1 py-2.5 text-left font-semibold">HSN/SAC</th>
                  <th className="w-[6%] px-1 py-2.5 text-right font-semibold">GST(%)</th>
                  {hasAnyCessApplicable && (
                    <th className="w-[6%] px-1 py-2.5 text-right font-semibold">CESS(%)</th>
                  )}
                  <th className="w-[9%] px-1 py-2.5 text-right font-semibold">Amount(₹)</th>
                  <th className="w-[8%] px-1 py-2.5 text-right font-semibold leading-tight">Tax (₹)</th>
                  <th className="w-[9%] px-1 py-2.5 text-right font-semibold leading-tight">Total (₹)</th>
                  <th className="w-9 px-1 py-2.5 text-center font-semibold">Act</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-xs">
                {rows.map(row => {
                  const calc = rowCalculation(row);
                  const isChecked = selectedRowKeys.includes(row.key);

                  return (
                    <tr key={row.key} className={`hover:bg-gray-50/70 ${isChecked ? 'bg-blue-50/30' : ''} ${row.hasDebitNote ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={row.hasDebitNote}
                          onChange={() => handleToggleSelectRow(row.key)}
                          title={row.hasDebitNote ? 'Debit note created/staged for this item' : ''}
                          className={`rounded border-gray-300 text-[#084E92] focus:ring-0 h-3.5 w-3.5 ${row.hasDebitNote ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'
                            }`}
                        />
                      </td>

                      <td className="px-2 py-2.5 min-w-0">
                        <div className="font-medium text-[#084E92] truncate" title={row.itemName}>
                          {row.itemName}
                        </div>
                        {row.hasDebitNote && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit max-w-full">
                            <FileMinus size={11} className="shrink-0 text-amber-600" />
                            <span className="font-semibold shrink-0">Debit Note</span>
                            {row.debitNoteInfo && (
                              <span className="truncate text-gray-500 font-mono">
                                (₹{row.debitNoteInfo.originalRate}→₹{row.debitNoteInfo.revisedRate})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDebitNote(row.key)}
                              title="Remove staged debit note"
                              className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-1 py-2.5">
                        <Select
                          value={row.unitId != null && row.unitId !== '' ? String(row.unitId) : undefined}
                          onValueChange={value => updateUnit(row.key, value)}
                        >
                          <SelectTrigger className="h-8 w-full border-gray-200 text-xs px-2 focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Unit" />
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

                      <td className="px-1 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={e => updateRow(row.key, 'qty', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-full h-8 px-1.5 rounded-md border border-gray-200 text-xs text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-1 py-2.5  font-medium text-right text-gray-700">
                        {formatCurrency(row.rate)}
                      </td>

                      <td className="px-1 py-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.discount}
                          onChange={e => handleItemDiscountChange(row.key, e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-full h-8 px-1.5 rounded-md border border-gray-200 text-xs text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-1 py-2.5">
                        <input
                          value={row.hsn}
                          onChange={e => updateRow(row.key, 'hsn', e.target.value)}
                          placeholder="HSN"
                          className="w-full h-8 px-1.5 rounded-md border border-gray-200 text-xs outline-none focus:border-[#084E92]"
                        />
                      </td>

                      <td className="px-1 py-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.gst}
                          onChange={e => updateRow(row.key, 'gst', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-full h-8 px-1.5 rounded-md border border-gray-200 text-xs text-right outline-none focus:border-[#084E92]"
                        />
                      </td>

                      {hasAnyCessApplicable && (
                        <td className="px-1 py-2.5 text-right">
                          {row.isCessApplicable ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.cess}
                              onChange={e => updateRow(row.key, 'cess', e.target.value)}
                              onWheel={e => e.currentTarget.blur()}
                              className="w-full h-8 px-1.5 rounded-md border border-gray-200 text-xs text-right outline-none focus:border-[#084E92]"
                            />
                          ) : (
                            <span className="text-gray-400 font-medium">-</span>
                          )}
                        </td>
                      )}

                      <td className="px-1 py-2.5 text-right font-medium text-gray-900 truncate">
                        {formatCurrency(calc.taxableAmount)}
                      </td>

                      <td className="px-1 py-2.5 text-right font-medium text-orange-600 truncate">
                        {formatCurrency(calc.totalTax)}
                      </td>

                      <td className="px-1 py-2.5 text-right font-semibold text-gray-900 truncate">
                        {formatCurrency(calc.total)}
                      </td>

                      <td className="px-1 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td colSpan={hasAnyCessApplicable ? 13 : 12} className="px-4 py-8 text-center text-gray-500">
                      No invoice items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <CreateDebitNoteModal
          isOpen={isDebitModalOpen}
          onClose={() => setIsDebitModalOpen(false)}
          items={debitNoteItems}
          onItemChange={updateDebitModalItem}
          generalRemarks={debitNoteGeneralRemarks}
          onGeneralRemarksChange={setDebitNoteGeneralRemarks}
          onSubmit={handleStageDebitNote}
          isSubmitting={isCreatingDebitNote}
        />

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
                taxBreakdown.map((rate, idx) => (
                  <div
                    key={`${rate.gstPct}_${rate.cessPct}_${idx}`}
                    className={`grid ${taxGridClass} items-center px-2 py-2.5 border-b border-gray-100 min-w-max text-xs`}
                  >
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-md bg-blue-50 text-[#084E92] font-semibold text-xs whitespace-nowrap">
                        {Number(rate.gstPct).toFixed(2)}% GST
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
                    <div className="text-right">{formatCurrency(totals.totalSGST)}</div>
                    <div></div>
                    <div className="text-right">{formatCurrency(totals.totalCGST)}</div>
                  </>
                ) : (
                  <div className="text-right text-[#084E92]">{formatCurrency(totals.totalIGST)}</div>
                )}

                {totals.cessAmt > 0 && (
                  <>
                    <div></div>
                    <div className="text-right text-[#084E92]">{formatCurrency(totals.totalCESS)}</div>
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

          {pendingDebitNotes.length === 0 && (
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={isSubmitting || invoiceLoading || !rows.length}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#084E92] text-[#084E92] cursor-pointer text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
            >
              {isEditMode ? 'Update Draft' : 'Save Draft'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={isSubmitting || invoiceLoading || !rows.length}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer bg-[#084E92] text-white text-sm font-medium hover:bg-[#063d73] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditMode ? 'Update' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </Container>
  );
};

export default GenerateGrnInvoice;