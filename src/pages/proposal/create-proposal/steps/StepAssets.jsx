import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddAssetModal } from '../modals/AddAssetModal';
import {
  getAssetsByProposalId,
  deleteCommercialAsset,
} from '@/services/apiServices';
import { extractArray } from '../types';

const mapServerAssetItem = (item, idx) => {
  const qty = Number(item.quantity ?? 1);
  const pr = Number(item.price ?? 0);
  const total = Number(item.totalCost ?? (qty * pr));

  return {
    id: item.id || idx + 1,
    proposalAssetId: item.id,
    isSavedInDb: true,
    assetId: Number(item.assetId || 0),
    assetCode: item.assetCode || `AST-${item.assetId}`,
    assetName:
      item.assetName ||
      item.itemName ||
      item.remarks ||
      `Asset #${item.assetId}`,
    categoryName: item.categoryName || '',
    quantity: qty,
    price: pr,
    totalCost: total,
    remarks: item.remarks || '',
    proposalId: Number(item.proposalId || 0),
  };
};

export const StepAssets = ({
  data = [],
  proposalId = null,
  basicDetails = {},
  clientPercentage = 0,
  onClientPercentageChange,
  onChange,
  onSaveDraft,
  onSaveContinue,
  onNext,
  onPrevious,
  saving = false,
  isSentForApproval = false,
}) => {
  const statusStr = String(basicDetails?.status || '').toUpperCase().trim();
  const isSent = isSentForApproval || (Boolean(statusStr) && statusStr !== 'DRAFT');

  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [loadingProposalAssets, setLoadingProposalAssets] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState(null);

  const assetsList = Array.isArray(data) ? data : [];

  // Fetch proposal assets if proposalId is available and data is empty
  useEffect(() => {
    if (!proposalId || Number(proposalId) <= 0 || (Array.isArray(data) && data.length > 0)) return;
    let isMounted = true;

    const fetchProposalAssets = async () => {
      setLoadingProposalAssets(true);
      try {
        const res = await getAssetsByProposalId(proposalId);
        const list = extractArray(res);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped = list.map(mapServerAssetItem);
          onChange?.(mapped);
        }
      } catch (err) {
        console.warn('Failed to load proposal assets from server:', err);
      } finally {
        if (isMounted) setLoadingProposalAssets(false);
      }
    };

    fetchProposalAssets();
    return () => {
      isMounted = false;
    };
  }, [proposalId]);

  // Handle direct inline quantity change
  const handleQuantityChange = (rowId, val) => {
    const rawVal = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    const numVal = Number(rawVal) || 0;
    const updated = assetsList.map((row) => {
      if (row.id !== rowId) return row;
      const unitPrice = Number(row.price) || 0;
      const totalCost = Number((numVal * unitPrice).toFixed(2));
      return { ...row, quantity: rawVal, totalCost };
    });
    onChange?.(updated);
  };

  // Handle direct inline price change
  const handlePriceChange = (rowId, val) => {
    const rawVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    const numVal = Number(rawVal) || 0;
    const updated = assetsList.map((row) => {
      if (row.id !== rowId) return row;
      const qty = Number(row.quantity) || 0;
      const totalCost = Number((qty * numVal).toFixed(2));
      return { ...row, price: val, totalCost };
    });
    onChange?.(updated);
  };

  // Handle direct inline remarks change
  const handleRemarksChange = (rowId, val) => {
    const updated = assetsList.map((row) => {
      if (row.id !== rowId) return row;
      return { ...row, remarks: val };
    });
    onChange?.(updated);
  };

  // Add new asset from modal (purely local state until saved outside)
  const handleAddAsset = (newAsset) => {
    const currentList = [...assetsList];
    const existingIndex = currentList.findIndex(
      (a) => Number(a.assetId) === Number(newAsset.assetId)
    );

    let updatedList;
    if (existingIndex >= 0) {
      updatedList = currentList.map((item, idx) => {
        if (idx !== existingIndex) return item;
        const newQty = (Number(item.quantity) || 0) + (Number(newAsset.quantity) || 1);
        const unitPrice = Number(newAsset.price ?? item.price ?? 0);
        return {
          ...item,
          quantity: newQty,
          price: unitPrice,
          totalCost: Number((newQty * unitPrice).toFixed(2)),
          remarks: newAsset.remarks || item.remarks,
        };
      });
      toast.info('Updated existing asset quantity.');
    } else {
      const newEntry = {
        id: Date.now(),
        isSavedInDb: false,
        ...newAsset,
        proposalId: Number(proposalId || 0),
      };
      updatedList = [...currentList, newEntry];
      toast.success('Asset added.');
    }

    onChange?.(updatedList);
  };

  // Delete an asset row
  const handleDeleteAsset = async (rowId) => {
    setDeletingAssetId(rowId);
    try {
      const assetToDelete = assetsList.find((a) => a.id === rowId);
      const updatedList = assetsList.filter((a) => a.id !== rowId);
      onChange?.(updatedList);

      const targetAssetId =
        assetToDelete?.proposalAssetId ||
        (assetToDelete?.isSavedInDb && typeof assetToDelete.id === 'number' ? assetToDelete.id : null);

      if (targetAssetId) {
        try {
          await deleteCommercialAsset(targetAssetId);
          toast.success('Asset removed successfully.');
        } catch (err) {
          console.warn('Backend delete asset error:', err);
        }
      } else {
        toast.success('Asset removed.');
      }
    } finally {
      setDeletingAssetId(null);
    }
  };

  // Computed summary totals
  const summaryTotals = useMemo(() => {
    let totalQty = 0;
    let totalMonthlyAmount = 0;

    assetsList.forEach((a) => {
      const q = Number(a.quantity) || 0;
      const p = Number(a.price) || 0;
      const t = Number(a.totalCost ?? (q * p)) || 0;
      totalQty += q;
      totalMonthlyAmount += t;
    });

    return {
      count: assetsList.length,
      totalQuantity: totalQty,
      totalMonthlyCost: totalMonthlyAmount,
    };
  }, [assetsList]);

  const clientPct = Number(clientPercentage ?? 0) || 0;
  const clientDeduction = Number(((summaryTotals.totalMonthlyCost * clientPct) / 100).toFixed(2));
  const netAllocatedCost = Math.max(0, Number((summaryTotals.totalMonthlyCost - clientDeduction).toFixed(2)));

  const handleClientPctChange = (val) => {
    const rawVal = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    onClientPercentageChange?.(rawVal);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Row with Add Asset */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Assets & Equipment Planning</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddAssetModalOpen(true)}
            className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Add Asset
          </button>
        </div>
      </div>

      {/* 2. Allocated Assets Card */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4">Price / Month</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loadingProposalAssets ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-[#084E92]" />
                      <span>Loading proposal assets...</span>
                    </div>
                  </td>
                </tr>
              ) : assetsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Box size={18} />
                      </div>
                      <span className="font-semibold text-gray-600">No assets allocated yet</span>
                      <span className="text-[11px] text-gray-400">
                        Click &ldquo;+ Add Asset&rdquo; above to select and allocate assets for this proposal.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                assetsList.map((asset) => {
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/50 transition">
                      {/* Asset Item info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-gray-900 text-xs">
                              {asset.assetName || `Asset #${asset.assetId}`}
                            </div>
                            {(asset.assetCode || asset.categoryName) && (
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {asset.assetCode}
                                {asset.categoryName ? ` • ${asset.categoryName}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity input */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={asset.quantity}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleQuantityChange(asset.id, e.target.value)}
                          placeholder="0"
                          className="w-16 h-8 px-2 rounded-lg border border-gray-200 text-xs text-center font-bold text-gray-900 focus:outline-none focus:border-[#084E92] bg-white inline-block"
                        />
                      </td>

                      {/* Price / Month */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={asset.price}
                            onKeyDown={(e) => {
                              if (['-', '+', 'e', 'E'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => handlePriceChange(asset.id, e.target.value)}
                            placeholder="0"
                            className="w-20 h-8 px-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#084E92] bg-white"
                          />
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#084E92] text-sm">
                          ₹{Number(asset.totalCost || 0).toLocaleString('en-IN')}.00
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={asset.remarks || ''}
                          onChange={(e) => handleRemarksChange(asset.id, e.target.value)}
                          placeholder="Remarks..."
                          className="w-full max-w-xs h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#084E92] bg-white placeholder:text-gray-400"
                        />
                      </td>

                      {/* Delete action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset.id)}
                          disabled={deletingAssetId === asset.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                          title="Delete asset"
                        >
                          {deletingAssetId === asset.id ? (
                            <Loader2 size={14} className="animate-spin text-red-500" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {assetsList.length > 0 && (
              <tfoot>
                {/* 1. Gross Total */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-gray-700">GROSS TOTAL</span>
                      <span className="px-2 py-0.5 bg-[#084E92] text-white text-[10px] font-bold rounded-full">
                        {assetsList.length} Assets
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-900">
                    {summaryTotals.totalQuantity}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-400">—</td>
                  <td className="py-3 px-4 font-bold text-gray-900 text-sm">
                    ₹{summaryTotals.totalMonthlyCost.toLocaleString('en-IN')}.00
                  </td>
                  <td className="py-3 px-4" colSpan={2}></td>
                </tr>

                {/* 2. Client Contribution / Share (%) */}
                <tr className="bg-blue-50/40 border-t border-gray-200 text-xs font-semibold">
                  <td colSpan={3} className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-gray-700">Client Contribution:</span>
                      <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg px-2 py-0.5 focus-within:border-[#084E92] focus-within:ring-1 focus-within:ring-[#084E92] shadow-2xs">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={clientPercentage === '' ? '' : (clientPercentage ?? '')}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => handleClientPctChange(e.target.value)}
                          placeholder="0"
                          className="w-14 h-7 text-xs font-bold text-gray-900 text-right focus:outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500 ml-1">%</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs font-bold text-emerald-700">
                    {clientPct > 0 ? (
                      <div>
                        <span>- ₹{clientDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 font-normal">₹0.00 (0%)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4" colSpan={2}></td>
                </tr>

                {/* 3. Net Allocated Total */}
                <tr className="bg-blue-50/80 border-t border-blue-200 font-bold text-xs">
                  <td colSpan={3} className="py-3 px-4">
                    <span className="text-gray-900 uppercase tracking-wide text-[11px]">
                      Net Allocated Asset Cost (To Proposal Allocation)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-extrabold text-[#084E92] text-sm">
                    ₹{netAllocatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          Previous
        </button>

        <div className="flex items-center gap-3">
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer shadow-2xs"
              title="Go to next step without saving"
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSent ? 'Save' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={onSaveContinue}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save & Continue
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddAssetModalOpen}
        onClose={() => setIsAddAssetModalOpen(false)}
        onAddAsset={handleAddAsset}
      />
    </div>
  );
};

export default StepAssets;
