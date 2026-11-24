import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddRoleModal } from '../modals/AddRoleModal';
import {
  getAllStates,
  getManpowerByProposalId,
  deleteCommercialManpower,
} from '@/services/apiServices';
import { extractArray } from '../types';

const cleanStateName = (name) => {
  if (!name) return '';
  return name.replace(/\s*\((Zone\s*[A-Za-z0-9]+)\)/gi, '').trim();
};

const mapServerManpowerItem = (item, idx) => {
  const roleName =
    item.remarks ||
    item.manpowerName ||
    item.name ||
    item.roleName ||
    `Role ${idx + 1}`;
  const words = roleName.trim().split(/\s+/);
  const initials =
    words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : roleName.substring(0, 2).toUpperCase() || 'RO';
  const headcount = Number(item.headCount ?? item.headcount ?? 1);
  const basicSalary = Number(item.monthlySalary ?? item.basicSalary ?? 0);
  const totalCost = Number((headcount * basicSalary).toFixed(2));
  const dailySalary = Number((basicSalary / 26).toFixed(2));

  return {
    id: item.id || idx + 1,
    proposalManpowerId: item.id,
    isSavedInDb: true,
    manpowerMasterId: item.manpowerId || item.id,
    roleName,
    initials,
    headcount,
    basicSalary,
    dailySalary,
    totalCost,
    overtimeAllowance: item.overtimeAllowance || 0,
    proposalShiftId: item.proposalShiftId || 0,
    remarks: item.remarks || roleName,
  };
};

