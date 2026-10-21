// Shared conversions between the /api/employee/* payload shape and the
// shapes the UI already works with (form state + table rows).
import { getUserIdFromToken } from '@/utils/auth';

// --- Date helpers: backend uses DD/MM/YYYY, <input type="date"> needs YYYY-MM-DD ---
const apiDateToInput = (val) => {
  if (!val) return '';
  const s = String(val);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return s.slice(0, 10);
};

const inputDateToApi = (val) => {
  if (!val) return '';
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/); // YYYY-MM-DD
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }
  return val;
};

// Unwraps varying API response shapes into a plain array or object.
export const extractList = (res) => {
  const body = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const key = Object.keys(body).find((k) => Array.isArray(body[k]));
    if (key) return body[key];
  }
  return [];
};

export const extractItem = (res) => res?.data?.data ?? res?.data ?? res;

const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middlename: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middlename: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middlename: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middlename: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

const idOf = (val) => (val && typeof val === 'object' ? val.id ?? '' : val ?? '');

export const DEFAULT_FORM = {
  id: '',
  erpemployeecode: '',
  firstName: '',
  middlename: '',
  lastName: '',
  userCode: '',
  username: '',
  email: '',
  groupId: '',
  companyId: '', // sub-company (backward compat)
  outletId: '', // unit (backward compat)
  selectedCompanies: [], // [{ id, name }]
  selectedUnits: [], // [{ id, name, parentId }]
  selectedSubUnits: [], // [{ id, name, organizationId }]
  selectedSubLocations: [], // [{ id, name, organizationId, subOutletId }]
  password: '',
  mobile: '',
  altMobile: '',
  deptId: '',
  departmentId: '',
  roleId: '',
  designation: '',
  addressLine1: '',
  addressLine2: '',
  countryId: '',
  stateId: '',
  cityId: '',
  pincode: '',
  latitude: '',
  longitude: '',
  createdBy: '',
  updatedBy: '',
};

