import React, { useEffect, useState } from 'react';
import {
    BadgeCheck,
    Briefcase,
    Building2,
    Loader2,
    Mail,
    Pencil,
    Phone,
    Smartphone,
    User,
    Eye,
} from 'lucide-react';
import {
    getActiveCompany,
    getAllCountries,
    getAllRoleMasterByUserId,
    getCitiesByState,
    getEmployeeById,
    getOrganizationByType,
    getStatesByCountry,
    updateEmployee,
} from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import SearchableSelect from '../../utils/SearchableSelect';
import { validateEmail, validateMobile, validatePincode, validateRequired } from '../../utils/validations/validations';
import {
    buildEmployeePayload,
    deriveOrgSelection,
    extractItem,
    extractList,
    getEmployeeOrgId,
    mapEmployeeToForm,
} from '../user/utils/Employeemappers';

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

const Label2 = Label; // (kept name stable in case other files import Label separately)

const ViewField = ({ label, icon: Icon, value }) => (
    <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-500">
            {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
            {label}
        </label>
        <div className="w-full truncate rounded-lg border border-transparent bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800">
            {value || <span className="text-gray-400">Not provided</span>}
        </div>
    </div>
);

// Editable input in edit mode, read-only box in view mode.
const Field = ({
    label,
    icon: Icon,
    name,
    value,
    editing,
    onChange,
    error,
    required,
    placeholder,
    maxLength,
    type = 'text',
}) => (
    <div>
        {editing ? (
            <>
                <Label required={required}>{label}</Label>
                <input
                    name={name}
                    type={type}
                    value={value ?? ''}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={error ? errorInputCls : inputCls}
                />
                <ErrorText message={error} />
            </>
        ) : (
            <>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-500">
                    {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                    {label}
                </label>
                <div className="w-full truncate rounded-lg border border-transparent bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800">
                    {value || <span className="text-gray-400">Not provided</span>}
                </div>
            </>
        )}
    </div>
);

function formatRole(role = '') {
    return role
        .replace(/_+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

const getUserId = () => getUserIdFromToken();

const UserProfile = () => {
    const [editing, setEditing] = useState(false);

    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);

    const [raw, setRaw] = useState(null);

    const [errors, setErrors] = useState({});
    const [loadingUser, setLoadingUser] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    const [allOrgs, setAllOrgs] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    const [employeeOrgId, setEmployeeOrgId] = useState('');

    useEffect(() => {
        let cancelled = false;
        const fetchProfile = async () => {
            const userId = getUserId();
            if (!userId) {
                setSubmitError('User not found. Please log in again.');
                setLoadingUser(false);
                return;
            }
            setLoadingUser(true);
            try {
                const res = await getEmployeeById(userId);
                const emp = extractItem(res);
                if (!cancelled) {
                    const mapped = mapEmployeeToForm(emp);
                    setRaw(emp);
                    setSaved(mapped);
                    setForm(mapped);
                    setEmployeeOrgId(getEmployeeOrgId(emp));
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) setSubmitError("Couldn't load your profile. Try again.");
            } finally {
                if (!cancelled) setLoadingUser(false);
            }
        };
        fetchProfile();
        return () => {
            cancelled = true;
        };
    }, []);

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

    useEffect(() => {
        if (!employeeOrgId) return;
        if (loadingGroups || loadingOrgs) return;

        const derived = deriveOrgSelection(employeeOrgId, groups, allOrgs);
        const hasMatch = derived?.groupId || derived?.companyId || derived?.outletId;
        if (!hasMatch) return;

        setSaved((s) => (s ? { ...s, ...derived } : s));
        setForm((f) => (f ? { ...f, ...derived } : f));
    }, [employeeOrgId, groups, allOrgs, loadingGroups, loadingOrgs]);

    useEffect(() => {
        let cancelled = false;
        const fetchRoles = async () => {
            setLoadingRoles(true);
            try {
                const res = await getAllRoleMasterByUserId(getUserId());
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

    useEffect(() => {
        if (!form?.countryId) {
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
    }, [form?.countryId]);

    useEffect(() => {
        if (!form?.stateId) {
            setCities([]);
            return;
        }
        let cancelled = false;
        const fetchCities = async () => {
            setLoadingCities(true);
            try {
                const res = await getCitiesByState(form.stateId);
                if (!cancelled) setCities(res?.data?.data?.['City Details'] ?? []);
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
    }, [form?.stateId]);

    const subCompanies = React.useMemo(
        () =>
            form?.groupId
                ? allOrgs
                    .filter((o) => String(o.parentId) === String(form.groupId))
                    .map((c) => ({ id: c.id, name: c.companyNameEnglish || c.name }))
                : [],
        [allOrgs, form?.groupId]
    );

    const outlets = React.useMemo(
        () =>
            form?.companyId
                ? allOrgs
                    .filter((o) => String(o.parentId) === String(form.companyId))
                    .map((u) => ({ id: u.id, name: u.companyNameEnglish || u.name }))
                : [],
        [allOrgs, form?.companyId]
    );

    const set = (key, val) => {
        setForm((f) => ({ ...f, [key]: val }));
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, email: value }));
        setErrors((prev) => ({
            ...prev,
            email: value.trim() ? validateEmail(value) || undefined : undefined,
        }));
    };

    const handleCountryChange = (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, countryId: value, stateId: '', cityId: '' }));
        setStates([]);
        setCities([]);
        setErrors((prev) => ({ ...prev, countryId: undefined, stateId: undefined, cityId: undefined }));
    };

    const handleStateChange = (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, stateId: value, cityId: '' }));
        setCities([]);
        setErrors((prev) => ({ ...prev, stateId: undefined, cityId: undefined }));
    };

    const handleCityChange = (e) => set('cityId', e.target.value);

    const handleGroupChange = (value) => {
        setForm((f) => ({ ...f, groupId: value, companyId: '', outletId: '' }));
        setErrors((prev) => ({ ...prev, groupId: undefined, companyId: undefined, outletId: undefined }));
    };

    const handleCompanyChange = (value) => {
        setForm((f) => ({ ...f, companyId: value, outletId: '' }));
        setErrors((prev) => ({ ...prev, companyId: undefined, outletId: undefined }));
    };

    const handleUnitChange = (value) => {
        setForm((f) => ({ ...f, outletId: value }));
        setErrors((prev) => ({ ...prev, outletId: undefined }));
    };

    // Role select writes to departmentId — that's the key mapEmployeeToForm
    // actually populates with the employee's roleId (via its
    // department -> departmentId -> roleId fallback), and it's also the key
    // buildEmployeePayload reads back out to `roleId`/`departmentId` on save.
    const handleRoleChange = (value) => {
        setForm((f) => ({ ...f, departmentId: value }));
        setErrors((prev) => ({ ...prev, departmentId: undefined }));
    };

    const validate = () => {
        const e = {};
        e.firstName = validateRequired(form.firstName, 'First name');
        e.email = validateEmail(form.email);
        e.mobile = validateMobile(form.mobile);

        if (form.altMobile) {
            const altErr = validateMobile(form.altMobile);
            e.altMobile = altErr === 'Mobile number is required' ? '' : altErr;
        }

        e.designation = validateRequired(form.designation, 'Designation');
        e.groupId = validateRequired(form.groupId, 'Group');
        e.departmentId = validateRequired(form.departmentId, 'Role');

        e.addressLine1 = validateRequired(form.addressLine1, 'Address line 1');
        e.countryId = validateRequired(form.countryId, 'Country');
        e.stateId = validateRequired(form.stateId, 'State');
        e.cityId = validateRequired(form.cityId, 'City');
        e.pincode = validatePincode(form.pincode);

        Object.keys(e).forEach((key) => {
            if (!e[key]) delete e[key];
        });

        return e;
    };

    const focusFirstError = (errs) => {
        const firstKey = Object.keys(errs)[0];
        if (!firstKey) return;
        const el = document.querySelector(`[name="${firstKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus?.();
    };

    const handleCancel = () => {
        setForm(saved);
        setErrors({});
        setSubmitError('');
        setEditing(false);
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            focusFirstError(errs);
            return;
        }

        setSubmitting(true);
        setSubmitError('');
        try {
            const payload = buildEmployeePayload(form, { isEditMode: true });
            const res = await updateEmployee(payload);
            const updatedEmp = extractItem(res) || { ...raw, ...payload };
            const updatedForm = mapEmployeeToForm(updatedEmp);
            // mapEmployeeToForm always blanks groupId/companyId/outletId —
            // carry the ones the user just picked forward instead of losing them.
            updatedForm.groupId = form.groupId;
            updatedForm.companyId = form.companyId;
            updatedForm.outletId = form.outletId;

            setRaw(updatedEmp);
            setSaved(updatedForm);
            setForm(updatedForm);
            setEditing(false);
        } catch (err) {
            console.error(err);
            const data = err?.response?.data;
            const errorMsg =
                data?.errorMessage ||
                data?.message ||
                (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
                err?.message ||
                'Something went wrong while updating your profile. Please try again.';
            setSubmitError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!saved) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <p className="text-sm text-gray-500">{submitError || 'No profile data found.'}</p>
            </div>
        );
    }

    // View-mode combined name — prefer the server's fullName, fall back to
    // joining the split parts (e.g. right after a save response).
    const fullNameDisplay =
        raw?.fullName || [form.firstName, form.middlename, form.lastName].filter(Boolean).join(' ');

    // View-mode org label: once the user has picked a Group/Sub Company/Unit,
    // prefer the human name for whichever level is currently selected;
    // otherwise fall back to the org name the API originally returned.
    const orgViewValue =
        outlets.find((u) => String(u.id) === String(form.outletId))?.name ||
        subCompanies.find((c) => String(c.id) === String(form.companyId))?.name ||
        groups.find((g) => String(g.id) === String(form.groupId))?.name ||
        raw?.organizationName;

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
                    <div className="hidden text-sm text-gray-500 sm:block">
                        <span className="text-blue-600">Dashboard</span>
                        <span className="mx-1.5">›</span>
                        <span>My Profile</span>
                    </div>
                </div>

                {submitError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                    </div>
                )}

                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{fullNameDisplay}</h2>
                                <p className="text-sm text-gray-500">{form.designation}</p>
                                <span
                                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${raw?.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                                        }`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${raw?.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    {raw?.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!editing ? (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition cursor-pointer border-0 bg-[#084E92] text-white hover:bg-blue-900"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition cursor-pointer border-0 bg-[#084E92] text-white hover:bg-blue-900"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-6 space-y-8">
                        {/* Personal Information */}
                        <section>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Personal Information
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {editing ? (
                                    <>
                                        <Field
                                            label="First Name"
                                            icon={User}
                                            name="firstName"
                                            value={form.firstName}
                                            editing
                                            onChange={(e) => set('firstName', e.target.value)}
                                            error={errors.firstName}
                                            required
                                            placeholder="First name"
                                        />
                                        <Field
                                            label="Middle Name"
                                            name="middlename"
                                            value={form.middlename}
                                            editing
                                            onChange={(e) => set('middlename', e.target.value)}
                                            placeholder="Middle name"
                                        />
                                        <Field
                                            label="Last Name"
                                            name="lastName"
                                            value={form.lastName}
                                            editing
                                            onChange={(e) => set('lastName', e.target.value)}
                                            placeholder="Last name"
                                        />
                                    </>
                                ) : (
                                    <ViewField label="Full Name" icon={User} value={fullNameDisplay} />
                                )}

                                <Field
                                    label="Email Address"
                                    icon={Mail}
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    editing={editing}
                                    onChange={handleEmailChange}
                                    error={errors.email}
                                    required
                                    placeholder="example@jaiswalgroup.com"
                                />
                                <Field
                                    label="Mobile Number"
                                    icon={Phone}
                                    name="mobile"
                                    value={form.mobile}
                                    editing={editing}
                                    onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))}
                                    error={errors.mobile}
                                    required
                                    placeholder="+91 00000 00000"
                                    maxLength={10}
                                />
                                <Field
                                    label="Alternate Mobile Number"
                                    icon={Smartphone}
                                    name="altMobile"
                                    value={form.altMobile}
                                    editing={editing}
                                    onChange={(e) => set('altMobile', e.target.value.replace(/\D/g, ''))}
                                    error={errors.altMobile}
                                    placeholder="+91 00000 00000"
                                    maxLength={10}
                                />
                            </div>
                        </section>

                        {/* Work Information */}
                        <section>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Work Information
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Field
                                    label="Designation"
                                    icon={Briefcase}
                                    name="designation"
                                    value={form.designation}
                                    editing={editing}
                                    onChange={(e) => set('designation', e.target.value)}
                                    error={errors.designation}
                                    required
                                    placeholder="e.g., Manager"
                                />
                                <Field
                                    label="User Code"
                                    icon={BadgeCheck}
                                    name="userCode"
                                    value={form.userCode}
                                    editing={editing}
                                    onChange={(e) => set('userCode', e.target.value)}
                                    placeholder="e.g., JG-2026-0001"
                                />

                                {editing ? (
                                    <>
                                        <div>
                                            <Label required>Group</Label>
                                            <SearchableSelect
                                                name="groupId"
                                                value={form.groupId}
                                                onChange={(e) => handleGroupChange(e.target.value)}
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
                                                onChange={(e) => handleCompanyChange(e.target.value)}
                                                placeholder={
                                                    loadingOrgs
                                                        ? 'Loading...'
                                                        : form.groupId
                                                            ? 'Select Sub Company (optional)'
                                                            : 'Select group first'
                                                }
                                                options={subCompanies.map((c) => ({ value: c.id, label: c.name }))}
                                                disabled={!form.groupId || loadingOrgs}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Leave blank to register under the Group.</p>
                                        </div>
                                        <div>
                                            <Label>Unit</Label>
                                            <SearchableSelect
                                                name="outletId"
                                                value={form.outletId}
                                                onChange={(e) => handleUnitChange(e.target.value)}
                                                placeholder={
                                                    loadingOrgs
                                                        ? 'Loading...'
                                                        : form.companyId
                                                            ? 'Select Unit (optional)'
                                                            : 'Select sub company first'
                                                }
                                                options={outlets.map((u) => ({ value: u.id, label: u.name }))}
                                                disabled={!form.companyId || loadingOrgs}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Leave blank to register under the Sub Company.</p>
                                        </div>
                                    </>
                                ) : (
                                    <ViewField label="Organization" icon={Building2} value={orgViewValue} />
                                )}

                                {editing ? (
                                    <div>
                                        <Label required>Role</Label>
                                        <SearchableSelect
                                            name="departmentId"
                                            value={form.departmentId}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            placeholder={loadingRoles ? 'Loading...' : 'Select Role'}
                                            options={roles.map((r) => ({ value: r.id, label: r.name }))}
                                            hasError={!!errors.departmentId}
                                            disabled={loadingRoles}
                                        />
                                        <ErrorText message={errors.departmentId} />
                                    </div>
                                ) : (
                                    <ViewField label="Role" icon={BadgeCheck} value={formatRole(raw?.roleName)} />
                                )}
                            </div>
                        </section>

                        {/* Address */}
                        <section>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Residential Address
                            </p>

                            {editing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label required>Address Line 1</Label>
                                            <input
                                                name="addressLine1"
                                                value={form.addressLine1}
                                                onChange={(e) => set('addressLine1', e.target.value)}
                                                placeholder="Building, Street Name"
                                                className={errors.addressLine1 ? errorInputCls : inputCls}
                                            />
                                            <ErrorText message={errors.addressLine1} />
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <Label required>Country</Label>
                                            <SearchableSelect
                                                name="countryId"
                                                value={form.countryId}
                                                onChange={(e) => handleCountryChange({ target: { value: e.target.value } })}
                                                placeholder={loadingCountries ? 'Loading...' : 'Select Country'}
                                                options={countries.map((c) => ({ value: c.id, label: c.name }))}
                                                hasError={!!errors.countryId}
                                                disabled={loadingCountries}
                                            />
                                            <ErrorText message={errors.countryId} />
                                        </div>
                                        <div>
                                            <Label required>State</Label>
                                            <SearchableSelect
                                                name="stateId"
                                                value={form.stateId}
                                                onChange={(e) => handleStateChange({ target: { value: e.target.value } })}
                                                placeholder={
                                                    loadingStates ? 'Loading...' : form.countryId ? 'Select State' : 'Select country first'
                                                }
                                                options={states.map((s) => ({ value: s.id, label: s.name }))}
                                                hasError={!!errors.stateId}
                                                disabled={!form.countryId || loadingStates}
                                            />
                                            <ErrorText message={errors.stateId} />
                                        </div>
                                        <div>
                                            <Label required>City</Label>
                                            <SearchableSelect
                                                name="cityId"
                                                value={form.cityId}
                                                onChange={(e) => handleCityChange({ target: { value: e.target.value } })}
                                                placeholder={
                                                    loadingCities ? 'Loading...' : form.stateId ? 'Select City' : 'Select state first'
                                                }
                                                options={cities.map((c) => ({ value: String(c.id), label: c.name }))}
                                                hasError={!!errors.cityId}
                                                disabled={!form.stateId || loadingCities}
                                            />
                                            <ErrorText message={errors.cityId} />
                                        </div>
                                        <div>
                                            <Label required>Pincode</Label>
                                            <input
                                                name="pincode"
                                                value={form.pincode}
                                                onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
                                                placeholder="6 Digits"
                                                maxLength={6}
                                                className={errors.pincode ? errorInputCls : inputCls}
                                            />
                                            <ErrorText message={errors.pincode} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <ViewField
                                        label="Address"
                                        value={[raw?.addressLine1, raw?.addressLine2].filter(Boolean).join(', ')}
                                    />
                                    <ViewField label="City" value={raw?.cityName} />
                                    <ViewField label="State" value={raw?.stateName} />
                                    <ViewField label="Country" value={raw?.countryName} />
                                    <ViewField label="Pincode" value={raw?.pincode} />
                                </div>
                            )}
                        </section>
                    </div>

                    {editing && (
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
