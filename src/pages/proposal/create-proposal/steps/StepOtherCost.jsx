import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Edit2,
} from 'lucide-react';
import { AddCostlineModal } from '../modals/AddCostlineModal';
import { getAllProposalCostTypes, deleteOtherCost } from '@/services/apiServices';
import { extractArray } from '../types';

export const StepOtherCost = ({
  data,
  basicDetails = {},
  proposalId = null,
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

  const [costTypes, setCostTypes] = useState([]);
  const [costTypesLoading, setCostTypesLoading] = useState(false);

  // Modals state
  const [isAddCostlineOpen, setIsAddCostlineOpen] = useState(false);
  const [editingCostline, setEditingCostline] = useState(null);

  const costLines = data || [];

  // Fetch dynamic cost types from backend master
  useEffect(() => {
    const fetchCostTypes = async () => {
      setCostTypesLoading(true);
      try {
        const res = await getAllProposalCostTypes();
        const list = extractArray(res);
        setCostTypes(list);
      } catch (err) {
        console.error('Failed to load proposal cost types:', err);
      } finally {
        setCostTypesLoading(false);
      }
    };

    fetchCostTypes();
  }, []);

  // Handle adding costline
  const handleAddCostline = (newLine) => {
    onChange([...costLines, newLine]);
    setIsAddCostlineOpen(false);
    setEditingCostline(null);
  };

  // Handle updating costline
  const handleUpdateCostline = (updatedLine) => {
    const updated = costLines.map((c) => (c.id === updatedLine.id ? updatedLine : c));
    onChange(updated);
    setIsAddCostlineOpen(false);
    setEditingCostline(null);
  };

  // Open edit modal for costline
  const handleEditCostline = (row) => {
    setEditingCostline(row);
    setIsAddCostlineOpen(true);
  };

  // Toggle Client responsibility
  const handleClientToggle = (id) => {
    const row = costLines.find((c) => c.id === id);
    if (!row) return;

    if (row.isClient) {
      // Turning off Client -> turning ON Service Provider, open main costline modal with fields set
      const qty = Number(row.quantity === '' || row.quantity === undefined ? 1 : row.quantity) || 1;
      const pr = Number(row.price || 0);
      const computedCost = pr > 0 ? Number((qty * pr).toFixed(2)) : (Number(row.totalCost) || 0);

      setEditingCostline({
        ...row,
        isClient: false,
        isServiceProvider: true,
        responsibility: 'SERVICE_PROVIDER',
        totalCost: computedCost,
        actualCost: computedCost,
        serviceProviderCost: computedCost,
      });
      setIsAddCostlineOpen(true);
    } else {
      // Turning on Client -> turns OFF Service Provider
      const updated = costLines.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          isClient: true,
          isServiceProvider: false,
          responsibility: 'CLIENT',
          totalCost: 0,
          serviceProviderCost: 0,
        };
      });
      onChange(updated);
    }
  };

  // Toggle Service Provider: If turning ON, open main costline modal with fields set
  const handleServiceProviderToggle = (row) => {
    if (!row.isServiceProvider) {
      const qty = Number(row.quantity === '' || row.quantity === undefined ? 1 : row.quantity) || 1;
      const pr = Number(row.price || 0);
      const computedCost = pr > 0 ? Number((qty * pr).toFixed(2)) : (Number(row.totalCost) || 0);

      setEditingCostline({
        ...row,
        isClient: false,
        isServiceProvider: true,
        responsibility: 'SERVICE_PROVIDER',
        totalCost: computedCost,
        actualCost: computedCost,
        serviceProviderCost: computedCost,
      });
      setIsAddCostlineOpen(true);
    } else {
      const updated = costLines.map((c) => {
        if (c.id !== row.id) return c;
        return {
          ...c,
          isServiceProvider: false,
          isClient: true,
          responsibility: 'CLIENT',
          totalCost: 0,
          serviceProviderCost: 0,
        };
      });
      onChange(updated);
    }
  };

  // Handle direct text/number input change in table
  const handleFieldChange = (id, field, value) => {
    const updated = costLines.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, [field]: value };
      if (field === 'costType') {
        const found = costTypes.find((ct) => (ct.costName || ct.name) === value);
        if (found?.id) next.costTypeId = Number(found.id);
      }
      if (field === 'totalCost') {
        next.serviceProviderCost = value;
        next.price = value;
      }
      return next;
    });
    onChange(updated);
  };


  // Delete costline
  const handleDeleteCostline = async (id) => {
    const rowToDelete = costLines.find((c) => c.id === id);
    if (rowToDelete && proposalId) {
      const dbId =
        typeof rowToDelete.id === 'number' && rowToDelete.id > 0 && rowToDelete.id < 1000000000000
          ? rowToDelete.id
          : rowToDelete.proposalOtherCostId;
      if (dbId) {
        try {
          await deleteOtherCost(dbId);
        } catch (e) {
          console.warn('Could not delete other cost from DB:', e);
        }
      }
    }
    onChange(costLines.filter((c) => c.id !== id));
  };

  const totalOtherCost = costLines.reduce((sum, c) => {
    const isClient = c.responsibility === 'CLIENT' || (c.isClient && !c.isServiceProvider);
    if (isClient) return sum;
    return sum + (Number(c.totalCost) || 0);
  }, 0);

  const clientPct = Number(clientPercentage ?? 0) || 0;
  const clientDeduction = Number(((totalOtherCost * clientPct) / 100).toFixed(2));
  const netAllocatedCost = Math.max(0, Number((totalOtherCost - clientDeduction).toFixed(2)));

  const handleClientPctChange = (val) => {
    const rawVal = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    onClientPercentageChange?.(rawVal);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Title on left, Action Button on right */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Overhead Expenses</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingCostline(null);
              setIsAddCostlineOpen(true);
            }}
            className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Add Costline
          </button>
        </div>
      </div>

      {/* 2. Other Cost Table Card */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5 whitespace-nowrap">Cost Type</th>
                <th className="py-3 px-3 whitespace-nowrap">Cost Factor</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Client</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Service Provider</th>
                <th className="py-3 px-3 whitespace-nowrap">Remarks</th>
                <th className="py-3 px-3 whitespace-nowrap">Total Cost (Per Month)</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {costLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="font-semibold text-gray-700">No overhead cost lines added yet</span>
                      <p className="text-[11px] text-gray-400 max-w-sm">
                        Click &ldquo;Add Costline&rdquo; above to dynamically add utility, transportation, equipment or overhead expenses.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                costLines.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition">
                    {/* Cost Type (Dynamic) */}
                    <td className="py-3 px-3.5">
                      <select
                        value={row.costType}
                        onChange={(e) => handleFieldChange(row.id, 'costType', e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#084E92]"
                      >
                        {costTypes.length === 0 && row.costType && (
                          <option value={row.costType}>{row.costType}</option>
                        )}
                        {costTypes.map((ct) => {
                          const name = ct.costName || ct.name;
                          return (
                            <option key={ct.id || name} value={name}>
                              {name}
                            </option>
                          );
                        })}
                        {row.costType &&
                          !costTypes.some((ct) => (ct.costName || ct.name) === row.costType) && (
                            <option value={row.costType}>{row.costType}</option>
                          )}
                      </select>
                    </td>

                    {/* Cost Factor */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.costFactor || ''}
                        onChange={(e) => handleFieldChange(row.id, 'costFactor', e.target.value)}
                        placeholder="Cost factor..."
                        className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-[#084E92]"
                      />
                    </td>

                    {/* Client Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleClientToggle(row.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${row.isClient ? 'bg-[#084E92]' : 'bg-gray-200'
                          }`}
                        title={row.isClient ? 'Disable Client allocation' : 'Enable Client allocation'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${row.isClient ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </td>

                    {/* Service Provider Toggle */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleServiceProviderToggle(row)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            row.isServiceProvider ? 'bg-[#084E92]' : 'bg-gray-200'
                          }`}
                          title={
                            row.isServiceProvider
                              ? 'Disable Service Provider allocation'
                              : 'Enable Service Provider allocation & configure'
                          }
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              row.isServiceProvider ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.remarks || ''}
                        onChange={(e) => handleFieldChange(row.id, 'remarks', e.target.value)}
                        placeholder="Remarks..."
                        className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-[#084E92]"
                      />
                    </td>

                    {/* Total Cost (Non-editable, '-' when client is on) */}
                    <td className="py-3 px-3">
                      {row.isClient || row.responsibility === 'CLIENT' ? (
                        <span className="text-gray-400 font-bold text-xs pl-2">-</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-900">
                          ₹
                          {Number(row.totalCost || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleEditCostline(row)}
                          className="p-1.5 text-gray-400 hover:text-[#084E92] rounded-lg hover:bg-blue-50 transition cursor-pointer"
                          title="Edit costline"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCostline(row.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Delete costline"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {costLines.length > 0 && (
              <tfoot>
                {/* 1. Gross Total */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                  <td className="py-3 px-3.5" colSpan={5}>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-gray-700">GROSS TOTAL</span>
                      <span className="px-2 py-0.5 bg-[#084E92] text-white text-[10px] font-bold rounded-full">
                        {costLines.length} Items
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-gray-900 text-sm">
                    ₹{totalOtherCost.toLocaleString('en-IN')}.00
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>

                {/* 2. Client Contribution / Share (%) */}
                <tr className="bg-blue-50/40 border-t border-gray-200 text-xs font-semibold">
                  <td colSpan={5} className="py-2.5 px-3.5">
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
                  <td className="py-2.5 px-3 text-xs font-bold text-emerald-700">
                    {clientPct > 0 ? (
                      <div>
                        <span>- ₹{clientDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 font-normal">₹0.00 (0%)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3"></td>
                </tr>

                {/* 3. Net Allocated Total */}
                <tr className="bg-blue-50/80 border-t border-blue-200 font-bold text-xs">
                  <td colSpan={5} className="py-3 px-3.5">
                    <span className="text-gray-900 uppercase tracking-wide text-[11px]">
                      Net Allocated Overhead Cost (To Proposal Allocation)
                    </span>
                  </td>
                  <td className="py-3 px-3 font-extrabold text-[#084E92] text-sm">
                    ₹{netAllocatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3"></td>
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSent ? 'Save' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={onSaveContinue}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add / Edit Costline Modal */}
      <AddCostlineModal
        isOpen={isAddCostlineOpen}
        onClose={() => {
          setIsAddCostlineOpen(false);
          setEditingCostline(null);
        }}
        onAddCostline={handleAddCostline}
        onUpdateCostline={handleUpdateCostline}
        editingLine={editingCostline}
        costTypes={costTypes}
        basicDetails={basicDetails}
      />
    </div>
  );
};

export default StepOtherCost;
