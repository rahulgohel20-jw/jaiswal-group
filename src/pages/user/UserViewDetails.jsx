import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { getEmployeeById } from '@/services/apiServices';
import { Container } from '@/components/common/container';

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

const UserViewDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userRef = location.state?.user ?? null;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <Container>
      <div className="mx-auto p-4 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2 cursor-pointer hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </button>

            <h1 className="text-[28px] font-bold text-[#101828]">
              User Details
            </h1>

            <p className="text-[#667085] text-sm mt-1">
              Full account, contact, department, and module-level permission rights.
            </p>
          </div>

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

              <StatCard
                label="Role"
                value={roleName || 'Direct / Custom'}
                icon={Shield}
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
                  label="Role"
                  value={roleName || 'Direct / Custom'}
                />

                <InfoCard
                  label="Designation"
                  value={employee.designation}
                />

                <InfoCard
                  label="Company"
                  value={employee.organizationName}
                />

                <InfoCard
                  label="Joining Date"
                  value={employee.joiningDate}
                />

                <InfoCard
                  label="Salary"
                  value={employee.salary ? `₹${employee.salary}` : '—'}
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
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold text-[#43474F] min-w-[220px]">
                          Module / Page Name
                        </th>
                        <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                          Add
                        </th>
                        <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                          Edit
                        </th>
                        <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                          View
                        </th>
                        <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleRightsList.map((mod) => (
                        <React.Fragment key={mod.moduleId ?? mod.moduleName}>
                          {/* Module Header Row */}
                          <tr className="bg-[#F0F4FA] border-t border-[#E5E7EB]">
                            <td
                              colSpan={5}
                              className="px-5 py-2.5 font-bold text-[#084E92] flex items-center gap-2"
                            >
                              <Layers className="w-4 h-4" />
                              <span>{mod.moduleName}</span>
                              <span className="text-xs font-normal text-gray-500 ml-1">
                                ({mod.userRights?.length || 0} pages)
                              </span>
                            </td>
                          </tr>

                          {/* Pages in Module */}
                          {(mod.userRights || []).map((p) => (
                            <tr
                              key={p.id ?? p.pageid ?? p.pageName}
                              className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                            >
                              <td className="px-5 py-2.5 pl-10 text-gray-700 font-medium text-[13px]">
                                {p.pageName}
                              </td>
                              <td className="text-center px-4 py-2.5">
                                <PermissionIndicator enabled={Boolean(p.add)} label="Add" />
                              </td>
                              <td className="text-center px-4 py-2.5">
                                <PermissionIndicator enabled={Boolean(p.edit)} label="Edit" />
                              </td>
                              <td className="text-center px-4 py-2.5">
                                <PermissionIndicator enabled={Boolean(p.view)} label="View" />
                              </td>
                              <td className="text-center px-4 py-2.5">
                                <PermissionIndicator enabled={Boolean(p.delete)} label="Delete" />
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

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