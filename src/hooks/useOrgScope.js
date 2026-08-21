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

async function fetchOutletChildren(parentId) {
  const res = await getChildrenByParentId(parentId);
  const list = res?.data?.data ?? res?.data ?? res ?? [];
  return list
    .filter(
      (child) =>
        normalizeType(child?.orgType ?? child?.organizationType) === OrgTypes.OUTLET
    )
    .map((child) => ({
      id: child.id,
      name: child.companyNameEnglish ?? child.organizationName ?? `Outlet #${child.id}`,
      code: child.code ?? child.shortCode ?? null,
    }));
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
        const children = await fetchOutletChildren(organizationId);
        setUnits(children);
        setSelectedUnitId(children[0]?.id ?? null);
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