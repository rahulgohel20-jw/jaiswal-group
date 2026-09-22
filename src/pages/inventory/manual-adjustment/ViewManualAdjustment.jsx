import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronRight,
  ArrowLeft,
  Calendar,
  Building2,
  Boxes,
  ClipboardList,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Scale,
  User,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import {
  getAdjustmentById,
  postAdjustment,
  cancelAdjustment,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  DRAFT: 'bg-gray-100 text-gray-600',
  Draft: 'bg-gray-100 text-gray-600',
  POSTED: 'bg-emerald-50 text-emerald-600',
  Posted: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-rose-50 text-rose-600',
  Cancelled: 'bg-rose-50 text-rose-600',
  CANCELED: 'bg-rose-50 text-rose-600',
};

const STATUS_DOT = {
  DRAFT: 'bg-gray-400',
  Draft: 'bg-gray-400',
  POSTED: 'bg-emerald-500',
  Posted: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
  Cancelled: 'bg-rose-500',
  CANCELED: 'bg-rose-500',
};

const StatusBadge = ({ status = 'DRAFT', size = 'md' }) => {
  const normalized = String(status || 'DRAFT').toUpperCase();
  const label =
    normalized === 'POSTED'
      ? 'Posted'
      : normalized === 'CANCELLED' || normalized === 'CANCELED'
      ? 'Cancelled'
      : 'Draft';

  const isPosted = normalized === 'POSTED';
  const isCancelled = normalized === 'CANCELLED' || normalized === 'CANCELED';

  const badgeStyle = isPosted
    ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
    : isCancelled
    ? 'bg-rose-500/20 text-rose-100 border-rose-400/40'
    : 'bg-white/20 text-white border-white/30';

  const dotStyle = isPosted
    ? 'bg-emerald-300'
    : isCancelled
    ? 'bg-rose-300'
    : 'bg-amber-300';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border backdrop-blur-xs ${
        size === 'lg' ? 'text-xs px-3.5 py-1.5' : 'text-[11px] px-2.5 py-1'
      } ${badgeStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {label}
    </span>
  );
};

const InfoTile = ({ label, value, icon: Icon, className = '' }) => (
  <div className={`rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5 ${className}`}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
      {Icon && <Icon className="w-3 h-3 text-[#084E92]" />}
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800">{value}</p>
  </div>
);