export const StepManpower = ({
  data = {},
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

  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [states, setStates] = useState([]);
  const effectiveStateId = basicDetails?.stateId
    ? String(basicDetails.stateId)
    : (data?.stateId ? String(data.stateId) : '');
  const [selectedStateId, setSelectedStateId] = useState(effectiveStateId);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState(null);

  // 1. Fetch States on mount (using cached states if available)
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await getAllStates();
        const list = extractArray(res);
        if (list.length > 0) {
          setStates(list);
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    fetchStates();
  }, []);

  // 2. Fetch proposal manpower on mount ONLY if not already allocated in data.roles
  const fetchAndSetProposalManpower = async (pId) => {
    if (!pId) return;
    setLoadingRoles(true);
    try {
      const res = await getManpowerByProposalId(pId);
      const list = extractArray(res);
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map(mapServerManpowerItem);
        onChange?.({ roles: mapped });
      }
    } catch (err) {
      console.warn('Failed to load proposal manpower from server:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (proposalId && (!data?.roles || data.roles.length === 0)) {
      fetchAndSetProposalManpower(proposalId);
    }
  }, [proposalId]);

  // Sync stateId if basicDetails or data changes
  useEffect(() => {
    const propStateId = basicDetails?.stateId
      ? String(basicDetails.stateId)
      : (data?.stateId ? String(data.stateId) : '');
    if (propStateId) {
      setSelectedStateId(propStateId);
      if (String(data?.stateId) !== propStateId) {
        onChange?.({ stateId: propStateId });
      }
    }
  }, [basicDetails?.stateId, data?.stateId]);

  // Update role headcount
  const handleHeadcountChange = async (roleId, count) => {
    const rawVal = count === '' ? '' : Math.max(0, parseInt(count, 10) || 0);
    const numVal = Number(rawVal) || 0;
    const updated = (data?.roles || []).map((r) => {
      if (r.id !== roleId) return r;
      const totalCost = Number((numVal * Number(r.basicSalary || 0)).toFixed(2));
      return { ...r, headcount: rawVal, totalCost };
    });
    onChange?.({ roles: updated });
  };

  // Add new role (purely local state until saved outside)
  const handleAddRole = (newRole) => {
    const currentRoles = data?.roles || [];
    const existingIndex = currentRoles.findIndex(
      (r) =>
        (newRole.manpowerMasterId && r.manpowerMasterId === newRole.manpowerMasterId) ||
        (r.roleName && newRole.roleName && r.roleName.trim().toLowerCase() === newRole.roleName.trim().toLowerCase())
    );

    let updatedRoles;
    if (existingIndex >= 0) {
      updatedRoles = currentRoles.map((r, idx) =>
        idx === existingIndex
          ? {
            ...r,
            headcount: Number(r.headcount || 0) + Number(newRole.headcount || 1),
            totalCost: Number(
              ((Number(r.headcount || 0) + Number(newRole.headcount || 1)) * Number(r.basicSalary || 0)).toFixed(2)
            ),
          }
          : r
      );
      toast.info('Updated existing role headcount.');
    } else {
      updatedRoles = [...currentRoles, newRole];
      toast.success('Role added.');
    }

    // Immediately update local state
    onChange?.({ roles: updatedRoles });
  };

  // Delete role calling /api/proposal-commercial/manpower/delete/{manpowerId}
  const handleDeleteRole = async (roleId) => {
    setDeletingRoleId(roleId);
    try {
      const targetRole = (data?.roles || []).find((r) => r.id === roleId);
      const updated = (data?.roles || []).filter((r) => r.id !== roleId);
      onChange?.({ roles: updated });

      const targetManpowerId =
        targetRole?.proposalManpowerId ||
        (typeof targetRole?.id === 'number' && targetRole?.isSavedInDb ? targetRole.id : null);

      if (targetManpowerId) {
        try {
          await deleteCommercialManpower(targetManpowerId);
          toast.success('Manpower deleted successfully.');
        } catch (err) {
          console.warn('deleteCommercialManpower primary attempt error:', err);
        }
      } else {
        toast.success('Role removed.');
      }
    } finally {
      setDeletingRoleId(null);
    }
  };

  const roles = data?.roles || [];
  const totalHeadcount = roles.reduce((sum, r) => sum + (Number(r.headcount) || 0), 0);
  const totalBasicSalary = roles.reduce((sum, r) => sum + (Number(r.basicSalary) || 0), 0);
  const grandTotalCost = roles.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);

  const clientPct = Number(clientPercentage ?? data?.clientPercentage ?? 0) || 0;
  const clientDeduction = Number(((grandTotalCost * clientPct) / 100).toFixed(2));
  const netTotalCost = Math.max(0, Number((grandTotalCost - clientDeduction).toFixed(2)));

  const handleClientPctChange = (val) => {
    const rawVal = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    onClientPercentageChange?.(rawVal);
    onChange?.({ clientPercentage: rawVal });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Row with Small State Selector & Add Role */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Manpower Planning</h2>
          </div>
          {/* <p className="text-xs text-gray-500">
            Configure workforce headcount, wage structures, and role payroll allocation
          </p> */}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddRoleOpen(true)}
            className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Add Role
          </button>
        </div>
      </div>

      {/* 2. Allocated Workforce Cadre Card */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden shadow-xs">
        {/* Workforce Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Headcount</th>
                <th className="py-3 px-4">Basic Salary</th>
                <th className="py-3 px-4">Total Salary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loadingRoles ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-[#084E92]" />
                      <span>Loading proposal manpower...</span>
                    </div>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Users size={18} />
                      </div>
                      <span className="font-semibold text-gray-600">No workforce roles added yet</span>
                      <span className="text-[11px] text-gray-400">
                        Click &ldquo;+ Add Role&rdquo; above to select and allocate cadre roles for this proposal.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-gray-900 text-xs">{r.roleName}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={r.headcount}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleHeadcountChange(r.id, e.target.value)}
                          placeholder="0"
                          className="w-16 h-8 px-2 rounded-lg border border-gray-200 text-xs text-center font-bold text-gray-900 focus:outline-none focus:border-[#084E92] bg-white inline-block"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">
                          ₹{Number(r.basicSalary || 0).toLocaleString('en-IN')}.00
                        </div>
                        <div className="text-[11px] text-gray-400">
                          ₹{Number(r.dailySalary || (Number(r.basicSalary || 0) / 26)).toFixed(2)}/day
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#084E92] text-sm">
                          ₹{Number(r.totalCost || 0).toLocaleString('en-IN')}.00
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(r.id)}
                          disabled={deletingRoleId === r.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                          title="Delete role"
                        >
                          {deletingRoleId === r.id ? (
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
            {roles.length > 0 && (
              <tfoot>
                {/* 1. Gross Total */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-gray-700">GROSS TOTAL</span>
                      <span className="px-2 py-0.5 bg-[#084E92] text-white text-[10px] font-bold rounded-full">
                        {roles.length} Roles
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-900">
                    {totalHeadcount}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900">
                    ₹{totalBasicSalary.toLocaleString('en-IN')}.00
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900 text-sm">
                    ₹{grandTotalCost.toLocaleString('en-IN')}.00
                  </td>
                  <td className="py-3 px-4"></td>
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
                          value={clientPercentage === '' ? '' : (clientPercentage ?? data?.clientPercentage ?? '')}
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
                  <td className="py-2.5 px-4"></td>
                </tr>

                {/* 3. Net Allocated Total */}
                <tr className="bg-blue-50/80 border-t border-blue-200 font-bold text-xs">
                  <td colSpan={3} className="py-3 px-4">
                    <span className="text-gray-900 uppercase tracking-wide text-[11px]">
                      Net Allocated Manpower Cost (To Proposal Allocation)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-extrabold text-[#084E92] text-sm">
                    ₹{netTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4"></td>
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

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={isAddRoleOpen}
        onClose={() => setIsAddRoleOpen(false)}
        onAddRole={handleAddRole}
        stateId={selectedStateId || basicDetails?.stateId || data?.stateId || ''}
        stateName={
          basicDetails?.stateName ||
          states.find((s) => String(s.id) === String(selectedStateId || basicDetails?.stateId || data?.stateId))?.name ||
          states.find((s) => String(s.id) === String(selectedStateId || basicDetails?.stateId || data?.stateId))?.stateName ||
          ''
        }
        states={states}
      />
    </div>
  );
};

export default StepManpower;
