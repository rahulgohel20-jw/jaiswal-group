import { ChevronRight, ChevronDown, Link2, Search, Trash2, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Container } from "@/components/common/container";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { getOrganizationByType } from '../../services/apiServices';
// TODO: point this at wherever OrgTypes actually lives in your codebase.
import { OrgTypes } from '../../constants/orgTypes';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SingleSelectDropdown = ({ label, placeholder, options, selected, onChange, loading }) => {
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
            <label className="text-sm font-medium text-[#1B1B1F] mb-1.5 block">{label}</label>

            <div
                onClick={() => setOpen((prev) => !prev)}
                className="h-11 w-full border border-[#C3C6D1] rounded-lg px-3 flex items-center justify-between gap-2 cursor-pointer bg-white"
            >
                <span className={`text-sm truncate ${selected ? 'text-[#1B1B1F]' : 'text-gray-400'}`}>
                    {selected ? selected.name : placeholder}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {selected && (
                        <X
                            size={14}
                            className="text-gray-400 hover:text-red-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                            }}
                        />
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
            </div>

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-[#C3C6D1] rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="relative border-b border-[#C3C6D1]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-3 py-2 text-sm outline-none"
                        />
                    </div>

                    <div className="overflow-y-auto">
                        {loading && <p className="px-3 py-2 text-sm text-gray-400">Loading...</p>}

                        {!loading && filteredOptions.length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-400">No results found.</p>
                        )}

                        {!loading &&
                            filteredOptions.map((option) => (
                                <button
                                    type="button"
                                    key={option.id}
                                    onClick={() => handlePick(option)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#F4F7FF]"
                                >
                                    {option.name}
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const MultiSelectDropdown = ({ label, placeholder, options, selected, onChange, loading }) => {
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

    return (
        <div ref={wrapperRef} className="relative w-full">
            <label className="text-sm font-medium text-[#1B1B1F] mb-1.5 block">{label}</label>

            <div
                onClick={() => setOpen((prev) => !prev)}
                className="min-h-11 w-full border border-[#C3C6D1] rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer bg-white"
            >
                {selected.length === 0 && (
                    <span className="text-gray-400 text-sm px-1">{placeholder}</span>
                )}

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

                <ChevronDown size={16} className="ml-auto text-gray-400 shrink-0" />
            </div>

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-[#C3C6D1] rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="relative border-b border-[#C3C6D1]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-3 py-2 text-sm outline-none"
                        />
                    </div>

                    <div className="overflow-y-auto">
                        {loading && <p className="px-3 py-2 text-sm text-gray-400">Loading...</p>}

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
                </div>
            )}
        </div>
    );
};

// No vendor API yet - vendors stay local until one exists.
const DUMMY_VENDORS = [
    { id: 1, name: "Acme Supplies Ltd." },
    { id: 2, name: "Global Tech Solutions" },
    { id: 3, name: "Prime Manufacturing Corp." },
    { id: 4, name: "Northline Traders" },
    { id: 5, name: "Coastal Materials Inc." },
];

// const DUMMY_UNITS = [
//     { id: 1, name: "Unit Alpha (HQ)" },
//     { id: 2, name: "Unit Beta (Logistics)" },
//     { id: 3, name: "Unit Gamma (R&D)" },
//     { id: 4, name: "Unit Delta (Production)" },
//     { id: 5, name: "Unit Epsilon (Storage)" },
// ];
// Normalizes a raw outlet/org record from getOrganizationByType into { id, name }.
const normalizeUnit = (o) => ({
    id: o.id,
    name: o.companyNameEnglish ?? o.name,
});

const VendorUnitMapping = () => {
    const [vendors] = useState(DUMMY_VENDORS);
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [unitsError, setUnitsError] = useState(null);

    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [saving, setSaving] = useState(false);

    const [mappings, setMappings] = useState([]);

    const [searchText, setSearchText] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    const [unitFilter, setUnitFilter] = useState('');

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Unit options come from the real API.
    useEffect(() => {
        const fetchUnits = async () => {
            setUnitsLoading(true);
            setUnitsError(null);

            try {
                const res = await getOrganizationByType(OrgTypes.OUTLET);

                const rawUnits =
                    res?.data?.data ??
                    res?.data?.content ??
                    res?.data ??
                    [];

                const list = Array.isArray(rawUnits) ? rawUnits : Object.values(rawUnits);
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

    const filteredMappings = useMemo(() => {
        const term = searchText.trim().toLowerCase();

        return mappings.filter((m) => {
            const vendorName = m.vendor?.name?.toLowerCase() ?? '';
            const unitNames = (m.units || []).map((u) => u.name.toLowerCase()).join(', ');

            const matchesSearch = !term || vendorName.includes(term) || unitNames.includes(term);
            const matchesVendor = !vendorFilter || String(m.vendor?.id) === String(vendorFilter);
            const matchesUnit = !unitFilter || (m.units || []).some((u) => String(u.id) === String(unitFilter));

            return matchesSearch && matchesVendor && matchesUnit;
        });
    }, [mappings, searchText, vendorFilter, unitFilter]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, [searchText, vendorFilter, unitFilter]);


    const handleSaveMapping = () => {
        if (!selectedVendor || selectedUnits.length === 0) return;

        setSaving(true);

        setMappings((prev) => {
            const existingIndex = prev.findIndex((m) => String(m.vendor.id) === String(selectedVendor.id));

            if (existingIndex === -1) {
                return [{ id: Date.now(), vendor: selectedVendor, units: selectedUnits }, ...prev];
            }

            const updated = [...prev];
            const existing = updated[existingIndex];
            const mergedUnits = [
                ...existing.units,
                ...selectedUnits.filter((u) => !existing.units.some((eu) => eu.id === u.id)),
            ];
            updated[existingIndex] = { ...existing, units: mergedUnits };
            return updated;
        });

        setSelectedVendor(null);
        setSelectedUnits([]);
        setSaving(false);
    };

    const handleRemoveUnitFromRow = (rowId, unitId) => {
        setMappings((prev) =>
            prev
                .map((m) => (m.id === rowId ? { ...m, units: m.units.filter((u) => u.id !== unitId) } : m))
                .filter((m) => m.units.length > 0)
        );
    };

    const openDeleteConfirm = (row) => {
        setDeleteTarget({
            type: 'row',
            id: row.id,
            name: `${row.vendor?.name} - ${(row.units || []).map((u) => u.name).join(', ')}`,
        });
        setShowDeleteConfirm(true);
    };
    const openRemoveUnitConfirm = (rowId, unit) => {
        setDeleteTarget({
            type: 'unit',
            rowId,
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

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleteLoading(true);
        if (deleteTarget.type === 'unit') {
            setMappings((prev) =>
                prev
                    .map((m) =>
                        m.id === deleteTarget.rowId
                            ? { ...m, units: m.units.filter((u) => u.id !== deleteTarget.unitId) }
                            : m
                    )
                    .filter((m) => m.units.length > 0)
            );
        } else {
            setMappings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        }

        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        setDeleteLoading(false);
    };

    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="SR. NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => pagination.pageIndex * pagination.pageSize + row.index + 1,
            enableSorting: false,
            size: 80,
        },
        {
            id: "vendor",
            header: ({ column }) => (
                <DataGridColumnHeader title="VENDOR NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="font-medium text-[#1B1B1F]">{row.original.vendor?.name}</span>
            ),
        },
        {
            id: "units",
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1.5">
                    {(row.original.units || []).map((u) => (
                        <span
                            key={u.id}
                            className="flex items-center gap-1 bg-[#F0F6FC] text-[#084E92] border border=[#E0EDFA] text-xs font-medium px-2.5 py-1 rounded-full"
                        >
                            {u.name}
                            <X
                                size={12}
                                className="cursor-pointer hover:text-red-500"
                                onClick={() => openRemoveUnitConfirm(row.original.id, u)}
                            />
                        </span>
                    ))}
                </div>
            ),
            enableSorting: false,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTION" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <Trash2
                    size={18}
                    className="text-red-300 cursor-pointer hover:text-red-700"
                    onClick={() => openDeleteConfirm(row.original)}
                />
            ),
            enableSorting: false,
            size: 100,
        },
    ];

    const table = useReactTable({
        data: filteredMappings,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
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
                    <span className="text-[#084E92] font-medium">Vendor & Unit Mapping</span>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] text-start">Vendor & Unit Mapping</h1>
                    <p className="text-sm text-gray-400 mt-1 max-w-xl">
                        Map vendors to one or multiple units for procurement and purchase management.
                    </p>
                </div>

                {/* Vendor Mapping Details */}
                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] mt-6">
                    <h2 className="text-base font-semibold text-[#1B1B1F] pb-4 mb-4 border-b-2 border-[#F8FAFC]">Vendor Mapping Details</h2>

                    {unitsError && (
                        <p className="text-sm text-red-500 mb-3">{unitsError}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                        <SingleSelectDropdown
                            label="Vendor Name"
                            placeholder="Select a vendor"
                            options={vendors}
                            selected={selectedVendor}
                            onChange={setSelectedVendor}
                            loading={false}
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
                            className="h-11 px-5 bg-[#084E92] text-white rounded-lg flex gap-2 items-center justify-center cursor-pointer hover:bg-[#073e77] transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <Link2 size={16} />
                            {saving ? 'Saving...' : 'Save Mapping'}
                        </button>
                    </div>
                </div>

                {/* Mapping Records */}
                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] mt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-base font-semibold text-[#1B1B1F]">Mapping Records</h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative border border-[#C3C6D1] rounded-lg">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    size={16}
                                />
                                <input
                                    placeholder="Search records..."
                                    className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm outline-none rounded-lg"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                            </div>

                            <Select
                                value={vendorFilter || "all"}
                                onValueChange={(value) =>
                                    setVendorFilter(value === "all" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full sm:w-48 h-10 border-[#C3C6D1] rounded-lg">
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
                                value={unitFilter || "all"}
                                onValueChange={(value) =>
                                    setUnitFilter(value === "all" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full sm:w-48 h-10 border-[#C3C6D1] rounded-lg">
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
                    </div>

                    <div className="w-full mt-5 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                        <DataGrid table={table} recordCount={filteredMappings.length} className="rounded-2xl">
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

export default VendorUnitMapping
