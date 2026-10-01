import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getEmailFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Handshake,
  Link2,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { SearchBar } from '@/components/common/SearchBar';
import { OrgTypes } from '../../constants/orgTypes';
import {
  assignVendorOutletMapping,
  deleteVendorOutletMapping,
  deleteVendorOutletMappingByVendor,
  getAllActiveVendors,
  getAllVendorOutletMappings,
  getOrganizationByType,
} from '../../services/apiServices';
import { useNavigate } from 'react-router';

// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const StatCard = ({
  icon: Icon,
  iconBg = 'bg-[#D5E3FF]',
  iconColor = 'text-[#00376C]',
  label,
  value,
  valueColor = 'text-[#1B1B1F]',
}) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div
      className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{label}</span>
      <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
        {value}
      </span>
    </div>
  </div>
);

const SingleSelectDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
  }, [options, query]);

  const handlePick = (option) => {
    onChange(option);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
        {label}
      </label>

      <div
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-full border border-gray-200 hover:border-gray-300 rounded-xl px-3.5 flex items-center justify-between gap-2 cursor-pointer bg-white transition shadow-2xs"
      >
        <span
          className={`text-xs sm:text-sm truncate ${selected ? 'font-medium text-gray-900' : 'text-gray-400'}`}
        >
          {selected ? selected.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected && (
            <X
              size={14}
              className="text-gray-400 hover:text-red-500 transition"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 duration-100">
          <div className="relative border-b border-gray-100 bg-gray-50/50">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor..."
              className="w-full pl-8.5 pr-3 py-2 text-xs sm:text-sm outline-none bg-transparent"
            />
          </div>

          <div className="overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <p className="px-3 py-2.5 text-xs text-gray-400">Loading vendors...</p>
            )}

            {!loading && filteredOptions.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-gray-400">
                No vendors found.
              </p>
            )}

            {!loading &&
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handlePick(option)}
                  className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition flex items-center justify-between ${selected?.id === option.id
                    ? 'bg-blue-50 text-[#084E92] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span>{option.name}</span>
                  {selected?.id === option.id && (
                    <span className="text-[#084E92] text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AssignedUnitsTooltip = ({ units }) => {
  const wrapperRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const updatePosition = () => {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipHeight = 220;
    const gap = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const above = spaceBelow < tooltipHeight + gap && spaceAbove > tooltipHeight + gap;

    setShowAbove(above);

    setPosition({
      left: rect.left,
      top: above ? rect.top - tooltipHeight - gap : rect.bottom + gap,
    });
  };

  const handleMouseEnter = () => {
    clearHideTimer();
    updatePosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    clearHideTimer();

    hideTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 300);
  };

  useEffect(() => {
    return () => clearHideTimer();
  }, []);

  return (
    <>
      <div ref={wrapperRef} className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <span className="inline-flex items-center bg-[#F0F6FC] text-[#084E92] border border-[#E0EDFA] text-xs font-semibold px-2.5 py-1 rounded-full cursor-help">
          ...
        </span>
      </div>

      {showTooltip && (
        <div className="fixed z-99999" style={{ left: position.left, top: position.top }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="relative bg-[#1F2937] text-white rounded-lg shadow-xl border border-gray-700 px-3 py-2.5 min-w-50 max-w-70">
            <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-1.5 pb-1.5 border-b border-gray-600">
              Assigned Units
            </div>

            <div className="max-h-48 overflow-y-auto">
              {units.map((u, index) => (
                <div key={u.id} className="flex items-start gap-2 py-0.5 text-xs">
                  <span className="text-gray-400 min-w-4.5">{index + 1}.</span>
                  <span className="text-white wrap-break-word">{u.name}</span>
                </div>
              ))}
            </div>

            <span className={`absolute left-4 w-0 h-0 border-l-[5px] border-r-[5px] border-transparent ${showAbove ? 'top-full border-t-[5px] border-t-[#1F2937]' : 'bottom-full border-b-[5px] border-b-[#1F2937]'}`} />
          </div>
        </div>
      )}
    </>
  );
};

const MultiSelectDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
  }, [options, query]);

  const isSelected = (id) => selected.some((s) => s.id === id);

  const toggleOption = (option) => {
    if (isSelected(option.id)) {
      onChange(selected.filter((s) => s.id !== option.id));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (id) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  const isAllSelected = options.length > 0 && selected.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700 block">
          {label}
        </label>
        {selected.length > 0 && (
          <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
            {selected.length} selected
          </span>
        )}
      </div>

      <div
        onClick={() => setOpen((prev) => !prev)}
        className="min-h-10 w-full border border-gray-200 hover:border-gray-300 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer bg-white transition shadow-2xs"
      >
        {selected.length === 0 && (
          <span className="text-gray-400 text-xs sm:text-sm px-1">{placeholder}</span>
        )}

        {isAllSelected ? (
          <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-md">
            All Units Selected ({options.length})
            <X
              size={12}
              className="cursor-pointer hover:text-red-500 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          </span>
        ) : (
          selected.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-1 rounded-md"
            >
              {item.name}
              <X
                size={12}
                className="cursor-pointer hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(item.id);
                }}
              />
            </span>
          ))
        )}

        <ChevronDown size={15} className={`ml-auto text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 duration-100">
          <div className="relative border-b border-gray-100 bg-gray-50/50">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search units..."
              className="w-full pl-8.5 pr-3 py-2 text-xs sm:text-sm outline-none bg-transparent"
            />
          </div>

          <div className="overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <p className="px-3 py-2.5 text-xs text-gray-400">Loading units...</p>
            )}

            {!loading && filteredOptions.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-gray-400">
                No units found.
              </p>
            )}

            {/* "All Units" checkbox option */}
            {!loading && options.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 text-sm font-semibold border-b border-gray-100 hover:bg-[#F4F7FF] cursor-pointer text-[#084E92]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#084E92]"
                />
                All Units ({options.length})
              </label>
            )}

            {!loading &&
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-[#084E92] cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={isSelected(option.id)}
                    onChange={() => toggleOption(option)}
                    className="w-4 h-4 rounded text-[#084E92] accent-[#084E92] cursor-pointer"
                  />
                  <span className={isSelected(option.id) ? 'font-semibold text-[#084E92]' : ''}>
                    {option.name}
                  </span>
                </label>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Normalizes a raw outlet/org record from getOrganizationByType into { id, name }.
const normalizeUnit = (o) => ({
  id: o.id,
  name: o.companyNameEnglish ?? o.name,
});

// Normalizes a raw vendor record from getAllActiveVendors into { id, name, gstRegisteredName }.
const normalizeVendor = (v) => ({
  id: v.id,
  name:
    v.companyName ||
    v.fullName ||
    v.companyNameEnglish ||
    v.vendorName ||
    v.name,
  gstRegisteredName: v.gstRegisteredName ?? null,
});

// Groups flat rows from GET /vendor-outlet-mapping/get-all
const groupMappings = (rawRows, vendorsById, unitsById) => {
  const byVendor = new Map();

  for (const row of rawRows) {
    const vendorId = row.vendorId || row.vendor?.id;
    if (vendorId == null) continue;

    if (!byVendor.has(vendorId)) {
      const resolvedVendor = vendorsById.get(vendorId);
      byVendor.set(vendorId, {
        id: vendorId,
        vendor: resolvedVendor || {
          id: vendorId,
          name: row.vendorCompanyName || row.vendorName || `Vendor ${vendorId}`,
          gstRegisteredName: null,
        },
        units: [],
      });
    }

    const entry = byVendor.get(vendorId);

    const outletId = row.organizationId;
    const outletName = row.organizationName;

    if (outletId != null && !entry.units.some((u) => u.id === outletId)) {
      entry.units.push(
        unitsById.get(outletId) ?? {
          id: outletId,
          name: outletName || `Outlet ${outletId}`,
        },
      );
    }
  }

  return Array.from(byVendor.values());
};

const VendorUnitMapping = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Vendor Unit Mapping');

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState(null);

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [saving, setSaving] = useState(false);

  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      setVendorsLoading(true);
      try {
        const res = await getAllActiveVendors();
        const raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
        const list = Array.isArray(raw) ? raw : Object.values(raw);
        setVendors(list.map(normalizeVendor));
      } catch (err) {
        console.error(err);
      } finally {
        setVendorsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchUnits = async () => {
      setUnitsLoading(true);
      setUnitsError(null);

      try {
        const res = await getOrganizationByType(OrgTypes.OUTLET);
        const rawUnits =
          res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
        const list = Array.isArray(rawUnits)
          ? rawUnits
          : Object.values(rawUnits);
        setUnits(list.map(normalizeUnit));
      } catch (err) {
        console.error(err);
        setUnitsError('Failed to load units.');
      } finally {
        setUnitsLoading(false);
      }
    };

    fetchUnits();
  }, []);

  const fetchMappings = async () => {
    setMappingsLoading(true);
    setMappingsError(null);
    try {
      const res = await getAllVendorOutletMappings();
      const raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : Object.values(raw);

      const vendorsById = new Map(vendors.map((v) => [v.id, v]));
      const unitsById = new Map(units.map((u) => [u.id, u]));

      setMappings(groupMappings(list, vendorsById, unitsById));
    } catch (err) {
      console.error(err);
      setMappingsError('Failed to load mappings.');
    } finally {
      setMappingsLoading(false);
    }
  };

  useEffect(() => {
    if (vendors.length === 0 && units.length === 0) return;
    fetchMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, units]);

  const filteredMappings = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return mappings.filter((m) => {
      const vendorName = m.vendor?.name?.toLowerCase() ?? '';
      const unitNames = (m.units || [])
        .map((u) => u.name.toLowerCase())
        .join(', ');

      const matchesSearch =
        !term || vendorName.includes(term) || unitNames.includes(term);
      const matchesVendor =
        !vendorFilter || String(m.vendor?.id) === String(vendorFilter);
      const matchesUnit =
        !unitFilter ||
        (m.units || []).some((u) => String(u.id) === String(unitFilter));

      return matchesSearch && matchesVendor && matchesUnit;
    });
  }, [mappings, searchText, vendorFilter, unitFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchText, vendorFilter, unitFilter]);

  const handleSaveMapping = async () => {
    if (!selectedVendor || selectedUnits.length === 0) return;

    setSaving(true);
    try {
      await assignVendorOutletMapping({
        outletIds: selectedUnits.map((u) => u.id),
        username: getEmailFromToken(),
        vendorId: selectedVendor.id,
      });

      await fetchMappings();
      setSelectedVendor(null);
      setSelectedUnits([]);
    } catch (err) {
      console.error(err);
      setMappingsError('Failed to save mapping.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (row) => {
    setDeleteTarget({
      type: 'row',
      vendorId: row.vendor.id,
      name: `${row.vendor?.name} - ${(row.units || []).map((u) => u.name).join(', ')}`,
    });
    setShowDeleteConfirm(true);
  };

  const openRemoveUnitConfirm = (vendorId, unit) => {
    setDeleteTarget({
      type: 'unit',
      vendorId,
      unitId: unit.id,
      name: unit.name,
    });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'unit') {
        await deleteVendorOutletMapping(
          deleteTarget.vendorId,
          deleteTarget.unitId,
        );
      } else {
        await deleteVendorOutletMappingByVendor(deleteTarget.vendorId);
      }
      await fetchMappings();
    } catch (err) {
      console.error(err);
      setMappingsError('Failed to delete mapping.');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-gray-500 font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500">
            {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 70,
      },
      {
        id: 'vendor',
        accessorFn: (row) => row.vendor?.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor Name" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#084E92] flex items-center justify-center text-xs font-semibold shrink-0">
              {(row.original.vendor?.name || 'V').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-none truncate">
                {row.original.vendor?.name}
              </p>
            </div>
          </div>
        ),
        size: 220,
      },
      {
        id: 'gstRegisteredName',
        accessorFn: (row) => row.vendor?.gstRegisteredName,
        header: ({ column }) => (
          <DataGridColumnHeader title="Registered Company Name" column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.vendor?.gstRegisteredName || '—'}
            widthClass="max-w-[200px]"
          />
        ),
        size: 200,
      },
      {
        id: 'units',
        header: ({ column }) => (
          <DataGridColumnHeader title="Assigned Units" column={column} />
        ),
        cell: ({ row }) => {
          const rowUnits = row.original.units || [];

          const visibleUnits = rowUnits.slice(0, 4);
          const remainingUnits = rowUnits.slice(4);
          const hasMore = remainingUnits.length > 0;

          return (
            <div className="flex flex-wrap gap-1.5 items-center">
              {visibleUnits.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 bg-[#F0F6FC] text-[#084E92] border border-[#E0EDFA] text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {u.name}

                  {canDelete && (
                    <X
                      size={12}
                      className="cursor-pointer hover:text-red-500"
                      onClick={() =>
                        openRemoveUnitConfirm(row.original.vendor.id, u)
                      }
                    />
                  )}
                </span>
              ))}

              {hasMore && (
                <AssignedUnitsTooltip units={rowUnits} />
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 300,
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) =>
          canDelete ? (
            <Trash2
              size={18}
              className="text-red-300 cursor-pointer hover:text-red-700"
              onClick={() => openDeleteConfirm(row.original)}
            />
          ) : null,
        enableSorting: false,
        size: 90,
      },
    ],
    [canDelete, pagination, units],
  );

  const table = useReactTable({
    data: filteredMappings,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
  });

  if (!canView) {
    return <AccessDenied pageTitle="Vendor & Unit Mapping" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page header */}
        <PageHeader
          title="Vendor & Unit Mapping"
          description="Map vendors to one or multiple units for procurement and purchase management."
        />

        {/* Vendor Mapping Details */}
        {(canAdd || canEdit) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs mt-4 mb-6">
            {(unitsError || mappingsError) && (
              <p className="text-xs text-red-500 mb-3 bg-red-50 p-2.5 rounded-lg border border-red-100">{unitsError || mappingsError}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_auto] gap-3.5 items-end">
              <SingleSelectDropdown
                label="Vendor Name"
                placeholder="Select a vendor"
                options={vendors}
                selected={selectedVendor}
                onChange={setSelectedVendor}
                loading={vendorsLoading}
              />

              <MultiSelectDropdown
                label="Unit selection"
                placeholder="Select a Unit"
                options={units}
                selected={selectedUnits}
                onChange={setSelectedUnits}
                loading={unitsLoading}
              />

              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={saving || !selectedVendor || selectedUnits.length === 0}
                className="h-10 px-5 bg-[#084E92] hover:bg-[#073e77] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Link2 size={15} />
                {saving ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchBar
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onClear={() => setSearchText('')}
              placeholder="Search by vendor, registered company, or unit..."
            />
          </div>

          <Select
            value={vendorFilter || 'all'}
            onValueChange={(value) =>
              setVendorFilter(value === 'all' ? '' : value)
            }
          >
            <SelectTrigger className="w-full sm:w-48 h-10 border-[#C3C6D1] rounded-xl bg-white text-sm">
              <SelectValue placeholder="Filter by Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={unitFilter || 'all'}
            onValueChange={(value) =>
              setUnitFilter(value === 'all' ? '' : value)
            }
          >
            <SelectTrigger className="w-full sm:w-48 h-10 border-[#C3C6D1] rounded-xl bg-white text-sm">
              <SelectValue placeholder="Filter by Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Listing Table */}
        <div className="w-full my-6 border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
          {mappingsError && (
            <p className="text-sm text-red-600 p-4">{mappingsError}</p>
          )}
          {mappingsLoading && (
            <p className="text-sm text-gray-400 p-4">Loading mappings...</p>
          )}

          <DataGrid table={table} recordCount={filteredMappings.length}>
            <Card className="rounded-t-none border-t-0">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              <CardFooter>
                <DataGridPagination />
              </CardFooter>
            </Card>
          </DataGrid>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.name}
        saving={deleteLoading}
      />
    </Container>
  );
};

export default VendorUnitMapping;