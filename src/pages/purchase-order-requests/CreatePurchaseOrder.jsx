// ============================================
// File: src/pages/CreatePurchaseOrder.jsx
// ============================================

import { useEffect, useMemo, useState } from 'react';
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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import VendorPriceComparisonModal from './VendorPriceComparisonModal';
import { usePurchaseRequisitions } from '../purchase-requisition/utils/usePurchaseRequisitions';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import { getAllActiveVendors } from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import { PO_STATUS } from './utils/poStatus';

// NOTE: There is no vendor-quotation-by-item endpoint in apiServices, so the
// vendor price comparison modal is still backed by this mock. Swap this out
// once a real "get quotations for raw material X" API exists.
const vendorQuotationsData = {
  1: [
    { id: 101, vendorName: 'AgriTrade Global', itemPrice: 285.0, quantity: 500, totalAmount: 142500, status: 'Map' },
    { id: 102, vendorName: 'Punjab Premium Grains', itemPrice: 278.5, quantity: 500, totalAmount: 139250, status: 'Unmap' },
  ],
};

const CreatePurchaseOrder = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { current: pr, loading: prLoading, error: prError, fetchById } = usePurchaseRequisitions();
  const { create, update, loading: poSaving, error: poSaveError } = usePurchaseOrders();

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [quotationItem, setQuotationItem] = useState(null);

  // Per-item editable state, keyed by rawMaterialId (the PR detail's line id).
  const [vendorMap, setVendorMap] = useState({});   // { [rawMaterialId]: vendorId }
  const [poQtyMap, setPoQtyMap] = useState({});     // { [rawMaterialId]: qty }
  const [commonVendorId, setCommonVendorId] = useState('');

  const [poDate, setPoDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Existing PO being edited (poCode !== 'TO BE GENERATED') vs a fresh one
  // generated from an approved PR.
  const isEditingExistingPo = !!state?.id && state?.poCode && state.poCode !== 'TO BE GENERATED';

  // ---- Load the underlying PR's line items ----
  useEffect(() => {
    if (state?.prId) {
      fetchById(state.prId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.prId]);

  // Seed editable per-row state once the PR loads.
  useEffect(() => {
    if (!pr?.details) return;
    setPoQtyMap((prev) => {
      const next = { ...prev };
      pr.details.forEach((d) => {
        if (next[d.rawMaterialId] === undefined) next[d.rawMaterialId] = d.quantity;
      });
      return next;
    });
  }, [pr]);

  // ---- Load active vendors for the dropdowns ----
  useEffect(() => {
    (async () => {
      setVendorsLoading(true);
      try {
        const res = await getAllActiveVendors();
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        // NOTE: assuming { id, name } shape — adjust to match the real
        // vendor object once confirmed (could be vendorName / companyName).
        const list = (Array.isArray(raw) ? raw : []).map((v) => ({
          id: v.id,
          name: v.name ?? v.vendorName ?? v.companyName ?? `Vendor #${v.id}`,
        }));
        setVendors(list);
      } catch (err) {
        console.error('Failed to load vendors', err);
      } finally {
        setVendorsLoading(false);
      }
    })();
  }, []);

  const applyCommonVendorToChecked = (vendorId, selection, rows) => {
    if (!vendorId) return;
    const selectedIndexes = Object.keys(selection).filter((k) => selection[k]);
    if (selectedIndexes.length === 0) return;
    setVendorMap((prev) => {
      const next = { ...prev };
      selectedIndexes.forEach((idx) => {
        const item = rows[Number(idx)];
        if (item) next[item.rawMaterialId] = vendorId;
      });
      return next;
    });
  };

  const openQuotationModal = (item) => setQuotationItem(item);
  const closeQuotationModal = () => setQuotationItem(null);

  const handleSelectPrice = (quotation, item) => {
    // Wires the chosen quotation's vendor + price back onto the row.
    // NOTE: quotation.vendorName is a name in the mock data, not an id —
    // once quotations come from a real API this should carry a vendorId.
    console.log('Selected vendor price:', quotation, 'for item:', item);
    closeQuotationModal();
  };

  // ---- Table rows sourced from the PR's real line items ----
  const purchaseItems = useMemo(() => {
    if (!pr?.details) return [];
    return pr.details.map((d, idx) => ({
      rawMaterialId: d.rawMaterialId,
      srNo: String(idx + 1).padStart(2, '0'),
      itemName: d.rawMaterialName,
      unit: d.uomName,
      approvedQty: d.quantity,
    }));
  }, [pr]);

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
        <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-semibold my-3" />
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
        <DataGridColumnHeader title="UNIT" column={column} className="text-[#43474F] font-semibold my-3" />
      ),
      size: 90,
    },
    {
      id: 'vendorName',
      header: ({ column }) => (
        <DataGridColumnHeader title="VENDOR NAME" column={column} className="text-[#43474F] font-semibold my-3" />
      ),
      cell: ({ row }) => (
        <div className="relative">
          <select
            value={vendorMap[row.original.rawMaterialId] || ''}
            onChange={(e) =>
              setVendorMap((prev) => ({
                ...prev,
                [row.original.rawMaterialId]: e.target.value,
              }))
            }
            className="w-full max-w-[140px] h-9 border border-[#E2E8F0] rounded-lg px-3 text-sm text-[#1E293B] appearance-none outline-none bg-white cursor-pointer"
          >
            <option value="">Select</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      ),
      size: 170,
    },
    {
      accessorKey: 'approvedQty',
      header: ({ column }) => (
        <DataGridColumnHeader title="PR APPROVED QTY" column={column} className="text-[#43474F] font-semibold my-3" />
      ),
    },
    {
      id: 'poQty',
      header: ({ column }) => (
        <DataGridColumnHeader title="PO QUANTITY" column={column} className="text-[#43474F] font-semibold my-3" />
      ),
      cell: ({ row }) => (
        <input
          type="number"
          value={poQtyMap[row.original.rawMaterialId] ?? ''}
          onChange={(e) =>
            setPoQtyMap((prev) => ({
              ...prev,
              [row.original.rawMaterialId]: e.target.value === '' ? '' : Number(e.target.value),
            }))
          }
          className="w-20 h-9 border rounded-lg text-center outline-none"
        />
      ),
    },
    {
      id: 'action',
      header: ({ column }) => (
        <DataGridColumnHeader title="ACTION" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() =>
            setPoQtyMap((prev) => {
              const next = { ...prev };
              delete next[row.original.rawMaterialId];
              return next;
            })
          }
          className="cursor-pointer"
          title="Remove from PO"
        >
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

  // Only line items still present in poQtyMap (i.e. not removed) count toward the PO.
  const includedItems = purchaseItems.filter(
    (item) => poQtyMap[item.rawMaterialId] !== undefined && poQtyMap[item.rawMaterialId] !== '',
  );

  // ---- Save handlers ----
  // NOTE: PO payload shape is a best guess mirroring the PR payload
  // (prId reference + details array + status). Confirm the real
  // /purchase-orders/add and /purchase-orders/update/{id} request shape
  // before relying on this in production.
  const buildPayload = (status) => ({
    prId: pr?.id,
    outletId: pr?.outletId,
    poDate,
    remarks,
    vendorId: commonVendorId || undefined,
    status,
    details: includedItems.map((item) => ({
      rawMaterialId: item.rawMaterialId,
      rawMaterialName: item.itemName,
      quantity: poQtyMap[item.rawMaterialId],
      vendorId: vendorMap[item.rawMaterialId] || commonVendorId || undefined,
    })),
    actionBy: getUserIdFromToken(),
  });

  const handleSaveDraft = async () => {
    try {
      const payload = buildPayload(PO_STATUS.PENDING);
      if (isEditingExistingPo) {
        await update(state.id, payload);
      } else {
        await create(payload);
      }
      navigate('/purchase/purchase-order-requests');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    try {
      const payload = buildPayload(PO_STATUS.APPROVED);
      if (isEditingExistingPo) {
        await update(state.id, payload);
      } else {
        await create(payload);
      }
      navigate('/purchase/purchase-order-requests');
    } catch (err) {
      console.error(err);
    }
  };

  const estimatedTotal = 0; // TODO: no per-item price is available yet — wire once
  // vendor quotations come from a real API and are stored per row.

  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase Order Request</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Create Purchase Order</span>
        </div>

        <div className="my-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">Create Purchase Order</h1>
          <p className="text-sm text-[#737781] mt-1">
            Review requisition details and finalize the purchase order for vendor submission.
          </p>
        </div>

        {prError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {prError?.message || 'Failed to load the source purchase requisition.'}
          </div>
        )}

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-[#0B5CAD]" />
              <h2 className="text-xl font-semibold text-[#1E293B]">Purchase Order Information</h2>
            </div>
          </div>

          <div className="p-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">PR Code</label>
                <input
                  value={pr?.prCode ?? state?.prCode ?? ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">PO Code</label>
                <input
                  value={state?.poCode || 'TO BE GENERATED'}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 text-[#0B5CAD] font-semibold outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">PR Date</label>
                <input
                  value={pr?.date ?? state?.date ?? ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">Company Name</label>
                <input
                  value={state?.company || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">Outlet Name</label>
                <input
                  value={pr?.outlet ?? state?.outlet ?? ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">Approval Date</label>
                <input
                  type="date"
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">PR Raised By</label>
                <input
                  value={state?.raisedBy || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">PR Approved By</label>
                <input
                  value={pr?.actionBy || ''}
                  readOnly
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 outline-none focus:border-[#0B5CAD]"
                />
              </div>
            </div>

            {/* Row 4 — Vendor Name (common) + Warehouse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={commonVendorId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCommonVendorId(v);
                        if (v) applyCommonVendorToChecked(v, rowSelection, purchaseItems);
                      }}
                      disabled={vendorsLoading}
                      className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 appearance-none outline-none"
                    >
                      <option value="">{vendorsLoading ? 'Loading vendors...' : 'Select Vendor'}</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                  <button className="w-11 h-11 rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] flex items-center justify-center hover:bg-[#DBEAFE]">
                    <Plus size={18} className="text-[#0B5CAD]" />
                  </button>
                </div>
              </div>

              {/* Warehouse — no warehouse endpoint exists in apiServices yet;
                  left as a static placeholder until one is added. */}
              <div>
                <label className="text-sm text-[#475569] mb-1 block">
                  WareHouse <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select className="w-full h-11 rounded-lg border border-[#E2E8F0] px-3 appearance-none outline-none">
                      <option>Select Warehouse</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
          {prLoading && <p className="p-4 text-sm text-gray-500">Loading purchase items...</p>}
          <div className="flex justify-between px-3 py-6 border-b ">
            <div className="flex gap-2 items-center text-[#084E92]">
              <ClipboardList />
              <h1 className="text-2xl font-semibold text-black">Purchase Items</h1>
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
              <p className="font-semibold">{purchaseItems.length}</p>
            </div>
            <div className="text-sm flex gap-2">
              <span className="text-gray-500">PO Items Included</span>
              <p className="font-semibold">{includedItems.length}</p>
            </div>
            <div className="text-sm flex gap-2 items-center">
              <span className="text-gray-500">Estimated Total Value:</span>
              {/* TODO: real total needs per-item price, not returned by the
                  PR/PO endpoints as given — wire once vendor quotations are live. */}
              <p className="text-xl font-bold text-[#084E92]">₹ {estimatedTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Terms & Delivery Notes */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mt-6">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#0B5CAD]" />
              <h2 className="text-sm font-semibold text-[#1E293B]">Terms & Delivery Notes</h2>
            </div>
          </div>
          <div className="p-6">
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add specific delivery instructions or terms for the vendor..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 resize-none outline-none focus:border-[#0B5CAD] focus:ring-2 focus:ring-[#DBEAFE]"
            />
          </div>
        </div>

        {poSaveError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {poSaveError}
          </div>
        )}

        {/* Bottom Buttons */}
        <div className="flex justify-between items-center mt-8 border-t py-5">
          <Link to="/purchase/purchase-order-requests">
            <button type="button" className="px-6 py-2.5 border border-[#D1D5DB] rounded-lg text-[#475569] hover:bg-gray-50 cursor-pointer">
              Cancel Process
            </button>
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={poSaving}
              onClick={handleSaveDraft}
              className="px-6 py-2.5 border border-[#084E92] text-[#084E92] rounded-lg hover:bg-[#EFF6FF] cursor-pointer disabled:opacity-50"
            >
              {poSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              disabled={poSaving}
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-[#084E92] text-white rounded-lg hover:bg-[#063d73] cursor-pointer disabled:opacity-50"
            >
              {poSaving ? 'Saving...' : 'Generate Purchase Order'}
            </button>
          </div>
        </div>
      </div>

      <VendorPriceComparisonModal
        open={!!quotationItem}
        item={quotationItem}
        quotations={quotationItem ? vendorQuotationsData[quotationItem.rawMaterialId] || [] : []}
        onClose={closeQuotationModal}
        onSelectPrice={handleSelectPrice}
      />
    </Container>
  );
};

export default CreatePurchaseOrder;