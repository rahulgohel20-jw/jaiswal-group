import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Users, MapPin, AlertCircle } from 'lucide-react';
import { getAllStates, getActiveManpowerByState } from '@/services/apiServices';
import ManPowerModal from '@/pages/proposal/manpower-master/ManPowerModal';
import { extractArray } from '../types';

const cleanStateName = (name) => {
  if (!name) return '';
  return name.replace(/\s*\((Zone\s*[A-Za-z0-9]+)\)/gi, '').trim();
};

export const AddRoleModal = ({
  isOpen,
  onClose,
  onAddRole,
  stateId = '',
  stateName = '',
  states: externalStates = [],
}) => {
  const [internalStates, setInternalStates] = useState([]);
  const [masterRoles, setMasterRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [headcount, setHeadcount] = useState('1');
  const [basicSalary, setBasicSalary] = useState(0);
  const [errors, setErrors] = useState({});

  // Resolve states list for display fallback if externalStates is empty
  useEffect(() => {
    if (!isOpen) return;
    if ((!externalStates || externalStates.length === 0) && !stateName) {
      let isSubscribed = true;
      getAllStates()
        .then((res) => {
          if (!isSubscribed) return;
          const list = extractArray(res);
          if (list.length > 0) setInternalStates(list);
        })
        .catch((err) => console.warn('Could not load states for name display:', err));
      return () => {
        isSubscribed = false;
      };
    }
  }, [isOpen, externalStates, stateName]);

  const allStates = externalStates && externalStates.length > 0 ? externalStates : internalStates;
  const resolvedStateName = cleanStateName(
    stateName ||
    allStates.find((st) => String(st.id) === String(stateId))?.name ||
    allStates.find((st) => String(st.id) === String(stateId))?.stateName ||
    ''
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setHeadcount('1');
      setErrors({});
    }
  }, [isOpen]);

  // Fetch roles for the selected state
  const fetchRolesForState = async (targetStateId, selectRoleId = null) => {
    if (!targetStateId) {
      setMasterRoles([]);
      setSelectedRoleId('');
      setBasicSalary(0);
      return;
    }

    setLoadingRoles(true);
    try {
      const res = await getActiveManpowerByState(targetStateId);
      const list = extractArray(res);
      setMasterRoles(list);

      if (list.length > 0) {
        let chosen = null;
        if (selectRoleId) {
          chosen = list.find((m) => String(m.id) === String(selectRoleId));
        }
        if (!chosen) {
          chosen = list[0];
        }
        setSelectedRoleId(String(chosen.id));
        setBasicSalary(Math.max(0, Number(chosen.basicSalary || 0)));
      } else {
        setSelectedRoleId('');
        setBasicSalary(0);
      }
    } catch (err) {
      console.warn('Failed to load manpower master roles:', err);
      setMasterRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchRolesForState(stateId);
  }, [isOpen, stateId]);

  // Handle successful creation of new role in ManPowerModal
  const handleMasterCreated = async () => {
    setIsMasterModalOpen(false);
    if (!stateId) return;

    setLoadingRoles(true);
    try {
      const res = await getActiveManpowerByState(stateId);
      const list = extractArray(res);
      setMasterRoles(list);

      if (list.length > 0) {
        // Select the newly added role with highest id
        const sorted = [...list].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
        const newest = sorted[0];
        setSelectedRoleId(String(newest.id));
        setBasicSalary(Math.max(0, Number(newest.basicSalary || 0)));
        setErrors((prev) => ({ ...prev, role: '' }));
      }
    } catch (err) {
      console.warn('Failed to reload master roles after creation:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  if (!isOpen) return null;

  // Handle role selection change
  const handleRoleChange = (e) => {
    const val = e.target.value;
    setSelectedRoleId(val);
    setErrors((prev) => ({ ...prev, role: '' }));

    const chosen = masterRoles.find((m) => String(m.id) === String(val));
    if (chosen) {
      setBasicSalary(Math.max(0, Number(chosen.basicSalary || 0)));
    } else {
      setBasicSalary(0);
    }
  };

  const count = Math.max(1, parseInt(headcount, 10) || 1);
  const salary = Math.max(0, Number(basicSalary) || 0);
  const daily = Number((salary / 26).toFixed(2));
  const total = Number((count * salary).toFixed(2));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!stateId) {
      setErrors({ role: 'Please select a State in Step 1 (Reference Unit) first.' });
      return;
    }

    const chosen = masterRoles.find((m) => String(m.id) === String(selectedRoleId));
    if (!chosen) {
      setErrors({ role: 'Please select a role from the master list' });
      return;
    }

    const countNum = parseInt(headcount, 10);
    if (isNaN(countNum) || countNum < 1) {
      setErrors({ headcount: 'Headcount must be at least 1' });
      return;
    }

    const salaryNum = Number(basicSalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setErrors({ salary: 'Salary cannot be negative' });
      return;
    }

    const finalRoleName = chosen.name || chosen.roleName || 'Role';
    const masterId = chosen.id;

    const words = finalRoleName.trim().split(/\s+/);
    const initials =
      words.length > 1
        ? (words[0][0] + words[1][0]).toUpperCase()
        : finalRoleName.substring(0, 2).toUpperCase() || 'RO';

    onAddRole({
      id: masterId || Date.now(),
      manpowerMasterId: masterId,
      roleName: finalRoleName,
      initials,
      headcount: countNum,
      basicSalary: salaryNum,
      dailySalary: Number((salaryNum / 26).toFixed(2)),
      totalCost: Number((countNum * salaryNum).toFixed(2)),
      isFromMaster: true,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Add Manpower Role</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Reference State Display (Read-only, chosen in Step 1) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                State
              </label>
              <div className="flex items-center justify-between h-9 px-3 bg-gray-50 border border-[#C3C6D1] rounded-xl">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#084E92] shrink-0" />
                  <span className="text-xs font-bold text-gray-800">
                    {resolvedStateName || (stateId ? `State ID: ${stateId}` : 'No State Selected')}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  Reference Unit
                </span>
              </div>
              {!stateId && (
                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} className="shrink-0" />
                  Please select a State under Reference Unit in Step 1 to load state manpower roles.
                </p>
              )}
            </div>

            {/* Role Dropdown from Manpower Master + '+' button to open master modal */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Role Title <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  {loadingRoles ? (
                    <div className="w-full h-10 px-3 flex items-center gap-2 rounded-xl border border-[#C3C6D1] bg-gray-50 text-xs text-gray-500">
                      <Loader2 size={14} className="animate-spin text-[#084E92]" />
                      <span>Loading roles for {resolvedStateName || 'selected state'}...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedRoleId}
                      onChange={handleRoleChange}
                      disabled={!stateId || masterRoles.length === 0}
                      className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition disabled:bg-gray-50 disabled:text-gray-400 ${
                        errors.role ? 'border-red-500' : 'border-[#C3C6D1]'
                      }`}
                    >
                      <option value="" disabled>
                        {!stateId
                          ? 'Select State in Step 1 first'
                          : masterRoles.length > 0
                          ? 'Select Role from Master'
                          : `No master roles found for ${resolvedStateName || 'this state'}`}
                      </option>
                      {masterRoles.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.name || r.roleName} (₹{Number(r.basicSalary || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMasterModalOpen(true)}
                  disabled={!stateId}
                  title="Add new manpower role in Master"
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-blue-50 text-[#084E92] hover:bg-[#084E92] hover:text-white border border-blue-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                </button>
              </div>
              {errors.role && <p className="text-[11px] text-red-500 mt-1">{errors.role}</p>}
            </div>

            {/* Headcount & Auto-fetched Basic Salary */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Headcount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={headcount}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setHeadcount('');
                      return;
                    }
                    const num = parseInt(val, 10);
                    if (isNaN(num) || num < 1) {
                      setHeadcount('1');
                    } else {
                      setHeadcount(String(num));
                    }
                    if (errors.headcount) setErrors((prev) => ({ ...prev, headcount: '' }));
                  }}
                  onBlur={() => {
                    if (!headcount || parseInt(headcount, 10) < 1) {
                      setHeadcount('1');
                    }
                  }}
                  className={`w-full h-10 px-3 text-xs font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                    errors.headcount ? 'border-red-500' : 'border-[#C3C6D1]'
                  }`}
                />
                {errors.headcount && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.headcount}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Basic Monthly Salary <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basicSalary}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setBasicSalary('');
                        return;
                      }
                      const num = parseFloat(val);
                      setBasicSalary(isNaN(num) || num < 0 ? 0 : num);
                      if (errors.salary) setErrors((prev) => ({ ...prev, salary: '' }));
                    }}
                    onBlur={() => {
                      if (basicSalary === '' || Number(basicSalary) < 0) {
                        setBasicSalary(0);
                      }
                    }}
                    className={`w-full h-10 pl-7 pr-3 text-xs font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                      errors.salary ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                </div>
                {errors.salary && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.salary}</p>
                )}
              </div>
            </div>

            {/* Cost Summary Card (Daily Rate & Total Salary) */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 block text-[11px] font-medium">Daily Rate</span>
                <span className="font-bold text-gray-900 text-xs">₹{daily.toFixed(2)}/day</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block text-[11px] font-medium">Total Monthly Salary</span>
                <span className="font-extrabold text-[#084E92] text-sm">
                  ₹{total.toLocaleString('en-IN')}.00
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!stateId || loadingRoles}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#00376C] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Add Role
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Master Modal to create new manpower role */}
      {isMasterModalOpen && (
        <div className="relative z-[70]">
          <ManPowerModal
            isOpen={isMasterModalOpen}
            onClose={() => setIsMasterModalOpen(false)}
            onSuccess={handleMasterCreated}
            initialData={{ stateId: stateId }}
            stateOptions={allStates}
          />
        </div>
      )}
    </>
  );
};

export default AddRoleModal;
