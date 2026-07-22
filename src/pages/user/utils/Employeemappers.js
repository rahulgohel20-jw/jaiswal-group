// Shared conversions between the /api/employee/* payload shape and the
// shapes the UI already works with (form state + table rows).

export const DEPARTMENT_OPTIONS = ['Manager', 'Sales', 'Marketing', 'Chef', 'Helper'];

// --- Date helpers: backend uses DD/MM/YYYY, <input type="date"> needs YYYY-MM-DD ---
const apiDateToInput = (val) => {
  if (!val) return '';
  const s = String(val);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // Already ISO (YYYY-MM-DD...) or something else — best effort
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
  firstName: '',
  middlename: '',
  lastName: '',
  userCode: '',
  username: '',
  email: '',
  company: 'Jaiswal Group India Pvt Ltd',
  password: '',
  mobile: '',
  altMobile: '',
  department: '',
  designation: '',
  salary: '',
  joiningDate: '',
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
export const mapEmployeeToForm = (emp = {}) => ({
  ...splitName(emp.fullName ?? emp.name ?? ''),
  id: emp.id ?? '',
  userCode: emp.code ?? emp.userCode ?? '',
  username: emp.username ?? emp.createdBy ?? '',
  email: emp.emailid ?? emp.email ?? '',
  company: emp.company ?? DEFAULT_FORM.company,
  password: '',
  mobile: emp.mobileNumber ?? emp.mobile ?? '',
  altMobile: emp.alternateMobile ?? emp.altMobile ?? '',
  department: DEPARTMENT_OPTIONS.includes(emp.departmentName)
    ? emp.departmentName
    : DEPARTMENT_OPTIONS.includes(emp.department)
    ? emp.department
    : '',
  designation: emp.designation ?? '',
  salary: emp.salary ?? '',
  joiningDate: apiDateToInput(emp.joiningDate),
  addressLine1: emp.addressLine1 ?? '',
  addressLine2: emp.addressLine2 ?? '',
  countryId: idOf(emp.country) || (emp.countryId ?? ''),
  stateId: idOf(emp.state) || (emp.stateId ?? ''),
  cityId: idOf(emp.city) || (emp.cityId ?? ''),
  pincode: emp.pincode ?? '',
  latitude: emp.latitude ?? '',
  longitude: emp.longitude ?? '',
});

// Registration form state -> /api/employee/save|update payload
export const buildEmployeePayload = (form, { isEditMode }) => ({
  ...(isEditMode && form.id ? { id: form.id } : {}),
  addressLine1: form.addressLine1,
  addressLine2: form.addressLine2,
  alternateMobile: form.altMobile,
  cityId: form.cityId,
  countryId: form.countryId,
  departmentId: 1, // TODO: replace with real department id once that lookup exists
  designation: form.designation,
  emailid: form.email,
  fullName: [form.firstName, form.middlename, form.lastName].filter(Boolean).join(' '),
  joiningDate: inputDateToApi(form.joiningDate),
  latitude: form.latitude,
  longitude: form.longitude,
  mobileNumber: form.mobile,
  organizationId: 1, // TODO: confirm real organization id
  ...(isEditMode ? {} : { password: form.password }),
  pincode: form.pincode,
  salary: form.salary,
  stateId: form.stateId,
  username: form.username,
});

// Employee (from API) -> user management table row
export const mapEmployeeToRow = (emp = {}) => {
  const fullName = emp.fullName ?? emp.name ?? '';
  return {
    id: emp.id,
    name: fullName,
    createdBy: emp.createdAt ? `Created ${new Date(emp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : '',
    code: emp.code ?? emp.userCode ?? '',
    email: emp.emailid ?? emp.email ?? '',
    company: emp.company ?? DEFAULT_FORM.company,
    role: emp.role ?? emp.designation ?? '',
    department: emp.departmentName ?? emp.department ?? '',
    designation: emp.designation ?? '',
    mobile: emp.mobileNumber ?? '',
    kycStatus: emp.kycStatus ?? 'Pending',
    addressLine1: emp.addressLine1 ?? '',
    addressLine2: emp.addressLine2 ?? '',
    countryId: idOf(emp.country) || (emp.countryId ?? ''),
    stateId: idOf(emp.state) || (emp.stateId ?? ''),
    cityId: idOf(emp.city) || (emp.cityId ?? ''),
    pincode: emp.pincode ?? '',
    salary: emp.salary ?? '',
    joiningDate: emp.joiningDate ?? '',
    latitude: emp.latitude ?? '',
    longitude: emp.longitude ?? '',
  };
};