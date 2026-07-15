import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  BadgeCheck,
  Ban,
  Building2,
  Check,
  Eye,
  FileText,
  Landmark,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import React, { useMemo, useState } from "react";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const KycData = [
  {
    icon: <FileText size={18} />,
    kycType: "GST Registration",
    fileName: "gst_cert.pdf",
    kycNum: "27AAACM1234F1Z5",
    expiryDate: "Mar 31, 2026",
    status: "Valid",
  },
  {
    icon: <FileText size={18} />,
    kycType: "Trade License",
    fileName: "trade_license.jpg",
    kycNum: "TL-MH-2023-9871",
    expiryDate: "Dec 15, 2024",
    status: "Pending",
  },
  {
    icon: <FileText size={18} />,
    kycType: "PAN Card",
    fileName: "pan_card_corp.pdf",
    kycNum: "AAACM1234F",
    expiryDate: "-",
    status: "Valid",
  },
];

const VendorKycInfo = () => {
  const [data] = useState(KycData);

  const columns = useMemo(
    () => [
      {
        id: "kycType",
        accessorFn: (row) => row.kycType,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="KYC Type"
            column={column}
            className="px-4 uppercase text-xs font-semibold text-[#43474F]"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 px-4">
            <div className="p-2 rounded bg-red-50 text-red-500">
              {row.original.icon}
            </div>

            <div>
              <p className="font-semibold text-[#141B2B]">
                {row.original.kycType}
              </p>

              <p className="text-xs text-[#737781]">
                {row.original.fileName}
              </p>
            </div>
          </div>
        ),
        size: 220,
      },

      {
        id: "kycNum",
        accessorFn: (row) => row.kycNum,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="KYC Number"
            column={column}
            className="uppercase text-xs font-semibold text-[#43474F]"
          />
        ),
        cell: ({ row }) => (
          <span className="text-[#43474F]">
            {row.original.kycNum}
          </span>
        ),
      },

      {
        id: "expiryDate",
        accessorFn: (row) => row.expiryDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Expiry Date"
            column={column}
            className="uppercase text-xs font-semibold text-[#43474F]"
          />
        ),
        cell: ({ row }) => (
          <span className="text-[#43474F]">
            {row.original.expiryDate}
          </span>
        ),
      },

      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="uppercase text-xs font-semibold text-[#43474F]"
          />
        ),
        cell: ({ row }) => (
          <span
            className={`px-3 py-1 rounded text-xs font-semibold ${
              row.original.status === "Valid"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {row.original.status}
          </span>
        ),
      },

      {
        id: "action",
        header: () => (
          <div className="uppercase text-xs font-semibold text-[#43474F]">
            Action
          </div>
        ),
        cell: () => (
          <button className="text-[#084E92] font-semibold cursor-pointer">
            View
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full bg-white">
      <div className="p-6">

        {/* Vendor Card */}
        <div className="border border-[#D9DCE3] rounded-2xl p-6 flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Building2 size={30} className="text-[#084E92]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-[#084E92]">
                  Metro Logistics
                </h1>

                <span className="px-3 py-1 rounded-full bg-[#FFF4E5] text-[#D97706] text-xs font-semibold flex items-center gap-1">
                    <TriangleAlert size={12}/>
                  <p>Pending Verification</p>
                </span>
              </div>

              <p className="text-sm text-[#737781]">
                VND-2023-0892 • Registered: Oct 12, 2023
              </p>
            </div>
          </div>

          <div className="lg:text-right self-end">
            <p className="text-sm text-[#737781]">
              Primary Contact
            </p>

            <h3 className="font-semibold text-[#141B2B]">
              Rajesh Jaiswal
            </h3>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 border border-[#D9DCE3] rounded-2xl overflow-hidden">
          <DataGrid table={table}>
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] border-b">
              <h2 className="text-lg font-semibold text-[#084E92]">
                Vendor Compliance Documents
              </h2>

              <p className="text-sm text-[#737781]">
                Documents are locked for editing during review
              </p>
            </div>

            <Card className="border-0 shadow-none">
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
            </Card>
          </DataGrid>
        </div>

        {/* Bottom Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">

          {/* Bank Information */}
          <div className="border border-[#D9DCE3] rounded-xl p-5">
            <h3 className="font-semibold text-[#43474F] mb-5 uppercase flex gap-2 items-center">
                 <Landmark size={20}/>
              <p>Bank Information</p>
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#737781]">
                  Bank Name
                </p>

                <p className="font-semibold text-[#141B2B]">
                  HDFC Bank Ltd
                </p>
              </div>

              <div>
                <p className="text-sm text-[#737781]">
                  Account Number
                </p>

                <p className="font-semibold text-[#141B2B]">
                  **** **** 5678
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border border-[#D9DCE3] rounded-xl p-5">
            <h3 className="font-semibold text-[#43474F] mb-5 uppercase flex gap-2 items-center">
                <RotateCcw size={20}/>
              <p>Verification Timeline</p>
            </h3>

            <div className="relative pl-6">
              <div className="absolute left-1.25 top-2 h-16 border-l border-gray-300" />

              <div className="relative mb-6">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#084E92]" />

                <p className="font-medium text-[#084E92]">
                  Review Started
                </p>

                <p className="text-xs text-[#737781]">
                  Today, 09:45 AM
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-gray-300" />

                <p className="font-medium text-[#141B2B]">
                  Documents Uploaded
                </p>

                <p className="text-xs text-[#737781]">
                  Yesterday, 04:20 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="border-t border-[#D9DCE3] px-6 py-4 flex justify-end gap-4">
        <button className="px-6 py-2 border border-[#C3C6D1] rounded text-[#43474F] cursor-pointer hover:scale-105 transition-all duration-200">
          Cancel
        </button>

        <button className="px-6 py-2 rounded bg-[#BA1A1A] text-white flex items-center gap-2 cursor-pointer hover:scale-105 transition-all duration-200">
          <Ban size={15} />
          Reject
        </button>

        <button className="px-6 py-2 rounded bg-[#084E92] text-white flex items-center gap-2 cursor-pointer hover:scale-105 transition-all duration-200">
          <BadgeCheck size={15} />
          Approve
        </button>
      </div>
    </div>
  );
};


export default VendorKycInfo
