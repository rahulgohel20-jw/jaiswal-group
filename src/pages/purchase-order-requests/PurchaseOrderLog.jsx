import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  MessageSquare,
  RefreshCcw,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  XCircle,
  X,
} from 'lucide-react';
import { usePurchaseOrders } from './utils/usePurchaseOrders';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

/* -------------------------------------------------------------------------
 * Activity type presets — icon, dot color, and badge styling for PO audit entries.
 * ---------------------------------------------------------------------- */

const ACTIVITY_TYPES = {
  created: {
    label: 'Created',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500 text-white',
  },
  quantity_change: {
    label: 'Quantity Change',
    icon: RefreshCcw,
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white',
  },
  price_change: {
    label: 'Price Change',
    icon: RefreshCcw,
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-500 text-white',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500 text-white',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    dot: 'bg-red-500',
    badge: 'bg-red-500 text-white',
  },
  status_changed: {
    label: 'Status Changed',
    icon: RefreshCw,
    dot: 'bg-blue-500',
    badge: 'bg-blue-500 text-white',
  },
  deleted: {
    label: 'Deleted',
    icon: Trash2,
    dot: 'bg-red-500',
    badge: 'bg-red-500 text-white',
  },
  updated: {
    label: 'Updated',
    icon: RefreshCw,
    dot: 'bg-slate-700',
    badge: 'bg-slate-700 text-white',
  },
};

const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0];

const parseQtyValue = (str = '') => {
  const match = str.match(/^(.*?)\s*-\s*Qty:\s*(.+)$/i);
  if (!match) return { item: '', qty: str };
  return { item: match[1].trim(), qty: match[2].trim() };
};

const getEntryType = (fieldName, newValue) => {
  const field = (fieldName || '').toString().trim().toUpperCase();

  if (field === 'PO CREATED' || field === 'PR CREATED' || field === 'CREATED') return 'created';

  if (field === 'QTY CHANGED' || field === 'QUANTITY CHANGED') return 'quantity_change';

  if (field === 'PRICE CHANGED' || field === 'UNIT PRICE CHANGED') return 'price_change';

  if (field === 'STATUS CHANGED') {
    const status = (newValue || '').toString().trim().toUpperCase();
    if (status === 'APPROVED') return 'approved';
    if (status === 'REJECTED') return 'rejected';
    return 'status_changed';
  }

  if (field.includes('DELETE') || field.includes('REMOVE')) return 'deleted';

  return 'updated';
};

const normalizeLogEntry = (raw, idx) => {
  const type = getEntryType(raw.fieldName, raw.newValue);

  const entry = {
    id: raw.id ?? `log-${idx}`,
    type,
    title: raw.fieldName || 'Purchase Order updated',
    description: raw.comments || '',
    timestamp: raw.createdDate || '',
    user: raw.dataUpdatedBy || 'Unknown',
    role: '',
  };

  if (type === 'quantity_change') {
    const oldParsed = parseQtyValue(raw.oldValue);
    const newParsed = parseQtyValue(raw.newValue);
    entry.itemName = oldParsed.item || newParsed.item || '';
    entry.oldQty = oldParsed.qty;
    entry.newQty = newParsed.qty;
  }

  if (type === 'status_changed' || type === 'approved' || type === 'rejected') {
    entry.oldStatus = raw.oldValue || '';
    entry.newStatus = raw.newValue || '';
  }

  return entry;
};

const ValueDiff = ({ from, to, tone = 'amber' }) => {
  const toneCls = tone === 'amber' ? 'text-amber-600' : 'text-blue-600';

  return (
    <div className={`flex items-center gap-2 text-xs font-semibold ${toneCls}`}>
      <span className="line-through opacity-60 font-medium">{from || '—'}</span>
      <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
      <span>{to || '—'}</span>
    </div>
  );
};

const LogEntry = ({ entry, isLast }) => {
  const meta = ACTIVITY_TYPES[entry.type] || ACTIVITY_TYPES.updated;
  const Icon = meta.icon;

  return (
    <div className="relative pl-10">
      {!isLast && <span className="absolute left-3.5 top-8 -bottom-6 w-px bg-gray-200" />}
      <span
        className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${meta.dot}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>

      <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 mb-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${meta.badge}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-gray-400 shrink-0">{entry.timestamp}</span>
        </div>

        {entry.type === 'quantity_change' && (
          <ValueDiff from={entry.oldQty} to={entry.newQty} tone="amber" />
        )}

        {(entry.type === 'status_changed' || entry.type === 'approved' || entry.type === 'rejected') && (
          <ValueDiff from={entry.oldStatus} to={entry.newStatus} tone="blue" />
        )}

        {entry.description && (
          <p className="text-xs text-gray-500 leading-relaxed">{entry.description}</p>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor(
              entry.user,
            )}`}
          >
            {initials(entry.user)}
          </span>
          <span className="text-xs font-semibold text-gray-700">{entry.user}</span>
          {entry.role && <span className="text-xs text-gray-400">{entry.role}</span>}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * PurchaseOrderLog
 * Slide-over audit trail for a single Purchase Order. Fetches its own data
 * via usePurchaseOrders hook, scoped to moduleId + moduleName ("PURCHASE_ORDER").
 * ---------------------------------------------------------------------- */

const PurchaseOrderLog = ({
  open,
  onClose,
  poCode,
  moduleId,
  moduleName = 'PURCHASE_ORDER',
  subModuleId,
}) => {
  const [query, setQuery] = useState('');
  const { logs, logsLoading, logsError, fetchAuditLogs } = usePurchaseOrders();

  useEffect(() => {
    if (!open || !moduleId) return;
    fetchAuditLogs(moduleId, moduleName, subModuleId);
  }, [open, moduleId, moduleName, subModuleId, fetchAuditLogs]);

  const entries = useMemo(() => {
    return (logs || []).map(normalizeLogEntry);
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.itemName || '').toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [entries, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-100 h-full bg-gray-50 shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-5 bg-white border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <ScrollText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-800">Activity Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tracks item additions, edits, prices, and status changes for {poCode || 'this purchase order'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-4 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by item, user, or specific activity..."
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 pt-1">
          {logsLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading activity…
            </div>
          ) : logsError ? (
            <p className="text-sm text-red-500 text-center py-10">{logsError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No activity matches your search.</p>
          ) : (
            filtered.map((entry, i) => (
              <LogEntry key={entry.id} entry={entry} isLast={i === filtered.length - 1} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 bg-white border-t border-gray-200 shrink-0">
          <span className="text-xs text-gray-400">
            Total Activities
            <span className="ml-1.5 font-semibold text-gray-700">{entries.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderLog;