// Builds cumulative access assignments across hierarchical selections:
// 1. Group level user: passes groupId as default AND all company IDs under that group
// 2. Selected companies: organizationId = companyId
// 3. Selected units: organizationId = unitId
// 4. Selected sub-units: organizationId = parent unitId, subOutletId = subUnitId
// 5. Selected sub-locations: organizationId = parent unitId, subOutletId = parent subOutletId, subLocationId = locId
export const buildAccessAssignments = (form = {}, options = {}) => {
  const assignments = [];
  const isEditMode = Boolean(options.isEditMode ?? form.isEditMode);
  const loggedInUserId = options.loggedInUserId ?? form.loggedInUserId ?? getUserIdFromToken() ?? 0;

  const companies = form.selectedCompanies || [];
  const units = form.selectedUnits || [];
  const subUnits = form.selectedSubUnits || [];
  const subLocations = form.selectedSubLocations || [];
  const allCompanies =
    options.allCompanies ||
    form.allCompanies ||
    options.subCompanies ||
    form.subCompanies ||
    (options.allOrgs && form.groupId
      ? options.allOrgs.filter((o) => String(o.parentId) === String(form.groupId))
      : []) ||
    [];

  const seen = new Set();
  const addAssignment = ({ organizationId, subOutletId = 0, subLocationId = 0 }) => {
    const orgIdNum = Number(organizationId) || 0;
    if (!orgIdNum) return;
    const subOutletNum = Number(subOutletId) || 0;
    const subLocationNum = Number(subLocationId) || 0;
    const key = `${orgIdNum}-${subOutletNum}-${subLocationNum}`;
    if (seen.has(key)) return;
    seen.add(key);

    const assignmentItem = {
      id: 0,
      isActive: true,
      isDefault: assignments.length === 0,
      organizationId: orgIdNum,
      subOutletId: subOutletNum,
      subLocationId: subLocationNum,
    };

    if (isEditMode) {
      if (form.id) {
        assignmentItem.userId = Number(form.id);
      }
      assignmentItem.updatedBy = Number(loggedInUserId) || 0;
    } else {
      assignmentItem.createdBy = Number(loggedInUserId) || 0;
    }

    assignments.push(assignmentItem);
  };

  // Determine if this user is configured at Group Level:
  // - Main Group is selected
  // - No units, sub-units, or sub-locations are selected
  // - And either no companies are selected (meaning All Companies) or all companies under the group are selected
  const isGroupUser = Boolean(
    form.groupId &&
    units.length === 0 &&
    subUnits.length === 0 &&
    subLocations.length === 0 &&
    (companies.length === 0 || (allCompanies.length > 0 && companies.length >= allCompanies.length))
  );

  // If group user is selected, pass the group Id along with all company IDs in access assignments
  if (isGroupUser) {
    // 1. Group ID (primary / default assignment)
    addAssignment({
      organizationId: form.groupId,
      subOutletId: 0,
      subLocationId: 0,
    });

    // 2. All companies under this group
    const targetCompanies = allCompanies.length > 0 ? allCompanies : companies;
    targetCompanies.forEach((comp) => {
      const cId = comp?.id != null ? comp.id : comp;
      if (cId) {
        addAssignment({
          organizationId: cId,
          subOutletId: 0,
          subLocationId: 0,
        });
      }
    });
  } else {
    // 1. Selected companies
    companies.forEach((comp) => {
      const cId = comp?.id != null ? comp.id : comp;
      if (cId) {
        addAssignment({
          organizationId: cId,
          subOutletId: 0,
          subLocationId: 0,
        });
      }
    });
  }

  // 2. All selected units
  units.forEach((unit) => {
    const uId = unit?.id != null ? unit.id : unit;
    if (uId) {
      addAssignment({
        organizationId: uId,
        subOutletId: 0,
        subLocationId: 0,
      });
    }
  });

  // 3. All selected sub-units (pass unitId in organizationId)
  subUnits.forEach((su) => {
    if (su?.id != null) {
      addAssignment({
        organizationId: su.organizationId || su.parentUnitId || su.parentId || 0,
        subOutletId: su.id,
        subLocationId: 0,
      });
    }
  });

  // 4. All selected sub-locations (pass unitId in organizationId, subOutletId in subOutletId)
  subLocations.forEach((loc) => {
    if (loc?.id != null) {
      addAssignment({
        organizationId: loc.organizationId || loc.parentUnitId || 0,
        subOutletId: loc.subOutletId || loc.parentSubOutletId || 0,
        subLocationId: loc.id,
      });
    }
  });

  // 5. Fallback: If group is selected and no assignments added yet
  if (assignments.length === 0 && form.groupId) {
    addAssignment({
      organizationId: form.groupId,
      subOutletId: 0,
      subLocationId: 0,
    });

    const targetCompanies = allCompanies.length > 0 ? allCompanies : companies;
    targetCompanies.forEach((comp) => {
      const cId = comp?.id != null ? comp.id : comp;
      if (cId) {
        addAssignment({
          organizationId: cId,
          subOutletId: 0,
          subLocationId: 0,
        });
      }
    });
  }

  return assignments;
};

