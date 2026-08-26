import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, Image, Layers, Menu, Plus, UploadCloud, Search, Copy, RefreshCw, ChevronLeft, ChevronRight, SquarePen, Trash2 } from "lucide-react";
import CreateSubCategory from "../menu-subcategory/CreateSubCategory";
import CreateMenuCategory from "../menu-category/CreateMenuCategory";
import { Link, useNavigate, useParams } from "react-router";
import { addMenuItem, getAllMenuCategory, getAllMenuSubCategoryById, getMenuItemById, updateMenuItem, getAllRawMaterialItems, getAllRawMaterialUnits, deleteMenuItemRawmaterialById, getMenuItemCaptainReceipeByMenuId, getMenuItemRawMaterialByMenuId, getAllCaptainReceipeByOrgId } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
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
import { Input } from "@/components/ui/input";
import SearchableSelect from "../../../utils/SearchableSelect";
import CopyRecipeModal from "./CopyRecipeModal";
import AddRawMaterialItemModal from "../../raw-material/raw-material-item-master/AddRawMaterialItemModal";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

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

const SectionCard = ({ children, className = '' }) => (
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
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
    </div>
);

const ToggleSwitch = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`w-10 h-5.5 cursor-pointer rounded-full transition-colors relative shrink-0 ${checked ? "bg-[#084E92]" : "bg-gray-300"
            }`}
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

