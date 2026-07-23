import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  SquarePen,
  AlertTriangle,
  User,
  MapPin,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { getEmployeeById } from '@/services/apiServices';
import { extractItem, mapEmployeeToForm } from './utils/Employeemappers';

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
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
        {label}
      </p>

      <div className="w-9 h-9 rounded-xl bg-[#084E92]/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#084E92]" />
      </div>
    </div>

    <p className="mt-3 text-sm font-semibold text-gray-800">
      {value || '—'}
    </p>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#084E92]" />
            </div>

            <h2 className="font-bold text-gray-800">{title}</h2>
        </div>

        <div className="px-6 py-4">
            {children}
        </div>
    </div>
);

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

        if (!cancelled) {
          setEmployee(mapEmployeeToForm(extractItem(res)));
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
    ? [
        employee.firstName,
        employee.middlename,
        employee.lastName,
      ]
        .filter(Boolean)
        .join(' ')
    : userRef?.name;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>

          <h1 className="text-3xl md:text-4xl font-bold text-[#084E92]">
            {fullName || 'User Details'}
          </h1>

          <p className="text-[#737781] mt-1">
            Full account, contact and address information.
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
            className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2 font-medium cursor-pointer"
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
            <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center shrink-0">
              <User className="w-12 h-12 text-[#084E92]" />
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900">
                {fullName}
              </h2>

              <p className="text-gray-500 mt-1">
                {employee.designation || 'Employee'}
              </p>

              <p className="text-[#084E92] text-sm mt-2">
                {employee.email}
              </p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
                  {employee.userCode || 'No Code'}
                </span>

                <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                  Active User
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <StatCard
              label="Company"
              value={employee.company}
              icon={Building2}
            />

            <StatCard
              label="Department"
              value={employee.departmentId}
              icon={Briefcase}
            />

            <StatCard
              label="Joining Date"
              value={employee.joiningDate}
              icon={Calendar}
            />

            <StatCard
              label="Salary"
              value={
                employee.salary
                  ? `₹${employee.salary}`
                  : 'Not Available'
              }
              icon={IndianRupee}
            />
          </div>

          {/* Content */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* Left */}

            <div className="xl:col-span-2">
              <SectionCard icon={User} title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoCard
                    label="User Code"
                    value={employee.userCode}
                  />

                  <InfoCard
                    label="Username"
                    value={employee.username}
                  />

                  <InfoCard
                    label="Email Address"
                    value={employee.email}
                  />

                  <InfoCard
                    label="Company"
                    value={employee.company}
                  />

                  <InfoCard
                    label="Mobile Number"
                    value={employee.mobile}
                  />

                  <InfoCard
                    label="Alternate Mobile"
                    value={employee.altMobile}
                  />

                  <InfoCard
                    label="Designation"
                    value={employee.designation}
                  />

                  <InfoCard
                    label="Joining Date"
                    value={employee.joiningDate}
                  />

                  <InfoCard
                    label="Salary"
                    value={
                      employee.salary
                        ? `₹${employee.salary}`
                        : ''
                    }
                  />
                </div>
              </SectionCard>
            </div>

            {/* Right */}
              <SectionCard icon={MapPin} title="Address Information">
                <div className="space-y-4">
                  <InfoCard
                    label="Address Line 1"
                    value={employee.addressLine1}
                  />

                  <InfoCard
                    label="Address Line 2"
                    value={employee.addressLine2}
                  />

                  <InfoCard
                    label="Pincode"
                    value={employee.pincode}
                  />

                  <InfoCard
                    label="Latitude"
                    value={employee.latitude}
                  />

                  <InfoCard
                    label="Longitude"
                    value={employee.longitude}
                  />
                </div>
              </SectionCard>
            </div>
        </>
      ) : null}
    </div>
  );
};

export default UserViewDetails;