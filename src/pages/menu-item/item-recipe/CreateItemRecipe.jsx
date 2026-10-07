import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    ChevronDown,
    Copy,
    FileText,
    Layers,
    Menu,
    Plus,
    Search,
    SquarePen,
    Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import {
    getAllKitchenMenuItem,
    createKitchenMenuItemRecipe,
    updateKitchenMenuItemRecipe,
    getKitchenMenuItemRecipe,
    deleteKitchenMenuItemRawMaterialById,
    getAllRawMaterialItems,
    getAllRawMaterialUnits,
    getAllKitchenCaptainReceipeByOrgId,
    getAllRawMaterialCategoryType,
    getRawMaterialByType,
} from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getOrgIdFromToken } from "../../../utils/auth";
import { useOrgScope } from "@/hooks/useOrgScope";
import { Container } from "@/components/common/container";
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SearchableSelect from "../../../utils/SearchableSelect";
import DeleteConfirmModal from "@/utils/DeleteConfirmModal";
import KitchenCopyRecipeModal from "./KitchenCopyRecipeModal";
import UnitConversionModal from "./UnitConversionModal"; // <-- Import the external modal
import { PageHeader } from "@/components/common/PageHeader";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
    "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed";

const errorInputCls =
    "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
    "placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300";

const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;
const isValidUrl = (value) => urlPattern.test(String(value ?? "").trim());

const normalizeId = (val) => {
    if (val == null || val === "" || val === "undefined" || val === "null") return "";
    if (typeof val === "object") return val.id != null ? String(val.id) : "";
    return String(val).trim();
};

const getUnitLabel = (unitVal, fallback = "") => {
    if (!unitVal) return fallback;
    if (typeof unitVal === "string") return unitVal;
    if (typeof unitVal === "object") {
        return (
            unitVal.nameEnglish ||
            unitVal.unitName ||
            unitVal.name ||
            unitVal.symbolEnglish ||
            unitVal.symbol ||
            fallback
        );
    }
    return String(unitVal);
};

const initialForm = {
    instructionEnglish: "",
    instructionHindi: "",
    instructionGujarati: "",
    url: "",
    remarks: "",
};

const TYPE_OPTIONS = [
    { value: "LPG", label: "LPG" },
    { value: "ELECTRICITY", label: "Electricity" },
    { value: "OTHER", label: "Other" },
];

const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const SectionCard = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
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
                className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
        </button>
    </div>
);

const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${
            disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
        } ${checked ? "bg-[#084E92]" : "bg-gray-300"}`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                checked ? "translate-x-4.5" : ""
            }`}
        />
    </button>
);

const TableSearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative sm:w-[50%] w-full border border-gray-200 rounded text-sm text-gray-600 bg-gray-50">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-300 w-full transition placeholder-gray-400 bg-transparent"
        />
    </div>
);

let rawMaterialRowSeq = 1;
let captainRowSeq = 1;
let otherRowSeq = 1;

const getUnitOptions = (unitId, unitsList) => {
    if (!Array.isArray(unitsList) || unitsList.length === 0) return [];
    if (!unitId) return unitsList;

    const currentUnit = unitsList.find((u) => String(u.id) === String(unitId));
    if (!currentUnit) return unitsList;

    const parentId = currentUnit.parentUnit?.id ?? currentUnit.unitHierarchy?.id ?? null;
    const baseId = parentId ? String(parentId) : String(currentUnit.id);

    const parent = unitsList.find((u) => String(u.id) === baseId);
    const children = unitsList.filter(
        (u) =>
            String(u.parentUnit?.id) === baseId ||
            String(u.unitHierarchy?.id) === baseId
    );

    const related = [...(parent ? [parent] : []), ...children];

    const uniqueOptions = related.filter(
        (u, idx, arr) => arr.findIndex((x) => String(x.id) === String(u.id)) === idx
    );

    return uniqueOptions.length > 0 ? uniqueOptions : unitsList;
};

