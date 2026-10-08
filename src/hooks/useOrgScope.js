import { useEffect, useMemo, useCallback } from "react";
import { orgHierarchyStore, useOrgHierarchyStore } from "@/store/orgHierarchyStore";
import { getOrgIdFromToken } from "@/utils/auth";
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

  const rawLevel = parsedScope?.userLevel;
  const orgType = rawLevel ? normalizeType(rawLevel) : null;

  const isGroupUser = orgType === OrgTypes.GROUP || orgType === 'GROUP';
  const isCompanyUser =
    orgType === OrgTypes.SUB_COMPANY ||
    orgType === 'SUB_COMPANY' ||
    orgType === 'SUBCOMPANY' ||
    orgType === 'COMPANY';
  const isOutletUser = Boolean(
    orgType === OrgTypes.OUTLET ||
    orgType === 'OUTLET' ||
    orgType === 'OUTLETS' ||
    orgType === 'OUTLET_USER' ||
    orgType === 'OUTLETUSER' ||
    (orgType && !isCompanyUser && !isGroupUser)
  );

  const showUnitDropdown = isGroupUser || isCompanyUser;

  // Flattened Outlets list (Backward compatible with existing "units")
  const units = useMemo(() => {
    if (!parsedScope?.outlets) return [];
    return parsedScope.outlets.map((o) => ({
      id: o.id,
      name: o.name || `Outlet #${o.id}`,
      code: o.code || o.shortCode || null,
      subCompanyId: o.parentId || null,
    }));
  }, [parsedScope]);

  const allowedOutletIds = useMemo(
    () => new Set(units.map((u) => Number(u.id))),
    [units]
  );

  const effectiveOutletId = useMemo(() => {
    const tokenOrgId = getOrgIdFromToken();
    if (isOutletUser) {
      return tokenOrgId ?? units[0]?.id ?? 0;
    }
    if (selectedUnitId) return Number(selectedUnitId);
    if (isGroupUser) return Number(0);
    return tokenOrgId ?? 0;
  }, [isOutletUser, isGroupUser, units, selectedUnitId]);

  const filterRowsByScope = useCallback(
    (rows) => {
      if (!Array.isArray(rows)) return [];
      const orgId = Number(getOrgIdFromToken());
      if (isOutletUser) {
        const myId = Number(units[0]?.id ?? orgId);
        return rows.filter((r) => {
          if (r.outletId == null) return true;
          return Number(r.outletId) === myId;
        });
      }
      if (isCompanyUser && !selectedUnitId) {
        const validIds = new Set(units.map((u) => Number(u.id)));
        if (orgId) validIds.add(orgId);
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
    [isOutletUser, isCompanyUser, units, selectedUnitId, parsedScope]
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