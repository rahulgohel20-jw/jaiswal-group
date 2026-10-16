import { useSyncExternalStore } from 'react';
import { getOrganizationHierarchy } from '@/services/apiServices';
import { getOrgIdFromToken, getActiveRoleLevel, getActiveUnitId } from '@/utils/auth';
import { parseOrgHierarchy } from '@/utils/hierarchyUtils';

let state = {
  loading: false,
  error: null,
  parsedScope: null,
  selectedUnitId: null,
  selectedSubOutletId: null,
  selectedSubLocationId: null,
};

const listeners = new Set();

function emitChange() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('invalidate-org-hierarchy', () => {
    orgHierarchyStore.fetchHierarchy(true);
  });
}

function getCacheKey(orgId) {
  return `org_hierarchy_cache_${orgId}`;
}

function loadFromSessionStorage(orgId) {
  if (typeof window === 'undefined' || !sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(getCacheKey(orgId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse cached org hierarchy from sessionStorage', err);
  }
  return null;
}

function saveToSessionStorage(orgId, data) {
  if (typeof window === 'undefined' || !sessionStorage || !orgId || !data) return;
  try {
    sessionStorage.setItem(getCacheKey(orgId), JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save org hierarchy to sessionStorage', err);
  }
}

let activeFetchPromise = null;

export const orgHierarchyStore = {
  getSnapshot: () => state,

  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState: () => state,

  setSelectedUnitId: (id) => {
    const nextId = id ? Number(id) : null;
    if (typeof window !== 'undefined') {
      try {
        if (nextId) {
          localStorage.setItem('selectedUnitId', String(nextId));
        } else {
          localStorage.removeItem('selectedUnitId');
        }
      } catch {}
    }
    if (state.selectedUnitId !== nextId) {
      state = { ...state, selectedUnitId: nextId, selectedSubOutletId: null };
      emitChange();
    }
  },

  setSelectedSubOutletId: (id) => {
    const nextId = id ? Number(id) : null;
    if (state.selectedSubOutletId !== nextId) {
      state = { ...state, selectedSubOutletId: nextId, selectedSubLocationId: null };
      emitChange();
    }
  },

  setSelectedSubLocationId: (id) => {
    const nextId = id ? Number(id) : null;
    if (typeof window !== 'undefined') {
      try {
        if (nextId) {
          localStorage.setItem('selectedSubLocationId', String(nextId));
        } else {
          localStorage.removeItem('selectedSubLocationId');
        }
      } catch {}
    }
    if (state.selectedSubLocationId !== nextId) {
      state = { ...state, selectedSubLocationId: nextId };
      emitChange();
    }
  },

  fetchHierarchy: async (force = false) => {
    const activeUnit = getActiveUnitId();
    const activeRole = getActiveRoleLevel();
    const isUnitRole = Boolean(activeUnit && activeRole === 'OUTLET');
    const tokenOrgId = getOrgIdFromToken();
    const storedCompId = typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null;

    // When switched to unit level role, pass outletId in organizationId!
    // When in company level role, pass companyId in organizationId!
    const orgId = isUnitRole
      ? Number(activeUnit)
      : (storedCompId ? Number(storedCompId) : Number(tokenOrgId));

    if (!orgId) {
      return null;
    }

    const storedUnitId = typeof window !== 'undefined' ? localStorage.getItem('selectedUnitId') : null;

    // If already in memory and not forced, restore selection if needed and exit
    if (state.parsedScope && !force) {
      if (isUnitRole || (state.parsedScope.userLevel === 'OUTLET' && !state.selectedUnitId)) {
        state = {
          ...state,
          selectedUnitId: isUnitRole ? Number(activeUnit) : Number(orgId),
          parsedScope: isUnitRole ? { ...state.parsedScope, userLevel: 'OUTLET' } : state.parsedScope,
        };
        emitChange();
      }
      return state.parsedScope;
    }

    // Try loading from sessionStorage first if not forced
    if (!force) {
      const cached = loadFromSessionStorage(orgId);
      if (cached) {
        const isOutlet = isUnitRole || cached.userLevel === 'OUTLET';
        let validUnitId = isUnitRole
          ? Number(activeUnit)
          : (state.selectedUnitId ?? (storedUnitId ? Number(storedUnitId) : null));
        if (!isUnitRole && validUnitId && cached.outlets && !cached.outlets.some((o) => Number(o.id) === Number(validUnitId))) {
          if (typeof window !== 'undefined') localStorage.removeItem('selectedUnitId');
          validUnitId = null;
        }

        state = {
          ...state,
          parsedScope: isUnitRole ? { ...cached, userLevel: 'OUTLET' } : cached,
          loading: false,
          error: null,
          selectedUnitId: isOutlet ? Number(orgId) : validUnitId,
        };
        emitChange();
        return cached;
      }
    }

    // Avoid duplicate in-flight requests
    if (activeFetchPromise) {
      return activeFetchPromise;
    }

    state = { ...state, loading: true, error: null };
    emitChange();

    activeFetchPromise = (async () => {
      try {
        const res = await getOrganizationHierarchy(orgId);
        const rootData = res?.data?.data ?? res?.data ?? res;
        const parsed = parseOrgHierarchy(rootData);

        if (parsed) {
          saveToSessionStorage(orgId, parsed);
        }

        const isOutlet = isUnitRole || parsed?.userLevel === 'OUTLET';
        let validUnitId = isUnitRole
          ? Number(activeUnit)
          : (state.selectedUnitId ?? (storedUnitId ? Number(storedUnitId) : null));
        if (!isUnitRole && validUnitId && parsed?.outlets && !parsed.outlets.some((o) => Number(o.id) === Number(validUnitId))) {
          if (typeof window !== 'undefined') localStorage.removeItem('selectedUnitId');
          validUnitId = null;
        }

        state = {
          ...state,
          parsedScope: isUnitRole && parsed ? { ...parsed, userLevel: 'OUTLET' } : parsed,
          loading: false,
          error: null,
          selectedUnitId: isOutlet ? Number(orgId) : validUnitId,
        };
        emitChange();
        return parsed;
      } catch (err) {
        console.error('Error fetching org hierarchy:', err);
        state = { ...state, loading: false, error: err?.message || 'Failed to fetch hierarchy' };
        emitChange();
        return null;
      } finally {
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  },

  // Instant Selectors (0 API calls)
  getSubOutlets: (outletId) => {
    if (!state.parsedScope) return [];
    if (outletId === null || outletId === 'ALL') {
      return state.parsedScope.subOutlets || [];
    }
    const targetId = outletId || state.selectedUnitId;
    if (!targetId) {
      return state.parsedScope.subOutlets || [];
    }
    const direct =
      state.parsedScope.subOutletsByOutletId?.[targetId] ||
      state.parsedScope.subOutletsByOutletId?.[Number(targetId)] ||
      state.parsedScope.subOutletsByOutletId?.[String(targetId)];
    if (direct && direct.length > 0) return direct;
    return (state.parsedScope.subOutlets || []).filter(
      (s) => String(s.organizationId || s.outletId) === String(targetId)
    );
  },

  getSubLocations: (subOutletId) => {
    const targetSub = subOutletId || state.selectedSubOutletId;
    if (!targetSub || !state.parsedScope) return [];
    const direct =
      state.parsedScope.subLocationsBySubOutletId?.[targetSub] ||
      state.parsedScope.subLocationsBySubOutletId?.[Number(targetSub)] ||
      state.parsedScope.subLocationsBySubOutletId?.[String(targetSub)];
    if (direct && direct.length > 0) return direct;
    return (state.parsedScope.subLocations || []).filter(
      (l) => String(l.subOutletId) === String(targetSub)
    );
  },

  getStores: (outletId, subOutletId) => {
    if (subOutletId) {
      const locs = orgHierarchyStore.getSubLocations(subOutletId);
      return locs.filter((l) => l.locationType === 'STORE');
    }
    const targetOutlet = outletId || state.selectedUnitId || getOrgIdFromToken();
    return (
      state.parsedScope?.locationsByOutletId?.stores?.[targetOutlet] ||
      state.parsedScope?.locationsByOutletId?.stores?.[Number(targetOutlet)] ||
      state.parsedScope?.locationsByOutletId?.stores?.[String(targetOutlet)] ||
      []
    );
  },

  getKitchens: (outletId, subOutletId) => {
    if (subOutletId) {
      const locs = orgHierarchyStore.getSubLocations(subOutletId);
      return locs.filter((l) => l.locationType === 'KITCHEN');
    }
    const targetOutlet = outletId || state.selectedUnitId || getOrgIdFromToken();
    return (
      state.parsedScope?.locationsByOutletId?.kitchens?.[targetOutlet] ||
      state.parsedScope?.locationsByOutletId?.kitchens?.[Number(targetOutlet)] ||
      state.parsedScope?.locationsByOutletId?.kitchens?.[String(targetOutlet)] ||
      []
    );
  },

  getChildren: (parentId) => {
    if (!parentId || !state.parsedScope) return [];
    const pid = Number(parentId);
    if (Number(state.parsedScope.userOrg?.id) === pid && state.parsedScope.userLevel === 'GROUP') {
      return state.parsedScope.companies || [];
    }
    const outlets = (state.parsedScope.outlets || []).filter(
      (o) => Number(o.parentId) === pid || Number(o.subCompanyId) === pid
    );
    if (outlets.length > 0) return outlets;
    const subOutlets = state.parsedScope.subOutletsByOutletId?.[pid];
    if (subOutlets && subOutlets.length > 0) return subOutlets;
    return [];
  },

  reset: () => {
    const orgId = getOrgIdFromToken();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('selectedCompanyId');
        localStorage.removeItem('selectedUnitId');
        localStorage.removeItem('selectedSubOutletId');
        localStorage.removeItem('selectedSubLocationId');
      } catch {}
      if (orgId && sessionStorage) {
        try {
          sessionStorage.removeItem(getCacheKey(orgId));
        } catch {}
      }
    }
    state = {
      loading: false,
      error: null,
      parsedScope: null,
      selectedUnitId: null,
      selectedSubOutletId: null,
      selectedSubLocationId: null,
    };
    emitChange();
  },
};

/**
 * Call this function anywhere in the application (after adding, editing, or deleting
 * any Company, Outlet, Sub-Outlet, or Sub-Location) to invalidate and refresh the hierarchy.
 */
export const invalidateOrgHierarchy = () => {
  return orgHierarchyStore.fetchHierarchy(true);
};

export function useOrgHierarchyStore() {
  return useSyncExternalStore(
    orgHierarchyStore.subscribe,
    orgHierarchyStore.getSnapshot,
    orgHierarchyStore.getSnapshot
  );
}
