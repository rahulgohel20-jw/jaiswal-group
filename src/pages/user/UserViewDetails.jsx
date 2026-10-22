import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  SquarePen,
  AlertTriangle,
  User,
  MapPin,
  Building2,
  Briefcase,
  Shield,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
  Store,
  CheckCircle2,
} from 'lucide-react';
import {
  getEmployeeById,
  getActiveCompany,
  getAllActiveSubOutlets,
  getAllActiveSubLocations,
} from '@/services/apiServices';
import { orgHierarchyStore } from '@/store/orgHierarchyStore';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';

const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1">
      {value || '—'}
    </p>
  </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-[#084E92]" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span
        className="text-sm font-semibold text-gray-800 mt-0.5 truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value || '—'}
      </span>
    </div>
  </div>
);

const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  open = true,
  onToggle,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(true);
  const isControlled = onToggle !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6 transition-all">
      <div
        className={`flex items-center justify-between px-6 py-4 flex-wrap gap-2 cursor-pointer select-none transition-colors hover:bg-gray-50/70 ${
          isOpen ? 'border-b border-gray-100' : ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
            <Icon className="w-5 h-5 text-[#084E92]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-base">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && <div onClick={(e) => e.stopPropagation()}>{badge}</div>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            title={isOpen ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && <div className="px-6 py-5">{children}</div>}
    </div>
  );
};

const PermissionIndicator = ({ enabled, label }) => {
  if (enabled) {
    return (
      <span
        title={`${label}: Granted`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60"
      >
        <Check className="w-3 h-3 stroke-[2.5]" />
        {label}
      </span>
    );
  }
  return (
    <span
      title={`${label}: Denied`}
      className="inline-flex items-center justify-center text-gray-300 text-xs font-medium"
    >
      —
    </span>
  );
};

const safeExtractList = (res, preferredKey) => {
  if (!res) return [];
  if (preferredKey) {
    const direct =
      res?.data?.data?.[preferredKey] ??
      res?.data?.[preferredKey] ??
      res?.[preferredKey];
    if (Array.isArray(direct)) return direct;
  }
  const body = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (body && typeof body === 'object') {
    const key = Object.keys(body).find((k) => Array.isArray(body[k]));
    if (key) return body[key];
  }
  return [];
};

const UserViewDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userRef = location.state?.user ?? null;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  useEffect(() => {
    if (!userRef?.id) {
      navigate('/users');
      return;
    }

    let cancelled = false;

    const fetchEmployee = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await getEmployeeById(userRef.id);
        const data = res?.data?.data ?? res?.data;
        if (!cancelled) {
          setEmployee(data);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError('Could not load this user details. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEmployee();

    return () => {
      cancelled = true;
    };
  }, [navigate, userRef?.id]);

  // Lookup state to resolve names for organizations, sub-units, and sub-locations
  const [allOrgs, setAllOrgs] = useState([]);
  const [allSubOutlets, setAllSubOutlets] = useState([]);
  const [allSubLocations, setAllSubLocations] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchLookups = async () => {
      try {
        const [orgsRes, subOutletsRes, subLocationsRes] = await Promise.allSettled([
          getActiveCompany(),
          getAllActiveSubOutlets(),
          getAllActiveSubLocations(),
        ]);
        if (!cancelled) {
          if (orgsRes.status === 'fulfilled') {
            setAllOrgs(safeExtractList(orgsRes.value));
          }
          if (subOutletsRes.status === 'fulfilled') {
            setAllSubOutlets(safeExtractList(subOutletsRes.value, 'Sub Outlet Details'));
          }
          if (subLocationsRes.status === 'fulfilled') {
            setAllSubLocations(safeExtractList(subLocationsRes.value, 'Sub Location Details'));
          }
        }
      } catch (err) {
        console.error('Failed to load org lookups for user details:', err);
      }
    };

    fetchLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  const orgMap = useMemo(() => {
    const map = new Map();
    const storeScope = orgHierarchyStore.getState().parsedScope;
    (storeScope?.companies || []).forEach((c) => {
      const id = c.id ?? c.organizationId;
      if (id) {
        map.set(Number(id), {
          id: Number(id),
          name: c.companyNameEnglish || c.companyName || c.name || `Company #${id}`,
          code: c.companyCode || c.code || '',
          type: 'SUB_COMPANY',
          parentId: null,
        });
      }
    });
    (storeScope?.outlets || []).forEach((o) => {
      const id = o.id ?? o.organizationId;
      if (id) {
        map.set(Number(id), {
          id: Number(id),
          name: o.companyNameEnglish || o.companyName || o.outletName || o.name || `Unit #${id}`,
          code: o.companyCode || o.outletCode || o.code || '',
          type: 'UNIT',
          parentId: o.parentId ? Number(o.parentId) : null,
        });
      }
    });
    allOrgs.forEach((o) => {
      const id = o.id ?? o.organizationId ?? o.companyId;
      if (id) {
        map.set(Number(id), {
          id: Number(id),
          name: o.companyNameEnglish || o.companyName || o.outletName || o.name || `Org #${id}`,
          code: o.companyCode || o.shortCode || o.code || o.outletCode || '',
          type: o.organizationType || (o.parentId ? 'UNIT' : 'SUB_COMPANY'),
          parentId: o.parentId ? Number(o.parentId) : null,
        });
      }
    });
    return map;
  }, [allOrgs]);

  const subOutletMap = useMemo(() => {
    const map = new Map();
    const storeScope = orgHierarchyStore.getState().parsedScope;
    (storeScope?.subOutlets || []).forEach((so) => {
      const id = so.id ?? so.subOutletId;
      if (id) {
        map.set(Number(id), {
          id: Number(id),
          name: so.subOutletName || so.name || `Sub-Unit #${id}`,
          organizationId: Number(so.organizationId || so.outletId || 0),
        });
      }
    });
    allSubOutlets.forEach((so) => {
      const id = so.id ?? so.subOutletId;
      if (id) {
        map.set(Number(id), {
          id: Number(id),
          name: so.subOutletName || so.name || `Sub-Unit #${id}`,
          organizationId: Number(so.organizationId || so.outletId || 0),
        });
      }
    });
    return map;
  }, [allSubOutlets]);

  const subLocationMap = useMemo(() => {
    const map = new Map();
    const storeScope = orgHierarchyStore.getState().parsedScope;
    (storeScope?.subLocations || []).forEach((sl) => {
      const id = sl.id ?? sl.subLocationId;
      if (id) {
        map.set(Number(sl.id), {
          id: Number(sl.id),
          name: sl.locationName || sl.subLocationName || sl.name || `Sub-Location #${id}`,
          subOutletId: Number(sl.subOutletId || sl.subUnitId || 0),
        });
      }
    });
    allSubLocations.forEach((sl) => {
      const id = sl.id ?? sl.subLocationId;
      if (id) {
        map.set(Number(sl.id), {
          id: Number(sl.id),
          name: sl.locationName || sl.subLocationName || sl.name || `Sub-Location #${id}`,
          subOutletId: Number(sl.subOutletId || sl.subUnitId || 0),
        });
      }
    });
    return map;
  }, [allSubLocations]);

  // Construct structured hierarchy tree with resolved names
  const hierarchyTree = useMemo(() => {
    const rawAssignments = Array.isArray(employee?.accessAssignments)
      ? employee.accessAssignments
      : Array.isArray(employee?.accessibleScope?.assignments)
      ? employee.accessibleScope.assignments
      : [];

    const scope = employee?.accessibleScope;
    const orgGroups = new Map();

    const getOrCreateOrg = (id, fallbackName, fallbackType) => {
      const orgId = Number(id);
      if (!orgId) return null;
      if (!orgGroups.has(orgId)) {
        const found = orgMap.get(orgId);
        const parentFound = found?.parentId ? orgMap.get(Number(found.parentId)) : null;
        orgGroups.set(orgId, {
          id: orgId,
          name: found?.name || fallbackName || `Organization #${orgId}`,
          code: found?.code || '',
          type: found?.type || fallbackType || (found?.parentId ? 'UNIT' : 'SUB_COMPANY'),
          parentName: parentFound?.name || null,
          fullAccess: false,
          subOutlets: new Map(),
        });
      }
      return orgGroups.get(orgId);
    };

    // 1. Process accessAssignments
    for (const a of rawAssignments) {
      const orgId = Number(a.organizationId) || 0;
      if (!orgId) continue;
      const org = getOrCreateOrg(orgId, a.organizationName || a.companyName);
      if (!org) continue;

      const subOutletId = Number(a.subOutletId) || 0;
      const subLocationId = Number(a.subLocationId) || 0;

      if (subOutletId === 0 && subLocationId === 0) {
        org.fullAccess = true;
      } else if (subOutletId > 0) {
        if (!org.subOutlets.has(subOutletId)) {
          const soFound = subOutletMap.get(subOutletId);
          org.subOutlets.set(subOutletId, {
            id: subOutletId,
            name: soFound?.name || a.subOutletName || `Sub-Unit #${subOutletId}`,
            fullAccess: false,
            subLocations: new Map(),
          });
        }
        const subOutlet = org.subOutlets.get(subOutletId);

        if (subLocationId === 0) {
          subOutlet.fullAccess = true;
        } else {
          if (!subOutlet.subLocations.has(subLocationId)) {
            const slFound = subLocationMap.get(subLocationId);
            subOutlet.subLocations.set(subLocationId, {
              id: subLocationId,
              name: slFound?.name || a.subLocationName || a.locationName || `Sub-Location #${subLocationId}`,
            });
          }
        }
      }
    }

    // 2. Also incorporate accessibleScope if present
    if (scope) {
      for (const c of scope.accessibleCompanies || []) {
        const org = getOrCreateOrg(c.id ?? c.organizationId, c.name || c.companyName, 'SUB_COMPANY');
        if (org) org.fullAccess = true;
      }
      for (const o of scope.accessibleOutlets || []) {
        const org = getOrCreateOrg(o.id ?? o.organizationId, o.name || o.outletName, 'UNIT');
        if (org && (!org.subOutlets || org.subOutlets.size === 0)) {
          org.fullAccess = true;
        }
      }
      for (const so of scope.accessibleSubOutlets || []) {
        const orgId = Number(so.organizationId || so.outletId);
        if (orgId) {
          const org = getOrCreateOrg(orgId, null, 'UNIT');
          if (org) {
            const soId = Number(so.id ?? so.subOutletId);
            const soFound = subOutletMap.get(soId);
            if (soId && !org.subOutlets.has(soId)) {
              org.subOutlets.set(soId, {
                id: soId,
                name: soFound?.name || so.name || so.subOutletName || `Sub-Unit #${soId}`,
                fullAccess: true,
                subLocations: new Map(),
              });
            }
          }
        }
      }
      for (const sl of scope.accessibleSubLocations || []) {
        const soId = Number(sl.subOutletId);
        const soFound = subOutletMap.get(soId);
        const orgId = Number(sl.organizationId || soFound?.organizationId);
        if (orgId && soId) {
          const org = getOrCreateOrg(orgId, null, 'UNIT');
          if (org) {
            if (!org.subOutlets.has(soId)) {
              org.subOutlets.set(soId, {
                id: soId,
                name: soFound?.name || `Sub-Unit #${soId}`,
                fullAccess: false,
                subLocations: new Map(),
              });
            }
            const subOutlet = org.subOutlets.get(soId);
            const slId = Number(sl.id ?? sl.subLocationId);
            const slFound = subLocationMap.get(slId);
            if (slId && !subOutlet.subLocations.has(slId)) {
              subOutlet.subLocations.set(slId, {
                id: slId,
                name: slFound?.name || sl.name || sl.locationName || `Sub-Location #${slId}`,
              });
            }
          }
        }
      }
    }

    return Array.from(orgGroups.values()).map((org) => ({
      ...org,
      subOutlets: Array.from(org.subOutlets.values()).map((so) => ({
        ...so,
        subLocations: Array.from(so.subLocations.values()),
      })),
    }));
  }, [employee, orgMap, subOutletMap, subLocationMap]);

  const fullName = employee
    ? (employee.fullName || [employee.firstName, employee.middlename, employee.lastName].filter(Boolean).join(' '))
    : userRef?.name;

  const departmentName = employee?.deptName || employee?.department?.name || '—';
  const roleName = employee?.userRights?.roleName || employee?.roleName || null;

  // Extract module-wise user rights
  const userRightsObj = employee?.userRights;
  const moduleRightsList = Array.isArray(userRightsObj?.userRights)
    ? userRightsObj.userRights
    : Array.isArray(userRightsObj)
    ? userRightsObj
    : [];

  const totalModules = moduleRightsList.length;
  const totalPages = moduleRightsList.reduce((acc, m) => acc + (m.userRights?.length || 0), 0);

   // Auto-select first module when module rights are loaded
  useEffect(() => {
    if (moduleRightsList.length > 0) {
      const currentModuleExists = moduleRightsList.some(
        (m) => (m.moduleId ?? m.moduleName) === selectedModule
      );
      if (!selectedModule || !currentModuleExists) {
        setSelectedModule(moduleRightsList[0].moduleId ?? moduleRightsList[0].moduleName);
      }
    }
  }, [moduleRightsList, selectedModule]);

  // Find the currently active module object
  const activeModule = useMemo(() => {
    return (
      moduleRightsList.find(
        (m) => (m.moduleId ?? m.moduleName) === selectedModule
      ) || moduleRightsList[0]
    );
  }, [moduleRightsList, selectedModule]);
  return (
    <Container>
      <div className="mx-auto pt-2 pb-12 space-y-3.5">
        <PageHeader
          title="User Details"
          description="Full account, contact, department, and module-level permission rights."
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="flex items-center gap-1.5 text-[#084E92] hover:text-[#063b6f] font-semibold text-sm cursor-pointer bg-transparent border-0 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Users
              </button>

              {employee && (
                <button
                  onClick={() =>
                    navigate('/users/update-user', {
                      state: {
                        user: {
                          id: employee.id,
                          name: fullName,
                        },
                      },
                    })
                  }
                  className="bg-[#084E92] text-white w-max px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm cursor-pointer hover:bg-[#073e77] transition shadow-xs"
                >
                  <SquarePen className="w-4 h-4" />
                  Edit User
                </button>
              )}
            </div>
          }
        />

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 border border-red-200 bg-red-50 text-red-700 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="mt-6 bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
            Loading user details...
          </div>
        ) : employee ? (
          <>
            {/* Profile Card */}
            <div className="mt-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#084E92]/10 flex items-center justify-center shrink-0">
                <User className="w-10 h-10 text-[#084E92]" />
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {fullName || '—'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {employee.designation || 'Employee'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                      Active User
                    </span>
                  </div>
                </div>

                <p className="text-[#084E92] text-sm mt-2 font-medium">
                  {employee.emailid}
                </p>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3.5">
                  <span className="bg-blue-50 border border-blue-100 text-[#084E92] text-xs font-semibold px-3 py-1 rounded-full">
                    {employee.erpemployeecode || employee.erpEmployeeCode || employee.userCode || 'No Code'}
                  </span>
                  {departmentName !== '—' && (
                    <span className="bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {departmentName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <StatCard
                label="Company"
                value={employee.organizationName}
                icon={Building2}
              />

              <StatCard
                label="Department"
                value={departmentName}
                icon={Briefcase}
              />

            </div>

            {/* Personal Information */}
            <SectionCard icon={User} title="Personal Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                  label="Employee Code"
                  value={employee.erpemployeecode ?? employee.erpEmployeeCode ?? '—'}
                />

                <InfoCard
                  label="User Code"
                  value={employee.userCode}
                />

                <InfoCard
                  label="Full Name"
                  value={fullName}
                />

                <InfoCard
                  label="Email Address"
                  value={employee.emailid}
                />

                <InfoCard
                  label="Mobile Number"
                  value={employee.mobileNumber}
                />

                <InfoCard
                  label="Alternate Mobile"
                  value={employee.alternateMobile}
                />

                <InfoCard
                  label="Department"
                  value={departmentName}
                />

                <InfoCard
                  label="Designation"
                  value={employee.designation}
                />

                <InfoCard
                  label="Company"
                  value={employee.organizationName}
                />
              </div>
            </SectionCard>

            {/* User Rights & Permissions Matrix */}
            <SectionCard
              icon={ShieldCheck}
              title="User Rights & Permissions"
              subtitle="Module-wise access control permissions configured for this account."
              badge={
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
                    {totalModules} Modules
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                    {totalPages} Pages
                  </span>
                </div>
              }
            >
              {moduleRightsList.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No specific user rights configured.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs grid grid-cols-1 md:grid-cols-12 h-[460px]">
                  {/* ── Left Sidebar: Scrollable Module Navigation ── */}
                  <div className="md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/70 p-3 flex flex-col h-full overflow-hidden">
                    <div className="px-2 py-1 mb-2 shrink-0">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Modules ({totalModules})
                      </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                      {moduleRightsList.map((mod) => {
                        const modKey = mod.moduleId ?? mod.moduleName;
                        const isSelected = selectedModule === modKey;
                        const pages = mod.userRights || [];

                        // Check if this module has any granted permission
                        const hasAnyGranted = pages.some(
                          (p) => p.add || p.edit || p.view || p.delete || p.export
                        );

                        return (
                          <button
                            key={modKey}
                            type="button"
                            onClick={() => setSelectedModule(modKey)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer border ${
                              isSelected
                                ? 'bg-[#084E92] text-white border-[#084E92] shadow-xs'
                                : 'bg-white text-gray-700 hover:bg-gray-100/80 border-gray-200/80'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {hasAnyGranted && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isSelected ? 'bg-amber-300' : 'bg-[#084E92]'
                                  }`}
                                />
                              )}
                              <span className="truncate">{mod.moduleName}</span>
                            </div>
                            
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Right Content: Scrollable Pages Table with Sticky Header ── */}
                  <div className="md:col-span-8 lg:col-span-9 flex flex-col h-full overflow-hidden">
                    <div className="overflow-y-auto overflow-x-auto flex-1">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50/95 border-b border-gray-200 sticky top-0 backdrop-blur-xs">
                          <tr>
                            <th className="text-left px-5 py-3 font-semibold text-gray-700 text-xs">
                              {activeModule?.moduleName || 'Module'} Pages
                            </th>
                            <th className="text-center w-20 px-2 py-3 font-semibold text-gray-600 text-xs">
                              Add
                            </th>
                            <th className="text-center w-20 px-2 py-3 font-semibold text-gray-600 text-xs">
                              Edit
                            </th>
                            <th className="text-center w-20 px-2 py-3 font-semibold text-gray-600 text-xs">
                              View
                            </th>
                            <th className="text-center w-20 px-2 py-3 font-semibold text-gray-600 text-xs">
                              Delete
                            </th>
                            {/* Included if the role supports export permission */}
                            {activeModule?.userRights?.some((p) => p.export !== undefined) && (
                              <th className="text-center w-20 px-2 py-3 font-semibold text-gray-600 text-xs">
                                Export
                              </th>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(activeModule?.userRights || []).map((p) => (
                            <tr
                              key={p.id ?? p.pageid ?? p.pageName}
                              className="hover:bg-blue-50/25 transition-colors"
                            >
                              <td className="px-5 py-2.5 text-xs text-gray-700 font-medium">
                                {p.pageName}
                              </td>
                              <td className="text-center w-20 px-2 py-2">
                                <PermissionIndicator enabled={Boolean(p.add)} label="Add" />
                              </td>
                              <td className="text-center w-20 px-2 py-2">
                                <PermissionIndicator enabled={Boolean(p.edit)} label="Edit" />
                              </td>
                              <td className="text-center w-20 px-2 py-2">
                                <PermissionIndicator enabled={Boolean(p.view)} label="View" />
                              </td>
                              <td className="text-center w-20 px-2 py-2">
                                <PermissionIndicator enabled={Boolean(p.delete)} label="Delete" />
                              </td>
                              {activeModule?.userRights?.some((page) => page.export !== undefined) && (
                                <td className="text-center w-20 px-2 py-2">
                                  <PermissionIndicator enabled={Boolean(p.export)} label="Export" />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Assigned Organization Scope */}
            {hierarchyTree.length > 0 && (
              <SectionCard
                icon={Building2}
                title="Assigned Organization Scope"
                subtitle="Hierarchical access permissions across companies, units, sub-units, and locations."
              >
                <div className="space-y-4">
                  {hierarchyTree.map((org) => {
                    const isCompany =
                      org.type === 'SUB_COMPANY' ||
                      org.type === 'COMPANY' ||
                      org.type === 'GROUP';
                    const typeLabel = isCompany ? 'Company' : 'Unit / Outlet';
                    const hasSubUnits = org.subOutlets && org.subOutlets.length > 0;

                    return (
                      <div
                        key={org.id}
                        className="border border-[#E5E7EB] rounded-2xl bg-white p-4.5 shadow-2xs hover:border-[#D1D5DB] transition-all"
                      >
                        {/* Organization Level Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F1F3]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isCompany
                                  ? 'bg-blue-50 text-[#084E92]'
                                  : 'bg-indigo-50 text-indigo-700'
                              }`}
                            >
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm tracking-tight truncate">
                                  {org.name}
                                </span>
                                {org.code && (
                                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                    {org.code}
                                  </span>
                                )}
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isCompany
                                      ? 'bg-blue-50 text-[#084E92] border-blue-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  {typeLabel}
                                </span>
                              </div>
                              {org.parentName && (
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <span>Under Company:</span>
                                  <span className="font-medium text-gray-600">
                                    {org.parentName}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status / Scope pill on the right */}
                          <div className="flex items-center gap-2 shrink-0">
                            {org.fullAccess && !hasSubUnits && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Full {isCompany ? 'Company' : 'Unit'} Access
                              </span>
                            )}
                            {org.fullAccess && hasSubUnits && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Unit & Specific Sub-Units
                              </span>
                            )}
                            {!org.fullAccess && hasSubUnits && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                {org.subOutlets.length} Sub-Unit
                                {org.subOutlets.length > 1 ? 's' : ''} Assigned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sub-Units Tree (if any) */}
                        {hasSubUnits && (
                          <div className="mt-3.5 pl-3 sm:pl-5 space-y-3 border-l-2 border-[#E5E7EB] ml-4">
                            {org.subOutlets.map((so) => {
                              const hasLocations =
                                so.subLocations && so.subLocations.length > 0;
                              return (
                                <div
                                  key={so.id}
                                  className="bg-[#FAFBFC] border border-[#E9ECEF] rounded-xl p-3 space-y-2 hover:bg-white hover:border-[#DCE1E8] transition-all"
                                >
                                  {/* Sub-Unit Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                                        <Store className="w-4 h-4" />
                                      </div>
                                      <span className="font-semibold text-gray-800 text-xs tracking-tight truncate">
                                        {so.name}
                                      </span>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                        Sub-Unit
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {so.fullAccess && !hasLocations && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          All Locations
                                        </span>
                                      )}
                                      {hasLocations && (
                                        <span className="text-[11px] font-medium text-gray-500">
                                          {so.subLocations.length} Location
                                          {so.subLocations.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Sub-Locations (if any) */}
                                  {hasLocations && (
                                    <div className="pt-2 pl-3 sm:pl-4 border-l-2 border-dashed border-purple-200 ml-3.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                        Assigned Sub-Locations
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {so.subLocations.map((sl) => (
                                          <span
                                            key={sl.id}
                                            className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-900 text-xs font-medium px-2.5 py-1 rounded-lg shadow-2xs hover:border-emerald-300 transition-colors"
                                          >
                                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>{sl.name}</span>
                                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded border border-emerald-100">
                                              Location
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Address Information */}
            <SectionCard icon={MapPin} title="Address Information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard
                    label="Address Line 1"
                    value={employee.addressLine1}
                  />

                  <InfoCard
                    label="Address Line 2"
                    value={employee.addressLine2}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InfoCard
                    label="Country"
                    value={employee.countryName}
                  />
                  <InfoCard
                    label="State"
                    value={employee.stateName}
                  />
                  <InfoCard
                    label="City"
                    value={employee.cityName}
                  />
                  <InfoCard
                    label="Pincode"
                    value={employee.pincode}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoCard
                    label="Latitude"
                    value={employee.latitude}
                  />

                  <InfoCard
                    label="Longitude"
                    value={employee.longitude}
                  />
                </div>
              </div>
            </SectionCard>
          </>
        ) : null}
      </div>
    </Container>
  );
};

export default UserViewDetails;