// Shared conversions between the /api/employee/* payload shape and the
// shapes the UI already works with (form state + table rows).

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
  companyId: '', // sub-company (optional) — child of groupId
  outletId: '', // unit (optional) — child of companyId
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
};

// Employee (from API) -> registration form state
export const mapEmployeeToForm = (emp = {}) => {
  return {
    ...splitName(emp.fullName ?? emp.name ?? ''),
    id: emp.id ?? '',
    erpemployeecode: emp.erpemployeecode ?? emp.erpEmployeeCode ?? '',
    userCode: emp.code ?? emp.userCode ?? '',
    username: emp.username ?? emp.createdBy ?? '',
    email: emp.emailid ?? emp.email ?? '',
    // Group / Sub Company / Unit are intentionally left blank here — which
    // level the employee's flat organizationId sits at can't be determined
    // from the employee record alone. UserRegistration derives and fills
    // these in once the Group list and org tree have both loaded, via
    // deriveOrgSelection() below.
    groupId: '',
    companyId: '',
    outletId: '',
    password: '',
    mobile: emp.mobileNumber ?? emp.mobile ?? '',
    altMobile: emp.alternateMobile ?? emp.altMobile ?? '',
    deptId: emp.deptId != null ? String(emp.deptId) : idOf(emp.department) ? String(idOf(emp.department)) : '',
    departmentId: emp.deptId != null ? String(emp.deptId) : idOf(emp.department) ? String(idOf(emp.department)) : (emp.departmentId ? String(emp.departmentId) : ''),
    roleId: emp.roleId != null ? String(emp.roleId) : '',
    designation: emp.designation ?? '',
    addressLine1: emp.addressLine1 ?? '',
    addressLine2: emp.addressLine2 ?? '',
    countryId: idOf(emp.country) ? String(idOf(emp.country)) : (emp.countryId != null ? String(emp.countryId) : ''),
    stateId: idOf(emp.state) ? String(idOf(emp.state)) : (emp.stateId != null ? String(emp.stateId) : ''),
    cityId: idOf(emp.city) ? String(idOf(emp.city)) : (emp.cityId != null ? String(emp.cityId) : ''),
    pincode: emp.pincode ?? '',
    latitude: emp.latitude ?? '',
    longitude: emp.longitude ?? '',
    rawUserRights: emp.userRights ?? null,
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

export const buildEmployeePayload = (form, { isEditMode, rightsList = [] } = {}) => {
  const orgId = form.outletId || form.companyId || form.groupId || form.organizationId;
  const activeRights = Array.isArray(rightsList) && rightsList.length > 0
    ? rightsList
    : Array.isArray(form.rightsList)
      ? form.rightsList
      : [];

  return {
    ...(isEditMode && form.id ? { id: Number(form.id) } : {}),
    addressLine1: form.addressLine1 || '',
    addressLine2: form.addressLine2 || '',
    alternateMobile: form.altMobile || form.alternateMobile || '',
    cityId: Number(form.cityId) || 0,
    countryId: Number(form.countryId) || 0,
    deptId: Number(form.deptId || form.departmentId) || 0,
    designation: form.designation || '',
    emailid: form.email || form.emailid || '',
    erpemployeecode: form.erpemployeecode || '',
    fullName: form.fullName || [form.firstName, form.middlename, form.lastName].filter(Boolean).join(' '),
    latitude: form.latitude ? String(form.latitude) : '',
    longitude: form.longitude ? String(form.longitude) : '',
    mobileNumber: form.mobile || form.mobileNumber || '',
    organizationId: Number(orgId) || 0,
    ...((!isEditMode && form.password) || form.password ? { password: form.password } : {}),
    pincode: form.pincode ? String(form.pincode) : '',
    rightsList: activeRights,
    stateId: Number(form.stateId) || 0,
    username: form.username || form.erpemployeecode || form.email || '',
  };
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
    company: emp.organizationName ?? emp.company ?? '',
    role: emp.roleName ?? emp.role ?? emp.designation ?? '',
    department: emp.deptName ?? emp.dept?.name ?? emp.department?.name ?? emp.department ?? emp.roleName ?? '',
    deptId: emp.deptId ?? idOf(emp.department),
    designation: emp.designation ?? '',
    mobile: emp.mobileNumber ?? '',
    kycStatus: emp.kycStatus ?? 'Pending',
    addressLine1: emp.addressLine1 ?? '',
    addressLine2: emp.addressLine2 ?? '',
    countryId: idOf(emp.country) || (emp.countryId ?? ''),
    stateId: idOf(emp.state) || (emp.stateId ?? ''),
    cityId: idOf(emp.city) || (emp.cityId ?? ''),
    pincode: emp.pincode ?? '',
    latitude: emp.latitude ?? '',
    longitude: emp.longitude ?? '',
  };
};