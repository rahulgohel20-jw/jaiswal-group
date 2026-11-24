/**
 * Normalizes and indexes the N-level organization hierarchy tree from /api/organization/hierarchy
 * Supports: GROUP -> SUB_COMPANY -> OUTLET -> SUB_OUTLET -> SUB_LOCATION
 */
export function parseOrgHierarchy(rootNode) {
  if (!rootNode) return null;

  const companies = [];
  const outlets = [];
  const subOutlets = [];
  const subLocations = [];

  const subOutletsByOutletId = {};
  const subLocationsBySubOutletId = {};
  const locationsByOutletId = { stores: {}, kitchens: {}, pos: {} };

  function classifyLocationType(node) {
    const code = (node.organizationCode || '').toUpperCase();
    const name = (node.name || '').toUpperCase();
    const shortCode = (node.shortCode || '').toUpperCase();

    if (
      code.startsWith('STR') ||
      code === 'STORE' ||
      name.includes('STORE') ||
      shortCode.includes('STORE')
    ) {
      return 'STORE';
    }
    if (
      code.startsWith('KIT') ||
      code === 'KITCHEN' ||
      name.includes('KITCHEN') ||
      shortCode.includes('KIT')
    ) {
      return 'KITCHEN';
    }
    if (
      code.startsWith('POS') ||
      code === 'POS' ||
      name.includes('POS') ||
      name.includes('BILLING')
    ) {
      return 'POS';
    }
    return 'STORE';
  }

  function traverse(node, parents = {}) {
    if (!node) return;
    const nodeId = node.internalId ?? node.id ?? node.organizationId;
    const rawLevel = (node.level || node.orgType || node.organizationType || node.type || '').toUpperCase().replace(/[\s_-]/g, '_');

    const currentInfo = {
      id: nodeId,
      internalId: nodeId,
      name: node.name,
      subOutletName: node.name,
      locationName: node.name,
      companyNameEnglish: node.name,
      organizationName: node.name,
      code: node.organizationCode || node.shortCode,
      organizationCode: node.organizationCode,
      subOutletCode: node.organizationCode || node.shortCode,
      locationCode: node.organizationCode || node.shortCode,
      shortCode: node.shortCode,
      companyCode: node.shortCode || node.organizationCode,
      level: node.level || rawLevel,
      orgType: node.level || rawLevel,
      organizationType: node.level || rawLevel,
      parentId: parents.currentParentId || null,
      outletId: parents.outletId || null,
      organizationId: parents.outletId || nodeId,
      subOutletId: parents.subOutletId || null,
    };

    const isCompany = rawLevel === 'SUB_COMPANY' || rawLevel === 'COMPANY' || rawLevel === 'SUBCOMPANY';
    const isOutlet = rawLevel === 'OUTLET' || rawLevel === 'UNIT';
    const isSubOutlet =
      rawLevel === 'SUB_OUTLET' ||
      rawLevel === 'SUBOUTLET' ||
      rawLevel === 'SUB_UNIT' ||
      rawLevel === 'SUBUNIT' ||
      (rawLevel === 'LOCATION' && !parents.subOutletId);
    const isSubLocation =
      rawLevel === 'SUB_LOCATION' ||
      rawLevel === 'SUBLOCATION' ||
      rawLevel === 'STORE' ||
      rawLevel === 'KITCHEN' ||
      rawLevel === 'POS' ||
      (rawLevel === 'LOCATION' && Boolean(parents.subOutletId));

    if (isCompany) {
      companies.push(currentInfo);
    } else if (isOutlet) {
      outlets.push(currentInfo);
      parents = { ...parents, outletId: nodeId };
      subOutletsByOutletId[nodeId] = subOutletsByOutletId[nodeId] || [];
      subOutletsByOutletId[String(nodeId)] = subOutletsByOutletId[nodeId];
      locationsByOutletId.stores[nodeId] = locationsByOutletId.stores[nodeId] || [];
      locationsByOutletId.kitchens[nodeId] = locationsByOutletId.kitchens[nodeId] || [];
      locationsByOutletId.pos[nodeId] = locationsByOutletId.pos[nodeId] || [];
    } else if (isSubOutlet) {
      subOutlets.push(currentInfo);
      if (parents.outletId) {
        subOutletsByOutletId[parents.outletId] = subOutletsByOutletId[parents.outletId] || [];
        subOutletsByOutletId[parents.outletId].push(currentInfo);
        subOutletsByOutletId[String(parents.outletId)] = subOutletsByOutletId[parents.outletId];
      }
      parents = { ...parents, subOutletId: nodeId };
      subLocationsBySubOutletId[nodeId] = subLocationsBySubOutletId[nodeId] || [];
      subLocationsBySubOutletId[String(nodeId)] = subLocationsBySubOutletId[nodeId];
    } else if (isSubLocation) {
      const locType = classifyLocationType(node);
      const locData = { ...currentInfo, locationType: locType };
      subLocations.push(locData);

      if (parents.subOutletId) {
        subLocationsBySubOutletId[parents.subOutletId] =
          subLocationsBySubOutletId[parents.subOutletId] || [];
        subLocationsBySubOutletId[parents.subOutletId].push(locData);
        subLocationsBySubOutletId[String(parents.subOutletId)] = subLocationsBySubOutletId[parents.subOutletId];
      }

      if (parents.outletId) {
        if (locType === 'STORE') {
          locationsByOutletId.stores[parents.outletId] =
            locationsByOutletId.stores[parents.outletId] || [];
          locationsByOutletId.stores[parents.outletId].push(locData);
        }
        if (locType === 'KITCHEN') {
          locationsByOutletId.kitchens[parents.outletId] =
            locationsByOutletId.kitchens[parents.outletId] || [];
          locationsByOutletId.kitchens[parents.outletId].push(locData);
        }
        if (locType === 'POS') {
          locationsByOutletId.pos[parents.outletId] =
            locationsByOutletId.pos[parents.outletId] || [];
          locationsByOutletId.pos[parents.outletId].push(locData);
        }
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child) =>
        traverse(child, {
          ...parents,
          currentParentId: nodeId,
        })
      );
    }
  }

  traverse(rootNode);

  const rootId = rootNode.internalId ?? rootNode.id ?? rootNode.organizationId;
  const rootLevel = (rootNode.level || '').toUpperCase().replace(/[\s_-]/g, '_');

  // If the root node itself is an OUTLET, ensure it's in the outlets list
  if ((rootLevel === 'OUTLET' || rootLevel === 'UNIT') && !outlets.some((o) => o.id === rootId)) {
    outlets.unshift({
      id: rootId,
      name: rootNode.name,
      code: rootNode.organizationCode,
      shortCode: rootNode.shortCode,
      level: rootNode.level,
      parentId: null,
      outletId: rootId,
      subOutletId: null,
    });
  }

  return {
    rawTree: rootNode,
    userLevel: rootNode.level,
    userOrg: {
      id: rootNode.internalId,
      name: rootNode.name,
      code: rootNode.organizationCode,
      shortCode: rootNode.shortCode,
      level: rootNode.level,
    },
    companies,
    outlets,
    subOutlets,
    subLocations,
    subOutletsByOutletId,
    subLocationsBySubOutletId,
    locationsByOutletId,
  };
}

