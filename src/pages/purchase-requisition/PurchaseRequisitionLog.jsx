import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  MessageSquare,
  RefreshCcw,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

/* -------------------------------------------------------------------------
 * Activity type presets ΓÇö one place to control the icon, dot color, and
 * badge styling for every kind of audit entry.
 * ---------------------------------------------------------------------- */

const ACTIVITY_TYPES = {
  added: {
    label: 'Added',
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

const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0];

/* -------------------------------------------------------------------------
 * Default mock entries ΓÇö stand-in until the audit-log API is wired up.
 * ---------------------------------------------------------------------- */

export const DEFAULT_LOG_ENTRIES = [
  {
    id: 'log-1',
    type: 'added',
    title: 'Industrial Grade Drill Bit Set (12-pc)',
    description: 'Line item added to requisition with a priority tag.',
    tag: 'Urgent',
    timestamp: '09:45 AM, Oct 24',
    user: 'Amit Kumar',
    role: 'Procurement Executive',
  },
  {
    id: 'log-2',
    type: 'quantity_change',
    title: 'Hydraulic Seal Kit (Model XJ-2)',
    description: 'Quantity adjusted from 10 to 25 units based on monthly forecast.',
    timestamp: '09:15 AM, Oct 24',
    user: 'Rajesh Jaiswal',
    role: 'Operations Head',
  },
  {
    id: 'log-3',
    type: 'remarks_updated',
    title: 'Safety Gear - High Viz Vests',
    quote: 'Need to ensure the branding logo is printed on the back. Preferred vendor: SafetyFirst Corp.',
    timestamp: 'Yesterday, 04:36 PM',
    user: 'Sanjay Patil',
    role: 'Store Manager',
  },
  {
    id: 'log-4',
    type: 'deleted',
    title: 'Office Stationery Pack (Standard)',
    description: 'Item removed from requisition. Redirected to internal stationery budget allocated for Q4.',
    timestamp: 'Yesterday, 02:19 PM',
    user: 'Amit Kumar',
    role: 'Procurement Executive',
  },
  {
    id: 'log-5',
    type: 'updated',
    title: 'Heavy Duty Conveyor Belt (50m)',
    description: "Vendor specification updated to 'Fire Resistant Grade B'. Estimated delivery date shifted to Nov 05.",
    timestamp: 'Oct 23, 11:30 AM',
    user: 'Vikram Jaiswal',
    role: 'Vendor Coordinator',
  },
];

/* -------------------------------------------------------------------------
 * Timeline entry
 * ---------------------------------------------------------------------- */

const LogEntry = ({ entry, isLast }) => {
  const meta = ACTIVITY_TYPES[entry.type] || ACTIVITY_TYPES.updated;
  const Icon = meta.icon;

  return (
    <div className="relative pl-9">
      {!isLast && <span className="absolute left-[13px] top-7 bottom-[-20px] w-px bg-gray-200" />}
      <span
        className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${meta.dot}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>

      <div className="bg-white border border-gray-100 rounded-xl p-3.5 mb-5">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${meta.badge}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-gray-400 shrink-0">{entry.timestamp}</span>
        </div>

        <p className="text-sm font-semibold text-gray-800 mt-2">{entry.title}</p>

        {entry.quote ? (
          <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2.5 mt-1.5">"{entry.quote}"</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1.5">
            {entry.description}
            {entry.tag && (
              <span className="ml-1.5 inline-block text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                {entry.tag}
              </span>
            )}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarColor(entry.user)}`}>
            {initials(entry.user)}
          </span>
          <span className="text-xs font-medium text-gray-700">{entry.user}</span>
          <span className="text-xs text-gray-400">{entry.role}</span>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * ActivityLogDrawer
 * Slide-over audit trail for a single Purchase Requisition.
 * ---------------------------------------------------------------------- */

const PurchaseRequisitionLog = ({ open, onClose, prCode, entries = DEFAULT_LOG_ENTRIES, totalActivities }) => {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.quote || '').toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [entries, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[400px] h-full bg-gray-50 shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-5 bg-white border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <ScrollText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-800">Activity Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Audit trail of revisions and updates for {prCode || 'this requisition'}
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
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shrink-0"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Filter
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 pt-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No activity matches your search.</p>
          ) : (
            filtered.map((entry, i) => <LogEntry key={entry.id} entry={entry} isLast={i === filtered.length - 1} />)
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-100 shrink-0">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-transparent border-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Log
          </button>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Total Activities: {totalActivities ?? entries.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisitionLog;