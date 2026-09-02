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
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import PurchaseOrderLog from './PurchaseOrderLog';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { checkIsInterState, numberToWords, formatCurrency } from './utils/taxUtils';
import { getVendorById, getCompanyById } from '@/services/apiServices';

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
  const [fetchedBillTo, setFetchedBillTo] = useState(null);
  const [fetchedShipTo, setFetchedShipTo] = useState(null);

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

  const calculatedTotals = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCESS = 0;

    const items = (po?.details || []).map((item) => {
      const qty = Number(item.quantity ?? item.orderedQuantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxable = qty * unitPrice;
      totalTaxable += taxable;

      const cessPct = Number(item.cess) || 0;
      const cessAmt = (taxable * cessPct) / 100;
      totalCESS += cessAmt;

      let cgstPct = 0;
      let sgstPct = 0;
      let igstPct = 0;
      let cgstAmt = 0;
      let sgstAmt = 0;
      let igstAmt = 0;
      let itemTax = 0;

      if (isInterState) {
        igstPct = item.igst != null && Number(item.igst) > 0 
          ? Number(item.igst) 
          : ((item.cgst != null && item.sgst != null && Number(item.cgst) + Number(item.sgst) > 0)
            ? Number(item.cgst) + Number(item.sgst)
            : (item.tax != null && Number(item.tax) > 0 ? Number(item.tax) : 18));
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
        cgstAmt = (taxable * cgstPct) / 100;
        sgstAmt = (taxable * sgstPct) / 100;
        totalCGST += cgstAmt;
        totalSGST += sgstAmt;
        itemTax = cgstAmt + sgstAmt + cessAmt;
      }

      const itemTotal = taxable + itemTax;

      return {
        ...item,
        qty,
        unitPrice,
        taxable,
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

    const totalGST = isInterState ? totalIGST : totalCGST + totalSGST;
    const totalTax = totalGST + totalCESS;
    const rawNet = totalTaxable + totalTax;
    const roundOff = po?.roundOff != null ? Number(po.roundOff) : Number((Math.round(rawNet) - rawNet).toFixed(2));
    const netAmount = Number((rawNet + roundOff).toFixed(2));
    const roundedNet = Math.round(netAmount);

    return {
      items,
      totalTaxable,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      totalCESS,
      totalTax,
      rawNet,
      netAmount,
      roundedNet,
      roundOff,
      amountInWords: numberToWords(netAmount),
    };
  }, [po, isInterState]);

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
          <div className="flex items-center gap-2.5">
            <StatusBadge status={displayStatus} size="lg" />
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
                    {billTo.gstNumber && (
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
                  <th className="text-left font-semibold px-2 py-3 w-52">Item Description</th>
                  <th className="text-center font-semibold px-2 py-3 w-20">Unit</th>
                  <th className="text-left font-semibold px-2 py-3 w-52">Vendor</th>
                  <th className="text-center font-semibold px-2 py-3 w-16">Ordered</th>
                  <th className="text-center font-semibold px-2 py-3 w-16">Received</th>
                  <th className="text-right font-semibold px-2 py-3 w-20">Rate (₹)</th>
                  <th className="text-center font-semibold px-2 py-3 w-20">HSN/SAC</th>
                  {!isInterState ? (
                    <>
                      <th className="text-center font-semibold px-1 py-3 w-14">CGST (%)</th>
                      <th className="text-center font-semibold px-1 py-3 w-14">SGST (%)</th>
                    </>
                  ) : (
                    <th className="text-center font-semibold px-1 py-3 w-14">IGST (%)</th>
                  )}
                  <th className="text-center font-semibold px-1 py-3 w-14">CESS (%)</th>
                  <th className="text-right font-semibold px-4 py-3 w-auto min-w-[130px]">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {itemCount === 0 ? (
                  <tr>
                    <td colSpan={!isInterState ? 10 : 9} className="px-5 py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-6 h-6 text-gray-300" />
                        No items on this purchase order.
                      </div>
                    </td>
                  </tr>
                ) : (
                  calculatedTotals.items.map((item) => (
                    <tr key={item.id ?? item.rawMaterialId} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-2 py-3 text-gray-800 font-medium text-xs align-top w-52">
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
                      <td className="px-2 py-3 text-gray-600 text-xs truncate max-w-[180px] align-top w-52" title={item.vendorName || ''}>
                        {item.vendorName || '—'}
                      </td>
                      <td className="px-2 py-3 text-center font-medium text-gray-700 text-xs align-top w-16">{item.qty}</td>
                      <td className="px-2 py-3 text-center text-gray-600 text-xs align-top w-16">{item.receivedQuantity ?? 0}</td>
                      <td className="px-2 py-3 text-right text-gray-600 text-xs font-mono align-top w-20">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-3 text-center font-mono text-xs text-gray-600 align-top w-20">
                        {item.hsnCode || '—'}
                      </td>
                      {!isInterState ? (
                        <>
                          <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">{item.cgstPct}%</td>
                          <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">{item.sgstPct}%</td>
                        </>
                      ) : (
                        <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">{item.igstPct}%</td>
                      )}
                      <td className="px-1 py-3 text-center text-gray-600 text-xs font-mono align-top w-14">{item.cessPct > 0 ? `${item.cessPct}%` : '0%'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs font-mono align-top w-auto min-w-[130px] whitespace-nowrap">
                        ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Invoice Footer */}
          <div className="border-t border-gray-100 bg-[#F8FAFC] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left: Tax Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#084E92] mb-3 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  Tax Breakdown
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100 items-center">
                    <div className="flex items-center gap-1.5 group relative">
                      <span className="text-gray-500">Taxable Amount:</span>
                      <Info className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#084E92] transition-colors cursor-pointer" />
                      
                      {/* Tooltip showing item-wise quantity * rate */}
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 bg-gray-900 text-white rounded-lg p-3 shadow-xl text-xs w-72 pointer-events-none">
                        <p className="font-semibold border-b border-gray-700 pb-1 mb-1.5 text-gray-200">Item-wise Taxable Breakdown</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(calculatedTotals.items || []).map((item) => {
                            const qty = item.qty || 0;
                            const price = item.unitPrice || 0;
                            const taxable = item.taxable || (qty * price);
                            return (
                              <div key={item.id ?? item.rawMaterialId} className="flex justify-between gap-2 text-[11px]">
                                <span className="truncate text-gray-300 max-w-[140px]" title={item.rawMaterialName}>{item.rawMaterialName}:</span>
                                <span className="font-mono text-gray-100 shrink-0">{qty} × ₹{price.toFixed(2)} = ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTaxable)}</span>
                  </div>
                  {!isInterState ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">CGST Amount:</span>
                        <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalCGST)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">SGST Amount:</span>
                        <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalSGST)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">IGST Amount:</span>
                      <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalIGST)}</span>
                    </div>
                  )}
                  {calculatedTotals.totalCESS > 0 && (
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">CESS Amount:</span>
                      <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalCESS)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 font-bold text-gray-900 border-t border-gray-200">
                    <span>Total Tax (GST + CESS):</span>
                    <span className="text-[#084E92] font-mono">{formatCurrency(calculatedTotals.totalTax)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Net Total & In words */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Sub Total:</span>
                    <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTaxable)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Total Tax:</span>
                    <span className="font-semibold text-gray-800 font-mono">{formatCurrency(calculatedTotals.totalTax)}</span>
                  </div>
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