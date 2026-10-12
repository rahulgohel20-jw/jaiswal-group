import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getUserIdFromToken, getOrgIdFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  Link2,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { SearchBar } from '@/components/common/SearchBar';
import SearchableSelect from '../../../utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { notify } from '@/utils/toast';
import {
  createBrandMapping,
  deleteBrandMappingById,
  deleteBrandMappingByOutletAndSubOutlet,
  getAllActiveRawMaterialBrand,
  getAllSubOutletsByOrganization,
  getBrandMappingByOutlet,
  getBrandMappingBySubOutlet,
} from '../../../services/apiServices';

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || '-'}
  </span>
);

/* -----------------------------------------------------------------------
 * Searchable Multi-Select for Brands
 * -------------------------------------------------------------------- */
const MultiSelectDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  loading,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

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
    return options.filter((o) => (o.name ?? o.label ?? '').toLowerCase().includes(term));
  }, [options, query]);

  const isSelected = (id) => selected.some((s) => s.id === id);

  const toggleOption = (option) => {
    if (isSelected(option.id)) {
      onChange(selected.filter((s) => s.id !== option.id));
    } else {
      onChange([...selected, option]);
    }
    setQuery('');
    inputRef.current?.focus();
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
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {selected.length > 0 && (
          <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
            {selected.length} selected
          </span>
        )}
      </div>

      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="min-h-10 w-full border border-gray-200 hover:border-gray-300 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text bg-white transition shadow-2xs"
      >
        {isAllSelected ? (
          <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-md">
            All Brands Selected ({options.length})
            <X
              size={12}
              className="cursor-pointer hover:text-red-500 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          </span>
        ) : selected.length > 3 ? (
          <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2.5 py-1 rounded-md">
            {selected.length} brands selected
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
              className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded"
            >
              <span className="truncate max-w-28">{item.name}</span>
              <X
                size={12}
                className="cursor-pointer hover:text-red-500 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(item.id);
                }}
              />
            </span>
          ))
        )}

        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-22.5 text-xs sm:text-sm outline-none py-1 bg-transparent placeholder:text-gray-400"
        />

        <ChevronDown
          size={15}
          className={`ml-auto text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-[#C3C6D1] rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 duration-100">
          <div className="overflow-y-auto divide-y divide-gray-50 text-xs">
            {loading && (
              <p className="px-3 py-2.5 text-gray-400">Loading brands...</p>
            )}

            {!loading && filteredOptions.length === 0 && (
              <p className="px-3 py-2.5 text-gray-400 text-center">No brands found.</p>
            )}

            {!loading && options.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#084E92] hover:bg-blue-50/70 border-b border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#084E92] rounded"
                />
                All Brands ({options.length})
              </label>
            )}

            {!loading &&
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50/70 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={isSelected(option.id)}
                    onChange={() => toggleOption(option)}
                    className="accent-[#084E92] rounded"
                  />
                  <span className={`truncate ${isSelected(option.id) ? 'font-semibold text-[#084E92]' : ''}`}>
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

/*  Modal: View & Remove individual brands mapped to an outlet- */
const AssignedBrandsModal = ({
  isOpen,
  onClose,
  target,
  onRemoveBrand,
  canDelete,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen || !target) return null;

  const filtered = (target.brands || []).filter((b) =>
    (b.name || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 pr-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <Tag size={16} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-gray-900 truncate">
                  Assigned Brands
                </DialogTitle>
                <p className="text-xs text-gray-500 truncate">
                  {target.outletName} {target.subOutletName ? `(${target.subOutletName})` : ''}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#084E92] border border-blue-100 rounded-full shrink-0">
              {target.brands?.length || 0} Brands
            </span>
          </div>
        </DialogHeader>

        <div className="my-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assigned brands..."
              className="w-full pl-8.5 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#084E92]/20 focus:border-[#084E92]"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              {search ? 'No matching brands found.' : 'No brands assigned.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map((b) => (
                <div
                  key={b.mappingId || b.id}
                  className="flex items-center gap-1.5 bg-[#F0F6FC] text-[#084E92] border border-[#E0EDFA] text-xs font-medium px-3 py-1.5 rounded-full group transition hover:bg-[#E0EDFA]"
                >
                  <span>{b.name}</span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onRemoveBrand(b)}
                      className="p-0.5 text-gray-400 hover:text-red-600 rounded-full cursor-pointer transition"
                      title={`Remove ${b.name}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* Main Screen */
const BrandUnitMapping = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Brand Unit Mapping');

  const {
    loading: orgScopeLoading,
    showUnitDropdown,
    effectiveOutletId,
    isOutletUser,
    units: scopeUnits,
    selfOrg,
  } = useOrgScope();

  // Form State
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [subOutletId, setSubOutletId] = useState('');
  const [saving, setSaving] = useState(false);

  // Master Catalogs
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [subOutlets, setSubOutlets] = useState([]);
  const [filterSubOutlets, setFilterSubOutlets] = useState([]);

  // Table & Mappings
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState('');
  const [subOutletFilter, setSubOutletFilter] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Delete & Modal States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingTargetModal, setViewingTargetModal] = useState(null);

  // Format Outlet options from useOrgScope
  const outletOptions = useMemo(() => {
    let list = Array.isArray(scopeUnits) ? scopeUnits : [];
    list = list.filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL');

    if (list.length === 0 && selfOrg?.id) {
      list = [selfOrg];
    }

    return list.map((unit) => {
      const name =
        unit.companyNameEnglish ||
        unit.companyName ||
        unit.name ||
        `Outlet #${unit.id}`;
      const code = unit.companyCode || unit.code || '';
      return {
        value: String(unit.id),
        label: name,
      };
    });
  }, [scopeUnits, selfOrg]);

  // Synchronize outlet selection and filter based on user scope
  useEffect(() => {
    if (orgScopeLoading) return;

    const loggedInOutlet =
      (effectiveOutletId ? String(effectiveOutletId) : '') ||
      (selfOrg?.id ? String(selfOrg.id) : '') ||
      (getOrgIdFromToken() ? String(getOrgIdFromToken()) : '');

    if (isOutletUser || !showUnitDropdown) {
      if (loggedInOutlet) {
        setOutletId(loggedInOutlet);
        setOutletFilter(loggedInOutlet);
      }
    }
  }, [orgScopeLoading, isOutletUser, showUnitDropdown, effectiveOutletId, selfOrg]);

  // Load Sub Outlets for Form when form outletId changes
  useEffect(() => {
    if (!outletId || outletId === '0') {
      setSubOutlets([]);
      setSubOutletId('');
      return;
    }

    let isMounted = true;
    const fetchSubOutlets = async () => {
      try {
        const res = await getAllSubOutletsByOrganization(outletId);
        if (!isMounted) return;
        setSubOutlets(extractArray(res));
      } catch (err) {
        console.error('Failed to load sub outlets:', err);
        if (isMounted) setSubOutlets([]);
      }
    };
    fetchSubOutlets();

    return () => {
      isMounted = false;
    };
  }, [outletId]);

  // Load Sub Outlets for Filter Bar when outletFilter changes
  useEffect(() => {
    if (!outletFilter) {
      setFilterSubOutlets([]);
      setSubOutletFilter('');
      return;
    }

    let isMounted = true;
    const fetchFilterSubOutlets = async () => {
      try {
        const res = await getAllSubOutletsByOrganization(outletFilter);
        if (!isMounted) return;
        setFilterSubOutlets(extractArray(res));
      } catch (err) {
        console.error('Failed to load filter sub outlets:', err);
        if (isMounted) setFilterSubOutlets([]);
      }
    };
    fetchFilterSubOutlets();

    return () => {
      isMounted = false;
    };
  }, [outletFilter]);

  // Load Brands Catalog
  useEffect(() => {
    const fetchBrands = async () => {
      setBrandsLoading(true);
      try {
        const res = await getAllActiveRawMaterialBrand();
        const list = extractArray(res);
        setBrands(
          list.map((b) => ({
            id: b.id,
            name: b.nameEnglish || b.name || `Brand #${b.id}`,
          }))
        );
      } catch (err) {
        console.error('Failed to load brands:', err);
      } finally {
        setBrandsLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Group flat mappings by Outlet and SubOutlet
  const groupBrandMappings = (rawRows) => {
    if (!Array.isArray(rawRows)) return [];

    const groupMap = new Map();

    for (const row of rawRows) {
      if (!row || row.isDelete) continue;

      const rowOutletId = row.outletId ?? row.organizationId;
      const rowSubOutletId = row.subOutletId ?? null;
      const groupKey = `${rowOutletId}_${rowSubOutletId || 'none'}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: groupKey,
          outletId: rowOutletId,
          subOutletId: rowSubOutletId,
          outletName: row.outletName || row.organizationName || `Outlet #${rowOutletId}`,
          subOutletName: row.subOutletName || row.subUnitName || (rowSubOutletId ? `Sub Outlet #${rowSubOutletId}` : '—'),
          brands: [],
        });
      }

      const brandId = row.brandId ?? row.rawMaterialBrandId;
      const brandName = row.brandName ?? row.rawMaterialBrandName ?? `Brand #${brandId}`;

      groupMap.get(groupKey).brands.push({
        mappingId: row.id,
        id: brandId,
        name: brandName,
      });
    }

    return Array.from(groupMap.values());
  };

  // Fetch mappings
  const fetchMappings = useCallback(async () => {
    const targetOrgId =
      outletFilter ||
      (isOutletUser && effectiveOutletId ? String(effectiveOutletId) : '') ||
      (selfOrg?.id ? String(selfOrg.id) : '') ||
      (getOrgIdFromToken() ? String(getOrgIdFromToken()) : '');

    if (!targetOrgId) {
      setMappings([]);
      setMappingsLoading(false);
      return;
    }

    setMappingsLoading(true);
    setMappingsError(null);

    try {
      let res;
      if (subOutletFilter) {
        res = await getBrandMappingBySubOutlet(Number(targetOrgId), Number(subOutletFilter));
      } else {
        res = await getBrandMappingByOutlet(Number(targetOrgId));
      }

      const rawList = extractArray(res);
      const grouped = groupBrandMappings(rawList);
      setMappings(grouped);
    } catch (err) {
      console.error('Failed to load brand mappings:', err);
      setMappingsError(err?.response?.data?.message || err?.message || 'Failed to load brand mappings.');
      setMappings([]);
    } finally {
      setMappingsLoading(false);
    }
  }, [outletFilter, subOutletFilter, isOutletUser, effectiveOutletId, selfOrg]);

  // Trigger fetch when scope is resolved or filter changes
  useEffect(() => {
    if (!orgScopeLoading) {
      fetchMappings();
    }
  }, [orgScopeLoading, fetchMappings]);

  // In-memory filter for search and brand filter
  const filteredMappings = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return mappings.filter((m) => {
      const outletName = (m.outletName || '').toLowerCase();
      const subOutletName = (m.subOutletName || '').toLowerCase();
      const brandNames = (m.brands || []).map((b) => b.name.toLowerCase()).join(', ');

      const matchesSearch =
        !term ||
        outletName.includes(term) ||
        subOutletName.includes(term) ||
        brandNames.includes(term);

      const matchesBrand =
        !brandFilter || (m.brands || []).some((b) => String(b.id) === String(brandFilter));

      return matchesSearch && matchesBrand;
    });
  }, [mappings, searchText, brandFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchText, brandFilter, outletFilter, subOutletFilter]);

  const handleSaveMapping = async () => {
    if (selectedBrands.length === 0) {
      notify.error('Please select at least one Raw Material Brand.');
      return;
    }
    if (!outletId) {
      notify.error('Please select an Outlet.');
      return;
    }

    setSaving(true);
    try {
      const currentUserId = getUserIdFromToken() || 0;
      const outletNum = Number(outletId);
      const subOutletNum = Number(subOutletId) || '';
      const brandIdList = selectedBrands.map((brand) => Number(brand.id)).filter(Boolean);

      const payload = {
        brandId: brandIdList,
        createdBy: currentUserId,
        outletId: outletNum,
        subOutletId: subOutletNum,
      };

      await createBrandMapping(payload);

      setSelectedBrands([]);
      if (showUnitDropdown && !isOutletUser) {
        setOutletId('');
        setSubOutletId('');
      } else {
        setSubOutletId('');
      }
      await fetchMappings();
    } catch (err) {
      console.error('Failed to create brand mapping:', err);
      notify.error(err?.response?.data?.message || err?.message || 'Failed to save brand mapping.');
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------------------------------------------------
   * Delete Handlers (Row vs Single Brand)
   * -------------------------------------------------------------------- */
  const openDeleteRowConfirm = (row) => {
    setDeleteTarget({
      type: 'row',
      outletId: row.outletId,
      subOutletId: row.subOutletId,
      name: `${row.outletName}${row.subOutletName ? ` (${row.subOutletName})` : ''}`,
    });
    setShowDeleteConfirm(true);
  };

  const openRemoveBrandConfirm = (brand) => {
    setDeleteTarget({
      type: 'single',
      mappingId: brand.mappingId,
      name: brand.name,
    });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'row') {
        // Delete all mappings for this outlet and subOutlet using the bulk delete API
        await deleteBrandMappingByOutletAndSubOutlet(
          Number(deleteTarget.outletId),
          Number(deleteTarget.subOutletId)
        );
      } else {
        // Delete individual brand mapping by its specific ID
        await deleteBrandMappingById(deleteTarget.mappingId);

        if (viewingTargetModal) {
          setViewingTargetModal((prev) => ({
            ...prev,
            brands: (prev.brands || []).filter((b) => b.mappingId !== deleteTarget.mappingId),
          }));
        }
      }

      await fetchMappings();
    } catch (err) {
      console.error('Failed to delete mapping:', err);
      notify.error(err?.response?.data?.message || err?.message || 'Failed to delete mapping.');
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
            className="text-gray-500 font-semibold whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500">
            {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outletName,
        header: ({ column }) => (
          <DataGridColumnHeader title="Unit" column={column} className="whitespace-nowrap" />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 leading-none truncate">
              {row.original.outletName}
            </p>
          </div>
        ),
        enableSorting: false,
        size: 190,
      },
      {
        id: 'subOutlet',
        accessorFn: (row) => row.subOutletName || '-',
        header: ({ column }) => (
          <DataGridColumnHeader title="Sub Unit" column={column} className="whitespace-nowrap" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subOutletName || '-'}
            widthClass="max-w-[170px]"
          />
        ),
        enableSorting: false,
        size: 160,
      },
      {
        id: 'brands',
        header: ({ column }) => (
          <DataGridColumnHeader title="Assigned Brands" column={column} className="whitespace-nowrap" />
        ),
        cell: ({ row }) => {
          const rowBrands = row.original.brands || [];
          const visibleBrands = rowBrands.slice(0, 4);
          const remainingBrands = rowBrands.slice(4);
          const hasMore = remainingBrands.length > 0;

          return (
            <div className="flex flex-wrap gap-1.5 items-center">
              {visibleBrands.map((b) => (
                <span
                  key={b.mappingId || b.id}
                  className="flex items-center gap-1 bg-[#F0F6FC] text-[#084E92] border border-[#E0EDFA] text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                >
                  {b.name}
                  {canDelete && (
                    <X
                      size={12}
                      className="cursor-pointer hover:text-red-500"
                      onClick={() => openRemoveBrandConfirm(b)}
                    />
                  )}
                </span>
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setViewingTargetModal(row.original)}
                  className="inline-flex items-center bg-[#F0F6FC] hover:bg-[#E0EDFA] text-[#084E92] border border-[#E0EDFA] text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer transition whitespace-nowrap"
                >
                  +{remainingBrands.length} more
                </button>
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
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
            Actions
          </span>
        ),
        cell: ({ row }) =>
          canDelete ? (
            <Trash2
              size={18}
              className="text-red-300 cursor-pointer hover:text-red-700"
              onClick={() => openDeleteRowConfirm(row.original)}
              title="Delete All Mappings for this Unit"
            />
          ) : null,
        enableSorting: false,
        size: 60,
      },
    ],
    [canDelete, pagination]
  );

  const table = useReactTable({
    data: filteredMappings,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Brand & Unit Mapping" />;
  }

  const isOutletFilterLocked = !showUnitDropdown || isOutletUser;
  const isSaveDisabled = saving || selectedBrands.length === 0 || !outletId ;

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Brand & Unit Mapping"
          description="Map raw material brands to units and sub units for inventory management."
        />

        {/* Configuration / Form Card */}
        {(canAdd || canEdit) && (
          <div className="mt-4 mb-6">
            {mappingsError && (
              <p className="text-xs text-red-500 mb-3 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {mappingsError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_auto] gap-3.5 items-end">
              {/* Brand MultiSelect */}
              <MultiSelectDropdown
                label="Raw Material Brands"
                placeholder="Select brands..."
                options={brands}
                selected={selectedBrands}
                onChange={setSelectedBrands}
                loading={brandsLoading}
                required
              />

              {/* Unit SearchableSelect */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Unit <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  name="outletId"
                  value={outletId}
                  disabled={isOutletFilterLocked || orgScopeLoading}
                  onChange={(e) => {
                    setOutletId(e.target.value);
                    setSubOutletId('');
                  }}
                  options={outletOptions}
                  placeholder="Select Unit"
                />
              </div>

              {/* Sub Unit SearchableSelect */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Sub Unit
                </label>
                <SearchableSelect
                  name="subOutletId"
                  value={subOutletId}
                  disabled={!outletId}
                  onChange={(e) => setSubOutletId(e.target.value)}
                  options={subOutlets.map((so) => ({
                    value: String(so.id),
                    label: so.subOutletName || so.name || `Sub Outlet #${so.id}`,
                  }))}
                  placeholder="Select Sub Unit"
                  isClearable
                  clearable
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={isSaveDisabled}
                className="h-10 px-5 bg-[#084E92] hover:bg-[#073e77] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Link2 size={15} />
                {saving ? 'Mapping...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        )}

        {/* Filters Row: Search + Brand + Outlet + Sub Outlet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center mb-6">
          <div className="lg:col-span-4">
            <SearchBar
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onClear={() => setSearchText('')}
              placeholder="Search by brand, unit, or sub unit..."
            />
          </div>

          <div className="lg:col-span-3">
            <SearchableSelect
              name="brandFilter"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              options={brands.map((b) => ({
                value: String(b.id),
                label: b.name,
              }))}
              placeholder="Filter by Brand"
              isClearable
              clearable
            />
          </div>

          <div className="lg:col-span-3">
            <SearchableSelect
              name="outletFilter"
              value={outletFilter}
              disabled={isOutletFilterLocked || orgScopeLoading}
              onChange={(e) => {
                setOutletFilter(e.target.value);
                setSubOutletFilter('');
              }}
              options={outletOptions}
              placeholder="Filter by Unit"
              isClearable={!isOutletFilterLocked}
              clearable={!isOutletFilterLocked}
            />
          </div>

          <div className="lg:col-span-2">
            <SearchableSelect
              name="subOutletFilter"
              value={subOutletFilter}
              disabled={!outletFilter}
              onChange={(e) => setSubOutletFilter(e.target.value)}
              options={filterSubOutlets.map((so) => ({
                value: String(so.id),
                label: so.subOutletName || so.name || `Sub Outlet #${so.id}`,
              }))}
              placeholder="Filter by Sub Unit"
              isClearable
              clearable
            />
          </div>
        </div>

        {/* Listing Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
          {!outletFilter && !isOutletUser && mappings.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-2.5 text-gray-400">
              <Tag size={38} className="text-gray-300 stroke-1" />
              <p className="text-sm font-semibold text-gray-700">
                Please select an Outlet to view brand mappings.
              </p>
            </div>
          ) : mappingsLoading || orgScopeLoading ? (
            <p className="text-sm text-gray-400 p-8 text-center">Loading brand mappings...</p>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredMappings.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable className="w-full overflow-x-hidden">
                  <DataGridTable />
                </CardTable>
                <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>
      </div>

      {/* "+X More Brands" Modal */}
      <AssignedBrandsModal
        isOpen={!!viewingTargetModal}
        onClose={() => setViewingTargetModal(null)}
        target={viewingTargetModal}
        onRemoveBrand={openRemoveBrandConfirm}
        canDelete={canDelete}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (deleteLoading) return;
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.name}
        saving={deleteLoading}
      />
    </Container>
  );
};

export default BrandUnitMapping;