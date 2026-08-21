import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronRight,
  Building2,
  Calendar,
  Download,
  ArrowLeft,
  ClipboardList,
  ScrollText,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { usePurchaseRequisitions } from './utils/usePurchaseRequisitions';
import PurchaseRequisitionLog from './PurchaseRequisitionLog';

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
  Pending: 'bg-red-50 text-red-600',
  'Sent for Approval': 'bg-amber-50 text-amber-600',
  'In Progress': 'bg-blue-50 text-blue-600',
  Approved: 'bg-emerald-50 text-emerald-600',
  Rejected: 'bg-rose-50 text-rose-600',
  Cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_DOT = {
  Pending: 'bg-red-500',
  'Sent for Approval': 'bg-amber-500',
  'In Progress': 'bg-blue-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
  Cancelled: 'bg-gray-400',
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
)

// A small labeled value block used inside the Origin Details / Approval Details cards.
const InfoTile = ({ label, value, icon: Icon, className = '' }) => (
  <div className={`rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5 ${className}`}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800">{value}</p>
  </div>
);

// Module name sent to /api/audit-logs for every PR-related log lookup.
const AUDIT_MODULE_NAME = 'PURCHASE_REQUISITION';

const PurchaseRequisitionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { current, loading, error, fetchById } = usePurchaseRequisitions();
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchById(id);
  }, [id, fetchById]);

  const handleDownloadPdf = () => {
    // TODO: wire to downloadPurchaseRequisitionPdf(id) once that endpoint exists
  };

  if (loading && !current) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center text-gray-400">Loading...</div>
      </Container>
    );
  }

  if (error || !current) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center text-red-500">
          Failed to load purchase requisition.
        </div>
      </Container>
    );
  }

  const row = current;
  const itemCount = row.details?.length ?? 0;
  const isDecided = row.status === 'Approved' || row.status === 'Rejected';

  return (
    <Container>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 mt-4">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <Link
            to="/purchase-requisition/list"
            className="cursor-pointer hover:text-[#084E92] transition"
          >
            Purchase Requisition List
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">{row.prCode}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#084E92] to-[#0B65BD] px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/purchase-requisition/list"
              className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer border-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{row.prCode}</h1>
              <p className="text-blue-100/80 text-xs mt-0.5">Purchase requisition details</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusBadge status={row.status} size="lg" />
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/95 text-sm font-semibold text-[#084E92] hover:bg-white transition cursor-pointer border-0 shadow-sm"
            >
              <ScrollText className="w-4 h-4" />
              See Activity Log
            </button>
            {/* <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/15 text-sm font-semibold text-white hover:bg-white/25 transition cursor-pointer border-0"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button> */}
          </div>
        </div>

        {/* Origin details */}
        <SectionCard className="mt-5">
          <SectionHeader icon={Calendar} title="Origin Details" />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoTile label="Created Date" value={row.date} />
              <InfoTile label="Required Date" value={row.requiredDate} />
              <InfoTile label="Outlet / Branch" value={row.outlet} icon={Building2} className="col-span-2" />
            </div>

            {row.remarks && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3.5 mt-3">
                <p className="text-[11px] font-bold text-[#084E92] uppercase tracking-wide mb-1.5">
                  Internal Requisition Notes
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{row.remarks}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Approval / Rejection details — only shown once the PR has been
            decided. actionBy is the username of whoever approved/rejected it,
            sourced directly from getPurchaseRequisitionById via normalizePr. */}
        {isDecided && (
          <SectionCard className="mt-5">
            <SectionHeader icon={CheckCircle2} title={`${row.status} Details`} />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile label={`${row.status} By`} value={row.updatedBy || '—'} />
                <InfoTile label={`${row.status} On`} value={row.updatedAt || '—'} />
              </div>

              {row.notes && (
                <div
                  className={`rounded-xl border px-4 py-3.5 mt-3 ${
                    row.status === 'Approved'
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : 'bg-rose-50/60 border-rose-100'
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
                      row.status === 'Approved' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {row.status} Remarks
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">{row.notes}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Line items — quantity here is the final value; approveWithChanges
            overwrites `quantity` in place, so there is no separate
            "requested vs approved" pair to show. */}
        <SectionCard className="mt-5 overflow-hidden">
          <SectionHeader
            icon={ClipboardList}
            title="Items"
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
                  <th className="text-left font-semibold px-5 py-3">Raw Material Items</th>
                  <th className="text-left font-semibold px-5 py-3">Quantity</th>
                  <th className="text-left font-semibold px-5 py-3">Unit of Measure</th>
                </tr>
              </thead>
              <tbody>
                {itemCount === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-6 h-6 text-gray-300" />
                        No items on this requisition.
                      </div>
                    </td>
                  </tr>
                ) : (
                  row.details.map((item) => (
                    <tr key={item.id ?? item.rawMaterialId} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-800 font-medium">{item.rawMaterialName}</td>
                      <td className="px-5 py-3.5 text-gray-600">{item.quantity}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                          {item.uomName}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <PurchaseRequisitionLog
          open={logOpen}
          onClose={() => setLogOpen(false)}
          prCode={row.prCode}
          moduleId={row.id}
          moduleName={AUDIT_MODULE_NAME}
        />
      </div>
    </Container>
  );
};

export default PurchaseRequisitionView;