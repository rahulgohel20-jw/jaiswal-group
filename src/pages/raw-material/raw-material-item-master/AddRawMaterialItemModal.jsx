import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  addRawMaterialItem,
  getAllActiveVendors,
  getAllRawMaterialCategory,
  getAllRawMaterialUnits,
  getAllSubCategoryByCategoryId,
  getRawMaterialCategoryBrandsByCategoryId,
  updateRawMaterialItem,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';
import AddRawMaterialBrand from '../raw-material-brand-master/AddRawMaterialBrand';
import AddRawMaterialUnit from '../raw-material-unit-master/AddRawMaterialUnit';
import AddRawMaterialCategoryModal from '../row-material-categories/AddRowMaterialCategoryModel';
import SearchableSelect from '../../../utils/SearchableSelect';
import AddRawMaterialSubCategoryModal from '../raw-material-subcategory/AddRawMaterialSubCategoryModal';

const getLatestImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }

  return [...images]
    .sort((a, b) => Number(b.id) - Number(a.id))[0]?.path || "";
};

const emptyForm = {
  nameEnglish: '',
  rawMaterialCatId: '',
  rawMaterialSubCatId: '',
  status: 'Active',
  unitId: '',
  brandId: '',
  supplierRate: '',
  dailyConsumption: '',
  opbStock: '',
  minStock: '',
  minOrder: '',
  sequence: '',
  weightPer100Pax: '',
  hsnCode: '',
  tax: '',
  cess: '',
  isGeneralFix: false,
  isApplyCal: false,
  file: null,
  imageUrl: '',
};

const formatDateForBackend = (dateStr) => {
  if (!dateStr) return '';

  // input[type="date"] gives yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Already dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  return '';
};
const formatDateToInputValue = (dateStr) => {
  if (!dateStr) return '';

  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // dd/MM/yyyy or dd-MM-yyyy
  const parts = dateStr.split(/[-/]/);

  if (parts.length !== 3) return '';

  const [day, month, year] = parts;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/* -------------------------------------------------------------------------
 * Normalization helpers
 * The "edit an existing item" path (data from getRawMaterialById) and the
 * "just created via the + modal" path (data from onSaved(createdRecord))
 * don't necessarily share the same shape — one may be a flat id+name pair,
 * the other a nested object. These helpers coerce either into a single
 * {id, nameEnglish} / {id, name} shape so the rest of the component doesn't
 * need to care which source it came from.
 * ---------------------------------------------------------------------- */

const pickDefined = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== '');

const normalizeCategory = (data) => {
  if (!data) return null;
  const id = pickDefined(
    data.rawMaterialCatId,
    data.rawMaterialCat?.id,
    data.rawMaterialCategory?.id,
    data.categoryId,
    data.id,
  );
  if (id == null || id === '') return null;
  const name =
    data.rawMaterialCat?.nameEnglish ||
    data.rawMaterialCategory?.nameEnglish ||
    data.rawMaterialCategoryName ||
    data.categoryName ||
    data.nameEnglish ||
    '';
  return { id, nameEnglish: name };
};

const normalizeSubCategory = (data) => {
  if (!data) return null;
  const rawSubCat = data.subCategoryId;
  const id = pickDefined(
    typeof rawSubCat === 'object' ? rawSubCat?.id : rawSubCat,
    data.subCategory?.id,
  );
  if (id == null || id === '') return null;
  const name =
    data.subCategoryName ||
    data.subCategory?.nameEnglish ||
    (typeof rawSubCat === 'object' ? rawSubCat?.nameEnglish : '') ||
    data.nameEnglish ||
    '';
  return { id, nameEnglish: name };
};

const normalizeUnit = (data) => {
  if (!data) return null;
  const id = pickDefined(data.unitId, data.unit?.id, data.id);
  if (id == null || id === '') return null;
  const name = data.unit?.nameEnglish || data.unitName || data.nameEnglish || '';
  return { id, nameEnglish: name };
};