export function invalidateOrgHierarchy() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('invalidate-org-hierarchy'));
  }
}

/**
 * Parses accessibleScope from login or user auth and determines the user's
 * most specific assigned scope level: 'SUBLOCATION' | 'SUBUNIT' | 'UNIT' | 'COMPANY' | 'GROUP'.
 *
 * Rules:
 * - If user has sublocations assigned: userLevel is 'SUBLOCATION' (upper levels: subunits, units, companies hidden).
 * - If user has subunits assigned (no sublocations): userLevel is 'SUBUNIT' (upper levels: units, companies hidden).
 * - If user has units assigned (no subunits/sublocations): userLevel is 'UNIT' (upper level: companies hidden).
 * - If user has companies assigned (no units/subunits/sublocations): userLevel is 'COMPANY'.
 * - If group user: userLevel is 'GROUP'.
 */
export function extractAccessibleScopeHierarchy(scope, fallbackCompanies = []) {
  if (!scope) {
    return {
      userLevel: 'COMPANY',
      isGroupUser: false,
      assignedSubLocations: [],
      assignedSubUnits: [],
      assignedUnits: [],
      assignedCompanies: [],
      groups: [],
    };
  }

  const isGroupEntity = (item) => {
    if (!item) return false;
    const type = (item.organizationType || item.orgType || item.type || item.level || '').toUpperCase();
    if (type === 'SUB_COMPANY' || type === 'OUTLET' || type === 'SUB_OUTLET' || type === 'LOCATION') {
      return false;
    }
    if (type === 'GROUP') return true;
    const name = (item.name || item.companyName || item.organizationName || '').toUpperCase().trim();
    return name === 'JAISWAL GROUP';
  };

  const assignments = Array.isArray(scope.assignments) ? scope.assignments : [];
  const activeAssignments = assignments.filter((a) => a.isActive !== false);

  const isGroupUser = Boolean(
    scope.isGroupLevelAccess ||
    (scope.accessibleGroups && scope.accessibleGroups.length > 0) ||
    activeAssignments.some((a) => a.organizationType === 'GROUP' || isGroupEntity(a))
  );

  // 0. Groups
  const groups = [];
  const seenGroups = new Set();
  (scope.accessibleGroups || []).forEach((g) => {
    const id = g.organizationId ?? g.id ?? g.groupId;
    if (id && !seenGroups.has(Number(id))) {
      seenGroups.add(Number(id));
      groups.push({
        id: Number(id),
        name: g.name || g.companyName || g.groupName || 'JAISWAL GROUP',
        code: g.code || g.companyCode || 'JG',
      });
    }
  });
  activeAssignments.forEach((a) => {
    if (a.organizationType === 'GROUP' || isGroupEntity(a)) {
      const id = a.organizationId ?? a.companyId ?? a.id;
      if (id && !seenGroups.has(Number(id))) {
        seenGroups.add(Number(id));
        groups.push({
          id: Number(id),
          name: a.organizationName || a.companyName || 'JAISWAL GROUP',
          code: a.organizationCode || 'JG',
        });
      }
    }
  });
  if (isGroupUser && groups.length === 0) {
    groups.push({
      id: Number(scope.groupId || scope.organizationId || 1),
      name: 'JAISWAL GROUP',
      code: 'JG',
    });
  }

  // 1. Sub-Locations (lowest granular level)
  const assignedSubLocations = [];
  const seenSubLoc = new Set();
  activeAssignments.forEach((a) => {
    const slId = a.subLocationId;
    if (slId && !seenSubLoc.has(Number(slId))) {
      seenSubLoc.add(Number(slId));

      let outletId = a.outletId ? Number(a.outletId) : null;
      let outletName = a.outletName || '';
      if (!outletId && (a.organizationType === 'OUTLET' || a.organizationType === 'SUB_OUTLET' || a.organizationType === 'LOCATION')) {
        outletId = Number(a.organizationId);
        outletName = a.organizationName || '';
      }

      let subOutletId = a.subOutletId ? Number(a.subOutletId) : null;
      let subOutletName = a.subOutletName || '';

      // If subOutletId is missing, check if any SUB_OUTLET assignment matches this outlet
      if (!subOutletId && outletId) {
        const matchingSub = activeAssignments.find(
          (other) => other.subOutletId && (Number(other.outletId) === outletId || Number(other.organizationId) === outletId)
        );
        if (matchingSub) {
          subOutletId = Number(matchingSub.subOutletId);
          subOutletName = matchingSub.subOutletName || '';
        }
      }

      let companyId = a.companyId ? Number(a.companyId) : (a.organizationType === 'SUB_COMPANY' ? Number(a.organizationId) : null);
      let companyName = a.companyName || '';

      assignedSubLocations.push({
        id: Number(slId),
        name: a.subLocationName || `Sub-Location #${slId}`,
        type: a.subLocationType || '',
        subOutletId,
        subOutletName,
        outletId,
        outletName,
        companyId,
        companyName,
        isDefault: Boolean(a.isDefault),
      });
    }
  });
  (scope.accessibleSubLocations || []).forEach((sl) => {
    const slId = sl.id ?? sl.subLocationId;
    if (slId && !seenSubLoc.has(Number(slId))) {
      seenSubLoc.add(Number(slId));
      assignedSubLocations.push({
        id: Number(slId),
        name: sl.name || sl.subLocationName || `Sub-Location #${slId}`,
        type: sl.type || sl.subLocationType || '',
        subOutletId: sl.subOutletId ? Number(sl.subOutletId) : (sl.parentId ? Number(sl.parentId) : null),
        subOutletName: sl.subOutletName || '',
        outletId: sl.outletId ? Number(sl.outletId) : null,
        outletName: sl.outletName || '',
        companyId: sl.companyId ? Number(sl.companyId) : null,
        companyName: sl.companyName || '',
        isDefault: false,
      });
    }
  });

  // 2. Sub-Units
  const assignedSubUnits = [];
  const seenSubUnit = new Set();
  activeAssignments.forEach((a) => {
    const suId = a.subOutletId;
    if (suId && !seenSubUnit.has(Number(suId))) {
      seenSubUnit.add(Number(suId));

      let outletId = a.outletId ? Number(a.outletId) : null;
      let outletName = a.outletName || '';
      if (!outletId && (a.organizationType === 'OUTLET' || a.organizationType === 'SUB_OUTLET' || a.organizationType === 'LOCATION')) {
        outletId = Number(a.organizationId);
        outletName = a.organizationName || '';
      }

      let companyId = a.companyId ? Number(a.companyId) : (a.organizationType === 'SUB_COMPANY' ? Number(a.organizationId) : null);
      let companyName = a.companyName || '';

      assignedSubUnits.push({
        id: Number(suId),
        name: a.subOutletName || `Sub-Unit #${suId}`,
        type: a.subOutletType || '',
        outletId,
        outletName,
        companyId,
        companyName,
        isDefault: Boolean(a.isDefault),
      });
    }
  });
  (scope.accessibleSubOutlets || []).forEach((so) => {
    const suId = so.id ?? so.subOutletId;
    if (suId && !seenSubUnit.has(Number(suId))) {
      seenSubUnit.add(Number(suId));
      assignedSubUnits.push({
        id: Number(suId),
        name: so.name || so.subOutletName || `Sub-Unit #${suId}`,
        type: so.type || so.subOutletType || '',
        outletId: so.outletId ? Number(so.outletId) : null,
        outletName: so.outletName || '',
        companyId: so.companyId ? Number(so.companyId) : null,
        companyName: so.companyName || '',
        isDefault: false,
      });
    }
  });

  // 3. Units
  const assignedUnits = [];
  const seenUnit = new Set();
  activeAssignments.forEach((a) => {
    const oId = a.outletId || (a.organizationType === 'OUTLET' ? a.organizationId : null);
    if (oId && !seenUnit.has(Number(oId))) {
      seenUnit.add(Number(oId));
      assignedUnits.push({
        id: Number(oId),
        name: a.outletName || a.organizationName || `Unit #${oId}`,
        code: a.organizationCode || a.outletCode || '',
        companyId: a.companyId ? Number(a.companyId) : (a.organizationType === 'SUB_COMPANY' ? Number(a.organizationId) : null),
        companyName: a.companyName || '',
        isDefault: Boolean(a.isDefault),
      });
    }
  });
  (scope.accessibleOutlets || []).forEach((o) => {
    const oId = o.id ?? o.organizationId ?? o.outletId;
    if (oId && !seenUnit.has(Number(oId))) {
      seenUnit.add(Number(oId));
      assignedUnits.push({
        id: Number(oId),
        name: o.name || o.outletName || `Unit #${oId}`,
        code: o.code || o.outletCode || '',
        companyId: o.companyId ? Number(o.companyId) : null,
        companyName: o.companyName || '',
        isDefault: false,
      });
    }
  });

  // 4. Companies
  const assignedCompanies = [];
  const seenComp = new Set();
  activeAssignments.forEach((a) => {
    if (a.organizationType === 'GROUP' || isGroupEntity(a)) return;
    const cId = a.companyId || (a.organizationType === 'SUB_COMPANY' ? a.organizationId : null);
    if (cId && !seenComp.has(Number(cId))) {
      seenComp.add(Number(cId));
      assignedCompanies.push({
        id: Number(cId),
        name: a.companyName || a.organizationName || `Company #${cId}`,
        code: a.organizationCode || a.companyCode || '',
        isDefault: Boolean(a.isDefault),
      });
    }
  });
  (scope.accessibleCompanies || []).forEach((c) => {
    if (isGroupEntity(c)) return;
    const cId = c.id ?? c.organizationId ?? c.companyId;
    if (cId && !seenComp.has(Number(cId))) {
      seenComp.add(Number(cId));
      assignedCompanies.push({
        id: Number(cId),
        name: c.name || c.companyName || `Company #${cId}`,
        code: c.code || c.companyCode || '',
        isDefault: false,
      });
    }
  });
  fallbackCompanies.forEach((c) => {
    if (isGroupEntity(c)) return;
    const cId = c.id ?? c.organizationId ?? c.companyId;
    if (cId && !seenComp.has(Number(cId))) {
      seenComp.add(Number(cId));
      assignedCompanies.push({
        id: Number(cId),
        name: c.name || c.companyName || c.companyNameEnglish || c.organizationName || `Company #${cId}`,
        code: c.code || c.companyCode || '',
        isDefault: false,
      });
    }
  });

  // Cross-fill any missing parent names and IDs
  assignedSubUnits.forEach((su) => {
    if (su.outletId) {
      const u = assignedUnits.find((unit) => unit.id === su.outletId);
      if (u) {
        if (!su.outletName) su.outletName = u.name;
        if (!su.companyId) su.companyId = u.companyId;
        if (!su.companyName) su.companyName = u.companyName;
      }
    }
    if (su.companyId && !su.companyName) {
      const c = assignedCompanies.find((comp) => comp.id === su.companyId);
      if (c) su.companyName = c.name;
    }
  });

  assignedSubLocations.forEach((sl) => {
    if (sl.subOutletId) {
      const su = assignedSubUnits.find((subUnit) => subUnit.id === sl.subOutletId);
      if (su) {
        if (!sl.subOutletName) sl.subOutletName = su.name;
        if (!sl.outletId) sl.outletId = su.outletId;
        if (!sl.outletName) sl.outletName = su.outletName;
        if (!sl.companyId) sl.companyId = su.companyId;
        if (!sl.companyName) sl.companyName = su.companyName;
      }
    }
    if (sl.outletId) {
      const u = assignedUnits.find((unit) => unit.id === sl.outletId);
      if (u) {
        if (!sl.outletName) sl.outletName = u.name;
        if (!sl.companyId) sl.companyId = u.companyId;
        if (!sl.companyName) sl.companyName = u.companyName;
      }
    }
    if (sl.companyId && !sl.companyName) {
      const c = assignedCompanies.find((comp) => comp.id === sl.companyId);
      if (c) sl.companyName = c.name;
    }
  });

  // Determine user's effective hierarchical access level
  let userLevel = 'COMPANY';
  if (isGroupUser) {
    userLevel = 'GROUP';
  } else if (assignedSubLocations.length > 0) {
    userLevel = 'SUBLOCATION';
  } else if (assignedSubUnits.length > 0) {
    userLevel = 'SUBUNIT';
  } else if (assignedUnits.length > 0) {
    userLevel = 'UNIT';
  } else {
    userLevel = 'COMPANY';
  }

  return {
    userLevel,
    isGroupUser,
    assignedSubLocations,
    assignedSubUnits,
    assignedUnits,
    assignedCompanies,
    groups,
  };
}
