import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCcw,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getAuditLogs } from '@/services/apiServices';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const ACTIVITY_TYPES = {
  added: {
    label: 'Added',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500 text-white',
  },
  quantity_change: {
    label: 'Quantity Changed',
    icon: RefreshCcw,
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white',
  },
  remarks_updated: {
    label: 'Remarks Updated',
    icon: MessageSquare,
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
const avatarColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0];

/* -------------------------------------------------------------------------
 * Maps a raw fieldName from /audit-logs into one of the type keys above.
 * ---------------------------------------------------------------------- */

const getEntryType = (fieldName) => {
  const field = (fieldName || '').toString().trim().toUpperCase();

  if (field.includes('ADD')) return 'added';
  if (field.includes('QTY') || field.includes('QUANTITY')) return 'quantity_change';
  if (field.includes('REMARK')) return 'remarks_updated';
  if (field.includes('DELETE') || field.includes('REMOVE')) return 'deleted';

  return 'updated';
};

const normalizeLogEntry = (raw, idx) => {
  const type = getEntryType(raw.fieldName);

  return {
    id: raw.id ?? `log-${idx}`,
    type,
    itemName: raw.itemName || raw.fieldName || 'GRN item',
    description: raw.comments || raw.remarks || '',
    quote: type === 'remarks_updated' ? raw.newValue || raw.comments || '' : '',
    diffFrom: type === 'quantity_change' ? raw.oldValue : '',
    diffTo: type === 'quantity_change' ? raw.newValue : '',
    timestamp: raw.createdDate || '',
    user: raw.dataUpdatedBy || 'Unknown',
    role: raw.role || '',
  };
};

/* -------------------------------------------------------------------------
 * Timeline entry
 * ---------------------------------------------------------------------- */

const LogEntry = ({ entry, isLast }) => {
  const meta = ACTIVITY_TYPES[entry.type] || ACTIVITY_TYPES.updated;
  const Icon = meta.icon;

  return (
    <div className="relative pl-9">
      {!isLast && <span className="absolute left-3 top-7 -bottom-6 w-px bg-gray-200" />}
      <span
        className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-gray-50 ${meta.dot}`}
      >
        <Icon className="w-3 h-3" />
      </span>

      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 mb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${meta.badge}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">{entry.timestamp}</span>
        </div>

        <p className="text-sm font-semibold text-gray-800 leading-snug">{entry.itemName}</p>

        {entry.type === 'quantity_change' && (entry.diffFrom || entry.diffTo) && (
          <p className="text-xs text-gray-500">
            Quantity adjusted from{' '}
            <span className="font-semibold text-gray-700">{entry.diffFrom || '—'}</span> to{' '}
            <span className="font-semibold text-amber-600">{entry.diffTo || '—'}</span>
          </p>
        )}

        {entry.type === 'remarks_updated' && entry.quote ? (
          <blockquote className="text-xs text-gray-500 italic border-l-2 border-blue-200 pl-2.5">
            "{entry.quote}"
          </blockquote>
        ) : (
          entry.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{entry.description}</p>
          )
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor(
              entry.user
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
 * Dummy data — remove once the real /audit-logs API is wired up for GRN
 * ---------------------------------------------------------------------- */

const DUMMY_LOG_ENTRIES = [
  {
    id: 1,
    fieldName: 'ITEM ADDED',
    itemName: 'Industrial Grade Drill Bit Set (12-pc)',
    comments: "Line item added to requisition with a priority tag 'Urgent'.",
    createdDate: '10:45 AM, Oct 24',
    dataUpdatedBy: 'Amit Kumar',
    role: 'Procurement Executive',
  },
  {
    id: 2,
    fieldName: 'QTY CHANGED',
    itemName: 'Hydraulic Seal Kit (Model XJ-2)',
    oldValue: '10',
    newValue: '25',
    comments: '',
    createdDate: '09:15 AM, Oct 24',
    dataUpdatedBy: 'Rajesh Jaiswal',
    role: 'Operations Head',
  },
  {
    id: 3,
    fieldName: 'REMARKS UPDATED',
    itemName: 'Safety Gear - High Viz Vests',
    newValue: 'Need to ensure the branding logo is printed on the back. Preferred vendor: SafetyFirst Corp.',
    comments: 'Need to ensure the branding logo is printed on the back. Preferred vendor: SafetyFirst Corp.',
    createdDate: 'Yesterday, 04:30 PM',
    dataUpdatedBy: 'Sanjay Patil',
    role: 'Floor Manager',
  },
  {
    id: 4,
    fieldName: 'ITEM DELETED',
    itemName: 'Office Stationery Pack (Standard)',
    comments: 'Item removed from requisition. Redirected to internal stationery budget allocated for Q4.',
    createdDate: 'Yesterday, 02:10 PM',
    dataUpdatedBy: 'Amit Kumar',
    role: 'Procurement Executive',
  },
  {
    id: 5,
    fieldName: 'UPDATED',
    itemName: 'Heavy Duty Conveyor Belt (50m)',
    comments: "Vendor specification updated to 'Fire Resistant Grade B'. Estimated delivery date shifted to Nov 05.",
    createdDate: 'Oct 22, 11:38 AM',
    dataUpdatedBy: 'Vikram Jaiswal',
    role: 'Director',
  },
];

const GrnActivityLog = ({
  open,
  onClose,
  grnCode,
  moduleId,
  moduleName = 'GRN',
  subModuleId,
}) => {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // simulate a network delay for dummy data
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!cancelled) setEntries(DUMMY_LOG_ENTRIES.map(normalizeLogEntry));
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load activity log.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesQuery =
        !q ||
        e.itemName.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q);

      const matchesDate = !dateFilter || (e.timestamp || '').startsWith(dateFilter);

      return matchesQuery && matchesDate;
    });
  }, [entries, query, dateFilter]);

  const handleExport = () => {
    // TODO: wire up to a real export endpoint once available
  };

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
              Audit trail of revisions and updates for {grnCode || 'this GRN'}
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

          <div className="flex items-center gap-2.5">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm font-medium shrink-0 hover:bg-slate-800 transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 pt-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading activity…
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-10">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No activity matches your search.</p>
          ) : (
            filtered.map((entry, i) => (
              <LogEntry key={entry.id} entry={entry} isLast={i === filtered.length - 1} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Log
          </button>
          <span className="text-xs text-gray-400">
            Total Activities
            <span className="ml-1.5 font-semibold text-gray-700">{entries.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default GrnActivityLog;
