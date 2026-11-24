import React, { useEffect, useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import SearchableSelect from "../../../utils/SearchableSelect";
import {
  addRawMaterialItem,
  getAllRawMaterialCategory,
  getAllRawMaterialCategoryType,
  getAllRawMaterialUnits,
} from "../../../services/apiServices";
import { getUserIdFromToken } from "../../../utils/auth";
import { notify } from "@/utils/toast";
import AddRawMaterialModal from "../../raw-material/raw-material-type/AddRawMaterialModal";
import AddRawMaterialCategoryModal from "../../raw-material/row-material-categories/AddRowMaterialCategoryModel";
import AddRawMaterialUnit from "../../raw-material/raw-material-unit-master/AddRawMaterialUnit";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed";

const errorInputCls =
  "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300";

const emptyForm = {
  nameEnglish: "",
  rawMaterialCatTypeId: "",
  rawMaterialCatId: "",
  unitId: "",
};

const QuickAddRawMaterialModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Dropdown options
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // Loaders
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Sub-modals for quick creating Type, Category, Unit
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  const fetchTypes = async (seedType = null) => {
    setLoadingTypes(true);
    try {
      const res = await getAllRawMaterialCategoryType();
      const raw =
        res?.data?.data?.["Raw Material Category Type Details"] ||
        res?.data?.data ||
        [];
      let activeList = Array.isArray(raw)
        ? raw.filter((item) => item.isActive === true)
        : [];
      if (
        seedType?.id != null &&
        !activeList.some((t) => String(t.id) === String(seedType.id))
      ) {
        activeList = [...activeList, { ...seedType, isActive: true }];
      }
      setTypes(activeList);
      return activeList;
    } catch (err) {
      console.error("Failed to load raw material types:", err);
      setTypes([]);
      return [];
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchCategories = async (typeId, seedCategory = null) => {
    if (!typeId) {
      setCategories([]);
      return [];
    }
    setLoadingCategories(true);
    try {
      const res = await getAllRawMaterialCategory(Number(typeId));
      const raw =
        res?.data?.data?.["Raw Material Category Details"] ||
        res?.data?.data ||
        [];
      let activeList = Array.isArray(raw)
        ? raw.filter((item) => item.isActive === true)
        : [];
      if (
        seedCategory?.id != null &&
        !activeList.some((c) => String(c.id) === String(seedCategory.id))
      ) {
        activeList = [...activeList, { ...seedCategory, isActive: true }];
      }
      setCategories(activeList);
      return activeList;
    } catch (err) {
      console.error("Failed to load categories:", err);
      setCategories([]);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchUnits = async (seedUnit = null) => {
    setLoadingUnits(true);
    try {
      const res = await getAllRawMaterialUnits();
      const raw =
        res?.data?.data?.["Unit Details"] ||
        res?.data?.["Unit Details"] ||
        res?.data?.data ||
        [];
      let activeList = Array.isArray(raw)
        ? raw.filter((item) => item.isActive === true)
        : [];
      if (
        seedUnit?.id != null &&
        !activeList.some((u) => String(u.id) === String(seedUnit.id))
      ) {
        activeList = [...activeList, { ...seedUnit, isActive: true }];
      }
      setUnits(activeList);
      return activeList;
    } catch (err) {
      console.error("Failed to load units:", err);
      setUnits([]);
      return [];
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
      fetchTypes();
      fetchUnits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!form.rawMaterialCatTypeId) {
      setCategories([]);
      return;
    }
    fetchCategories(form.rawMaterialCatTypeId);
  }, [form.rawMaterialCatTypeId]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nameEnglish.trim()) {
      newErrors.nameEnglish = "Raw Material Name is required";
    }
    if (!form.rawMaterialCatTypeId) {
      newErrors.rawMaterialCatTypeId = "Raw Material Type is required";
    }
    if (!form.rawMaterialCatId) {
      newErrors.rawMaterialCatId = "Raw Material Category is required";
    }
    if (!form.unitId) {
      newErrors.unitId = "Unit is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("nameEnglish", form.nameEnglish.trim());
      formData.append("rawMaterialCatTypeId", Number(form.rawMaterialCatTypeId));
      formData.append("rawMaterialCatId", Number(form.rawMaterialCatId));
      formData.append("unitId", Number(form.unitId));
      formData.append("isCessApplicable", false);
      formData.append("isUsedBy", false);
      formData.append("isGeneralFix", false);
      formData.append("isApplyCal", false);

      const userId = getUserIdFromToken();
      if (userId) {
        formData.append("userId", userId);
      }

      const res = await addRawMaterialItem(formData);
      notify.success("Raw material created successfully");

      const createdId =
        res?.data?.data?.id ||
        res?.data?.id ||
        (Array.isArray(res?.data?.data) ? res.data.data[0]?.id : null) ||
        null;

      onSuccess?.({
        id: createdId,
        nameEnglish: form.nameEnglish.trim(),
        name: form.nameEnglish.trim(),
        unitId: form.unitId,
        rawMaterialCatTypeId: form.rawMaterialCatTypeId,
        rawMaterialCatId: form.rawMaterialCatId,
      });

      onClose?.();
    } catch (err) {
      console.error("Failed to add raw material:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create raw material. Please try again.";
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-45 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Add New Raw Material
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Mandatory fields required to add material to recipe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4.5">
          {/* Field 1: Raw Material Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Raw Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Tomato / Onion / Sugar"
              className={errors.nameEnglish ? errorInputCls : inputCls}
              value={form.nameEnglish}
              onChange={(e) => handleChange("nameEnglish", e.target.value)}
            />
            {errors.nameEnglish && (
              <p className="text-red-500 text-xs mt-1">{errors.nameEnglish}</p>
            )}
          </div>

          {/* Field 2: Raw Material Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Raw Material Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  name="rawMaterialCatTypeId"
                  value={form.rawMaterialCatTypeId}
                  onChange={(e) => {
                    const typeId = String(e.target.value);
                    handleChange("rawMaterialCatTypeId", typeId);
                    handleChange("rawMaterialCatId", "");
                  }}
                  options={types.map((item) => ({
                    value: String(item.id),
                    label: item.nameEnglish || item.name || `Type #${item.id}`,
                  }))}
                  placeholder={
                    loadingTypes ? "Loading types..." : "Select Type"
                  }
                  hasError={!!errors.rawMaterialCatTypeId}
                  disabled={loadingTypes}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(true)}
                className="w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#084E92] shrink-0 transition cursor-pointer"
                title="Add New Material Type"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {errors.rawMaterialCatTypeId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.rawMaterialCatTypeId}
              </p>
            )}
          </div>

          {/* Field 3: Raw Material Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Raw Material Category <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  name="rawMaterialCatId"
                  value={form.rawMaterialCatId}
                  onChange={(e) =>
                    handleChange("rawMaterialCatId", String(e.target.value))
                  }
                  options={categories.map((item) => ({
                    value: String(item.id),
                    label: item.nameEnglish || item.name || `Category #${item.id}`,
                  }))}
                  placeholder={
                    !form.rawMaterialCatTypeId
                      ? "Select type first"
                      : loadingCategories
                      ? "Loading categories..."
                      : "Select Category"
                  }
                  hasError={!!errors.rawMaterialCatId}
                  disabled={!form.rawMaterialCatTypeId || loadingCategories}
                />
              </div>
              <button
                type="button"
                disabled={!form.rawMaterialCatTypeId}
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#084E92] shrink-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add New Category"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {errors.rawMaterialCatId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.rawMaterialCatId}
              </p>
            )}
          </div>

          {/* Field 4: Unit */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Unit <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  name="unitId"
                  value={form.unitId}
                  onChange={(e) => handleChange("unitId", String(e.target.value))}
                  options={units.map((item) => ({
                    value: String(item.id),
                    label: item.nameEnglish || item.unitName || item.name || `Unit #${item.id}`,
                  }))}
                  placeholder={
                    loadingUnits ? "Loading units..." : "Select Unit"
                  }
                  hasError={!!errors.unitId}
                  disabled={loadingUnits}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(true)}
                className="w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#084E92] shrink-0 transition cursor-pointer"
                title="Add New Unit"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {errors.unitId && (
              <p className="text-red-500 text-xs mt-1">{errors.unitId}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#084E92] hover:bg-[#063b6f] text-white text-sm font-medium transition cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save Material"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Nested helper modals for Type, Category, Unit */}
      {isTypeModalOpen && (
        <AddRawMaterialModal
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
          onSaved={async () => {
            const updated = await fetchTypes();
            if (updated.length > 0) {
              const latest = updated[updated.length - 1];
              if (latest?.id) {
                handleChange("rawMaterialCatTypeId", String(latest.id));
                handleChange("rawMaterialCatId", "");
                fetchCategories(latest.id);
              }
            }
          }}
        />
      )}

      {isCategoryModalOpen && (
        <AddRawMaterialCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          initialData={
            form.rawMaterialCatTypeId
              ? { rawMaterialCatTypeId: form.rawMaterialCatTypeId }
              : undefined
          }
          onSaved={async () => {
            if (form.rawMaterialCatTypeId) {
              const updated = await fetchCategories(form.rawMaterialCatTypeId);
              if (updated.length > 0) {
                const latest = updated[updated.length - 1];
                if (latest?.id) {
                  handleChange("rawMaterialCatId", String(latest.id));
                }
              }
            }
          }}
        />
      )}

      {isUnitModalOpen && (
        <AddRawMaterialUnit
          isOpen={isUnitModalOpen}
          onClose={() => setIsUnitModalOpen(false)}
          onSaved={async () => {
            const updated = await fetchUnits();
            if (updated.length > 0) {
              const latest = updated[updated.length - 1];
              if (latest?.id) {
                handleChange("unitId", String(latest.id));
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default QuickAddRawMaterialModal;