// Employee (from API) -> registration form state
export const mapEmployeeToForm = (emp = {}) => {
  const names = splitName(emp.fullName ?? emp.name ?? '');
  const firstName = emp.firstName || names.firstName || '';
  const middlename = emp.middlename || names.middlename || '';
  const lastName = emp.lastName || names.lastName || '';
  return {
    firstName,
    middlename,
    lastName,
    id: emp.id ?? '',
    erpemployeecode: emp.erpemployeecode ?? emp.erpEmployeeCode ?? '',
    userCode: emp.code ?? emp.userCode ?? '',
    username: emp.username ?? emp.createdBy ?? '',
    email: emp.emailid ?? emp.email ?? '',
    groupId: '',
    companyId: '',
    outletId: '',
    selectedCompanies: [],
    selectedUnits: [],
    selectedSubUnits: [],
    selectedSubLocations: [],
    password: '',
    mobile: emp.mobileNumber ?? emp.mobile ?? '',
    altMobile: emp.alternateMobile ?? emp.altMobile ?? '',
    deptId: emp.deptId != null ? String(emp.deptId) : idOf(emp.department) ? String(idOf(emp.department)) : '',
    departmentId: emp.deptId != null ? String(emp.deptId) : idOf(emp.department) ? String(idOf(emp.department)) : (emp.departmentId ? String(emp.departmentId) : ''),
    roleId: emp.roleId != null ? String(emp.roleId) : '',
    designation: emp.designation ?? '',
    addressLine1: emp.addressLine1 ?? '',
    addressLine2: emp.addressLine2 ?? '',
    countryId: idOf(emp.country) && Number(idOf(emp.country)) > 0 ? String(idOf(emp.country)) : (emp.countryId != null && Number(emp.countryId) > 0 ? String(emp.countryId) : ''),
    stateId: idOf(emp.state) && Number(idOf(emp.state)) > 0 ? String(idOf(emp.state)) : (emp.stateId != null && Number(emp.stateId) > 0 ? String(emp.stateId) : ''),
    cityId: idOf(emp.city) && Number(idOf(emp.city)) > 0 ? String(idOf(emp.city)) : (emp.cityId != null && Number(emp.cityId) > 0 ? String(emp.cityId) : ''),
    pincode: emp.pincode ?? '',
    latitude: emp.latitude ?? '',
    longitude: emp.longitude ?? '',
    createdBy: emp.createdBy ?? '',
    updatedBy: emp.updatedBy ?? '',
    rawUserRights: emp.userRights ?? null,
    rawAccessAssignments: emp.accessAssignments || emp.accessibleScope?.assignments || null,
    rawAccessibleScope: emp.accessibleScope || null,
  };
};

// Pulls the flat organization id an employee is registered under, whatever
// shape the API returns it in (nested object or plain id field).
export const getEmployeeOrgId = (emp = {}) =>
  idOf(emp.organization) || emp.organizationId || '';

// Given the flat org id an employee is registered under, climbs the org tree
// to work out which level it sits at (Group / Sub Company / Unit) and fills
// in the other two ids accordingly. Needs the loaded Group list (each
// {id, name}) and the raw Sub Company/Unit org tree (each {id, parentId, ...})
// — both are fetched by the registration screen, this stays a pure function
// so it's easy to test independent of that fetching.
export const deriveOrgSelection = (orgId, groups = [], allOrgs = []) => {
  if (!orgId) return { groupId: '', companyId: '', outletId: '' };

  const idStr = String(orgId);
  const groupIds = new Set(groups.map((g) => String(g.id)));
  const orgById = new Map(allOrgs.map((o) => [String(o.id), o]));

  // Selected org IS a Group.
  if (groupIds.has(idStr)) {
    return { groupId: idStr, companyId: '', outletId: '' };
  }

  const entity = orgById.get(idStr);
  if (!entity) {
    // Unknown id (org tree not loaded yet, or a stale/deleted org) — leave
    // blank rather than guessing wrong.
    return { groupId: '', companyId: '', outletId: '' };
  }

  const parentIdStr = String(entity.parentId);

  // Direct child of a Group => Sub Company.
  if (groupIds.has(parentIdStr)) {
    return { groupId: parentIdStr, companyId: idStr, outletId: '' };
  }

  // Otherwise it's a Unit — its parent is a Sub Company, whose own parent
  // is the Group.
  const parentEntity = orgById.get(parentIdStr);
  const grandParentId = parentEntity ? String(parentEntity.parentId) : '';

  return {
    groupId: grandParentId,
    companyId: parentIdStr,
    outletId: idStr,
  };
};

