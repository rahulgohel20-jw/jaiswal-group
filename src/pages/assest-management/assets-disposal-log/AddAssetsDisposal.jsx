import {
    ArrowLeft,
    ChevronRight,
    FileText,
    Save,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Container } from "@/components/common/container";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import SearchableSelect from "../../../utils/SearchableSelect";
import {
    getAllAssets,
    getAllActiveEmployees,
    createAssetDisposal,
    updateAssetDisposal,
    getAssetDisposalById,
    getAllActiveSubOutlets,
    getRegisteredCompany,
} from "../../../services/apiServices";
import { getUserIdFromToken } from "../../../utils/auth";
import { OrgTypes } from "../../../constants/orgTypes";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 " +
    "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const DISPOSAL_METHOD_OPTIONS = [
    { value: "SALE", label: "Sale" },
    { value: "SCRAP", label: "Scrap" },
    { value: "DONATION", label: "Donation" },
    { value: "RECYCLED", label: "Recycled" },
];

// yyyy-MM-dd (native date input) -> dd/MM/yyyy (API format)
const toApiDate = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
};

// dd/MM/yyyy (API format) -> yyyy-MM-dd (native date input)
const toInputDate = (apiDate) => {
    if (!apiDate) return "";

    const [day, month, year] = apiDate.split("/");

    if (!day || !month || !year) {
        return "";
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const unwrapList = (response) => response?.data?.data ?? response?.data ?? [];

const mapAssetToOption = (asset) => ({
    value: String(asset.id),
    label: asset.assetCode ? `${asset.assetCode} — ${asset.itemName}` : (asset.itemName ?? `Asset ${asset.id}`),
});

const mapEmployeeToOption = (employee) => ({
    value: String(employee.id),
    label: employee.fullName ?? employee.name ?? employee.employeeName ?? `Employee ${employee.id}`,
});

const orgTypeLabel = (orgType) => {
    switch (orgType) {
        case OrgTypes.GROUP:
            return "Group";
        case OrgTypes.SUB_COMPANY:
            return "Company";
        case OrgTypes.OUTLET:
            return "Outlet";
        default:
            return orgType ?? "";
    }
};

// Non-org fields only — company/unit are resolved separately once the
// organizations list is loaded (see the org-resolution effect below),
// since orgId on the record could point at a Company or an Outlet.
const mapDisposalToForm = (record) => ({
    assetId: record.assetId != null ? String(record.assetId) : "",
    subUnit: record.subOutletId != null ? String(record.subOutletId) : "",
    disposalDate: toInputDate(record.disposalDate),
    disposalMethod: record.disposableMethod ?? "",
    remarks: record.remarks ?? "",
    saleValue: record.saleValue != null ? String(record.saleValue) : "",
    qty: record.qty != null ? String(record.qty) : "",
    approvedById: record.approvedById != null ? String(record.approvedById) : "",
    isActive: record.isActive != null ? Boolean(record.isActive) : true,
});

const initialForm = {
    assetId: "",
    company: "",
    unit: "",
    subUnit: "",
    disposalDate: "",
    disposalMethod: "",
    remarks: "",
    saleValue: "",
    qty: "",
    approvedById: "",
    isActive: true,
};

const Label = ({ children, required }) => (
    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
        {children}
        {required && <span className="text-red-500">*</span>}
    </label>
);

const AddAssetsDisposal = () => {
    const { canAdd, canView } = usePagePermissions("Asset Disposal");
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const [assets, setAssets] = useState([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    const [organizations, setOrganizations] = useState([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);

    const [subOutlets, setSubOutlets] = useState([]);
    const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    const [fetchedRecord, setFetchedRecord] = useState(null);
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

    // Load flat org list once (Group / Company / Outlet)
    useEffect(() => {
        const loadOrganizations = async () => {
            setLoadingOrganizations(true);

            try {
                const response = await getRegisteredCompany();
                setOrganizations(unwrapList(response));
            } catch (error) {
                console.error("Error loading organizations:", error);
            } finally {
                setLoadingOrganizations(false);
            }
        };

        loadOrganizations();
    }, []);

    useEffect(() => {
        const loadSubOutlets = async () => {
            setLoadingSubOutlets(true);

            try {
                const response = await getAllActiveSubOutlets();
                setSubOutlets(unwrapList(response));
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingSubOutlets(false);
            }
        };

        loadSubOutlets();
    }, []);

    // Load active employees once (Approved By dropdown source)
    useEffect(() => {
        const loadEmployees = async () => {
            setLoadingEmployees(true);

            try {
                const response = await getAllActiveEmployees();
                setEmployees(unwrapList(response));
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingEmployees(false);
            }
        };

        loadEmployees();
    }, []);

    // Fetch the record being edited
    useEffect(() => {
        if (!isEditMode || !id) return;

        const loadRecord = async () => {
            setLoadingRecord(true);

            try {
                const response = await getAssetDisposalById(id);
                const record = response?.data?.data ?? response?.data ?? null;

                if (record) {
                    setFetchedRecord(record);
                }
            } catch (error) {
                console.error("Error loading disposal record:", error);
            } finally {
                setLoadingRecord(false);
            }
        };

        loadRecord();
    }, [isEditMode, id]);

    // Populate the non-org form fields once the record arrives
    useEffect(() => {
        if (!fetchedRecord) return;

        setForm((prev) => ({ ...prev, ...mapDisposalToForm(fetchedRecord) }));
    }, [fetchedRecord]);

    // Populate company/unit once organizations are loaded (need the org list
    // to know whether orgId refers to a Company or an Outlet).
    useEffect(() => {
        if (!fetchedRecord || organizations.length === 0) return;

        const org = organizations.find((o) => String(o.id) === String(fetchedRecord.orgId));

        if (!org) return;

        if (org.orgType === OrgTypes.OUTLET) {
            // orgId saved was a Unit → auto-select Unit, and Company = that unit's parent
            setForm((prev) => ({
                ...prev,
                company: org.parentId != null ? String(org.parentId) : "",
                unit: String(org.id),
            }));
        } else {
            // orgId saved was a Company (or Group) directly → no Unit
            setForm((prev) => ({
                ...prev,
                company: String(org.id),
                unit: "",
            }));
        }
    }, [fetchedRecord, organizations]);

    const assetOptions = useMemo(() => (assets ?? []).map(mapAssetToOption), [assets]);

    const employeeOptions = useMemo(() => (employees ?? []).map(mapEmployeeToOption), [employees]);

    const companyOptions = useMemo(
        () =>
            (organizations ?? [])
                .filter((o) => o.orgType === OrgTypes.GROUP || o.orgType === OrgTypes.SUB_COMPANY)
                .map((o) => ({
                    value: String(o.id),
                    label: o.companyNameEnglish || orgTypeLabel(o.orgType),
                })),
        [organizations]
    );

    const selectedCompanyOrg = useMemo(
        () => (organizations ?? []).find((o) => String(o.id) === String(form.company)),
        [organizations, form.company]
    );

    const unitOptions = useMemo(() => {
        if (!selectedCompanyOrg) return [];

        if (selectedCompanyOrg.orgType === OrgTypes.GROUP) {
            // Group selected → outlets under every company that belongs to this group
            const companyIdsInGroup = (organizations ?? [])
                .filter((o) => o.orgType === OrgTypes.SUB_COMPANY && String(o.parentId) === String(selectedCompanyOrg.id))
                .map((o) => String(o.id));

            return (organizations ?? [])
                .filter((o) => o.orgType === OrgTypes.OUTLET && companyIdsInGroup.includes(String(o.parentId)))
                .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
        }

        // Company selected → outlets directly under it
        return (organizations ?? [])
            .filter((o) => o.orgType === OrgTypes.OUTLET && String(o.parentId) === String(selectedCompanyOrg.id))
            .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
    }, [organizations, selectedCompanyOrg]);

    const subUnitOptions = useMemo(
        () =>
            (subOutlets ?? [])
                .filter((subOutlet) => {
                    if (!form.unit) return true;

                    return String(subOutlet.organizationId) === String(form.unit);
                })
                .map((subOutlet) => ({
                    value: String(subOutlet.id),
                    label: subOutlet.subOutletName ?? `Sub Unit ${subOutlet.id}`,
                })),
        [subOutlets, form.unit]
    );

    const set = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        set(name, value);
    };

    const handleAssetChange = (e) => {
        set("assetId", e.target.value);
    };

    const handleCompanyChange = (e) => {
        const companyId = e.target.value;

        setForm((prev) => ({
            ...prev,
            company: companyId,
            unit: "",
            subUnit: "",
        }));

        setErrors((prev) => ({
            ...prev,
            company: undefined,
            unit: undefined,
            subUnit: undefined,
        }));
    };

    const handleUnitChange = (e) => {
        const unitId = e.target.value;

        setForm((prev) => ({
            ...prev,
            unit: unitId,
            subUnit: "",
        }));

        setErrors((prev) => ({
            ...prev,
            unit: undefined,
            subUnit: undefined,
        }));
    };

    const handleSubUnitChange = (e) => {
        set("subUnit", e.target.value);
    };

    const handleApprovedByChange = (e) => {
        set("approvedById", e.target.value);
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

    if (!canView || !canAdd) {
        return <AccessDenied pageTitle={isEditMode ? "Edit Disposal Record" : "Asset Disposal Registration"} />;
    }

    const validate = () => {
        const nextErrors = {};

        if (!form.assetId) nextErrors.assetId = "Asset is required";
        if (!form.company) nextErrors.company = "Company is required";
        if (!form.unit) nextErrors.unit = "Unit is required";
        if (!form.disposalDate) nextErrors.disposalDate = "Disposal date is required";
        if (!form.disposalMethod) nextErrors.disposalMethod = "Disposal method is required";
        if (!form.approvedById) nextErrors.approvedById = "Approved by is required";

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const buildPayload = () => {
        const currentUserId = getUserIdFromToken() || 0;

        const resolvedOrgId = form.unit ? Number(form.unit) || 0 : Number(form.company) || 0;

        return {
            approvedById: Number(form.approvedById) || 0,
            assetId: Number(form.assetId) || 0,
            createdBy: isEditMode ? (fetchedRecord?.createdBy ?? currentUserId) : currentUserId,

            disposableMethod: form.disposalMethod,
            disposalDate: toApiDate(form.disposalDate),

            isActive: !!form.isActive,

            orgId: resolvedOrgId,

            qty: Number(form.qty) || 0,
            remarks: form.remarks,
            saleValue: Number(form.saleValue) || 0,

            subOutletId: form.subUnit ? Number(form.subUnit) : 0,

            updatedBy: currentUserId,
        };
    };

    const handleSave = async (addAnother = false) => {
        if (!validate()) return;

        setSubmitting(true);

        try {
            const payload = buildPayload();

            if (isEditMode) {
                await updateAssetDisposal(Number(id), payload);
                navigate("/assets/asset-disposal");
            } else {
                await createAssetDisposal(payload);

                if (addAnother) {
                    setForm(initialForm);
                } else {
                    navigate("/assets/asset-disposal");
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
            setForm((prev) => ({ ...prev, ...mapDisposalToForm(fetchedRecord) }));
        } else {
            setForm(initialForm);
        }
        setErrors({});
    };

    const saveLabel = isEditMode
        ? submitting
            ? "Updating..."
            : "Update Disposal Record"
        : submitting
            ? "Saving..."
            : "Save Disposal Record";

    return (
        <Container>
            <div className="p-4 md:p-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Asset Management</span>
                    <ChevronRight size={12} />
                    <span className="text-[#0151a8] font-medium">
                        {isEditMode ? "Edit Disposal Record" : "Asset Disposal Registration"}
                    </span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {isEditMode ? "Update Disposal Record" : "Asset Disposal Registration"}
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            {isEditMode
                                ? "Update the details of this disposal record."
                                : "Systematically record disposal details for organizational assets to ensure accurate lifecycle tracking and regulatory compliance."}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link to="/assets/asset-disposal">
                            <button
                                type="button"
                                className="flex items-center cursor-pointer text-xs gap-2 border-2 border-[#E2E8F0] text-[#334155] font-semibold px-5 py-2.5 rounded-lg bg-white hover:bg-gray-50"
                            >
                                <ArrowLeft size={16} />
                                Back to List
                            </button>
                        </Link>

                        <button
                            type="button"
                            disabled={submitting || loadingRecord}
                            onClick={() => handleSave(false)}
                            className="flex items-center cursor-pointer text-xs gap-2 bg-[#084E92] text-white px-5 py-2.5 rounded-lg hover:bg-[#06396c] disabled:opacity-60"
                        >
                            <Save size={16} />
                            {saveLabel}
                        </button>
                    </div>
                </div>

                {/* Card */}
                <div className="mt-6 rounded-2xl border shadow-sm overflow-hidden">
                    {loadingRecord && (
                        <div className="px-6 pt-6 text-sm text-gray-500">Loading disposal record...</div>
                    )}

                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                                <FileText size={18} />
                            </div>

                            <div>
                                <h2 className="font-semibold text-gray-800">Disposal Information</h2>
                                <p className="text-xs text-gray-500">
                                    Please provide accurate details of the asset disposal event.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
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
                                {errors.assetId && <p className="text-xs text-red-500 mt-1">{errors.assetId}</p>}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Company */}
                                <div>
                                    <Label required>Company</Label>

                                    <SearchableSelect
                                        name="company"
                                        value={form.company}
                                        onChange={handleCompanyChange}
                                        placeholder={loadingOrganizations ? "Loading Companies..." : "Select Company..."}
                                        options={companyOptions}
                                        disabled={loadingOrganizations}
                                        hasError={!!errors.company}
                                    />

                                    {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
                                </div>

                                {/* Unit */}
                                <div>
                                    <Label required>Unit</Label>

                                    <SearchableSelect
                                        name="unit"
                                        value={form.unit}
                                        onChange={handleUnitChange}
                                        placeholder={
                                            loadingOrganizations
                                                ? "Loading Units..."
                                                : !form.company
                                                    ? "Select Company First..."
                                                    : "Select Unit..."
                                        }
                                        options={unitOptions}
                                        disabled={loadingOrganizations || !form.company}
                                        hasError={!!errors.unit}
                                    />

                                    {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Date */}
                                <div>
                                    <Label required>Disposal Date</Label>

                                    <input
                                        type="date"
                                        name="disposalDate"
                                        value={form.disposalDate}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                    />
                                    {errors.disposalDate && (
                                        <p className="text-xs text-red-500 mt-1">{errors.disposalDate}</p>
                                    )}
                                </div>

                                {/* Sub Unit */}
                                <div>
                                    <Label>Sub Unit</Label>

                                    <SearchableSelect
                                        name="subUnit"
                                        value={form.subUnit}
                                        onChange={handleSubUnitChange}
                                        placeholder={
                                            loadingSubOutlets
                                                ? "Loading Sub Units..."
                                                : !form.unit
                                                    ? "Select Unit First..."
                                                    : "Select Sub Unit..."
                                        }
                                        options={subUnitOptions}
                                        disabled={loadingSubOutlets || !form.unit}
                                        hasError={!!errors.subUnit}
                                    />

                                    {errors.subUnit && <p className="text-xs text-red-500 mt-1">{errors.subUnit}</p>}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Method */}
                                <div>
                                    <Label required>Disposal Method</Label>

                                    <SearchableSelect
                                        name="disposalMethod"
                                        value={form.disposalMethod}
                                        onChange={handleSelectChange}
                                        placeholder="Select Method..."
                                        options={DISPOSAL_METHOD_OPTIONS}
                                        hasError={!!errors.disposalMethod}
                                    />
                                    {errors.disposalMethod && (
                                        <p className="text-xs text-red-500 mt-1">{errors.disposalMethod}</p>
                                    )}
                                </div>

                                {/* Qty */}
                                <div>
                                    <Label>Quantity</Label>

                                    <input
                                        name="qty"
                                        value={form.qty}
                                        onChange={handleNumericChange}
                                        className={inputCls}
                                        placeholder="e.g. 1"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Sale Value */}
                                <div>
                                    <Label>Sale Value (Realized)</Label>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>

                                        <input
                                            name="saleValue"
                                            value={form.saleValue}
                                            onChange={handleNumericChange}
                                            className={`${inputCls} pl-7`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Approved By */}
                                <div>
                                    <Label required>Approved By</Label>

                                    <SearchableSelect
                                        name="approvedById"
                                        value={form.approvedById}
                                        onChange={handleApprovedByChange}
                                        placeholder={loadingEmployees ? "Loading employees..." : "Select Employee..."}
                                        options={employeeOptions}
                                        disabled={loadingEmployees}
                                        hasError={!!errors.approvedById}
                                    />
                                    {errors.approvedById && (
                                        <p className="text-xs text-red-500 mt-1">{errors.approvedById}</p>
                                    )}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="md:col-span-2">
                                <Label>Remarks</Label>

                                <textarea
                                    name="remarks"
                                    rows={5}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Detailed reason for disposing this asset (e.g., End of useful life, excessive maintenance costs, damaged beyond repair)..."
                                    value={form.remarks}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Active */}
                            <div className="flex items-center gap-2">
                                <input
                                    id="isActive"
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => set("isActive", e.target.checked)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Active
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t p-6 flex justify-end sm:flex-row flex-col flex-wrap gap-4 bg-[#F8FAFC80]">
                        <div className="flex gap-3">
                            {!isEditMode && (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleSave(true)}
                                    className="px-6 py-2 rounded-lg text-xs font-semibold cursor-pointer border-2 border-[#084E92] text-[#084E92] hover:bg-blue-50 disabled:opacity-60"
                                >
                                    Save & Add Another
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={submitting || loadingRecord}
                                onClick={() => handleSave(false)}
                                className="px-6 py-2 rounded-lg text-xs font-semibold cursor-pointer bg-[#084E92] text-white hover:bg-[#06396c] disabled:opacity-60"
                            >
                                {saveLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default AddAssetsDisposal;
