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
