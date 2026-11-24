import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Store,
  MapPin,
  Compass,
  Layers,
  AlertTriangle,
  Loader2,
  RefreshCw,
  KeyRound,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loginUser } from '@/services/apiServices';
import { useAuth } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { orgHierarchyStore, useOrgHierarchyStore } from '@/store/orgHierarchyStore';
import { getUserCodeFromToken, getUsernameFromToken } from '@/utils/auth';
import { extractAccessibleScopeHierarchy } from '@/utils/hierarchyUtils';

export function SwitchScopeModal({ open, onOpenChange }) {
  const { auth, saveAuth } = useAuth();
  const storedAuth = auth || authHelper.getAuth();
  const store = useOrgHierarchyStore();
  const storeScope = store.parsedScope;

  useEffect(() => {
    if (open) {
      orgHierarchyStore.fetchHierarchy();
    }
  }, [open]);

  const scope = useMemo(() => {
    return storedAuth?.accessibleScope || storedAuth?.data?.accessibleScope || {};
  }, [storedAuth]);

  // Extract hierarchy and determine user's lowest assigned scope level
  const {
    userLevel,
    isGroupUser,
    assignedSubLocations,
    assignedSubUnits,
    assignedUnits,
    assignedCompanies,
    groups,
  } = useMemo(() => {
    return extractAccessibleScopeHierarchy(scope, storeScope?.companies || []);
  }, [scope, storeScope?.companies]);

  // Resolve userCode from storage, auth object, or token
  const resolveUserCode = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userCode') || sessionStorage.getItem('userCode');
      if (stored) return stored;
    }
    return (
      storedAuth?.userCode ||
      storedAuth?.data?.userCode ||
      storedAuth?.user?.userCode ||
      storedAuth?.user?.username ||
      scope?.userCode ||
      getUserCodeFromToken() ||
      getUsernameFromToken() ||
      ''
    );
  };

  const [userCode, setUserCode] = useState(resolveUserCode);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State selections pre-populated from current storage
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    return groups[0]?.id ? String(groups[0].id) : '';
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;
    if (stored && assignedCompanies.some((c) => Number(c.id) === Number(stored))) {
      return String(stored);
    }
    return assignedCompanies[0]?.id ? String(assignedCompanies[0].id) : '';
  });

  const [selectedOutletId, setSelectedOutletId] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedUnitId') : null;
    if (stored && assignedUnits.some((u) => Number(u.id) === Number(stored))) {
      return String(stored);
    }
    return assignedUnits[0]?.id ? String(assignedUnits[0].id) : '';
  });

  const [selectedSubOutletId, setSelectedSubOutletId] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedSubOutletId') : null;
    if (stored && assignedSubUnits.some((su) => Number(su.id) === Number(stored))) {
      return String(stored);
    }
    return assignedSubUnits[0]?.id ? String(assignedSubUnits[0].id) : '';
  });

  const [selectedSubLocationId, setSelectedSubLocationId] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedSubLocationId') : null;
    if (stored && assignedSubLocations.some((sl) => Number(sl.id) === Number(stored))) {
      return String(stored);
    }
    return assignedSubLocations[0]?.id ? String(assignedSubLocations[0].id) : '';
  });

  // Sync state selections and reset password on modal open
  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setError('');
      setUserCode(resolveUserCode());

      const storedComp = localStorage.getItem('selectedCompanyId');
      const storedUnit = localStorage.getItem('selectedUnitId');
      const storedSubOut = localStorage.getItem('selectedSubOutletId');
      const storedSubLoc = localStorage.getItem('selectedSubLocationId');

      if (groups[0]?.id) setSelectedGroupId(String(groups[0].id));

      if (storedComp && assignedCompanies.some((c) => Number(c.id) === Number(storedComp))) {
        setSelectedCompanyId(String(storedComp));
      } else if (assignedCompanies[0]?.id) {
        setSelectedCompanyId(String(assignedCompanies[0].id));
      } else {
        setSelectedCompanyId('');
      }

      if (storedUnit && assignedUnits.some((u) => Number(u.id) === Number(storedUnit))) {
        setSelectedOutletId(String(storedUnit));
      } else if (assignedUnits[0]?.id) {
        setSelectedOutletId(String(assignedUnits[0].id));
      } else {
        setSelectedOutletId('');
      }

      if (storedSubOut && assignedSubUnits.some((su) => Number(su.id) === Number(storedSubOut))) {
        setSelectedSubOutletId(String(storedSubOut));
      } else if (assignedSubUnits[0]?.id) {
        setSelectedSubOutletId(String(assignedSubUnits[0].id));
      } else {
        setSelectedSubOutletId('');
      }

      if (storedSubLoc && assignedSubLocations.some((sl) => Number(sl.id) === Number(storedSubLoc))) {
        setSelectedSubLocationId(String(storedSubLoc));
      } else if (assignedSubLocations[0]?.id) {
        setSelectedSubLocationId(String(assignedSubLocations[0].id));
      } else {
        setSelectedSubLocationId('');
      }
    }
  }, [open, groups, assignedCompanies, assignedUnits, assignedSubUnits, assignedSubLocations]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSwitch = async () => {
    setError('');

    if (!userCode?.trim()) {
      setError('User code is required to authenticate workspace switch.');
      return;
    }

    if (!password) {
      setError('Please enter your password to switch workspace.');
      return;
    }

    let targetCompanyId = null;
    let targetOutletId = null;
    let targetSubOutletId = null;
    let targetSubLocationId = null;
    let switchLabel = 'New Workspace';

    if (userLevel === 'SUBLOCATION') {
      const sl = assignedSubLocations.find((item) => String(item.id) === String(selectedSubLocationId));
      if (!sl) {
        setError('Please select a sub-location to proceed.');
        return;
      }
      targetSubLocationId = sl.id;
      targetSubOutletId = sl.subOutletId || null;
      targetOutletId = sl.outletId || null;
      targetCompanyId = sl.companyId || null;
      switchLabel = `${sl.name}${sl.outletName ? ` (${sl.outletName})` : ''}`;
    } else if (userLevel === 'SUBUNIT') {
      const su = assignedSubUnits.find((item) => String(item.id) === String(selectedSubOutletId));
      if (!su) {
        setError('Please select a sub-unit to proceed.');
        return;
      }
      targetSubOutletId = su.id;
      targetOutletId = su.outletId || null;
      targetCompanyId = su.companyId || null;
      switchLabel = `${su.name}${su.outletName ? ` (${su.outletName})` : ''}`;
    } else if (userLevel === 'UNIT') {
      const u = assignedUnits.find((item) => String(item.id) === String(selectedOutletId));
      if (!u) {
        setError('Please select a unit to proceed.');
        return;
      }
      targetOutletId = u.id;
      targetCompanyId = u.companyId || null;
      switchLabel = `${u.name}${u.companyName ? ` (${u.companyName})` : ''}`;
    } else if (userLevel === 'COMPANY' || userLevel === 'GROUP') {
      const c = assignedCompanies.find((item) => String(item.id) === String(selectedCompanyId));
      if (!c && assignedCompanies.length > 0) {
        setError('Please select a company to proceed.');
        return;
      }
      targetCompanyId = c ? c.id : (selectedGroupId ? Number(selectedGroupId) : null);
      switchLabel = c ? c.name : (groups.find((g) => String(g.id) === String(selectedGroupId))?.name || 'JAISWAL GROUP');
    }

    const orgId = targetCompanyId || (selectedGroupId ? Number(selectedGroupId) : 0);

    const payload = {
      userCode: userCode.trim(),
      password,
      organizationId: orgId,
    };

    if (targetOutletId) {
      payload.outletId = Number(targetOutletId);
    }
    if (targetSubOutletId) {
      payload.subOutletId = Number(targetSubOutletId);
    }
    if (targetSubLocationId) {
      payload.subLocationId = Number(targetSubLocationId);
    }

    setSubmitting(true);
    try {
      const res = await loginUser(payload, { skipGlobalToast: true });
      const data = res?.data?.data ?? res?.data;

      if (!data?.token) {
        setError(res?.data?.msg || res?.data?.message || 'Failed to switch workspace. Please verify password.');
        return;
      }

      // Update tokens in storage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userToken', data.token);

      // Keep userCode in storage (without password)
      localStorage.setItem('userCode', userCode.trim());
      sessionStorage.setItem('userCode', userCode.trim());

      // Update selected scopes in storage and hierarchy store
      if (targetCompanyId) {
        localStorage.setItem('selectedCompanyId', String(targetCompanyId));
      } else {
        localStorage.removeItem('selectedCompanyId');
      }

      if (targetOutletId) {
        localStorage.setItem('activeScopeRole', 'OUTLET');
        localStorage.setItem('selectedUnitId', String(targetOutletId));
        orgHierarchyStore.setSelectedUnitId(targetOutletId);
      } else {
        localStorage.setItem('activeScopeRole', 'COMPANY');
        localStorage.removeItem('selectedUnitId');
        orgHierarchyStore.setSelectedUnitId(null);
      }

      if (targetSubOutletId) {
        localStorage.setItem('selectedSubOutletId', String(targetSubOutletId));
        orgHierarchyStore.setSelectedSubOutletId(targetSubOutletId);
      } else {
        localStorage.removeItem('selectedSubOutletId');
        orgHierarchyStore.setSelectedSubOutletId(null);
      }

      if (targetSubLocationId) {
        localStorage.setItem('selectedSubLocationId', String(targetSubLocationId));
        orgHierarchyStore?.setSelectedSubLocationId?.(targetSubLocationId);
      } else {
        localStorage.removeItem('selectedSubLocationId');
        orgHierarchyStore?.setSelectedSubLocationId?.(null);
      }

      // Update Auth provider, preserving accessibleScope for future switches
      const enriched = {
        ...data,
        accessibleScope: data.accessibleScope || scope,
        selectedScope: {
          companyId: targetCompanyId ? Number(targetCompanyId) : null,
          outletId: targetOutletId ? Number(targetOutletId) : null,
          subOutletId: targetSubOutletId ? Number(targetSubOutletId) : null,
          subLocationId: targetSubLocationId ? Number(targetSubLocationId) : null,
        },
      };
      saveAuth(enriched);

      // Save flash toast message to show AFTER page reload
      sessionStorage.setItem('pendingSwitchToast', `Switched to ${switchLabel} successfully`);

      onOpenChange(false);

      // Reload window to ensure clean re-initialization of queries and caches with the new token
      window.location.reload();
    } catch (err) {
      console.error('Workspace switch error:', err);
      const resData = err?.response?.data;
      setError(
        resData?.errorMessage ||
          resData?.message ||
          resData?.msg ||
          err?.message ||
          'Failed to switch workspace. Please check your password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isButtonDisabled =
    submitting ||
    !userCode?.trim() ||
    !password ||
    (userLevel === 'SUBLOCATION' && !selectedSubLocationId) ||
    (userLevel === 'SUBUNIT' && !selectedSubOutletId) ||
    (userLevel === 'UNIT' && !selectedOutletId) ||
    (userLevel === 'COMPANY' && !selectedCompanyId) ||
    (userLevel === 'GROUP' && assignedCompanies.length > 0 && !selectedCompanyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-6 rounded-2xl bg-white shadow-xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#084E92]/10 text-[#084E92] flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#0F2A4A]">
                Switch Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Change your active{' '}
                {userLevel === 'SUBLOCATION'
                  ? 'sub-location'
                  : userLevel === 'SUBUNIT'
                  ? 'sub-unit'
                  : userLevel === 'UNIT'
                  ? 'unit'
                  : 'company'}{' '}
                workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 mb-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="space-y-3.5 my-1">
          {/* GROUP USER LEVEL */}
          {userLevel === 'GROUP' && (
            <>
              {groups.length > 1 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                    <Layers className="w-3.5 h-3.5 text-[#084E92]" />
                    Group
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      disabled={submitting}
                      className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] font-semibold outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                    >
                      {groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name} {grp.code ? `(${grp.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#084E92]" />
                  Company
                </label>
                <div className="relative">
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    disabled={submitting}
                    className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                  >
                    <option value="">Select Company</option>
                    {assignedCompanies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.code ? `(${comp.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* COMPANY USER LEVEL */}
          {userLevel === 'COMPANY' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#084E92]" />
                Company
              </label>
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  disabled={submitting}
                  className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                >
                  <option value="">Select Company</option>
                  {assignedCompanies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.code ? `(${comp.code})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* UNIT USER LEVEL */}
          {userLevel === 'UNIT' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                <Store className="w-3.5 h-3.5 text-[#084E92]" />
                Unit
              </label>
              <div className="relative">
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  disabled={submitting}
                  className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                >
                  <option value="">Select Unit</option>
                  {assignedUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.companyName ? `(${u.companyName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* SUB-UNIT USER LEVEL */}
          {userLevel === 'SUBUNIT' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#084E92]" />
                Sub-Unit
              </label>
              <div className="relative">
                <select
                  value={selectedSubOutletId}
                  onChange={(e) => setSelectedSubOutletId(e.target.value)}
                  disabled={submitting}
                  className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                >
                  <option value="">Select Sub-Unit</option>
                  {assignedSubUnits.map((su) => (
                    <option key={su.id} value={su.id}>
                      {su.name} {su.outletName ? `(${su.outletName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* SUB-LOCATION USER LEVEL */}
          {userLevel === 'SUBLOCATION' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
                <Compass className="w-3.5 h-3.5 text-[#084E92]" />
                Sub-Location
              </label>
              <div className="relative">
                <select
                  value={selectedSubLocationId}
                  onChange={(e) => setSelectedSubLocationId(e.target.value)}
                  disabled={submitting}
                  className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
                >
                  <option value="">Select Sub-Location</option>
                  {assignedSubLocations.map((sl) => (
                    <option key={sl.id} value={sl.id}>
                      {sl.name} {sl.outletName ? `(${sl.outletName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* User Code (Always shown in modal) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
              <User className="w-3.5 h-3.5 text-[#084E92]" />
              User Code
            </label>
            <input
              type="text"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder="User Code"
              readOnly={Boolean(resolveUserCode())}
              disabled={submitting}
              className={`w-full rounded-lg border border-[#E1E4E9] px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] ${
                resolveUserCode() ? 'bg-gray-50 font-semibold cursor-not-allowed select-none opacity-90' : 'bg-white'
              }`}
            />
          </div>

          {/* Password (Required on every workspace switch) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54607A] mb-1">
              <KeyRound className="w-3.5 h-3.5 text-[#084E92]" />
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to confirm switch"
                disabled={submitting}
                className="w-full rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-xs text-[#0F2A4A] outline-none transition focus:border-[#084E92] pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSwitch}
            disabled={isButtonDisabled}
            className="bg-[#084E92] hover:bg-[#073F77] text-white text-xs gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Confirm Switch
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
