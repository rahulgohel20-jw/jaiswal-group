import React from 'react';
import {
  Archive,
  X,
  Calendar,
  Building2,
  Package,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  FileText,
  DollarSign,
  Tag,
  Layers,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FieldCard = ({ icon: Icon, label, value, valueClassName = '' }) => (
  <div className="flex-1 min-w-[140px] border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
        {label}
      </span>
      {Icon && <Icon size={14} className="text-gray-400" />}
    </div>
    <p className={`text-sm font-semibold text-[#0F172A] break-words ${valueClassName}`}>
      {value !== null && value !== undefined && value !== '' ? value : '—'}
    </p>
  </div>
);

const SectionLabel = ({ children, right }) => (
  <div className="flex items-center justify-between mb-2.5">
    <div className="flex items-center gap-2">
      <span className="w-1 h-3.5 rounded-full bg-[#084E92]" />
      <span className="text-xs font-bold tracking-wide text-[#43474F] uppercase">
        {children}
      </span>
    </div>
    {right}
  </div>
);

const TransactionBadge = ({ type }) => {
  const map = {
    OPB: 'bg-purple-50 text-purple-700 border-purple-200',
    GRN_INWARD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TRANSFER_IN: 'bg-blue-50 text-blue-700 border-blue-200',
    TRANSFER_OUT: 'bg-amber-50 text-amber-700 border-amber-200',
    CONSUMPTION: 'bg-orange-50 text-orange-700 border-orange-200',
    WASTAGE: 'bg-rose-50 text-rose-700 border-rose-200',
    STOCK_ADJUSTMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RETURN_TO_VENDOR: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        map[type] || 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {type || 'TRANSACTION'}
    </span>
  );
};

const StockLedgerDetailsModal = ({
  open,
  onOpenChange,
  ledgerRecord,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-3xl rounded-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EFF4FF] flex items-center justify-center shrink-0">
              <Archive size={18} className="text-[#084E92]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-gray-900 font-mono">
                  {ledgerRecord?.transactionCode || 'Stock Ledger Record'}
                </h2>
                {ledgerRecord?.transactionType && (
                  <TransactionBadge type={ledgerRecord.transactionType} />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Calendar size={12} className="text-gray-400" />
                <span>Transaction Date:</span>
                <span className="font-semibold text-gray-700">
                  {ledgerRecord?.transactionDate || '—'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <ScrollArea className="max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-7 h-7 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-gray-600">Loading ledger record details...</p>
            </div>
          ) : !ledgerRecord ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No details found for this record.
            </div>
          ) : (
            <div className="p-6 space-y-5 bg-[#F8FAFC]/50">
              {/* 1. Item & Batch Info */}
              <div>
                <SectionLabel>Item & Batch Information</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FieldCard
                    icon={Package}
                    label="Item Name"
                    value={ledgerRecord.itemName}
                  />
                  <FieldCard
                    icon={Tag}
                    label="Item Type"
                    value={ledgerRecord.itemType === 'RAW_MATERIAL' ? 'Raw Material' : ledgerRecord.itemType}
                  />
                  <FieldCard
                    label="Unit"
                    value={ledgerRecord.unitName ? `${ledgerRecord.unitName} (${ledgerRecord.unitSymbol || ''})` : ledgerRecord.unitSymbol}
                  />
                  <FieldCard
                    icon={Layers}
                    label="Batch Number"
                    value={ledgerRecord.batchNumber}
                  />
                  <FieldCard
                    icon={Calendar}
                    label="Expiry Date"
                    value={ledgerRecord.expiryDate}
                  />
                  <FieldCard
                    label="Serial Number"
                    value={ledgerRecord.serialNumber}
                  />
                  <FieldCard
                    label="Stock Batch ID"
                    value={ledgerRecord.stockBatchId}
                  />
                  <FieldCard
                    label="Item ID"
                    value={ledgerRecord.itemId}
                  />
                </div>
              </div>

              {/* 2. Quantities & Valuations */}
              <div>
                <SectionLabel>Quantities & Valuation</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FieldCard
                    icon={TrendingUp}
                    label="In Quantity"
                    value={
                      ledgerRecord.inQuantity > 0
                        ? `+${ledgerRecord.inQuantity} ${ledgerRecord.unitSymbol || ''}`
                        : '0'
                    }
                    valueClassName={ledgerRecord.inQuantity > 0 ? 'text-emerald-600' : ''}
                  />
                  <FieldCard
                    icon={TrendingDown}
                    label="Out Quantity"
                    value={
                      ledgerRecord.outQuantity > 0
                        ? `-${ledgerRecord.outQuantity} ${ledgerRecord.unitSymbol || ''}`
                        : '0'
                    }
                    valueClassName={ledgerRecord.outQuantity > 0 ? 'text-rose-600' : ''}
                  />
                  <FieldCard
                    label="Net Quantity"
                    value={`${ledgerRecord.netQuantity ?? 0} ${ledgerRecord.unitSymbol || ''}`}
                  />
                  <FieldCard
                    label="Unit Rate"
                    value={`₹${Number(ledgerRecord.unitRate || 0).toFixed(2)}`}
                  />
                  <FieldCard
                    label="Balance Before"
                    value={`${ledgerRecord.balanceBefore ?? 0} ${ledgerRecord.unitSymbol || ''}`}
                  />
                  <FieldCard
                    label="Balance After"
                    value={`${ledgerRecord.balanceAfter ?? 0} ${ledgerRecord.unitSymbol || ''}`}
                    valueClassName="text-[#084E92] font-bold"
                  />
                  <FieldCard
                    icon={DollarSign}
                    label="Total Amount"
                    value={`₹${Number(ledgerRecord.totalAmount || 0).toFixed(2)}`}
                    valueClassName="text-gray-900 font-bold"
                  />
                </div>
              </div>

              {/* 3. Location / Movement */}
              <div>
                <SectionLabel>Location & Movement</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* From Location */}
                  <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Source (From)
                    </span>
                    <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-400" />
                      {ledgerRecord.fromOrganizationName || '—'}
                    </p>
                    {(ledgerRecord.fromSubOutletName || ledgerRecord.fromSubLocationName) && (
                      <p className="text-[11px] text-gray-500 pl-5">
                        {[ledgerRecord.fromSubOutletName, ledgerRecord.fromSubLocationName]
                          .filter(Boolean)
                          .join(' › ')}
                      </p>
                    )}
                  </div>

                  {/* To Location */}
                  <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Destination (To)
                    </span>
                    <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                      <Building2 size={14} className="text-[#084E92]" />
                      {ledgerRecord.toOrganizationName || '—'}
                    </p>
                    {(ledgerRecord.toSubOutletName || ledgerRecord.toSubLocationName) && (
                      <p className="text-[11px] text-gray-500 pl-5">
                        {[ledgerRecord.toSubOutletName, ledgerRecord.toSubLocationName]
                          .filter(Boolean)
                          .join(' › ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Reference & Audit Information */}
              <div>
                <SectionLabel>Reference & Audit Info</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <FieldCard
                    icon={FileText}
                    label="Reference Type"
                    value={ledgerRecord.referenceType}
                  />
                  <FieldCard
                    label="Reference Code"
                    value={ledgerRecord.referenceCode}
                  />
                  <FieldCard
                    label="Reference ID"
                    value={ledgerRecord.referenceId}
                  />
                  <FieldCard
                    icon={Clock}
                    label="Created At"
                    value={ledgerRecord.createdAt}
                  />
                  <FieldCard
                    icon={User}
                    label="Created By"
                    value={ledgerRecord.createdByName || (ledgerRecord.createdBy ? `User #${ledgerRecord.createdBy}` : '—')}
                  />
                  <FieldCard
                    label="Remarks"
                    value={ledgerRecord.remarks || 'No remarks'}
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-[#E2E8F0] bg-white">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-[#C3C6D1] rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockLedgerDetailsModal;
