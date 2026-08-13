import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import VendorPriceComparisonModal from './VendorPriceComparisonModal';

const vendorQuotationsData = {
  1: [
    {
      id: 101,
      vendorName: 'AgriTrade Global',
      itemPrice: 285.0,
      quantity: 500,
      totalAmount: 142500,
      status: 'Map',
    },
    {
      id: 102,
      vendorName: 'Punjab Premium Grains',
      itemPrice: 278.5,
      quantity: 500,
      totalAmount: 139250,
      status: 'Unmap',
    },
    {
      id: 103,
      vendorName: 'National Foods Ltd.',
      itemPrice: 272.0,
      quantity: 500,
      totalAmount: 136000,
      status: 'Map',
    },
    {
      id: 104,
      vendorName: 'Local Farm Co-op',
      itemPrice: 268.0,
      quantity: 500,
      totalAmount: 134000,
      status: 'Unmap',
    },
  ],
  2: [
    {
      id: 201,
      vendorName: 'AgriTrade Global',
      itemPrice: 3200.0,
      quantity: 24,
      totalAmount: 76800,
      status: 'Map',
    },
    {
      id: 202,
      vendorName: 'Punjab Premium Grains',
      itemPrice: 3150.0,
      quantity: 24,
      totalAmount: 75600,
      status: 'Unmap',
    },
    {
      id: 203,
      vendorName: 'National Foods Ltd.',
      itemPrice: 3080.0,
      quantity: 24,
      totalAmount: 73920,
      status: 'Map',
    },
    {
      id: 204,
      vendorName: 'Local Farm Co-op',
      itemPrice: 3050.0,
      quantity: 24,
      totalAmount: 73200,
      status: 'Unmap',
    },
  ],
  3: [
    {
      id: 301,
      vendorName: 'AgriTrade Global',
      itemPrice: 4500.0,
      quantity: 100,
      totalAmount: 450000,
      status: 'Map',
    },
    {
      id: 302,
      vendorName: 'Punjab Premium Grains',
      itemPrice: 4380.0,
      quantity: 100,
      totalAmount: 438000,
      status: 'Unmap',
    },
    {
      id: 303,
      vendorName: 'National Foods Ltd.',
      itemPrice: 4290.0,
      quantity: 100,
      totalAmount: 429000,
      status: 'Map',
    },
    {
      id: 304,
      vendorName: 'Local Farm Co-op',
      itemPrice: 4250.0,
      quantity: 100,
      totalAmount: 425000,
      status: 'Unmap',
    },
  ],
};

const purchaseItemsData = [
  {
    id: 1,
    srNo: '01',
    itemName: 'Hydraulic Fluid ISO 46',
    unit: 'Litres',
    approvedQty: 500,
    poQty: 500,
    receivedQty: 500,
    variance: 'Exact',
    varianceColor: 'green',
    stockAvailable: 120,
  },
  {
    id: 2,
    srNo: '02',
    itemName: 'Industrial Bearing 22215-E1',
    unit: 'Units',
    approvedQty: 24,
    poQty: 18.5,
    receivedQty: 24,
    variance: 'Partial',
    variancePercent: '4.0%',
    varianceColor: 'orange',
    stockAvailable: 4,
  },
  {
    id: 3,
    srNo: '03',
    itemName: 'Heavy Duty Diesel Filters',
    unit: 'Nos',
    approvedQty: 100,
    poQty: 0,
    receivedQty: 100,
    variance: 'Zero Variance',
    varianceColor: 'red',
    stockAvailable: 15,
  },
];

