import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft,
  Printer,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { notify } from '@/utils/toast';
import { getLedgerById } from '@/services/apiServices';

const SectionCard = ({
  title,
  subtitle,
  badge,
  open = true,
  onToggle,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(open);
  const isControlled = onToggle !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden transition-all">
      <div
        className={`flex items-center justify-between px-6 py-4 flex-wrap gap-2 cursor-pointer select-none transition-colors hover:bg-gray-50/70 ${
          isOpen ? 'border-b border-gray-100' : ''
        }`}
        onClick={handleToggle}
      >
        <div>
          <h2 className="font-bold text-gray-900 text-base">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {badge && <div onClick={(e) => e.stopPropagation()}>{badge}</div>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            title={isOpen ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && <div className="px-6 py-5">{children}</div>}
    </div>
  );
};

const InfoCard = ({ label, value, subtext, valueClassName = '' }) => (
  <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className={`text-sm font-semibold text-gray-800 mt-1 break-words ${valueClassName}`}>
      {value !== null && value !== undefined && value !== '' ? value : '—'}
    </p>
    {subtext && <p className="text-[11px] text-gray-400 mt-0.5">{subtext}</p>}
  </div>
);

const StatCard = ({ label, value, tone = 'blue' }) => {
  const valueColor =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'rose'
      ? 'text-rose-600'
      : 'text-gray-900';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span
        className={`text-lg sm:text-xl font-bold mt-1 font-mono truncate ${valueColor}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value || '—'}
      </span>
    </div>
  );
};

const GeneralStockLedgerViewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [ledgerRecord, setLedgerRecord] = useState(location.state?.ledgerRecord || null);
  const [loading, setLoading] = useState(!location.state?.ledgerRecord && Boolean(id));

  useEffect(() => {
    const fetchRecord = async () => {
      const recordId = id || location.state?.id;
      if (!recordId) return;

      setLoading(true);
      try {
        const res = await getLedgerById(recordId);
        const data = res?.data?.data ?? res?.data ?? null;
        if (data) {
          setLedgerRecord(data);
        }
      } catch (error) {
        console.error('Failed to load ledger record details:', error);
        notify.error('Failed to load ledger record details');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id, location.state]);

  const trxType = ledgerRecord?.transactionType;
  const inQty = Number(ledgerRecord?.inQuantity || 0);
  const outQty = Number(ledgerRecord?.outQuantity || 0);
  const unit = ledgerRecord?.unitSymbol || '';

  const isStockTransfer =
    ledgerRecord?.referenceType === 'STOCK_TRANSFER' ||
    trxType === 'TRANSFER_IN' ||
    trxType === 'TRANSFER_OUT' ||
    (ledgerRecord?.fromOrganizationName &&
      ledgerRecord?.toOrganizationName &&
      ledgerRecord?.fromOrganizationName !== ledgerRecord?.toOrganizationName);

  if (loading) {
    return (
      <Container>
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-600">Loading stock ledger details...</p>
        </div>
      </Container>
    );
  }

  if (!ledgerRecord) {
    return (
      <Container>
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <FileSpreadsheet size={42} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Stock ledger record not found</p>
          <button
            type="button"
            onClick={() => navigate('/inventory/general-stock-ledger')}
            className="px-4 py-2 bg-[#084E92] text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition cursor-pointer"
          >
            Back to Stock Ledger
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-8 space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Stock Ledger Details"
          description="View detailed record of stock movements, batch details, rates, and audit logs."
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/inventory/general-stock-ledger')}
                className="flex items-center gap-1.5 text-[#084E92] hover:text-[#063b6f] font-semibold text-sm cursor-pointer bg-transparent border-0 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Stock Ledger
              </button>
            </div>
          }
        />

        {/* Clean Structured Summary Banner */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {ledgerRecord.itemName || 'Stock Ledger Entry'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#EFF4FF] text-[#084E92] border border-[#D5E3FF]">
                {trxType ? trxType.replace(/_/g, ' ') : 'TRANSACTION'}
              </span>
              {ledgerRecord.itemType && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                  {ledgerRecord.itemType.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {ledgerRecord.fromOrganizationName && (
              <div className="text-xs text-gray-500 font-medium">
                Unit: <strong className="text-gray-900 font-semibold">{ledgerRecord.fromOrganizationName}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
            <div>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
                Transaction Code
              </span>
              <span
                className="font-mono font-semibold text-gray-900 text-xs sm:text-[13px] block mt-1 truncate"
                title={ledgerRecord.transactionCode}
              >
                {ledgerRecord.transactionCode || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
                Reference Code
              </span>
              <span
                className="font-mono font-semibold text-gray-900 text-xs sm:text-[13px] block mt-1 truncate"
                title={ledgerRecord.referenceCode}
              >
                {ledgerRecord.referenceCode || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
                Transaction Date
              </span>
              <span className="font-semibold text-gray-900 text-xs sm:text-[13px] block mt-1">
                {ledgerRecord.transactionDate || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
                Batch Number
              </span>
              <span
                className="font-mono font-semibold text-gray-900 text-xs sm:text-[13px] block mt-1 truncate"
                title={ledgerRecord.batchNumber}
              >
                {ledgerRecord.batchNumber || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Opening Stock (Before)"
            value={`${ledgerRecord.balanceBefore ?? 0} ${unit}`}
            tone="blue"
          />

          <StatCard
            label="Stock Movement"
            value={inQty > 0 ? `+${inQty} ${unit}` : outQty > 0 ? `-${outQty} ${unit}` : `0 ${unit}`}
            tone={inQty > 0 ? 'emerald' : outQty > 0 ? 'rose' : 'blue'}
          />

          <StatCard
            label="Closing Stock (After)"
            value={`${ledgerRecord.balanceAfter ?? 0} ${unit}`}
            tone="blue"
          />

          <StatCard
            label="Total Valuation"
            value={`₹${Number(ledgerRecord.totalAmount || 0).toFixed(2)}`}
            tone="blue"
          />
        </div>

        {/* 1. Item & Batch Information */}
        <SectionCard
          title="Item & Batch Details"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard
              label="Item Name"
              value={ledgerRecord.itemName}
              valueClassName="text-gray-900 font-bold"
            />
            <InfoCard
              label="Item Type"
              value={
                ledgerRecord.itemType === 'RAW_MATERIAL'
                  ? 'Raw Material'
                  : ledgerRecord.itemType === 'ASSET'
                  ? 'Asset'
                  : ledgerRecord.itemType
              }
            />
            <InfoCard
              label="Unit of Measure"
              value={
                ledgerRecord.unitName
                  ? `${ledgerRecord.unitName} (${ledgerRecord.unitSymbol || ''})`
                  : ledgerRecord.unitSymbol
              }
            />
            <InfoCard
              label="Batch Number"
              value={ledgerRecord.batchNumber}
              valueClassName="font-mono text-gray-900"
            />
            <InfoCard
              label="Expiry Date"
              value={ledgerRecord.expiryDate}
            />
            <InfoCard
              label="Unit Rate"
              value={`₹${Number(ledgerRecord.unitRate || 0).toFixed(2)}`}
              subtext={unit ? `per ${unit}` : 'per unit'}
              valueClassName="font-mono font-semibold text-gray-900"
            />
          </div>
        </SectionCard>

        {/* 2. Stock Transfer Location Flow (ONLY for Stock Transfer) or Location Details */}
        {isStockTransfer ? (
          <SectionCard
            title="Stock Transfer Flow"
            subtitle="Source dispatch outlet and destination receiving outlet."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Location */}
              <div className="bg-[#F8FAFC] border border-gray-200/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-bold">
                    From
                  </span>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Source Location (Dispatch)
                  </h3>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Organization / Unit</span>
                  <p className="text-sm font-bold text-gray-900">
                    {ledgerRecord.fromOrganizationName || 'External Location'}
                  </p>
                </div>
                {(ledgerRecord.fromSubOutletName || ledgerRecord.fromSubLocationName) && (
                  <div className="pt-2 border-t border-gray-200/60 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-gray-400 font-medium">Sub-Unit</span>
                      <p className="text-xs font-semibold text-gray-800">
                        {ledgerRecord.fromSubOutletName || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 font-medium">Sub-Location</span>
                      <p className="text-xs font-semibold text-gray-800">
                        {ledgerRecord.fromSubLocationName || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Location */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center text-[#084E92] text-[10px] font-bold">
                    To
                  </span>
                  <h3 className="text-xs font-bold text-[#084E92] uppercase tracking-wider">
                    Destination Location (Receiving)
                  </h3>
                </div>
                <div>
                  <span className="text-[11px] text-blue-400 font-medium">Organization / Unit</span>
                  <p className="text-sm font-bold text-gray-900">
                    {ledgerRecord.toOrganizationName || 'External Location'}
                  </p>
                </div>
                {(ledgerRecord.toSubOutletName || ledgerRecord.toSubLocationName) && (
                  <div className="pt-2 border-t border-blue-100 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-blue-400 font-medium">Sub-Unit</span>
                      <p className="text-xs font-semibold text-gray-800">
                        {ledgerRecord.toSubOutletName || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-blue-400 font-medium">Sub-Location</span>
                      <p className="text-xs font-semibold text-gray-800">
                        {ledgerRecord.toSubLocationName || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Location & Unit"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard
                label="Organization / Unit"
                value={ledgerRecord.fromOrganizationName || ledgerRecord.toOrganizationName || '—'}
                valueClassName="text-gray-900 font-bold"
              />
              <InfoCard
                label="Sub-Unit"
                value={ledgerRecord.fromSubOutletName || ledgerRecord.toSubOutletName || '—'}
              />
              <InfoCard
                label="Sub-Location"
                value={ledgerRecord.fromSubLocationName || ledgerRecord.toSubLocationName || '—'}
              />
            </div>
          </SectionCard>
        )}

        {/* 3. Transaction & Audit Details */}
        <SectionCard
          title="Transaction & Audit Details"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard
              label="Transaction Code"
              value={ledgerRecord.transactionCode}
              valueClassName="font-mono text-gray-900"
            />
            <InfoCard
              label="Transaction Type"
              value={ledgerRecord.transactionType}
              valueClassName="font-semibold text-gray-900"
            />
            <InfoCard
              label="Reference Type & Code"
              value={ledgerRecord.referenceType || '—'}
              subtext={ledgerRecord.referenceCode ? `Ref: ${ledgerRecord.referenceCode}` : null}
              valueClassName="font-semibold text-gray-900"
            />
            <InfoCard
              label="Transaction Date"
              value={ledgerRecord.transactionDate}
            />
            <InfoCard
              label="Created By User"
              value={ledgerRecord.createdByName || (ledgerRecord.createdBy ? `User #${ledgerRecord.createdBy}` : '—')}
            />
            <InfoCard
              label="Created At"
              value={ledgerRecord.createdAt || '—'}
            />
          </div>

          {ledgerRecord.remarks && (
            <div className="mt-4 p-4 rounded-xl bg-[#F8FAFC] border border-gray-100">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                Remarks / Notes
              </p>
              <p className="text-sm text-gray-700 font-normal">
                {ledgerRecord.remarks}
              </p>
            </div>
          )}
        </SectionCard>
      </div>
    </Container>
  );
};

export default GeneralStockLedgerViewDetails;
