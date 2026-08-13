import React, { useEffect, useMemo, useRef, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import {
  assignBrandsToCategories,
  deleteRawMaterialCategoryBrandById,
  getAllActiveRawMaterialBrand,
  getAllRawMaterialCategory,
  getAllRawMaterialCategoryBrands,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';

// ---- Multi-select combobox: type directly in the field, no need to open first ----
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
    return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
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

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="text-sm font-medium text-[#1B1B1F] mb-1.5 block">
        {label}
      </label>

      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="min-h-11 w-full border border-[#C3C6D1] rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text bg-white"
      >
        {selected.map((item) => (
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
        ))}

        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-sm outline-none py-1"
        />

        <ChevronDown size={16} className="ml-auto text-gray-400 shrink-0" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#C3C6D1] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <p className="px-3 py-2 text-sm text-gray-400">Loading...</p>
          )}

          {!loading && filteredOptions.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No results found.</p>
          )}

          {!loading &&
            filteredOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F4F7FF] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(option.id)}
                  onChange={() => toggleOption(option)}
                  className="accent-[#084E92]"
                />
                {option.name}
              </label>
            ))}
        </div>
      )}
    </div>
  );
};

// ---- Single-select combobox: type directly in the field, no need to open first ----
const SingleSelectSearchDropdown = ({
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
    return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
  }, [options, query]);

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="text-sm font-medium text-[#1B1B1F] mb-1.5 block">
        {label}
      </label>

      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="min-h-11 w-full border border-[#C3C6D1] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 cursor-text bg-white"
      >
        {selected && !open && (
          <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-1 rounded-md">
            {selected.name}
            <X
              size={12}
              className="cursor-pointer hover:text-red-500"
              onClick={clearSelection}
            />
          </span>
        )}

        {(!selected || open) && (
          <input
            ref={inputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder={selected ? selected.name : placeholder}
            className="flex-1 min-w-[80px] text-sm outline-none py-1"
          />
        )}

        <ChevronDown size={16} className="ml-auto text-gray-400 shrink-0" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#C3C6D1] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <p className="px-3 py-2 text-sm text-gray-400">Loading...</p>
          )}

          {!loading && filteredOptions.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No results found.</p>
          )}

          {!loading &&
            filteredOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={`px-3 py-2 text-sm hover:bg-[#F4F7FF] cursor-pointer ${
                  selected?.id === option.id
                    ? 'bg-[#F4F7FF] font-medium text-[#084E92]'
                    : ''
                }`}
              >
                {option.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const RowCategoryBrandMapping = () => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null); // single, not array
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [configuring, setConfiguring] = useState(false);

  const [mappings, setMappings] = useState([]); // grouped-by-category, see loadMappings
  const [mappingsLoading, setMappingsLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { mappingId, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---- Normalizers for master lists (Category / Brand dropdowns) ----
  const normalizeCategoryOption = (c) => ({
    id: c?.id,
    name: c?.nameEnglish ?? c?.name ?? '',
  });

  const normalizeBrandOption = (b) => ({
    id: b?.id,
    name: b?.nameEnglish ?? b?.name ?? '',
  });

  // ---- Normalizers for mapping rows (getall) ----
  // Shape: { id, categoryId, categoryName, brandId, brandName, createdAt }
  const normalizeMappingCategory = (row) => ({
    id: row?.categoryId,
    name: row?.categoryName ?? '',
  });

  const normalizeMappingBrand = (row) => ({
    id: row?.brandId,
    name: row?.brandName ?? '',
  });

  // Each brand tag carries its own mappingId so it can be deleted individually.
  const groupMappings = (flatRows) => {
    const byCategory = new Map();

    flatRows.forEach((row) => {
      const category = normalizeMappingCategory(row);
      const brand = normalizeMappingBrand(row);
      if (!category.id || !brand.id) return;

      if (!byCategory.has(category.id)) {
        byCategory.set(category.id, {
          groupId: `cat-${category.id}`,
          category,
          brands: [],
        });
      }
      byCategory.get(category.id).brands.push({
        id: brand.id,
        name: brand.name,
        mappingId: row.id,
      });
    });

    return Array.from(byCategory.values());
  };

  // ---- Data loading ----
  const loadMappings = async () => {
    try {
      setMappingsLoading(true);
      const res = await getAllRawMaterialCategoryBrands();
      const raw =
        res?.data?.data?.['Raw Material Category Brand Details'] ??
        res?.data?.data ??
        res?.data ??
        [];
      const flatRows = Array.isArray(raw) ? raw : Object.values(raw);
      setMappings(groupMappings(flatRows));
    } catch (err) {
      console.error(err);
    } finally {
      setMappingsLoading(false);
    }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setOptionsLoading(true);
        const categoryRes = await getAllRawMaterialCategory(0);
        const rawCategories =
          categoryRes?.data?.data?.['Raw Material Category Details'] ??
          categoryRes ??
          [];
        const normalizedCategories = (
          Array.isArray(rawCategories)
            ? rawCategories
            : Object.values(rawCategories)
        ).map(normalizeCategoryOption);
        setCategories(normalizedCategories);
      } catch (err) {
        console.error(err);
      } finally {
        setOptionsLoading(false);
      }
    };

    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        const brandRes = await getAllActiveRawMaterialBrand();
        const rawBrands =
          brandRes?.data?.data ?? brandRes?.data ?? brandRes ?? [];
        const normalizedBrands = (
          Array.isArray(rawBrands) ? rawBrands : Object.values(rawBrands)
        ).map(normalizeBrandOption);
        setBrands(normalizedBrands);
      } catch (err) {
        console.error(err);
      } finally {
        setBrandsLoading(false);
      }
    };

    fetchOptions();
    fetchBrands();
    loadMappings();
  }, []);

  const filteredMappings = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return mappings.filter((m) => {
      const categoryName = m.category?.name?.toLowerCase() ?? '';
      const brandNames = (m.brands || [])
        .map((b) => b.name.toLowerCase())
        .join(', ');

      const matchesSearch =
        !term || categoryName.includes(term) || brandNames.includes(term);

      const matchesCategory =
        !categoryFilter || String(m.category?.id) === String(categoryFilter);

      const matchesBrand =
        !brandFilter ||
        (m.brands || []).some((b) => String(b.id) === String(brandFilter));

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [mappings, searchText, categoryFilter, brandFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchText, categoryFilter, brandFilter]);

  const handleConfigure = async () => {
    if (!selectedCategory || selectedBrands.length === 0) return;

    setConfiguring(true);
    try {
      await assignBrandsToCategories({
        categoryIds: [selectedCategory.id],
        brandIds: selectedBrands.map((b) => b.id),
        userId: getUserIdFromToken(),
      });
      setSelectedCategory(null);
      setSelectedBrands([]);
      await loadMappings();
    } catch (err) {
      console.error(err);
    } finally {
      setConfiguring(false);
    }
  };

  // Opens the confirm modal for removing a single brand from a category.
  const openDeleteConfirm = (category, brand) => {
    setDeleteTarget({
      mappingIds: [brand.mappingId],
      name: `${category?.name} - ${brand.name}`,
    });
    setShowDeleteConfirm(true);
  };

  const openRowDeleteConfirm = (row) => {
    setDeleteTarget({
      mappingIds: (row.brands || []).map((b) => b.mappingId),
      name: `${row.category?.name} (${(row.brands || []).map((b) => b.name).join(', ')})`,
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
      await Promise.all(
        deleteTarget.mappingIds.map((id) =>
          deleteRawMaterialCategoryBrandById(id),
        ),
      );
      await loadMappings();
    } catch (err) {
      console.error(err);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      id: 'sno',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="SR. NO"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) =>
        pagination.pageIndex * pagination.pageSize + row.index + 1,
      enableSorting: false,
      size: 80,
    },
    {
      id: 'category',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="RAW MATERIAL CATEGORY"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-[#1B1B1F] capitalize">
          {row.original.category?.name}
        </span>
      ),
    },
    {
      id: 'brand',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="RAW MATERIAL BRAND"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 py-1">
          {(row.original.brands || []).map((brand) => (
            <span
              key={brand.mappingId}
              className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-1 rounded-md"
            >
              {brand.name}
              <X
                size={12}
                className="cursor-pointer hover:text-red-500"
                onClick={() => openDeleteConfirm(row.original.category, brand)}
              />
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ACTION"
          column={column}
          className="text-[#43474F] font-semibold"
        />
      ),
      cell: ({ row }) => (
        <Trash2
          size={18}
          className="text-red-300 cursor-pointer hover:text-red-700"
          onClick={() => openRowDeleteConfirm(row.original)}
        />
      ),
      enableSorting: false,
      size: 100,
    },
  ];

  const table = useReactTable({
    data: filteredMappings,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Masters</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            Raw Material Category Brand Mapping
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] text-start">
            Raw Material Category Brand Mapping
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-xl">
            Map raw material categories with their respective brands.
          </p>
        </div>

        {/* Configure card */}
        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] mt-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <SingleSelectSearchDropdown
              label="Raw Material Category"
              placeholder="Select Category..."
              options={categories}
              selected={selectedCategory}
              onChange={setSelectedCategory}
              loading={optionsLoading}
            />

            <MultiSelectDropdown
              label="Raw Material Brand"
              placeholder="Select Brands..."
              options={brands}
              selected={selectedBrands}
              onChange={setSelectedBrands}
              loading={brandsLoading}
            />

            <button
              type="button"
              onClick={handleConfigure}
              disabled={
                configuring || !selectedCategory || selectedBrands.length === 0
              }
              className="h-11 px-5 bg-[#084E92] text-white rounded-lg flex gap-2 items-center justify-center cursor-pointer hover:bg-[#073e77] transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Link2 size={16} />
              {configuring ? 'Configuring...' : 'Configure'}
            </button>
          </div>
        </div>

        {/* Search + filters card */}
        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative border border-[#C3C6D1] rounded-lg">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                placeholder="Search mappings..."
                className="w-full pl-10 py-2 outline-none rounded-lg"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
              <select
                className="outline-none w-full bg-transparent"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Filter by Raw Material Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </p>

            <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
              <select
                className="outline-none w-full bg-transparent"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="">Filter by Raw Material Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          <DataGrid
            table={table}
            recordCount={filteredMappings.length}
            className="rounded-2xl"
          >
            <Card className="rounded-t-none border-t-0 rounded-2xl">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
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

export default RowCategoryBrandMapping;
