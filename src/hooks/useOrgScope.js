import { useEffect, useMemo, useCallback } from "react";
import { orgHierarchyStore, useOrgHierarchyStore } from "@/store/orgHierarchyStore";
import {
  getOrgIdFromToken,
  getActiveRoleLevel,
  getActiveUnitId,
  getOutletIdFromToken,
} from "@/utils/auth";
import { OrgTypes } from "@/constants/orgTypes";

function normalizeType(t) {
  return (t || "").toString().trim().toUpperCase().replace(/[\s_-]/g, "_");
}

export function useOrgScope() {
  const store = useOrgHierarchyStore();
  const { loading, error, parsedScope, selectedUnitId, selectedSubOutletId } = store;

  useEffect(() => {
    orgHierarchyStore.fetchHierarchy();
  }, []);

  const activeRole = getActiveRoleLevel();
  const activeUnit = getActiveUnitId();
  const isUnitRole = Boolean(activeRole === 'OUTLET' && activeUnit);

  const rawLevel = parsedScope?.userLevel;
  const normalizedLevel = rawLevel ? normalizeType(rawLevel) : null;
  const isOutletRole = Boolean(
    isUnitRole ||
    normalizedLevel === OrgTypes.OUTLET ||
    normalizedLevel === 'OUTLET' ||
    normalizedLevel === 'OUTLETS' ||
    normalizedLevel === 'OUTLET_USER' ||
    normalizedLevel === 'OUTLETUSER'
  );

  const orgType = isOutletRole ? 'OUTLET' : normalizedLevel;

  const isGroupUser = !isOutletRole && (orgType === OrgTypes.GROUP || orgType === 'GROUP');
  const isCompanyUser = !isOutletRole && (
    orgType === OrgTypes.SUB_COMPANY ||
    orgType === 'SUB_COMPANY' ||
    orgType === 'SUBCOMPANY' ||
    orgType === 'COMPANY' ||
    (!isGroupUser && !isOutletRole)
  );
  const isOutletUser = isOutletRole;

  // When switched to unit level or in unit-level role, unit dropdown must be hidden.
  // It should only be visible for company level or group level users.
  const showUnitDropdown = !isOutletUser && (isGroupUser || isCompanyUser);

  // Flattened Outlets list (Backward compatible with existing "units")
  const units = useMemo(() => {
    if (!parsedScope?.outlets) return [];
    return parsedScope.outlets.map((o) => ({
      ...o,
      id: o.id,
      name: o.name || o.companyNameEnglish || o.organizationName || `Outlet #${o.id}`,
      companyNameEnglish: o.companyNameEnglish || o.name || o.organizationName || `Outlet #${o.id}`,
      companyCode: o.companyCode || o.code || o.shortCode || o.organizationCode || null,
      code: o.code || o.shortCode || null,
      subCompanyId: o.parentId || null,
    }));
  }, [parsedScope]);

  const allowedOutletIds = useMemo(
    () => new Set(units.map((u) => Number(u.id))),
    [units]
  );

  const companyId = useMemo(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;
    if (stored && Number(stored) > 0) return Number(stored);
    const tokenOrgId = getOrgIdFromToken();
    if (tokenOrgId && Number(tokenOrgId) > 0) return Number(tokenOrgId);
    if (parsedScope?.userOrg?.id) return Number(parsedScope.userOrg.id);
    return null;
  }, [parsedScope]);

  const effectiveOutletId = useMemo(() => {
    if (isOutletUser) {
      if (activeUnit) return Number(activeUnit);
      if (selectedUnitId) return Number(selectedUnitId);
      const tokenOutlet = getOutletIdFromToken();
      if (tokenOutlet) return Number(tokenOutlet);
      if (units.length > 0 && units[0]?.id) return Number(units[0].id);
      const tokenOrgId = getOrgIdFromToken();
      return Number(tokenOrgId) || 0;
    }
    if (selectedUnitId) return Number(selectedUnitId);
    // When company level or group user is logged in and no unit is selected, pass companyId in outletId
    if (isCompanyUser || isGroupUser || companyId) {
      return companyId ? Number(companyId) : (getOrgIdFromToken() ? Number(getOrgIdFromToken()) : 0);
    }
    return 0;
  }, [isOutletUser, isCompanyUser, isGroupUser, companyId, units, selectedUnitId, activeUnit]);

  const filterRowsByScope = useCallback(
    (rows) => {
      if (!Array.isArray(rows)) return [];
      const orgId = Number(getOrgIdFromToken());
      if (isOutletUser) {
        const targetUnit = Number(effectiveOutletId || activeUnit || selectedUnitId || units[0]?.id);
        if (!targetUnit) return rows;
        return rows.filter((r) => {
          if (r.outletId == null) return true;
          return Number(r.outletId) === targetUnit;
        });
      }
      if ((isCompanyUser || isGroupUser) && !selectedUnitId) {
        const validIds = new Set(units.map((u) => Number(u.id)));
        if (orgId) validIds.add(orgId);
        if (companyId) validIds.add(Number(companyId));
        if (parsedScope?.userOrg?.id) validIds.add(Number(parsedScope.userOrg.id));
        if (validIds.size === 0) return rows;
        return rows.filter((r) => {
          if (r.outletId == null) return true;
          return validIds.has(Number(r.outletId));
        });
      }
      if (selectedUnitId) {
        return rows.filter((r) => Number(r.outletId) === Number(selectedUnitId));
      }
      return rows;
    },
    [isOutletUser, isCompanyUser, isGroupUser, units, selectedUnitId, parsedScope, effectiveOutletId, activeUnit, companyId]
  );

  return {
    loading,
    error,
    orgType,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    showUnitDropdown,
    units,
    outlets: units,
    companies: parsedScope?.companies || [],
    subOutlets: isOutletUser && effectiveOutletId
      ? orgHierarchyStore.getSubOutlets(effectiveOutletId)
      : (parsedScope?.subOutlets || []),
    subLocations: selectedSubOutletId
      ? orgHierarchyStore.getSubLocations(selectedSubOutletId)
      : (parsedScope?.subLocations || []),
    allowedOutletIds,
    selectedUnitId,
    companyId,
    setSelectedUnitId: orgHierarchyStore.setSelectedUnitId,
    selectedSubOutletId,
    setSelectedSubOutletId: orgHierarchyStore.setSelectedSubOutletId,
    effectiveOutletId,
    filterRowsByScope,
    selfOrg: parsedScope?.userOrg || null,
    rawHierarchy: parsedScope?.rawTree || null,
    // Instant Tier 4 & 5 selectors (0ms / 0 API calls)
    getSubOutlets: orgHierarchyStore.getSubOutlets,
    getSubLocations: orgHierarchyStore.getSubLocations,
    getStores: orgHierarchyStore.getStores,
    getKitchens: orgHierarchyStore.getKitchens,
    refetchHierarchy: () => orgHierarchyStore.fetchHierarchy(true),
    retry: () => orgHierarchyStore.fetchHierarchy(true),
  };
}