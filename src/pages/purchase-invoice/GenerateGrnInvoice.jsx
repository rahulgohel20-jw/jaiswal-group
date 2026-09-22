import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Pencil, Receipt, Trash2, CheckCircle2 } from 'lucide-react';
import { Container } from '@/components/common/container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  formatCurrency,
  numberToWords,
} from '@/pages/purchase-order-requests/utils/taxUtils';

const todayISO = () => new Date().toISOString().slice(0, 10);

const GenerateGrnInvoice = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const selectedGrns = useMemo(() => {
    if (state?.selectedGrns?.length) return state.selectedGrns;

    try {
      const cached = sessionStorage.getItem('grnInvoiceDraft');
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.warn('Could not read cached GRN invoice draft:', err);
      return [];
    }
  }, [state]);

  const [billNumber, setBillNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());

  const [rows, setRows] = useState(() =>
    selectedGrns.flatMap((grn) =>
      (grn.details || []).map((detail) => ({
        key: `${grn.id}-${detail.id}`,
        grnCode: grn.grnCode,
        itemName:
          detail.rawMaterialName || `Item #${detail.rawMaterialId}`,
        unitName: detail.unitName || '—',
        qty: detail.acceptedQuantity ?? 1,
        rate: 0,
        hsn: '',
        cgst: 0,
        sgst: 0,
        cess: 0,
      }))
    )
  );

  const vendorName = selectedGrns[0]?.vendorName || '—';

  const outletName =
    selectedGrns[0]?.organizationName ||
    selectedGrns[0]?.outletName ||
    selectedGrns[0]?.outlet ||
    '—';

  const updateRow = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, [field]: value } : r
      )
    );
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const rowAmount = (r) => {
    const base =
      (Number(r.qty) || 0) *
      (Number(r.rate) || 0);

    const taxPct =
      (Number(r.cgst) || 0) +
      (Number(r.sgst) || 0) +
      (Number(r.cess) || 0);

    return base * (1 + taxPct / 100);
  };

  const totals = useMemo(() => {
    let taxable = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let cessAmt = 0;

    rows.forEach((r) => {
      const base =
        (Number(r.qty) || 0) *
        (Number(r.rate) || 0);

      taxable += base;

      cgstAmt +=
        base * ((Number(r.cgst) || 0) / 100);

      sgstAmt +=
        base * ((Number(r.sgst) || 0) / 100);

      cessAmt +=
        base * ((Number(r.cess) || 0) / 100);
    });

    const totalTax =
      cgstAmt +
      sgstAmt +
      cessAmt;

    const rawNet =
      taxable +
      totalTax;

    const netAmount =
      Math.round(rawNet);

    const roundOff =
      netAmount - rawNet;

    return {
      taxable,
      cgstAmt,
      sgstAmt,
      cessAmt,
      totalTax,
      netAmount,
      roundOff,
    };
  }, [rows]);

  const handleBack = () => navigate(-1);

  const handleCancel = () => navigate(-1);

  const handleGenerate = () => {
    if (!billNumber.trim()) {
      toast.error('Enter the vendor bill number.');
      return;
    }

    if (!invoiceDate) {
      toast.error('Select the invoice date.');
      return;
    }

    if (rows.length === 0) {
      toast.error('At least one line item is required.');
      return;
    }

    toast.success('Invoice generated.');
    navigate('/purchase/purchase-invoice');
  };

  return (
    <Container>
      <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-6 pb-28 sm:pb-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
          <h1
            className="text-[24px] sm:text-[28px] font-bold text-[#101828]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Generate GRN Invoice
          </h1>

          <button
            type="button"
            onClick={handleBack}
            className="w-max sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E7EAF0] bg-white text-sm font-semibold text-[#101828] hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
            Back to GRN Listing
          </button>
        </div>

        {/* Invoice details card */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E7EAF0] p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center">
              <Receipt size={16} className="text-[#084E92]" />
            </span>

            <h2 className="text-base font-bold text-[#101828]">
              Invoice
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {/* Bill Number */}
            <div className="min-w-0">
              <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                Vendor Bill Number <span className="text-red-500">*</span>
              </label>

              <input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="INV/2026-27/8942"
                className="w-full h-10 px-3 sm:px-3.5 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
              />
            </div>

            {/* Invoice Date */}
            <div className="min-w-0">
              <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                Invoice Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-10 px-3 sm:px-3.5 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
              />
            </div>

            {/* Vendor */}
            <div className="min-w-0">
              <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                Vendor Name
              </label>

              <div className="w-full min-h-10 px-3 sm:px-3.5 py-2 flex items-center rounded-xl border border-[#E7EAF0] bg-[#F9FAFC] text-sm text-[#101828] wrap-break-word">
                {vendorName}
              </div>
            </div>

            {/* Outlet */}
            <div className="min-w-0">
              <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                Receiving Outlet / Plant
              </label>

              <div className="w-full min-h-10 px-3 sm:px-3.5 py-2 flex items-center rounded-xl border border-[#E7EAF0] bg-[#F9FAFC] text-sm text-[#101828] wrap-break-word">
                {outletName}
              </div>
            </div>
          </div>
        </div>

        {/* GRN items card */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E7EAF0] overflow-hidden mb-4 sm:mb-6">
          <div className="p-4 sm:p-6 pb-4">
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center">
                <Receipt size={16} className="text-[#084E92]" />
              </span>

              <h2 className="text-base font-bold text-[#101828]">
                GRN Items{' '}
                <span className="font-normal text-gray-500">
                  ({selectedGrns.length} Selected GRN
                  {selectedGrns.length > 1 ? 's' : ''})
                </span>
              </h2>

              <span className="ml-0 sm:ml-1 inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-[#084E92] text-xs font-semibold">
                {rows.length} Line Item
                {rows.length !== 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2 leading-5">
              Verify rates, HSN, and applicable GST rates for incoming items
              against received consignment vouchers.
            </p>
          </div>

          {/* Table wrapper */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-262.5 text-sm">
              <thead>
                <tr className="bg-[#F9FAFC] text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 sm:px-4 py-3 min-w-45">
                    Item Description
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 min-w-30">
                    Unit
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-20">
                    Qty
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-24">
                    Rate (₹)
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-28">
                    HSN/SAC
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-20">
                    CGST (%)
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-20">
                    SGST (%)
                  </th>

                  <th className="text-left px-3 sm:px-4 py-3 w-20">
                    CESS (%)
                  </th>

                  <th className="text-right px-3 sm:px-4 py-3 w-28">
                    Amount
                  </th>

                  <th className="text-center px-3 sm:px-4 py-3 w-16">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center text-gray-400 py-10 px-4"
                    >
                      No line items — go back and select at least one GRN.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.key}
                      className="border-t border-[#E7EAF0]"
                    >
                      {/* Item */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <div className="font-medium text-[#101828] wrap-break-word">
                          {r.itemName}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-[#084E92] text-[10px] font-semibold">
                            ADDED
                          </span>

                          <Pencil size={11} className="text-gray-400" />
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <Select
                          value={r.unitName}
                          onValueChange={(value) =>
                            updateRow(r.key, 'unitName', value)
                          }
                        >
                          <SelectTrigger className="h-9 w-28 border-[#E7EAF0] rounded-lg text-sm">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value={r.unitName}>
                              {r.unitName}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Qty */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={r.qty}
                          onChange={(e) =>
                            updateRow(r.key, 'qty', e.target.value)
                          }
                          className="w-16 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* Rate */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={r.rate}
                          onChange={(e) =>
                            updateRow(r.key, 'rate', e.target.value)
                          }
                          className="w-20 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* HSN */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          value={r.hsn}
                          onChange={(e) =>
                            updateRow(r.key, 'hsn', e.target.value)
                          }
                          placeholder="HSN"
                          className="w-24 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* CGST */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={r.cgst}
                          onChange={(e) =>
                            updateRow(r.key, 'cgst', e.target.value)
                          }
                          className="w-16 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* SGST */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={r.sgst}
                          onChange={(e) =>
                            updateRow(r.key, 'sgst', e.target.value)
                          }
                          className="w-16 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* CESS */}
                      <td className="px-3 sm:px-4 py-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={r.cess}
                          onChange={(e) =>
                            updateRow(r.key, 'cess', e.target.value)
                          }
                          className="w-16 h-9 px-2 rounded-lg border border-[#E7EAF0] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                        />
                      </td>

                      {/* Amount */}
                      <td className="px-3 sm:px-4 py-3 align-top text-right font-semibold text-[#101828] whitespace-nowrap">
                        {formatCurrency(rowAmount(r))}
                      </td>

                      {/* Action */}
                      <td className="px-3 sm:px-4 py-3 align-top text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="text-gray-400 hover:text-red-500 transition p-1"
                          title="Remove line item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile table hint */}
          {rows.length > 0 && (
            <div className="block sm:hidden px-4 py-2.5 border-t border-[#E7EAF0] bg-[#F9FAFC] text-xs text-gray-500">
              Swipe left or right to view all item columns.
            </div>
          )}
        </div>

        {/* Tax breakdown + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tax Breakdown */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E7EAF0] p-4 sm:p-6">
            <div className="flex items-center gap-1.5 mb-4">
              <Info size={14} className="text-gray-400 shrink-0" />

              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Tax Breakdown (Intra-State CGST + SGST)
              </h3>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>Taxable Amount:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.taxable)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>CGST Amount:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.cgstAmt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>SGST Amount:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.sgstAmt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>CESS Amount:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.cessAmt)}
                </span>
              </div>

              <div className="border-t border-[#E7EAF0] pt-2.5 flex items-center justify-between gap-4 font-bold text-[#101828]">
                <span>Total Tax (GST + CESS):</span>

                <span className="whitespace-nowrap">
                  {formatCurrency(totals.totalTax)}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E7EAF0] p-4 sm:p-6 flex flex-col justify-between">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>Sub Total (Taxable):</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.taxable)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>Total Tax:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {formatCurrency(totals.totalTax)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-gray-600">
                <span>Round Off:</span>

                <span className="font-medium text-[#101828] whitespace-nowrap">
                  {totals.roundOff >= 0 ? '+' : ''}
                  {totals.roundOff.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#E7EAF0] mt-4 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-bold text-[#101828]">
                NET AMOUNT:
              </span>

              <span className="text-xl sm:text-2xl font-bold text-[#084E92]">
                {formatCurrency(totals.netAmount)}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Amount In Words
              </div>

              <div className="text-sm italic text-[#084E92] mt-0.5 wrap-break-word leading-5">
                {numberToWords(totals.netAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E7EAF0] px-3 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={handleCancel}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#E7EAF0] bg-white text-sm font-semibold text-[#101828] hover:bg-gray-50 transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition"
        >
          <CheckCircle2 size={16} />
          Generate Invoice
        </button>
      </div>
    </Container>
  );
};

export default GenerateGrnInvoice;