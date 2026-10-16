import React, { useState, useMemo } from 'react';
import {
  Building2,
  ChevronDown,
  Store,
  MapPin,
  Compass,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Layers,
} from 'lucide-react';
import { loginUser } from '@/services/apiServices';
import { extractAccessibleScopeHierarchy } from '@/utils/hierarchyUtils';

export const OrgScopeSelectionStep = ({
  loginData,
  credentials,
  onSuccess,
  onBack,
}) => {
  const scope = loginData?.accessibleScope || {};
  const userName = loginData?.name || scope?.userName || 'User';
  const deptName = loginData?.departmentName || 'Employee';

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
    return extractAccessibleScopeHierarchy(scope);
  }, [scope]);

  // Find default assignment if any
  const defaultAssignment = useMemo(() => {
    return (scope.assignments || []).find((a) => a.isDefault && a.isActive !== false) || null;
  }, [scope.assignments]);

  // Initial selection states based on user level
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    return groups[0]?.id ? String(groups[0].id) : '';
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (defaultAssignment?.companyId && assignedCompanies.some((c) => Number(c.id) === Number(defaultAssignment.companyId))) {
      return String(defaultAssignment.companyId);
    }
    if (userLevel === 'COMPANY' && assignedCompanies.length > 0) {
      return String(assignedCompanies[0].id);
    }
    return '';
  });

  const [selectedOutletId, setSelectedOutletId] = useState(() => {
    if (defaultAssignment?.outletId && assignedUnits.some((u) => Number(u.id) === Number(defaultAssignment.outletId))) {
      return String(defaultAssignment.outletId);
    }
    if (defaultAssignment?.organizationType === 'OUTLET' && assignedUnits.some((u) => Number(u.id) === Number(defaultAssignment.organizationId))) {
      return String(defaultAssignment.organizationId);
    }
    if (userLevel === 'UNIT' && assignedUnits.length > 0) {
      return String(assignedUnits[0].id);
    }
    return '';
  });

  const [selectedSubOutletId, setSelectedSubOutletId] = useState(() => {
    if (defaultAssignment?.subOutletId && assignedSubUnits.some((su) => Number(su.id) === Number(defaultAssignment.subOutletId))) {
      return String(defaultAssignment.subOutletId);
    }
    if (userLevel === 'SUBUNIT' && assignedSubUnits.length > 0) {
      return String(assignedSubUnits[0].id);
    }
    return '';
  });

  const [selectedSubLocationId, setSelectedSubLocationId] = useState(() => {
    if (defaultAssignment?.subLocationId && assignedSubLocations.some((sl) => Number(sl.id) === Number(defaultAssignment.subLocationId))) {
      return String(defaultAssignment.subLocationId);
    }
    if (userLevel === 'SUBLOCATION' && assignedSubLocations.length > 0) {
      return String(assignedSubLocations[0].id);
    }
    return '';
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');

    let targetCompanyId = null;
    let targetOutletId = null;
    let targetSubOutletId = null;
    let targetSubLocationId = null;

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
    } else if (userLevel === 'SUBUNIT') {
      const su = assignedSubUnits.find((item) => String(item.id) === String(selectedSubOutletId));
      if (!su) {
        setError('Please select a sub-unit to proceed.');
        return;
      }
      targetSubOutletId = su.id;
      targetOutletId = su.outletId || null;
      targetCompanyId = su.companyId || null;
    } else if (userLevel === 'UNIT') {
      const u = assignedUnits.find((item) => String(item.id) === String(selectedOutletId));
      if (!u) {
        setError('Please select a unit to proceed.');
        return;
      }
      targetOutletId = u.id;
      targetCompanyId = u.companyId || null;
    } else if (userLevel === 'COMPANY' || userLevel === 'GROUP') {
      const c = assignedCompanies.find((item) => String(item.id) === String(selectedCompanyId));
      if (!c && assignedCompanies.length > 0) {
        setError('Please select a company to proceed.');
        return;
      }
      targetCompanyId = c ? c.id : (selectedGroupId ? Number(selectedGroupId) : null);
    }

    const orgId = targetCompanyId || (selectedGroupId ? Number(selectedGroupId) : 0);

    const payload = {
      userCode: credentials?.userCode || loginData?.userCode,
      password: credentials?.password,
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
      const res = await loginUser(payload);
      const data = res?.data?.data ?? res?.data;

      if (!data?.token) {
        setError(res?.data?.msg || res?.data?.message || 'Login failed. Please select a valid organization.');
        return;
      }

      onSuccess(data, {
        groupId: selectedGroupId ? Number(selectedGroupId) : null,
        companyId: targetCompanyId ? Number(targetCompanyId) : null,
        outletId: targetOutletId ? Number(targetOutletId) : null,
        subOutletId: targetSubOutletId ? Number(targetSubOutletId) : null,
        subLocationId: targetSubLocationId ? Number(targetSubLocationId) : null,
      });
    } catch (err) {
      console.error('Scope login error:', err);
      const resData = err?.response?.data;
      setError(
        resData?.errorMessage ||
          resData?.message ||
          resData?.msg ||
          err?.message ||
          'Failed to login with selected scope. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isButtonDisabled =
    submitting ||
    (userLevel === 'SUBLOCATION' && !selectedSubLocationId) ||
    (userLevel === 'SUBUNIT' && !selectedSubOutletId) ||
    (userLevel === 'UNIT' && !selectedOutletId) ||
    (userLevel === 'COMPANY' && !selectedCompanyId) ||
    (userLevel === 'GROUP' && assignedCompanies.length > 0 && !selectedCompanyId);

  return (
    <div className="space-y-4.5 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-[#0F2A4A] leading-tight">
              Select Workspace
            </h2>
            <p className="text-[11.5px] text-gray-500">
              {userName} • <span className="font-medium text-[#1D4E89]">{deptName}</span>
            </p>
          </div>
        </div>
        <p className="text-[#8B93A1] text-[12px] leading-relaxed">
          Please select your{' '}
          {userLevel === 'SUBLOCATION'
            ? 'sub-location'
            : userLevel === 'SUBUNIT'
            ? 'sub-unit'
            : userLevel === 'UNIT'
            ? 'unit'
            : 'company'}{' '}
          workspace to proceed.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Strict Tiered Selection Form: Only the user's specific tier is displayed */}
      <div className="space-y-3">
        {/* GROUP USER LEVEL */}
        {userLevel === 'GROUP' && (
          <>
            {groups.length > 1 && (
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
                  <Layers className="w-3.5 h-3.5 text-[#1D4E89]" />
                  Group
                </label>
                <div className="relative">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={submitting}
                    className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] font-semibold outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
              <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#1D4E89]" />
                Company <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  disabled={submitting}
                  className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#1D4E89]" />
              Company <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={submitting}
                className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
              <Store className="w-3.5 h-3.5 text-[#1D4E89]" />
              Unit <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                disabled={submitting}
                className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#1D4E89]" />
              Sub-Unit <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSubOutletId}
                onChange={(e) => setSelectedSubOutletId(e.target.value)}
                disabled={submitting}
                className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#54607A] mb-1">
              <Compass className="w-3.5 h-3.5 text-[#1D4E89]" />
              Sub-Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSubLocationId}
                onChange={(e) => setSelectedSubLocationId(e.target.value)}
                disabled={submitting}
                className="w-full appearance-none rounded-lg border border-[#E1E4E9] bg-white px-3 py-2 text-[12.5px] text-[#0F2A4A] outline-none transition focus:border-[#1D4E89] hover:border-gray-300 cursor-pointer pr-8 disabled:opacity-60"
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
      </div>

      {/* Buttons */}
      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isButtonDisabled}
          className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13px] font-semibold rounded-lg py-2.5 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Continue to Application</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="w-full text-center text-[11.5px] text-gray-500 hover:text-gray-800 font-medium py-1 cursor-pointer bg-transparent border-0 transition flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sign in as different user</span>
        </button>
      </div>
    </div>
  );
};

export default OrgScopeSelectionStep;
