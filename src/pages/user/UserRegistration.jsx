import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notify } from '@/utils/toast';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Map,
  MapPin,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  getActiveCompany,
  getAllCountries,                                         
  getAllDepartmentMaster,
  getAllRoleMasterByUserId,
  getCitiesByState,
  getEmployeeById,
  getOrganizationByType,
  getPages,
  getStatesByCountry,
  getUserRightsByRole,
  saveEmployee,
  updateEmployee,
} from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import SearchableSelect from '../../utils/SearchableSelect';
import {
  buildEmployeePayload,
  DEFAULT_FORM,
  deriveOrgSelection,
  extractItem,
  extractList,
  getEmployeeOrgId,
  mapEmployeeToForm,
} from './utils/Employeemappers';
import { Container } from '@/components/common/container';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const errorInputCls =
  'w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const ErrorText = ({ message }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null;

const SectionCard = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, open, onToggle }) => (
  <div
    className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 cursor-pointer select-none"
    onClick={onToggle}
  >
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
    >
      <ChevronDown
        className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
  </div>
);

const MapPickerModal = ({ initialLat, initialLng, onConfirm, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState({
    lat: initialLat ? parseFloat(initialLat) : 23.0225,
    lng: initialLng ? parseFloat(initialLng) : 72.5714,
  });
  const [loaded, setLoaded] = useState(
    !!(typeof window !== 'undefined' && window.L),
  );

  useEffect(() => {
    if (window.L) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    if (!document.querySelector('link[data-leaflet]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.setAttribute('data-leaflet', 'true');
      document.head.appendChild(cssLink);
    }

    const existingScript = document.querySelector('script[data-leaflet]');
    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => !cancelled && setLoaded(true),
      );
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.setAttribute('data-leaflet', 'true');
      script.onload = () => !cancelled && setLoaded(true);
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      draggable: true,
    }).addTo(map);

    const updateFromLatLng = (latlng) => {
      setCoords({ lat: latlng.lat, lng: latlng.lng });
      marker.setLatLng(latlng);
    };

    map.on('click', (e) => updateFromLatLng(e.latlng));
    marker.on('dragend', () => updateFromLatLng(marker.getLatLng()));

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [loaded]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Pick Location on Map
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click on the map or drag the pin to set coordinates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          {!loaded && (
            <div className="h-80 flex items-center justify-center text-sm text-gray-400">
              Loading map...
            </div>
          )}
          <div
            ref={mapRef}
            className={loaded ? 'h-80 w-full' : 'h-0 w-full overflow-hidden'}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Lat:{' '}
              <span className="font-semibold text-gray-800">
                {coords.lat.toFixed(6)}
              </span>
            </span>
            <span>
              Lng:{' '}
              <span className="font-semibold text-gray-800">
                {coords.lng.toFixed(6)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(coords)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Check className="w-4 h-4" />
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ACTIONS = [
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'view', label: 'View' },
  { key: 'delete', label: 'Delete' },
];

const emptyRow = { add: false, edit: false, view: false, delete: false };
const fullRow = { add: true, edit: true, view: true, delete: true };

const normalizePages = (res) => {
  const modules = res?.data?.data?.ModuleWiseUserRights ?? [];
  const grouped = {};
  modules.forEach((m) => {
    grouped[m.moduleName] = (m.userRightsPages ?? []).map((p) => ({
      id: p.pageId,
      name: p.pagename,
      moduleId: m.moduleId,
    }));
  });
  return grouped;
};

const normalizeExistingRights = (res) => {
  const raw = res?.data?.data ?? res?.data ?? res ?? {};
  const modules =
    raw?.UserRights ??
    raw?.userRights?.userRights ??
    raw?.userRights ??
    (Array.isArray(raw) ? raw : []);

  const map = {};
  if (Array.isArray(modules)) {
    modules.forEach((m) => {
      const pageList = m.userRights ?? m.pages ?? (Array.isArray(m) ? m : []);
      pageList.forEach((r) => {
        const pid = r.pageid ?? r.pageId ?? r.id;
        if (pid != null) {
          map[pid] = {
            add: Boolean(r.add),
            edit: Boolean(r.edit),
            view: Boolean(r.view),
            delete: Boolean(r.delete),
          };
        }
      });
    });
  }
  return map;
};

// Password must be at least 8 chars with 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const EMAIL_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$/;

const KNOWN_TLDS = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'info', 'biz', 'co', 'in',
  'io', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'ai', 'me',
  'app', 'dev', 'tech', 'store', 'online', 'xyz', 'name', 'pro',
]);

