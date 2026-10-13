import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import {
  ArrowLeft,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  addRawMaterialItem,
  getAllRawMaterialCategory,
  getAllRawMaterialCategoryType,
  getAllRawMaterialUnits,
  getAllSubCategoryByCategoryId,
  getRawMaterialCategoryBrandsByCategoryId,
  getRawMaterialById,
  updateRawMaterialItem,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';
import AddRawMaterialBrand from '../raw-material-brand-master/AddRawMaterialBrand';
import AddRawMaterialUnit from '../raw-material-unit-master/AddRawMaterialUnit';
import AddRawMaterialCategoryModal from '../row-material-categories/AddRowMaterialCategoryModel';
import SearchableSelect from '../../../utils/SearchableSelect';
import AddRawMaterialSubCategoryModal from '../raw-material-subcategory/AddRawMaterialSubCategoryModal';
import AddRawMaterialModal from '../raw-material-type/AddRawMaterialModal';

const getLatestImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return "";
  return [...images].sort((a, b) => Number(b.id) - Number(a.id))[0]?.path || "";
};

const emptyForm = {
  nameEnglish: '',
  rawMaterialCatTypeId: '',
  rawMaterialCatId: '',
  rawMaterialSubCatId: '',
  status: 'Active',
  unitId: '',
  brandId: '',
  supplierRate: '',
  dailyConsumption: '',
  opbStock: '',
  minStock: '',
  maxStock: '',
  minOrder: '',
  sequence: '',
  weightPer100Pax: '',
  hsnCode: '',
  tax: '',
  isCessApplicable: false,
  isUsedBy: false,
  isGeneralFix: false,
  isApplyCal: false,
  file: null,
  imageUrl: '',
};

const pickDefined = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

const normalizeType = (data) => {
  if (!data) return null;
  const rawCat = data.rawMaterialCat || data.rawMaterialCategory;
  const rawType = rawCat?.rawMaterialCatType || data.rawMaterialCatType || data.categoryType;
  const id = pickDefined(
    typeof rawType === 'object' ? rawType?.id : rawType,
    data.rawMaterialCatTypeId,
    data.categoryTypeId
  );
  if (id == null || id === '') return null;
  const name =
    (typeof rawType === 'object' ? rawType?.nameEnglish : '') ||
    data.categoryTypeName ||
    data.typeName ||
    '';
  return { id, nameEnglish: name };
};

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

const normalizeBrand = (data) => {
  if (!data) return null;
  const id = pickDefined(data.brandId, data.brand?.id);
  if (id == null || id === '') return null;
  const name = data.brandName || data.brand?.name || data.name || '';
  return { id, name };
};

const blurOnWheel = (e) => e.currentTarget.blur();

const SmallToggle = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    disabled={disabled}
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 p-0.5 shrink-0 ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${checked ? 'bg-[#00376C]' : 'bg-gray-300'}`}
  >
    <span
      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${
        checked ? 'translate-x-4' : 'translate-x-0'
        }`}
    />
  </button>
);