const CreateMenuItem = () => {
    const [openCategory, setOpenCategory] = useState(false);
    const [openSubCategory, setSubOpenCategory] = useState(false);
    const [openRawMaterialItem, setOpenRawMaterialItem] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSubCategory, setSelectedSubCategory] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [copyRecipeOpen, setCopyRecipeOpen] = useState(false);
    const [isCaptainRecipe, setIsCaptainRecipe] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const [rawMaterialSyncing, setRawMaterialSyncing] = useState(false);
    const [captainSyncing, setCaptainSyncing] = useState(false);
    const { id } = useParams();
    const isEdit = !!id;

    const navigate = useNavigate();

    const [openSections, setOpenSections] = useState({
        basic: true,
        category: true,
        details: true,
        image: true,
        rawMaterial: true,
        captainRecipe: true,
    });

    const toggleSection = (key) => {
        setOpenSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const initialForm = {
        nameEnglish: "",
        nameHindi: "",
        nameGujarati: "",
        slogan: "",
        price: "",
        sequence: "",
        remarks: "",
        instructionEnglish: "",
        instructionHindi: "",
        instructionGujarati: "",
        url: "",
        dishCosting: "",
        totalRate: "",
    };

    const [form, setForm] = useState(initialForm);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const userId = getUserIdFromToken();
    const orgId = getOrgIdFromToken();

    const fetchMenuItemById = useCallback(async () => {
        try {
            const res = await getMenuItemById(id);

            const item =
                res?.data?.data?.["Menu Item Details"] ||
                res?.data?.data ||
                res?.data;
            if (!item) return;
            setForm({
                nameEnglish: item.nameEnglish || "",
                nameHindi: item.nameHindi || "",
                nameGujarati: item.nameGujarati || "",
                slogan: item.slogan || "",
                price: item.price || "",
                sequence: item.sequence || "",
                remarks: item.remarks || "",
                instructionEnglish: item.instructionEnglish || "",
                instructionHindi: item.instructionHindi || "",
                instructionGujarati: item.instructionGujarati || "",
                url: item.url || "",
                dishCosting: item.dishCosting || "",
                totalRate: item.totalRate || "",
            });

            setSelectedCategory(item.menuCategory?.id?.toString() || "");
            setSelectedSubCategory(item.menuSubCategory?.id?.toString() || "");

            const latestImage = item.files
                ?.filter(
                    (file) =>
                        file?.moduleName === "MENUITEM" &&
                        file?.path
                )
                ?.slice(-1)[0]?.path;

            if (latestImage) {
                setImagePreview(latestImage);
            }

            const rawMaterialsList = item.menuItemRawMaterials || [];
            const mappedRawMaterialRows = rawMaterialsList.map((rm) => ({
                rowId: rawMaterialRowSeq++,
                id: rm.id,
                rawMaterialId: rm.rawMaterial?.id ?? rm.rawMaterialId ?? "",
                category:
                    rm.rawMaterial?.rawMaterialCat?.nameEnglish ??
                    rm.category ??
                    "",
                name: rm.rawMaterial?.nameEnglish ?? "",
                weight: rm.weight ?? 0,
                unitId: rm.unit?.id ?? rm.unitId ?? "",
                unit: rm.unit?.nameEnglish ?? "",
                rate: Number(rm.rate ?? 0),
                venue: rm.venue ?? "At Venue",
                visible: rm.isVisible ?? true,
            }));
            setRawMaterialRows(mappedRawMaterialRows);

        } catch (err) {
            console.error(err);
            notify.error("Failed to load Menu Item");
        }
    }, [id]);

    useEffect(() => {
        if (isEdit) {
            fetchMenuItemById();
        }
    }, [isEdit, fetchMenuItemById]);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await getAllMenuCategory();
            const data = res?.data?.data?.["Menu Category Details"] || [];
            setCategories(
                Array.isArray(data) ? data.filter((item) => item.isActive === true) : []
            );
        } catch (err) {
            console.error("Failed to load categories", err);
            notify.error("Failed to load categories");
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const fetchSubCategories = useCallback(async () => {
        try {
            const res = await getAllMenuSubCategoryById(userId);
            const payload = res?.data?.data ?? res?.data ?? res;

            const rawList = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.["Menu Sub Category Details"])
                    ? payload["Menu Sub Category Details"]
                    : [];
            const list = rawList.map((item) => ({
                id: item.id,
                name: item.nameEnglish ?? item.name ?? "",
                menuCategoryId: item.menuCategory?.id,
                isActive: item.isActive,
            }));
            setSubCategories(list);
        } catch (err) {
            console.error(err);
            setSubCategories([]);
        }
    }, [userId]);

    useEffect(() => {
        fetchSubCategories();
    }, [fetchSubCategories]);

    const filteredSubCategories = selectedCategory
        ? subCategories.filter(
            (item) =>
                String(item.menuCategoryId) === String(selectedCategory) &&
                item.isActive === true
        )
        : [];

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

    const fetchRawMaterialCatalog = useCallback(async () => {
        try {
            setRawMaterialLoading(true);

            const res = await getAllRawMaterialItems(
                0,      // category id - all categories
                0,      // page
                true,   // only active raw materials
                ""      // search
            );

            const data =
                res?.data?.data?.["Raw Material Details"] ||
                [];

            const mappedData = Array.isArray(data)
                ? data.map((item) => ({
                    ...item,

                    id: item.id,
                    name: item.nameEnglish || item.name || "",
                    nameEnglish: item.nameEnglish || "",
                    category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || "",
                    categoryId: item.rawMaterialCat?.id || item.rawMaterialCatId || null,
                    rate: item.supplierRate ?? 0,
                    unitId: item.unit?.id || item.unitId || null,
                    unit: item.unit?.nameEnglish || item.unitName || "",
                }))
                : [];

            setRawMaterialCatalog(mappedData);
        } catch (err) {
            console.error(
                "Failed to load raw materials:",
                err
            );

            setRawMaterialCatalog([]);
            notify.error("Failed to load raw materials");
        } finally {
            setRawMaterialLoading(false);
        }
    }, []);

    const selectedRawMaterialData = useMemo(() => {
        return rawMaterialCatalog.find(
            (item) => String(item.id) === String(selectedRawMaterial)
        );
    }, [rawMaterialCatalog, selectedRawMaterial]);

    const filteredRawMaterialUnits = useMemo(() => {
        if (!selectedRawMaterialData?.unitId) {
            return [];
        }

        return unitCatalog.filter(
            (unit) => String(unit.id) === String(selectedRawMaterialData.unitId)
        );
    }, [unitCatalog, selectedRawMaterialData]);

    const fetchUnits = useCallback(async () => {
        try {
            setUnitLoading(true);

            const res = await getAllRawMaterialUnits();

            const data =
                res?.data?.data?.["Unit Details"] || [];

            const mappedData = Array.isArray(data)
                ? data
                    .filter((item) => item.isActive === true)
                    .map((item) => ({
                        ...item,

                        id: item.id,
                        name: item.nameEnglish || "",
                        nameEnglish: item.nameEnglish || "",
                        symbol: item.symbolEnglish || "",
                        status: item.isActive ? "Active" : "Inactive",
                    }))
                : [];

            setUnitCatalog(mappedData);
        } catch (err) {
            console.error(
                "Failed to load units:",
                err
            );

            setUnitCatalog([]);
            notify.error("Failed to load units");
        } finally {
            setUnitLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchRawMaterialCatalog();
    }, [fetchRawMaterialCatalog]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);
    const resetRawMaterialForm = () => {
        setSelectedRawMaterial("");
        setSelectedRawMaterialUnit("");
        setRawMaterialWeight("");
        setEditingRawMaterialRowId(null);
    };

    const handleAddRawMaterialRow = () => {
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
        const unit = unitCatalog.find(
            (item) => String(item.id) === String(selectedRawMaterialUnit)
        );

        if (!material) {
            notify.error("Selected raw material not found");
            return;
        }

        if (!unit) {
            notify.error("Selected unit not found");
            return;
        }


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
                            rate: material?.rate ?? row.rate,
                        }
                        : row
                )
            );
        } else {
            const newRow = {
                rowId: rawMaterialRowSeq++,
                rawMaterialId: selectedRawMaterial,
                category: material?.category || "",
                name: material?.name || "",
                weight: rawMaterialWeight,
                unitId: selectedRawMaterialUnit,
                unit: unit?.name || "",
                rate: material?.rate ?? 0,
                venue: "At Venue",
                visible: true,
            };
            setRawMaterialRows((prev) => [...prev, newRow]);
        }

        resetRawMaterialForm();
    };

    const handleEditRawMaterialRow = (row) => {
        setEditingRawMaterialRowId(row.rowId);
        setSelectedRawMaterial(String(row.rawMaterialId ?? ""));
        setRawMaterialWeight(row.weight);
        setSelectedRawMaterialUnit(String(row.unitId ?? ""));
    };



    const openDeleteRawMaterialConfirm = (row) => {
        setDeleteTarget({ type: 'rawMaterial', row });
        setShowDeleteConfirm(true);
    };

    const openDeleteCaptainConfirm = (row) => {
        setDeleteTarget({ type: 'captain', row });
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
            if (type === 'rawMaterial') {
                if (row.id) {
                    await deleteMenuItemRawmaterialById([row.id]);
                }
                setRawMaterialRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
            } else {
                // TODO: swap in the real captain-recipe delete endpoint once available
                // if (row.id) {
                //     await deleteMenuItemCaptainRecipeById([row.id]);
                // }
                setCaptainRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
            }

            notify.success('Item removed');
            closeDeleteConfirm();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete item');
        } finally {
            setDeleteSaving(false);
        }
    };

    const handleToggleRawMaterialVisible = (rowId) => {
        setRawMaterialRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, visible: !row.visible } : row))
        );
    };

    const handleRawMaterialVenueChange = (rowId, value) => {
        setRawMaterialRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, venue: value } : row))
        );
    };

    const handleCopyIngredients = (data) => {

        const copiedIngredients = Array.isArray(data?.ingredients)
            ? data.ingredients
            : [];
        if (copiedIngredients.length === 0) {
            notify.error("No ingredients found to copy");
            return;
        }
        if (isCaptainRecipe) {
            // ---- Captain Recipe branch ----
            const newCaptainRows = copiedIngredients.map((ingredient) => {
                const captainRecipeId =
                    ingredient.captainReceipeId ??
                    ingredient.captainRecipeId ??
                    ingredient.captainReceipe?.id ??
                    ingredient.id;
                const recipe = captainRecipeCatalog.find(
                    (item) => String(item.id) === String(captainRecipeId)
                );
                const unitId =
                    ingredient.unitId ??
                    ingredient.unit?.id;
                const unit = unitCatalog.find(
                    (item) => String(item.id) === String(unitId)
                );
                return {
                    rowId: captainRowSeq++,
                    captainRecipeId: captainRecipeId,
                    category:
                        ingredient.category ??
                        ingredient.categoryName ??
                        recipe?.category ??
                        "",
                    name:
                        ingredient.name ??
                        ingredient.nameEnglish ??
                        recipe?.name ??
                        "",
                    weight:
                        ingredient.weight ??
                        ingredient.quantity ??
                        0,
                    unitId: unitId,
                    unit:
                        ingredient.unitName ??
                        (typeof ingredient.unit === "string"
                            ? ingredient.unit
                            : ingredient.unit?.nameEnglish) ??
                        unit?.name ??
                        "",
                    rate:
                        Number(ingredient.rate ?? recipe?.rate ?? 0),
                    venue:
                        ingredient.venue ?? "At Venue",
                };
            });

            setCaptainRows((prev) => [...prev, ...newCaptainRows]);
            setCopyRecipeOpen(false);
            notify.success(`${newCaptainRows.length} ingredient(s) copied successfully`);
            return;
        }

        // ---- Raw Material branch (unchanged) ----
        const newRows = copiedIngredients.map((ingredient) => {
            const rawMaterialId =
                ingredient.rawMaterialId ??
                ingredient.rawMaterial?.id ??
                ingredient.id;
            const rawMaterial = rawMaterialCatalog.find(
                (item) => String(item.id) === String(rawMaterialId)
            );
            const unitId =
                ingredient.unitId ??
                ingredient.unit?.id ??
                rawMaterial?.unitId;
            const unit = unitCatalog.find(
                (item) => String(item.id) === String(unitId)
            );
            return {
                rowId: rawMaterialRowSeq++,
                rawMaterialId: rawMaterialId,
                categoryId:
                    ingredient.categoryId ??
                    ingredient.rawMaterialCatId ??
                    rawMaterial?.categoryId ??
                    null,
                category:
                    ingredient.category ??
                    ingredient.categoryName ??
                    rawMaterial?.category ??
                    "",
                name:
                    ingredient.name ??
                    ingredient.nameEnglish ??
                    rawMaterial?.name ??
                    "",
                nameEnglish:
                    ingredient.nameEnglish ??
                    ingredient.name ??
                    rawMaterial?.nameEnglish ??
                    "",
                weight:
                    ingredient.weight ??
                    ingredient.quantity ??
                    0,
                quantity:
                    ingredient.quantity ??
                    ingredient.weight ??
                    0,
                unitId: unitId,
                unit:
                    ingredient.unitName ??
                    (typeof ingredient.unit === "string"
                        ? ingredient.unit
                        : ingredient.unit?.nameEnglish) ??
                    unit?.name ??
                    rawMaterial?.unit ??
                    "",
                rate:
                    Number(
                        ingredient.rate ??
                        ingredient.supplierRate ??
                        rawMaterial?.rate ??
                        0
                    ),
                venue:
                    ingredient.venue ??
                    "At Venue",
                visible:
                    ingredient.visible ?? true,
            };
        });

        setRawMaterialRows((prev) => [...prev, ...newRows]);
        setCopyRecipeOpen(false);
        notify.success(`${newRows.length} ingredient(s) copied successfully`);
    };

    const filteredRawMaterialRows = useMemo(
        () =>
            rawMaterialRows.filter((row) =>
                row.name?.toLowerCase().includes(rawMaterialTableSearch.trim().toLowerCase())
            ),
        [rawMaterialRows, rawMaterialTableSearch]
    );
    const availableRawMaterials = useMemo(() => {
        const usedIds = new Set(
            rawMaterialRows
                .filter((row) => row.rowId !== editingRawMaterialRowId)
                .map((row) => String(row.rawMaterialId))
        );
        return rawMaterialCatalog.filter((item) => !usedIds.has(String(item.id)));
    }, [rawMaterialCatalog, rawMaterialRows, editingRawMaterialRowId]);


    const rawMaterialColumns = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
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
                size: 160,
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
                size: 100,
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
                cell: ({ row }) => <span className="text-gray-700">{row.original.unit}</span>,
                size: 100,
            },
            {
                id: "rate",
                accessorFn: (row) => row.rate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Rate"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.rate}</span>,
                size: 90,
            },
            {
                id: "venue",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Venue"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        value={row.original.venue}
                        onChange={(e) =>
                            handleRawMaterialVenueChange(row.original.rowId, e.target.value)
                        }
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-sm w-28 outline-none"
                    />
                ),
                enableSorting: false,
                size: 140,
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
                        onChange={() => handleToggleRawMaterialVisible(row.original.rowId)}
                    />
                ),
                enableSorting: false,
                size: 100,
            },
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
                        <button type="button" onClick={() => handleEditRawMaterialRow(row.original)}>
                            <SquarePen
                                size={18}
                                className="text-gray-500 hover:text-blue-800 cursor-pointer"
                            />
                        </button>
                        <button
                            type="button"
                            onClick={() => openDeleteRawMaterialConfirm(row.original)}
                        >
                            <Trash2 size={18} className="text-red-300 hover:text-red-700 cursor-pointer" />
                        </button>
                    </div>
                ),
                enableSorting: false,
                size: 100,
            },
        ],
        [rawMaterialCatalog, unitCatalog]
    );

    const rawMaterialTable = useReactTable({
        data: filteredRawMaterialRows,
        columns: rawMaterialColumns,
        state: { pagination: rawMaterialPagination, rowSelection: rawMaterialRowSelection },
        onPaginationChange: setRawMaterialPagination,
        onRowSelectionChange: setRawMaterialRowSelection,
        enableRowSelection: true,
        getRowId: (row) => String(row.rowId),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    /*  Captain Recipe                                                  */

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

    const fetchCaptainRecipeCatalog = useCallback(async () => {
        try {
            const res = await getAllCaptainReceipeByOrgId(orgId, true);
            const data = res?.data?.data || [];
            setCaptainRecipeCatalog(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load captain recipes", err);
        }
    }, []);

    useEffect(() => {
        fetchCaptainRecipeCatalog();
    }, [fetchCaptainRecipeCatalog]);


    const availableCaptainRecipes = useMemo(() => {
        const usedIds = new Set(
            captainRows
                .filter((row) => row.rowId !== editingCaptainRowId)
                .map((row) => String(row.captainRecipeId))
        );
        return captainRecipeCatalog.filter((item) => !usedIds.has(String(item.id)));
    }, [captainRecipeCatalog, captainRows, editingCaptainRowId]);

    const selectedCaptainRecipeData = useMemo(() => {
        return captainRecipeCatalog.find(
            (item) => String(item.id) === String(selectedCaptainRecipe)
        );
    }, [captainRecipeCatalog, selectedCaptainRecipe]);

    const filteredCaptainUnits = useMemo(() => {
        if (!selectedCaptainRecipeData?.unitId) return [];

        const list = unitCatalog.filter(
            (unit) => String(unit.id) === String(selectedCaptainRecipeData.unitId)
        );

        // fallback if the unit isn't in unitCatalog (e.g. inactive)
        if (list.length === 0 && selectedCaptainRecipeData.unitId) {
            return [{
                id: selectedCaptainRecipeData.unitId,
                name: selectedCaptainRecipeData.unitName || "",
            }];
        }

        return list;
    }, [unitCatalog, selectedCaptainRecipeData]);

    const resetCaptainForm = () => {
        setSelectedCaptainRecipe("");
        setSelectedCaptainUnit("");
        setCaptainWeight("");
        setEditingCaptainRowId(null);
    };

    const handleAddCaptainRow = () => {
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
        const unit =
            unitCatalog.find((item) => String(item.id) === String(selectedCaptainUnit)) ??
            filteredCaptainUnits.find((item) => String(item.id) === String(selectedCaptainUnit));

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
                            rate: recipe?.rate ?? row.rate,
                        }
                        : row
                )
            );
        } else {
            const newRow = {
                rowId: captainRowSeq++,
                captainRecipeId: selectedCaptainRecipe,
                category: recipe?.category || "",
                name: recipe?.name || "",
                weight: captainWeight,
                unitId: selectedCaptainUnit,
                unit: unit?.name || "",
                rate: recipe?.rate ?? 0,
                venue: "At Venue",
            };
            setCaptainRows((prev) => [...prev, newRow]);
        }

        resetCaptainForm();
    };

    const handleEditCaptainRow = (row) => {
        setEditingCaptainRowId(row.rowId);
        setSelectedCaptainRecipe(String(row.captainRecipeId ?? ""));
        setCaptainWeight(row.weight);
        setSelectedCaptainUnit(String(row.unitId ?? ""));
    };

    const handleCaptainVenueChange = (rowId, value) => {
        setCaptainRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, venue: value } : row))
        );
    };
    const handleSyncRawMaterial = async () => {
        if (!isEdit) {
            notify.error("Save the menu item first before syncing raw materials");
            return;
        }

        setRawMaterialSyncing(true);
        try {
            const res = await getMenuItemRawMaterialByMenuId(id, true);

            const data =
                res?.data?.data?.["menuItemRawMaterials"] ||
                res?.data?.data ||
                [];

            const list = Array.isArray(data) ? data : [];

            const mappedRows = list.map((item) => {
                const rawMaterial = rawMaterialCatalog.find(
                    (m) => String(m.id) === String(item.rawMaterialId ?? item.rawMaterial?.id)
                );
                const unit = unitCatalog.find(
                    (u) => String(u.id) === String(item.unitId ?? item.unit?.id)
                );

                return {
                    rowId: rawMaterialRowSeq++,
                    id: item.id,
                    rawMaterialId: item.rawMaterialId ?? item.rawMaterial?.id ?? "",
                    category:
                        item.category ??
                        item.rawMaterial?.rawMaterialCat?.nameEnglish ??
                        rawMaterial?.category ??
                        "",
                    name:
                        item.rawMaterial?.nameEnglish ??
                        rawMaterial?.name ??
                        "",
                    weight: item.weight ?? 0,
                    unitId: item.unitId ?? item.unit?.id ?? "",
                    unit:
                        item.unit?.nameEnglish ??
                        unit?.name ??
                        "",
                    rate: Number(item.rate ?? rawMaterial?.rate ?? 0),
                    venue: item.venue ?? "At Venue",
                    visible: item.isVisible ?? true,
                };
            });

            setRawMaterialRows(mappedRows);
            notify.success("Raw materials synced");
        } catch (err) {
            console.error(err);
            notify.error("Failed to sync raw materials");
        } finally {
            setRawMaterialSyncing(false);
        }
    };
    const handleSyncCaptainRecipe = async () => {
        if (!isEdit) {
            notify.error("Save the menu item first before syncing captain recipes");
            return;
        }

        setCaptainSyncing(true);
        try {
            const res = await getMenuItemCaptainReceipeByMenuId(id, true);

            const data =
                res?.data?.data?.["Captain Receipe Details"] ||
                res?.data?.data ||
                [];

            const list = Array.isArray(data) ? data : [];

            const mappedRows = list.map((item) => {
                const recipe = captainRecipeCatalog.find(
                    (r) => String(r.id) === String(item.captainReceipeId ?? item.captainReceipe?.id)
                );
                const unit = unitCatalog.find(
                    (u) => String(u.id) === String(item.unitId ?? item.unit?.id)
                );

                return {
                    rowId: captainRowSeq++,
                    id: item.id,
                    captainRecipeId: item.captainReceipeMaster?.id ?? "",
                    category:
                        item.category ??
                        item.captainReceipe?.category ??
                        recipe?.category ??
                        "",
                    name: item.captainReceipeMaster?.name ?? recipe?.name ?? "",
                    weight: item.weight ?? 0,
                    unitId: item.unitId ?? item.unit?.id ?? "",
                    unit:
                        item.unit?.nameEnglish ??
                        unit?.name ??
                        "",
                    rate: Number(item.rate ?? recipe?.rate ?? 0),
                    venue: item.venue ?? "At Venue",
                };
            });

            setCaptainRows(mappedRows);
            notify.success("Captain recipes synced");
        } catch (err) {
            console.error(err);
            notify.error("Failed to sync captain recipes");
        } finally {
            setCaptainSyncing(false);
        }
    };
    const filteredCaptainRows = useMemo(
        () =>
            captainRows.filter((row) =>
                row.name?.toLowerCase().includes(captainTableSearch.trim().toLowerCase())
            ),
        [captainRows, captainTableSearch]
    );

    const captainColumns = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
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
                size: 160,
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
                size: 100,
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
                cell: ({ row }) => <span className="text-gray-700">{row.original.unit}</span>,
                size: 100,
            },
            {
                id: "rate",
                accessorFn: (row) => row.rate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Rate"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.rate}</span>,
                size: 90,
            },
            {
                id: "venue",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Venue"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        value={row.original.venue}
                        onChange={(e) => handleCaptainVenueChange(row.original.rowId, e.target.value)}
                        className="border border-gray-200 rounded-md px-2 py-1.5 text-sm w-28 outline-none"
                    />
                ),
                enableSorting: false,
                size: 140,
            },
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
                        <button type="button" onClick={() => handleEditCaptainRow(row.original)}>
                            <SquarePen
                                size={18}
                                className="text-gray-500 hover:text-blue-800 cursor-pointer"
                            />
                        </button>
                        <button type="button" onClick={() => openDeleteCaptainConfirm(row.original)}>
                            <Trash2 size={18} className="text-red-300 hover:text-red-700 cursor-pointer" />
                        </button>
                    </div>
                ),
                enableSorting: false,
                size: 100,
            },
        ],
        [captainRecipeCatalog, unitCatalog]
    );

    const captainTable = useReactTable({
        data: filteredCaptainRows,
        columns: captainColumns,
        state: { pagination: captainPagination, rowSelection: captainRowSelection },
        onPaginationChange: setCaptainPagination,
        onRowSelectionChange: setCaptainRowSelection,
        enableRowSelection: true,
        getRowId: (row) => String(row.rowId),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    const rawCost = useMemo(
        () =>
            rawMaterialRows.reduce((sum, row) => {
                const totalRate = Number(row.weight || 0) * Number(row.rate || 0);
                return sum + totalRate;
            }, 0),
        [rawMaterialRows]
    );

    const captainCost = useMemo(
        () =>
            captainRows.reduce((sum, row) => {
                const totalRate = Number(row.weight || 0) * Number(row.rate || 0);
                return sum + totalRate;
            }, 0),
        [captainRows]
    );

    const totalRate = rawCost + captainCost;
    const dishCost = totalRate / 100;

    const handleSave = async () => {
        try {
            if (!form.nameEnglish) {
                notify.error("Name required. Please Enter name");
                return;
            }
            if (!selectedCategory) {
                notify.error("Please Select Category");
                return;
            }
            if (!form.instructionEnglish) {
                notify.error("Instruction required");
                return;
            }
            if (Number(form.price) <= 0) {
                notify.error("Price Must be Positive");
                return;
            }
            if (Number(form.sequence) <= 0) {
                notify.error("Sequence Must be Positive");
                return;
            }

            const formData = new FormData();

            formData.append("nameEnglish", form.nameEnglish);
            formData.append("nameHindi", form.nameHindi || "");
            formData.append("nameGujarati", form.nameGujarati || "");
            formData.append("slogan", form.slogan || "");
            formData.append("price", form.price || 0);
            formData.append("sequence", form.sequence || 0);
            formData.append("remarks", form.remarks || "");
            formData.append("instructionEnglish", form.instructionEnglish);
            formData.append("instructionHindi", form.instructionHindi || "");
            formData.append("instructionGujarati", form.instructionGujarati || "");
            formData.append("menuCategoryId", selectedCategory);
            formData.append("menuSubCategoryId", selectedSubCategory);
            formData.append("url", form.url || "");
            formData.append("dishCosting", dishCost || 0);
            formData.append("totalRate", totalRate || 0);

            rawMaterialRows.forEach((row, i) => {

                formData.append(`menuItemRawMaterials[${i}].id`, row.id ?? 0);

                formData.append(`menuItemRawMaterials[${i}].rawMaterialId`, row.rawMaterialId ?? "");
                formData.append(`menuItemRawMaterials[${i}].unitId`, row.unitId ?? "");
                formData.append(`menuItemRawMaterials[${i}].weight`, row.weight ?? "");
                formData.append(`menuItemRawMaterials[${i}].rate`, row.rate ?? "");
                formData.append(`menuItemRawMaterials[${i}].venue`, row.venue ?? 0);
                formData.append(`menuItemRawMaterials[${i}].isVisible`, row.visible ?? true);
            });

            captainRows.forEach((row, i) => {

                formData.append(`captainReceipes[${i}].id`, row.id ?? 0);

                formData.append(`captainReceipes[${i}].captainReceipeId`, row.captainRecipeId ?? "");
                formData.append(`captainReceipes[${i}].unitId`, row.unitId ?? "");
                formData.append(`captainReceipes[${i}].weight`, row.weight ?? "");
                formData.append(`captainReceipes[${i}].rate`, row.rate ?? "");
                formData.append(`captainReceipes[${i}].venue`, row.venue ?? 0);
            });

            if (imageFile) {
                formData.append("file", imageFile);
            }

            if (isEdit) {
                await updateMenuItem(id, formData);
            } else {
                await addMenuItem(formData);
            }

            setForm(initialForm);
            setSelectedCategory("");
            setSelectedSubCategory("");
            setImageFile(null);
            setImagePreview(null);
            setRawMaterialRows([]);
            setCaptainRows([]);
            navigate("/menu-item/menu-items");
        } catch (err) {
            console.error("Save failed:", err?.response?.data ?? err);
            notify.error(`Failed to ${isEdit ? "update" : "Create"} Menu Item`);
        }
    };

    const handleNext = () => {
        // TODO: hook this up to whatever "Next" should do in your flow
        // (e.g. move to the next wizard step, or just call handleSave()).
        handleSave();
    };

    return (
        <Container>
            <div className="mx-4 min-h-screen p-2">

                {/* Page Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold">
                        {isEdit ? "Update Menu Item & Recipe" : "Create Menu Item & Recipe"}
                    </h1>
                    <p className="text-[#43474F]">
                        {isEdit ? "Update menu item details." : "Create a new menu item for your organization."}
                    </p>
                </div>

                {/* Basic Information */}
                <SectionCard className="mt-4">
                    <SectionHeader
                        icon={Menu}
                        title="Basic Information"
                        open={openSections.basic}
                        onToggle={() => toggleSection("basic")}
                    />
                    {openSections.basic && (
                        <div className="px-6 py-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label required>Name</Label>
                                    <input
                                        name="nameEnglish"
                                        value={form.nameEnglish}
                                        onChange={handleChange}
                                        placeholder="Enter Name"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Slogan</Label>
                                    <input
                                        name="slogan"
                                        value={form.slogan}
                                        onChange={handleChange}
                                        placeholder="Enter Slogan"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <Label required>Price</Label>
                                    <input
                                        name="price"
                                        value={form.price}
                                        onChange={handleChange}
                                        type="number"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="Enter Price"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <Label required>Sequence</Label>
                                    <input
                                        name="sequence"
                                        value={form.sequence}
                                        onChange={handleChange}
                                        type="number"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="Enter Sequence"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* Category Information */}
                <SectionCard className="mt-4">
                    <SectionHeader
                        icon={Layers}
                        title="Category Information"
                        open={openSections.category}
                        onToggle={() => toggleSection("category")}
                    />
                    {openSections.category && (
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label required>Category</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <SearchableSelect
                                                name="category"
                                                value={selectedCategory}
                                                onChange={(e) => {
                                                    setSelectedCategory(e.target.value);
                                                    setSelectedSubCategory("");
                                                }}
                                                options={categories.map((c) => ({
                                                    value: String(c.id),
                                                    label: c.nameEnglish,
                                                }))}
                                                placeholder="Select Category"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setOpenCategory(true)}
                                            className="w-10 h-10 bg-[#084E92] cursor-pointer rounded-lg text-white flex items-center justify-center shrink-0"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label>Sub Category</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <SearchableSelect
                                                name="subCategory"
                                                value={selectedSubCategory}
                                                onChange={(e) => setSelectedSubCategory(e.target.value)}
                                                options={filteredSubCategories.map((s) => ({
                                                    value: String(s.id),
                                                    label: s.name,
                                                }))}
                                                placeholder={
                                                    selectedCategory ? "Select Sub Category" : "First Select Category"
                                                }
                                                disabled={!selectedCategory}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setSubOpenCategory(true)}
                                            className="w-10 h-10 bg-[#084E92] cursor-pointer rounded-lg text-white flex items-center justify-center shrink-0"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* Image Section */}
                <SectionCard className="mt-4">
                    <SectionHeader
                        icon={Image}
                        title="Menu Image"
                        open={openSections.image}
                        onToggle={() => toggleSection("image")}
                    />
                    {openSections.image && (
                        <div className="px-6 py-6">
                            <Label>Upload Image</Label>
                            <input
                                type="file"
                                id="menuImage"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="menuImage"
                                className="border-2 border-dashed border-gray-300 rounded-xl min-h-40 flex items-center justify-center cursor-pointer hover:border-[#084E92]"
                            >
                                {imagePreview ? (
                                    <div className="flex gap-4 items-center p-4">
                                        <img src={imagePreview} className="w-24 h-24 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-medium">{imageFile?.name || "Current Menu Image"}</p>
                                            <p className="text-sm text-gray-400">Click to change image</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <UploadCloud size={40} className="mx-auto text-[#084E92]" />
                                        <p>
                                            Drag your files or <span className="text-[#084E92]">Browse</span>
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>
                    )}
                </SectionCard>

                {/* Additional Details */}
                <SectionCard className="mt-4">
                    <SectionHeader
                        icon={FileText}
                        title="Additional Details"
                        open={openSections.details}
                        onToggle={() => toggleSection("details")}
                    />
                    {openSections.details && (
                        <div className="px-6 py-6 space-y-5">
                            <div>
                                <Label required>Instruction</Label>
                                <textarea
                                    rows={3}
                                    name="instructionEnglish"
                                    value={form.instructionEnglish}
                                    onChange={handleChange}
                                    placeholder="Enter Instruction"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <Label>URL</Label>
                                <input
                                    name="url"
                                    value={form.url}
                                    onChange={handleChange}
                                    placeholder="Insert URL"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <Label>Remarks</Label>
                                <textarea
                                    rows={3}
                                    name="remarks"
                                    value={form.remarks}
                                    onChange={handleChange}
                                    placeholder="Enter Remarks"
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
                        title="Raw Material Items For (100 Pax)"
                        open={openSections.rawMaterial}
                        onToggle={() => toggleSection("rawMaterial")}

                    />

                    {openSections.rawMaterial && (
                        <div className="px-6 py-6">
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
                                                        (item) => String(item.id) === String(rawMaterialId)
                                                    );
                                                    const unitId = material?.unitId;
                                                    setSelectedRawMaterialUnit(unitId ? String(unitId) : "");
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
                                        <button
                                            type="button"
                                            onClick={() => setOpenRawMaterialItem(true)}
                                            className="w-10 h-10 bg-[#084E92] rounded-lg cursor-pointer text-white flex items-center justify-center shrink-0"
                                        >
                                            <Plus size={18} />
                                        </button>
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

                            <div className="flex justify-end mt-4 gap-4">
                                <button
                                    type="button"
                                    onClick={handleAddRawMaterialRow}
                                    className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                >
                                    <Plus size={16} /> {editingRawMaterialRowId ? "Update Recipe" : "Add Recipe"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSyncRawMaterial}
                                    className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                >
                                    <RefreshCw size={16} className={rawMaterialSyncing ? "animate-spin" : ""} /> {rawMaterialSyncing ? "Syncing..." : "Sync Raw Material"}
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

                            <div className="w-full mt-4 border border-[#f1f4ff] rounded-2xl overflow-hidden">
                                <DataGrid
                                    table={rawMaterialTable}
                                    recordCount={filteredRawMaterialRows.length}
                                    className="rounded-2xl"
                                >
                                    {/* Toolbar */}
                                    <div className="flex items-center px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100">
                                        <TableSearchBar
                                            value={rawMaterialTableSearch}
                                            onChange={(val) => {
                                                setRawMaterialTableSearch(val);
                                                setRawMaterialPagination((p) => ({ ...p, pageIndex: 0 }));
                                            }}
                                            placeholder="Search Rawmaterial"
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
                        title="Captain Recipe For (100 Pax)"
                        open={openSections.captainRecipe}
                        onToggle={() => toggleSection("captainRecipe")}
                    />

                    {openSections.captainRecipe && (
                        <div className="px-6 py-6">
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
                                            setSelectedCaptainUnit(recipe?.unitId ? String(recipe.unitId) : "");
                                        }}
                                        options={availableCaptainRecipes.map((r) => {
                                            const editingRow = editingCaptainRowId
                                                ? captainRows.find((row) => row.rowId === editingCaptainRowId)
                                                : null;

                                            // Show the row's own stored name (e.g. copied ingredient "Coriander")
                                            // instead of the catalog recipe name, only for the row being edited.
                                            const label =
                                                editingRow && String(r.id) === String(editingRow.captainRecipeId)
                                                    ? editingRow.name || r.name
                                                    : r.name;

                                            return {
                                                value: String(r.id),
                                                label,
                                            };
                                        })}

                                        selectedLabelFallback={
                                            editingCaptainRowId
                                                ? captainRows.find((r) => r.rowId === editingCaptainRowId)?.name
                                                : ""
                                        }
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
                                        options={filteredCaptainUnits.map((u) => ({
                                            value: String(u.id),
                                            label: u.name,
                                        }))}
                                        selectedLabelFallback={
                                            editingCaptainRowId
                                                ? captainRows.find(
                                                    (r) => r.rowId === editingCaptainRowId
                                                )?.unit
                                                : ""
                                        }
                                        placeholder={
                                            !selectedCaptainRecipe
                                                ? "First Select Captain Recipe"
                                                : filteredCaptainUnits.length
                                                    ? "Select Unit"
                                                    : "No Unit Available"
                                        }
                                        disabled={
                                            !selectedCaptainRecipe ||
                                            filteredCaptainUnits.length === 0
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 mt-4 ">
                                <button
                                    type="button"
                                    onClick={handleAddCaptainRow}
                                    className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-smtext-sm font-medium"
                                >
                                    <Plus size={16} /> {editingCaptainRowId ? "Update Recipe" : "Add Recipe"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSyncCaptainRecipe}
                                    className="flex items-center cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-[#084E92] text-white text-sm font-medium"
                                >
                                    <RefreshCw size={16} /> Sync Captain Recipe
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

                            <div className="w-full mt-4 border border-[#f1f4ff]  rounded-2xl overflow-hidden">
                                <DataGrid
                                    table={captainTable}
                                    recordCount={filteredCaptainRows.length}
                                    className="rounded-2xl"
                                >
                                    {/* Toolbar */}
                                    <div className="flex items-center px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100">
                                        <TableSearchBar
                                            value={captainTableSearch}
                                            onChange={(val) => {
                                                setCaptainTableSearch(val);
                                                setCaptainPagination((p) => ({ ...p, pageIndex: 0 }));
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

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-6 border-t pt-6">
                    <div className="text-sm text-gray-700">
                        <span className="font-semibold">Dish Costing : </span>
                        <span className="text-[#084E92] font-semibold">{dishCost.toFixed(2)}</span>
                        <span className="mx-4" />
                        <span className="font-semibold">Total Rate : </span>
                        <span className="text-[#084E92] font-semibold">{totalRate.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-3">
                        <Link to="/menu-item/menu-items" className="px-10 py-2 cursor-pointer rounded-lg border text-gray-600">
                            Cancel
                        </Link>
                        <button
                            onClick={handleNext}
                            className="px-10 py-2 cursor-pointer rounded-lg border border-[#084E92] text-[#084E92]"
                        >
                            Next
                        </button>
                        <button onClick={handleSave} className="px-10 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white">
                            {isEdit ? "Update" : "Save"}
                        </button>
                    </div>
                </div>

                <CreateMenuCategory
                    open={openCategory}
                    selectedCategory={selectedCategory}
                    onSuccess={async () => {
                        await fetchCategories();
                    }}
                    onClose={() => setOpenCategory(false)}

                />

                <CreateSubCategory
                    open={openSubCategory}
                    onSuccess={async () => {
                        await fetchSubCategories();
                    }}
                    onClose={() => setSubOpenCategory(false)}
                />

                <CopyRecipeModal
                    open={copyRecipeOpen}
                    onClose={() => setCopyRecipeOpen(false)}
                    isCaptainRecipe={isCaptainRecipe}
                    onCopy={handleCopyIngredients}

                />
                <AddRawMaterialItemModal
                    isOpen={openRawMaterialItem}
                    fetchRawMaterialList={fetchRawMaterialCatalog}
                    onClose={() => setOpenRawMaterialItem(false)}
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
export default CreateMenuItem;