// Brand list now comes from getAllActiveRawMaterialBrand, which returns
// { id, name, description, active, ... } — not nested under a "brand" key.
const normalizeBrand = (data) => {
  if (!data) return null;
  const id = pickDefined(data.brandId, data.brand?.id, data.id);
  if (id == null || id === '') return null;
  const name = data.brandName || data.brand?.name || data.name || '';
  return { id, name };
};

const AddRawMaterialItemModal = ({
  isOpen,
  onClose,
  editData = null,
  isViewOnly = false,
  fetchRawMaterialList,
  fetchStats,
}) => {
  const [isFixedRawMaterial, setIsFixedRawMaterial] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [supplierOptions, setSupplierOptions] = useState([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
  const [supplierRows, setSupplierRows] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [brands, setBrands] = useState([]);
  const [errors, setErrors] = useState({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    setSubCategories([]);
    setIsFixedRawMaterial(false);
    setSelectedSupplierIds([]);
    setSupplierRows([]);
    setSupplierSearch('');
    onClose();
  };
  const validate = () => {
    const newErrors = {};

    if (!form.nameEnglish.trim()) {
      newErrors.nameEnglish = 'Raw Material Name is required';
    }

    if (!form.rawMaterialCatId) {
      newErrors.rawMaterialCatId = 'Raw Material Category is required';
    }

    if (!form.unitId) {
      newErrors.unitId = 'Unit is required';
    }

    if (form.supplierRate !== '' && Number(form.supplierRate) < 0) {
      newErrors.supplierRate = 'Rate must be positive';
    }
    if (form.opbStock && Number(form.opbStock) < 0) {
      newErrors.opbStock = 'Opening balance must be positive';
    }
    if (form.minStock && Number(form.minStock) < 0) {
      newErrors.minStock = 'Minstock must be positive';
    }

    // Daily Consumption validation
    if (form.dailyConsumption !== '' && Number(form.dailyConsumption) < 0) {
      newErrors.dailyConsumption = 'Daily Consumption must be positive';
    }
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const fetchUnits = async (editUnit = null) => {
    try {
      const res = await getAllRawMaterialUnits();
      const unitData =
        res?.data?.data?.['Unit Details'] || res?.data?.data || [];

      let activeList = unitData.filter((item) => item.isActive === true);

      if (
        editUnit?.id != null &&
        !activeList.some((u) => String(u.id) === String(editUnit.id))
      ) {
        activeList = [...activeList, { ...editUnit, isActive: true }];
      }

      setUnits(activeList);
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  const fetchCategories = async (editCategory = null) => {
    try {
      const res = await getAllRawMaterialCategory();
      const categoryData =
        res?.data?.data?.['Raw Material Category Details'] ||
        res?.data?.data ||
        [];

      let activeList = categoryData.filter((item) => item.isActive === true);

      if (
        editCategory?.id != null &&
        !activeList.some((c) => String(c.id) === String(editCategory.id))
      ) {
        activeList = [...activeList, { ...editCategory, isActive: true }];
      }

      setCategories(activeList);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchSubCategoriesForCategory = async (
    categoryId,
    editSubCategory = null,
  ) => {
    if (!categoryId) {
      setSubCategories([]);
      return [];
    }

    setLoadingSubCategories(true);

    try {
      const res = await getAllSubCategoryByCategoryId(categoryId);

      const subCategoryData = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || [];

      let activeList = subCategoryData.filter(
        (item) => item.isActive === true
      );

      // If edit mode has an existing subcategory,
      // make sure it exists in the dropdown.
      if (
        editSubCategory?.id != null &&
        !activeList.some(
          (s) => String(s.id) === String(editSubCategory.id)
        )
      ) {
        activeList = [...activeList, editSubCategory];
      }

      setSubCategories(activeList);

      return activeList;
    } catch (err) {
      console.error('Failed to load sub-categories:', err);
      setSubCategories([]);
      return [];
    } finally {
      setLoadingSubCategories(false);
    }
  };
  // Brands are now a flat, independent list (getAllActiveRawMaterialBrand) —
  // not scoped to the selected category. editBrand: normalized {id, name},
  // merged in so an existing selection still shows even if it's since gone
  // inactive.
  const fetchBrands = async (categoryId, editBrand = null) => {
    if (!categoryId) {
      setBrands([]);
      return;
    }
    try {
      const res = await getRawMaterialCategoryBrandsByCategoryId(categoryId);
      const brandData = res?.data?.data?.['Raw Material Brand Details'] || [];
      let brandList = brandData.map((item) => ({
        id: item.brandId,
        name: item.brandName,
      }));


      if (
        editBrand?.id != null &&
        !brandList.some((b) => String(b.id) === String(editBrand.id))
      ) {
        brandList = [...brandList, { id: editBrand.id, name: editBrand.name, },];
      }

      setBrands(brandList);
      return brandList;
    } catch (err) {
      console.error('Failed to load brands:', err);
      setBrands([]);
      return [];
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await getAllActiveVendors();
      const supplierData = res?.data?.data || [];

      setSupplierOptions(supplierData);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnits(normalizeUnit(editData));
      fetchCategories(normalizeCategory(editData));
      fetchSuppliers();
    }
  }, [isOpen, editData]);

  // Sub-categories are still scoped to the selected category, so keep
  // refetching them whenever it changes (including when the form is first
  // populated from editData, since that sets rawMaterialCatId too).
  useEffect(() => {
    if (!isOpen || !form.rawMaterialCatId) {
      setSubCategories([]);
      return;
    }
    const currentCategoryId = String(form.rawMaterialCatId);
    // Only use the edit subcategory when the current category
    // is still the original category.
    const originalCategory = normalizeCategory(editData);

    const editSubCategory =
      originalCategory?.id != null &&
        String(originalCategory.id) === currentCategoryId
        ? normalizeSubCategory(editData)
        : null;

    fetchSubCategoriesForCategory(currentCategoryId, editSubCategory);
  }, [isOpen, form.rawMaterialCatId, editData?.id,]);


  // Same clearing behavior for sub-category.
  useEffect(() => {
    if (loadingSubCategories || !form.rawMaterialSubCatId) {
      return;
    }

    const stillValid = subCategories.some((s) =>
      String(s.id) === String(form.rawMaterialSubCatId)
    );

    if (!stillValid) {
      set('rawMaterialSubCatId', '');
    }
  }, [
    subCategories,
    loadingSubCategories,
    form.rawMaterialSubCatId,
  ]);

  const userId = getUserIdFromToken();

  const imageRef = useRef(null);
  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: '',
    }));
  };
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    set('file', file);
  };
  const imagePreview = form.file
    ? URL.createObjectURL(form.file)
    : form.imageUrl;

  // Toggles a supplier's checked state inside the multi-select dropdown.
  const toggleSupplierSelection = (supplierId) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId],
    );
  };

  const handleAddSupplier = () => {
    if (selectedSupplierIds.length === 0) return;

    setSupplierRows((prev) => {
      const existingIds = new Set(prev.map((row) => String(row.supplierId)));
      const newRows = selectedSupplierIds
        .filter((id) => !existingIds.has(String(id)))
        .map((id) => {
          const supplier = supplierOptions.find(
            (s) => String(s.id) === String(id),
          );
          return {
            supplierId: id,
            name: supplier?.fullName || supplier?.name || 'Unknown Supplier',
            from: '',
            to: '',
            price: '',
          };
        });

      return [...prev, ...newRows];
    });

    setSelectedSupplierIds([]);
    setSupplierSearch('');
    setSupplierDropdownOpen(false);
  };

  const updateSupplierRow = (supplierId, field, value) => {
    setSupplierRows((prev) =>
      prev.map((row) =>
        row.supplierId === supplierId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const removeSupplierRow = (supplierId) => {
    setSupplierRows((prev) =>
      prev.filter((row) => row.supplierId !== supplierId),
    );
  };
  useEffect(() => {
    const loadEditData = async () => {
      if (!editData) {
        setForm(emptyForm);
        setIsFixedRawMaterial(false);
        setSupplierRows([]);
        setSubCategories([]);
        return;
      }

      const category = normalizeCategory(editData);
      const subCategory = normalizeSubCategory(editData);
      const unit = normalizeUnit(editData);
      const brand = normalizeBrand(editData);
      const latestImage = getLatestImage(editData.images);

      const categoryId = String(category?.id ?? '');
      const subCategoryId = String(subCategory?.id ?? '');

      // First set form WITHOUT subcategory
      setForm({
        nameEnglish: editData.nameEnglish || '',
        rawMaterialCatId: categoryId,
        rawMaterialSubCatId: '',
        unitId: String(unit?.id ?? ''),
        brandId: '',
        supplierRate: editData.supplierRate ?? '',
        status: editData.isActive ? 'Active' : 'Inactive',
        dailyConsumption: editData.dailyConsumption ?? '',
        opbStock: editData.opbStock ?? '',
        minStock: editData.minStock ?? '',
        minOrder: editData.minOrder ?? '',
        sequence: editData.sequence ?? '',
        weightPer100Pax: editData.weightPer100Pax ?? '',
        hsnCode: editData.hsnCode ?? '',
        tax: editData.tax ?? '',
        cess: editData.cess ?? '',
        isGeneralFix: editData.isGeneralFix ?? false,
        isApplyCal: editData.isApplyCal ?? false,
        file: null,
        imageUrl: latestImage,
      });

      setIsFixedRawMaterial(editData.isGeneralFix ?? false);

      // Load subcategories first
      if (category?.id != null) {
        const loadedSubCategories =
          await fetchSubCategoriesForCategory(
            category.id,
            subCategory
          );

        // Now select existing subcategory
        if (
          subCategory?.id != null &&
          loadedSubCategories.some(
            (item) => String(item.id) === String(subCategory.id)
          )
        ) {
          setForm((prev) => ({
            ...prev,
            rawMaterialSubCatId: subCategoryId,
          }));
        }

        const loadedBrands = await fetchBrands(category.id, brand);

        if (brand?.id != null) {
          const brandExists = loadedBrands.some(
            (b) => String(b.id) === String(brand.id)
          );

          if (brandExists) {
            setForm((prev) => ({
              ...prev,
              brandId: String(brand.id),
            }));
          }
        }
      }

      const vendorList =
        editData.vendorPriceConfigs || editData.suppliers;

      if (Array.isArray(vendorList)) {
        setSupplierRows(
          vendorList.map((s) => ({
            id: s.id,
            supplierId: s.vendorId ?? s.supplierId ?? s.id,
            name:
              s.vendorName ||
              s.fullName ||
              s.name ||
              'Unknown Supplier',
            from: formatDateToInputValue(
              s.fromDate || s.from || ''
            ),
            to: formatDateToInputValue(
              s.toDate || s.to || ''
            ),
            price: s.price ?? '',
          }))
        );
      } else {
        setSupplierRows([]);
      }
    };
    loadEditData();
  }, [editData?.id]);

  // ---- Handlers for the "+" quick-add modals ----
  // Refetch the relevant list AND merge/select the newly created record so
  // it shows up in its dropdown immediately, without needing to reopen the
  // modal. Assumes each child modal's onSaved(createdRecord) passes back the
  // record it just created.

  const handleCategorySaved = async (newCategory) => {
    const normalized = normalizeCategory(newCategory) || newCategory;
    await fetchCategories(normalized || null);
    if (normalized?.id != null) {
      set('rawMaterialCatId', String(normalized.id));
      set('rawMaterialSubCatId', ''); // subcategories don't carry over to a new category
    }
  };

  const handleUnitSaved = async (newUnit) => {
    const normalized = normalizeUnit(newUnit) || newUnit;
    await fetchUnits(normalized || null);
    if (normalized?.id != null) {
      set('unitId', String(normalized.id));
    }
  };

  const handleBrandSaved = async (newBrand) => {
    const normalized = normalizeBrand(newBrand) || newBrand;
    if (form.rawMaterialCatId) {
      await fetchBrands(form.rawMaterialCatId, normalized);
    }

    if (normalized?.id != null) {
      set('brandId', String(normalized.id));
    }
  };

  const handleSubCategorySaved = async (newSubCategory) => {
    const normalized = normalizeSubCategory(newSubCategory) || newSubCategory;
    await fetchSubCategoriesForCategory(form.rawMaterialCatId, normalized || null);
    if (normalized?.id != null) {
      set('rawMaterialSubCatId', String(normalized.id));
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const formData = new FormData();

      formData.append('nameEnglish', form.nameEnglish);
      formData.append('rawMaterialCatId', Number(form.rawMaterialCatId));
      if (form.rawMaterialSubCatId !== '') {
        formData.append('subCategoryId', Number(form.rawMaterialSubCatId));
      }
      formData.append('unitId', Number(form.unitId));
      if (form.brandId !== '') {
        formData.append('brandId', Number(form.brandId));
      }

      formData.append('supplierRate', form.supplierRate);
      formData.append('dailyConsumption', form.dailyConsumption);

      if (form.minStock !== '') {
        formData.append('minStock', Number(form.minStock));
      }

      if (form.sequence !== '') {
        formData.append('sequence', Number(form.sequence));
      }

      if (form.weightPer100Pax !== '') {
        formData.append('weightPer100Pax', Number(form.weightPer100Pax));
      }

      if (form.opbStock !== '') {
        formData.append('opbStock', Number(form.opbStock));
      }

      if (form.hsnCode !== '') {
        formData.append('hsnCode', form.hsnCode);
      }
      if (form.tax !== '' && form.tax !== null && form.tax !== undefined) {
        formData.append('tax', Number(form.tax));
      }
      if (form.cess !== '' && form.cess !== null && form.cess !== undefined) {
        formData.append('cess', Number(form.cess));
      }

      formData.append('isGeneralFix', form.isGeneralFix);
      formData.append('isApplyCal', form.isApplyCal);
      formData.append('userId', userId);

      supplierRows.forEach((row, index) => {
        if (row.from) {
          formData.append(
            `vendorPriceConfigs[${index}].fromDate`,
            formatDateForBackend(row.from),
          );
        }
        if (row.to) {
          formData.append(
            `vendorPriceConfigs[${index}].toDate`,
            formatDateForBackend(row.to),
          );
        }
        if (row.price !== '') {
          formData.append(`vendorPriceConfigs[${index}].price`, row.price);
        }
        if (row.supplierId) {
          formData.append(
            `vendorPriceConfigs[${index}].vendorId`,
            row.supplierId,
          );
        }
        if (row.id) {
          formData.append(`vendorPriceConfigs[${index}].id`, row.id);
        }
      });
      if (form.file) {
        formData.append('file', form.file);
      }
      if (editData?.id) {
        formData.append('id', editData.id);
        await updateRawMaterialItem(formData);
      } else {
        await addRawMaterialItem(formData);
      }

      await fetchRawMaterialList?.();
      await fetchStats?.();
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };
  if (!isOpen) return null;

  const filteredSuppliers = supplierOptions
    .filter(
      (item) =>
        !supplierRows.some((row) => String(row.supplierId) === String(item.id)),
    )
    .filter((item) =>
      (item.fullName || item.name || '')
        .toLowerCase()
        .includes(supplierSearch.trim().toLowerCase()),
    );

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-8">
      <div className="bg-white w-full max-w-3xl h-[95vh] sm:h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}

        <div className="flex justify-between items-center p-5 border-b border-[#C3C6D1]">
          <div className="flex gap-2 items-center">
            <div className="w-10 h-10 bg-[#00376C] text-[#7CA2DD] flex items-center justify-center rounded-xl">
              <PackagePlus />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#00376C]">
                {isViewOnly
                  ? 'View Raw Material Item'
                  : editData
                  ? 'Edit Raw Material Item'
                  : 'Add New Raw Material Item'}
              </h2>

              <p className="text-xs text-gray-500">
                {isViewOnly
                  ? 'View material properties and supplier associations'
                  : editData
                  ? 'Update material properties and supplier associations'
                  : 'Configure material properties and supplier associations'}
              </p>
            </div>
          </div>

          <button onClick={handleClose} className="cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Row 1 */}

          <div className="grid grid-cols-1">
            <div>
              <label className="text-sm font-medium">
                Raw Material Name
                <span className="text-red-500">*</span>
              </label>

              <Input
                placeholder="e.g. High-Grade Aluminum Ingots"
                className="mt-1"
                value={form.nameEnglish}
                onChange={(e) => set('nameEnglish', e.target.value)}
              />
              {errors.nameEnglish && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.nameEnglish}
                </p>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">
                Raw Material Category
                <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1 min-w-0 [&_input]:h-9!">
                  <SearchableSelect
                    name="rawMaterialCatId"
                    value={form.rawMaterialCatId}
                    onChange={(e) => {
                      const categoryId = String(e.target.value);
                      set('rawMaterialCatId', categoryId);
                      set('rawMaterialSubCatId', '');
                      set('brandId', '');

                      // Fetch brands for selected category
                      fetchBrands(categoryId);
                    }}
                    options={categories.map((item) => ({
                      value: String(item.id),
                      label: item.nameEnglish,
                    }))}
                    placeholder="Select Category"
                    error={!!errors.rawMaterialCatId}
                  />
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
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
            <div>
              <label className="text-sm font-medium">
                Raw Material Sub Category
              </label>

              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1 min-w-0 [&_input]:h-9!">
                  <SearchableSelect
                    name="rawMaterialSubCatId"
                    value={form.rawMaterialSubCatId}
                    onChange={(e) =>
                      set('rawMaterialSubCatId', String(e.target.value))
                    }
                    options={subCategories.map((item) => ({
                      value: String(item.id),
                      label: item.nameEnglish,
                    }))}
                    placeholder={
                      !form.rawMaterialCatId
                        ? 'Select a category first'
                        : loadingSubCategories
                          ? 'Loading...'
                          : 'Select Sub Category'
                    }
                    disabled={!form.rawMaterialCatId || loadingSubCategories}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubCategoryModalOpen(true)}
                  className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
                  title="Add New Category"
                >
                  <Plus className="h-4 w-4" />
                </button>

              </div>
              {errors.rawMaterialSubCatId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.rawMaterialSubCatId}
                </p>
              )}
            </div>

          </div>

          {/* Row 2 */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">
                Unit
                <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1 min-w-0 [&_input]:h-9!">
                  <SearchableSelect
                    name="unitId"
                    value={form.unitId}
                    onChange={(e) => set('unitId', String(e.target.value))}
                    options={units.map((item) => ({
                      value: String(item.id),
                      label: item.nameEnglish,
                    }))}
                    placeholder="Select Unit"
                    error={!!errors.unitId}
                  />
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
                  title="Add New Unit"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {errors.unitId && (
                <p className="text-red-500 text-xs mt-1">{errors.unitId}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Brand</label>

              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1 min-w-0 [&_input]:h-9!">
                  <SearchableSelect
                    name="brandId"
                    value={form.brandId}
                    onChange={(e) => set('brandId', String(e.target.value))}
                    options={brands.map((item) => ({
                      value: String(item.id),
                      label: item.name,
                    }))}
                    placeholder="Select Brand"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
                  title="Add New Brand"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 3 */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">Rate (Per Unit)</label>

              <Input
                type="number"
                placeholder="₹ 0.00"
                className="mt-1"
                value={form.supplierRate}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => set('supplierRate', e.target.value)}
              />
              {errors.supplierRate && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.supplierRate}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Daily Consumption</label>

              <Input
                type="number"
                placeholder="0"
                className="mt-1"
                value={form.dailyConsumption}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => set('dailyConsumption', e.target.value)}
              />
              {errors.dailyConsumption && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.dailyConsumption}
                </p>
              )}
            </div>
          </div>

          {/* Row 4 */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">Opening Balance</label>

              <Input
                type="number"
                placeholder="0"
                className="mt-1"
                value={form.opbStock}
                onChange={(e) => set('opbStock', e.target.value)}
              />
              {errors.opbStock && (
                <p className="text-red-500 text-xs mt-1">{errors.opbStock}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Minimum Stock</label>

              <Input
                type="number"
                value={form.minStock}
                className="mt-1"
                onChange={(e) => set('minStock', e.target.value)}
              />
              {errors.minStock && (
                <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>
              )}
            </div>
          </div>

          {/* Row 5 - Tax & HSN Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">HSN / SAC Code</label>
              <Input
                type="text"
                placeholder="e.g. 1901"
                className="mt-1"
                value={form.hsnCode}
                onChange={(e) => set('hsnCode', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tax (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0 %"
                className="mt-1"
                value={form.tax}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => set('tax', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cess (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0 %"
                className="mt-1"
                value={form.cess}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => set('cess', e.target.value)}
              />
            </div>
          </div>

          {/* Upload */}

          <div className="col-span-full">
            <label className="text-sm font-medium">Raw Material Image</label>

            <div
              onClick={() => imageRef.current?.click()}
              className="mt-2 border-2 border-dashed border-[#C3C6D199] bg-gray-50 rounded-xl h-52 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {form.file ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-28 h-28 rounded-lg object-cover"
                  />

                  <span className="text-sm text-gray-600">
                    {form.file.name}
                  </span>
                </div>
              ) : form.imageUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Existing Raw Material"
                    className="w-28 h-28 rounded-lg object-cover"
                  />
                  <span className="text-sm text-gray-600">
                    Existing Image
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#DEE9FC] flex items-center justify-center">
                    <UploadCloud className="h-7 w-7 text-primary" />
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    Click or drag and drop to upload
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG or WEBP (Max. 5MB)
                  </p>
                </>
              )}
            </div>

            <input
              ref={imageRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          {/* Toggle Card */}
          <div className="mt-6 bg-[#EEF4FF] border border-[#C3C6D1] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">General Fix Raw Material</h4>

                <p className="text-xs text-gray-500">
                  Enable for standardized consumption items
                </p>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsFixedRawMaterial(!isFixedRawMaterial);
                  set('isGeneralFix', !isFixedRawMaterial);
                }}
                className={`w-12 h-6 rounded-full cursor-pointer flex items-center transition-all duration-300 p-1 ${isFixedRawMaterial ? 'bg-[#00376C]' : 'bg-gray-300'}`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${isFixedRawMaterial ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {isFixedRawMaterial && (
              <div className="mt-4">
                <label className="text-sm">Weight Per 100 Person</label>

                <input
                  value={form.weightPer100Pax}
                  onChange={(e) => set('weightPer100Pax', e.target.value)}
                  type="number"
                  placeholder="Enter weight"
                  className="w-full mt-2 border rounded-lg px-3 py-2 outline-none bg-[#FFFFFF]"
                />
              </div>
            )}
          </div>

          {/* Supplier Section */}

          <div className="mt-8">
            <h3 className="font-semibold text-[#00376C] mb-4">
              Vendor Association
            </h3>

            <div className="flex gap-3 w-full justify-between flex-col sm:flex-row">
              <div className="flex-1 min-w-0">
                <Popover
                  open={supplierDropdownOpen}
                  onOpenChange={setSupplierDropdownOpen}
                  modal={false}
                >
                  <PopoverTrigger asChild>
                    <div className="flex gap-2 bg-[#EBEDF0] w-full items-center px-3 border rounded-lg cursor-pointer">
                      <Search className="text-[#94A3B8]" size={20} />
                      <input
                        type="text"
                        value={supplierSearch}
                        placeholder={
                          selectedSupplierIds.length > 0
                            ? `${selectedSupplierIds.length} vendor${selectedSupplierIds.length > 1 ? 's' : ''} selected`
                            : 'Search and select vendor...'
                        }
                        onClick={() => setSupplierDropdownOpen(true)}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          setSupplierDropdownOpen(true);
                        }}
                        className="flex-1 bg-transparent px-3 py-2 outline-none"
                      />
                    </div>
                  </PopoverTrigger>

                  <PopoverContent
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
                  >
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSuppliers.map((item) => {
                        const isChecked = selectedSupplierIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggleSupplierSelection(item.id)}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${isChecked
                              ? 'bg-blue-50 text-primary font-medium'
                              : 'text-gray-700'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="pointer-events-none"
                            />
                            {item.fullName || item.name}
                          </button>
                        );
                      })}

                      {filteredSuppliers.length === 0 && (
                        <div className="px-3 py-3 text-sm text-gray-500">
                          No vendor found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <button
                onClick={handleAddSupplier}
                disabled={selectedSupplierIds.length === 0}
                className="bg-[#00376C] text-white px-5 py-3 text-sm rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Users size={16} />
                Add Vendor
              </button>
            </div>

            <div className="border rounded-xl min-h-40 mt-4 overflow-hidden">
              {supplierRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#EEF4FF] text-[#00376C]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">
                          Vendor Name
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium">
                          From
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium">
                          To
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium">
                          Price
                        </th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {supplierRows.map((row) => (
                        <tr key={row.supplierId} className="border-t">
                          <td className="px-4 py-2">{row.name}</td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={row.from}
                              onChange={(e) =>
                                updateSupplierRow(
                                  row.supplierId,
                                  'from',
                                  e.target.value,
                                )
                              }
                              className="w-full border rounded-md px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={row.to}
                              onChange={(e) =>
                                updateSupplierRow(
                                  row.supplierId,
                                  'to',
                                  e.target.value,
                                )
                              }
                              className="w-full border rounded-md px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={row.price}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) =>
                                updateSupplierRow(
                                  row.supplierId,
                                  'price',
                                  e.target.value,
                                )
                              }
                              placeholder="₹ 0.00"
                              className="w-full border rounded-md px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeSupplierRow(row.supplierId)}
                              className="text-gray-400 hover:text-red-500 cursor-pointer"
                              title="Remove vendor"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-32 flex flex-col justify-center items-center p-4">
                  <h4 className="font-semibold text-[#00376C]">
                    No vendors linked yet
                  </h4>
                  <p className="text-sm text-gray-500 text-center">
                    Link vendors to this material to automate procurement
                    workflows.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}

        <div className="border-t p-5 flex justify-end bg-[#EFF4FF] border border-[#C3C6D1] flex-col sm:flex-row gap-4">
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="border border-[#00376C] text-[#00376C] px-5 py-2 rounded-lg cursor-pointer hover:bg-blue-50"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>

            {!isViewOnly && (
              <button
                onClick={handleSave}
                className="bg-[#00376C] text-white px-5 py-2 rounded-lg cursor-pointer hover:bg-[#002750]"
              >
                {editData ? 'Update Material' : 'Save Material'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isCategoryModalOpen && (
        <AddRawMaterialCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSaved={handleCategorySaved}
        />
      )}

      {isUnitModalOpen && (
        <AddRawMaterialUnit
          isOpen={isUnitModalOpen}
          onClose={() => setIsUnitModalOpen(false)}
          onSaved={handleUnitSaved}
        />
      )}
      {isBrandModalOpen && (
        <AddRawMaterialBrand
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          onSaved={handleBrandSaved}
        />
      )}
      {isSubCategoryModalOpen && (
        <AddRawMaterialSubCategoryModal
          isOpen={isSubCategoryModalOpen}
          onClose={() => setIsSubCategoryModalOpen(false)}
          onSaved={handleSubCategorySaved}
        />
      )}
    </div>
  );
};

export default AddRawMaterialItemModal;