const CreateItemRecipe = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { id: paramItemId } = useParams();

    const isViewMode = location.pathname.includes("/view-recipe");
    const isEditMode = location.pathname.includes("/update-recipe");
    const isCreateMode = !isViewMode && !isEditMode;

    const returnUrl = useMemo(
        () => location.state?.returnUrl || "/menu-item/recipe",
        [location.state]
    );

    const handleNavigateBack = useCallback(() => {
        navigate(returnUrl, { state: { fromChild: true } });
    }, [navigate, returnUrl]);

    const {
        loading: orgScopeLoading,
        error: orgScopeError,
        isOutletUser,
        units,
        effectiveOutletId,
    } = useOrgScope();

    // Outlet Selection
    const [outlet, setOutlet] = useState(() => {
        if (!isCreateMode) {
            return (
                location.state?.orgId ??
                searchParams.get("orgId") ??
                (isOutletUser && effectiveOutletId ? String(effectiveOutletId) : "")
            );
        }
        return "";
    });

    // Menu Item Selection
    const [selectedMenuItem, setSelectedMenuItem] = useState(() => {
        if (!isCreateMode) {
            return paramItemId
                ? String(paramItemId)
                : location.state?.menuItemId
                    ? String(location.state.menuItemId)
                    : "";
        }
        return "";
    });

    const [menuItems, setMenuItems] = useState([]);
    const [menuItemsLoading, setMenuItemsLoading] = useState(false);

    // Track existing recipe
    const [isExistingRecipe, setIsExistingRecipe] = useState(false);
    const [headerId, setHeaderId] = useState(location.state?.headerId ?? 0);
    const [itemWeight, setItemWeight] = useState("");
    const [itemUnitId, setItemUnitId] = useState("");
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fetchSeq = useRef(0);

    // Form Details
    const [form, setForm] = useState(initialForm);
    const [urlError, setUrlError] = useState("");
    const [urlEditMode, setUrlEditMode] = useState(true);

    // Dynamic "Other" items
    const [otherRows, setOtherRows] = useState([]);

    const [openSections, setOpenSections] = useState({
        select: true,
        details: true,
        rawMaterial: true,
        captainRecipe: true,
    });

    // Conversion Modal State
    const [conversionModalOpen, setConversionModalOpen] = useState(false);

    // Raw Materials
    const [rawMaterialCatalog, setRawMaterialCatalog] = useState([]);
    const [unitCatalog, setUnitCatalog] = useState([]);
    const [rawMaterialLoading, setRawMaterialLoading] = useState(false);
    const [unitLoading, setUnitLoading] = useState(false);
    const [selectedRawMaterial, setSelectedRawMaterial] = useState("");
    const [selectedRawMaterialUnit, setSelectedRawMaterialUnit] = useState("");
    const [rawMaterialWeight, setRawMaterialWeight] = useState("");
    const [rawMaterialRows, setRawMaterialRows] = useState([]);
    const [rawMaterialTableSearch, setRawMaterialTableSearch] = useState("");
    const [rawMaterialPagination, setRawMaterialPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [rawMaterialRowSelection, setRawMaterialRowSelection] = useState({});
    const [editingRawMaterialRowId, setEditingRawMaterialRowId] = useState(null);

    // Dedicated Fuel & Electricity items state for the Other section
    const [fuelElectricityMaterials, setFuelElectricityMaterials] = useState([]);
    const [fuelMaterialsLoading, setFuelMaterialsLoading] = useState(false);

    // Captain Recipes
    const [captainRecipeCatalog, setCaptainRecipeCatalog] = useState([]);
    const [selectedCaptainRecipe, setSelectedCaptainRecipe] = useState("");
    const [selectedCaptainUnit, setSelectedCaptainUnit] = useState("");
    const [captainWeight, setCaptainWeight] = useState("");
    const [captainRows, setCaptainRows] = useState([]);
    const [captainTableSearch, setCaptainTableSearch] = useState("");
    const [captainPagination, setCaptainPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [captainRowSelection, setCaptainRowSelection] = useState({});
    const [editingCaptainRowId, setEditingCaptainRowId] = useState(null);

    // Modals
    const [copyRecipeOpen, setCopyRecipeOpen] = useState(false);
    const [isCaptainRecipe, setIsCaptainRecipe] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const isReady = Boolean(selectedMenuItem && outlet);
    const isUpdateAction = isEditMode || isExistingRecipe || Boolean(headerId);

    const pageTitle = isViewMode
        ? "View Item Recipe"
        : isUpdateAction
            ? "Update Item Recipe"
            : "Create Item Recipe";

    const toggleSection = (key) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const ownOutletId = useMemo(
        () => normalizeId(effectiveOutletId) || normalizeId(getOrgIdFromToken()),
        [effectiveOutletId]
    );

    const outletOptions = useMemo(() => {
        const all = (units || [])
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== "ALL")
            .map((unit) => ({
                value: String(unit.id),
                label: `${unit.name}${unit.code ? ` (${unit.code})` : ""}`,
            }));

        if (isOutletUser && ownOutletId) {
            const own = all.filter((o) => o.value === ownOutletId);
            return own.length > 0
                ? own
                : [{ value: ownOutletId, label: `Outlet #${ownOutletId}` }];
        }

        return all;
    }, [units, isOutletUser, ownOutletId]);

    // Load All Kitchen Menu Items for dropdown
    useEffect(() => {
        let isCancelled = false;

        const loadMenuItems = async () => {
            setMenuItemsLoading(true);
            try {
                const res = await getAllKitchenMenuItem({
                    page: 1,
                    size: 2000,
                    isAsc: true,
                });
                const payload = res?.data?.data ?? res?.data ?? {};
                const list = Array.isArray(payload.items)
                    ? payload.items
                    : Array.isArray(payload)
                        ? payload
                        : [];

                const activeItems = list.filter((item) => item.isActive !== false);

                if (!isCancelled) {
                    setMenuItems(activeItems);
                }
            } catch (err) {
                console.error("Failed to load menu items for dropdown:", err);
                if (!isCancelled) {
                    setMenuItems([]);
                    notify.error("Failed to load menu items");
                }
            } finally {
                if (!isCancelled) setMenuItemsLoading(false);
            }
        };

        loadMenuItems();
        return () => {
            isCancelled = true;
        };
    }, []);

    const menuItemOptions = useMemo(
        () =>
            menuItems.map((item) => ({
                value: String(item.id),
                label: item.nameEnglish || item.name || `Item #${item.id}`,
            })),
        [menuItems]
    );

    const selectedMenuItemObj = useMemo(
        () => menuItems.find((item) => String(item.id) === String(selectedMenuItem)),
        [menuItems, selectedMenuItem]
    );

    const resetRecipeState = useCallback(() => {
        setIsExistingRecipe(false);
        setHeaderId(0);
        setItemWeight("");
        setItemUnitId("");
        setForm(initialForm);
        setUrlError("");
        setUrlEditMode(true);
        setOtherRows([]);

        setRawMaterialRows([]);
        setRawMaterialTableSearch("");
        setRawMaterialRowSelection({});
        setRawMaterialPagination((p) => ({ ...p, pageIndex: 0 }));
        setSelectedRawMaterial("");
        setSelectedRawMaterialUnit("");
        setRawMaterialWeight("");
        setEditingRawMaterialRowId(null);

        setCaptainRows([]);
        setCaptainTableSearch("");
        setCaptainRowSelection({});
        setCaptainPagination((p) => ({ ...p, pageIndex: 0 }));
        setSelectedCaptainRecipe("");
        setSelectedCaptainUnit("");
        setCaptainWeight("");
        setEditingCaptainRowId(null);
    }, []);

    // Fetch recipe ONLY when BOTH MenuItem and Outlet are selected
    useEffect(() => {
        const menuItemVal = String(selectedMenuItem || "").trim();
        const outletVal = String(outlet || "").trim();

        if (!menuItemVal || !outletVal) {
            resetRecipeState();
            return;
        }

        const seq = ++fetchSeq.current;
        let isCancelled = false;

        const checkAndAutofillRecipe = async () => {
            try {
                setDetailsLoading(true);

                const res = await getKitchenMenuItemRecipe({
                    menuItemId: Number(menuItemVal),
                    orgId: Number(outletVal),
                });

                if (seq !== fetchSeq.current || isCancelled) return;

                const payload = res?.data?.data ?? res?.data;
                const headers = Array.isArray(payload?.headers) ? payload.headers : [];
                const rawMaterials = Array.isArray(payload?.rawMaterials) ? payload.rawMaterials : [];

                const captainReceipes = Array.isArray(payload?.captainReceipes)
                    ? payload.captainReceipes
                    : Array.isArray(payload?.captainRecipes)
                        ? payload.captainRecipes
                        : [];

                const matchingHeader =
                    headers.find(
                        (h) =>
                            Number(h.menuItemId) === Number(menuItemVal) &&
                            Number(h.orgId) === Number(outletVal)
                    ) || headers[0];

                const otherCostsList = Array.isArray(matchingHeader?.otherCosts)
                    ? matchingHeader.otherCosts
                    : Array.isArray(payload?.otherCosts)
                        ? payload.otherCosts
                        : [];

                if (otherCostsList.length > 0) {
                    setOtherRows(
                        otherCostsList.map((oc) => ({
                            rowId: otherRowSeq++,
                            id: oc.id || 0,
                            rawMaterialId: oc.rawMaterialId ? String(oc.rawMaterialId) : "",
                            quantity: oc.quantity != null ? String(oc.quantity) : "",
                            unitId: oc.unitId ? String(oc.unitId) : "",
                            unitName: oc.unit?.nameEnglish || oc.unitName || "",
                            type: String(oc.itemType || (oc.isLpgItem ? "LPG" : "OTHER")).toUpperCase(),
                        }))
                    );
                } else {
                    setOtherRows([]);
                }

                const hasExistingRecipe = Boolean(
                    matchingHeader ||
                    rawMaterials.length > 0 ||
                    captainReceipes.length > 0 ||
                    payload?.weight != null ||
                    payload?.unitId != null
                );

                if (hasExistingRecipe) {
                    setIsExistingRecipe(true);
                    setHeaderId(matchingHeader?.id ?? 0);

                    setItemWeight(
                        matchingHeader?.weight != null
                            ? String(matchingHeader.weight)
                            : payload?.weight != null
                                ? String(payload.weight)
                                : ""
                    );

                    setItemUnitId(
                        matchingHeader?.unitId != null
                            ? String(matchingHeader.unitId)
                            : payload?.unitId != null
                                ? String(payload.unitId)
                                : ""
                    );

                    setForm({
                        instructionEnglish:
                            matchingHeader?.instructionEnglish || payload?.instructionEnglish || "",
                        instructionHindi:
                            matchingHeader?.instructionHindi || payload?.instructionHindi || "",
                        instructionGujarati:
                            matchingHeader?.instructionGujarati || payload?.instructionGujarati || "",
                        url: matchingHeader?.url || payload?.url || "",
                        remarks: matchingHeader?.remarks || payload?.remarks || "",
                    });

                    setUrlEditMode(!(matchingHeader?.url || payload?.url));

                    setRawMaterialRows(
                        rawMaterials.map((rm) => {
                            const rawMatId = rm.rawMaterialId ?? rm.rawMaterial?.id ?? rm.id;
                            const rawUnitId =
                                rm.unitId ?? (typeof rm.unit === "object" ? rm.unit?.id : rm.unit);

                            const resolvedUnitName =
                                rm.unitName ||
                                getUnitLabel(rm.unit) ||
                                rm.rawMaterial?.unit?.nameEnglish ||
                                "";

                            return {
                                rowId: rawMaterialRowSeq++,
                                id: rm.id || 0,
                                rawMaterialId: rawMatId,
                                category:
                                    rm.category ||
                                    rm.rawMaterial?.rawMaterialCat?.nameEnglish ||
                                    "",
                                name:
                                    rm.name ||
                                    rm.rawMaterialName ||
                                    rm.rawMaterial?.nameEnglish ||
                                    `Material #${rawMatId}`,
                                weight: rm.weight ?? 0,
                                unitId: rawUnitId ? String(rawUnitId) : "",
                                unit: resolvedUnitName,
                                venue: rm.venue || "At Venue",
                                visible: rm.isVisible ?? true,
                            };
                        })
                    );

                    if (captainReceipes.length > 0) {
                        setCaptainRows(
                            captainReceipes.map((cr) => ({
                                rowId: captainRowSeq++,
                                id: 0,
                                captainRecipeId: cr.id,
                                category: cr.category || "",
                                name: cr.name || `Captain Recipe #${cr.id}`,
                                weight: cr.weight ?? 0,
                                unitId: cr.unitId != null ? String(cr.unitId) : "",
                                unit: cr.unitName || getUnitLabel(cr.unit) || "",
                                venue: cr.venue || "At Venue",
                            }))
                        );
                    } else {
                        setCaptainRows([]);
                    }

                    if (!isViewMode) {
                        notify.info("Existing recipe loaded for this menu item and outlet");
                    }
                } else {
                    resetRecipeState();
                }
            } catch (err) {
                if (seq !== fetchSeq.current || isCancelled) return;
                console.log("No existing recipe found, ready for creation:", err);
                resetRecipeState();
            } finally {
                if (seq === fetchSeq.current && !isCancelled) {
                    setDetailsLoading(false);
                }
            }
        };

        checkAndAutofillRecipe();
        return () => {
            isCancelled = true;
        };
    }, [selectedMenuItem, outlet, isViewMode, resetRecipeState]);

    const handleChange = (e) => {
        if (isViewMode) return;
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleUrlChange = (e) => {
        if (isViewMode) return;
        const { value } = e.target;
        setForm((prev) => ({ ...prev, url: value }));

        if (!value) {
            setUrlError("");
        } else if (!isValidUrl(value)) {
            setUrlError("Please enter a valid URL");
        } else {
            setUrlError("");
        }
    };

    // Dynamic "Other" Items Handlers
    const handleAddOtherRow = () => {
        if (isViewMode) return;
        setOtherRows((prev) => [
            ...prev,
            {
                rowId: otherRowSeq++,
                id: 0,
                rawMaterialId: "",
                quantity: "",
                unitId: "",
                unitName: "",
                type: "",
            },
        ]);
    };

    const handleRemoveOtherRow = (rowId) => {
        if (isViewMode) return;
        setOtherRows((prev) => prev.filter((r) => r.rowId !== rowId));
    };

    const handleOtherRowChange = (rowId, field, value) => {
        if (isViewMode) return;
        setOtherRows((prev) =>
            prev.map((row) => {
                if (row.rowId !== rowId) return row;

                if (field === "rawMaterialId") {
                    const material =
                        fuelElectricityMaterials.find((m) => String(m.id) === String(value)) ||
                        rawMaterialCatalog.find((m) => String(m.id) === String(value));

                    const rawUnitId = material?.unitId ? String(material.unitId) : "";
                    const matchedUnit = unitCatalog.find((u) => String(u.id) === rawUnitId);
                    const unitName = matchedUnit?.name || material?.unit || "";

                    return {
                        ...row,
                        rawMaterialId: value,
                        quantity: row.quantity && Number(row.quantity) > 0 ? row.quantity : "1",
                        unitId: rawUnitId,
                        unitName,
                    };
                }

                if (field === "unitId") {
                    const matchedUnit = unitCatalog.find((u) => String(u.id) === String(value));
                    return {
                        ...row,
                        unitId: String(value),
                        unitName: matchedUnit?.name || row.unitName,
                    };
                }

                return {
                    ...row,
                    [field]: value,
                };
            })
        );
    };

    // Catalogs Fetch
    const fetchRawMaterialCatalog = useCallback(async () => {
        try {
            setRawMaterialLoading(true);
            const res = await getAllRawMaterialItems(0, 0, true, "");
            const data = res?.data?.data?.["Raw Material Details"] || [];

            const mappedData = Array.isArray(data)
                ? data.map((item) => ({
                    ...item,
                    id: item.id,
                    name: item.nameEnglish || item.name || "",
                    category:
                        item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || "",
                    unitId: item.unit?.id || item.unitId || null,
                    unit: item.unit?.nameEnglish || item.unitName || "",
                    allowedUnits: item.allowedUnits || [],
                }))
                : [];

            setRawMaterialCatalog(mappedData);
        } catch (err) {
            console.error("Failed to load raw materials:", err);
            setRawMaterialCatalog([]);
        } finally {
            setRawMaterialLoading(false);
        }
    }, []);

    const fetchUnits = useCallback(async () => {
        try {
            setUnitLoading(true);
            const res = await getAllRawMaterialUnits();
            const data =
                res?.data?.data?.["Unit Details"] ||
                res?.data?.["Unit Details"] ||
                res?.data?.data ||
                [];

            const mappedData = Array.isArray(data)
                ? data
                    .filter((item) => item.isActive === true)
                    .map((item) => ({
                        ...item,
                        id: item.id,
                        name: item.nameEnglish || item.unitName || item.name || "",
                        symbol: item.symbolEnglish || item.symbol || "",
                        parentUnit: item.parentUnit || item.unitHierarchy || null,
                    }))
                : [];

            setUnitCatalog(mappedData);
        } catch (err) {
            console.error("Failed to load units:", err);
            setUnitCatalog([]);
        } finally {
            setUnitLoading(false);
        }
    }, []);

    // Load Fuel & Electricity materials
    useEffect(() => {
        let isCancelled = false;

        const loadFuelAndElectricityMaterials = async () => {
            try {
                setFuelMaterialsLoading(true);

                const typeRes = await getAllRawMaterialCategoryType();
                const types =
                    typeRes?.data?.data?.["Raw Material Category Type Details"] ||
                    typeRes?.data?.["Raw Material Category Type Details"] ||
                    [];

                const fuelType = types.find(
                    (t) =>
                        t.nameEnglish?.trim().toLowerCase() === "fuel & electricity" ||
                        t.nameEnglish?.trim().toLowerCase() === "fuel and electricity"
                );

                if (!fuelType?.id) {
                    console.warn("Fuel & Electricity category type not found");
                    if (!isCancelled) setFuelElectricityMaterials([]);
                    return;
                }

                const materialsRes = await getRawMaterialByType(fuelType.id);
                const items = materialsRes?.data?.data || materialsRes?.data || [];

                const formattedItems = Array.isArray(items)
                    ? items.map((item) => ({
                        id: item.id,
                        name: item.nameEnglish || item.name || `Material #${item.id}`,
                        unitId: item.unit?.id || item.unitId || null,
                        unit: item.unit?.nameEnglish || item.unitName || "",
                        allowedUnits: item.allowedUnits || [],
                        category:
                            item.rawMaterialCat?.nameEnglish ||
                            item.rawMaterialCatType?.nameEnglish ||
                            "",
                    }))
                    : [];

                if (!isCancelled) {
                    setFuelElectricityMaterials(formattedItems);
                }
            } catch (err) {
                console.error("Failed to load Fuel & Electricity materials:", err);
                if (!isCancelled) setFuelElectricityMaterials([]);
            } finally {
                if (!isCancelled) setFuelMaterialsLoading(false);
            }
        };

        loadFuelAndElectricityMaterials();
        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        fetchRawMaterialCatalog();
        fetchUnits();
    }, [fetchRawMaterialCatalog, fetchUnits]);

    const unitOptions = useMemo(
        () =>
            unitCatalog.map((u) => ({
                value: String(u.id),
                label: u.name || u.symbol || "Unit",
            })),
        [unitCatalog]
    );

    const currentSelectedUnitLabel = useMemo(() => {
        const match = unitOptions.find((u) => String(u.value) === String(itemUnitId));
        return match?.label || "Unit";
    }, [unitOptions, itemUnitId]);

    const selectedRawMaterialData = useMemo(
        () =>
            rawMaterialCatalog.find(
                (item) => String(item.id) === String(selectedRawMaterial)
            ),
        [rawMaterialCatalog, selectedRawMaterial]
    );

    const filteredRawMaterialUnits = useMemo(() => {
        if (!selectedRawMaterialData) return [];
        if (
            selectedRawMaterialData.allowedUnits &&
            selectedRawMaterialData.allowedUnits.length > 0
        ) {
            return selectedRawMaterialData.allowedUnits.map((u) => ({
                id: u.id,
                name: u.nameEnglish || u.symbolEnglish || "Unit",
            }));
        }
        if (!selectedRawMaterialData?.unitId) return [];
        return unitCatalog.filter(
            (unit) => String(unit.id) === String(selectedRawMaterialData.unitId)
        );
    }, [unitCatalog, selectedRawMaterialData]);

    const resetRawMaterialForm = () => {
        setSelectedRawMaterial("");
        setSelectedRawMaterialUnit("");
        setRawMaterialWeight("");
        setEditingRawMaterialRowId(null);
    };

    const handleAddRawMaterialRow = () => {
        if (isViewMode) return;
        if (!selectedRawMaterial) {
            notify.error("Please select a raw material");
            return;
        }
        if (!rawMaterialWeight || Number(rawMaterialWeight) <= 0) {
            notify.error("Please enter a valid weight");
            return;
        }
        if (!selectedRawMaterialUnit) {
            notify.error("Please select a unit");
            return;
        }

        const material = rawMaterialCatalog.find(
            (item) => String(item.id) === String(selectedRawMaterial)
        );
        const unit =
            filteredRawMaterialUnits.find(
                (item) => String(item.id) === String(selectedRawMaterialUnit)
            ) || unitCatalog.find((item) => String(item.id) === String(selectedRawMaterialUnit));

        if (editingRawMaterialRowId) {
            setRawMaterialRows((prev) =>
                prev.map((row) =>
                    row.rowId === editingRawMaterialRowId
                        ? {
                            ...row,
                            rawMaterialId: selectedRawMaterial,
                            category: material?.category || row.category,
                            name: material?.name || row.name,
                            weight: rawMaterialWeight,
                            unitId: selectedRawMaterialUnit,
                            unit: unit?.name || row.unit,
                        }
                        : row
                )
            );
        } else {
            setRawMaterialRows((prev) => [
                ...prev,
                {
                    rowId: rawMaterialRowSeq++,
                    id: 0,
                    rawMaterialId: selectedRawMaterial,
                    category: material?.category || "",
                    name: material?.name || "",
                    weight: rawMaterialWeight,
                    unitId: selectedRawMaterialUnit,
                    unit: unit?.name || "",
                    venue: "At Venue",
                    visible: true,
                },
            ]);
        }

        resetRawMaterialForm();
    };

    const handleEditRawMaterialRow = (row) => {
        if (isViewMode) return;
        setEditingRawMaterialRowId(row.rowId);
        setSelectedRawMaterial(String(row.rawMaterialId ?? ""));
        setRawMaterialWeight(row.weight);
        setSelectedRawMaterialUnit(String(row.unitId ?? ""));
    };

    const handleToggleRawMaterialVisible = (rowId) => {
        if (isViewMode) return;
        setRawMaterialRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, visible: !row.visible } : row))
        );
    };

    const filteredRawMaterialRows = useMemo(() => {
        const term = rawMaterialTableSearch.trim().toLowerCase();
        if (!term) return rawMaterialRows;
        return rawMaterialRows.filter(
            (row) =>
                row.name?.toLowerCase().includes(term) ||
                row.category?.toLowerCase().includes(term)
        );
    }, [rawMaterialRows, rawMaterialTableSearch]);

    const availableRawMaterials = useMemo(() => {
        const usedIds = new Set(
            rawMaterialRows
                .filter((row) => row.rowId !== editingRawMaterialRowId)
                .map((row) => String(row.rawMaterialId))
        );
        return rawMaterialCatalog.filter((item) => !usedIds.has(String(item.id)));
    }, [rawMaterialCatalog, rawMaterialRows, editingRawMaterialRowId]);

    // Captain Recipes Catalog
    useEffect(() => {
        if (!outlet) {
            setCaptainRecipeCatalog([]);
            return;
        }

        let isCancelled = false;
        const loadCaptainRecipes = async () => {
            try {
                const res = await getAllKitchenCaptainReceipeByOrgId(outlet, true);
                const data = res?.data?.data || [];
                if (!isCancelled) setCaptainRecipeCatalog(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load captain recipes", err);
                if (!isCancelled) setCaptainRecipeCatalog([]);
            }
        };

        loadCaptainRecipes();
        return () => {
            isCancelled = true;
        };
    }, [outlet]);

    const availableCaptainRecipes = useMemo(() => {
        const usedIds = new Set(
            captainRows
                .filter((row) => row.rowId !== editingCaptainRowId)
                .map((row) => String(row.captainRecipeId))
        );
        return captainRecipeCatalog.filter((item) => !usedIds.has(String(item.id)));
    }, [captainRecipeCatalog, captainRows, editingCaptainRowId]);

    const selectedCaptainRecipeData = useMemo(
        () =>
            captainRecipeCatalog.find(
                (item) => String(item.id) === String(selectedCaptainRecipe)
            ),
        [captainRecipeCatalog, selectedCaptainRecipe]
    );

    const availableCaptainUnits = useMemo(() => {
        if (!selectedCaptainRecipeData?.unitId) return [];
        return getUnitOptions(selectedCaptainRecipeData.unitId, unitCatalog);
    }, [unitCatalog, selectedCaptainRecipeData]);

    const resetCaptainForm = () => {
        setSelectedCaptainRecipe("");
        setSelectedCaptainUnit("");
        setCaptainWeight("");
        setEditingCaptainRowId(null);
    };

    const handleAddCaptainRow = () => {
        if (isViewMode) return;
        if (!selectedCaptainRecipe) {
            notify.error("Please select a captain recipe");
            return;
        }
        if (!captainWeight || Number(captainWeight) <= 0) {
            notify.error("Please enter a valid weight");
            return;
        }
        if (!selectedCaptainUnit) {
            notify.error("Please select a unit");
            return;
        }

        const recipe = captainRecipeCatalog.find(
            (item) => String(item.id) === String(selectedCaptainRecipe)
        );
        const unit = unitCatalog.find((item) => String(item.id) === String(selectedCaptainUnit));

        if (editingCaptainRowId) {
            setCaptainRows((prev) =>
                prev.map((row) =>
                    row.rowId === editingCaptainRowId
                        ? {
                            ...row,
                            captainRecipeId: selectedCaptainRecipe,
                            category: recipe?.category || row.category,
                            name: recipe?.name || row.name,
                            weight: captainWeight,
                            unitId: selectedCaptainUnit,
                            unit: unit?.name || row.unit,
                        }
                        : row
                )
            );
        } else {
            setCaptainRows((prev) => [
                ...prev,
                {
                    rowId: captainRowSeq++,
                    id: 0,
                    captainRecipeId: selectedCaptainRecipe,
                    category: recipe?.category || "",
                    name: recipe?.name || "",
                    weight: captainWeight,
                    unitId: selectedCaptainUnit,
                    unit: unit?.name || "",
                    venue: "At Venue",
                },
            ]);
        }

        resetCaptainForm();
    };

    const handleEditCaptainRow = (row) => {
        if (isViewMode) return;
        setEditingCaptainRowId(row.rowId);
        setSelectedCaptainRecipe(String(row.captainRecipeId ?? ""));
        setCaptainWeight(row.weight);
        setSelectedCaptainUnit(String(row.unitId ?? ""));
    };

    const openDeleteCaptainConfirm = (row) => {
        if (isViewMode) return;
        setDeleteTarget({ type: "captainRecipe", row });
        setShowDeleteConfirm(true);
    };

    const filteredCaptainRows = useMemo(() => {
        const term = captainTableSearch.trim().toLowerCase();
        if (!term) return captainRows;
        return captainRows.filter(
            (row) =>
                row.name?.toLowerCase().includes(term) ||
                row.category?.toLowerCase().includes(term)
        );
    }, [captainRows, captainTableSearch]);

    const handleCopyIngredients = (data) => {
        if (isViewMode) return;
        const copiedIngredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
        if (copiedIngredients.length === 0) {
            notify.error("No ingredients found to copy");
            return;
        }

        if (isCaptainRecipe) {
            const existingIds = new Set(captainRows.map((r) => String(r.captainRecipeId)));
            const newCaptainRows = copiedIngredients.reduce((acc, ingredient) => {
                const captainRecipeId =
                    ingredient.captainReceipeId ??
                    ingredient.captainRecipeId ??
                    ingredient.captainReceipe?.id ??
                    ingredient.id;

                if (existingIds.has(String(captainRecipeId))) return acc;

                const recipe = captainRecipeCatalog.find(
                    (item) => String(item.id) === String(captainRecipeId)
                );
                const unitId = ingredient.unitId ?? ingredient.unit?.id;
                const unit = unitCatalog.find((item) => String(item.id) === String(unitId));

                acc.push({
                    rowId: captainRowSeq++,
                    id: 0,
                    captainRecipeId,
                    category: ingredient.category ?? recipe?.category ?? "",
                    name: ingredient.name ?? recipe?.name ?? "",
                    weight: ingredient.weight ?? 1,
                    unitId: unitId != null ? String(unitId) : "",
                    unit: ingredient.unitName || getUnitLabel(ingredient.unit) || unit?.name || "",
                    venue: ingredient.venue ?? "At Venue",
                });
                return acc;
            }, []);

            if (newCaptainRows.length > 0) {
                setCaptainRows((prev) => [...prev, ...newCaptainRows]);
            }
            setCopyRecipeOpen(false);
            notify.success(`${newCaptainRows.length} ingredient(s) copied`);
            return;
        }

        const existingRawIds = new Set(rawMaterialRows.map((r) => String(r.rawMaterialId)));
        const newRows = copiedIngredients.reduce((acc, ingredient) => {
            const rawMaterialId =
                ingredient.rawMaterialId ?? ingredient.rawMaterial?.id ?? ingredient.id;

            if (existingRawIds.has(String(rawMaterialId))) return acc;

            const rawMaterial = rawMaterialCatalog.find(
                (item) => String(item.id) === String(rawMaterialId)
            );
            const unitId = ingredient.unitId ?? ingredient.unit?.id ?? rawMaterial?.unitId;
            const unit = unitCatalog.find((item) => String(item.id) === String(unitId));

            acc.push({
                rowId: rawMaterialRowSeq++,
                id: 0,
                rawMaterialId,
                category: ingredient.category ?? rawMaterial?.category ?? "",
                name: ingredient.name ?? rawMaterial?.name ?? "",
                weight: ingredient.weight ?? 1,
                unitId: unitId != null ? String(unitId) : "",
                unit: ingredient.unitName || getUnitLabel(ingredient.unit) || unit?.name || "",
                venue: ingredient.venue ?? "At Venue",
                visible: ingredient.visible ?? true,
            });
            return acc;
        }, []);

        if (newRows.length > 0) {
            setRawMaterialRows((prev) => [...prev, ...newRows]);
        }
        setCopyRecipeOpen(false);
        notify.success(`${newRows.length} ingredient(s) copied`);
    };

    const openDeleteRawMaterialConfirm = (row) => {
        if (isViewMode) return;
        setDeleteTarget({ type: "rawMaterial", row });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteSaving) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const confirmDeleteRow = async () => {
        if (!deleteTarget) return;
        const { type, row } = deleteTarget;

        setDeleteSaving(true);
        try {
            if (type === "rawMaterial") {
                if (row.id) {
                    await deleteKitchenMenuItemRawMaterialById([row.id]);
                }
                setRawMaterialRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
            } else {
                setCaptainRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
            }

            notify.success("Item removed");
            closeDeleteConfirm();
        } catch (err) {
            console.error(err);
            notify.error("Failed to delete item");
        } finally {
            setDeleteSaving(false);
        }
    };

    const rawMaterialColumns = useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                        disabled={isViewMode}
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                        disabled={isViewMode}
                    />
                ),
                enableSorting: false,
                size: 50,
            },
            {
                id: "sno",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Sr. No"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">
                        {String(row.index + 1).padStart(2, "0")}
                    </span>
                ),
                enableSorting: false,
                size: 70,
            },
            {
                id: "category",
                accessorFn: (row) => row.category,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Category"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.category || "-"}</span>
                ),
                size: 130,
            },
            {
                id: "name",
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-gray-800">{row.original.name}</span>
                ),
                size: 180,
            },
            {
                id: "weight",
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Weight"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.weight}</span>,
                size: 110,
            },
            {
                id: "unit",
                accessorFn: (row) => row.unit,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.unit || "-"}</span>
                ),
                size: 110,
            },
            {
                id: "visible",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Visible"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <ToggleSwitch
                        checked={row.original.visible}
                        disabled={isViewMode}
                        onChange={() => handleToggleRawMaterialVisible(row.original.rowId)}
                    />
                ),
                enableSorting: false,
                size: 100,
            },
            ...(!isViewMode
                ? [
                    {
                        id: "actions",
                        header: ({ column }) => (
                            <DataGridColumnHeader
                                title="Action"
                                column={column}
                                className="text-[#43474F] font-semibold uppercase text-sm"
                            />
                        ),
                        cell: ({ row }) => (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleEditRawMaterialRow(row.original)}
                                >
                                    <SquarePen
                                        size={18}
                                        className="text-gray-500 hover:text-blue-800 cursor-pointer"
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDeleteRawMaterialConfirm(row.original)}
                                >
                                    <Trash2
                                        size={18}
                                        className="text-red-300 hover:text-red-700 cursor-pointer"
                                    />
                                </button>
                            </div>
                        ),
                        enableSorting: false,
                        size: 100,
                    },
                ]
                : []),
        ],
        [isViewMode]
    );

    const rawMaterialTable = useReactTable({
        data: filteredRawMaterialRows,
        columns: rawMaterialColumns,
        state: { pagination: rawMaterialPagination, rowSelection: rawMaterialRowSelection },
        onPaginationChange: setRawMaterialPagination,
        onRowSelectionChange: setRawMaterialRowSelection,
        enableRowSelection: !isViewMode,
        getRowId: (row) => String(row.rowId),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const captainColumns = useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                        disabled={isViewMode}
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                        disabled={isViewMode}
                    />
                ),
                enableSorting: false,
                size: 50,
            },
            {
                id: "sno",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Sr. No"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">
                        {String(row.index + 1).padStart(2, "0")}
                    </span>
                ),
                enableSorting: false,
                size: 70,
            },
            {
                id: "name",
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-gray-800">{row.original.name}</span>
                ),
                size: 180,
            },
            {
                id: "weight",
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Weight"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.weight}</span>,
                size: 110,
            },
            {
                id: "unit",
                accessorFn: (row) => row.unit,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.unit || "-"}</span>
                ),
                size: 110,
            },
            ...(!isViewMode
                ? [
                    {
                        id: "actions",
                        header: ({ column }) => (
                            <DataGridColumnHeader
                                title="Action"
                                column={column}
                                className="text-[#43474F] font-semibold uppercase text-sm"
                            />
                        ),
                        cell: ({ row }) => (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleEditCaptainRow(row.original)}
                                >
                                    <SquarePen
                                        size={18}
                                        className="text-gray-500 hover:text-blue-800 cursor-pointer"
                                        title="Edit"
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDeleteCaptainConfirm(row.original)}
                                >
                                    <Trash2
                                        size={18}
                                        className="text-red-300 hover:text-red-700 cursor-pointer"
                                        title="Delete"
                                    />
                                </button>
                            </div>
                        ),
                        enableSorting: false,
                        size: 100,
                    },
                ]
                : []),
        ],
        [isViewMode]
    );

    const captainTable = useReactTable({
        data: filteredCaptainRows,
        columns: captainColumns,
        state: { pagination: captainPagination, rowSelection: captainRowSelection },
        onPaginationChange: setCaptainPagination,
        onRowSelectionChange: setCaptainRowSelection,
        enableRowSelection: !isViewMode,
        getRowId: (row) => String(row.rowId),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleSave = async () => {
        if (isViewMode) return;
        const selectedOutletId = Number(outlet);

        if (!selectedOutletId) {
            notify.error("Please select an Outlet");
            return;
        }
        if (!selectedMenuItem) {
            notify.error("Please select a Menu Item");
            return;
        }
        if (!itemWeight || Number(itemWeight) <= 0) {
            notify.error("Please enter a valid weight greater than 0");
            return;
        }
        if (!itemUnitId) {
            notify.error("Please select a Unit of Measure");
            return;
        }
        if (!form.instructionEnglish.trim()) {
            notify.error("Instruction required");
            return;
        }
        if (form.url && !isValidUrl(form.url)) {
            setUrlError("Please enter a valid URL");
            setUrlEditMode(true);
            notify.error("Please enter a valid URL");
            return;
        }

        try {
            setSaving(true);

            const captainRecipeIdsList = captainRows
                .map((r) => Number(r.captainRecipeId))
                .filter((id) => Number.isFinite(id) && id > 0);

            const formattedOtherCosts = otherRows
                .filter((row) => row.rawMaterialId && Number(row.rawMaterialId) > 0)
                .map((row) => {
                    const itemType = String(row.type || "LPG").trim().toUpperCase();
                    return {
                        id: Number(row.id) || 0,
                        isLpgItem: itemType === "LPG",
                        itemType: itemType,
                        quantity: Number(row.quantity) || 0,
                        rawMaterialId: Number(row.rawMaterialId),
                        unitId: Number(row.unitId) || 0,
                    };
                });

            const payload = {
                captainRecipeId: captainRecipeIdsList,
                headers: [
                    {
                        id: headerId || 0,
                        instructionEnglish: form.instructionEnglish?.trim() || "",
                        instructionGujarati: form.instructionGujarati?.trim() || "",
                        instructionHindi: form.instructionHindi?.trim() || "",
                        otherCosts: formattedOtherCosts,
                        paxQty: 100,
                        remarks: form.remarks?.trim() || "",
                        unitId: Number(itemUnitId),
                        url: form.url?.trim() || "",
                        weight: Number(itemWeight),
                    },
                ],
                menuItemId: Number(selectedMenuItem),
                name: selectedMenuItemObj?.nameEnglish || selectedMenuItemObj?.name || "",
                orgId: selectedOutletId,
                rate: 0,
                rawMaterials: rawMaterialRows.map((row) => ({
                    id: row.id ? Number(row.id) : 0,
                    isVisible: row.visible ?? true,
                    rate: 0,
                    rawMaterialId: Number(row.rawMaterialId),
                    unitId: Number(row.unitId),
                    venue: row.venue || "At Venue",
                    weight: Number(row.weight) || 0,
                })),
                subOutletId: 0,
                unitId: Number(itemUnitId),
                weight: Number(itemWeight),
            };

            if (isUpdateAction) {
                await updateKitchenMenuItemRecipe(payload);
            } else {
                await createKitchenMenuItemRecipe(payload);
            }

            navigate(returnUrl, { state: { fromChild: true } });
        } catch (err) {
            console.error("Save failed:", err?.response?.data ?? err);
            notify.error(err?.response?.data?.msg || err?.response?.data?.message || "Failed to save recipe");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title={pageTitle}
                    description={
                        isViewMode
                            ? "View recipe breakdown, raw materials, and captain recipes."
                            : isUpdateAction
                                ? "Update existing recipe breakdown, raw materials, and captain recipes."
                                : "Pick a menu item and its outlet to build the recipe, raw materials, and captain recipes."
                    }
                    actions={
                        <button
                            type="button"
                            onClick={handleNavigateBack}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Recipe
                        </button>
                    }
                />

                {/* Select Outlet + Menu Item Header */}
                <SectionCard className="mt-4">
                    <SectionHeader
                        icon={Menu}
                        title="Select Menu Item & Outlet"
                        open={openSections.select}
                        onToggle={() => toggleSection("select")}
                    />
                    {openSections.select && (
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div>
                                    <Label required>Menu Item</Label>
                                    <SearchableSelect
                                        name="recipeMenuItem"
                                        options={menuItemOptions}
                                        value={selectedMenuItem ? String(selectedMenuItem) : ""}
                                        isClearable={!isViewMode && !isEditMode}
                                        clearable={!isViewMode && !isEditMode}
                                        disabled={menuItemsLoading || isViewMode || isEditMode}
                                        onChange={(e) => {
                                            const value = e?.target?.value ?? e?.value ?? "";
                                            setSelectedMenuItem(value ? String(value) : "");
                                        }}
                                        placeholder={
                                            menuItemsLoading
                                                ? "Loading menu items..."
                                                : "Select Menu Item"
                                        }
                                    />
                                </div>

                                <div>
                                    <Label required>Outlet</Label>
                                    <SearchableSelect
                                        name="recipeOutlet"
                                        options={outletOptions}
                                        value={outlet ? String(outlet) : ""}
                                        isClearable={isCreateMode}
                                        clearable={isCreateMode}
                                        disabled={(isOutletUser && !isCreateMode) || orgScopeLoading || isViewMode || isEditMode}
                                        onChange={(e) => {
                                            const value = e?.target?.value ?? e?.value ?? "";
                                            setOutlet(value ? String(value) : "");
                                            setSelectedCaptainRecipe("");
                                            setSelectedCaptainUnit("");
                                            setEditingCaptainRowId(null);
                                        }}
                                        placeholder={
                                            orgScopeLoading
                                                ? "Loading outlets..."
                                                : "Select Outlet"
                                        }
                                    />
                                    {orgScopeError && (
                                        <p className="text-xs text-red-500 mt-1">{orgScopeError}</p>
                                    )}
                                </div>
                            </div>

                            {/* Weight, Unit, and Conversion Row */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end mt-5">
                                <div className="md:col-span-6">
                                    <Label required>Weight</Label>
                                    <input
                                        type="number"
                                        min="0.001"
                                        step="any"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        value={itemWeight}
                                        onChange={(e) => setItemWeight(e.target.value)}
                                        placeholder="Enter weight"
                                        disabled={!selectedMenuItem || isViewMode}
                                        className={inputCls}
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <Label required>Unit of Measure</Label>
                                    <SearchableSelect
                                        name="itemUnitId"
                                        options={unitOptions}
                                        value={itemUnitId ? String(itemUnitId) : ""}
                                        isClearable={!isViewMode}
                                        disabled={!selectedMenuItem || unitLoading || isViewMode}
                                        onChange={(e) => {
                                            const val = e?.target?.value ?? e?.value ?? "";
                                            setItemUnitId(val ? String(val) : "");
                                        }}
                                        placeholder={
                                            unitLoading
                                                ? "Loading units..."
                                                : "Select Unit of Measure"
                                        }
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        disabled={!itemWeight || !itemUnitId || isViewMode}
                                        onClick={() => setConversionModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#084E92] bg-blue-50/60 text-[#084E92] hover:bg-blue-100/70 text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Convert unit and calculate total weight"
                                    >
                                        Conversion
                                    </button>
                                </div>
                            </div>

                            {!isReady && (
                                <p className="mt-4 text-xs text-gray-400">
                                    Please select both a Menu Item and an Outlet to load or create a recipe.
                                </p>
                            )}
                        </div>
                    )}
                </SectionCard>

                {detailsLoading && (
                    <p className="mt-4 text-sm text-gray-500">Checking for existing recipe...</p>
                )}

                <div
                    className={isReady ? "" : "pointer-events-none select-none opacity-90"}
                    aria-disabled={!isReady}
                >
                    {/* Additional Details */}
                    <SectionCard className="mt-4">
                        <SectionHeader
                            icon={FileText}
                            title="Additional Details"
                            open={openSections.details}
                            onToggle={() => toggleSection("details")}
                        />
                        {openSections.details && (
                            <div className="px-6 py-6 space-y-6">
                                {/* Other Details (Fuel & Electricity Section) */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Other Items</Label>
                                        </div>
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={handleAddOtherRow}
                                                className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-lg bg-[#084E92] text-white text-xs font-medium hover:bg-[#063b6f] transition cursor-pointer"
                                            >
                                                <Plus size={14} /> Add Item
                                            </button>
                                        )}
                                    </div>

                                    {otherRows.length === 0 ? (
                                        <div className="py-4 text-center border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 bg-white">
                                            No other items added yet. Click &quot;Add Item&quot; to configure.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {otherRows.map((row) => (
                                                <div
                                                    key={row.rowId}
                                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white py-0.5 "
                                                >
                                                    {/* 1. Raw Material Dropdown (Fuel & Electricity Only) */}
                                                    <div className="md:col-span-4">
                                                        <SearchableSelect
                                                            name={`other_rm_${row.rowId}`}
                                                            options={fuelElectricityMaterials.map((m) => ({
                                                                value: String(m.id),
                                                                label: m.name,
                                                            }))}
                                                            value={row.rawMaterialId}
                                                            onChange={(e) => {
                                                                const val = e?.target?.value ?? e?.value ?? "";
                                                                handleOtherRowChange(row.rowId, "rawMaterialId", val);
                                                            }}
                                                            placeholder={
                                                                fuelMaterialsLoading
                                                                    ? "Loading Fuel & Electricity..."
                                                                    : "Select Fuel & Electricity Item"
                                                            }
                                                            disabled={isViewMode || fuelMaterialsLoading}
                                                        />
                                                    </div>

                                                    {/* 2. Quantity Input */}
                                                    <div className="md:col-span-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            value={row.quantity}
                                                            onChange={(e) =>
                                                                handleOtherRowChange(row.rowId, "quantity", e.target.value)
                                                            }
                                                            placeholder="Enter qty"
                                                            disabled={isViewMode}
                                                            className={inputCls}
                                                        />
                                                    </div>

                                                    {/* 3. Unit Dropdown */}
                                                    <div className="md:col-span-2">
                                                        {(() => {
                                                            const material =
                                                                fuelElectricityMaterials.find((m) => String(m.id) === String(row.rawMaterialId)) ||
                                                                rawMaterialCatalog.find((m) => String(m.id) === String(row.rawMaterialId));

                                                            const baseUnitId = row.unitId || material?.unitId;
                                                            const hierarchicalUnits = getUnitOptions(baseUnitId, unitCatalog);

                                                            const rowUnitOptions = hierarchicalUnits.map((u) => ({
                                                                value: String(u.id),
                                                                label: u.name || u.symbol || `Unit #${u.id}`,
                                                            }));

                                                            return (
                                                                <SearchableSelect
                                                                    name={`other_unit_${row.rowId}`}
                                                                    options={rowUnitOptions}
                                                                    value={row.unitId ? String(row.unitId) : ""}
                                                                    onChange={(e) => {
                                                                        const val = e?.target?.value ?? e?.value ?? "";
                                                                        handleOtherRowChange(row.rowId, "unitId", val);
                                                                    }}
                                                                    placeholder={
                                                                        !row.rawMaterialId
                                                                            ? "Select RM First"
                                                                            : rowUnitOptions.length === 0
                                                                                ? "No Unit"
                                                                                : "Select Unit"
                                                                    }
                                                                    disabled={isViewMode || !row.rawMaterialId || rowUnitOptions.length === 0}
                                                                />
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* 4. Type Dropdown */}
                                                    <div className="md:col-span-2">
                                                        <SearchableSelect
                                                            name={`other_type_${row.rowId}`}
                                                            options={TYPE_OPTIONS}
                                                            value={row.type}
                                                            onChange={(e) => {
                                                                const val = e?.target?.value ?? e?.value ?? "";
                                                                handleOtherRowChange(row.rowId, "type", val);
                                                            }}
                                                            placeholder="Select Type"
                                                            disabled={isViewMode}
                                                        />
                                                    </div>

                                                    {/* 5. Delete Action */}
                                                    <div className="md:col-span-1 flex justify-center pb-1">
                                                        {!isViewMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveOtherRow(row.rowId)}
                                                                className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer border"
                                                                title="Remove Item"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label required>Instruction</Label>
                                    <textarea
                                        rows={3}
                                        name="instructionEnglish"
                                        value={form.instructionEnglish}
                                        onChange={handleChange}
                                        placeholder="Enter Instruction"
                                        disabled={isViewMode}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <Label>URL</Label>
                                    {!urlEditMode && form.url ? (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={
                                                    /^https?:\/\//i.test(form.url)
                                                        ? form.url
                                                        : `https://${form.url}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-blue-600 underline truncate bg-white hover:bg-gray-50 transition"
                                            >
                                                {form.url}
                                            </a>
                                            {!isViewMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => setUrlEditMode(true)}
                                                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition shrink-0"
                                                >
                                                    <SquarePen className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                name="url"
                                                value={form.url}
                                                onChange={handleUrlChange}
                                                placeholder="Insert URL"
                                                disabled={isViewMode}
                                                className={urlError ? errorInputCls : inputCls}
                                            />
                                            {urlError && (
                                                <p className="text-xs text-red-500 mt-1">{urlError}</p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div>
                                    <Label>Remarks</Label>
                                    <textarea
                                        rows={3}
                                        name="remarks"
                                        value={form.remarks}
                                        onChange={handleChange}
                                        placeholder="Enter Remarks"
                                        disabled={isViewMode}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Raw Material Items */}
                    <SectionCard className="mt-4">
                        <SectionHeader
                            icon={Layers}
                            title="Raw Material Items"
                            open={openSections.rawMaterial}
                            onToggle={() => toggleSection("rawMaterial")}
                        />
                        {openSections.rawMaterial && (
                            <div className="px-6 py-6">
                                {!isViewMode && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div>
                                                <Label>Raw Material Item</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            name="rawMaterial"
                                                            value={selectedRawMaterial}
                                                            onChange={(e) => {
                                                                const rawMaterialId = e.target.value;
                                                                setSelectedRawMaterial(rawMaterialId);
                                                                const material = rawMaterialCatalog.find(
                                                                    (item) =>
                                                                        String(item.id) === String(rawMaterialId)
                                                                );
                                                                const unitId = material?.unitId;
                                                                setSelectedRawMaterialUnit(
                                                                    unitId ? String(unitId) : ""
                                                                );
                                                            }}
                                                            options={availableRawMaterials.map((m) => ({
                                                                value: String(m.id),
                                                                label: m.name,
                                                            }))}
                                                            placeholder={
                                                                rawMaterialLoading
                                                                    ? "Loading Raw Materials..."
                                                                    : "Select Raw Material"
                                                            }
                                                            disabled={rawMaterialLoading}
                                                        />
                                                    </div>
                                                    <Link to={"/material/items/add"}>
                                                        <button
                                                            type="button"
                                                            className="w-10 h-10 bg-[#084E92] rounded-lg cursor-pointer text-white flex items-center justify-center shrink-0"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>

                                            <div>
                                                <Label required>Weight</Label>
                                                <input
                                                    type="number"
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    value={rawMaterialWeight}
                                                    onChange={(e) => setRawMaterialWeight(e.target.value)}
                                                    placeholder="Enter weight"
                                                    className={inputCls}
                                                />
                                            </div>

                                            <div>
                                                <Label required>Unit</Label>
                                                <SearchableSelect
                                                    name="rawMaterialUnit"
                                                    value={selectedRawMaterialUnit}
                                                    onChange={(e) => setSelectedRawMaterialUnit(e.target.value)}
                                                    options={filteredRawMaterialUnits.map((u) => ({
                                                        value: String(u.id),
                                                        label: u.name,
                                                    }))}
                                                    placeholder={
                                                        !selectedRawMaterial
                                                            ? "First Select Raw Material"
                                                            : unitLoading
                                                                ? "Loading Unit..."
                                                                : filteredRawMaterialUnits.length
                                                                    ? "Select Unit"
                                                                    : "No Unit Available"
                                                    }
                                                    disabled={
                                                        unitLoading ||
                                                        !selectedRawMaterial ||
                                                        filteredRawMaterialUnits.length === 0
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-end mt-4 gap-4">
                                            <button
                                                type="button"
                                                onClick={handleAddRawMaterialRow}
                                                className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                            >
                                                <Plus size={16} />{" "}
                                                {editingRawMaterialRowId ? "Update Item" : "Add Item"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCaptainRecipe(false);
                                                    setCopyRecipeOpen(true);
                                                }}
                                                className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                            >
                                                <Copy size={15} /> Copy Recipe
                                            </button>
                                        </div>
                                    </>
                                )}

                                <div className="w-full mt-4 border border-[#f1f4ff] rounded-2xl overflow-hidden">
                                    <DataGrid
                                        table={rawMaterialTable}
                                        recordCount={filteredRawMaterialRows.length}
                                        className="rounded-2xl"
                                    >
                                        <div className="flex items-center px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100">
                                            <TableSearchBar
                                                value={rawMaterialTableSearch}
                                                onChange={(val) => {
                                                    setRawMaterialTableSearch(val);
                                                    setRawMaterialPagination((p) => ({
                                                        ...p,
                                                        pageIndex: 0,
                                                    }));
                                                }}
                                                placeholder="Search Raw Material"
                                            />
                                        </div>

                                        <Card className="rounded-t-none border-t-0 shadow-none border">
                                            <CardTable>
                                                <ScrollArea>
                                                    <DataGridTable />
                                                    <ScrollBar orientation="horizontal" />
                                                </ScrollArea>
                                            </CardTable>
                                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                                                <DataGridPagination />
                                            </CardFooter>
                                        </Card>
                                    </DataGrid>
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Captain Recipe */}
                    <SectionCard className="mt-4">
                        <SectionHeader
                            icon={Layers}
                            title="Captain Recipe"
                            open={openSections.captainRecipe}
                            onToggle={() => toggleSection("captainRecipe")}
                        />
                        {openSections.captainRecipe && (
                            <div className="px-6 py-6">
                                {!isViewMode && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div>
                                                <Label required>Captain Recipe</Label>
                                                <SearchableSelect
                                                    name="captainRecipe"
                                                    value={selectedCaptainRecipe}
                                                    onChange={(e) => {
                                                        const recipeId = e.target.value;
                                                        setSelectedCaptainRecipe(recipeId);
                                                        const recipe = captainRecipeCatalog.find(
                                                            (item) => String(item.id) === String(recipeId)
                                                        );
                                                        setSelectedCaptainUnit(
                                                            recipe?.unitId ? String(recipe.unitId) : ""
                                                        );
                                                    }}
                                                    options={availableCaptainRecipes.map((r) => ({
                                                        value: String(r.id),
                                                        label: r.name,
                                                    }))}
                                                    placeholder="Select Captain Recipe"
                                                />
                                            </div>

                                            <div>
                                                <Label required>Weight</Label>
                                                <input
                                                    type="number"
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    value={captainWeight}
                                                    onChange={(e) => setCaptainWeight(e.target.value)}
                                                    placeholder="Enter weight"
                                                    className={inputCls}
                                                />
                                            </div>

                                            <div>
                                                <Label required>Unit</Label>
                                                <SearchableSelect
                                                    name="captainUnit"
                                                    value={selectedCaptainUnit}
                                                    onChange={(e) => setSelectedCaptainUnit(e.target.value)}
                                                    options={availableCaptainUnits.map((u) => ({
                                                        value: String(u.id),
                                                        label: u.name,
                                                    }))}
                                                    placeholder={
                                                        !selectedCaptainRecipe
                                                            ? "First Select Captain Recipe"
                                                            : availableCaptainUnits.length
                                                                ? "Select Unit"
                                                                : "No Unit Available"
                                                    }
                                                    disabled={
                                                        !selectedCaptainRecipe ||
                                                        availableCaptainUnits.length === 0
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3 mt-4">
                                            <button
                                                type="button"
                                                onClick={handleAddCaptainRow}
                                                className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                            >
                                                <Plus size={16} />{" "}
                                                {editingCaptainRowId ? "Update Item" : "Add Item"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCaptainRecipe(true);
                                                    setCopyRecipeOpen(true);
                                                }}
                                                className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                            >
                                                <Copy size={15} /> Copy Captain Recipe
                                            </button>
                                        </div>
                                    </>
                                )}

                                <div className="w-full mt-4 border border-[#f1f4ff] rounded-2xl overflow-hidden">
                                    <DataGrid
                                        table={captainTable}
                                        recordCount={filteredCaptainRows.length}
                                        className="rounded-2xl"
                                    >
                                        <div className="flex items-center px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100">
                                            <TableSearchBar
                                                value={captainTableSearch}
                                                onChange={(val) => {
                                                    setCaptainTableSearch(val);
                                                    setCaptainPagination((p) => ({
                                                        ...p,
                                                        pageIndex: 0,
                                                    }));
                                                }}
                                                placeholder="Search Captain Recipe Items"
                                            />
                                        </div>

                                        <Card className="rounded-t-none border-t-0 shadow-none border">
                                            <CardTable>
                                                <ScrollArea>
                                                    <DataGridTable />
                                                    <ScrollBar orientation="horizontal" />
                                                </ScrollArea>
                                            </CardTable>
                                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                                                <DataGridPagination />
                                            </CardFooter>
                                        </Card>
                                    </DataGrid>
                                </div>
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 my-6 border-t pt-6">
                    <button
                        type="button"
                        onClick={handleNavigateBack}
                        className="px-10 py-2 cursor-pointer rounded-lg border text-gray-600 hover:bg-gray-50 transition"
                    >
                        {isViewMode ? "Back" : "Cancel"}
                    </button>
                    {!isViewMode && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!isReady || saving || detailsLoading || orgScopeLoading}
                            className="px-10 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            {saving
                                ? "Saving..."
                                : isUpdateAction
                                    ? "Update Recipe"
                                    : "Save Recipe"}
                        </button>
                    )}
                </div>

                {/* Modular Unit Conversion Modal */}
                <UnitConversionModal
                    isOpen={conversionModalOpen}
                    onClose={() => setConversionModalOpen(false)}
                    currentWeight={itemWeight}
                    currentUnitLabel={currentSelectedUnitLabel}
                    unitOptions={unitOptions}
                    onApplyConversion={({ convertedWeight, targetUnitId, targetUnitLabel }) => {
                        setItemWeight(convertedWeight);
                        setItemUnitId(targetUnitId);
                        notify.success(`Converted to ${convertedWeight} ${targetUnitLabel}`);
                    }}
                />

                <KitchenCopyRecipeModal
                    open={copyRecipeOpen}
                    onClose={() => setCopyRecipeOpen(false)}
                    isCaptainRecipe={isCaptainRecipe}
                    onCopy={handleCopyIngredients}
                />

                <DeleteConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={closeDeleteConfirm}
                    onConfirm={confirmDeleteRow}
                    itemLabel={deleteTarget?.row?.name}
                    saving={deleteSaving}
                />
            </div>
        </Container>
    );
};

export default CreateItemRecipe;