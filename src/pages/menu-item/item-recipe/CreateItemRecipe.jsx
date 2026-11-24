import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    Copy,
    FileText,
    Layers,
    Loader2,
    Menu,
    Plus,
    Search,
    Sparkles,
    SquarePen,
    Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import {
    createKitchenMenuItemRecipe,
    updateKitchenMenuItemRecipe,
    getKitchenMenuItemRecipe,
    deleteKitchenMenuItemRawMaterialById,
    getAllRawMaterialItems,
    getAllRawMaterial,
    getAllRawMaterialUnits,
    getAllKitchenCaptainReceipeByOrgId,
    getAllRawMaterialCategoryType,
    getRawMaterialByType,
    calculateRecipeCosting,
    getVendorPricesByRawMaterialId,
    getRawMaterialsEffectivePrices,
    getKitchenCaptainReceipeById,
    getKitchenCaptainReceipeByIdAndOrg,
} from "../../../services/apiServices";
import { formatToDDMMYYYY } from "@/utils/dateUtils";
import { notify } from "@/utils/toast";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
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
import QuickAddRawMaterialModal from "./QuickAddRawMaterialModal";
import { PageHeader } from "@/components/common/PageHeader";
import { formatRemarks } from "@/utils/textUtils";

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

const PRICING_METHOD_OPTIONS = [
    { value: "LAST_PURCHASE", label: "Last Purchase" },
    { value: "WEIGHTED_AVERAGE", label: "Average (Weighted)" },
    { value: "LOWEST_PRICE", label: "Min (Lowest Price)" },
    { value: "HIGHEST_PRICE", label: "Max (Highest Price)" },
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
        className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
            } ${checked ? "bg-[#084E92]" : "bg-gray-300"}`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4.5" : ""
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

    const [selectedMenuItemName, setSelectedMenuItemName] = useState(() => {
        return location.state?.menuItemName || location.state?.itemLabel || "";
    });

    // Track existing recipe
    const [isExistingRecipe, setIsExistingRecipe] = useState(false);
    const [headerId, setHeaderId] = useState(location.state?.headerId ?? 0);
    const [itemWeight, setItemWeight] = useState("");
    const [calories, setCalories] = useState("");
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
    const [rawMaterialPage, setRawMaterialPage] = useState(1);
    const [hasMoreRawMaterials, setHasMoreRawMaterials] = useState(true);
    const [loadingMoreRawMaterials, setLoadingMoreRawMaterials] = useState(false);
    const [selectedRawMaterial, setSelectedRawMaterial] = useState("");
    const [selectedRawMaterialUnit, setSelectedRawMaterialUnit] = useState("");
    const [rawMaterialWeight, setRawMaterialWeight] = useState("");
    const [rawMaterialRate, setRawMaterialRate] = useState("");
    const [rateLoading, setRateLoading] = useState(false);
    const [rawMaterialRows, setRawMaterialRows] = useState([]);
    const rawMaterialRowsRef = useRef(rawMaterialRows);
    useEffect(() => {
        rawMaterialRowsRef.current = rawMaterialRows;
    }, [rawMaterialRows]);

    // Pricing & Costing
    const [pricingMethod, setPricingMethod] = useState("LAST_PURCHASE");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [calculatingCost, setCalculatingCost] = useState(false);
    const [costData, setCostData] = useState(null);
    const [rawMaterialTableSearch, setRawMaterialTableSearch] = useState("");
    const [rawMaterialPagination, setRawMaterialPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [rawMaterialRowSelection, setRawMaterialRowSelection] = useState({});
    const [editingRawMaterialRowId, setEditingRawMaterialRowId] = useState(null);
    const [isAddRawMaterialModalOpen, setIsAddRawMaterialModalOpen] = useState(false);

    // Dedicated Fuel & Electricity items state for the Other section
    const [fuelElectricityMaterials, setFuelElectricityMaterials] = useState([]);
    const [fuelMaterialsLoading, setFuelMaterialsLoading] = useState(false);

    // Captain Recipes
    const [captainRecipeCatalog, setCaptainRecipeCatalog] = useState([]);
    const [selectedCaptainRecipe, setSelectedCaptainRecipe] = useState("");
    const [selectedCaptainUnit, setSelectedCaptainUnit] = useState("");
    const [captainWeight, setCaptainWeight] = useState("");
    const [captainRate, setCaptainRate] = useState("");
    const [captainRateLoading, setCaptainRateLoading] = useState(false);
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

    const menuItemOptions = useMemo(() => {
        if (!selectedMenuItem) return [];
        return [
            {
                value: String(selectedMenuItem),
                label: selectedMenuItemName || `Item #${selectedMenuItem}`,
            },
        ];
    }, [selectedMenuItem, selectedMenuItemName]);

    const resetRecipeState = useCallback(() => {
        setIsExistingRecipe(false);
        setHeaderId(0);
        setItemWeight("");
        setCalories("");
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
        setRawMaterialRate("");
        setEditingRawMaterialRowId(null);
        setCostData(null);
        setPricingMethod("LAST_PURCHASE");

        setCaptainRows([]);
        setCaptainTableSearch("");
        setCaptainRowSelection({});
        setCaptainPagination((p) => ({ ...p, pageIndex: 0 }));
        setSelectedCaptainRecipe("");
        setSelectedCaptainUnit("");
        setCaptainWeight("");
        setCaptainRate("");
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

                const resolvedItemName =
                    matchingHeader?.menuItemName ||
                    matchingHeader?.itemName ||
                    payload?.menuItemName ||
                    payload?.itemName ||
                    payload?.nameEnglish ||
                    "";
                if (resolvedItemName) {
                    setSelectedMenuItemName(resolvedItemName);
                }

                setCalories(
                    matchingHeader?.calories != null
                        ? String(matchingHeader.calories)
                        : payload?.calories != null
                            ? String(payload.calories)
                            : ""
                );

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

                            const rmWeight = Number(rm.weight ?? 0);
                            const rmPerUnitRate = Number(
                                rm.perUnitRate != null && Number(rm.perUnitRate) > 0
                                    ? rm.perUnitRate
                                    : rm.rate ?? rm.price ?? rm.unitPrice ?? 0
                            );
                            const rmTotalRate = Number(
                                rm.rate != null && rm.perUnitRate != null
                                    ? rm.rate
                                    : rm.amount != null
                                        ? rm.amount
                                        : rmPerUnitRate * rmWeight
                            );

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
                                weight: rmWeight,
                                perUnitWeight: Number(rm.perUnitWeight) || 0,
                                effectivePerUnitWeight: Number(rm.effectivePerUnitWeight) || 0,
                                unitId: rawUnitId ? String(rawUnitId) : "",
                                unit: resolvedUnitName,
                                rate: rmPerUnitRate,
                                amount: rmTotalRate,
                                venue: rm.venue || "At Venue",
                                visible: rm.isVisible ?? true,
                            };
                        })
                    );

                    if (captainReceipes.length > 0) {
                        const enriched = await Promise.all(
                            captainReceipes.map(async (cr) => {
                                const crId = cr.id || cr.captainRecipeId;
                                let crRate = Number(cr.rate ?? cr.perUnitRate ?? 0);
                                const crWeight = Number(cr.weight ?? 0);
                                let crAmount = Number(cr.amount ?? 0);

                                if (crRate <= 0 && crId) {
                                    try {
                                        const res = outletVal
                                            ? await getKitchenCaptainReceipeByIdAndOrg(crId, outletVal)
                                            : await getKitchenCaptainReceipeById(crId);
                                        const data = res?.data?.data || res?.data;
                                        if (data) {
                                            const bw = Number(data.weight || 0);
                                            const br = Number(data.recipeRate ?? data.rate ?? 0);
                                            crRate = bw > 0 ? Number((br / bw).toFixed(2)) : (Number(data.costPerKg) || 0);
                                        }
                                    } catch (e) {
                                        console.warn("Could not fetch captain recipe for row:", crId, e);
                                    }
                                }

                                if (crAmount <= 0) {
                                    crAmount = Number((crWeight * crRate).toFixed(2));
                                }

                                return {
                                    rowId: captainRowSeq++,
                                    id: 0,
                                    captainRecipeId: crId,
                                    category: cr.category || "",
                                    name: cr.name || `Captain Recipe #${crId}`,
                                    weight: crWeight,
                                    unitId: cr.unitId != null ? String(cr.unitId) : "",
                                    unit: cr.unitName || getUnitLabel(cr.unit) || "",
                                    rate: crRate,
                                    amount: crAmount,
                                    venue: cr.venue || "At Venue",
                                };
                            })
                        );
                        setCaptainRows(enriched);
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

    const fetchRecipeCosting = useCallback(
        async (
            method = pricingMethod,
            fDate = fromDate,
            tDate = toDate,
            explicitRawMaterials = null
        ) => {
            const menuItemVal = String(selectedMenuItem || "").trim();
            const outletVal = String(outlet || "").trim();
            if (!menuItemVal || !outletVal) {
                setCostData(null);
                return;
            }

            const isDateRequired = ["LOWEST_PRICE", "HIGHEST_PRICE"].includes(method);
            if (isDateRequired && !fDate) {
                return;
            }

            setCalculatingCost(true);
            try {
                const materialsToUse = explicitRawMaterials || rawMaterialRowsRef.current || [];
                const payload = {
                    menuItemId: Number(menuItemVal),
                    menuitemid: Number(menuItemVal),
                    kitchenMenuItemId: Number(menuItemVal),
                    materialCenterOrgId: Number(outletVal),
                    materialcenterorgid: Number(outletVal),
                    organizationId: Number(outletVal),
                    orgId: Number(outletVal),
                    materialCenterId: 0,
                    pricingBasis: method,
                    method: method,
                    portionSize: Number(itemWeight) || 1,
                    isLpgRequired: otherRows.some((r) => r.type === "LPG"),
                    ...(headerId ? { recipeHeaderId: Number(headerId) } : {}),
                    ...(isDateRequired && fDate ? { fromDate: fDate } : {}),
                    ...(isDateRequired && tDate ? { toDate: tDate } : {}),
                    rawMaterials: materialsToUse.map((row) => ({
                        rawMaterialId: Number(row.rawMaterialId),
                        weight: Number(row.weight) || 0,
                        unitId: Number(row.unitId) || 0,
                        rate: Number(row.rate) || 0,
                    })),
                };

                const params = {
                    menuItemId: Number(menuItemVal),
                    menuitemid: Number(menuItemVal),
                    kitchenMenuItemId: Number(menuItemVal),
                    materialCenterOrgId: Number(outletVal),
                    materialcenterorgid: Number(outletVal),
                    orgId: Number(outletVal),
                    pricingBasis: method,
                    method: method,
                    ...(isDateRequired && fDate ? { fromDate: fDate } : {}),
                    ...(isDateRequired && tDate ? { toDate: tDate } : {}),
                };

                const res = await calculateRecipeCosting(payload, params);
                const data = res?.data?.data ?? res?.data;
                if (data) {
                    setCostData(data);

                    const returnedMaterials = Array.isArray(data.materials)
                        ? data.materials
                        : Array.isArray(data.rawMaterials)
                            ? data.rawMaterials
                            : Array.isArray(data.items)
                                ? data.items
                                : [];

                    if (returnedMaterials.length > 0) {
                        setRawMaterialRows((prevRows) =>
                            prevRows.map((row) => {
                                const matched = returnedMaterials.find(
                                    (m) =>
                                        String(m.rawMaterialId || m.materialId || m.id) ===
                                        String(row.rawMaterialId)
                                );
                                if (matched) {
                                    const rate = Number(
                                        matched.effectiveUnitRate ??
                                        matched.rate ??
                                        matched.unitRate ??
                                        matched.price ??
                                        row.rate ??
                                        0
                                    );
                                    const weight = Number(row.weight || 0);
                                    const amount = Number(
                                        matched.totalMaterialCost ??
                                        matched.cost ??
                                        matched.totalCost ??
                                        matched.amount ??
                                        (weight * rate)
                                    );
                                    return {
                                        ...row,
                                        rate,
                                        amount,
                                    };
                                }
                                return row;
                            })
                        );
                    }
                }
            } catch (err) {
                console.warn("Recipe costing calculation error:", err);
            } finally {
                setCalculatingCost(false);
            }
        },
        [selectedMenuItem, outlet, itemWeight, headerId, otherRows, pricingMethod, fromDate, toDate]
    );

    useEffect(() => {
        if (selectedMenuItem && outlet) {
            fetchRecipeCosting(pricingMethod, fromDate, toDate);
        }
    }, [selectedMenuItem, outlet]);

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
    const extractRawMaterials = (res) => {
        const payload = res?.data?.data ?? res?.data;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.["Raw Material Details"])) return payload["Raw Material Details"];
        if (Array.isArray(payload?.rawMaterials)) return payload.rawMaterials;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.content)) return payload.content;
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
    };

    const fetchRawMaterialCatalog = useCallback(async (pageToFetch = 1) => {
        try {
            if (pageToFetch === 1) {
                setRawMaterialLoading(true);
            } else {
                setLoadingMoreRawMaterials(true);
            }

            let res;
            try {
                res = await getAllRawMaterial(pageToFetch, 20);
            } catch (e) {
                res = await getAllRawMaterialItems(0, 0, true, "", pageToFetch, 20);
            }

            const data = extractRawMaterials(res);

            const mappedData = Array.isArray(data)
                ? data.map((item) => ({
                    ...item,
                    id: item.id,
                    name: item.nameEnglish || item.name || "",
                    category:
                        item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || item.category || "",
                    unitId: item.unit?.id || item.unitId || null,
                    unit: item.unit?.nameEnglish || item.unitName || "",
                    allowedUnits: item.allowedUnits || [],
                }))
                : [];

            if (pageToFetch === 1) {
                setRawMaterialCatalog((prev) => {
                    const newIds = new Set(mappedData.map((m) => String(m.id)));
                    const kept = prev.filter((m) => !newIds.has(String(m.id)));
                    return [...mappedData, ...kept];
                });
            } else {
                setRawMaterialCatalog((prev) => {
                    const existingIds = new Set(prev.map((m) => String(m.id)));
                    const newItems = mappedData.filter((m) => !existingIds.has(String(m.id)));
                    return [...prev, ...newItems];
                });
            }

            setRawMaterialPage(pageToFetch);
            setHasMoreRawMaterials(mappedData.length >= 20);
            return mappedData;
        } catch (err) {
            console.error("Failed to load raw materials:", err);
            if (pageToFetch === 1) {
                setRawMaterialCatalog([]);
            }
            setHasMoreRawMaterials(false);
            return [];
        } finally {
            setRawMaterialLoading(false);
            setLoadingMoreRawMaterials(false);
        }
    }, []);

    const handleLoadMoreRawMaterials = useCallback(() => {
        if (loadingMoreRawMaterials || rawMaterialLoading || !hasMoreRawMaterials) return;
        fetchRawMaterialCatalog(rawMaterialPage + 1);
    }, [loadingMoreRawMaterials, rawMaterialLoading, hasMoreRawMaterials, rawMaterialPage, fetchRawMaterialCatalog]);

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
        if (!selectedRawMaterialData?.unitId) {
            return unitCatalog.map((u) => ({
                id: u.id,
                name: u.nameEnglish || u.symbolEnglish || u.name || "Unit",
            }));
        }
        const hierarchical = getUnitOptions(selectedRawMaterialData.unitId, unitCatalog);
        const list = hierarchical && hierarchical.length > 0 ? hierarchical : unitCatalog;
        return list.map((u) => ({
            id: u.id,
            name: u.nameEnglish || u.symbolEnglish || u.name || "Unit",
        }));
    }, [unitCatalog, selectedRawMaterialData]);

    const resetRawMaterialForm = () => {
        setSelectedRawMaterial("");
        setSelectedRawMaterialUnit("");
        setRawMaterialWeight("");
        setRawMaterialRate("");
        setEditingRawMaterialRowId(null);
    };

    const handleAddRawMaterialRow = () => {
        if (isViewMode) return;
        if (!outlet) {
            notify.error("Please select a Unit");
            return;
        }
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

        const rateVal = rawMaterialRate !== "" ? Number(rawMaterialRate) : 0;
        const weightVal = Number(rawMaterialWeight) || 0;
        const amountVal = weightVal * rateVal;

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
                            rate: rateVal,
                            amount: amountVal,
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
                    rate: rateVal,
                    amount: amountVal,
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
        setRawMaterialRate(row.rate != null ? String(row.rate) : "");
    };

    const handleUpdateRawMaterialField = (rowId, field, val) => {
        if (isViewMode) return;
        setRawMaterialRows((prev) =>
            prev.map((r) => {
                if (r.rowId !== rowId) return r;
                const updated = { ...r, [field]: val };
                const w = field === "weight" ? Number(val) || 0 : Number(r.weight) || 0;
                const rt = field === "rate" ? Number(val) || 0 : Number(r.rate) || 0;
                updated.amount = Number((w * rt).toFixed(2));
                return updated;
            })
        );
    };

    // Helper to extract numeric rate from effective prices API response
    const parseEffectivePriceResponse = useCallback((res, rawMatId) => {
        const payload = res?.data?.data ?? res?.data ?? res;
        if (!payload) return null;

        // If array of items
        if (Array.isArray(payload)) {
            const matched = payload.find(
                (m) => String(m.rawMaterialId ?? m.materialId ?? m.rawItemId ?? m.id) === String(rawMatId)
            );
            if (matched) {
                const r = matched.effectivePrice ?? matched.effectiveUnitRate ?? matched.rate ?? matched.unitRate ?? matched.price ?? matched.unitPrice ?? matched.cost;
                if (r != null && !isNaN(Number(r)) && Number(r) >= 0) return Number(r);
            }
            return null;
        }

        // If map by id or object
        if (typeof payload === "object") {
            const keyed = payload[rawMatId] ?? payload[String(rawMatId)];
            if (typeof keyed === "number" && !isNaN(keyed) && keyed >= 0) return keyed;
            if (keyed && typeof keyed === "object") {
                const r = keyed.effectivePrice ?? keyed.rate ?? keyed.price ?? keyed.unitPrice;
                if (r != null && !isNaN(Number(r)) && Number(r) >= 0) return Number(r);
            }

            const list = payload.effectivePrices || payload.prices || payload.rawMaterials || payload.items || payload.materials;
            if (Array.isArray(list)) {
                const matched = list.find(
                    (m) => String(m.rawMaterialId ?? m.materialId ?? m.rawItemId ?? m.id) === String(rawMatId)
                );
                if (matched) {
                    const r = matched.effectivePrice ?? matched.effectiveUnitRate ?? matched.rate ?? matched.unitRate ?? matched.price ?? matched.unitPrice;
                    if (r != null && !isNaN(Number(r)) && Number(r) >= 0) return Number(r);
                }
                return null;
            }
        }

        return null;
    }, []);

    const fetchRateForRawMaterial = useCallback(
        async (
            rawMatId,
            uId = null,
            method = pricingMethod,
            fDate = fromDate,
            tDate = toDate
        ) => {
            if (!rawMatId) {
                setRawMaterialRate("");
                return;
            }

            setRateLoading(true);
            try {
                const targetOrgId =
                    Number(outlet) ||
                    (isOutletUser && effectiveOutletId ? Number(effectiveOutletId) : 0) ||
                    getOrgIdFromToken() ||
                    0;
                const asOf = tDate || toDate || new Date().toISOString().split("T")[0];

                const isDateRequired = ["LOWEST_PRICE", "HIGHEST_PRICE"].includes(method);

                // 1. Primary endpoint: /api/material-costing/raw-materials/effective-prices
                try {
                    const effectivePayload = {
                        materialCenterId: 0,
                        organizationId: targetOrgId,
                        pricingBasis: method,
                        rawMaterialIds: [Number(rawMatId)],
                        subOutletId: 0,
                        ...(isDateRequired || fDate ? { fromDate: fDate || fromDate } : {}),
                        ...(isDateRequired || tDate ? { toDate: tDate || toDate } : { toDate: asOf }),
                    };

                    const effectiveRes = await getRawMaterialsEffectivePrices(effectivePayload);
                    const fetchedRate = parseEffectivePriceResponse(effectiveRes, rawMatId);
                    if (fetchedRate != null && fetchedRate > 0) {
                        setRawMaterialRate(String(fetchedRate));
                        return;
                    }
                } catch (e) {
                    console.warn("Effective prices API rate lookup error, attempting fallbacks:", e);
                }

                const menuItemVal = String(selectedMenuItem || "").trim();
                const outletVal = String(outlet || "").trim();

                // 2. Second attempt: call calculateRecipeCosting including this material
                if (menuItemVal && outletVal) {
                    try {
                        const payload = {
                            menuItemId: Number(menuItemVal),
                            menuitemid: Number(menuItemVal),
                            kitchenMenuItemId: Number(menuItemVal),
                            materialCenterOrgId: Number(outletVal),
                            materialcenterorgid: Number(outletVal),
                            organizationId: Number(outletVal),
                            orgId: Number(outletVal),
                            materialCenterId: 0,
                            pricingBasis: method,
                            method: method,
                            portionSize: Number(itemWeight) || 1,
                            isLpgRequired: otherRows.some((r) => r.type === "LPG"),
                            ...(headerId ? { recipeHeaderId: Number(headerId) } : {}),
                            ...(isDateRequired && fDate ? { fromDate: fDate } : {}),
                            ...(isDateRequired && tDate ? { toDate: tDate } : {}),
                            rawMaterials: [
                                ...rawMaterialRowsRef.current.map((r) => ({
                                    rawMaterialId: Number(r.rawMaterialId),
                                    weight: Number(r.weight) || 1,
                                    unitId: Number(r.unitId) || 0,
                                    rate: Number(r.rate) || 0,
                                })),
                                {
                                    rawMaterialId: Number(rawMatId),
                                    weight: 1,
                                    unitId: uId ? Number(uId) : 0,
                                    rate: 0,
                                },
                            ],
                        };

                        const params = {
                            menuItemId: Number(menuItemVal),
                            menuitemid: Number(menuItemVal),
                            kitchenMenuItemId: Number(menuItemVal),
                            materialCenterOrgId: Number(outletVal),
                            materialcenterorgid: Number(outletVal),
                            orgId: Number(outletVal),
                            pricingBasis: method,
                            method: method,
                            ...(isDateRequired && fDate ? { fromDate: fDate } : {}),
                            ...(isDateRequired && tDate ? { toDate: tDate } : {}),
                        };

                        const res = await calculateRecipeCosting(payload, params);
                        const data = res?.data?.data ?? res?.data;
                        if (data) {
                            const returnedMaterials = Array.isArray(data.materials)
                                ? data.materials
                                : Array.isArray(data.rawMaterials)
                                    ? data.rawMaterials
                                    : Array.isArray(data.items)
                                        ? data.items
                                        : [];

                            const matched = returnedMaterials.find(
                                (m) => String(m.rawMaterialId || m.materialId || m.id) === String(rawMatId)
                            );

                            if (matched) {
                                const r = matched.effectiveUnitRate ?? matched.rate ?? matched.unitRate ?? matched.price;
                                if (r != null && !isNaN(Number(r)) && Number(r) > 0) {
                                    setRawMaterialRate(String(r));
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Costing API rate lookup error, falling back to vendor price:", e);
                    }
                }

                // 3. Fallback attempt: Vendor Price Configurations for this raw material
                try {
                    const vendorRes = await getVendorPricesByRawMaterialId(Number(rawMatId));
                    const vendorData = vendorRes?.data?.data ?? vendorRes?.data ?? [];
                    const configs = Array.isArray(vendorData?.vendorPriceConfigurations)
                        ? vendorData.vendorPriceConfigurations
                        : Array.isArray(vendorData)
                            ? vendorData
                            : [];

                    if (configs.length > 0) {
                        const validPrices = configs
                            .map((c) => Number(c.price ?? c.rate ?? c.unitPrice ?? c.vendorPrice ?? 0))
                            .filter((p) => !isNaN(p) && p > 0);

                        if (validPrices.length > 0) {
                            let chosenRate = validPrices[0];
                            if (method === "LOWEST_PRICE") {
                                chosenRate = Math.min(...validPrices);
                            } else if (method === "HIGHEST_PRICE") {
                                chosenRate = Math.max(...validPrices);
                            } else if (method === "WEIGHTED_AVERAGE") {
                                chosenRate = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                            }
                            setRawMaterialRate(String(Number(chosenRate).toFixed(2)));
                            return;
                        }
                    }
                } catch {
                    // Ignore vendor pricing error
                }

                // 4. Check catalog item
                const catalogMat = rawMaterialCatalog.find((m) => String(m.id) === String(rawMatId));
                if (catalogMat?.rate != null || catalogMat?.price != null) {
                    const r = catalogMat.rate ?? catalogMat.price;
                    if (r != null && !isNaN(Number(r)) && Number(r) > 0) {
                        setRawMaterialRate(String(r));
                        return;
                    }
                }

                setRawMaterialRate("0");
            } catch (err) {
                console.warn("Error fetching raw material rate:", err);
                setRawMaterialRate("0");
            } finally {
                setRateLoading(false);
            }
        },
        [selectedMenuItem, outlet, pricingMethod, fromDate, toDate, itemWeight, headerId, otherRows, rawMaterialCatalog, isOutletUser, effectiveOutletId, parseEffectivePriceResponse]
    );

    const updateAllRawMaterialRates = useCallback(
        async (method = pricingMethod, curFrom = fromDate, curTo = toDate) => {
            if (!rawMaterialRowsRef.current || rawMaterialRowsRef.current.length === 0) return;
            const targetOrgId =
                Number(outlet) ||
                (isOutletUser && effectiveOutletId ? Number(effectiveOutletId) : 0) ||
                getOrgIdFromToken() ||
                0;
            const asOf = curTo || toDate || new Date().toISOString().split("T")[0];
            const isDateRequired = ["LOWEST_PRICE", "HIGHEST_PRICE"].includes(method);
            const rmIds = [
                ...new Set(
                    rawMaterialRowsRef.current
                        .map((r) => Number(r.rawMaterialId))
                        .filter((id) => !isNaN(id) && id > 0)
                ),
            ];
            if (rmIds.length === 0) return;

            try {
                const effectivePayload = {
                    materialCenterId: 0,
                    organizationId: targetOrgId,
                    pricingBasis: method,
                    method: method,
                    rawMaterialIds: rmIds,
                    subOutletId: 0,
                    ...(isDateRequired || curFrom ? { fromDate: curFrom || fromDate } : {}),
                    ...(isDateRequired || curTo ? { toDate: curTo || toDate } : { toDate: asOf }),
                };

                const res = await getRawMaterialsEffectivePrices(effectivePayload);

                if (res) {
                    setRawMaterialRows((prev) =>
                        prev.map((row) => {
                            const newRate = parseEffectivePriceResponse(res, row.rawMaterialId);
                            if (newRate != null && !isNaN(newRate)) {
                                const weight = Number(row.weight || 0);
                                return {
                                    ...row,
                                    rate: newRate,
                                    amount: Number((weight * newRate).toFixed(2)),
                                };
                            }
                            return row;
                        })
                    );
                }
            } catch (e) {
                console.warn("Bulk effective prices update error:", e);
            }
        },
        [outlet, isOutletUser, effectiveOutletId, pricingMethod, fromDate, toDate, parseEffectivePriceResponse]
    );

    const handlePricingMethodChange = (newMethod) => {
        setPricingMethod(newMethod);
        if (["LOWEST_PRICE", "HIGHEST_PRICE"].includes(newMethod)) {
            if (!fromDate) {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setFromDate(d.toISOString().split("T")[0]);
            }
            if (!toDate) {
                setToDate(new Date().toISOString().split("T")[0]);
            }
        }
    };

    const handleFromDateChange = (val) => {
        setFromDate(val);
    };

    const handleToDateChange = (val) => {
        setToDate(val);
    };

    const handleRecalculateCost = async () => {
        setCalculatingCost(true);
        try {
            await updateAllRawMaterialRates(pricingMethod, fromDate, toDate);
            if (selectedRawMaterial) {
                fetchRateForRawMaterial(selectedRawMaterial, selectedRawMaterialUnit, pricingMethod, fromDate, toDate);
            }
            notify.success("Recipe costs recalculated successfully.");
        } catch (e) {
            console.error("Recalculate cost error:", e);
        } finally {
            setCalculatingCost(false);
        }
    };

    const totalRawMaterialCost = useMemo(() => {
        return rawMaterialRows.reduce((sum, row) => {
            const amt =
                row.amount != null
                    ? Number(row.amount)
                    : Number(row.weight || 0) * Number(row.rate || 0);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [rawMaterialRows]);

    const totalCaptainCost = useMemo(() => {
        return captainRows.reduce((sum, row) => {
            const amt =
                row.amount != null
                    ? Number(row.amount)
                    : Number(row.weight || 0) * Number(row.rate || 0);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [captainRows]);

    const totalCaptainWeight = useMemo(() => {
        return captainRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
    }, [captainRows]);

    const resolvedFuelCost = useMemo(() => {
        if (costData?.fuelUtilityCost != null && Number(costData.fuelUtilityCost) >= 0) {
            return Number(costData.fuelUtilityCost);
        }
        if (costData?.lpgCost != null && Number(costData.lpgCost) >= 0) {
            return Number(costData.lpgCost);
        }
        return 0;
    }, [costData]);

    const resolvedTotalCost = useMemo(() => {
        return Number((totalRawMaterialCost + totalCaptainCost + resolvedFuelCost).toFixed(2));
    }, [totalRawMaterialCost, totalCaptainCost, resolvedFuelCost]);

    const perKgRate = useMemo(() => {
        const wt = Number(itemWeight || 0);
        if (wt <= 0) return 0;
        return Number((resolvedTotalCost / wt).toFixed(2));
    }, [resolvedTotalCost, itemWeight]);

    const perPlateCost = useMemo(() => {
        const wt = Number(itemWeight || 0);
        if (wt <= 0) return resolvedTotalCost;
        return Number((resolvedTotalCost / wt).toFixed(2));
    }, [resolvedTotalCost, itemWeight]);

    const handleToggleRawMaterialVisible = (rowId) => {
        if (isViewMode) return;
        setRawMaterialRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, visible: !row.visible } : row))
        );
    };

    const handleRawMaterialAdded = async (newItemData) => {
        try {
            setRawMaterialLoading(true);
            await fetchUnits();
            const updatedList = await fetchRawMaterialCatalog();

            let matched = null;
            if (newItemData?.id) {
                matched = updatedList.find(
                    (item) => String(item.id) === String(newItemData.id)
                );
            }
            if (!matched && newItemData?.nameEnglish) {
                matched = updatedList.find(
                    (item) =>
                        item.name?.trim().toLowerCase() ===
                        newItemData.nameEnglish.trim().toLowerCase()
                );
            }
            if (!matched && newItemData?.name) {
                matched = updatedList.find(
                    (item) =>
                        item.name?.trim().toLowerCase() ===
                        newItemData.name.trim().toLowerCase()
                );
            }

            let newlySelectedId = null;
            let newlySelectedUnitId = null;
            if (matched) {
                newlySelectedId = String(matched.id);
                newlySelectedUnitId = matched.unitId || newItemData?.unitId ? String(matched.unitId || newItemData?.unitId) : "";
            } else if (newItemData?.id) {
                newlySelectedId = String(newItemData.id);
                newlySelectedUnitId = newItemData.unitId ? String(newItemData.unitId) : "";
            }

            if (newlySelectedId) {
                setSelectedRawMaterial(newlySelectedId);
                setSelectedRawMaterialUnit(newlySelectedUnitId);
                fetchRateForRawMaterial(newlySelectedId, newlySelectedUnitId);
            }
        } catch (err) {
            console.error("Failed to update catalog after raw material creation:", err);
        } finally {
            setRawMaterialLoading(false);
        }
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

    const fetchCaptainRecipeRate = async (recipeId) => {
        if (!recipeId) {
            setCaptainRate("");
            return;
        }
        setCaptainRateLoading(true);
        try {
            let recipeData = null;
            if (outlet) {
                try {
                    const res = await getKitchenCaptainReceipeByIdAndOrg(recipeId, outlet);
                    recipeData = res?.data?.data || res?.data;
                } catch {
                    // Fallback to getKitchenCaptainReceipeById
                }
            }
            if (!recipeData) {
                const res = await getKitchenCaptainReceipeById(recipeId);
                recipeData = res?.data?.data || res?.data;
            }
            if (!recipeData) {
                recipeData = captainRecipeCatalog.find((item) => String(item.id) === String(recipeId));
            }

            if (recipeData) {
                const baseWeight = Number(recipeData.weight || 0);
                const baseRate = Number(recipeData.recipeRate ?? recipeData.rate ?? 0);
                let calculatedRate = 0;
                if (baseWeight > 0 && baseRate > 0) {
                    calculatedRate = Number((baseRate / baseWeight).toFixed(2));
                } else if (recipeData.costPerKg != null && Number(recipeData.costPerKg) > 0) {
                    calculatedRate = Number(Number(recipeData.costPerKg).toFixed(2));
                } else if (baseRate > 0) {
                    calculatedRate = baseRate;
                }
                setCaptainRate(calculatedRate > 0 ? String(calculatedRate) : "0");

                if (recipeData.unitId) {
                    setSelectedCaptainUnit(String(recipeData.unitId));
                }
            } else {
                setCaptainRate("");
            }
        } catch (err) {
            console.error("Failed to fetch captain recipe rate:", err);
            const found = captainRecipeCatalog.find((item) => String(item.id) === String(recipeId));
            if (found) {
                const bw = Number(found.weight || 0);
                const br = Number(found.recipeRate ?? found.rate ?? 0);
                const r = bw > 0 ? Number((br / bw).toFixed(2)) : (Number(found.costPerKg) || 0);
                setCaptainRate(r > 0 ? String(r) : "0");
                if (found.unitId) setSelectedCaptainUnit(String(found.unitId));
            } else {
                setCaptainRate("");
            }
        } finally {
            setCaptainRateLoading(false);
        }
    };

    const resetCaptainForm = () => {
        setSelectedCaptainRecipe("");
        setSelectedCaptainUnit("");
        setCaptainWeight("");
        setCaptainRate("");
        setEditingCaptainRowId(null);
    };

    const handleAddCaptainRow = () => {
        if (isViewMode) return;
        if (!outlet) {
            notify.error("Please select a Unit");
            return;
        }
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

        const rateVal = captainRate !== "" ? Number(captainRate) : 0;
        const weightVal = Number(captainWeight) || 0;
        const amountVal = Number((weightVal * rateVal).toFixed(2));

        if (editingCaptainRowId) {
            setCaptainRows((prev) =>
                prev.map((row) =>
                    row.rowId === editingCaptainRowId
                        ? {
                            ...row,
                            captainRecipeId: selectedCaptainRecipe,
                            category: recipe?.category || row.category,
                            name: recipe?.name || row.name,
                            weight: weightVal,
                            unitId: selectedCaptainUnit,
                            unit: unit?.name || row.unit,
                            rate: rateVal,
                            amount: amountVal,
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
                    weight: weightVal,
                    unitId: selectedCaptainUnit,
                    unit: unit?.name || "",
                    rate: rateVal,
                    amount: amountVal,
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
        setCaptainWeight(row.weight != null ? String(row.weight) : "");
        setSelectedCaptainUnit(String(row.unitId ?? ""));
        setCaptainRate(row.rate != null ? String(row.rate) : "");
    };

    const handleUpdateCaptainField = (rowId, field, val) => {
        if (isViewMode) return;
        setCaptainRows((prev) =>
            prev.map((r) => {
                if (r.rowId !== rowId) return r;
                const updated = { ...r, [field]: val };
                const w = field === "weight" ? Number(val || 0) : Number(updated.weight || 0);
                const rate = field === "rate" ? Number(val || 0) : Number(updated.rate || 0);
                updated.amount = Number((w * rate).toFixed(2));
                return updated;
            })
        );
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

                const baseW = Number(recipe?.weight || ingredient.weight || 0);
                const baseR = Number(recipe?.recipeRate ?? recipe?.rate ?? ingredient.rate ?? 0);
                const perRate = baseW > 0 ? Number((baseR / baseW).toFixed(2)) : (Number(recipe?.costPerKg) || 0);
                const ingW = Number(ingredient.weight ?? 1);

                acc.push({
                    rowId: captainRowSeq++,
                    id: 0,
                    captainRecipeId,
                    category: ingredient.category ?? recipe?.category ?? "",
                    name: ingredient.name ?? recipe?.name ?? "",
                    weight: ingW,
                    unitId: unitId != null ? String(unitId) : "",
                    unit: ingredient.unitName || getUnitLabel(ingredient.unit) || unit?.name || "",
                    rate: perRate,
                    amount: Number((ingW * perRate).toFixed(2)),
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

            const rmRate = Number(ingredient.rate ?? ingredient.price ?? rawMaterial?.rate ?? rawMaterial?.price ?? 0);
            const rmWeight = Number(ingredient.weight ?? 1);
            acc.push({
                rowId: rawMaterialRowSeq++,
                id: 0,
                rawMaterialId,
                category: ingredient.category ?? rawMaterial?.category ?? "",
                name: ingredient.name ?? rawMaterial?.name ?? "",
                weight: rmWeight,
                unitId: unitId != null ? String(unitId) : "",
                unit: ingredient.unitName || getUnitLabel(ingredient.unit) || unit?.name || "",
                rate: rmRate,
                amount: rmWeight * rmRate,
                venue: ingredient.venue ?? "At Venue",
                visible: ingredient.visible ?? true,
            });
            return acc;
        }, []);

        if (newRows.length > 0) {
            setRawMaterialRows((prev) => [...prev, ...newRows]);
            fetchRecipeCosting(pricingMethod, fromDate, toDate, [...rawMaterialRows, ...newRows]);
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
                        className="text-[#43474F] font-semibold py-4 uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2 text-xs">
                        {String(row.index + 1).padStart(2, "0")}
                    </span>
                ),
                enableSorting: false,
                size: 60,
            },
            {
                id: "category",
                accessorFn: (row) => row.category,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Category"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs">{row.original.category || "-"}</span>
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
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-xs text-gray-800">{row.original.name}</span>
                ),
                size: 240,
            },
            {
                id: "weight",
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Weight"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) =>
                    isViewMode ? (
                        <span className="text-gray-700 text-xs">{row.original.weight}</span>
                    ) : (
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.original.weight}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) =>
                                handleUpdateRawMaterialField(row.original.rowId, "weight", e.target.value)
                            }
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#084E92] bg-white text-gray-800"
                        />
                    ),
                size: 100,
            },
            {
                id: "unit",
                accessorFn: (row) => row.unit,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 font-medium text-xs">{row.original.unit || "-"}</span>
                ),
                size: 90,
            },
            {
                id: "rate",
                accessorFn: (row) => row.rate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Rate (₹)"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) =>
                    isViewMode ? (
                        <span className="text-gray-700 font-medium text-xs">
                            ₹{Number(row.original.rate || 0).toFixed(2)}
                        </span>
                    ) : (
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.original.rate}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) =>
                                handleUpdateRawMaterialField(row.original.rowId, "rate", e.target.value)
                            }
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#084E92] bg-white text-gray-800"
                        />
                    ),
                size: 100,
            },
            {
                id: "amount",
                accessorFn: (row) => row.amount,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Amount (₹)"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => {
                    const amt =
                        Number(row.original.weight || 0) * Number(row.original.rate || 0);
                    return (
                        <span className="text-gray-900 font-bold text-xs">
                            ₹{Number(amt || 0).toFixed(2)}
                        </span>
                    );
                },
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
                                className="text-[#43474F] font-semibold uppercase text-xs"
                            />
                        ),
                        cell: ({ row }) => (
                            <div className="flex items-center gap-3">
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
                        size: 80,
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
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-xs text-gray-800">{row.original.name}</span>
                ),
                size: 260,
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
                cell: ({ row }) =>
                    isViewMode ? (
                        <span className="text-gray-700">{row.original.weight}</span>
                    ) : (
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.original.weight}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) =>
                                handleUpdateCaptainField(row.original.rowId, "weight", e.target.value)
                            }
                            className="w-20 border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#084E92]"
                        />
                    ),
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
                id: "amount",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Amount (₹)"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => {
                    const amt =
                        row.original.amount != null
                            ? Number(row.original.amount)
                            : Number(row.original.weight || 0) * Number(row.original.rate || 0);
                    return (
                        <span className="text-gray-900 font-bold">
                            ₹{Number(amt || 0).toFixed(2)}
                        </span>
                    );
                },
                size: 130,
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
            notify.error("Please select a Unit");
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

            const currentUserId = Number(getUserIdFromToken()) || 0;

            const captainRecipeIdsList = captainRows
                .map((r) => Number(r.captainRecipeId))
                .filter((id) => Number.isFinite(id) && id > 0);

            const formattedCaptainRecipes = captainRows.map((r) => {
                const weightVal = Number(r.weight || 0);
                const perUnitRateVal = Number(r.perUnitRate != null && Number(r.perUnitRate) > 0 ? r.perUnitRate : (r.rate || 0));
                const totalRate = Number(r.amount != null ? r.amount : (weightVal * perUnitRateVal).toFixed(2));
                return {
                    id: Number(r.id) || 0,
                    captainRecipeId: Number(r.captainRecipeId) || 0,
                    headerId: Number(headerId) || 0,
                    isActive: r.isActive !== false,
                    perUnitRate: perUnitRateVal,
                    rate: totalRate,
                    subOutletId: Number(r.subOutletId) || 0,
                    unitId: Number(r.unitId) || 0,
                    userId: Number(r.userId) || currentUserId,
                    weight: weightVal,
                };
            });

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
                captainRecipes: formattedCaptainRecipes,
                headers: [
                    {
                        id: headerId || 0,
                        calories: Number(calories) || 0,
                        costPerKg: Number(perKgRate.toFixed(2)),
                        costPerPerson: Number(perPlateCost.toFixed(2)),
                        instructionEnglish: form.instructionEnglish?.trim() || "",
                        instructionGujarati: form.instructionGujarati?.trim() || "",
                        instructionHindi: form.instructionHindi?.trim() || "",
                        otherCosts: formattedOtherCosts,
                        paxQty: 100,
                        recipeRate: resolvedTotalCost,
                        remarks: formatRemarks(form.remarks || ""),
                        unitId: Number(itemUnitId),
                        url: form.url?.trim() || "",
                        weight: Number(itemWeight),
                        rate: resolvedTotalCost,
                    },
                ],
                menuItemId: Number(selectedMenuItem),
                name: selectedMenuItemName || `Item #${selectedMenuItem}`,
                orgId: selectedOutletId,
                rate: resolvedTotalCost,
                recipeRate: resolvedTotalCost,
                costPerKg: Number(perKgRate.toFixed(2)),
                costPerPerson: Number(perPlateCost.toFixed(2)),
                rawMaterials: rawMaterialRows.map((row) => {
                    const unitRate = Number(row.rate || 0);
                    const weightVal = Number(row.weight || 0);
                    const totalAmt = Number((unitRate * weightVal).toFixed(2));
                    return {
                        effectivePerUnitWeight: Number(row.effectivePerUnitWeight) || 0,
                        id: row.id ? Number(row.id) : 0,
                        isVisible: row.visible ?? true,
                        perUnitRate: unitRate,
                        perUnitWeight: Number(row.perUnitWeight) || 0,
                        rate: totalAmt,
                        amount: totalAmt,
                        rawMaterialId: Number(row.rawMaterialId),
                        unitId: Number(row.unitId),
                        venue: row.venue || "At Venue",
                        weight: weightVal,
                    };
                }),
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
                        title="Select Menu Item & Unit"
                        open={openSections.select}
                        onToggle={() => toggleSection("select")}
                    />
                    {openSections.select && (
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <div>
                                    <Label required>Menu Item</Label>
                                    <SearchableSelect
                                        name="recipeMenuItem"
                                        options={menuItemOptions}
                                        value={selectedMenuItem ? String(selectedMenuItem) : ""}
                                        isClearable={!isViewMode && !isEditMode}
                                        clearable={!isViewMode && !isEditMode}
                                        disabled={isViewMode || isEditMode}
                                        onChange={(e) => {
                                            const value = e?.target?.value ?? e?.value ?? "";
                                            setSelectedMenuItem(value ? String(value) : "");
                                        }}
                                        placeholder="Select Menu Item"
                                    />
                                </div>

                                <div>
                                    <Label required>Unit</Label>
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
                                                ? "Loading units..."
                                                : "Select Unit"
                                        }
                                    />
                                    {orgScopeError && (
                                        <p className="text-xs text-red-500 mt-1">{orgScopeError}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>calories</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        value={calories}
                                        onChange={(e) => setCalories(e.target.value)}
                                        placeholder="Enter calories"
                                        disabled={!selectedMenuItem || isViewMode}
                                        className={inputCls}
                                    />
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
                                    Please select both a Menu Item and a Unit to load or create a recipe.
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
                                        onBlur={() => setForm((prev) => ({ ...prev, remarks: formatRemarks(prev.remarks) }))}
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
                                {/* Pricing Method Selection (Above Raw Materials) */}
                                <div className="mb-5 p-3.5 rounded-2xl border border-blue-100 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                              
                                                <span>Pricing Method</span>
                                            </label>
                                            <select
                                                value={pricingMethod}
                                                onChange={(e) => handlePricingMethodChange(e.target.value)}
                                                disabled={isViewMode || calculatingCost || !isReady}
                                                className="h-10 px-3 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                {PRICING_METHOD_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date Range for LOWEST_PRICE, HIGHEST_PRICE */}
                                        {["LOWEST_PRICE", "HIGHEST_PRICE"].includes(pricingMethod) && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                                        <Calendar size={13} className="text-[#084E92]" />
                                                        <span>From Date</span>
                                                        <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={fromDate}
                                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                                        disabled={isViewMode || calculatingCost || !isReady}
                                                        className="h-10 px-3 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                                        <Calendar size={13} className="text-gray-400" />
                                                        <span>To Date</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={toDate}
                                                        onChange={(e) => handleToDateChange(e.target.value)}
                                                        disabled={isViewMode || calculatingCost || !isReady}
                                                        className="h-10 px-3 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="flex items-end pt-5">
                                            <button
                                                type="button"
                                                onClick={handleRecalculateCost}
                                                disabled={calculatingCost || !isReady}
                                                className="h-10 px-4 rounded-xl bg-[#084E92] hover:bg-[#063b6f] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                                                title="Recalculate Costing"
                                            >
                                                {calculatingCost ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        <span>Calculating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={14} />
                                                        <span>Recalculate Cost</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {!isViewMode && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <Label>Raw Material Item</Label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            name="rawMaterial"
                                                            value={selectedRawMaterial}
                                                            onChange={(e) => {
                                                                const rawMaterialId = e?.target?.value ?? e?.value ?? e ?? "";
                                                                setSelectedRawMaterial(rawMaterialId);
                                                                const material = rawMaterialCatalog.find(
                                                                    (item) => String(item.id) === String(rawMaterialId)
                                                                );
                                                                const unitId = material?.unitId ? String(material.unitId) : "";
                                                                setSelectedRawMaterialUnit(unitId);
                                                                if (rawMaterialId && unitId) {
                                                                    fetchRateForRawMaterial(rawMaterialId, unitId);
                                                                } else {
                                                                    setRawMaterialRate("");
                                                                }
                                                            }}
                                                            options={availableRawMaterials.map((m) => ({
                                                                value: String(m.id),
                                                                label: m.name,
                                                            }))}
                                                            placeholder={
                                                                rawMaterialLoading && rawMaterialCatalog.length === 0
                                                                    ? "Loading Raw Materials..."
                                                                    : "Select Raw Material"
                                                            }
                                                            disabled={rawMaterialLoading && rawMaterialCatalog.length === 0}
                                                            hasMore={hasMoreRawMaterials}
                                                            loadingMore={loadingMoreRawMaterials}
                                                            onLoadMore={handleLoadMoreRawMaterials}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddRawMaterialModalOpen(true)}
                                                        className="w-10 h-10 bg-[#084E92] hover:bg-[#063b6f] rounded-lg cursor-pointer text-white flex items-center justify-center shrink-0 transition"
                                                        title="Add New Raw Material"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
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

                                            <div className="md:col-span-2">
                                                <Label required>Unit</Label>
                                                <SearchableSelect
                                                    name="rawMaterialUnit"
                                                    value={selectedRawMaterialUnit}
                                                    onChange={(e) => {
                                                        const uId = e?.target?.value ?? e?.value ?? e ?? "";
                                                        setSelectedRawMaterialUnit(uId);
                                                        if (selectedRawMaterial) {
                                                            fetchRateForRawMaterial(selectedRawMaterial, uId);
                                                        }
                                                    }}
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

                                            <div className="md:col-span-2">
                                                <Label>
                                                    <span className="flex items-center gap-1.5">
                                                        <span>Rate (₹)</span>
                                                        {rateLoading && <Loader2 size={12} className="animate-spin text-[#084E92]" />}
                                                    </span>
                                                </Label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        value={rawMaterialRate}
                                                        onChange={(e) => setRawMaterialRate(e.target.value)}
                                                        placeholder={rateLoading ? "Fetching..." : "Rate (₹)"}
                                                        className={inputCls}
                                                    />
                                                    {rateLoading && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Loader2 size={14} className="animate-spin text-[#084E92]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label>Amount (₹)</Label>
                                                <div className="h-10 px-3.5 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                                                    ₹{(Number(rawMaterialWeight || 0) * Number(rawMaterialRate || 0)).toFixed(2)}
                                                </div>
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
                                        className="rounded-2xl w-full"
                                        tableLayout={{
                                            dense: true,
                                            width: 'auto',
                                            cellBorder: true,
                                            headerBorder: true,
                                            rowBorder: true,
                                        }}
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

                                        <Card className="rounded-t-none border-t-0 shadow-none border w-full">
                                            <CardTable className="w-full">
                                                <DataGridTable />
                                            </CardTable>
                                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-700">
                                                    <span>Total Items: <strong className="text-gray-900">{filteredRawMaterialRows.length}</strong></span>
                                                    <span>Total RM Cost: <strong className="text-[#084E92] font-bold">₹{totalRawMaterialCost.toFixed(2)}</strong></span>
                                                    <span>Per KG Rate: <strong className="text-emerald-700 font-bold">₹{(Number(itemWeight) > 0 ? totalRawMaterialCost / Number(itemWeight) : 0).toFixed(2)}/kg</strong></span>
                                                </div>
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
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <Label required>Captain Recipe</Label>
                                                <SearchableSelect
                                                    name="captainRecipe"
                                                    value={selectedCaptainRecipe}
                                                    onChange={(e) => {
                                                        const recipeId = e?.target?.value ?? e?.value ?? e ?? "";
                                                        setSelectedCaptainRecipe(recipeId);
                                                        if (recipeId) {
                                                            fetchCaptainRecipeRate(recipeId);
                                                        } else {
                                                            setCaptainRate("");
                                                            setSelectedCaptainUnit("");
                                                        }
                                                    }}
                                                    options={availableCaptainRecipes.map((r) => ({
                                                        value: String(r.id),
                                                        label: r.name,
                                                    }))}
                                                    placeholder="Select Captain Recipe"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label required>Weight</Label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    value={captainWeight}
                                                    onChange={(e) => setCaptainWeight(e.target.value)}
                                                    placeholder="Enter weight"
                                                    className={inputCls}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label required>Unit</Label>
                                                <SearchableSelect
                                                    name="captainUnit"
                                                    value={selectedCaptainUnit}
                                                    onChange={(e) => setSelectedCaptainUnit(e?.target?.value ?? e?.value ?? e ?? "")}
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

                                            <div className="md:col-span-2">
                                                <Label>Per KG Rate (₹)</Label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        value={captainRate}
                                                        onChange={(e) => setCaptainRate(e.target.value)}
                                                        placeholder={captainRateLoading ? "Loading..." : "Per KG Rate (₹)"}
                                                        className={inputCls}
                                                        disabled={captainRateLoading}
                                                    />
                                                    {captainRateLoading && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Loader2 size={14} className="animate-spin text-[#084E92]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label>Amount (₹)</Label>
                                                <div className="h-10 px-3.5 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                                                    ₹{(Number(captainWeight || 0) * Number(captainRate || 0)).toFixed(2)}
                                                </div>
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
                                        className="rounded-2xl w-full"
                                        tableLayout={{
                                            dense: true,
                                            width: 'auto',
                                            cellBorder: true,
                                            headerBorder: true,
                                            rowBorder: true,
                                        }}
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

                                        <Card className="rounded-t-none border-t-0 shadow-none border w-full">
                                            <CardTable className="w-full">
                                                <DataGridTable />
                                            </CardTable>
                                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-700">
                                                    <span>Total Items: <strong className="text-gray-900">{filteredCaptainRows.length}</strong></span>
                                                    <span>Total Captain Cost: <strong className="text-[#084E92] font-bold">₹{totalCaptainCost.toFixed(2)}</strong></span>
                                                    <span>Per Unit Rate: <strong className="text-emerald-700 font-bold">₹{(totalCaptainWeight > 0 ? totalCaptainCost / totalCaptainWeight : 0).toFixed(2)}</strong></span>
                                                </div>
                                                <DataGridPagination />
                                            </CardFooter>
                                        </Card>
                                    </DataGrid>
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Cost Summary (Per Plate, Per Recipe, Per KG) */}
                    <div className="mt-5 p-5 rounded-2xl border border-blue-100 bg-[#F8FAFC] shadow-2xs">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Recipe Cost Summary</h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Calculated rates based on {PRICING_METHOD_OPTIONS.find((o) => o.value === pricingMethod)?.label || pricingMethod}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Raw Material Cost
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 block mt-0.5">
                                        ₹{totalRawMaterialCost.toFixed(2)}
                                    </span>
                                </div>

                                {totalCaptainCost > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                            Captain Recipe Cost
                                        </span>
                                        <span className="text-sm font-bold text-[#084E92] block mt-0.5">
                                            ₹{totalCaptainCost.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {resolvedFuelCost > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                            Fuel Overhead
                                        </span>
                                        <span className="text-sm font-bold text-amber-600 block mt-0.5">
                                            ₹{resolvedFuelCost.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                        Per KG Rate
                                    </span>
                                    <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                                        ₹{perKgRate.toFixed(2)} / kg
                                    </span>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                                        Per Plate Cost
                                    </span>
                                    <span className="text-sm font-bold text-indigo-700 block mt-0.5">
                                        ₹{perPlateCost.toFixed(2)}
                                    </span>
                                </div>

                                <div className="bg-white border border-[#084E92]/30 rounded-xl px-4 py-2.5 min-w-[140px] shadow-xs bg-blue-50/40">
                                    <span className="text-[10px] font-bold text-[#084E92] uppercase tracking-wider block">
                                        Total Recipe Cost
                                    </span>
                                    <span className="text-base font-extrabold text-[#084E92] block mt-0.5">
                                        ₹{resolvedTotalCost.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
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

                <QuickAddRawMaterialModal
                    isOpen={isAddRawMaterialModalOpen}
                    onClose={() => setIsAddRawMaterialModalOpen(false)}
                    onSuccess={handleRawMaterialAdded}
                />
            </div>
        </Container>
    );
};

export default CreateItemRecipe;