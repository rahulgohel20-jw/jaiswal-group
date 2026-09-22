import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Printer, ArrowLeft, Search, Package, ClipboardCheck, CirclePlus, CircleMinus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { notify } from '@/utils/toast';
import {
    getAllRawMaterialCategory,
    getAllRawMaterialItems,
    getAllAssets,
    getAllSubOutlets,
    getOrganizationByType,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';

const mapCategory = (item) => ({
    value: String(item.id),
    label: item.nameEnglish || item.categoryName || item.name || '',
});

const normalizeOutlet = (item) => ({
    id: item.id,
    name: item.companyNameEnglish || '',
    code: item.companyCode || '',
    status: item.isActive ? 'active' : 'inactive',
});

const normalizeSubOutlet = (item) => ({
    id: item.id,
    name: item.subOutletName || '',
    code: item.companyCode || '',
    organizationId: item.organizationId,
    status: item.isActive ? 'active' : 'inactive',
});

const DUMMY_LEDGER_DATA = [
    {
        id: 1,
        date: '12 Oct 2023',
        vno: 'V-9082',
        supplier: 'Sunrise Bakery Co.',
        billNo: 'INV/882',
        inQty: 50,
        outQty: 0,
        balance: 400,
    },
    {
        id: 2,
        date: '14 Oct 2023',
        vno: 'V-9104',
        supplier: 'Central Kitchen Outlet',
        billNo: 'ST-452',
        inQty: 0,
        outQty: 11,
        balance: 380,
    },
    {
        id: 3,
        date: '18 Oct 2023',
        vno: 'V-9122',
        supplier: 'Sunrise Bakery Co.',
        billNo: 'INV/891',
        inQty: 0,
        outQty: 11,
        balance: 369,
    },
    {
        id: 4,
        date: '14 Oct 2023',
        vno: 'V-9104',
        supplier: 'Central Kitchen Outlet',
        billNo: 'ST-452',
        inQty: 0,
        outQty: 11,
        balance: 380,
    },
    {
        id: 5,
        date: '18 Oct 2023',
        vno: 'V-9122',
        supplier: 'Sunrise Bakery Co.',
        billNo: 'INV/891',
        inQty: 0,
        outQty: 11,
        balance: 369,
    },
    {
        id: 6,
        date: '14 Oct 2023',
        vno: 'V-9104',
        supplier: 'Central Kitchen Outlet',
        billNo: 'ST-452',
        inQty: 0,
        outQty: 11,
        balance: 380,
    },
    {
        id: 7,
        date: '18 Oct 2023',
        vno: 'V-9122',
        supplier: 'Sunrise Bakery Co.',
        billNo: 'INV/891',
        inQty: 0,
        outQty: 11,
        balance: 369,
    },
];

const GeneralStockLedger = () => {
    const navigate = useNavigate();

    const [outlets, setOutlets] = useState([]);
    const [subOutlets, setSubOutlets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);

    const [outlet, setOutlet] = useState('');
    const [subOutlet, setSubOutlet] = useState('');
    const [itemType, setItemType] = useState('Raw Material');
    const [category, setCategory] = useState('');
    const [item, setItem] = useState('');

    const [fromDate, setFromDate] = useState('2023-10-31');
    const [toDate, setToDate] = useState('2023-10-31');

    const [loadingOutlets, setLoadingOutlets] = useState(false);
    const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [ledgerData, setLedgerData] = useState(DUMMY_LEDGER_DATA);

    const fetchOutlets = useCallback(async () => {
        setLoadingOutlets(true);
        try {
            const res = await getOrganizationByType(OrgTypes.OUTLET);
            const list = res?.data?.data || res?.data?.content || res?.data || [];
            setOutlets(Array.isArray(list) ? list.map(normalizeOutlet) : []);
        } catch (error) {
            console.error(error);
            notify.error('Failed to load outlets');
            setOutlets([]);
        } finally {
            setLoadingOutlets(false);
        }
    }, []);

    const fetchSubOutlets = useCallback(async () => {
        setLoadingSubOutlets(true);
        try {
            const res = await getAllSubOutlets();
            const list = res?.data?.data || res?.data?.content || res?.data || [];
            setSubOutlets(Array.isArray(list) ? list.map(normalizeSubOutlet) : []);
        } catch (error) {
            console.error(error);
            notify.error('Failed to load sub-outlets');
            setSubOutlets([]);
        } finally {
            setLoadingSubOutlets(false);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        try {
            if (itemType === 'Raw Material') {
                const res = await getAllRawMaterialCategory(0);
                const raw = res?.data?.data?.['Raw Material Category Details'] || [];
                setCategories(raw.map(mapCategory));
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error(error);
            notify.error('Failed to load categories');
            setCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    }, [itemType]);

    const fetchItems = useCallback(async () => {
        if (!category) {
            setItems([]);
            return;
        }

        setLoadingItems(true);
        try {
            if (itemType === 'Raw Material') {
                const res = await getAllRawMaterialItems(Number(category), 0, '', '');
                const rawItems = res?.data?.data?.['Raw Material Details'] || [];

                setItems(
                    rawItems.map((item) => ({
                        value: String(item.id),
                        label: item.nameEnglish || '',
                        unit: item.unit?.nameEnglish || item.unitName || '',
                        unitId: item.unitId ?? item.unit?.id,
                    }))
                );
            } else {
                const res = await getAllAssets();
                const assetList = Array.isArray(res?.data?.data) ? res.data.data : [];

                setItems(
                    assetList
                        .filter((asset) => Number(asset.categoryId) === Number(category))
                        .map((asset) => ({
                            value: String(asset.id),
                            label: asset.itemName || '',
                            unit: 'Units',
                            unitId: null,
                        }))
                );
            }
        } catch (error) {
            console.error(error);
            notify.error('Failed to load items');
            setItems([]);
        } finally {
            setLoadingItems(false);
        }
    }, [category, itemType]);

    useEffect(() => {
        fetchOutlets();
        fetchSubOutlets();
    }, [fetchOutlets, fetchSubOutlets]);

    useEffect(() => {
        fetchCategories();
        setCategory('');
        setItem('');
    }, [fetchCategories]);

    useEffect(() => {
        fetchItems();
        setItem('');
    }, [fetchItems]);

    const outletOptions = useMemo(
        () =>
            outlets
                .filter((outlet) => outlet.status === 'active')
                .map((outlet) => ({
                    value: String(outlet.id),
                    label: `${outlet.name}`,
                })),
        [outlets]
    );

    const subOutletOptions = useMemo(
        () =>
            subOutlets
                .filter(
                    (sub) =>
                        sub.status === 'active' &&
                        (!outlet || String(sub.organizationId) === String(outlet))
                )
                .map((sub) => ({
                    value: String(sub.id),
                    label: `${sub.name}`,
                })),
        [subOutlets, outlet]
    );

    const selectedItem = useMemo(
        () => items.find((item) => String(item.value) === String(item)),
        [items, item]
    );

    const openingBalance = ledgerData.length
        ? ledgerData[0].balance - ledgerData[0].inQty + ledgerData[0].outQty
        : 0;

    const finalClosingStock = ledgerData.length
        ? ledgerData[ledgerData.length - 1].balance
        : 0;

    const selectedItemName =
        items.find((x) => String(x.value) === String(item))?.label || '';

    const handleItemTypeChange = (type) => {
        setItemType(type);
        setCategory('');
        setItem('');
    };

    const handleSearch = () => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));

        // Replace this section with your General Stock Ledger API.
        setLedgerData(DUMMY_LEDGER_DATA);
    };

    const columns = useMemo(
        () => [
            {
                id: 'date',
                accessorFn: (row) => row.date,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Date"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs">
                        {row.original.date}
                    </span>
                ),
                size: 120,
            },
            {
                id: 'vno',
                accessorFn: (row) => row.vno,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="VNo"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="px-2 py-1 rounded bg-[#EEF2F8] text-[#084E92] text-xs font-medium">
                        {row.original.vno}
                    </span>
                ),
                size: 100,
            },
            {
                id: 'supplier',
                accessorFn: (row) => row.supplier,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Supplier / Party Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs">
                        {row.original.supplier}
                    </span>
                ),
                size: 190,
            },
            {
                id: 'billNo',
                accessorFn: (row) => row.billNo,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Bill No"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 text-xs">
                        {row.original.billNo}
                    </span>
                ),
                size: 110,
            },
            {
                id: 'inQty',
                accessorFn: (row) => row.inQty,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="In Quantity"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) =>
                    row.original.inQty > 0 ? (
                        <span className="text-green-600 text-xs font-semibold flex gap-1 items-center">
                            <CirclePlus size={12}/> <p className='mt-0.5'>{row.original.inQty}</p>
                        </span>
                    ) : (
                        <span className="text-gray-400 text-xs">-</span>
                    ),
                size: 110,
            },
            {
                id: 'outQty',
                accessorFn: (row) => row.outQty,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Out Quantity"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) =>
                    row.original.outQty > 0 ? (
                        <span className="text-red-600 text-xs font-semibold flex gap-1 items-center">
                           <CircleMinus size={12}/> <p className='mt-0.5'>{row.original.outQty}</p>
                        </span>
                    ) : (
                        <span className="text-gray-400 text-xs">-</span>
                    ),
                size: 110,
            },
            {
                id: 'balance',
                accessorFn: (row) => row.balance,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Balance"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-[#084E92] text-xs font-semibold">
                        {row.original.balance}
                    </span>
                ),
                size: 100,
            },
        ],
        []
    );

    const table = useReactTable({
        data: ledgerData,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Container>
            <div className="py-1 md:py-2 pb-6 space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Inventory</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">
                        General Stock Ledger
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#0F172A]">
                        General Stock Ledger
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#084E92] cursor-pointer"
                            onClick={() => window.print()}
                        >
                            <Printer size={17} />
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#084E92] cursor-pointer"
                        >
                            <ArrowLeft size={17} />
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl mt-4 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Outlet
                            </label>
                            <SearchableSelect
                                className="mt-1.5"
                                options={outletOptions}
                                value={outlet}
                                onChange={(e) => {
                                    setOutlet(e.target.value);
                                    setSubOutlet('');
                                }}
                                placeholder={
                                    loadingOutlets
                                        ? 'Loading outlets...'
                                        : 'Select Outlet'
                                }
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Sub-Outlet
                            </label>
                            <SearchableSelect
                                className="mt-1.5"
                                options={subOutletOptions}
                                value={subOutlet}
                                onChange={(e) => setSubOutlet(e.target.value)}
                                disabled={!outlet || loadingSubOutlets}
                                placeholder={
                                    !outlet
                                        ? 'Select Outlet first'
                                        : loadingSubOutlets
                                            ? 'Loading...'
                                            : 'Select Sub-Outlet'
                                }
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                From Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full h-10 border border-[#C3C6D1] rounded-lg pl-3 pr-3 outline-none text-gray-700 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                To Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full h-10 border border-[#C3C6D1] rounded-lg pl-3 pr-3 outline-none text-gray-700 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Item Name
                            </label>
                            <SearchableSelect
                                className="mt-1.5"
                                options={items}
                                value={item}
                                onChange={(e) => setItem(e.target.value)}
                                disabled={!category || loadingItems}
                                placeholder={
                                    !category
                                        ? 'Select category first'
                                        : loadingItems
                                            ? 'Loading items...'
                                            : 'Search Item'
                                }
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Item Type
                            </label>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1.5">
                                {['Asset', 'Raw Material'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleItemTypeChange(type)}
                                        className={`w-1/2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition ${
                                            itemType === type
                                                ? 'bg-[#084E92] text-white'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Select Raw Material Category
                            </label>
                            <SearchableSelect
                                className="mt-1.5"
                                options={categories}
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    setItem('');
                                }}
                                placeholder={
                                    loadingCategories
                                        ? 'Loading...'
                                        : 'Select Category'
                                }
                            />
                        </div>

                        <div className="w-full sm:w-64 bg-[#084E92] text-white rounded-xl p-5 shadow-md mt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] tracking-[2px] font-semibold opacity-80">
                                    OPENING BALANCE
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-bold">
                                        {openingBalance}
                                    </span>
                                    <span className="text-sm opacity-80">
                                        Units
                                    </span>
                                </div>
                            </div>
                            <Package size={27} className="opacity-80" />
                        </div>
                    </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-5 mb-3">
                    <div className="w-8 h-8 rounded-md bg-[#EEF4FF] flex items-center justify-center">
                        <Package size={18} className="text-[#084E92]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#084E92]">
                        Stock Details{selectedItemName ? ` – ${selectedItemName}` : ''}
                    </h2>
                </div>

                <div className="w-full border border-[#E2E8F0] rounded-2xl overflow-hidden">
                    <DataGrid
                        table={table}
                        recordCount={ledgerData.length}
                        className="rounded-2xl"
                    >
                        <Card className="rounded-2xl">
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

            

                <div className="flex justify-end mt-4">
                    <div className="w-full sm:w-64 bg-[#084E92] text-white rounded-xl px-6 py-4 shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] tracking-[2px] font-semibold opacity-80">
                                    FINAL CLOSING STOCK
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-bold">
                                        {finalClosingStock}
                                    </span>
                                    <span className="text-sm opacity-80">
                                        Units
                                    </span>
                                </div>
                            </div>
                            <ClipboardCheck size={27} className="opacity-80" />
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default GeneralStockLedger;