const isValidEmail = (rawEmail) => {
  const email = rawEmail.trim();
  if (!email) return false;
  if (email.includes('..')) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  const tld = email.split('.').pop().toLowerCase();
  return KNOWN_TLDS.has(tld);
};

const MOBILE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;

const UserRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const editingUser = location.state?.user ?? null;
  const isEditMode = !!editingUser;

  const [openSections, setOpenSections] = useState({
    personal: true,
    address: true,
    permissions: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loadingUser, setLoadingUser] = useState(false);
  const [employeeOrgId, setEmployeeOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Location lookups
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Departments from /api/department/getall
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Roles from /api/rolemaster/getall
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Permissions / Pages state
  const [pagesByModule, setPagesByModule] = useState({});
  const [checks, setChecks] = useState({});
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingRoleRights, setLoadingRoleRights] = useState(false);

  // Groups and organization tree
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Fetch GROUP-type orgs once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const res = await getOrganizationByType('GROUP');
        if (!cancelled) {
          const list = extractList(res).map((g) => ({
            id: g.id,
            name: g.companyNameEnglish || g.name || '',
          }));
          setGroups(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    };
    fetchGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch remaining org tree (sub-companies, units) once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchOrgs = async () => {
      setLoadingOrgs(true);
      try {
        const res = await getActiveCompany();
        const list = extractList(res);
        if (!cancelled) setAllOrgs(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) setAllOrgs([]);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };
    fetchOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch departments from new Department Master API (/api/department/getall)
  useEffect(() => {
    let cancelled = false;
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await getAllDepartmentMaster();
        if (!cancelled) {
          const list = extractList(res).map((d) => ({
            id: d.id,
            name: d.name ?? d.departmentName ?? '',
          }));
          setDepartments(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    };
    fetchDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch roles from Role Master API (/api/rolemaster/getall)
  useEffect(() => {
    let cancelled = false;
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await getAllRoleMasterByUserId(getUserIdFromToken());
        if (!cancelled) {
          const list = extractList(res).map((r) => ({
            id: r.id,
            name: r.name ?? r.roleName ?? '',
          }));
          setRoles(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };
    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch module pages definition for permissions grid
  useEffect(() => {
    let cancelled = false;
    const fetchModulePages = async () => {
      setLoadingPages(true);
      try {
        const pagesRes = await getPages(false, true);
        if (!cancelled) {
          setPagesByModule(normalizePages(pagesRes));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    };
    fetchModulePages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select single group if only 1 exists
  useEffect(() => {
    if (!isEditMode && groups.length === 1 && !form.groupId) {
      setForm((f) => ({ ...f, groupId: String(groups[0].id) }));
    }
  }, [groups, isEditMode, form.groupId]);

  // Sub Companies
  const subCompanies = useMemo(
    () =>
      form.groupId
        ? allOrgs
            .filter((o) => String(o.parentId) === String(form.groupId))
            .map((c) => ({ id: c.id, name: c.companyNameEnglish || c.name }))
        : [],
    [allOrgs, form.groupId],
  );

  // Units
  const outlets = useMemo(
    () =>
      form.companyId
        ? allOrgs
            .filter((o) => String(o.parentId) === String(form.companyId))
            .map((u) => ({ id: u.id, name: u.companyNameEnglish || u.name }))
        : [],
    [allOrgs, form.companyId],
  );

  const handleGroupChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, groupId: value, companyId: '', outletId: '' }));
    setErrors((prev) => ({
      ...prev,
      groupId: undefined,
      companyId: undefined,
      outletId: undefined,
    }));
  };

  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, companyId: value, outletId: '' }));
    setErrors((prev) => ({
      ...prev,
      companyId: undefined,
      outletId: undefined,
    }));
  };

  const handleUnitChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, outletId: value }));
    setErrors((prev) => ({ ...prev, outletId: undefined }));
  };

  // Edit mode: fetch employee by ID and load their permissions
  useEffect(() => {
    setErrors({});
    setSubmitError('');
    setStates([]);
    setCities([]);

    if (!editingUser?.id) {
      setForm(DEFAULT_FORM);
      setEmployeeOrgId('');
      setChecks({});
      return;
    }

    let cancelled = false;
    const fetchEmployee = async () => {
      setLoadingUser(true);
      try {
        const res = await getEmployeeById(editingUser.id);
        const emp = extractItem(res);
        if (!cancelled) {
          setForm(mapEmployeeToForm(emp));
          setEmployeeOrgId(getEmployeeOrgId(emp));

          // Load employee's existing user rights if present in getbyid response
          const initialChecks = normalizeExistingRights(emp);
          if (Object.keys(initialChecks).length > 0) {
            setChecks(initialChecks);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setForm(mapEmployeeToForm(editingUser));
          setEmployeeOrgId(getEmployeeOrgId(editingUser));
        }
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };
    fetchEmployee();

    return () => {
      cancelled = true;
    };
  }, [editingUser?.id]);

  // Pre-select Group / Sub Company / Unit in edit mode
  useEffect(() => {
    if (!isEditMode || !employeeOrgId) return;
    if (loadingGroups || loadingOrgs) return;

    const derived = deriveOrgSelection(employeeOrgId, groups, allOrgs);
    setForm((f) => ({ ...f, ...derived }));
  }, [isEditMode, employeeOrgId, groups, allOrgs, loadingGroups, loadingOrgs]);

  // Load countries once
  useEffect(() => {
    let cancelled = false;
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await getAllCountries();
        if (!cancelled) setCountries(extractList(res));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    fetchCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load states whenever countryId changes
  useEffect(() => {
    if (!form.countryId) {
      setStates([]);
      return;
    }
    let cancelled = false;
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await getStatesByCountry(form.countryId);
        if (!cancelled) setStates(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setStates([]);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  // Load cities whenever stateId changes
  useEffect(() => {
    if (!form.stateId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await getCitiesByState(form.stateId);
        if (!cancelled) setCities(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };
    fetchCities();
    return () => {
      cancelled = true;
    };
  }, [form.stateId]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // When a role is selected, fetch all assigned rights for that role and populate the permissions grid
  const handleRoleChange = async (selectedRoleId) => {
    set('roleId', selectedRoleId);
    if (!selectedRoleId) return;

    setLoadingRoleRights(true);
    try {
      const res = await getUserRightsByRole(selectedRoleId);
      const rightsMap = normalizeExistingRights(res);
      setChecks(rightsMap);
      notify.success('Permissions loaded for selected role');
    } catch (err) {
      console.error(err);
      notify.error('Failed to load permissions for the selected role.');
    } finally {
      setLoadingRoleRights(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, email: value }));
    setErrors((prev) => {
      if (!value.trim()) return { ...prev, email: undefined };
      if (!isValidEmail(value))
        return { ...prev, email: 'Enter a valid email address' };
      return { ...prev, email: undefined };
    });
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, countryId: value, stateId: '', cityId: '' }));
    setStates([]);
    setCities([]);
    setErrors((prev) => ({
      ...prev,
      countryId: undefined,
      stateId: undefined,
      cityId: undefined,
    }));
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, stateId: value, cityId: '' }));
    setCities([]);
    setErrors((prev) => ({ ...prev, stateId: undefined, cityId: undefined }));
  };

  const handleCityChange = (e) => {
    set('cityId', e.target.value);
  };

  // --- Permissions Matrix Checkbox Logic ---
  const allPageIds = useMemo(
    () =>
      Object.values(pagesByModule)
        .flat()
        .map((p) => p.id),
    [pagesByModule],
  );

  const toggle = (pageId, actionKey) => {
    setChecks((prev) => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] ?? emptyRow),
        [actionKey]: !prev[pageId]?.[actionKey],
      },
    }));
  };

  const isColumnFullyChecked = (actionKey) =>
    allPageIds.length > 0 && allPageIds.every((id) => checks[id]?.[actionKey]);

  const toggleColumn = (actionKey) => {
    const shouldCheck = !isColumnFullyChecked(actionKey);
    setChecks((prev) => {
      const next = { ...prev };
      allPageIds.forEach((id) => {
        next[id] = { ...(next[id] ?? emptyRow), [actionKey]: shouldCheck };
      });
      return next;
    });
  };

  const isRowFullyChecked = (pageId) =>
    ACTIONS.every((a) => Boolean(checks[pageId]?.[a.key]));

  const toggleRow = (pageId) => {
    const shouldCheck = !isRowFullyChecked(pageId);
    setChecks((prev) => ({
      ...prev,
      [pageId]: shouldCheck ? { ...fullRow } : { ...emptyRow },
    }));
  };

  const isEverythingChecked =
    allPageIds.length > 0 && allPageIds.every((id) => isRowFullyChecked(id));

  const toggleEverything = () => {
    const shouldCheck = !isEverythingChecked;
    setChecks((prev) => {
      const next = { ...prev };
      allPageIds.forEach((id) => {
        next[id] = shouldCheck ? { ...fullRow } : { ...emptyRow };
      });
      return next;
    });
  };

  const buildRightsList = () => {
    return Object.values(pagesByModule)
      .flat()
      .map((page) => {
        const row = checks[page.id] ?? emptyRow;
        return {
          pageid: page.id,
          moduleId: page.moduleId || 0,
          add: Boolean(row.add),
          edit: Boolean(row.edit),
          view: Boolean(row.view),
          delete: Boolean(row.delete),
        };
      })
      .filter((r) => r.add || r.edit || r.view || r.delete);
  };

  const validate = () => {
    const e = {};

    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';

    if (!form.erpemployeecode?.trim())
      e.erpemployeecode = 'Employee code is required';

    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!isValidEmail(form.email))
      e.email = 'Enter a valid email address (check the domain spelling)';

    if (!isEditMode) {
      if (!form.password) e.password = 'Password is required';
      else if (!PASSWORD_REGEX.test(form.password))
        e.password =
          'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';
    }

    if (!form.mobile.trim()) e.mobile = 'Mobile number is required';
    else if (!MOBILE_REGEX.test(form.mobile))
      e.mobile = 'Enter a valid 10-digit mobile number';

    if (form.altMobile && !MOBILE_REGEX.test(form.altMobile))
      e.altMobile = 'Enter a valid 10-digit mobile number';

    if (!form.groupId) e.groupId = 'Group is required';

    const selectedDept = form.deptId || form.departmentId;
    if (!selectedDept) e.deptId = 'Department is required';

    if (!form.designation.trim()) e.designation = 'Designation is required';

    if (form.pincode?.trim() && !PINCODE_REGEX.test(form.pincode))
      e.pincode = 'Enter a valid 6-digit pincode';

    return e;
  };

  const focusFirstError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = document.querySelector(`[name="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus?.();
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }

    const rightsList = buildRightsList();
    const payload = buildEmployeePayload(form, { isEditMode, rightsList });

    setSubmitting(true);
    setSubmitError('');

    try {
      if (isEditMode) {
        await updateEmployee(payload);
      } else {
        await saveEmployee(payload);
      }
      navigate('/users');
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      const errorMsg =
        data?.errorMessage ||
        data?.message ||
        (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
        err?.message ||
        `Something went wrong while ${isEditMode ? 'updating' : 'saving'} this user. Please try again.`;
      setSubmitError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    const rightsList = buildRightsList();
    const payload = buildEmployeePayload(form, { isEditMode: false, rightsList });
    setSubmitting(true);
    setSubmitError('');
    try {
      await saveEmployee(payload);
      setForm(DEFAULT_FORM);
      setChecks({});
      notify.success('User Created Successfully');
      setStates([]);
      setCities([]);
      setErrors({});
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      const errorMsg =
        data?.errorMessage ||
        data?.message ||
        (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
        err?.message ||
        'Something went wrong while saving this user. Please try again.';
      setSubmitError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="mx-auto p-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/')}>
            Dashboard
          </span>
          <ChevronRight size={12} />
          <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate(-1)}>
            Users
          </span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            {isEditMode ? 'Update User' : 'Add User'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-[#101828] text-[28px]">
            {isEditMode ? 'Update User' : 'User Registration'}
          </h1>
          <p className="text-[#667085] text-sm max-w-xl">
            {isEditMode
              ? `Update the account details and permissions for ${editingUser?.name ?? 'this user'}.`
              : 'Create a new enterprise user account across organizational levels with custom permissions.'}
          </p>
        </div>

        {submitError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {loadingUser ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-10 text-center text-sm text-gray-400">
            Loading user details...
          </div>
        ) : (
          <>
            {/* ── Personal Information ── */}
            <SectionCard className="mt-4">
              <SectionHeader
                icon={User}
                title="Personal Information"
                open={openSections.personal}
                onToggle={() => toggleSection('personal')}
              />

              {openSections.personal && (
                <div className="px-6 py-6 space-y-5">
                  {/* Row 1 — Name & Employee Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label required>First Name</Label>
                      <input
                        name="firstName"
                        value={form.firstName}
                        onChange={(e) => set('firstName', e.target.value)}
                        placeholder="Enter First Name"
                        className={errors.firstName ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.firstName} />
                    </div>

                    <div>
                      <Label>Middle Name</Label>
                      <input
                        name="middlename"
                        value={form.middlename}
                        onChange={(e) => set('middlename', e.target.value)}
                        placeholder="Enter Middlename"
                        className={errors.middlename ? errorInputCls : inputCls}
                      />
                    </div>

                    <div>
                      <Label required>Last Name</Label>
                      <input
                        name="lastName"
                        value={form.lastName}
                        onChange={(e) => set('lastName', e.target.value)}
                        placeholder="Enter Last Name"
                        className={errors.lastName ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.lastName} />
                    </div>

                    <div>
                      <Label required>ERP Employee Code</Label>
                      <input
                        name="erpemployeecode"
                        value={form.erpemployeecode}
                        onChange={(e) => set('erpemployeecode', e.target.value)}
                        placeholder="e.g., EMP001"
                        className={errors.erpemployeecode ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.erpemployeecode} />
                    </div>
                  </div>

                  {/* Row 2 — User Code (edit) / Email / Password */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {isEditMode && (
                      <div>
                        <Label>User Code (Auto Generated)</Label>
                        <input
                          value={form.userCode}
                          disabled
                          className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                        />
                      </div>
                    )}

                    <div>
                      <Label required>Email Address</Label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailChange}
                        placeholder="example@jaiswalgroup.com"
                        className={errors.email ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.email} />
                    </div>

                    {!isEditMode && (
                      <div>
                        <Label required>Password</Label>
                        <div className="relative">
                          <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(e) => set('password', e.target.value)}
                            placeholder="••••••••"
                            className={`${errors.password ? errorInputCls : inputCls} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0 p-0"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {errors.password ? (
                          <ErrorText message={errors.password} />
                        ) : (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Min 8 characters, with uppercase, lowercase, number
                            &amp; special character.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 3 — Group / Sub Company / Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label required>Group</Label>
                      <SearchableSelect
                        name="groupId"
                        value={form.groupId}
                        onChange={(e) => handleGroupChange({ target: { value: e.target.value } })}
                        placeholder={loadingGroups ? 'Loading...' : 'Select Group'}
                        options={groups.map((g) => ({ value: g.id, label: g.name }))}
                        hasError={!!errors.groupId}
                        disabled={loadingGroups}
                      />
                      <ErrorText message={errors.groupId} />
                    </div>

                    <div>
                      <Label>Sub Company</Label>
                      <SearchableSelect
                        name="companyId"
                        value={form.companyId}
                        onChange={(e) => handleCompanyChange({ target: { value: e.target.value } })}
                        placeholder={
                          loadingOrgs
                            ? 'Loading...'
                            : form.groupId
                            ? 'Select Sub Company (optional)'
                            : 'Select group first'
                        }
                        options={subCompanies.map((c) => ({ value: c.id, label: c.name }))}
                        hasError={!!errors.companyId}
                        disabled={!form.groupId || loadingOrgs}
                      />
                      <ErrorText message={errors.companyId} />
                      {/* <p className="text-[11px] text-gray-400 mt-1">
                        Leave blank to register the user directly under the Group.
                      </p> */}
                    </div>

                    <div>
                      <Label>Unit</Label>
                      <SearchableSelect
                        name="outletId"
                        value={form.outletId}
                        onChange={(e) => handleUnitChange({ target: { value: e.target.value } })}
                        placeholder={
                          loadingOrgs
                            ? 'Loading...'
                            : form.companyId
                            ? 'Select Unit (optional)'
                            : 'Select sub company first'
                        }
                        options={outlets.map((u) => ({ value: u.id, label: u.name }))}
                        hasError={!!errors.outletId}
                        disabled={!form.companyId || loadingOrgs}
                      />
                      <ErrorText message={errors.outletId} />
                      {/* <p className="text-[11px] text-gray-400 mt-1">
                        Leave blank to register the user directly under the Sub
                        Company.
                      </p> */}
                    </div>
                  </div>

                  {/* Row 4 — Mobile & Alternate Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label required>Mobile Number</Label>
                      <input
                        name="mobile"
                        value={form.mobile}
                        onChange={(e) =>
                          set('mobile', e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="+91 00000 00000"
                        maxLength={10}
                        className={errors.mobile ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.mobile} />
                    </div>

                    <div>
                      <Label>Alternate Mobile Number</Label>
                      <input
                        name="altMobile"
                        value={form.altMobile}
                        onChange={(e) =>
                          set('altMobile', e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="+91 00000 00000"
                        maxLength={10}
                        className={errors.altMobile ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.altMobile} />
                    </div>
                  </div>

                  {/* Row 5 — Department (Mandatory), Role (Optional), Designation (Mandatory) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label required>Department</Label>
                      <SearchableSelect
                        name="deptId"
                        value={form.deptId || form.departmentId}
                        onChange={(e) => {
                          set('deptId', e.target.value);
                          set('departmentId', e.target.value);
                        }}
                        placeholder={loadingDepartments ? 'Loading...' : 'Select Department'}
                        options={departments.map((d) => ({ value: d.id, label: d.name }))}
                        hasError={!!errors.deptId}
                        disabled={loadingDepartments}
                      />
                      <ErrorText message={errors.deptId} />
                    </div>

                    <div>
                      <Label>Role</Label>
                      <SearchableSelect
                        name="roleId"
                        value={form.roleId}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        placeholder={
                          loadingRoles
                            ? 'Loading...'
                            : loadingRoleRights
                            ? 'Loading permissions...'
                            : 'Select Role (optional)'
                        }
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        disabled={loadingRoles || loadingRoleRights}
                      />
                    </div>

                    <div>
                      <Label required>Designation</Label>
                      <input
                        name="designation"
                        value={form.designation}
                        onChange={(e) => set('designation', e.target.value)}
                        placeholder="e.g., Manager"
                        className={errors.designation ? errorInputCls : inputCls}
                      />
                      <ErrorText message={errors.designation} />
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

                    {/* ── User Rights / Permissions Matrix ── */}
            <SectionCard className="mt-4">
              <SectionHeader
                icon={ShieldCheck}
                title="User Permissions"
                subtitle="Configure or customize module and page-level access permissions for this user."
                open={openSections.permissions}
                onToggle={() => toggleSection('permissions')}
              />
              {openSections.permissions && (
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
                    <p>
                      {form.roleId
                        ? 'Permissions populated from selected role. You can edit or grant additional rights below.'
                        : 'Select a role above to auto-populate rights, or check specific permissions manually.'}
                    </p>
                    {loadingRoleRights && (
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                        Loading role rights...
                      </div>
                    )}
                  </div>

                  {loadingPages ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Loading pages and modules...
                    </div>
                  ) : Object.keys(pagesByModule).length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400">
                      No page modules available.
                    </div>
                  ) : (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-[#43474F]">
                              Page Name
                            </th>
                            <th className="text-center px-4 py-3 font-semibold">
                              <div className="flex flex-col items-center gap-1">
                                <span>All</span>
                                <input
                                  type="checkbox"
                                  checked={isEverythingChecked}
                                  onChange={toggleEverything}
                                  className="rounded cursor-pointer"
                                  title="Toggle Add/Edit/View/Delete for every page"
                                />
                              </div>
                            </th>
                            {ACTIONS.map((a) => (
                              <th
                                key={a.key}
                                className="text-center px-4 py-3 font-semibold"
                              >
                                <div className="flex flex-col items-center gap-1">
                                <span>{a.label}</span>
                                <input
                                  type="checkbox"
                                  checked={isColumnFullyChecked(a.key)}
                                  onChange={() => toggleColumn(a.key)}
                                  className="rounded cursor-pointer"
                                  title={`Toggle ${a.label} for all`}
                                />
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(pagesByModule).map(([moduleName, pages]) => (
                            <React.Fragment key={moduleName}>
                              <tr className="bg-[#F7F8FA] border-t border-[#E5E7EB]">
                                <td
                                  colSpan={ACTIONS.length + 2}
                                  className="px-4 py-2 font-semibold text-[#084E92] bg-blue-50/50"
                                >
                                  {moduleName}
                                </td>
                              </tr>
                              {pages.map((page) => (
                                <tr
                                  key={page.id}
                                  className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC]"
                                >
                                  <td className="px-4 py-2.5 pl-8 text-gray-700">
                                    {page.name}
                                  </td>
                                  <td className="text-center px-4 py-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isRowFullyChecked(page.id)}
                                      onChange={() => toggleRow(page.id)}
                                      className="rounded cursor-pointer"
                                      title="Toggle Add/Edit/View/Delete for this row"
                                    />
                                  </td>
                                  {ACTIONS.map((a) => (
                                    <td key={a.key} className="text-center px-4 py-2.5">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(checks[page.id]?.[a.key])}
                                        onChange={() => toggle(page.id, a.key)}
                                        className="rounded cursor-pointer"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ── Residential Address ── */}
            <SectionCard className="mt-4">
              <SectionHeader
                icon={MapPin}
                title="Residential Address"
                open={openSections.address}
                onToggle={() => toggleSection('address')}
              />
              {openSections.address && (
                <div className="px-6 py-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Address Line 1</Label>
                      <input
                        name="addressLine1"
                        value={form.addressLine1}
                        onChange={(e) => set('addressLine1', e.target.value)}
                        placeholder="Building, Street Name"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <Label>Address Line 2</Label>
                      <input
                        value={form.addressLine2}
                        onChange={(e) => set('addressLine2', e.target.value)}
                        placeholder="Locality, Landmark"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label>Country</Label>
                        <SearchableSelect
                          name="countryId"
                          value={form.countryId}
                          onChange={(e) => handleCountryChange({ target: { value: e.target.value } })}
                          placeholder={loadingCountries ? 'Loading...' : 'Select Country'}
                          options={countries.map((c) => ({ value: c.id, label: c.name }))}
                          disabled={loadingCountries}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <SearchableSelect
                          name="stateId"
                          value={form.stateId}
                          onChange={(e) => handleStateChange({ target: { value: e.target.value } })}
                          placeholder={
                            loadingStates
                              ? 'Loading...'
                              : form.countryId
                              ? 'Select State'
                              : 'Select country first'
                          }
                          options={states.map((s) => ({ value: s.id, label: s.name }))}
                          disabled={!form.countryId || loadingStates}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label>City</Label>
                        <SearchableSelect
                          name="cityId"
                          value={form.cityId}
                          onChange={(e) => handleCityChange({ target: { value: e.target.value } })}
                          placeholder={
                            loadingCities
                              ? 'Loading...'
                              : form.stateId
                              ? 'Select City'
                              : 'Select state first'
                          }
                          options={cities.map((c) => ({ value: c.id, label: c.name }))}
                          disabled={!form.stateId || loadingCities}
                        />
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <input
                          name="pincode"
                          value={form.pincode}
                          onChange={(e) =>
                            set('pincode', e.target.value.replace(/\D/g, ''))
                          }
                          placeholder="6 Digits"
                          maxLength={6}
                          className={errors.pincode ? errorInputCls : inputCls}
                        />
                        <ErrorText message={errors.pincode} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <Label>Latitude</Label>
                      <input
                        value={form.latitude}
                        onChange={(e) => set('latitude', e.target.value)}
                        placeholder="23.0225"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <input
                        value={form.longitude}
                        onChange={(e) => set('longitude', e.target.value)}
                        placeholder="72.5714"
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="flex gap-1 items-end text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
                    >
                      <Map size={15} />
                      <p className="font-bold text-sm">Pick from Map</p>
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </>
        )}

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-end gap-3 pb-4 my-6 border-t border-[#C3C6D1] py-6">
          <button
            type="button"
            onClick={() => navigate('/users')}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-50"
          >
            Cancel
          </button>
          {!isEditMode && (
            <button
              type="button"
              onClick={handleSaveAndAddAnother}
              disabled={submitting || loadingUser}
              className="px-5 py-2.5 rounded-lg border border-[#084E92] text-[#084E92] text-sm font-semibold hover:bg-blue-50 transition cursor-pointer bg-white disabled:opacity-50"
            >
              Save &amp; Add Another
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingUser}
            className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
          </button>
        </div>

        {showMapPicker && (
          <MapPickerModal
            initialLat={form.latitude}
            initialLng={form.longitude}
            onClose={() => setShowMapPicker(false)}
            onConfirm={({ lat, lng }) => {
              set('latitude', lat.toFixed(6));
              set('longitude', lng.toFixed(6));
              setShowMapPicker(false);
            }}
          />
        )}
      </div>
    </Container>
  );
};

export default UserRegistration;