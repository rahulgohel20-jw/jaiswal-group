// ============================================
// File: src/pages/purchase-order-requests/PurchaseOrderDetail.jsx
//
// Read-only PO detail view, reached from the View action wherever a PO
// is in a terminal or non-editable state (Approved, Rejected, Closed,
// Partially Received, etc).
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Building2,
  Calendar,
  ArrowLeft,
  ClipboardList,
  ScrollText,
  Package,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Truck,
  Info,
  Download,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import PurchaseOrderLog from './PurchaseOrderLog';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { checkIsInterState, numberToWords, formatCurrency } from './utils/taxUtils';
import { getVendorById, getCompanyById } from '@/services/apiServices';
import { useExportReport } from '@/hooks/useExportReport';
import { toast } from 'sonner';

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, trailing }) => (
  <div className="flex items-center justify-between px-5 pt-5 pb-4">
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
    {trailing}
  </div>
);

const STATUS_STYLES = {
  Draft: 'bg-yellow-50 text-yellow-700',
  'Sent for Approval': 'bg-amber-50 text-amber-600',
  'In Progress': 'bg-blue-50 text-blue-600',
  Approved: 'bg-emerald-50 text-emerald-600',
  Rejected: 'bg-rose-50 text-rose-600',
  'Partially Received': 'bg-purple-50 text-purple-600',
  Closed: 'bg-gray-100 text-gray-500',
  'TO BE GENERATED': 'bg-gray-100 text-gray-500',
};

const STATUS_DOT = {
  Draft: 'bg-yellow-500',
  'Sent for Approval': 'bg-amber-500',
  'In Progress': 'bg-blue-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
  'Partially Received': 'bg-purple-500',
  Closed: 'bg-gray-400',
  'TO BE GENERATED': 'bg-gray-400',
};

const StatusBadge = ({ status, size = 'md' }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${
      size === 'lg' ? 'text-sm px-3.5 py-2' : 'text-sm px-3 py-1.5'
    } ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
    {status}
  </span>
);

