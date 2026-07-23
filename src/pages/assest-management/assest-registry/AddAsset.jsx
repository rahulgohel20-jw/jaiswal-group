import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Boxes,
  ChevronDown,
  Copy,
  Download,
  Landmark,
  Package,
  QrCode,
  ScanLine,
  ShieldCheck,
  Wrench,
  Save,
  UserPlus,
  CirclePlus,
  ImagePlus,
  X,
} from 'lucide-react';
import { Button } from 'react-aria-components';
import AddCategoryModal from '../categories/AddCategoryModal';
import AddSubCategoryModal from '../sub-categories/AddSubCategoryModal';
import {
  getAssetCategories,
  getSubCategoriesByCategory,
  getActiveSubCategories,
  getActiveAssetTypes,
  getActiveAssetBrands,
  createAsset,
  getActiveConditions,
  getActiveStatuses,
} from '@/services/apiServices';
import AddAssetTypeModal from '../assets-type/AddAssetTypeModal';
import AddAssetBrandModal from '../asset-brand/AddAssetBrandModal';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer';

const Label = ({ children, required, hint }) => (
  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500">*</span>}
    {hint && (
      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-[9px] leading-[13px] text-gray-400 text-center font-semibold">
        i
      </span>
    )}
  </label>
);

const MiniLabel = ({ children }) => (
  <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
    {children}
  </label>
);

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 select-none"
  >
    <span
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${
        checked ? 'bg-[#084E92]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </span>
    {label && <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{label}</span>}
  </button>
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

const SubHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 pt-1">
    <Icon className="w-3.5 h-3.5 text-blue-500" />
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
  </div>
);

