// ============================================
// File: src/hooks/useOrgScope.js
// ============================================
import { useCallback, useEffect, useState } from "react";
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

      if (type === OrgTypes.GROUP || type === OrgTypes.SUB_COMPANY) {
        setOrgType(type);
        // Recurse through any SUB_COMPANY layers so a MAIN GROUP user sees
        // every outlet under every sub-company, not just direct children.
        const allOutlets = await fetchAllDescendantOutlets(organizationId);
        setUnits(allOutlets);
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

  return {
    loading,
    error,
    orgType,
    units,
    selectedUnitId,
    setSelectedUnitId,
    selfOrg,
    retry: resolveScope,
  };
}