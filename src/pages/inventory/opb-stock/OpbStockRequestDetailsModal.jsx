import React from 'react';
import {
    Archive,
    X,
    Calendar,
    Home,
    Building2,
    Package,
    Hash,
    IndianRupee,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FieldCard = ({ icon: Icon, label, value }) => (
    <div className="flex-1 min-w-45 border border-[#E2E8F0] rounded-xl px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                {label}
            </span>

            {Icon && (
                <Icon
                    size={15}
                    className="text-gray-400"
                />
            )}
        </div>

        <p className="text-sm font-semibold text-[#0F172A]">
            {value || '-'}
        </p>
    </div>
);

const SectionLabel = ({ children, right }) => (
    <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#084E92]" />

            <span className="text-xs font-semibold tracking-wide text-[#43474F] uppercase">
                {children}
            </span>
        </div>

        {right}
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        POSTED: 'bg-green-50 text-green-600 border border-green-100',
        DRAFT: 'bg-amber-50 text-amber-600 border border-amber-100',
        CANCELLED: 'bg-red-50 text-red-600 border border-red-100',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                map[status] ||
                'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {status || '-'}
        </span>
    );
};

const OpbStockRequestDetailsModal = ({
    open,
    onOpenChange,
    request,
}) => {
    if (!request) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent
                showCloseButton={false}
                className="p-0 gap-0 max-w-3xl rounded-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF4FF] flex items-center justify-center shrink-0">
                            <Archive
                                size={18}
                                className="text-[#084E92]"
                            />
                        </div>

                        <div>
                            <h2 className="text-base font-bold text-[#0F172A]">
                                OPB Stock Request Details
                            </h2>

                            <p className="text-xs text-gray-500 mt-0.5">
                                Opening balance stock request record
                                <span className="text-gray-300 mx-1">
                                    •
                                </span>
                                <span className="text-gray-500">
                                    REF: {request.opbCode || '-'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <ScrollArea className="max-h-[70vh]">
                    <div className="px-6 py-5 space-y-5">

                        {/* Request Details */}
                        <div>
                            <SectionLabel
                                right={
                                    <StatusBadge
                                        status={request.status}
                                    />
                                }
                            >
                                Request Details
                            </SectionLabel>

                            <div className="flex flex-col sm:flex-row gap-3">

                                <FieldCard
                                    icon={Calendar}
                                    label="Created Date"
                                    value={request.opbDate}
                                />

                                <FieldCard
                                    icon={Home}
                                    label="Outlet"
                                    value={request.organizationName}
                                />

                                <FieldCard
                                    icon={Building2}
                                    label="Sub-Outlet"
                                    value={request.subOutletName}
                                />

                            </div>
                        </div>

                        {/* OPB Stock Details */}
                        <div>
                            <SectionLabel>
                                OPB Stock Details
                            </SectionLabel>

                            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

                                {/* Item */}
                                <div className="flex items-center justify-between gap-3 px-4 py-3">

                                    <div className="flex items-center gap-3 min-w-0">

                                        <span className="w-7 h-7 shrink-0 rounded-lg bg-[#EFF4FF] text-[#084E92] text-xs font-bold flex items-center justify-center">
                                            01
                                        </span>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                                                {request.itemName || '-'}
                                            </p>

                                            <p className="text-xs text-gray-400 truncate">
                                                {request.itemType || '-'}
                                            </p>
                                        </div>

                                    </div>

                                    <StatusBadge
                                        status={request.status}
                                    />

                                </div>

                                {/* Unit */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">

                                    <span className="text-xs text-gray-500">
                                        Unit
                                    </span>

                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 border border-[#E2E8F0] text-[11px] text-gray-600">
                                        {request.unitName || '-'}
                                        {request.unitSymbol
                                            ? ` (${request.unitSymbol})`
                                            : ''}
                                    </span>

                                </div>

                                {/* Quantity */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">

                                    <span className="text-xs text-gray-500">
                                        Quantity
                                    </span>

                                    <span className="text-sm font-semibold text-[#0F172A]">
                                        {request.quantity ?? '-'}
                                    </span>

                                </div>

                                {/* Unit Rate */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">

                                    <span className="text-xs text-gray-500">
                                        Unit Rate
                                    </span>

                                    <span className="text-sm font-semibold text-[#0F172A]">
                                        ₹{request.unitRate ?? 0}
                                    </span>

                                </div>

                                {/* Total Amount */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">

                                    <span className="text-xs text-gray-500">
                                        Total Amount
                                    </span>

                                    <span className="text-sm font-semibold text-[#084E92]">
                                        ₹{request.totalAmount ?? 0}
                                    </span>

                                </div>

                            </div>
                        </div>

                        {/* Batch Details */}
                        <div>
                            <SectionLabel>
                                Batch Details
                            </SectionLabel>

                            <div className="flex flex-col sm:flex-row gap-3">

                                <FieldCard
                                    icon={Hash}
                                    label="Batch Number"
                                    value={request.batchNumber}
                                />

                                <FieldCard
                                    icon={Calendar}
                                    label="Expiry Date"
                                    value={request.expiryDate}
                                />

                            </div>
                        </div>

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default OpbStockRequestDetailsModal;