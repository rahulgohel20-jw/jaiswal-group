import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, SquarePen, AlertTriangle, User, MapPin } from 'lucide-react';
import { getEmployeeById } from '@/services/apiServices';
import { extractItem, mapEmployeeToForm } from './utils/Employeemappers';

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm gap-4 py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-gray-400 shrink-0">{label}</span>
    <span className="font-semibold text-gray-800 text-right break-all">{value || '—'}</span>
  </div>
);

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-sm font-bold text-gray-800">{title}</h2>
    </div>
    <div className="px-6 py-2">{children}</div>
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
        if (!cancelled) setEmployee(mapEmployeeToForm(extractItem(res)));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load this user\u2019s details. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchEmployee();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRef?.id]);

  const fullName = employee ? [employee.firstName, employee.middlename, employee.lastName].filter(Boolean).join(' ') : userRef?.name;

  return (
    <div className="mx-4 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex items-center gap-1.5 text-sm text-[#084E92] font-semibold cursor-pointer bg-transparent border-0 p-0 mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
            {fullName || 'User Details'}
          </h1>
          <p className="text-[#43474F]">Full account, contact, and address details for this user.</p>
        </div>

        {employee && (
          <button
            type="button"
            onClick={() => navigate('/users/update-user', { state: { user: { id: employee.id, name: fullName } } })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition h-max"
          >
            <SquarePen className="w-4 h-4" />
            Edit User
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-10 text-center text-sm text-gray-400">
          Loading user details...
        </div>
      ) : employee ? (
        <>
          <SectionCard icon={User} title="Personal Information">
            <Row label="User Code" value={employee.userCode} />
            <Row label="Username" value={employee.username} />
            <Row label="Email Address" value={employee.email} />
            <Row label="Company" value={employee.company} />
            <Row label="Mobile Number" value={employee.mobile} />
            <Row label="Alternate Mobile" value={employee.altMobile} />
            <Row label="Department" value={employee.department} />
            <Row label="Designation" value={employee.designation} />
            <Row label="Salary" value={employee.salary ? `\u20b9${employee.salary}` : ''} />
            <Row label="Joining Date" value={employee.joiningDate} />
          </SectionCard>

          <SectionCard icon={MapPin} title="Residential Address">
            <Row label="Address Line 1" value={employee.addressLine1} />
            <Row label="Address Line 2" value={employee.addressLine2} />
            <Row label="Pincode" value={employee.pincode} />
            <Row label="Latitude" value={employee.latitude} />
            <Row label="Longitude" value={employee.longitude} />
          </SectionCard>
        </>
      ) : null}
    </div>
  );
};

export default UserViewDetails;