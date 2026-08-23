// ============================================
// File: src/pages/purchase-order-requests/PurchaseOrderDetail.jsx
//
// Read-only PO detail view, reached from the View action wherever a PO
// is in a terminal or non-editable state (Approved, Rejected, Closed,
// Partially Received, etc). Approve/Reject decisions happen on the
// create/edit form (CreatePurchaseOrder.jsx) via reviewMode, not here —
// this page has no action buttons beyond Back.
// ============================================

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, FileText, Info } from 'lucide-react';
import { Container } from '@/components/common/container';
import { usePurchaseOrders } from './utils/usePurchaseOrders';

const STATUS_BADGE_STYLES = {
  'TO BE GENERATED': 'bg-gray-100 text-gray-600',
  Draft: 'bg-yellow-100 text-yellow-700',
  'Sent for Approval': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  Approved: 'bg-green-100 text-green-700',
  'Partially Received': 'bg-purple-100 text-purple-700',
  Closed: 'bg-gray-200 text-gray-700',
  Rejected: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-600'
    }`}
  >
    {(status || '').toUpperCase()}
  </span>
);

const Field = ({ label, value }) => (
  <div>
    <label className="text-sm text-[#475569] mb-1 block">{label}</label>
    <div className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center text-sm text-[#1E293B]">
      {value ?? '—'}
    </div>
  </div>
);

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { current: po, loading, error, fetchById } = usePurchaseOrders();

  useEffect(() => {
    if (id) fetchById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // po.status coming out of normalizePo is already the human-readable
  // label (normalizePo sets `status: getPoStatusLabel(po.status)`) — use
  // it directly rather than re-applying a label function to an
  // already-labeled string.
  const displayStatus = po?.status ?? '';

  // normalizePo's detail mapping renames orderedQuantity -> quantity.
  const totalValue = (po?.details || []).reduce(
    (sum, d) => sum + (Number(d.totalPrice) || Number(d.quantity) * Number(d.unitPrice) || 0),
    0,
  );

  return (
    <Container>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Order Detail</span>
        </div>

        <div className="my-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              {po?.poCode || 'Purchase Order'}
            </h1>
            <p className="text-sm text-[#737781] mt-1">Purchase order details and line items.</p>
          </div>
          {po && <StatusBadge status={displayStatus} />}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error?.message || 'Failed to load this purchase order.'}
          </div>
        )}

        {loading && !po ? (
          <p className="text-sm text-gray-500">Loading purchase order...</p>
        ) : (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
              <div className="px-6 py-5 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-[#0B5CAD]" />
                  <h2 className="text-xl font-semibold text-[#1E293B]">Purchase Order Information</h2>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="PO Code" value={po?.poCode} />
                <Field label="PO Date" value={po?.date} />
                <Field label="Outlet Name" value={po?.outlet} />
                <Field label="Expected Delivery Date" value={po?.expectedDeliveryDate} />
                <Field label="Created By" value={po?.createdBy} />
                <Field label="Created At" value={po?.createdAt} />
                <Field label="Updated By" value={po?.raisedBy} />
                <Field label="Updated At" value={po?.updatedAt} />
              </div>
            </div>

            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
              <div className="flex gap-2 items-center text-[#084E92] px-6 py-5 border-b bg-white">
                <ClipboardList />
                <h2 className="text-xl font-semibold text-black">Purchase Items</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#43474F]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Item</th>
                    <th className="text-left px-4 py-3 font-semibold">Unit</th>
                    <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                    <th className="text-right px-4 py-3 font-semibold">Ordered Qty</th>
                    <th className="text-right px-4 py-3 font-semibold">Received Qty</th>
                    <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po?.details || []).map((d) => (
                    <tr key={d.id} className="border-t border-[#E2E8F0]">
                      <td className="px-4 py-3">{d.rawMaterialName}</td>
                      <td className="px-4 py-3">{d.uomName}</td>
                      <td className="px-4 py-3">{d.vendorName || '—'}</td>
                      <td className="px-4 py-3 text-right">{d.quantity}</td>
                      <td className="px-4 py-3 text-right">{d.receivedQuantity}</td>
                      <td className="px-4 py-3 text-right">₹{Number(d.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{Number(d.totalPrice ?? d.quantity * d.unitPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-8 py-4 px-6 border-t bg-[#F8FAFC] items-center">
                <div className="text-sm flex gap-2 items-center">
                  <span className="text-gray-500">Total Value:</span>
                  <p className="text-xl font-bold text-[#084E92]">
                    ₹ {totalValue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {po?.remarks && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
                <div className="px-6 py-5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#0B5CAD]" />
                    <h2 className="text-sm font-semibold text-[#1E293B]">Terms & Delivery Notes</h2>
                  </div>
                </div>
                <div className="p-6 text-sm text-[#1E293B]">{po.remarks}</div>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 border-t py-5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </Container>
  );
};

export default PurchaseOrderDetail;