export const buildEmployeePayload = (
  form,
  { isEditMode, rightsList = [], loggedInUserId, allCompanies, allOrgs } = {}
) => {
  const currentUserId = loggedInUserId ?? getUserIdFromToken() ?? 0;

  const accessAssignments = buildAccessAssignments(form, {
    isEditMode,
    loggedInUserId: currentUserId,
    allCompanies,
    allOrgs,
  });

  const companies = form.selectedCompanies || [];
  const units = form.selectedUnits || [];
  const subUnits = form.selectedSubUnits || [];
  const subLocations = form.selectedSubLocations || [];
  const companiesList = allCompanies || form.allCompanies || [];

  const isGroupUser = Boolean(
    form.groupId &&
    units.length === 0 &&
    subUnits.length === 0 &&
    subLocations.length === 0 &&
    (companies.length === 0 || (companiesList.length > 0 && companies.length >= companiesList.length))
  );

  const primaryOrgId = isGroupUser
    ? form.groupId
    : (form.selectedUnits?.[0]?.id ||
       form.selectedCompanies?.[0]?.id ||
       form.groupId ||
       form.outletId ||
       form.companyId ||
       form.organizationId ||
       accessAssignments?.[0]?.organizationId ||
       0);

  const activeRights =
    Array.isArray(rightsList) && rightsList.length > 0
      ? rightsList
      : Array.isArray(form.rightsList)
      ? form.rightsList
      : [];

  const payload = {
    ...(isEditMode && form.id ? { id: Number(form.id) } : {}),
    accessAssignments,
    addressLine1: form.addressLine1 || '',
    addressLine2: form.addressLine2 || '',
    alternateMobile: form.altMobile || form.alternateMobile || '',


    ...(Number(form.countryId) > 0 ? { countryId: Number(form.countryId) } : {}),
    ...(Number(form.stateId) > 0 ? { stateId: Number(form.stateId) } : {}),
    ...(Number(form.cityId) > 0 ? { cityId: Number(form.cityId) } : {}),

    deptId: Number(form.deptId || form.departmentId) || 0,
    designation: form.designation || '',
    emailid: form.email || form.emailid || '',
    erpemployeecode: form.erpemployeecode || '',
    fullName:
      form.fullName ||
      [form.firstName, form.middlename, form.lastName].filter(Boolean).join(' '),
    latitude: form.latitude ? String(form.latitude) : '',
    longitude: form.longitude ? String(form.longitude) : '',
    mobileNumber: form.mobile || form.mobileNumber || '',
    organizationId: Number(primaryOrgId) || 0,
    ...((!isEditMode && form.password) || form.password ? { password: form.password } : {}),
    pincode: form.pincode ? String(form.pincode) : '',
    rightsList: activeRights,

    username: form.username || form.erpemployeecode || form.email || '',
  };

  if (isEditMode) {
    payload.updatedBy = Number(currentUserId) || 0;
  } else {
    payload.createdBy = Number(currentUserId) || 0;
  }

  return payload;
};

// Employee (from API) -> user management table row
export const mapEmployeeToRow = (emp = {}) => {
  const fullName = emp.fullName ?? emp.name ?? '';
  return {
    id: emp.id,
    name: fullName,
    createdBy: emp.createdAt ? `Created ${new Date(emp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : '',
    code: emp.code ?? emp.userCode ?? '',
    erpemployeecode: emp.erpemployeecode ?? emp.erpEmployeeCode ?? emp.code ?? '',
    email: emp.emailid ?? emp.email ?? '',
    company:
      emp.organizationName ||
      (emp.accessibleScope?.accessibleCompanies?.map((c) => c.name || c.companyName).filter(Boolean).join(', ')) ||
      emp.company ||
      '',
    role: emp.roleName ?? emp.role ?? emp.designation ?? '',
    department: emp.deptName ?? emp.dept?.name ?? emp.department?.name ?? emp.department ?? emp.roleName ?? '',
    deptId: emp.deptId ?? idOf(emp.department),
    designation: emp.designation ?? '',
    mobile: emp.mobileNumber ?? '',
    kycStatus: emp.kycStatus ?? 'Pending',
    addressLine1: emp.addressLine1 ?? '',
    addressLine2: emp.addressLine2 ?? '',
    countryId: (idOf(emp.country) && Number(idOf(emp.country)) > 0 ? idOf(emp.country) : '') || (emp.countryId && Number(emp.countryId) > 0 ? emp.countryId : ''),
    stateId: (idOf(emp.state) && Number(idOf(emp.state)) > 0 ? idOf(emp.state) : '') || (emp.stateId && Number(emp.stateId) > 0 ? emp.stateId : ''),
    cityId: (idOf(emp.city) && Number(idOf(emp.city)) > 0 ? idOf(emp.city) : '') || (emp.cityId && Number(emp.cityId) > 0 ? emp.cityId : ''),
    pincode: emp.pincode ?? '',
    latitude: emp.latitude ?? '',
    longitude: emp.longitude ?? '',
  };
};