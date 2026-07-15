import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { BadgeCheck, Ban, Check, Download, Eye, IdCard } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


const maskPan = (pan) => {
    return `${pan.slice(0, 3)}*****${pan.slice(-2)}`;
};

const maskAadhar = (adhar) => {
    return `**** **** ${adhar.slice(-4)}`
}

const KycData = [
    {
        icon: <IdCard />,
        kycType: "PAN Card",
        kycNum: maskPan("ABC123561G"),
        uploadDate: "Oct 12, 2023",
        status: "Approved",
    },
    {
        icon: <IdCard />,
        kycType: "Aadhaar Card",
        kycNum: maskAadhar("1245 1254 9021"),
        uploadDate: "Oct 12, 2023",
        status: "Approved",
    }
]

const Documents = [
    {
        name: "pan_front.jpg",
        size: "1.2 MB",
        type: "Image",
    },
    {
        name: "pan_back.pdf",
        size: "842 KB",
        type: "PDF Document",
    },
    {
        name: "aadhaar_card.pdf",
        size: "2.4 MB",
        type: "PDF Document",
    }
]
const KycInformation = () => {
    const [data, setData] = useState(KycData)


    const columns = useMemo(
        () => [
            {
                id: "kycType",
                accessorFn: (row) => row.kycType,
                header: ({ column }) => <DataGridColumnHeader title="Kyc Type" column={column} className="px-5 py-1 uppercase text-xs font-semibold text-[#43474F]" />,
                cell: ({ row }) => (
                    <div className='flex gap-2 items-center px-3'>
                        <p className='text-[#084E92]'>{row.original.icon}</p>
                        <span className="text-[#141B2B] font-semibold whitespace-nowrap">{row.original.kycType}</span>
                    </div>
                ),

            },
            {
                id: "kycNum",
                accessorFn: (row) => row.kycNum,
                header: ({ column }) => <DataGridColumnHeader title="Kyc Number" column={column} className="py-1 uppercase text-xs font-semibold text-[#43474F] " />,
                cell: ({ row }) => <span className="text-gray-600 whitespace-nowrap">{row.original.kycNum}</span>,

            },
            {
                id: "uploadDate",
                accessorFn: (row) => row.uploadDate,
                header: ({ column }) => <DataGridColumnHeader title="Email Address" column={column} className="py-1 uppercase text-xs font-semibold text-[#43474F]" />,
                cell: ({ row }) => <span className="text-gray-600 whitespace-nowrap">{row.original.uploadDate}</span>,

            },
            {
                id: "status",
                accessorFn: (row) => row.status,
                header: ({ column }) => <DataGridColumnHeader title="status" column={column} className="py-1 uppercase text-xs font-semibold text-[#43474F]" />,
                cell: ({ row }) => <span className="text-[#16A34A] whitespace-nowrap  ">{row.original.status}</span>,

            },
        ],
        [],
    );

    const table = useReactTable({
        data: data,
        columns,
        columnResizeMode: "onChange",

        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),

    });

    return (
        <div className='w-full'>
            <div className='p-6'>
                <div className='flex gap-5 sm:items-center flex-col sm:flex-row  justify-between border border-[#C3C6D1] rounded-2xl py-10 px-6'>
                    <div className='flex gap-5 items-center'>
                        <div className='p-4 rounded-full bg-[#084E92] text-[#7CA2DD]'><p className='text-2xl font-semibold'>RJ</p></div>
                        <div>
                            <div className='flex sm:gap-3 gap-1 mb-2'>
                                <h1 className='text-2xl font-semibold text-[#141B2B]'>Rahul Jaiswal</h1>
                                <span className='flex gap-2 items-center px-2 sm:py-1 rounded-full shrink-0 bg-[#DCFCE7] text-[#15803D] text-xs font-semibold'><p className='p-1 bg-[#15803D] text-white rounded-full'><Check size={10} /></p> Verified</span>
                            </div>
                            <p className='text-sm text-[#43474F]'>User ID: 9021 • Enterprise Account</p>
                        </div>
                    </div>
                    <div className='flex flex-col items-end'>
                        <p className='text-sm text-[#43474F] mb-1'>LAST ACTIVITY</p>
                        <h3 className='text-[#141B2B] text-xs sm:text-sm'>Oct 24, 2023 at 04:12 PM</h3>
                    </div>
                </div>



                <div className='my-6 border border-[#C3C6D1] rounded-2xl p-px'>
                    <DataGrid table={table}>

                        <div className="flex items-center justify-between px-4 py-3 bg-[#F9F9FF] rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
                            <h1 className='text-xl font-semibold p-3'>User KYC Documents</h1>
                        </div>

                        {/* Table Card */}
                        <Card className=" border-0">
                            <CardTable>
                                <ScrollArea>
                                    <DataGridTable />
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </CardTable>
                        </Card>
                    </DataGrid>
                </div>

                <div className='grid sm:grid-cols-3 grid-cols-1 gap-6'>
                    {
                        Documents.map((item) => (
                            <div className='border border-[#C3C6D1] rounded-2xl flex flex-col h-max'>
                                <div className='w-[90%] h-[30vh] m-4 bg-[#0022461A] rounded mx-auto'>

                                </div>
                                <div className='mx-4 flex justify-between items-center text-sm pb-4'>
                                    <div>
                                        <p className='text-[#141B2B] font-semibold'>{item.name}</p>
                                        <p className='text-xs text-[#43474F] font-semibold'>{item.size} • {item.type}</p>
                                    </div>
                                    <div className='flex gap-3 items-center cursor-pointer text-[#43474F]'>
                                        <Eye size={25} />
                                        <Download size={20} />
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>

            </div>
            <div className="py-4 w-full border-t border-[#C3C6D1] my-20 flex justify-end gap-5 text-sm px-6">
                <button className='py-2 px-6 border border-[#737781] text-[#43474F] rounded cursor-pointer'>Cancle</button>
                <button className='py-2 px-6 flex gap-2 items-center bg-[#BA1A1A] text-white rounded cursor-pointer'><Ban size={15} /> Reject</button>
                <button className='py-2 px-6 flex gap-2 items-center bg-[#084E92] text-white rounded cursor-pointer'><BadgeCheck size={15} /> Approve</button>
            </div>

        </div>
    )
}

export default KycInformation
