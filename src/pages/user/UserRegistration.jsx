import React, { useState } from 'react';
import { ChevronDown, Eye, Map, MapPin, User } from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

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
      onClick={onToggle}
      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
    >
      <ChevronDown
        className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
  </div>
);

const UserRegistration = () => {
  const [openSection, setOpenSection] = useState('personal');
  const toggleSection = (section) =>
    setOpenSection((prev) => (prev === section ? prev : section));

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    surname: '',
    userCode: 'USR-2023-0042',
    email: '',
    company: 'Jaiswal Group India Pvt Ltd',
    password: '',
    mobile: '',
    altMobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: '',
    longitude: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="mx-4 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          User Registration
        </h1>
        <p className="text-[#43474F]">
          Create a new enterprise user account across organizational levels.
        </p>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={User}
          title="Personal Information"
          open={openSection === 'personal'}
          onToggle={() => toggleSection('personal')}
        />

        {openSection === 'personal' && (
          <div className="px-6 py-6 space-y-5">
            
             <div className="grid grid-cols-3 gap-4">
              <div>
              <Label required>First Name</Label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Enter First Name"
                className={inputCls}
              />
            </div>

              <div>
              <Label required>Last Name</Label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Enter Last Name"
                className={inputCls}
              />
            </div>

             <div>
              <Label required>Surname</Label>
              <input
                value={form.surname}
                onChange={(e) => set('surname', e.target.value)}
                placeholder="Enter Surname"
                className={inputCls}
              />
            </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>User Code</Label>
                <input
                  value={form.userCode}
                  disabled
                  className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                />
              </div>

              <div>
                <Label required>Email Address</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="example@jaiswalgroup.com"
                  className={inputCls}
                />
              </div>

              <div>
                <Label required>Company</Label>
                <input value={form.company} disabled className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>Password</Label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              <div>
                <Label required>Mobile Number</Label>
                <input
                  value={form.mobile}
                  onChange={(e) => set('mobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Alternate Mobile Number</Label>
                <input
                  value={form.altMobile}
                  onChange={(e) => set('altMobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Residential Address"
          open={openSection === 'address'}
          onToggle={() => toggleSection('address')}
        />
        {openSection === 'address' && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Address Line 1</Label>
                <input
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

            <div className="grid grid-cols-4 gap-4">

                <div>
                <Label required>Country</Label>
                <input
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="Country"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>State</Label>
                <input
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="State"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>City</Label>
                <input
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="City Name"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Pincode</Label>
                <input
                  value={form.pincode}
                  onChange={(e) => set('pincode', e.target.value)}
                  placeholder="6 Digits"
                  maxLength={6}
                  className={inputCls}
                />
              </div>
              
            </div>

            <div className="grid grid-cols-4 gap-4">
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
              <div className='flex gap-1 items-end text-[#084E92] cursor-pointer'>
                <Map size={15}/>
                <p className=' font-bold text-sm'>Pick from Map</p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>


       {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pb-4 my-6 border-t border-[#C3C6D1] py-6">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg text-sky-900 border border-[#084E92] font-semibold text-sm transition cursor-pointer bg-white"
          >
            Save & Add Another
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
          >
            Save User
          </button>
        </div>
    </div>
  );
};

export default UserRegistration;
