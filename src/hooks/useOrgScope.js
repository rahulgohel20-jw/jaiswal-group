import { useCallback, useEffect, useMemo, useState } from "react";
import { getCompanyById, getChildrenByParentId } from "@/services/apiServices";
import { getOrgIdFromToken } from "@/utils/auth";
import { OrgTypes } from "@/constants/orgTypes";

function normalizeType(t) {
  return (t || "").toString().trim().toUpperCase().replace(/[\s_-]/g, "_");
}

function mapToUnit(child) {
  return {
    id: child.id,
    name: child.companyNameEnglish ?? child.organizationName ?? `Outlet #${child.id}`,
    code: child.code ?? child.shortCode ?? null,
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

export function useOrgScope() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgType, setOrgType] = useState(null);
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

      if (type === OrgTypes.GROUP) {
        setOrgType(type);
        // GROUP user: recurse down GROUP -> SUB_COMPANY -> OUTLET to collect all outlets
        const allOutlets = await fetchAllDescendantOutlets(organizationId);
        setUnits(allOutlets);
        setSelectedUnitId(null);
      } else if (type === OrgTypes.SUB_COMPANY) {
        setOrgType(type);
        // SUB_COMPANY user: only get direct child outlets belonging to this company
        const res = await getChildrenByParentId(organizationId);
        const children = res?.data?.data ?? res?.data ?? res ?? [];
        const directOutlets = (Array.isArray(children) ? children : [])
          .filter((c) => normalizeType(c?.orgType ?? c?.organizationType) === OrgTypes.OUTLET)
          .map(mapToUnit);
        setUnits(directOutlets);
        setSelectedUnitId(null);
      } else {
        setOrgType(OrgTypes.OUTLET);
        const self = {
          id: organizationId,
          name: org?.name ?? org?.organizationName ?? "My outlet",
          code: org?.code ?? org?.shortCode ?? null,
        };
        setUnits([self]);
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

  const isOutletUser = orgType === OrgTypes.OUTLET;
  const isCompanyUser = orgType === OrgTypes.SUB_COMPANY;
  const isGroupUser = orgType === OrgTypes.GROUP;
  const showUnitDropdown = isGroupUser || isCompanyUser;

  const allowedOutletIds = useMemo(
    () => new Set(units.map((u) => Number(u.id))),
    [units]
  );

  const effectiveOutletId = useMemo(() => {
    if (isOutletUser) {
      return units[0]?.id ?? getOrgIdFromToken() ?? 0;
    }
    if (selectedUnitId) return Number(selectedUnitId);
    return 0;
  }, [isOutletUser, units, selectedUnitId]);

  const filterRowsByScope = useCallback(
    (rows) => {
      if (!Array.isArray(rows)) return [];
      if (isOutletUser) {
        const myId = Number(units[0]?.id ?? getOrgIdFromToken());
        return rows.filter((r) => Number(r.outletId) === myId);
      }
      if (isCompanyUser && !selectedUnitId) {
        const validIds = new Set(units.map((u) => Number(u.id)));
        return rows.filter((r) => validIds.has(Number(r.outletId)));
      }
      if (selectedUnitId) {
        return rows.filter((r) => Number(r.outletId) === Number(selectedUnitId));
      }
      return rows;
    },
    [isOutletUser, isCompanyUser, units, selectedUnitId]
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