const InfoTile = ({ label, value, icon: Icon, className = '' }) => (
  <div className={`rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5 ${className}`}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800">{value ?? '—'}</p>
  </div>
);

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const firstPart = String(dateStr).split(' ')[0];
  return firstPart || dateStr;
};

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canView } = usePagePermissions('Purchase Order Requests');
  const { current: po, loading, error, fetchById } = usePurchaseOrders();
  const [logOpen, setLogOpen] = useState(false);
  const { exporting, exportReport } = useExportReport();
  const [fetchedBillTo, setFetchedBillTo] = useState(null);
  const [fetchedShipTo, setFetchedShipTo] = useState(null);

  const handleExportReport = () => {
    if (!po?.id) {
      toast.error('Purchase Order ID not found.');
      return;
    }

    const rawStatus = String(po?.status || po?.rawStatus || '').toUpperCase().trim();
    if (rawStatus === 'AWAITING_PO' || rawStatus === 'PR_NO_PO' || rawStatus === 'TO BE GENERATED') {
      toast.error('Export report is not available while awaiting PO creation.');
      return;
    }

    exportReport(
      {
        id: Number(po.id),
        type: 'purchase type 1',
      },
      {
        fileName: `PO_Report_${po.poCode || po.id}.pdf`,
        successMessage: 'Purchase Order report downloaded successfully.',
        errorMessage: 'Failed to export Purchase Order report.',
      }
    );
  };

  useEffect(() => {
    if (id) fetchById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fallback: fetch vendor address if missing
  useEffect(() => {
    if (po?.billTo) return;
    const vendorId = po?.vendorId || po?.details?.find((d) => d.vendorId)?.vendorId;
    if (!vendorId) return;
    let isCancelled = false;
    getVendorById(vendorId)
      .then((res) => {
        if (isCancelled) return;
        const v = res?.data?.data ?? res?.data;
        if (v) {
          setFetchedBillTo({
            vendorId: v.id,
            vendorName: v.name || v.vendorName,
            addressLine1: v.addressLine1 || v.address,
            addressLine2: v.addressLine2,
            cityName: v.cityName || v.city,
            stateId: v.stateId,
            stateName: v.stateName || v.state,
            countryName: v.countryName || v.country,
            pincode: v.pincode,
            phoneNumber: v.phoneNumber || v.phone,
            gstNumber: v.gstNumber || v.gstin,
            panNumber: v.panNumber || v.pan,
          });
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [po?.billTo, po?.vendorId, po?.details]);

  // Fallback: fetch outlet address if missing
  useEffect(() => {
    if (po?.shipTo) return;
    const outletId = po?.outletId;
    if (!outletId) return;
    let isCancelled = false;
    getCompanyById(outletId)
      .then((res) => {
        if (isCancelled) return;
        const c = res?.data?.data ?? res?.data;
        if (c) {
          setFetchedShipTo({
            id: c.id,
            companyNameEnglish: c.companyNameEnglish || c.name,
            companyCode: c.companyCode || c.code,
            addressEnglish: c.addressEnglish || c.address,
            addressline2: c.addressline2,
            cityName: c.cityName || c.city,
            stateId: c.stateId,
            stateName: c.stateName || c.state,
            countryName: c.countryName || c.country,
            pincode: c.pincode,
            mobilenumber: c.mobilenumber || c.phone,
            emailid: c.emailid || c.email,
            gstNumber: c.gstNumber,
            panNumber: c.panNumber,
          });
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [po?.shipTo, po?.outletId]);

  const billTo = po?.billTo || fetchedBillTo || null;
  const shipTo = po?.shipTo || fetchedShipTo || null;
  const isInterState = useMemo(() => checkIsInterState(billTo, shipTo), [billTo, shipTo]);

  const isGstApplicable = useMemo(() => {
    if (po?.isGstApplicable !== undefined && po?.isGstApplicable !== null) {
      return Boolean(po.isGstApplicable);
    }
    if (billTo?.isGstApplicable !== undefined && billTo?.isGstApplicable !== null) {
      return Boolean(billTo.isGstApplicable);
    }
    return false;
  }, [po?.isGstApplicable, billTo?.isGstApplicable]);

  const calculatedTotals = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCESS = 0;
    const taxRateGroups = {};

    const items = (po?.details || []).map((item) => {
      const qty = Number(item.quantity ?? item.orderedQuantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxable = qty * unitPrice;
      totalTaxable += taxable;

      const cessPct = isGstApplicable ? (Number(item.cess) || 0) : 0;
      const cessAmt = (taxable * cessPct) / 100;
      totalCESS += cessAmt;

      let cgstPct = 0;
      let sgstPct = 0;
      let igstPct = 0;
      let cgstAmt = 0;
      let sgstAmt = 0;
      let igstAmt = 0;
      let gstPct = 0;
      let itemTax = 0;

      if (isGstApplicable) {
        if (isInterState) {
          igstPct = item.igst != null && Number(item.igst) > 0 
            ? Number(item.igst) 
            : ((item.cgst != null && item.sgst != null && Number(item.cgst) + Number(item.sgst) > 0)
              ? Number(item.cgst) + Number(item.sgst)
              : (item.tax != null && Number(item.tax) > 0 ? Number(item.tax) : 18));
          gstPct = igstPct;
          igstAmt = (taxable * igstPct) / 100;
          totalIGST += igstAmt;
          itemTax = igstAmt + cessAmt;
        } else {
          cgstPct = item.cgst != null && Number(item.cgst) > 0
            ? Number(item.cgst)
            : (item.tax != null && Number(item.tax) > 0 ? Number(item.tax) / 2 : 9);
          sgstPct = item.sgst != null && Number(item.sgst) > 0
            ? Number(item.sgst)
            : (item.tax != null && Number(item.tax) > 0 ? Number(item.tax) / 2 : 9);
          gstPct = cgstPct + sgstPct;
          cgstAmt = (taxable * cgstPct) / 100;
          sgstAmt = (taxable * sgstPct) / 100;
          totalCGST += cgstAmt;
          totalSGST += sgstAmt;
          itemTax = cgstAmt + sgstAmt + cessAmt;
        }

        const rateKey = `${gstPct}_${cessPct}`;
        if (!taxRateGroups[rateKey]) {
          taxRateGroups[rateKey] = {
            gstPct,
            cessPct,
            cgstPct,
            sgstPct,
            igstPct,
            taxable: 0,
            cgstAmt: 0,
            sgstAmt: 0,
            igstAmt: 0,
            gstAmt: 0,
            cessAmt: 0,
          };
        }
        taxRateGroups[rateKey].taxable += taxable;
        taxRateGroups[rateKey].cgstAmt += cgstAmt;
        taxRateGroups[rateKey].sgstAmt += sgstAmt;
        taxRateGroups[rateKey].igstAmt += igstAmt;
        taxRateGroups[rateKey].cessAmt = (taxRateGroups[rateKey].cessAmt || 0) + cessAmt;
      }

      const itemTotal = taxable + itemTax;

      return {
        ...item,
        qty,
        unitPrice,
        taxable,
        gstPct,
        cgstPct,
        sgstPct,
        igstPct,
        cessPct,
        cgstAmt,
        sgstAmt,
        igstAmt,
        cessAmt,
        itemTax,
        itemTotal,
      };
    });

    const taxBreakdowns = Object.values(taxRateGroups).sort((a, b) => b.gstPct - a.gstPct || b.cessPct - a.cessPct);

    const totalOtherCosts = Number(po?.totalOtherCosts) || (
      Array.isArray(po?.otherCosts)
        ? po.otherCosts.reduce((sum, item) => {
            const val = Number(item.cost);
            return sum + (!isNaN(val) && val > 0 ? val : 0);
          }, 0)
        : 0
    );

    const totalGST = isGstApplicable ? (isInterState ? totalIGST : totalCGST + totalSGST) : 0;
    const totalTax = isGstApplicable ? totalGST + totalCESS : 0;
    const rawNet = totalTaxable + totalTax + totalOtherCosts;
    const roundOff = po?.roundOff != null ? Number(po.roundOff) : Number((Math.round(rawNet) - rawNet).toFixed(2));
    const netAmount = Number((rawNet + roundOff).toFixed(2));
    const roundedNet = Math.round(netAmount);

    return {
      items,
      taxBreakdowns,
      totalTaxable,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      totalCESS,
      totalTax,
      totalOtherCosts,
      rawNet,
      netAmount,
      roundedNet,
      roundOff,
      amountInWords: numberToWords(roundedNet),
    };
  }, [po, isInterState, isGstApplicable]);

  if (!canView) {
    return <AccessDenied pageTitle="Purchase Order Requests" />;
  }

  const displayStatus = po?.status ?? '';
  const isDecided = displayStatus === 'Approved' || displayStatus === 'Rejected';
  const itemCount = po?.details?.length ?? 0;

  if (loading && !po) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center text-gray-400">Loading...</div>
      </Container>
    );
  }

  if (error || !po) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center text-red-500">
          Failed to load purchase order.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 mt-4">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <Link
            to="/purchase/purchase-order-requests"
            className="cursor-pointer hover:text-[#084E92] transition"
          >
            Purchase Orders
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">{po?.poCode}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#084E92] to-[#0B65BD] px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer border-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {po?.poCode || 'Purchase Order'}
              </h1>
              <p className="text-blue-100/80 text-xs mt-0.5">Purchase order details, addresses, and line items</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={displayStatus} size="lg" />
            <button
              type="button"
              onClick={handleExportReport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/95 text-sm font-semibold text-[#084E92] hover:bg-white transition cursor-pointer border-0 shadow-sm disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/95 text-sm font-semibold text-[#084E92] hover:bg-white transition cursor-pointer border-0 shadow-sm"
            >
              <ScrollText className="w-4 h-4" />
              See Activity Log
            </button>
          </div>
        </div>

        {/* Order Details */}
        <SectionCard className="mt-5">
          <SectionHeader icon={Calendar} title="Order Details" />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoTile label="PO Date" value={po?.date || (po?.createdAt ? formatDateOnly(po.createdAt) : '—')} />
              <InfoTile label="Expected Delivery Date" value={po?.expectedDeliveryDate || '—'} />
              <InfoTile label="Created By" value={po?.createdByName || po?.raisedBy || '—'} />
              <InfoTile label="Last Updated By" value={po?.updatedByName || (po?.updatedBy ? String(po?.updatedBy) : '—')} />
              <InfoTile label="Outlet / Branch" value={po?.outlet} icon={Building2} className="col-span-2 sm:col-span-4" />
            </div>

            {po?.remarks && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3.5 mt-3">
                <p className="text-[11px] font-bold text-[#084E92] uppercase tracking-wide mb-1.5">
                  Terms & Delivery Notes
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{po.remarks}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Bill To & Ship To Addresses */}
        <SectionCard className="mt-5 overflow-hidden">
          <SectionHeader
            icon={MapPin}
            title="Address & Tax Configuration"
            trailing={
              isGstApplicable ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isInterState
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isInterState ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {isInterState
                    ? 'Inter-State Supply (IGST 18%)'
                    : 'Intra-State Supply (CGST 9% + SGST 9%)'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Non-GST Supply
                </span>
              )
            }
          />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-100">
            {/* Bill To (Vendor Address) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 relative">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#084E92]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                    Bill To (Vendor Address)
                  </span>
                </div>
              </div>

              {billTo ? (
                <div className="space-y-1 text-xs text-gray-700">
                  <p className="font-bold text-sm text-gray-900">
                    {po?.vendorName || billTo?.vendorName || 'Vendor'}
                  </p>
                  {billTo.addressLine1 && <p>{billTo.addressLine1}</p>}
                  {billTo.addressLine2 && <p>{billTo.addressLine2}</p>}
                  <p className="font-medium text-gray-800">
                    {[billTo.cityName, billTo.stateName, billTo.pincode, billTo.countryName].filter(Boolean).join(', ')}
                  </p>
                  <div className="pt-2 mt-2 border-t border-gray-200/60 flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                    {billTo.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {billTo.phoneNumber}
                      </span>
                    )}
                    {isGstApplicable && billTo.gstNumber && (
                      <span>
                        <strong className="text-gray-700">GSTIN:</strong> {billTo.gstNumber}
                      </span>
                    )}
                    {billTo.panNumber && (
                      <span>
                        <strong className="text-gray-700">PAN:</strong> {billTo.panNumber}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-800">{po?.vendorName || 'Vendor'}</p>
                  <p className="text-gray-400 italic">No detailed billing address record available.</p>
                </div>
              )}
            </div>

            {/* Ship To (Outlet Address) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 relative">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#084E92]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                    Ship To (Outlet Delivery Address)
                  </span>
                </div>
              </div>

              {shipTo ? (
                <div className="space-y-1 text-xs text-gray-700">
                  <p className="font-bold text-sm text-gray-900">
                    {shipTo.companyNameEnglish || po?.outlet || 'Outlet'}
                    {shipTo.companyCode ? ` (${shipTo.companyCode})` : ''}
                  </p>
                  {shipTo.addressEnglish && <p>{shipTo.addressEnglish}</p>}
                  {shipTo.addressline2 && <p>{shipTo.addressline2}</p>}
                  <p className="font-medium text-gray-800">
                    {[shipTo.cityName, shipTo.stateName, shipTo.pincode, shipTo.countryName].filter(Boolean).join(', ')}
                  </p>
                  <div className="pt-2 mt-2 border-t border-gray-200/60 flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                    {(shipTo.mobilenumber || shipTo.alternatemobilenumber) && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {shipTo.mobilenumber || shipTo.alternatemobilenumber}
                      </span>
                    )}
                    {shipTo.emailid && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {shipTo.emailid}
                      </span>
                    )}
                    {shipTo.gstNumber && (
                      <span>
                        <strong className="text-gray-700">GSTIN:</strong> {shipTo.gstNumber}
                      </span>
                    )}
                    {shipTo.panNumber && (
                      <span>
                        <strong className="text-gray-700">PAN:</strong> {shipTo.panNumber}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-800">{po?.outlet || 'Outlet'}</p>
                  <p className="text-gray-400 italic">No detailed shipping address record available.</p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Approval / Rejection details */}
        {isDecided && (
          <SectionCard className="mt-5">
            <SectionHeader icon={CheckCircle2} title={`${displayStatus} Details`} />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile label={`${displayStatus} By`} value={po?.updatedByName || (po?.updatedBy ? String(po?.updatedBy) : '—')} />
                <InfoTile label={`${displayStatus} On`} value={formatDateOnly(po?.updatedAt) || po?.updatedAt || '—'} />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Purchase Items */}
        <SectionCard className="mt-5 overflow-hidden">
          <SectionHeader
            icon={ClipboardList}
            title="Purchase Items"
            trailing={
              <span className="text-[11px] font-bold text-[#084E92] bg-blue-50 px-2.5 py-1 rounded-full">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            }
          />
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-2 py-3 w-48">Item Description</th>
                  <th className="text-center font-semibold px-2 py-3 w-20">Unit</th>
                  <th className="text-left font-semibold px-2 py-3 w-44">Vendor</th>
                  <th className="text-center font-semibold px-2 py-3 w-16">Ordered</th>
                  <th className="text-center font-semibold px-2 py-3 w-16">Received</th>
                  <th className="text-right font-semibold px-2 py-3 w-20">Rate (₹)</th>
                  {isGstApplicable ? (
                    <>
                      <th className="text-center font-semibold px-2 py-3 w-20">HSN/SAC</th>
                      <th className="text-center font-semibold px-1 py-3 w-14">GST (%)</th>
                      <th className="text-center font-semibold px-1 py-3 w-14">CESS (%)</th>
                      <th className="text-right font-semibold px-2 py-3 w-24">Amount w/o Tax (₹)</th>
                      <th className="text-right font-semibold px-2 py-3 w-20">Tax Applied (₹)</th>
                      <th className="text-right font-semibold px-3 py-3 w-28">Total Amount (₹)</th>
                    </>
                  ) : (
                    <th className="text-right font-semibold px-4 py-3 w-auto min-w-[130px]">
                      Amount (₹)
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {itemCount === 0 ? (
                  <tr>
                    <td colSpan={isGstApplicable ? 12 : 7} className="px-5 py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-6 h-6 text-gray-300" />
                        No items on this purchase order.
                      </div>
                    </td>
                  </tr>
                ) : (
                  calculatedTotals.items.map((item) => (
                    <tr key={item.id ?? item.rawMaterialId} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-2 py-3 text-gray-800 font-medium text-xs align-top w-48">
                        <p className="font-semibold text-gray-900">{item.rawMaterialName}</p>
                        {item.remarks && (
                          <p className="text-[11px] text-gray-500 mt-0.5 italic">
                            {item.remarks}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center align-top w-20">
                        <span className="inline-block text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.uomName}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-600 text-xs truncate max-w-[160px] align-top w-44" title={item.vendorName || ''}>
                        {item.vendorName || '—'}
                      </td>
                      <td className="px-2 py-3 text-center font-medium text-gray-700 text-xs align-top w-16">{item.qty}</td>
                      <td className="px-2 py-3 text-center text-gray-600 text-xs align-top w-16">{item.receivedQuantity ?? 0}</td>
                      <td className="px-2 py-3 text-right text-gray-600 text-xs font-mono align-top w-20">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      {isGstApplicable ? (
                        <>
                          <td className="px-2 py-3 text-center font-mono text-xs text-gray-600 align-top w-20">
                            {item.hsnCode || '—'}
                          </td>
                          <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">
                            {item.gstPct}%
                          </td>
                          <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">
                            {item.cessPct > 0 ? `${item.cessPct}%` : '0%'}
                          </td>
                          <td className="px-2 py-3 text-right font-medium text-xs text-gray-700 font-mono align-top w-24 whitespace-nowrap">
                            ₹{item.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-3 text-right font-medium text-xs text-amber-700 font-mono align-top w-20 whitespace-nowrap">
                            ₹{item.itemTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs font-mono align-top w-28 whitespace-nowrap">
                            ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs font-mono align-top w-auto min-w-[130px] whitespace-nowrap">
                          ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary / Tax / Other Costs Footer */}
          <div className="border-t border-gray-100 bg-[#F8FAFC] p-5">
            {/* If GST is applicable and there are other costs, show them at the top */}
            {isGstApplicable && Array.isArray(po?.otherCosts) && po.otherCosts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92] mb-3 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  Other Costing / Charges (Transportation, Handling, etc.)
                </h3>
                <div className="space-y-2">
                  {po.otherCosts.map((c, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg text-xs">
                      <span className="font-medium text-gray-800">{c.label || 'Other Charge'}</span>
                      <span className="font-bold text-gray-900 font-mono">
                        ₹{Number(c.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                {calculatedTotals.totalOtherCosts > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-start items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-500 uppercase tracking-wider">Total Other Costs:</span>
                    <span className="font-bold text-gray-900 font-mono">
                      ₹{calculatedTotals.totalOtherCosts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Left Column: If GST is applicable -> Tax Breakdown. If GST NOT applicable -> Other Costing / Charges */}
              {isGstApplicable ? (
                <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92] flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" />
                      Tax Breakdown {isInterState ? '(Inter-State IGST)' : '(Intra-State CGST + SGST)'}
                    </h3>
                    <span className="text-[10px] font-semibold bg-blue-50 text-[#084E92] px-2.5 py-0.5 rounded-full border border-blue-100">
                      GST Rate Breakdown
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px]">
                          <th className="pb-2.5 px-2 text-left whitespace-nowrap">TAX RATE</th>
                          <th className="pb-2.5 px-2 text-right whitespace-nowrap">TAXABLE AMT</th>
                          {!isInterState ? (
                            <>
                              <th className="pb-2.5 px-2 text-right whitespace-nowrap">SGST</th>
                              <th className="pb-2.5 w-6 text-center"></th>
                              <th className="pb-2.5 px-2 text-right whitespace-nowrap">CGST</th>
                            </>
                          ) : (
                            <th className="pb-2.5 px-2 text-right whitespace-nowrap">IGST</th>
                          )}
                          {calculatedTotals.totalCESS > 0 && (
                            <>
                              <th className="pb-2.5 w-6 text-center"></th>
                              <th className="pb-2.5 px-2 text-right whitespace-nowrap">CESS</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {calculatedTotals.taxBreakdowns && calculatedTotals.taxBreakdowns.length > 0 ? (
                          calculatedTotals.taxBreakdowns.map((rate, idx) => (
                            <tr key={`${rate.gstPct}_${rate.cessPct || 0}_${idx}`} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2.5 px-2 font-sans whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#084E92] border border-blue-100">
                                  {Number(rate.gstPct).toFixed(2)}% GST
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5 font-mono">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-sans">
                                    of
                                  </span>
                                  <span className="font-semibold text-gray-800">
                                    ₹{Number(rate.taxable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100/90 text-gray-500 font-bold text-[11px] font-sans">
                                    =
                                  </span>
                                </div>
                              </td>
                              {!isInterState ? (
                                <>
                                  <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                    ₹{Number(rate.sgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 w-6 px-0.5 text-center">
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">
                                      +
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                    ₹{Number(rate.cgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </>
                              ) : (
                                <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                  ₹{Number(rate.igstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              )}
                              {calculatedTotals.totalCESS > 0 && (
                                <>
                                  <td className="py-2.5 w-6 px-0.5 text-center">
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-50 text-[#084E92] font-bold text-[11px] font-sans border border-blue-100">
                                      +
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono font-semibold text-gray-800">
                                    <div className="inline-flex items-center justify-end gap-1.5 font-mono">
                                      <span>
                                        ₹{Number(rate.cessAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      {Number(rate.cessPct || 0) > 0 ? (
                                        <span className="text-[10px] font-sans font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          ({Number(rate.cessPct)}% CESS)
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={!isInterState ? (calculatedTotals.totalCESS > 0 ? 7 : 5) : (calculatedTotals.totalCESS > 0 ? 5 : 3)} className="py-4 text-center text-gray-400 italic">
                              No taxable line items
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-dashed border-gray-300 font-bold text-gray-900 font-mono">
                          <td className="pt-3 px-2 font-sans uppercase tracking-wider text-xs whitespace-nowrap">TOTAL</td>
                          <td className="pt-3 px-2 text-right whitespace-nowrap">
                            ₹{Number(calculatedTotals.totalTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {!isInterState ? (
                            <>
                              <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                ₹{Number(calculatedTotals.totalSGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="pt-3 w-6 px-0.5"></td>
                              <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                ₹{Number(calculatedTotals.totalCGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          ) : (
                            <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                              ₹{Number(calculatedTotals.totalIGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          )}
                          {calculatedTotals.totalCESS > 0 && (
                            <>
                              <td className="pt-3 w-6 px-0.5"></td>
                              <td className="pt-3 px-2 text-right text-[#084E92] whitespace-nowrap">
                                ₹{Number(calculatedTotals.totalCESS).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* Non-GST View: Left column is Other Costing / Charges */
                <div className="xl:col-span-7 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92] mb-3 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4" />
                      Other Costing / Charges
                    </h3>
                    {Array.isArray(po?.otherCosts) && po.otherCosts.length > 0 ? (
                      <div className="space-y-2">
                        {po.otherCosts.map((c, i) => (
                          <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg text-xs">
                            <span className="font-medium text-gray-800">{c.label || 'Other Charge'}</span>
                            <span className="font-bold text-gray-900 font-mono">
                              ₹{Number(c.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic py-3">No additional charges attached to this purchase order.</p>
                    )}
                  </div>
                  {calculatedTotals.totalOtherCosts > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-500 uppercase tracking-wider">Total Other Costs:</span>
                      <span className="font-bold text-gray-900 font-mono">
                        ₹{calculatedTotals.totalOtherCosts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Right: Net Total & In words */}
              <div className="xl:col-span-5 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">{isGstApplicable ? 'Sub Total (Taxable):' : 'Sub Total:'}</span>
                    <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTaxable)}</span>
                  </div>
                  {isGstApplicable && (
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Total Tax:</span>
                      <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTax)}</span>
                    </div>
                  )}
                  {calculatedTotals.totalOtherCosts > 0 && (() => {
                    const labels = (Array.isArray(po?.otherCosts) ? po.otherCosts : [])
                      .map((c) => (c.label || '').trim())
                      .filter(Boolean);
                    const displayTitle = labels.length > 0
                      ? `Other Costs (${labels.join(', ')}):`
                      : 'Other Costs:';
                    return (
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500 truncate max-w-[220px]" title={displayTitle}>
                          {displayTitle}
                        </span>
                        <span className="font-semibold text-gray-800 font-mono">
                          +{formatCurrency(calculatedTotals.totalOtherCosts)}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Round Off:</span>
                    <span className="font-semibold text-gray-600 font-mono">
                      {calculatedTotals.roundOff >= 0 ? `+${calculatedTotals.roundOff}` : `${calculatedTotals.roundOff}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Net Total:</span>
                    <span className="text-xl font-bold text-[#084E92] font-mono">
                      {formatCurrency(calculatedTotals.netAmount)}
                    </span>
                  </div>
                </div>

                {calculatedTotals.amountInWords && (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-gray-200 bg-blue-50/50 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Amount in Words</p>
                    <p className="text-xs font-semibold text-[#084E92] italic">
                      {calculatedTotals.amountInWords}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Slide-over Activity Log */}
        <PurchaseOrderLog
          open={logOpen}
          onClose={() => setLogOpen(false)}
          poCode={po?.poCode}
          moduleId={po?.id}
          moduleName="PURCHASE_ORDER"
        />
      </div>
    </Container>
  );
};

export default PurchaseOrderDetail;