const ViewManualAdjustment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canView, canEdit, canAdd } = usePagePermissions('Manual Adjustment');
  const [adjustment, setAdjustment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Post & Cancel states
  const [posting, setPosting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdjustmentById(id);
      const raw = res?.data?.data ?? res?.data;
      const data = Array.isArray(raw)
        ? raw[0]
        : raw?.data && Array.isArray(raw.data)
        ? raw.data[0]
        : raw;

      setAdjustment(data);
    } catch (err) {
      console.error('Failed to load adjustment details:', err);
      setError('Failed to load adjustment voucher details');
      toast.error('Failed to load adjustment voucher details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handlePostVoucher = async () => {
    if (!id) return;
    setPosting(true);
    try {
      const currentUserId = getUserIdFromToken();
      await postAdjustment(id, currentUserId);
      toast.success('Adjustment voucher posted successfully');
      await fetchDetails();
    } catch (err) {
      console.error('Failed to post adjustment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to post adjustment voucher';
      toast.error(errMsg);
    } finally {
      setPosting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!id || !cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      const currentUserId = getUserIdFromToken();
      await cancelAdjustment(id, {
        userId: currentUserId,
        reason: cancelReason.trim(),
      });
      toast.success('Adjustment voucher cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      await fetchDetails();
    } catch (err) {
      console.error('Failed to cancel adjustment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to cancel adjustment voucher';
      toast.error(errMsg);
    } finally {
      setCancelling(false);
    }
  };

  if (!canView) {
    return <AccessDenied pageTitle="Manual Adjustment" />;
  }

  if (loading) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#084E92] mx-auto mb-2" />
          <p className="text-sm font-medium">Loading adjustment voucher details...</p>
        </div>
      </Container>
    );
  }

  if (error || !adjustment) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 text-center">
          <div className="p-8 bg-white rounded-2xl border border-gray-100 max-w-md mx-auto shadow-sm space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-gray-800">Adjustment Voucher Not Found</h2>
            <p className="text-xs text-gray-500">{error || 'The requested voucher could not be retrieved.'}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/inventory/manual-adjustment-listing')}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition cursor-pointer"
              >
                Back to Listing
              </button>
              <button
                type="button"
                onClick={fetchDetails}
                className="px-4 py-2 bg-[#084E92] text-white text-xs font-semibold rounded-xl hover:bg-[#073e77] transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  const voucherNumber =
    adjustment.adjustmentCode ||
    adjustment.voucherNumber ||
    adjustment.code ||
    `ADJ-${adjustment.id || id}`;

  const manageDate =
    adjustment.adjustmentDate ||
    adjustment.manageDate ||
    adjustment.createdAt?.slice(0, 10) ||
    '—';

  const outletName =
    adjustment.organizationName ||
    adjustment.outletName ||
    adjustment.organization?.companyNameEnglish ||
    '—';

  const outletCode = adjustment.organizationCode || '';

  const subOutletName =
    adjustment.subOutletName ||
    adjustment.subOutlet?.subOutletName ||
    'Main Store';

  const createdByName =
    adjustment.createdByName ||
    adjustment.createdByUserName ||
    adjustment.createdByUser ||
    '—';

  const updatedByName =
    adjustment.updatedByName ||
    adjustment.updatedByUserName ||
    adjustment.updatedByUser ||
    '';

  const remarks = adjustment.remarks || adjustment.reason || '';
  const status = String(adjustment.status || 'DRAFT').toUpperCase();
  const isDecided = status === 'POSTED' || status === 'CANCELLED' || status === 'CANCELED';

  const baseUnitName = adjustment.baseUnitName || '';
  const baseUnitSymbol = adjustment.baseUnitSymbol ? ` (${adjustment.baseUnitSymbol})` : '';
  const baseUnitQuantity = Number(adjustment.baseUnitQuantity || 0);
  const baseUnitRate = Number(adjustment.baseUnitRate || 0);

  // Normalize items list (supports both bulk `items` array and single root item)
  const itemsList =
    Array.isArray(adjustment.items) && adjustment.items.length > 0
      ? adjustment.items.map((it, idx) => {
          const itAdjType = String(it.adjustmentType || adjustment.adjustmentType || '').trim().toUpperCase();
          const isDed =
            itAdjType === 'DEDUCTION' || itAdjType === 'SUBTRACTION' || itAdjType === 'DECREASE';
          const qty = Number(it.adjustmentQuantity ?? it.quantity ?? 0);
          const curStock = Number(it.currentStock ?? it.actualStock ?? 0);
          const afterStock = Number(
            it.afterAdjustmentStock ?? it.physicalStock ?? (isDed ? curStock - qty : curStock + qty)
          );
          const rate = Number(it.unitRate || 0);
          const total = Number(it.totalAmount || qty * rate);

          return {
            id: it.id || it.itemId || it.rawMaterialId || idx + 1,
            itemName: it.itemName || it.rawMaterialName || `Item #${it.itemId || idx + 1}`,
            itemType: it.itemType || 'RAW_MATERIAL',
            sku: it.sku || it.itemCode || '',
            unitName: it.unitName || it.unitSymbol || it.unit || 'Units',
            adjustmentType: isDed ? 'DEDUCTION' : 'ADDITION',
            currentStock: curStock,
            afterAdjustmentStock: afterStock,
            adjustmentQuantity: qty,
            unitRate: rate,
            totalAmount: total,
            remarks: it.remarks || '',
          };
        })
      : [
          (() => {
            const adjTypeStr = String(adjustment.adjustmentType || '').trim().toUpperCase();
            const isDed =
              adjTypeStr === 'DEDUCTION' || adjTypeStr === 'SUBTRACTION' || adjTypeStr === 'DECREASE';
            const rawQty = Number(adjustment.adjustmentQuantity ?? adjustment.quantity ?? 0);
            const actual = Number(
              adjustment.currentStock ?? adjustment.actualStock ?? adjustment.previousStock ?? 0
            );
            const physical = Number(
              adjustment.afterAdjustmentStock ??
                adjustment.physicalStock ??
                (isDed ? actual - rawQty : actual + rawQty)
            );
            const rate = Number(adjustment.unitRate || 0);
            const total = Number(adjustment.totalAmount || Math.abs(rawQty) * rate);

            return {
              id: adjustment.itemId || adjustment.id || 1,
              itemName: adjustment.itemName || `Item #${adjustment.itemId || adjustment.id || 1}`,
              itemType: adjustment.itemType || 'RAW_MATERIAL',
              sku: adjustment.sku || adjustment.itemCode || '',
              unitName: adjustment.unitName || adjustment.unitSymbol || adjustment.unit || 'Units',
              adjustmentType: isDed ? 'DEDUCTION' : 'ADDITION',
              currentStock: actual,
              afterAdjustmentStock: physical,
              adjustmentQuantity: Math.abs(rawQty),
              unitRate: rate,
              totalAmount: total,
              remarks: adjustment.remarks || '',
            };
          })(),
        ];

  return (
    <Container>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 mt-1">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Inventory</span>
          <ChevronRight size={12} />
          <Link
            to="/inventory/manual-adjustment-listing"
            className="cursor-pointer hover:text-[#084E92] transition"
          >
            Manual Adjustment
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">{voucherNumber}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#084E92] to-[#0B65BD] px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/inventory/manual-adjustment-listing"
              className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer border-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{voucherNumber}</h1>
              <p className="text-blue-100/80 text-xs mt-0.5">Stock manual adjustment voucher details</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} size="lg" />

            <Link
              to="/inventory/manual-adjustment/create"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-xs font-semibold text-[#084E92] hover:bg-blue-50 transition cursor-pointer border-0 shadow-sm"
            >
              <Package size={14} />
              New Adjustment
            </Link>
          </div>
        </div>

        {/* Draft Actions Card (when in draft mode) */}
        {status === 'DRAFT' && (canEdit || canAdd) && (
          <div className="mt-5 bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Draft Stock Adjustment</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  This voucher is currently in draft mode. Post it to finalize and update the stock ledger.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(true);
                  setCancelReason('');
                }}
                disabled={posting || cancelling}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <XCircle size={15} />
                Cancel Voucher
              </button>
              <button
                type="button"
                onClick={handlePostVoucher}
                disabled={posting || cancelling}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#084E92] text-white hover:bg-[#073e77] text-xs font-semibold shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {posting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Post Adjustment
              </button>
            </div>
          </div>
        )}

        {/* Origin & Location Details */}
        <SectionCard className="mt-5">
          <SectionHeader icon={Calendar} title="Origin & Location Details" />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoTile label="Manage Date" value={manageDate} icon={Calendar} />
              <InfoTile label="Created Date" value={adjustment.createdAt || '—'} />
              <InfoTile label="Created By" value={createdByName} icon={User} />
              <InfoTile label="Last Updated By" value={updatedByName || '—'} />
              <InfoTile
                label="Outlet / Branch"
                value={`${outletName} ${outletCode ? `(${outletCode})` : ''}`}
                icon={Building2}
                className="col-span-2 sm:col-span-2"
              />
              <InfoTile
                label="Sub-Outlet / Location"
                value={subOutletName}
                icon={Boxes}
                className="col-span-2 sm:col-span-2"
              />
            </div>

            {remarks && remarks !== 'No remarks provided' && remarks !== '—' && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3.5 mt-3">
                <p className="text-[11px] font-bold text-[#084E92] uppercase tracking-wide mb-1.5">
                  Adjustment Remarks & Notes
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{remarks}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Decision / Status Details (shown when status is POSTED or CANCELLED) */}
        {isDecided && (
          <SectionCard className="mt-5">
            <SectionHeader
              icon={status === 'POSTED' ? CheckCircle2 : XCircle}
              title={`${status === 'POSTED' ? 'Posted' : 'Cancellation'} Details`}
            />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile
                  label={`${status === 'POSTED' ? 'Posted' : 'Cancelled'} By`}
                  value={updatedByName || createdByName}
                />
                <InfoTile
                  label={`${status === 'POSTED' ? 'Posted' : 'Cancelled'} On`}
                  value={adjustment.updatedAt || adjustment.createdAt || '—'}
                />
                <InfoTile
                  label="Voucher Status"
                  value={status === 'POSTED' ? 'Posted to Stock Ledger' : 'Cancelled Voucher'}
                />
              </div>

              {(adjustment.reason || adjustment.cancellationReason) && (
                <div
                  className={`rounded-xl border px-4 py-3.5 mt-3 ${
                    status === 'POSTED'
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : 'bg-rose-50/60 border-rose-100'
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
                      status === 'POSTED' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {status === 'POSTED' ? 'Posting Notes' : 'Cancellation Reason'}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {adjustment.reason || adjustment.cancellationReason}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Line Items & Valuation Table */}
        <SectionCard className="mt-5 overflow-hidden">
          <SectionHeader
            icon={ClipboardList}
            title="Adjustment Items & Stock Valuation"
            trailing={
              <span className="text-[11px] font-bold text-[#084E92] bg-blue-50 px-2.5 py-1 rounded-full">
                {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
              </span>
            }
          />
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-5 py-3">Item Name</th>
                  <th className="text-center font-semibold px-4 py-3">Adjustment Type</th>
                  <th className="text-right font-semibold px-4 py-3">ST Before Adj</th>
                  <th className="text-right font-semibold px-4 py-3">ST After Adj</th>
                  <th className="text-right font-semibold px-4 py-3">Adjustment Qty</th>
                  <th className="text-right font-semibold px-4 py-3">Unit Rate</th>
                  <th className="text-right font-semibold px-5 py-3">Valuation Total</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-6 h-6 text-gray-300" />
                        No adjustment items found on this voucher.
                      </div>
                    </td>
                  </tr>
                ) : (
                  itemsList.map((item, idx) => {
                    const isDed = item.adjustmentType === 'DEDUCTION';
                    return (
                      <tr
                        key={item.id ?? idx}
                        className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-800">{item.itemName}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.sku && <span>•</span>}
                            <span>{item.itemType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                              isDed
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.adjustmentType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs font-medium text-gray-700">
                          {item.currentStock.toFixed(2)} {item.unitName}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-[#084E92]">
                          {item.afterAdjustmentStock.toFixed(2)} {item.unitName}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs font-bold">
                          <span className={isDed ? 'text-rose-600' : 'text-emerald-600'}>
                            {item.adjustmentQuantity.toFixed(2)} {item.unitName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-700">
                          ₹{item.unitRate.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-gray-900">
                          ₹
                          {item.totalAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Base Unit Details (if available) */}
          {baseUnitName && (
            <div className="border-t border-gray-100 p-4 bg-blue-50/40 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <Scale size={18} className="text-[#084E92]" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Base Unit Representation</p>
                  <p className="text-[11px] text-gray-500">
                    Converted equivalent in primary base unit ({baseUnitName}
                    {baseUnitSymbol})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block">Base Qty</span>
                  <span className="text-xs font-bold font-mono text-gray-800">
                    {baseUnitQuantity.toFixed(3)} {baseUnitName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block">Base Rate</span>
                  <span className="text-xs font-bold font-mono text-gray-800">
                    ₹{baseUnitRate.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Cancellation Reason Modal */}
        <Dialog
          open={showCancelModal}
          onOpenChange={(open) => !cancelling && setShowCancelModal(open)}
        >
          <DialogContent className="sm:max-w-[460px] bg-white p-6 rounded-2xl border border-gray-100 shadow-xl">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Cancel Stock Adjustment Voucher
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Voucher #{voucherNumber}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to cancel this draft adjustment? Once cancelled, this voucher
                will be permanently marked as cancelled and cannot be posted or edited.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter the detailed reason for cancellation..."
                  className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 resize-none text-gray-800"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                Confirm Cancellation
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
};

export default ViewManualAdjustment;