const CreatePurchaseOrder = () => {
  const { state } = useLocation();
  const [purchaseItems, setPurchaseItems] = useState(purchaseItemsData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [quotationItem, setQuotationItem] = useState(null);

  // --- common vendor + per-row vendor state ---

  const [vendorMap, setVendorMap] = useState(() => {
    const map = {};
    purchaseItemsData.forEach((item) => {
      map[item.id] = 'Swapnil';
    });
    return map;
  });

  const [commonVendor, setCommonVendor] = useState('');

  const allVendors = useMemo(
    () => [
      'Swapnil',
      ...new Set(
        Object.values(vendorQuotationsData)
          .flat()
          .map((q) => q.vendorName),
      ),
    ],
    [],
  );

  const applyCommonVendorToChecked = (vendor, selection) => {
    if (!vendor) return;
    const selectedIndexes = Object.keys(selection).filter((k) => selection[k]);
    if (selectedIndexes.length === 0) return;
    setVendorMap((prev) => {
      const next = { ...prev };
      selectedIndexes.forEach((idx) => {
        const item = purchaseItems[Number(idx)];
        if (item) next[item.id] = vendor;
      });
      return next;
    });
  };

  // Auto-fill checked rows when commonVendor or rowSelection changes
  const prevSelectionRef = useRef(rowSelection);
  useEffect(() => {
    if (!commonVendor) return;
    const prevKeys = Object.keys(prevSelectionRef.current).filter(
      (k) => prevSelectionRef.current[k],
    );
    const currKeys = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    const changed =
      prevKeys.length !== currKeys.length ||
      prevKeys.some((k) => !rowSelection[k]) ||
      currKeys.some((k) => !prevSelectionRef.current[k]);
    prevSelectionRef.current = rowSelection;
    if (changed) applyCommonVendorToChecked(commonVendor, rowSelection);
  }, [rowSelection]);

  const openQuotationModal = (item) => setQuotationItem(item);
  const closeQuotationModal = () => setQuotationItem(null);

  const handleSelectPrice = (quotation, item) => {
    console.log('Selected vendor price:', quotation, 'for item:', item);
    closeQuotationModal();
  };

  // --- columns ---

  const columns = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-[#CBD5E1] accent-[#084E92] cursor-pointer"
        />
      ),
      size: 44,
      enableSorting: false,
    },
    {
      accessorKey: 'itemName',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ITEM NAME"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openQuotationModal(row.original)}
          title="View vendor price comparison"
          className="text-[#084E92] font-medium underline underline-offset-2 hover:text-[#063d73] cursor-pointer text-left"
        >
          {row.original.itemName}
        </button>
      ),
    },
    {
      accessorKey: 'unit',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="UNIT"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      size: 90,
    },
    {
      id: 'vendorName',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="VENDOR NAME"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      cell: ({ row }) => (
        <div className="relative">
          <select
            value={vendorMap[row.original.id] || ''}
            onChange={(e) =>
              setVendorMap((prev) => ({
                ...prev,
                [row.original.id]: e.target.value,
              }))
            }
            className="w-full max-w-[140px] h-9 border border-[#E2E8F0] rounded-lg px-3 text-sm text-[#1E293B] appearance-none outline-none bg-white cursor-pointer"
          >
            <option value="">Select</option>
            {allVendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      ),
      size: 170,
    },
    {
      accessorKey: 'approvedQty',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="PR APROVED QTY"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
    },
    {
      accessorKey: 'poQty',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="PO QUANTITY"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      cell: ({ row }) => (
        <input
          type="number"
          defaultValue={row.original.poQty}
          className="w-20 h-9 border rounded-lg text-center outline-none"
        />
      ),
    },
    {
      accessorKey: 'receivedQty',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="APPROVED QTY"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
    },
    {
      accessorKey: 'variance',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="VARIANCE"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
      cell: ({ row }) => {
        const color =
          row.original.varianceColor === 'green'
            ? 'bg-green-100 text-green-700'
            : row.original.varianceColor === 'orange'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-700';
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}
          >
            {row.original.variance}
            {row.original.variancePercent
              ? ` (${row.original.variancePercent})`
              : ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'stockAvailable',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="STOCK AVAILABLE"
          column={column}
          className="text-[#43474F] font-semibold my-3"
        />
      ),
    },
    {
      id: 'action',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ACTION"
          column={column}
          className="text-[#43474F] font-semibold "
        />
      ),
      cell: () => (
        <button className="cursor-pointer">
          <Trash2 size={16} className="text-red-500" />
        </button>
      ),
      size: 90,
    },
  ];

  const table = useReactTable({
    data: purchaseItems,
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
          <span>Purchase Order Request</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            Create Purchase Order
          </span>
        </div>

        <div className="my-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Create Purchase Order
          </h1>
          <p className="text-sm text-[#737781] mt-1">
            Review requisition details and finalize the purchase order for
            vendor submission.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-[#0B5CAD]" />
              <h2 className="text-xl font-semibold text-[#1E293B]">
                Purchase Order Information
              </h2>
            </div>
          </div>

          <div className="p-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PR Code
                </label>
                <input
                  value={state?.prCode || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PO Code
                </label>
                <input
                  value={state?.poCode || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 text-[#0B5CAD] font-semibold outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PR Date
                </label>
                <input
                  value={state?.date || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  Company Name
                </label>
                <input
                  value={state?.company || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  Outlet Name
                </label>
                <input
                  value={state?.outlet || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  Approval Date
                </label>
                <input
                  type="date"
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PR Raised By
                </label>
                <input
                  value={state?.raisedBy || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PR Approved By
                </label>
                <input className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none" />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD]"
                />
              </div>
            </div>

            {/* Row 4 — Vendor Name (common) + Warehouse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              {/* Common vendor — selecting auto-fills checked rows */}
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={commonVendor}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCommonVendor(v);
                        if (v) applyCommonVendorToChecked(v, rowSelection);
                      }}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 appearance-none outline-none"
                    >
                      <option value="">Select Vendor</option>
                      {allVendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    />
                  </div>
                  <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                    <Plus size={18} className="text-[#0B5CAD]" />
                  </button>
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  WareHouse <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 appearance-none outline-none">
                      <option>Select Warehouse</option>
                    </select>
                    <ChevronDown
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    />
                  </div>
                  <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                    <Plus size={18} className="text-[#0B5CAD]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Items table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">
              Loading purchase items...
            </p>
          )}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          <div className="flex justify-between px-3 py-6 border-b ">
            <div className="flex gap-2 items-center text-[#084E92]">
              <ClipboardList />
              <h1 className="text-2xl font-semibold text-black">
                Purchase Items
              </h1>
            </div>
            <button className="flex gap-2 items-center border px-3 py-2 rounded-lg text-sm cursor-pointer">
              <Download size={20} />
              <p>Export List</p>
            </button>
          </div>
          <DataGrid table={table} recordCount={purchaseItems.length}>
            <Card className="rounded-t-none border-t-0">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] ">
                <DataGridPagination />
              </CardFooter>
            </Card>
          </DataGrid>
          <div className="flex justify-end gap-8 py-4 px-6 border-t bg-[#F8FAFC] items-center">
            <div className="text-sm flex gap-2">
              <span className="text-gray-500">Total PR Items</span>
              <p className="font-semibold">12</p>
            </div>
            <div className="text-sm flex gap-2">
              <span className="text-gray-500">PO Items Included</span>
              <p className="font-semibold">11</p>
            </div>
            <div className="text-sm flex gap-2 items-center">
              <span className="text-gray-500">Estimated Total Value:</span>
              <p className="text-xl font-bold text-[#084E92]">₹ 4,82,450.00</p>
            </div>
          </div>
        </div>

        {/* Terms & Delivery Notes */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#0B5CAD]" />
              <h2 className="text-sm font-semibold text-[#1E293B]">
                Terms & Delivery Notes
              </h2>
            </div>
          </div>
          <div className="p-6">
            <textarea
              rows={3}
              placeholder="Add specific delivery instructions or terms for the vendor..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 resize-none outline-none focus:border-[#0B5CAD] focus:ring-2 focus:ring-[#DBEAFE]"
            />
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-between items-center mt-8 border-t py-5">
          <Link to="/purchase/purchase-order-requests">
            <button
              type="button"
              className="px-6 py-2.5 border border-[#D1D5DB] rounded-lg text-[#475569] hover:bg-gray-50 cursor-pointer"
            >
              Cancel Process
            </button>
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer"
            >
              Generate Purchase Order
            </button>
          </div>
        </div>
      </div>

      <VendorPriceComparisonModal
        open={!!quotationItem}
        item={quotationItem}
        quotations={
          quotationItem ? vendorQuotationsData[quotationItem.id] || [] : []
        }
        onClose={closeQuotationModal}
        onSelectPrice={handleSelectPrice}
      />
    </Container>
  );
};

export default CreatePurchaseOrder;
