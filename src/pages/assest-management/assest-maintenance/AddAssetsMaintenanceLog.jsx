import { ArrowLeft, Building2, ChevronRight, ClipboardList, Info, MapPin, Save, Store, Users, Wrench } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { Container } from "@/components/common/container";
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import SearchableSelect from '../../../utils/SearchableSelect';
import {
    getAllAssets,
    getRegisteredCompany,
    createAssetMaintenance,
    updateAssetMaintenance,
    getAllAssetsMaintenance,
    getAssetMaintenanceById,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';

const inputCls =
    'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 ' +
    'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const STATUS_OPTIONS = [
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
];

// Org type -> friendly badge label, shown next to the "Company" label
// once something is picked (mirrors AddAssignAsset's Companies field).
const ORG_TYPE_META = {
    GROUP: { label: 'Group', icon: Users },
    SUB_COMPANY: { label: 'Company', icon: Building2 },
    OUTLET: { label: 'Outlet', icon: Store },
};
const orgTypeLabel = (orgType) => ORG_TYPE_META[orgType]?.label ?? '—';

// yyyy-MM-dd (native date input) -> dd/MM/yyyy (API format)
const toApiDate = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

// dd/MM/yyyy (API format) -> yyyy-MM-dd (native date input)
const toInputDate = (apiDate) => {
    if (!apiDate) return '';
    const [day, month, year] = apiDate.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const unwrapList = (response) => response?.data?.data ?? response?.data ?? [];

const mapAssetToOption = (asset) => ({
    value: String(asset.id),
    label: asset.assetCode ? `${asset.assetCode} — ${asset.itemName}` : (asset.itemName ?? `Asset ${asset.id}`),
});


const mapMaintenanceToForm = (record) => ({
    assetId: record.assetId != null ? String(record.assetId) : "",
    company: "", // resolved separately once `organizations` has loaded
    unit: "",
    maintenanceDate: toInputDate(record.maintenanceDate),
    engineerName: record.engineerName ?? "",
    complaint: record.complaint ?? "",
    actionTaken: record.actionTaken ?? "",
    maintenanceCost: record.cost != null ? String(record.cost) : "",
    downtime: record.downtimeHours != null ? String(record.downtimeHours) : "",
    status: record.status ?? "",
    nextServiceDate: toInputDate(record.nextServiceDate),
});

const initialForm = {
    assetId: "",
    company: "", // Companies dropdown: holds a GROUP or SUB_COMPANY id
    unit: "", // Unit dropdown: holds an OUTLET id, scoped under `company`
    maintenanceDate: "",
    engineerName: "",
    complaint: "",
    actionTaken: "",
    maintenanceCost: "",
    downtime: "",
    status: "",
    nextServiceDate: "",
};



const AddAssetsMaintenanceLog = () => {
    const { canAdd, canView } = usePagePermissions('Asset Maintenance');
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const [assets, setAssets] = useState([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    const [organizations, setOrganizations] = useState([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);

    const [fetchedRecord, setFetchedRecord] = useState( null);
    const [loadingRecord, setLoadingRecord] = useState(false);

    // Load asset list once
    useEffect(() => {
        const loadAssets = async () => {
            setLoadingAssets(true);

            try {
                const response = await getAllAssets();
                setAssets(unwrapList(response));
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingAssets(false);
            }
        };

        loadAssets();
    }, []);

    // Load the full Group/Company/Outlet org list once
    useEffect(() => {
        const loadOrganizations = async () => {
            setLoadingOrganizations(true);

            try {
                const response = await getRegisteredCompany();
                setOrganizations(unwrapList(response));
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingOrganizations(false);
            }
        };

        loadOrganizations();
    }, []);


    useEffect(() => {
        if (!isEditMode || fetchedRecord) return;

        const loadRecord = async () => {
            setLoadingRecord(true);

            try {
                const response = await getAssetMaintenanceById(id);
                const record = response?.data?.data ?? response?.data ?? null;

                if (record) setFetchedRecord(record);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingRecord(false);
            }
        };

        loadRecord();
    }, [isEditMode, id, fetchedRecord]);
    // Populate simple fields as soon as we have the record.
    useEffect(() => {
        if (!fetchedRecord) return;

        setForm((prev) => ({ ...prev, ...mapMaintenanceToForm(fetchedRecord) }));
    }, [fetchedRecord]);

    // Populate company/unit once organizations are loaded (need org list to
    // know whether organizationId refers to a Group, Company, or Outlet).
    useEffect(() => {
        if (!fetchedRecord || organizations.length === 0) return;

        const orgId = fetchedRecord.orgId ;
        const org = (organizations ?? []).find((o) => String(o.id) === String(orgId));

        if (!org) return;

        if (org.orgType === 'OUTLET') {
            setForm((prev) => ({
                ...prev,
                company: org.parentId != null ? String(org.parentId) : "",
                unit: String(org.id),
            }));
        } else {
            // GROUP or SUB_COMPANY was selected directly, with no Unit.
            setForm((prev) => ({
                ...prev,
                company: String(org.id),
                unit: "",
            }));
        }
    }, [fetchedRecord, organizations]);

    const assetOptions = useMemo(
        () => (assets ?? []).map(mapAssetToOption),
        [assets],
    );

    // "Company" dropdown = Group + Company (SUB_COMPANY) orgs only.
    const companyOptions = useMemo(
        () =>
            (organizations ?? [])
                .filter((o) => o.orgType === 'GROUP' || o.orgType === 'SUB_COMPANY')
                .map((o) => ({ value: String(o.id), label: o.companyNameEnglish || orgTypeLabel(o.orgType) })),
        [organizations],
    );


    const selectedCompanyOrg = useMemo(() => {
        if (!form.company) return null;
        return (organizations ?? []).find((o) => String(o.id) === String(form.company)) ?? null;
    }, [organizations, form.company]);

    const unitOptions = useMemo(() => {
        if (!selectedCompanyOrg) return [];

        if (selectedCompanyOrg.orgType === 'SUB_COMPANY') {
            return (organizations ?? [])
                .filter((o) => o.orgType === 'OUTLET' && o.parentId === selectedCompanyOrg.id)
                .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
        }

        // GROUP: outlets belonging to any company under this group.
        const companyIds = new Set(
            (organizations ?? [])
                .filter((o) => o.orgType === 'SUB_COMPANY' && o.parentId === selectedCompanyOrg.id)
                .map((o) => o.id),
        );

        return (organizations ?? [])
            .filter((o) => o.orgType === 'OUTLET' && companyIds.has(o.parentId))
            .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
    }, [organizations, selectedCompanyOrg]);

    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        set(name, value);
    };

    const handleAssetChange = (e) => {
        set('assetId', e.target.value);
    };

    // Switching Company resets Unit, since Unit is scoped under Company.
    const handleCompanyChange = (e) => {
        const newCompanyId = e.target.value;
        setForm((prev) => ({ ...prev, company: newCompanyId, unit: '' }));
        setErrors((prev) => ({ ...prev, company: undefined }));
    };

    const handleUnitChange = (e) => {
        set('unit', e.target.value);
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        set(name, value);
    };
    const handleNumericChange = (e) => {
    const { name, value } = e.target;

    if (value === "" || /^\d*\.?\d*$/.test(value)) {
        set(name, value);
    }
};

    const Label = ({ children, required, hint }) => (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
            {children}
            {required && <span className="text-red-500">*</span>}
            {hint && (
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-[9px] leading-3.25 text-gray-400 text-center font-semibold">
                    i
                </span>
            )}
        </label>
    );

    if (!canView || !canAdd) {
        return <AccessDenied pageTitle={isEditMode ? "Edit Maintenance Log" : "Add Maintenance Log"} />;
    }

    const validate = () => {
        const nextErrors = {};

        if (!form.assetId) nextErrors.assetId = "Asset is required";
        if (!form.company) nextErrors.company = "Company is required";

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const buildPayload = () => {
        const createdBy = getUserIdFromToken() || 0;
        const orgId  = Number(form.unit || form.company) || 0;

        return {
            actionTaken: form.actionTaken,
            assetId: Number(form.assetId) || 0,
            complaint: form.complaint,
            cost: Number(form.maintenanceCost) || 0,
            createdBy,
            downtimeHours: Number(form.downtime) || 0,
            engineerName: form.engineerName,
            maintenanceDate: toApiDate(form.maintenanceDate),
            nextServiceDate: toApiDate(form.nextServiceDate),
            status: form.status || "PENDING",
            orgId ,
        };
    };

    const handleSave = async (addAnother = false) => {
        if (!validate()) return;

        setSubmitting(true);

        try {
            const payload = buildPayload();

            if (isEditMode) {
                await updateAssetMaintenance(Number(id), payload);
                navigate('/assets/asset-maintenance');
            } else {
                await createAssetMaintenance(payload);

                if (addAnother) {
                    setForm(initialForm);
                } else {
                    navigate('/assets/asset-maintenance');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        if (isEditMode && fetchedRecord) {
            setForm((prev) => ({ ...prev, ...mapMaintenanceToForm(fetchedRecord) }));
        } else {
            setForm(initialForm);
        }
        setErrors({});
    };

    const saveLabel = isEditMode
        ? (submitting ? 'Updating...' : 'Update Maintenance Log')
        : (submitting ? 'Saving...' : 'Save Maintenance Log');

    return (
       <Container>
         <div className='p-4 md:p-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#002246] font-medium">
                    {isEditMode ? 'Edit Maintenance Log' : 'Add Maintenance Log'}
                </span>
            </div>
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        {isEditMode ? 'Update Maintenance Log' : 'Maintenance Log Registration'}
                    </h1>

                    <p className="text-sm text-gray-500 mt-1">
                        {isEditMode
                            ? 'Update the details of this maintenance record.'
                            : 'Record maintenance activities performed on assets for tracking and service history.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/assets/asset-maintenance">
                        <button
                            type="button"
                            className="flex items-center cursor-pointer gap-2 px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to List
                        </button>
                    </Link>

                    <button
                        type="button"
                        disabled={submitting || loadingRecord}
                        onClick={() => handleSave(false)}
                        className="flex items-center cursor-pointer gap-2 px-5 py-2.5 rounded-lg bg-[#084E92] text-white font-medium hover:bg-[#073e77] transition disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saveLabel}
                    </button>
                </div>
            </div>

            <div className="mt-5 border rounded-2xl shadow-2xs flex flex-col">
                {loadingRecord && (
                    <div className="px-6 pt-6 text-sm text-gray-500">
                        Loading maintenance record...
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">

                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                                <ClipboardList className="w-4 h-4" />
                            </div>

                            <h2 className="font-semibold text-gray-800">
                                Asset Information
                            </h2>
                        </div>

                        <div className="space-y-4">

                            {/* Asset */}
                            <div>
                                <Label required>Asset</Label>

                                <SearchableSelect
                                    name="assetId"
                                    value={form.assetId}
                                    onChange={handleAssetChange}
                                    placeholder={loadingAssets ? "Loading assets..." : "Select Asset..."}
                                    options={assetOptions}
                                    disabled={loadingAssets}
                                    hasError={!!errors.assetId}
                                />
                                {errors.assetId && (
                                    <p className="text-xs text-red-500 mt-1">{errors.assetId}</p>
                                )}
                            </div>

                            {/* Company + Unit */}
                            <div className="grid sm:grid-cols-2 gap-4 items-center">

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <Label required>Company</Label>
                                        {selectedCompanyOrg && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-[#084E92] border border-blue-100">
                                                {orgTypeLabel(selectedCompanyOrg.orgType)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <SearchableSelect
                                            name="company"
                                            value={form.company}
                                            onChange={handleCompanyChange}
                                            placeholder={loadingOrganizations ? "Loading..." : "Search Group or Company..."}
                                            options={companyOptions}
                                            disabled={loadingOrganizations}
                                            hasError={!!errors.company}
                                        />

                                        {/* <MapPin className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /> */}
                                    </div>
                                    {errors.company && (
                                        <p className="text-xs text-red-500 mt-1">{errors.company}</p>
                                    )}
                                </div>

                                <div className='h-full flex flex-col gap-1.5'>
                                    <Label>Unit</Label>

                                    <SearchableSelect
                                        name="unit"
                                        value={form.unit}
                                        onChange={handleUnitChange}
                                        placeholder={!form.company ? "Select company first" : "Select Unit (Optional)..."}
                                        options={unitOptions}
                                        disabled={!form.company}
                                    />
                                </div>

                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">

                                <div>
                                    <Label>Date</Label>

                                    <input
                                        type="date"
                                        name="maintenanceDate"
                                        value={form.maintenanceDate}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <Label>Engineer Name</Label>

                                    <input
                                        name="engineerName"
                                        value={form.engineerName}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                        placeholder="John Doe"
                                    />
                                </div>

                            </div>

                            {/* Complaint */}
                            <div>
                                <Label>Complaint Description</Label>

                                <textarea
                                    name="complaint"
                                    value={form.complaint}
                                    onChange={handleInputChange}
                                    rows={5}
                                    placeholder="Describe the issue reported..."
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                        </div>
                    </div>

                    <div>

                        <div className="flex items-center gap-2 mb-5">

                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                                <Wrench className="w-4 h-4" />
                            </div>

                            <h2 className="font-semibold text-gray-800">
                                Service Details
                            </h2>

                        </div>

                        <div className="space-y-4">

                            {/* Action */}
                            <div>
                                <Label>Action Taken</Label>

                                <textarea
                                    name="actionTaken"
                                    value={form.actionTaken}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Detail the repairs performed..."
                                />
                            </div>

                            {/* Cost + Downtime */}

                            <div className="grid sm:grid-cols-2 gap-4">

                                <div>
                                    <Label>Maintenance Cost</Label>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                           ₹
                                        </span>

                                        <input
                                            name="maintenanceCost"
                                            value={form.maintenanceCost}
                                            onChange={handleNumericChange}
                                            className={`${inputCls} pl-7`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Downtime (Hours)</Label>

                                    <div className="relative">
                                        <input
                                            name="downtime"
                                            value={form.downtime}
                                           onChange={handleNumericChange}
                                            className={`${inputCls} pr-12`}
                                            placeholder="e.g. 4.5"
                                        />

                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            HRS
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Status + Next Service */}

                            <div className="grid sm:grid-cols-2 gap-4">

                                <div>
                                    <Label>Status</Label>

                                    <SearchableSelect
                                        name="status"
                                        value={form.status}
                                        onChange={handleSelectChange}
                                        placeholder="Select Status..."
                                        options={STATUS_OPTIONS}
                                    />
                                </div>

                                <div>
                                    <Label>Next Service Date</Label>

                                    <input
                                        type="date"
                                        name="nextServiceDate"
                                        value={form.nextServiceDate}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                    />
                                </div>

                            </div>

                            {/* Information Box */}

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">

                                <Info className="w-5 h-5 text-[#084E92] mt-0.5" />

                                <p className="text-xs leading-5 text-gray-700">
                                    Maintenance history for this asset will be updated
                                    automatically upon saving this log. Notifications
                                    will be sent to the department head.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>
                {/* Footer Actions */}
                <div className="border-t border-[#DCE5EF] mt-8 p-6 mx-6">
                    <div className="flex items-center justify-end flex-wrap gap-4">

                        {/* Right Side */}
                        <div className="flex items-center gap-3 flex-col md:flex-row">

                            {!isEditMode && (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleSave(true)}
                                    className="px-6 py-2.5 cursor-pointer rounded-lg text-sm border border-[#084E92] text-[#084E92] font-semibold hover:bg-blue-50 transition disabled:opacity-60"
                                >
                                    Save & Add Another
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={submitting || loadingRecord}
                                onClick={() => handleSave(false)}
                                className="px-6 py-2.5 cursor-pointer rounded-lg text-sm bg-[#084E92] text-white font-semibold hover:bg-[#073e77] transition disabled:opacity-60"
                            >
                                {saveLabel}
                            </button>

                        </div>

                    </div>
                </div>
            </div>

        </div>
       </Container>
    )
}

export default AddAssetsMaintenanceLog;