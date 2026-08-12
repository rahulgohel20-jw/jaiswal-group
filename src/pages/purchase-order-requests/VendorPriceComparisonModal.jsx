import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, Info, TrendingDown, X } from 'lucide-react';

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const VendorPriceComparisonModal = ({
  open,
  onClose,
  item,
  quotations = [],
  onSelectPrice,
}) => {
  const [sortOrder, setSortOrder] = useState('desc'); // desc = Highest to Lowest
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  // reset local state whenever a different item is opened
  useEffect(() => {
    if (open) {
      setSortOrder('desc');
      setSelectedVendorId(null);
    }
  }, [open, item?.id]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // lowest price is computed from the FULL list, independent of sorting
  const lowestPrice = useMemo(() => {
    if (!quotations.length) return null;
    return Math.min(...quotations.map((q) => Number(q.itemPrice) || Infinity));
  }, [quotations]);

  const sortedQuotations = useMemo(() => {
    const list = [...quotations];
    list.sort((a, b) =>
      sortOrder === 'desc'
        ? Number(b.itemPrice) - Number(a.itemPrice)
        : Number(a.itemPrice) - Number(b.itemPrice),
    );
    return list;
  }, [quotations, sortOrder]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">
              Vendor Price Comparison
            </h2>
            <p className="text-sm text-[#737781] mt-1">
              Item:{' '}
              <span className="font-medium text-[#475569]">
                {item?.itemName || '-'}
              </span>
              {item?.unit ? ` (${item.unit})` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info + Sort bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Info size={16} className="text-[#94A3B8]" />
            <span>
              Reviewing {quotations.length} vendor bid
              {quotations.length === 1 ? '' : 's'} for procurement.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#64748B]">Sort by:</span>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 pl-3 pr-9 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E293B] appearance-none outline-none cursor-pointer focus:border-[#0B5CAD]"
              >
                <option value="desc">Price: Highest to Lowest</option>
                <option value="asc">Price: Lowest to Highest</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide px-6 py-3">
                  Vendor Name
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Item Price
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Quantity
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Total Amount
                </th>
                <th className="text-center text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Status
                </th>
                <th className="text-center text-xs font-semibold text-[#64748B] uppercase tracking-wide px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedQuotations.map((q) => {
                const isLowest = Number(q.itemPrice) === lowestPrice;
                const isSelected = selectedVendorId === q.id;
                const totalAmount =
                  q.totalAmount ?? Number(q.itemPrice) * Number(q.quantity);

                return (
                  <tr
                    key={q.id}
                    className={`border-b border-[#F1F5F9] transition-colors ${
                      isLowest
                        ? 'bg-[#ECFDF5] hover:bg-[#DCFCE7]'
                        : 'hover:bg-[#F8FAFC]'
                    } ${isSelected ? 'ring-2 ring-inset ring-[#084E92]' : ''}`}
                  >
                    {/* Vendor */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isLowest ? 'bg-[#D1FAE5]' : 'bg-[#EFF6FF]'
                          }`}
                        >
                          <Building2
                            size={16}
                            className={
                              isLowest ? 'text-[#047857]' : 'text-[#0B5CAD]'
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1E293B] truncate">
                            {q.vendorName}
                          </p>
                          {isLowest && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#047857]">
                              <TrendingDown size={11} />
                              Lowest Price
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Item price — lowest gets a different colour */}
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          isLowest ? 'text-[#047857]' : 'text-[#DC2626]'
                        }`}
                      >
                        ₹ {formatINR(q.itemPrice)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right text-sm text-[#475569]">
                      {q.quantity}
                    </td>

                    <td
                      className={`px-4 py-4 text-right text-sm font-bold ${
                        isLowest ? 'text-[#047857]' : 'text-[#0F172A]'
                      }`}
                    >
                      ₹ {formatINR(totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          q.status === 'Map'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVendorId(q.id);
                          onSelectPrice?.(q, item);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors ${
                          isLowest
                            ? 'bg-[#047857] hover:bg-[#036848]'
                            : 'bg-[#084E92] hover:bg-[#063d73]'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select Price'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!sortedQuotations.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Building2
                      size={28}
                      className="mx-auto mb-3 text-[#CBD5E1]"
                    />
                    <p className="text-sm text-[#94A3B8]">
                      No vendor quotations found for this item.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[#E2E8F0] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-[#D1D5DB] rounded-lg text-[#475569] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorPriceComparisonModal;