// Options can be plain strings (legacy static lists) or { value, label } objects
// (dynamic API-backed lists, where value = id and label = display name).
const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectCls} disabled={disabled}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => {
        const val = typeof o === 'object' && o !== null ? o.value : o;
        const label = typeof o === 'object' && o !== null ? o.label : o;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const CodeBox = ({ label, icon: Icon, actions }) => (
  <div>
    <Label>{label}</Label>
    <div className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 flex items-center gap-3 bg-gray-50/60">
      <div className="w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold">
        {actions.map(({ label: a, icon: AIcon, onClick, tone }) => (
          <button
            key={a}
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 hover:underline ${
              tone === 'muted' ? 'text-gray-500' : 'text-[#084E92]'
            }`}
          >
            <AIcon className="w-3.5 h-3.5" />
            {a}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ImageUpload = ({ value, onChange }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = React.useRef(null);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    onChange(file);
  };

  const previewUrl = value ? URL.createObjectURL(value) : null;

  if (previewUrl) {
    return (
      <div>
        <Label>Asset Image</Label>
        <div className="relative w-fit h-[120px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <img src={previewUrl} alt="Asset preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>Asset Image</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`w-full h-[80px] rounded-lg border border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
          dragActive ? 'border-blue-400 bg-blue-50/60' : 'border-gray-300 bg-gray-50/40 hover:border-gray-400'
        }`}
      >
        <ImagePlus className="w-4 h-4 text-blue-400" />
        <p className="text-xs text-gray-500 text-center px-2">Click or drag to upload asset photo</p>
        <p className="text-[10px] text-gray-400">PNG, JPG or WEBP (max. 5MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
};

// Normalizes list-endpoint responses that may come back as {data:[...]}, {content:[...]}, or [...]
const unwrapList = (res) => {
  const raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
  return Array.isArray(raw) ? raw : [];
};

// <input type="date"> gives "yyyy-mm-dd"; backend expects "dd/mm/yyyy". Returns null for empty/invalid input.
const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return null;
  return `${day}/${month}/${year}`;
};

// <input type="date"> gives "yyyy-mm-dd"; backend expects "mm/dd/yyyy". Returns null for empty/invalid input.
const toMMDDYYYY = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return null;
  return `${month}/${day}/${year}`;
};

const AddAsset = () => {
  const { id: assetIdParam } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!assetIdParam;

  const [openSections, setOpenSections] = useState({
    identification: true,
    product: true,
    status: true,
  });
  const toggleSection = (s) => setOpenSections((p) => ({ ...p, [s]: !p[s] }));

  const [amcActive, setAmcActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- Dynamic dropdown data ----
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [subCategories, setSubCategories] = useState([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(true);

  const [assetTypes, setAssetTypes] = useState([]);
  const [assetTypesLoading, setAssetTypesLoading] = useState(true);

  const [assetBrand, setAssetBrand] = useState([]);
  const [assetBrandsLoading, setAssetBrandsLoading] = useState(true);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showAddAssetTypeCategoryModal, setShowAssetTypeCategoryModal] = useState(false);
  const [showAddAssetBrandCategoryModal, setShowAddAssetBrandCategoryModal] = useState(false);

  const [conditions, setConditions] = useState([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);

  const [statuses, setStatuses] = useState([]);
  const [statusesLoading, setStatusesLoading] = useState(true);
  
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await getAssetCategories();
      setCategories(unwrapList(res));
    } catch (err) {
      console.error(err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchAssetTypes = async () => {
    setAssetTypesLoading(true);
    try {
      const res = await getActiveAssetTypes();
      setAssetTypes(unwrapList(res));
    } catch (err) {
      console.error(err);
    } finally {
      setAssetTypesLoading(false);
    }
  };

  // categoryId = null -> all active sub categories; otherwise scoped to that category
  const fetchSubCategories = async (categoryId) => {
    setSubCategoriesLoading(true);
    try {
      const res = categoryId
        ? await getSubCategoriesByCategory(categoryId)
        : await getActiveSubCategories();
      setSubCategories(unwrapList(res));
    } catch (err) {
      console.error(err);
      setSubCategories([]);
    } finally {
      setSubCategoriesLoading(false);
    }
  };

  const fetchAssetBrand = async () => {
    setAssetBrandsLoading(true);
    try {
      const res = await getActiveAssetBrands();
      setAssetBrand(unwrapList(res));
    } catch (err) {
      console.error(err);
    } finally {
      setAssetBrandsLoading(false);
    }
  };


  const fetchConditions = async () => {
  setConditionsLoading(true);
  try {
    const res = await getActiveConditions();
    setConditions(unwrapList(res));
  } catch (err) {
    console.error(err);
  } finally {
    setConditionsLoading(false);
  }
};

const fetchStatuses = async () => {
  setStatusesLoading(true);
  try {
    const res = await getActiveStatuses();
    setStatuses(unwrapList(res));
  } catch (err) {
    console.error(err);
  } finally {
    setStatusesLoading(false);
  }
};

useEffect(() => {
  fetchCategories();
  fetchAssetTypes();
  fetchSubCategories(null);
  fetchAssetBrand();
  fetchConditions();
  fetchStatuses();
}, []);

  const [form, setForm] = useState({
    assetId: '',
    category: '',
    subCategory: '',
    assetType: '',

    itemName: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    assetImage: null,

    purchaseDate: '',
    vendor: '',
    invoiceNumber: '',
    purchaseCost: '',
    currentValue: '',
    depreciation: '',

    warrantyStart: '',
    warrantyEnd: '',
    amcExpiry: '',
    amcProvider: '',

    lastMaintenance: '',
    nextMaintenance: '',
    frequency: '',
    maintenanceCost: '',

    condition: '',
    status: '',
    totalQty: '1',
    availableQty: '1',
    reservedQty: '0',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    set('category', value);
    set('subCategory', '');
    fetchSubCategories(value || null);
  };

  // Load existing asset when editing
  useEffect(() => {
    if (!isEditMode) return;
    // TODO: wire to a real getAssetById(assetIdParam) call once available, e.g.:
    // getAssetById(assetIdParam).then((res) => {
    //   const a = res?.data?.data ?? res?.data;
    //   setForm((f) => ({ ...f, assetId: a.assetId, itemName: a.itemName, /* ...map remaining fields */ }));
    //   setAmcActive(!!a.amcActive);
    // }).catch(console.error);
  }, [isEditMode, assetIdParam]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const subCategoryOptions = subCategories.map((c) => ({ value: c.id, label: c.name }));
  const assetTypeOptions = assetTypes.map((c) => ({ value: c.id, label: c.name }));
  const assetBrandOptions = assetBrand.map((c) => ({ value: c.id, label: c.name }));
  const conditionOptions = conditions.map((c) => ({ value: c.id, label: c.name }));
  const statusOptions = statuses.map((c) => ({ value: c.id, label: c.name }));

  const initialFormState = {
    assetId: '',
    category: '',
    subCategory: '',
    assetType: '',

    itemName: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    assetImage: null,

    purchaseDate: '',
    vendor: '',
    invoiceNumber: '',
    purchaseCost: '',
    currentValue: '',
    depreciation: '',

    warrantyStart: '',
    warrantyEnd: '',
    amcExpiry: '',
    amcProvider: '',

    lastMaintenance: '',
    nextMaintenance: '',
    frequency: '',
    maintenanceCost: '',

    condition: '',
    status: '',
    totalQty: '1',
    availableQty: '1',
    reservedQty: '0',
  };

  const buildAssetPayload = () => ({
    categoryId: form.category,
    subCategoryId: form.subCategory,
    assetTypeId: form.assetType,
    itemName: form.itemName,
    brandName: assetBrand.find((b) => String(b.id) === String(form.brand))?.id || 'dd',
    modelNumber: form.modelNumber,
    serialNumber: form.serialNumber,
    purchaseDate: toDDMMYYYY(form.purchaseDate),
    vendorId: 0, // TODO: static placeholder until a vendor master/API exists — confirm the actual static id to use
    invoiceNumber: form.invoiceNumber,
    purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : null,
    currentValue: form.currentValue ? Number(form.currentValue) : null,
    depreciationPercentage: form.depreciation ? Number(form.depreciation) : null,
    warrantyStartDate: toDDMMYYYY(form.warrantyStart),
    warrantyEndDate: toDDMMYYYY(form.warrantyEnd),
    amcActive,
    amcExpiryDate: amcActive ? toDDMMYYYY(form.amcExpiry) : null,
    amcProvider: amcActive ? form.amcProvider : null,
    lastMaintenance: toDDMMYYYY(form.lastMaintenance),
    nextMaintenance: toDDMMYYYY(form.nextMaintenance),
    maintenanceFrequency: form.frequency || null,
    maintenanceCost: form.maintenanceCost ? Number(form.maintenanceCost) : null,
    conditionId: form.condition || null,
    statusId: form.status || null,
    totalQuantity: form.totalQty ? Number(form.totalQty) : null,
    availableQuantity: form.availableQty ? Number(form.availableQty) : null,
    reservedQuantity: form.reservedQty ? Number(form.reservedQty) : null,
  });

  const handleSaveAsset = async () => {
    try {
      setSaving(true);

      const fd = new FormData();
      fd.append(
        'assetData',
        new Blob([JSON.stringify(buildAssetPayload())], { type: 'application/json' })
      );
      if (form.assetImage) {
        fd.append('assetImages', form.assetImage);
      }

      // TODO: branch to updateAsset(assetIdParam, fd) once that endpoint exists
      const res = await createAsset(fd);
      if (res?.status === 201) {
      setForm(initialFormState);
      setAmcActive(false);
      navigate('/assets/all-assets');
    }
    } catch (err) {
      console.error('Failed to save asset:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-4 min-h-screen pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
            {isEditMode ? 'Edit Asset' : 'Asset Registration'}
          </h1>
          <p className="text-[#43474F] mt-2">
            Register and manage all organizational assets to maintain complete lifecycle visibility and compliance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAsset}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition shrink-0"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Asset'}
        </button>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={Package}
          title="Asset Identification & Classification"
          subtitle=""
          open={openSections.identification}
          onToggle={() => toggleSection('identification')}
        />
        {openSections.identification && (
          <div className="px-6 py-6 space-y-5">
            {isEditMode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asset ID</Label>
                  <div className="relative">
                    <input
                      value={form.assetId}
                      disabled
                      className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed pr-9`}
                    />
                    <Copy className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <CodeBox
                  label="QR Code"
                  icon={QrCode}
                  actions={[
                    { label: 'Preview', icon: ScanLine, onClick: () => {} },
                    { label: 'Download', icon: Download, onClick: () => {}, tone: 'muted' },
                  ]}
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col justify-end">
                <div className="flex gap-2 justify-between mb-3">
                  <Label required>Category</Label>
                  <Button className="cursor-pointer" onPress={() => setShowAddCategoryModal(true)}>
                    <CirclePlus />
                  </Button>
                </div>
                <Select
                  value={form.category}
                  onChange={handleCategoryChange}
                  placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'}
                  options={categoryOptions}
                  disabled={categoriesLoading}
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex justify-between gap-2 mb-3">
                  <Label required>Sub Category</Label>
                  <Button className="cursor-pointer" onPress={() => setShowAddSubCategoryModal(true)}>
                    <CirclePlus />
                  </Button>
                </div>
                <Select
                  value={form.subCategory}
                  onChange={(e) => set('subCategory', e.target.value)}
                  placeholder={subCategoriesLoading ? 'Loading sub categories...' : 'Select sub category'}
                  options={subCategoryOptions}
                  disabled={subCategoriesLoading}
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex justify-between gap-2 mb-3">
                  <Label required>Asset Type</Label>
                  <Button className="cursor-pointer" onPress={() => setShowAssetTypeCategoryModal(true)}>
                    <CirclePlus />
                  </Button>
                </div>
                <Select
                  value={form.assetType}
                  onChange={(e) => set('assetType', e.target.value)}
                  placeholder={assetTypesLoading ? 'Loading asset types...' : 'Select asset type'}
                  options={assetTypeOptions}
                  disabled={assetTypesLoading}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Product Information — item, purchase, warranty/AMC, maintenance */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Boxes}
          title="Product Information"
          subtitle=""
          open={openSections.product}
          onToggle={() => toggleSection('product')}
        />
        {openSections.product && (
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Item Name</Label>
                <input
                  value={form.itemName}
                  onChange={(e) => set('itemName', e.target.value)}
                  placeholder="e.g. Commercial Freezer 400L"
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex justify-between gap-2 mb-3">
                  <Label required>Brand</Label>
                  <Button className="cursor-pointer" onPress={() => setShowAddAssetBrandCategoryModal(true)}>
                    <CirclePlus />
                  </Button>
                </div>
                <Select
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder={assetBrandsLoading ? 'Loading asset brands...' : 'Select asset brand'}
                  options={assetBrandOptions}
                  disabled={assetBrandsLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Model Number</Label>
                <input
                  value={form.modelNumber}
                  onChange={(e) => set('modelNumber', e.target.value)}
                  placeholder="SM-FZ-400-X"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImageUpload value={form.assetImage} onChange={(file) => set('assetImage', file)} />
              <div>
                <Label>Serial Number</Label>
                <input
                  value={form.serialNumber}
                  onChange={(e) => set('serialNumber', e.target.value)}
                  placeholder="SN-2938475610"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-5">
              <SubHeading icon={Landmark} title="Purchase Information" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Purchase Date</Label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => set('purchaseDate', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Select
                    value={form.vendor}
                    onChange={(e) => set('vendor', e.target.value)}
                    placeholder="Select vendor"
                    options={['Ashirwad Traders', 'Sharma Kitchen Supplies', 'National Equipment Co.']}
                  />
                </div>
                <div>
                  <Label>Invoice Number</Label>
                  <input
                    value={form.invoiceNumber}
                    onChange={(e) => set('invoiceNumber', e.target.value)}
                    placeholder="INV-2023-001"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Purchase Cost (₹)</Label>
                  <input
                    value={form.purchaseCost}
                    onChange={(e) => set('purchaseCost', e.target.value)}
                    placeholder="55000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Current Value (₹)</Label>
                  <input
                    value={form.currentValue}
                    onChange={(e) => set('currentValue', e.target.value)}
                    placeholder="48500"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Depreciation % (p.a.)</Label>
                  <input
                    value={form.depreciation}
                    onChange={(e) => set('depreciation', e.target.value)}
                    placeholder="10"
                    className={inputCls}
                  />
                </div>
              </div>

              {(form.currentValue || form.purchaseCost) && (
                <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-3">
                  <Landmark className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Current Value after Depreciation:</span>
                  <span className="text-sm font-bold text-[#084E92] ml-auto">
                    ₹{form.currentValue || '0'}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <SubHeading icon={ShieldCheck} title="Warranty & AMC" />

              <div className="border border-gray-200 rounded-xl px-6 py-5 grid grid-cols-2 gap-x-10 gap-y-5">
                {/* Manufacturer warranty */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Manufacturer Warranty
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <MiniLabel>Start Date</MiniLabel>
                      <input
                        type="date"
                        value={form.warrantyStart}
                        onChange={(e) => set('warrantyStart', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <MiniLabel>End Date</MiniLabel>
                      <input
                        type="date"
                        value={form.warrantyEnd}
                        onChange={(e) => set('warrantyEnd', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* AMC coverage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">AMC Coverage</h4>
                    <Toggle
                      checked={amcActive}
                      onChange={setAmcActive}
                      label={amcActive ? 'AMC Active' : 'AMC Inactive'}
                    />
                  </div>

                  {amcActive ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <MiniLabel>AMC Expiry</MiniLabel>
                        <input
                          type="date"
                          value={form.amcExpiry}
                          onChange={(e) => set('amcExpiry', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <MiniLabel>Provider</MiniLabel>
                        <input
                          value={form.amcProvider}
                          onChange={(e) => set('amcProvider', e.target.value)}
                          placeholder="KitchenCare Pro"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 pt-1.5">Turn on AMC Coverage to add expiry and provider.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-5">
              <SubHeading icon={Wrench} title="Maintenance Info" />
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Last Maintenance</Label>
                  <input
                    type="date"
                    value={form.lastMaintenance}
                    onChange={(e) => set('lastMaintenance', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Next Maintenance</Label>
                  <input
                    type="date"
                    value={form.nextMaintenance}
                    onChange={(e) => set('nextMaintenance', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={form.frequency}
                    onChange={(e) => set('frequency', e.target.value)}
                    placeholder="Select frequency"
                    options={['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']}
                  />
                </div>
                <div>
                  <Label>Maintenance Cost (₹)</Label>
                  <input
                    value={form.maintenanceCost}
                    onChange={(e) => set('maintenanceCost', e.target.value)}
                    placeholder="2500"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Asset Status */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Boxes}
          title="Asset Status"
          open={openSections.status}
          onToggle={() => toggleSection('status')}
        />
        {openSections.status && (
          <div className="px-6 py-6">
            <div className="grid grid-cols-5 gap-4">
           <div>
            <Label>Condition</Label>
            <Select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              placeholder={conditionsLoading ? 'Loading conditions...' : 'Select condition'}
              options={conditionOptions}
              disabled={conditionsLoading}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              placeholder={statusesLoading ? 'Loading statuses...' : 'Select status'}
              options={statusOptions}
              disabled={statusesLoading}
            />
          </div>
              <div>
                <Label>Total Quantity</Label>
                <input
                  value={form.totalQty}
                  onChange={(e) => set('totalQty', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Available Qty</Label>
                <input
                  value={form.availableQty}
                  onChange={(e) => set('availableQty', e.target.value)}
                  className={`${inputCls} bg-gray-50 text-gray-400`}
                />
              </div>
              <div>
                <Label>Reserved Qty</Label>
                <input
                  value={form.reservedQty}
                  onChange={(e) => set('reservedQty', e.target.value)}
                  className={`${inputCls} bg-gray-50 text-gray-400`}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pb-2 mt-6 border-t border-gray-200 pt-6 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSaveAsset}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-[#084E92] border border-[#084E92] font-semibold text-sm hover:bg-blue-50/40 transition cursor-pointer bg-white"
          >
            {saving ? 'Saving...' : 'Save Asset'}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 hover:bg-[#073e77] transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Save &amp; Assign
          </button>
        </div>
      </div>

      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onSaved={fetchCategories}
        initialData={null}
      />

      <AddSubCategoryModal
        isOpen={showAddSubCategoryModal}
        onClose={() => setShowAddSubCategoryModal(false)}
        onSaved={() => fetchSubCategories(form.category || null)}
        initialData={null}
      />

      <AddAssetTypeModal
        isOpen={showAddAssetTypeCategoryModal}
        onClose={() => setShowAssetTypeCategoryModal(false)}
        onSaved={fetchAssetTypes}
        initialData={null}
      />

      <AddAssetBrandModal
        isOpen={showAddAssetBrandCategoryModal}
        onClose={() => setShowAddAssetBrandCategoryModal(false)}
        onSaved={fetchAssetTypes}
        initialData={null}
      />
    </div>
  );
};

export default AddAsset;