const AddRawMaterialItemModal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isViewOnly = location.pathname.includes('/view/');

  const [editData, setEditData] = useState(null);
  const [loadingItem, setLoadingItem] = useState(Boolean(id));
  const [form, setForm] = useState(emptyForm);

  const [types, setTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [brands, setBrands] = useState([]);
  const [errors, setErrors] = useState({});

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const userId = getUserIdFromToken();
  const imageRef = useRef(null);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleClose = () => {
    navigate('/material/items');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nameEnglish.trim()) newErrors.nameEnglish = 'Raw Material Name is required';
    if (!form.rawMaterialCatTypeId) newErrors.rawMaterialCatTypeId = 'Raw Material Type is required';
    if (!form.rawMaterialCatId) newErrors.rawMaterialCatId = 'Raw Material Category is required';
    if (!form.unitId) newErrors.unitId = 'Unit is required';

    if (form.supplierRate !== '' && Number(form.supplierRate) < 0) newErrors.supplierRate = 'Rate must be positive';
    if (form.opbStock && Number(form.opbStock) < 0) newErrors.opbStock = 'Opening balance must be positive';
    if (form.minStock && Number(form.minStock) < 0) newErrors.minStock = 'Minstock must be positive';
    if (form.maxStock && Number(form.maxStock) < 0) {
      newErrors.maxStock = 'Maximum stock must be positive';
    } else if (form.maxStock !== '' && form.minStock !== '' && Number(form.maxStock) < Number(form.minStock)) {
      newErrors.maxStock = 'Maximum stock cannot be less than minimum stock';
    }

    if (form.dailyConsumption !== '' && Number(form.dailyConsumption) < 0) {
      newErrors.dailyConsumption = 'Daily Consumption must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchTypes = async (editType = null) => {
    try {
      const res = await getAllRawMaterialCategoryType();
      const typeData = res?.data?.data?.['Raw Material Category Type Details'] || res?.data?.data || [];
      let activeList = typeData.filter((item) => item.isActive === true);
      if (editType?.id != null && !activeList.some((t) => String(t.id) === String(editType.id))) {
        activeList = [...activeList, { ...editType, isActive: true }];
      }
      setTypes(activeList);
      return activeList;
    } catch (err) {
      console.error('Failed to load types:', err);
      return [];
    }
  };

  const fetchUnits = async (editUnit = null) => {
    try {
      const res = await getAllRawMaterialUnits();
      const unitData = res?.data?.data?.['Unit Details'] || res?.data?.data || [];
      let activeList = unitData.filter((item) => item.isActive === true);
      if (editUnit?.id != null && !activeList.some((u) => String(u.id) === String(editUnit.id))) {
        activeList = [...activeList, { ...editUnit, isActive: true }];
      }
      setUnits(activeList);
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  const fetchCategories = async (categoryTypeId, editCategory = null) => {
    if (!categoryTypeId) {
      setCategories([]);
      return [];
    }
    setLoadingCategories(true);
    try {
      // Pass the primitive ID directly (do not pass an object)
      const res = await getAllRawMaterialCategory(Number(categoryTypeId));
      const categoryData = res?.data?.data?.['Raw Material Category Details'] || res?.data?.data || [];
      let activeList = Array.isArray(categoryData)
        ? categoryData.filter((item) => item.isActive === true)
        : [];
      if (editCategory?.id != null && !activeList.some((c) => String(c.id) === String(editCategory.id))) {
        activeList = [...activeList, { ...editCategory, isActive: true }];
      }
      setCategories(activeList);
      return activeList;
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubCategoriesForCategory = async (categoryId, editSubCategory = null) => {
    if (!categoryId) {
      setSubCategories([]);
      return [];
    }
    setLoadingSubCategories(true);
    try {
      const res = await getAllSubCategoryByCategoryId(categoryId);
      const subCategoryData = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      let activeList = subCategoryData.filter((item) => item.isActive === true);
      if (editSubCategory?.id != null && !activeList.some((s) => String(s.id) === String(editSubCategory.id))) {
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

  const fetchBrands = async (categoryId, editBrand = null) => {
    if (!categoryId) {
      setBrands([]);
      return [];
    }
    try {
      const res = await getRawMaterialCategoryBrandsByCategoryId(categoryId);
      const brandData = res?.data?.data?.['Raw Material Brand Details'] || [];
      let brandList = brandData.map((item) => ({ id: item.brandId, name: item.brandName }));
      if (
        editBrand?.id != null &&
        editBrand?.name &&
        !brandList.some((b) => String(b.id) === String(editBrand.id))
      ) {
        brandList = [...brandList, { id: editBrand.id, name: editBrand.name }];
      }
      setBrands(brandList);
      return brandList;
    } catch (err) {
      console.error('Failed to load brands:', err);
      setBrands([]);
      return [];
    }
  };
  useEffect(() => {
    fetchTypes();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (!id) {
      setEditData(null);
      setLoadingItem(false);
      return;
    }

    const loadItem = async () => {
      try {
        setLoadingItem(true);
        const res = await getRawMaterialById(id);
        const item = res?.data?.data?.['Raw Material Details']?.[0];

        if (!item) {
          navigate('/material/items', { replace: true });
          return;
        }
        setEditData(item);
      } catch (err) {
        console.error('Failed to load raw material item:', err);
        navigate('/material/items', { replace: true });
      } finally {
        setLoadingItem(false);
      }
    };

    loadItem();
  }, [id, navigate]);

  useEffect(() => {
    if (!form.rawMaterialCatTypeId) {
      setCategories([]);
      return;
    }
    fetchCategories(form.rawMaterialCatTypeId, normalizeCategory(editData));
  }, [form.rawMaterialCatTypeId]);

  useEffect(() => {
    if (loadingCategories || !form.rawMaterialCatId) return;
    const stillValid = categories.some((c) => String(c.id) === String(form.rawMaterialCatId));
    if (!stillValid) set('rawMaterialCatId', '');
  }, [categories, loadingCategories, form.rawMaterialCatId]);

  useEffect(() => {
    if (!form.rawMaterialCatId) {
      setSubCategories([]);
      setBrands([]);
      return;
    }
    fetchSubCategoriesForCategory(form.rawMaterialCatId, normalizeSubCategory(editData));
    fetchBrands(form.rawMaterialCatId, normalizeBrand(editData));
  }, [form.rawMaterialCatId]);

  useEffect(() => {
    if (loadingSubCategories || !form.rawMaterialSubCatId) return;
    const stillValid = subCategories.some((s) => String(s.id) === String(form.rawMaterialSubCatId));
    if (!stillValid) set('rawMaterialSubCatId', '');
  }, [subCategories, loadingSubCategories, form.rawMaterialSubCatId]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('file', file);
  };

  const imagePreview = form.file ? URL.createObjectURL(form.file) : form.imageUrl;

  useEffect(() => {
    if (!editData) {
      setForm(emptyForm);
      return;
    }

    const type = normalizeType(editData);
    const category = normalizeCategory(editData);
    const subCategory = normalizeSubCategory(editData);
    const unit = normalizeUnit(editData);
    const brand = normalizeBrand(editData);
    const latestImage = getLatestImage(editData.images);

    setForm({
      nameEnglish: editData.nameEnglish || '',
      rawMaterialCatTypeId: String(type?.id ?? ''),
      rawMaterialCatId: String(category?.id ?? ''),
      rawMaterialSubCatId: String(subCategory?.id ?? ''),
      unitId: String(unit?.id ?? ''),
      brandId: String(brand?.id ?? ''),
      supplierRate: editData.supplierRate ?? '',
      dailyConsumption: editData.dailyConsumption ?? '',
      opbStock: editData.opbStock ?? '',
      minStock: editData.minStock ?? '',
      maxStock: editData.maxStock ?? '',
      minOrder: editData.minOrder ?? '',
      sequence: editData.sequence ?? '',
      weightPer100Pax: editData.weightPer100Pax ?? '',
      hsnCode: editData.hsnCode ?? '',
      tax: editData.tax ?? '',
      isCessApplicable: Boolean(editData.isCessApplicable || Number(editData.cess) > 0),
      isUsedBy: Boolean(editData.isUsedBy || editData.useByDate),
      isGeneralFix: editData.isGeneralFix ?? false,
      isApplyCal: editData.isApplyCal ?? false,
      file: null,
      imageUrl: latestImage,
    });
  }, [editData])

  const handleSave = async () => {
    if (!validate()) return;

    try {
      const formData = new FormData();
      formData.append('nameEnglish', form.nameEnglish);
      formData.append('rawMaterialCatTypeId', Number(form.rawMaterialCatTypeId));
      formData.append('rawMaterialCatId', Number(form.rawMaterialCatId));
      if (form.rawMaterialSubCatId !== '') formData.append('subCategoryId', Number(form.rawMaterialSubCatId));
      formData.append('unitId', Number(form.unitId));
      if (form.brandId !== '') formData.append('brandId', Number(form.brandId));
      if (form.supplierRate !== '') formData.append('supplierRate', Number(form.supplierRate));
      if (form.dailyConsumption !== '') formData.append('dailyConsumption', form.dailyConsumption);
      if (form.minStock !== '') formData.append('minStock', Number(form.minStock));
      if (form.maxStock !== '') formData.append('maxStock', Number(form.maxStock));
      if (form.minOrder !== '') formData.append('minOrder', Number(form.minOrder));
      if (form.sequence !== '') formData.append('sequence', Number(form.sequence));
      if (form.weightPer100Pax !== '') formData.append('weightPer100Pax', Number(form.weightPer100Pax));
      if (form.opbStock !== '') formData.append('opbStock', Number(form.opbStock));
      if (form.hsnCode !== '') formData.append('hsnCode', form.hsnCode);
      if (form.tax !== '' && form.tax !== null && form.tax !== undefined) formData.append('tax', Number(form.tax));
      formData.append('isCessApplicable', form.isCessApplicable);
      formData.append('isUsedBy', form.isUsedBy);
      formData.append('isGeneralFix', form.isGeneralFix);
      formData.append('isApplyCal', form.isApplyCal);
      formData.append('userId', userId);

      if (form.file) formData.append('file', form.file);

      if (editData?.id) {
        formData.append('id', editData.id);
        await updateRawMaterialItem(formData);
      } else {
        await addRawMaterialItem(formData);
      }

      navigate('/material/items');
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingItem) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-[#667085]">Loading raw material...</div>
      </div>
    );
  }

  return (
    <Container>
      <div>
        <div className="mx-auto pt-2 pb-6 space-y-3.5">
          <PageHeader
            title={
              isViewOnly
                ? 'View Raw Material Item'
                : editData
                  ? 'Edit Raw Material Item'
                  : 'Add New Raw Material Item'
            }
            description={
              isViewOnly
                ? 'View material properties and supplier associations'
                : editData
                  ? 'Update material properties and supplier associations'
                  : 'Configure material properties and supplier associations'
            }
            actions={
              <button
                type="button"
                onClick={() => navigate('/material/items')}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                {'Back to Raw Material Items'}
              </button>
            }
            className="border-b border-[#C3C6D1] pb-4 mb-2"
          />

          <div className="py-6 flex-1 overflow-y-auto space-y-6">
            {/* Section 1: Basic Information */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#00376C] border-b border-gray-100 pb-2.5">
                Basic Information
              </h3>

              {/* Row 1: Raw Material Name, Type, and Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Raw Material Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    disabled={isViewOnly}
                    placeholder="e.g. High-Grade Aluminum Ingots"
                    className="h-10 text-sm border-[#C3C6D1] rounded-lg focus-visible:ring-1 focus-visible:ring-[#00376C] disabled:bg-gray-100"
                    value={form.nameEnglish}
                    onChange={(e) => set('nameEnglish', e.target.value)}
                  />
                  {errors.nameEnglish && (
                    <p className="text-red-500 text-xs mt-1">{errors.nameEnglish}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        disabled={isViewOnly}
                        name="rawMaterialCatTypeId"
                        value={form.rawMaterialCatTypeId}
                        onChange={(e) => {
                          const typeId = String(e.target.value);
                          set('rawMaterialCatTypeId', typeId);
                          set('rawMaterialCatId', '');
                          set('rawMaterialSubCatId', '');
                          set('brandId', '');
                          fetchCategories(typeId);
                        }}
                        options={types.map((item) => ({
                          value: String(item.id),
                          label: item.nameEnglish,
                        }))}
                        placeholder="Select Type"
                        error={!!errors.rawMaterialCatTypeId}
                      />
                    </div>
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => setIsTypeModalOpen(true)}
                        className="w-10 h-10 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#00376C] shrink-0 transition cursor-pointer"
                        title="Add Type"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {errors.rawMaterialCatTypeId && (
                    <p className="text-red-500 text-xs mt-1">{errors.rawMaterialCatTypeId}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        disabled={isViewOnly || !form.rawMaterialCatTypeId || loadingCategories}
                        name="rawMaterialCatId"
                        value={form.rawMaterialCatId}
                        onChange={(e) => {
                          const categoryId = String(e.target.value);
                          set('rawMaterialCatId', categoryId);
                          set('rawMaterialSubCatId', '');
                          set('brandId', '');
                          fetchBrands(categoryId);
                        }}
                        options={categories.map((item) => ({
                          value: String(item.id),
                          label: item.nameEnglish,
                        }))}
                        placeholder={
                          !form.rawMaterialCatTypeId
                            ? 'Select type first'
                            : loadingCategories
                              ? 'Loading...'
                              : 'Select Category'
                        }
                        error={!!errors.rawMaterialCatId}
                      />
                    </div>
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="w-10 h-10 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#00376C] shrink-0 transition cursor-pointer"
                        title="Add Category"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {errors.rawMaterialCatId && (
                    <p className="text-red-500 text-xs mt-1">{errors.rawMaterialCatId}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Sub Category, Unit, and Brand */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Sub Category
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        name="rawMaterialSubCatId"
                        value={form.rawMaterialSubCatId}
                        onChange={(e) => set('rawMaterialSubCatId', String(e.target.value))}
                        options={subCategories.map((item) => ({
                          value: String(item.id),
                          label: item.nameEnglish,
                        }))}
                        placeholder={
                          !form.rawMaterialCatId
                            ? 'Select category first'
                            : loadingSubCategories
                              ? 'Loading...'
                              : 'Select Sub Category'
                        }
                        disabled={isViewOnly || !form.rawMaterialCatId || loadingSubCategories}
                      />
                    </div>
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => setIsSubCategoryModalOpen(true)}
                        className="w-10 h-10 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#00376C] shrink-0 transition cursor-pointer"
                        title="Add Sub Category"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        disabled={isViewOnly}
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
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => setIsUnitModalOpen(true)}
                        className="w-10 h-10 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#00376C] shrink-0 transition cursor-pointer"
                        title="Add Unit"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {errors.unitId && (
                    <p className="text-red-500 text-xs mt-1">{errors.unitId}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Brand
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        disabled={isViewOnly}
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
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => setIsBrandModalOpen(true)}
                        className="w-10 h-10 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#00376C] shrink-0 transition cursor-pointer"
                        title="Add Brand"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Stock Inventory */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#00376C] border-b border-gray-100 pb-2.5">
                Stock Inventory
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Minimum Stock</label>
                  <Input
                    disabled={isViewOnly}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="h-10 text-sm border-[#C3C6D1] rounded-lg disabled:bg-gray-100"
                    value={form.minStock}
                    onWheel={blurOnWheel}
                    onChange={(e) => set('minStock', e.target.value)}
                  />
                  {errors.minStock && (
                    <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Maximum Stock</label>
                  <Input
                    disabled={isViewOnly}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="h-10 text-sm border-[#C3C6D1] rounded-lg disabled:bg-gray-100"
                    value={form.maxStock}
                    onWheel={blurOnWheel}
                    onChange={(e) => set('maxStock', e.target.value)}
                  />
                  {errors.maxStock && (
                    <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Taxation & Compliance */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#00376C] border-b border-gray-100 pb-2.5">
                Taxation & Compliance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">HSN / SAC Code</label>
                  <Input
                    disabled={isViewOnly}
                    type="text"
                    placeholder="e.g. 1901"
                    className="h-10 text-sm border-[#C3C6D1] rounded-lg disabled:bg-gray-100"
                    value={form.hsnCode}
                    onChange={(e) => set('hsnCode', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Tax (%)</label>
                  <Input
                    disabled={isViewOnly}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0 %"
                    className="h-10 text-sm border-[#C3C6D1] rounded-lg disabled:bg-gray-100"
                    value={form.tax}
                    onWheel={blurOnWheel}
                    onChange={(e) => set('tax', e.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 flex flex-col justify-center min-h-14.5 self-end">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">Is Cess Applicable?</span>
                    <SmallToggle
                      disabled={isViewOnly}
                      checked={form.isCessApplicable}
                      onChange={() => set('isCessApplicable', !form.isCessApplicable)}
                      label="Is cess applicable"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 flex flex-col justify-center min-h-14.5 self-end">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">Is Use By?</span>
                    <SmallToggle
                      disabled={isViewOnly}
                      checked={form.isUsedBy}
                      onChange={() => set('isUsedBy', !form.isUsedBy)}
                      label="Is use by"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Image Upload */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <label className="text-sm font-semibold text-[#00376C] block mb-2">
                Raw Material Image
              </label>

              <div
                onClick={() => {
                  if (!isViewOnly) imageRef.current?.click();
                }}
                className={`border-2 border-dashed border-[#C3C6D1] bg-gray-50/60 rounded-xl h-44 flex flex-col items-center justify-center transition ${
                  isViewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100/70'
                  }`}
              >
                {form.file ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover shadow-xs border"
                    />
                    <span className="text-xs text-gray-600 font-medium">{form.file.name}</span>
                  </div>
                ) : form.imageUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="Existing"
                      className="w-24 h-24 rounded-lg object-cover shadow-xs border"
                    />
                    <span className="text-xs text-gray-600 font-medium">Existing Image</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#DEE9FC] flex items-center justify-center mb-2">
                      <UploadCloud className="h-6 w-6 text-[#00376C]" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700">Click or drag and drop to upload</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG or WEBP (Max. 5MB)</p>
                  </>
                )}
              </div>

              <input
                ref={imageRef}
                type="file"
                disabled={isViewOnly}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-5 flex justify-end border-[#C3C6D1] flex-col sm:flex-row gap-4">
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="border border-[#00376C] text-[#00376C] px-5 py-2 rounded-lg cursor-pointer hover:bg-blue-50"
              >
                {isViewOnly ? 'Close' : 'Cancel'}
              </button>

              {!isViewOnly && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#00376C] text-white px-5 py-2 rounded-lg transition cursor-pointer hover:bg-[#002750]"
                >
                  {editData ? 'Update Material' : 'Save Material'}
                </button>
              )}
            </div>
          </div>
        </div>

        {isTypeModalOpen && (
          <AddRawMaterialModal
            isOpen={isTypeModalOpen}
            onClose={() => setIsTypeModalOpen(false)}
            onSaved={async (newType) => {
              const norm = normalizeType(newType) || newType;
              await fetchTypes(norm || null);
              if (norm?.id != null) {
                set('rawMaterialCatTypeId', String(norm.id));
                set('rawMaterialCatId', '');
                set('rawMaterialSubCatId', '');
                set('brandId', '');
                await fetchCategories(norm.id);
              }
            }}
          />
        )}

        {isCategoryModalOpen && (
          <AddRawMaterialCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            onSaved={async (newCat) => {
              const norm = normalizeCategory(newCat) || newCat;
              await fetchCategories(form.rawMaterialCatTypeId, norm || null);
              if (norm?.id != null) {
                set('rawMaterialCatId', String(norm.id));
                set('rawMaterialSubCatId', '');
              }
            }}
          />
        )}

        {isUnitModalOpen && (
          <AddRawMaterialUnit
            isOpen={isUnitModalOpen}
            onClose={() => setIsUnitModalOpen(false)}
            onSaved={async (newUnit) => {
              const norm = normalizeUnit(newUnit) || newUnit;
              await fetchUnits(norm || null);
              if (norm?.id != null) set('unitId', String(norm.id));
            }}
          />
        )}

        {isBrandModalOpen && (
          <AddRawMaterialBrand
            isOpen={isBrandModalOpen}
            onClose={() => setIsBrandModalOpen(false)}
            onSaved={async (newBrand) => {
              const norm = normalizeBrand(newBrand) || newBrand;
              if (form.rawMaterialCatId) await fetchBrands(form.rawMaterialCatId, norm);
              if (norm?.id != null) set('brandId', String(norm.id));
            }}
          />
        )}

        {isSubCategoryModalOpen && (
          <AddRawMaterialSubCategoryModal
            isOpen={isSubCategoryModalOpen}
            onClose={() => setIsSubCategoryModalOpen(false)}
            onSaved={async (newSub) => {
              const norm = normalizeSubCategory(newSub) || newSub;
              await fetchSubCategoriesForCategory(form.rawMaterialCatId, norm || null);
              if (norm?.id != null) set('rawMaterialSubCatId', String(norm.id));
            }}
          />
        )}
      </div>
    </Container>
  );
};

export default AddRawMaterialItemModal;