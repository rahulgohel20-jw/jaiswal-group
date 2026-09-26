import { useCallback, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { getAuth } from "@/auth/lib/helpers";
import { getCompanyById, getChildrenByParentId } from "@/services/apiServices";
import { getOrgIdFromToken } from "@/utils/auth";
import { OrgTypes } from "@/constants/orgTypes";

function normalizeType(t) {
  return (t || "").toString().trim().toUpperCase().replace(/[\s_-]/g, "_");
}

function mapToUnit(child) {
  return {
    id: child.id,
    name: child.companyNameEnglish ?? child.organizationName ?? child.name ?? `Outlet #${child.id}`,
    code: child.companyCode ?? child.code ?? child.shortCode ?? null,
  };
}

// Recursively walks the org tree under parentId and collects every OUTLET
// found at any depth. Handles both shapes:
//   GROUP -> SUB_COMPANY -> OUTLET   (Jaiswal Group case — outlets are
//                                      grandchildren, not direct children)
//   SUB_COMPANY -> OUTLET            (direct children already)
// Any child that isn't an OUTLET (e.g. a nested SUB_COMPANY) is treated as
// a branch to recurse into rather than being dropped.
async function fetchAllDescendantOutlets(parentId) {
  const res = await getChildrenByParentId(parentId);
  const children = res?.data?.data ?? res?.data ?? res ?? [];

  const outlets = [];
  const branches = [];

  for (const child of children) {
    const childType = normalizeType(child?.orgType ?? child?.organizationType);
    if (childType === OrgTypes.OUTLET) {
      outlets.push(mapToUnit(child));
    } else {
      // SUB_COMPANY (or any other non-outlet node) — recurse into it looking
      // for outlets further down the tree.
      branches.push(child.id);
    }
  }

  if (branches.length > 0) {
    const nested = await Promise.all(branches.map(fetchAllDescendantOutlets));
    nested.forEach((outletsForBranch) => outlets.push(...outletsForBranch));
  }

  return outlets;
}

function getInitialOrgType() {
  try {
    const auth = getAuth();
    let ut = auth?.userType || auth?.user?.userType || auth?.data?.userType || auth?.user?.orgType || auth?.data?.orgType;
    if (!ut && auth?.token) {
      const decoded = jwtDecode(auth.token);
      ut = decoded?.userType || decoded?.orgType || decoded?.organizationType;
    }
    if (ut) return normalizeType(ut);
  } catch { }
  return null;
}

export function useOrgScope() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgType, setOrgType] = useState(getInitialOrgType);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selfOrg, setSelfOrg] = useState(null);

  const resolveScope = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const organizationId = getOrgIdFromToken();
      if (!organizationId) {
        throw new Error("No organizationId found for the logged-in user.");
      }

      const orgRes = await getCompanyById(organizationId);
      const org = orgRes?.data?.data ?? orgRes?.data ?? orgRes;
      const type = normalizeType(org?.orgType ?? org?.organizationType);
      setSelfOrg(org);

      if (type === OrgTypes.GROUP || type === 'GROUP') {
        setOrgType(OrgTypes.GROUP);
        // GROUP user: recurse down GROUP -> SUB_COMPANY -> OUTLET to collect all outlets
        const allOutlets = await fetchAllDescendantOutlets(organizationId);
        setUnits(allOutlets);
        setSelectedUnitId(null);
      } else if (type === OrgTypes.SUB_COMPANY || type === 'SUB_COMPANY' || type === 'COMPANY') {
        setOrgType(OrgTypes.SUB_COMPANY);
        // SUB_COMPANY / COMPANY user: get all descendant outlets belonging to this company
        const companyOutlets = await fetchAllDescendantOutlets(organizationId);
        setUnits(companyOutlets);
        setSelectedUnitId(null);
      } else {
        // Outlet User: fetch sibling outlets sharing the same parent company
        setOrgType(OrgTypes.OUTLET);
        const self = {
          id: organizationId,
          name: org?.companyNameEnglish ?? org?.name ?? org?.organizationName ?? "My outlet",
          code: org?.companyCode ?? org?.code ?? org?.shortCode ?? null,
        };

        const parentId = org?.parentId ?? org?.parentOrganizationId ?? org?.parentCompanyId;
        let siblingUnits = [];
        if (parentId) {
          try {
            siblingUnits = await fetchAllDescendantOutlets(parentId);
          } catch (err) {
            console.error("Failed to load sibling outlets for parentId", parentId, err);
          }
        }

        if (siblingUnits.length === 0) {
          siblingUnits = [self];
        }

        setUnits(siblingUnits);
        setSelectedUnitId(organizationId);
      }
    } catch (err) {
      setError(err?.message || "Failed to resolve organization scope.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveScope();
  }, [resolveScope]);

  const isCompanyUser = orgType === OrgTypes.SUB_COMPANY || orgType === 'SUBCOMPANY' || orgType === 'COMPANY';
  const isGroupUser = orgType === OrgTypes.GROUP || orgType === 'GROUP';
  const isOutletUser = Boolean(
    orgType === OrgTypes.OUTLET ||
    orgType === 'OUTLET' ||
    orgType === 'OUTLETS' ||
    orgType === 'OUTLET_USER' ||
    orgType === 'OUTLETUSER' ||
    (orgType && !isCompanyUser && !isGroupUser)
  );
  const showUnitDropdown = isGroupUser || isCompanyUser;

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
        if (selfOrg?.id) validIds.add(Number(selfOrg.id));
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
    [isOutletUser, isCompanyUser, units, selectedUnitId, selfOrg]
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
    allowedOutletIds,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    filterRowsByScope,
    selfOrg,
    retry: resolveScope,
  };
}