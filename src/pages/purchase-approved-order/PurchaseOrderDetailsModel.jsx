import { CheckLine, CircleCheckBig, Info, X } from "lucide-react";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";

const SummaryField = ({ label, value }) => {
    return (
        <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2 block">
                {label}
            </label>

            <div className="h-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 flex items-center text-[#0F172A] font-medium">
                {value || "--"}
            </div>
        </div>
    );
};
const VarianceBadge = ({ type }) => {

    const style = {
        Exact: "bg-[#E7F9F1] text-[#10B981]",
        Partial: "bg-[#FFF4E5] text-[#F97316]",
        Zero: "bg-[#FEECEC] text-[#EF4444]",
    };


    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${style[type]}`}>
            • {type.toUpperCase()}
        </span>
    );
};
const inventoryItems = [
    {
        id: 1,
        srNo: "01",
        itemName: "Industrial Grade Steel Bars",
        unit: "MT",
        approvedQty: "500",
        poQty: "500",
        receivedQty: "500",
        variance: "Exact",
        stockAvailable: "1,250",
    },
    {
        id: 2,
        srNo: "02",
        itemName: "Lubricant Oil - HDX 40",
        unit: "Liters",
        approvedQty: "1,200",
        poQty: "1,200",
        receivedQty: "900",
        variance: "Partial",
        stockAvailable: "450",
    },
    {
        id: 3,
        srNo: "03",
        itemName: "Hydraulic Fittings Set",
        unit: "Unit",
        approvedQty: "45",
        poQty: "45",
        receivedQty: "45",
        variance: "Exact",
        stockAvailable: "12",
    },
    {
        id: 4,
        srNo: "04",
        itemName: "Conveyor Belt Rubber",
        unit: "Roll",
        approvedQty: "10",
        poQty: "10",
        receivedQty: "0",
        variance: "Zero",
        stockAvailable: "0",
    },
];
const PurchaseOrderDetailsModal = ({
    open,
    onClose,
    order,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [inventory, setInventory] = useState(inventoryItems)

    const inventoryColumns = [

        {
            accessorKey: "srNo",
            header: ({ column }) => (
                <DataGridColumnHeader title="#" column={column} className="text-[#43474F] font-semibold my-2 text-xs" />
            ),
            size: 80
        },


        {
            accessorKey: "itemName",
            header: ({ column }) => (
                <DataGridColumnHeader title="ITEM DESCRIPTION" column={column} className="text-[#43474F] font-semibold text-xs" />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-[#12335A]">
                    {row.original.itemName}
                </span>
            ),
            size: 240
        },


        {
            accessorKey: "unit",
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT" column={column} className="text-[#43474F] font-semibold text-xs" />
            ),
            size: 100
        },


        {
            accessorKey: "approvedQty",
            header: ({ column }) => (
                <DataGridColumnHeader title="PR APPROVED" column={column} className="text-[#43474F] font-semibold text-xs" />
            )
        },


        {
            accessorKey: "poQty",
            header: ({ column }) => (
                <DataGridColumnHeader title="PO QTY" column={column} className="text-[#43474F] font-semibold text-xs" />
            )
        },


        {
            accessorKey: "receivedQty",
            header: ({ column }) => (
                <DataGridColumnHeader title="APPROVED QTY" column={column} className="text-[#43474F] font-semibold text-xs" />
            ),
            cell: ({ row }) => (
                <span className="font-bold text-[#12335A]">
                    {row.original.receivedQty}
                </span>
            )
        },


        {
            accessorKey: "variance",
            header: ({ column }) => (
                <DataGridColumnHeader title="VARIANCE" column={column} className="text-[#43474F] font-semibold text-xs" />
            ),

            cell: ({ row }) => {

                const color =
                    row.original.variance === "Exact"
                        ? "bg-green-100 text-green-700"
                        : row.original.variance === "Partial"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700";


                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                        • {row.original.variance.toUpperCase()}
                    </span>
                )
            }
        },


        {
            accessorKey: "stockAvailable",
            header: ({ column }) => (
                <DataGridColumnHeader title="AVAILABLE" column={column} className="text-[#43474F] font-semibold text-xs" />
            ),
            cell: ({ row }) => (
                <span className="font-bold text-[#12335A]">
                    {row.original.stockAvailable}
                </span>
            )
        }

    ];
    const table = useReactTable({
        data: inventory,
        columns: inventoryColumns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="absolute inset-0 flex justify-center items-center p-6">

                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl"
                >

                    {/* Header */}

                    <div className="flex justify-between items-start px-8 py-7 border-b">

                        <div>

                            <h1 className="text-3xl font-bold text-[#12335A]">
                                Purchase Order Details
                            </h1>

                            <div className="flex items-center gap-2 text-[#64748B] mt-2">

                                <Info size={16} />

                                <p className="text-sm">
                                    Detailed breakdown of generated Purchase Order information and
                                    associated line items.
                                </p>

                            </div>

                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>

                    </div>

                    {/* Body */}

                    <div className="bg-[#F8FAFC] p-6 space-y-6">

                        {/* Order Summary */}

                        <div className="bg-white rounded-2xl border border-[#E2E8F0]">

                            <div className="px-6 py-5 border-b">

                                <div className="flex items-center gap-2">

                                    <Info
                                        size={18}
                                        className="text-[#0B5CAD]"
                                    />

                                    <h2 className="text-lg font-semibold text-[#1E293B] uppercase tracking-wide">
                                        Order Summary
                                    </h2>

                                </div>

                            </div>

                            <div className="p-6">

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                                    <SummaryField
                                        label="PR Code"
                                        value={order?.prCode}
                                    />

                                    <SummaryField
                                        label="PO Code"
                                        value={order?.poCode}
                                    />

                                    <SummaryField
                                        label="PR Date"
                                        value={order?.date}
                                    />

                                    <SummaryField
                                        label="PO Date"
                                        value={order?.poDate}
                                    />

                                    <SummaryField
                                        label="Company Name"
                                        value={order?.company}
                                    />

                                    <SummaryField
                                        label="Outlet Name"
                                        value={order?.outlet}
                                    />

                                    <SummaryField
                                        label="Vendor Name"
                                        value={order?.vendor}
                                    />

                                    <SummaryField
                                        label="Stock Type"
                                        value={order?.stockType}
                                    />

                                </div>

                            </div>

                        </div>

                          <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                        
                                {loading && (
                                  <p className="p-4 text-sm text-gray-500">
                                    Loading purchase requests...
                                  </p>
                                )}
                        
                                {error && (
                                  <p className="p-4 text-sm text-red-600">
                                    {error}
                                  </p>
                                )}
                                <div className="py-6 px-3 flex justify-between items-center bg-white border-b">
                                    <div className="flex gap-2 text-sm items-center"> 
                                        <span className="p-1 bg-[#0022461A] rounded-full shrink-0">
                                            <CircleCheckBig size={18}/>
                                        </span>
                                        <h1 className="font-semibold tracking-wider">INVENTORY MANIFEST</h1>
                                    </div>
                                    <p className="py-2 px-4 rounded-full text-xs bg-[#002246] text-white">{inventory.length} LINE ITEMS</p>
                                </div>
                                <DataGrid
                                  table={table}
                                  recordCount={inventory.length}
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

                </div>

            </div>

        </div>
    );
};

export default PurchaseOrderDetailsModal;