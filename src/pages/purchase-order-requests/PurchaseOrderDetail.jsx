// ============================================
// File: src/pages/purchase-order-requests/PurchaseOrderDetail.jsx
//
// Read-only PO detail view, reached from the View action wherever a PO
// is in a terminal or non-editable state (Approved, Rejected, Closed,
// Partially Received, etc).
// ============================================

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import PurchaseOrderLog from './PurchaseOrderLog';

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
  const { current: po, loading, error, fetchById } = usePurchaseOrders();
const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const displayStatus = po?.status ?? '';
  const isDecided = displayStatus === 'Approved' || displayStatus === 'Rejected';
  const itemCount = po?.details?.length ?? 0;

  const totalValue = (po?.details || []).reduce(
    (sum, d) => sum + (Number(d.totalPrice) || Number(d.quantity) * Number(d.unitPrice) || 0),
    0,
  );

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
              <p className="text-blue-100/80 text-xs mt-0.5">Purchase order details and line items</p>
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
                  <th className="text-left font-semibold px-5 py-3">Item</th>
                  <th className="text-left font-semibold px-5 py-3">Unit</th>
                  <th className="text-left font-semibold px-5 py-3">Vendor</th>
                  <th className="text-right font-semibold px-5 py-3">Ordered Qty</th>
                  <th className="text-right font-semibold px-5 py-3">Received Qty</th>
                  <th className="text-right font-semibold px-5 py-3">Unit Price</th>
                  <th className="text-right font-semibold px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {itemCount === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-6 h-6 text-gray-300" />
                        No items on this purchase order.
                      </div>
                    </td>
                  </tr>
                ) : (
                  (po?.details || []).map((item) => (
                    <tr key={item.id ?? item.rawMaterialId} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-800 font-medium">{item.rawMaterialName}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                          {item.uomName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{item.vendorName || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600">{item.receivedQuantity ?? 0}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-800">
                        ₹{Number(item.totalPrice ?? item.quantity * item.unitPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-8 py-4 px-6 border-t border-gray-100 bg-[#F8FAFC] items-center">
            <div className="text-sm flex gap-2 items-center">
              <span className="text-gray-500 font-medium">Total Value:</span>
              <p className="text-xl font-bold text-[#084E92]">
                ₹ {totalValue.toLocaleString('en-IN')}
              </p>
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