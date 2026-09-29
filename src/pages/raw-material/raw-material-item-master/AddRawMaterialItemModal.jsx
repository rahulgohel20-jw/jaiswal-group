import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container } from "@/components/common/container";
import {
  ChevronDown,
  ChevronRight,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addRawMaterialItem,
  getAllActiveVendors,
  getAllRawMaterialCategory,
  getAllRawMaterialUnits,
  getAllSubCategoryByCategoryId,
  getRawMaterialCategoryBrandsByCategoryId,
  getRawMaterialById,
  updateRawMaterialItem,
  approveVendorPricing,
  rejectVendorPricing,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';
import AddRawMaterialBrand from '../raw-material-brand-master/AddRawMaterialBrand';
import AddRawMaterialUnit from '../raw-material-unit-master/AddRawMaterialUnit';
import AddRawMaterialCategoryModal from '../row-material-categories/AddRowMaterialCategoryModel';
import SearchableSelect from '../../../utils/SearchableSelect';
import AddRawMaterialSubCategoryModal from '../raw-material-subcategory/AddRawMaterialSubCategoryModal';
import { useOrgScope } from '../../../hooks/useOrgScope';

const getLatestImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return "";
  return [...images].sort((a, b) => Number(b.id) - Number(a.id))[0]?.path || "";
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

const formatDateForBackend = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  return '';
};

const formatDateToInputValue = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const pickDefined = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

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
  const id = pickDefined(data.brandId, data.brand?.id, data.id);
  if (id == null || id === '') return null;
  const name = data.brandName || data.brand?.name || data.name || '';
  return { id, name };
};

const generateRowId = (seed) =>
  `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const STATUS_STYLES = {
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

const StatusBadge = ({ status }) => {
  const key = String(status || 'PENDING').toUpperCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${style.className}`}>
      {style.label}
    </span>
  );
};

const APPROVAL_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const StatusSelect = ({ status, onChange }) => (
  <Select value={String(status || 'PENDING').toUpperCase()} onValueChange={onChange}>
    <SelectTrigger className="h-8 w-32.5 border-[#C3C6D1] rounded-md text-xs font-medium bg-white">
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      {APPROVAL_STATUS_OPTIONS.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const TableOutletMultiSelect = ({
  options = [],
  selected = [],
  onChange,
  disabled = false,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
  }, [options, query]);

  const isSelected = (id) => selected.includes(String(id));

  const toggleOption = (id) => {
    const strId = String(id);
    if (isSelected(strId)) {
      onChange(selected.filter((s) => s !== strId));
    } else {
      onChange([...selected, strId]);
    }
  };

  const removeOption = (id) => {
    const strId = String(id);
    onChange(selected.filter((s) => s !== strId));
  };

  const isAllSelected = options.length > 0 && selected.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => String(o.id)));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`min-h-9.5 w-full min-w-55 border rounded-lg px-2.5 py-1 flex flex-wrap items-center gap-1.5 transition-all ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
              : 'bg-white cursor-pointer hover:border-[#00376C] focus-within:border-[#00376C]'
          } ${error ? 'border-red-500! bg-red-50/20' : 'border-[#C3C6D1]'}`}
        >
          {selected.length > 3 ? (
            <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-semibold px-2 py-0.5 rounded-md">
              {isAllSelected
                ? `All Outlets (${options.length})`
                : `Selected Outlets (${selected.length})`}
              {!disabled && (
                <X
                  size={11}
                  className="cursor-pointer hover:text-red-500 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                />
              )}
            </span>
          ) : (
            selected.map((selectedId) => {
              const unitObj = options.find((o) => String(o.id) === String(selectedId));
              const unitName = unitObj?.name || `Unit #${selectedId}`;

              return (
                <span
                  key={selectedId}
                  className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-medium px-2 py-0.5 rounded-md"
                >
                  <span className="truncate max-w-30">{unitName}</span>
                  {!disabled && (
                    <X
                      size={11}
                      className="cursor-pointer hover:text-red-500 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOption(selectedId);
                      }}
                    />
                  )}
                </span>
              );
            })
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={selected.length === 0 ? 'Select or search unit...' : ''}
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            className="flex-1 min-w-17.5 bg-transparent text-xs text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
          />

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {selected.length > 0 && !disabled && (
              <X
                size={13}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                  setQuery('');
                }}
              />
            )}
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="p-1 w-(--radix-popover-trigger-width) min-w-60 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-lg shadow-xl z-50 text-xs"
      >
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-2 text-gray-400 text-center">No units found.</p>
        ) : (
          <>
            {options.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#00376C] hover:bg-blue-50/70 rounded cursor-pointer border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#00376C] rounded"
                />
                All Outlets ({options.length})
              </label>
            )}

            {filteredOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50/70 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(opt.id)}
                  onChange={() => toggleOption(opt.id)}
                  className="accent-[#00376C] rounded"
                />
                <span className="truncate">{opt.name}</span>
              </label>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

const AddRawMaterialItemModal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isViewOnly = location.pathname.includes('/view/');

  // View flags passed from VendorPriceApproval handleView
  const isVendorPriceApprovalView =
    isViewOnly && location.state?.from === 'vendor-price-approval';
  const approvalViewStatus = location.state?.status
    ? String(location.state.status).trim().toUpperCase()
    : '';
  const approvalViewVendorId = location.state?.vendorId
    ? String(location.state.vendorId)
    : '';

  const approvalParams = new URLSearchParams(location.search);
  const isApprovalMode = location.pathname.includes('/approve/');
  const approvalVendorId = String(
    location.state?.vendorId ?? approvalParams.get('vendorId') ?? ''
  );
  const approvalOutletId =
    location.state?.outletId ?? approvalParams.get('outletId') ?? '';
  const approvalOutletIds = (
    location.state?.outletIds ?? (approvalOutletId ? [approvalOutletId] : [])
  )
    .filter((o) => o !== null && o !== undefined && o !== '')
    .map(String);
  const approvalVendorName = location.state?.vendorName ?? '';
  const approvalOutletName = location.state?.outletName ?? '';

  const [editData, setEditData] = useState(null);
  const [loadingItem, setLoadingItem] = useState(Boolean(id));

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

  const {
    loading: outletsLoading,
    isOutletUser,
    isCompanyUser,
    units: outlets,
    effectiveOutletId,
  } = useOrgScope();

  const outletList = useMemo(() => {
    return (outlets || [])
      .filter((outlet) => String(outlet?.id).toUpperCase() !== 'ALL')
      .map((outlet) => ({
        id: String(outlet.id),
        name: outlet.code ? `${outlet.name} (${outlet.code})` : outlet.name,
      }));
  }, [outlets]);

  const outletUserOutletId = isOutletUser ? String(effectiveOutletId ?? '') : '';

  const userAccessibleOutletIds = useMemo(() => {
    if (isOutletUser && outletUserOutletId) {
      return new Set([String(outletUserOutletId)]);
    }
    if (isCompanyUser && Array.isArray(outlets) && outlets.length > 0) {
      const valid = outlets
        .filter((o) => o?.id != null && String(o.id).toUpperCase() !== 'ALL')
        .map((o) => String(o.id));
      if (valid.length > 0) return new Set(valid);
    }
    return null;
  }, [isOutletUser, isCompanyUser, outletUserOutletId, outlets]);

  const isRowWithinUserScope = (row) => {
    if (!userAccessibleOutletIds) return true;
    const rowOutlets = (row.outletIds || []).map(String);
    if (rowOutlets.length === 0) return true;
    return rowOutlets.some((oid) => userAccessibleOutletIds.has(oid));
  };

  const [supplierErrors, setSupplierErrors] = useState({});

  const handleClose = () => {
    if (isApprovalMode || isVendorPriceApprovalView) {
      navigate('/material/vendor-price-approval');
    } else {
      navigate('/material/items');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nameEnglish.trim()) newErrors.nameEnglish = 'Raw Material Name is required';
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

  const fetchCategories = async (editCategory = null) => {
    try {
      const res = await getAllRawMaterialCategory();
      const categoryData = res?.data?.data?.['Raw Material Category Details'] || res?.data?.data || [];
      let activeList = categoryData.filter((item) => item.isActive === true);
      if (editCategory?.id != null && !activeList.some((c) => String(c.id) === String(editCategory.id))) {
        activeList = [...activeList, { ...editCategory, isActive: true }];
      }
      setCategories(activeList);
    } catch (err) {
      console.error('Failed to load categories:', err);
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
      if (editBrand?.id != null && !brandList.some((b) => String(b.id) === String(editBrand.id))) {
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

  const fetchSuppliers = async () => {
    try {
      const res = await getAllActiveVendors();
      setSupplierOptions(res?.data?.data || []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchUnits(normalizeUnit(editData));
    fetchCategories(normalizeCategory(editData));
  }, [editData?.id]);

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
    if (!form.rawMaterialCatId) {
      setSubCategories([]);
      return;
    }
    const currentCategoryId = String(form.rawMaterialCatId);
    const originalCategory = normalizeCategory(editData);
    const editSubCategory =
      originalCategory?.id != null && String(originalCategory.id) === currentCategoryId
        ? normalizeSubCategory(editData)
        : null;

    fetchSubCategoriesForCategory(currentCategoryId, editSubCategory);
  }, [form.rawMaterialCatId, editData?.id]);

  useEffect(() => {
    if (loadingSubCategories || !form.rawMaterialSubCatId) return;
    const stillValid = subCategories.some((s) => String(s.id) === String(form.rawMaterialSubCatId));
    if (!stillValid) set('rawMaterialSubCatId', '');
  }, [subCategories, loadingSubCategories, form.rawMaterialSubCatId]);

  const userId = getUserIdFromToken();
  const imageRef = useRef(null);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('file', file);
  };

  const imagePreview = form.file ? URL.createObjectURL(form.file) : form.imageUrl;

  const toggleSupplierSelection = (supplierId) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    );
  };

  const handleAddSupplier = () => {
    if (selectedSupplierIds.length === 0 || isApprovalMode || isViewOnly) return;

    setSupplierRows((prev) => {
      const newRows = [];
      selectedSupplierIds.forEach((supplierId) => {
        if (isOutletUser && prev.some((r) => String(r.supplierId) === String(supplierId))) {
          return;
        }

        const supplier = supplierOptions.find((s) => String(s.id) === String(supplierId));
        const currentOutletName = outletList.find((o) => String(o.id) === String(outletUserOutletId))?.name || '';

        newRows.push({
          rowId: generateRowId(supplierId),
          supplierId,
          name: supplier?.fullName || supplier?.name || 'Unknown Supplier',
          outletIds: isOutletUser && outletUserOutletId ? [String(outletUserOutletId)] : [],
          outletNames: isOutletUser && currentOutletName ? [currentOutletName] : [],
          status: 'PENDING',
          from: '',
          to: '',
          price: '',
        });
      });
      return [...prev, ...newRows];
    });

    setSelectedSupplierIds([]);
    setSupplierSearch('');
    setSupplierDropdownOpen(false);
  };

  const updateSupplierOutlets = (rowId, newOutletIds) => {
    if (isOutletUser || isApprovalMode || isViewOnly) return;

    setSupplierErrors((prevErr) => {
      const next = { ...prevErr };
      delete next[rowId];
      return next;
    });

    setSupplierRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const names = newOutletIds.map(
          (oid) => outletList.find((o) => String(o.id) === String(oid))?.name || `Outlet #${oid}`
        );
        return { ...row, outletIds: newOutletIds, outletNames: names };
      })
    );
  };

  const updateSupplierRow = (rowId, field, value) => {
    if (field === 'price') {
      setSupplierErrors((prevErr) => {
        const next = { ...prevErr };
        delete next[rowId];
        return next;
      });
    }
    setSupplierRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row))
    );
  };

  const removeSupplierRow = (rowId) => {
    if (isApprovalMode || isViewOnly) return;
    setSupplierRows((prev) => prev.filter((row) => row.rowId !== rowId));
    setSupplierErrors((prevErr) => {
      const next = { ...prevErr };
      delete next[rowId];
      return next;
    });
  };

  const getOutletOptionsForRow = (row) => {
    const takenBySameVendor = new Set();
    supplierRows.forEach((r) => {
      if (r.rowId !== row.rowId && String(r.supplierId) === String(row.supplierId)) {
        (r.outletIds || []).forEach((outId) => takenBySameVendor.add(String(outId)));
      }
    });

    return outletList.filter(
      (outlet) => !takenBySameVendor.has(String(outlet.id)) || (row.outletIds || []).includes(String(outlet.id))
    );
  };

  useEffect(() => {
    const loadEditData = async () => {
      if (!editData) {
        setForm(emptyForm);
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

      setForm({
        nameEnglish: editData.nameEnglish || '',
        rawMaterialCatId: categoryId,
        rawMaterialSubCatId: '',
        unitId: String(unit?.id ?? ''),
        brandId: '',
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

      if (category?.id != null) {
        const loadedSubCategories = await fetchSubCategoriesForCategory(category.id, subCategory);
        if (subCategory?.id != null && loadedSubCategories.some((item) => String(item.id) === String(subCategory.id))) {
          setForm((prev) => ({ ...prev, rawMaterialSubCatId: subCategoryId }));
        }

        const loadedBrands = await fetchBrands(category.id, brand);
        if (brand?.id != null && loadedBrands.some((b) => String(b.id) === String(brand.id))) {
          setForm((prev) => ({ ...prev, brandId: String(brand.id) }));
        }
      }

      const vendorList = editData.vendorPriceConfigs || editData.suppliers;

      if (Array.isArray(vendorList)) {
        let rows = [];

        vendorList.forEach((s, configIdx) => {
          const sId = s.vendorId ?? s.supplierId ?? s.id;
          const vendorName = s.vendorName || s.fullName || s.name || 'Unknown Supplier';

          if (Array.isArray(s.outletPrices) && s.outletPrices.length > 0) {
            s.outletPrices.forEach((op, opIdx) => {
              const outletOrgId = String(op.organizationId ?? op.outletId ?? '');
              const backendOutletName = op.organizationName || op.outletName || '';

              rows.push({
                id: s.id,
                outletPriceId: op.id,
                rowId: generateRowId(`srv-${s.id}-${op.id ?? opIdx}`),
                supplierId: sId,
                outletIds: outletOrgId ? [outletOrgId] : [],
                outletNames: backendOutletName ? [backendOutletName] : [],
                status: String(op.status || s.status || 'PENDING').trim().toUpperCase(),
                name: vendorName,
                from: formatDateToInputValue(op.fromDate || s.fromDate || s.from || ''),
                to: formatDateToInputValue(op.toDate || s.toDate || s.to || ''),
                price: op.price != null ? op.price : (s.price ?? ''),
              });
            });
          } else {
            let outletIds = s.outletId != null ? [String(s.outletId)] : [];
            const fallbackName = s.organizationName || s.outletName || '';

            rows.push({
              id: s.id,
              rowId: generateRowId(`srv-${s.id ?? configIdx}`),
              supplierId: sId,
              outletIds,
              outletNames: fallbackName ? [fallbackName] : [],
              status: String(s.status || 'PENDING').trim().toUpperCase(),
              name: vendorName,
              from: formatDateToInputValue(s.fromDate || s.from || ''),
              to: formatDateToInputValue(s.toDate || s.to || ''),
              price: s.price ?? '',
            });
          }
        });

        // 1. Role-based Scope Filtering (applied for all roles)
        if (userAccessibleOutletIds) {
          rows = rows.filter((r) =>
            (r.outletIds || []).some((oid) => userAccessibleOutletIds.has(String(oid)))
          );
        }

        // 2. Strict Filter: If opened from Vendor Price Approval, show ONLY rows matching that specific status (APPROVED, REJECTED, or PENDING)
        // If opened from Raw Material Items list, this is ignored and all records are shown!
        if (isVendorPriceApprovalView && approvalViewStatus) {
          rows = rows.filter(
            (r) => String(r.status || '').trim().toUpperCase() === approvalViewStatus
          );

          if (approvalViewVendorId) {
            rows = rows.filter(
              (r) => String(r.supplierId) === String(approvalViewVendorId)
            );
          }
        }

        // 3. Outlet User deduplication
        if (isOutletUser && outletUserOutletId) {
          const seenVendors = new Set();
          const deduplicated = [];
          rows.forEach((r) => {
            const vKey = String(r.supplierId);
            if (!seenVendors.has(vKey)) {
              seenVendors.add(vKey);
              deduplicated.push({
                ...r,
                outletIds: [String(outletUserOutletId)],
                outletNames: [outletList.find((o) => String(o.id) === String(outletUserOutletId))?.name || ''],
              });
            }
          });
          rows = deduplicated;
        }

        setSupplierRows(rows);
      } else {
        setSupplierRows([]);
      }
    };

    loadEditData();
  }, [
    editData?.id,
    isOutletUser,
    isCompanyUser,
    outletUserOutletId,
    userAccessibleOutletIds,
    outletList,
    isVendorPriceApprovalView,
    approvalViewStatus,
    approvalViewVendorId,
  ]);

  const approvalTargetRows = useMemo(() => {
    if (!isApprovalMode || !approvalVendorId) return [];

    return supplierRows.filter((row) => {
      const matchVendor = String(row.supplierId) === String(approvalVendorId);
      if (!matchVendor) return false;

      if (approvalOutletIds.length > 0) {
        return (row.outletIds || []).some((o) => approvalOutletIds.includes(String(o)));
      }

      return true;
    });
  }, [isApprovalMode, approvalVendorId, approvalOutletIds, supplierRows]);

  const approvalTargetRowIds = useMemo(
    () => new Set(approvalTargetRows.map((r) => r.rowId)),
    [approvalTargetRows]
  );

  const isApprovalRowModified = useMemo(() => {
    if (!isApprovalMode || approvalTargetRows.length === 0 || !editData) return false;

    const vendorConfigs = editData.vendorPriceConfigs || editData.suppliers || [];

    return approvalTargetRows.some((row) => {
      const origConfig = vendorConfigs.find((c) => String(c.id) === String(row.id));
      if (!origConfig) return false;

      const origOp = Array.isArray(origConfig.outletPrices)
        ? origConfig.outletPrices.find((op) => String(op.id) === String(row.outletPriceId))
        : null;

      const origPrice =
        origOp?.price != null ? String(origOp.price) : String(origConfig.price ?? '');
      const origFrom = formatDateToInputValue(origOp?.fromDate || origConfig.fromDate || origConfig.from || '');
      const origTo = formatDateToInputValue(origOp?.toDate || origConfig.toDate || origConfig.to || '');

      return (
        origPrice !== String(row.price ?? '') ||
        origFrom !== (row.from || '') ||
        origTo !== (row.to || '')
      );
    });
  }, [isApprovalMode, approvalTargetRows, editData]);

  const canApproveOrReject =
    isApprovalMode &&
    approvalTargetRows.some((r) =>
      ['APPROVED', 'REJECTED'].includes(String(r.status || '').toUpperCase())
    );

  const handleApplyAllStatus = (newStatus) => {
    setSupplierRows((prev) =>
      prev.map((r) =>
        approvalTargetRowIds.has(r.rowId) ? { ...r, status: newStatus } : r
      )
    );
  };

  const handleSave = async () => {
    if (isApprovalMode) {
      if (approvalTargetRows.length === 0) {
        console.error('Target vendor price rows not found.');
        return;
      }

      const invalidApprovalPrices = approvalTargetRows.filter(
        (r) => r.price !== '' && (Number(r.price) < 0 || isNaN(Number(r.price)))
      );
      if (invalidApprovalPrices.length > 0) {
        const errs = {};
        invalidApprovalPrices.forEach((r) => {
          errs[r.rowId] = 'Price must be positive';
        });
        setSupplierErrors((prev) => ({ ...prev, ...errs }));
        return;
      }

      const statusOf = (r) => String(r.status || '').toUpperCase();

      const approveIds = approvalTargetRows
        .filter((r) => statusOf(r) === 'APPROVED')
        .map((r) => r.outletPriceId || r.id)
        .filter(Boolean);

      const rejectIds = approvalTargetRows
        .filter((r) => statusOf(r) === 'REJECTED')
        .map((r) => r.outletPriceId || r.id)
        .filter(Boolean);

      if (approveIds.length === 0 && rejectIds.length === 0) return;

      try {
        if (isApprovalRowModified) {
          if (!validate()) return;
          const formData = new FormData();
          formData.append('id', editData.id);
          formData.append('nameEnglish', form.nameEnglish);
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

          supplierRows.forEach((row, vIndex) => {
            if (row.supplierId) formData.append(`vendorPriceConfigs[${vIndex}].vendorId`, Number(row.supplierId));
            if (row.id) formData.append(`vendorPriceConfigs[${vIndex}].id`, Number(row.id));
            if (row.from) formData.append(`vendorPriceConfigs[${vIndex}].fromDate`, formatDateForBackend(row.from));
            if (row.to) formData.append(`vendorPriceConfigs[${vIndex}].toDate`, formatDateForBackend(row.to));
            if (row.price !== '') formData.append(`vendorPriceConfigs[${vIndex}].price`, Number(row.price));

            (row.outletIds || []).forEach((outId, oIndex) => {
              const base = `vendorPriceConfigs[${vIndex}].outletPrices[${oIndex}]`;
              formData.append(`${base}.organizationId`, Number(outId));
              if (row.price !== '') formData.append(`${base}.price`, Number(row.price));
              if (row.from) formData.append(`${base}.fromDate`, formatDateForBackend(row.from));
              if (row.to) formData.append(`${base}.toDate`, formatDateForBackend(row.to));
            });
          });

          await updateRawMaterialItem(formData);
        }

        const decisions = [];
        if (approveIds.length > 0) {
          decisions.push(approveVendorPricing(approveIds));
        }
        if (rejectIds.length > 0) {
          decisions.push(rejectVendorPricing(rejectIds));
        }

        await Promise.all(decisions);

        navigate('/material/vendor-price-approval');
      } catch (err) {
        console.error('Failed to update vendor pricing:', err);
      }
      return;
    }

    if (!validate()) return;

    let rowsToSave = supplierRows;
    if (editData && Array.isArray(editData.vendorPriceConfigs)) {
      const origRows = [];
      editData.vendorPriceConfigs.forEach((s) => {
        const sId = s.vendorId ?? s.supplierId ?? s.id;
        (s.outletPrices || []).forEach((op) => {
          const outletOrgId = String(op.organizationId ?? op.outletId ?? '');
          if (userAccessibleOutletIds && !userAccessibleOutletIds.has(outletOrgId)) {
            origRows.push({
              id: s.id,
              outletPriceId: op.id,
              supplierId: sId,
              outletIds: [outletOrgId],
              status: op.status || 'PENDING',
              from: formatDateToInputValue(op.fromDate || ''),
              to: formatDateToInputValue(op.toDate || ''),
              price: op.price != null ? op.price : '',
            });
          }
        });
      });
      rowsToSave = [...rowsToSave, ...origRows];
    }

    const effectiveRows = rowsToSave.map((row) => ({
      ...row,
      outletIds: isOutletUser ? (outletUserOutletId ? [String(outletUserOutletId)] : []) : (row.outletIds || []),
    }));

    const invalidPriceRows = effectiveRows.filter(
      (row) => row.price !== '' && (Number(row.price) < 0 || isNaN(Number(row.price)))
    );

    if (invalidPriceRows.length > 0) {
      const errs = {};
      invalidPriceRows.forEach((row) => {
        errs[row.rowId] = 'Price must be positive';
      });
      setSupplierErrors((prev) => ({ ...prev, ...errs }));
      return;
    }

    const missingOutletRows = effectiveRows.filter((row) => !row.outletIds || row.outletIds.length === 0);
    if (missingOutletRows.length > 0) {
      const errs = {};
      missingOutletRows.forEach((row) => { errs[row.rowId] = 'Outlet is required'; });
      setSupplierErrors((prev) => ({ ...prev, ...errs }));
      return;
    }

    const vendorOutletPairs = new Set();
    const duplicateErrs = {};
    effectiveRows.forEach((row) => {
      (row.outletIds || []).forEach((outId) => {
        const pairKey = `${row.supplierId}__${outId}`;
        if (vendorOutletPairs.has(pairKey)) {
          duplicateErrs[row.rowId] = 'Duplicate vendor outlet assignment.';
        }
        vendorOutletPairs.add(pairKey);
      });
    });

    if (Object.keys(duplicateErrs).length > 0) {
      setSupplierErrors((prev) => ({ ...prev, ...duplicateErrs }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('nameEnglish', form.nameEnglish);
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

      effectiveRows.forEach((row, vIndex) => {
        if (row.supplierId) formData.append(`vendorPriceConfigs[${vIndex}].vendorId`, Number(row.supplierId));
        if (row.id) formData.append(`vendorPriceConfigs[${vIndex}].id`, Number(row.id));
        if (row.from) formData.append(`vendorPriceConfigs[${vIndex}].fromDate`, formatDateForBackend(row.from));
        if (row.to) formData.append(`vendorPriceConfigs[${vIndex}].toDate`, formatDateForBackend(row.to));
        if (row.price !== '') formData.append(`vendorPriceConfigs[${vIndex}].price`, Number(row.price));

        (row.outletIds || []).forEach((outId, oIndex) => {
          formData.append(`vendorPriceConfigs[${vIndex}].outletPrices[${oIndex}]?.organizationId`, Number(outId));
          if (row.price !== '') formData.append(`vendorPriceConfigs[${vIndex}].outletPrices[${oIndex}]?.price`, Number(row.price));
          if (row.from) formData.append(`vendorPriceConfigs[${vIndex}].outletPrices[${oIndex}]?.fromDate`, formatDateForBackend(row.from));
          if (row.to) formData.append(`vendorPriceConfigs[${vIndex}].outletPrices[${oIndex}]?.toDate`, formatDateForBackend(row.to));
        });
      });

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

  const filteredSuppliers = supplierOptions.filter((item) =>
    (item.fullName || item.name || '').toLowerCase().includes(supplierSearch.trim().toLowerCase())
  );

  if (loadingItem) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-[#667085]">Loading raw material...</div>
      </div>
    );
  }

  const approvedCount = approvalTargetRows.filter(
    (r) => String(r.status || '').toUpperCase() === 'APPROVED'
  ).length;

  const rejectedCount = approvalTargetRows.filter(
    (r) => String(r.status || '').toUpperCase() === 'REJECTED'
  ).length;

  return (
    <Container>
      <div>
        <div className="mx-auto p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mb-2">
            <span className="cursor-pointer hover:text-blue-300" onClick={() => navigate('/')}>Dashboard</span>
            <ChevronRight size={12} />
            <span>Raw Material</span>
            <ChevronRight size={12} />
            <span className="cursor-pointer hover:text-blue-300" onClick={() => navigate(-1)}>Raw Material Items</span>
            <ChevronRight size={12} />
            <span className="text-[#084E92] font-medium">
              {isApprovalMode
                ? isApprovalRowModified
                  ? 'Update & Review Item'
                  : 'Review Vendor Price'
                : isViewOnly
                  ? 'View Item'
                  : editData
                    ? 'Edit Item'
                    : 'Add Item'}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-[#C3C6D1]">
            <div className="flex gap-2 items-center">
              <div>
                <h2 className="text-[28px] font-bold text-[#101828] text-start">
                  {isApprovalMode
                    ? isApprovalRowModified
                      ? 'Update & Submit Vendor Price Decision'
                      : 'Review Raw Material Vendor Price'
                    : isViewOnly
                      ? 'View Raw Material Item'
                      : editData
                        ? 'Edit Raw Material Item'
                        : 'Add New Raw Material Item'}
                </h2>
                <p className="text-xs text-gray-500 pb-5">
                  {isApprovalMode
                    ? isApprovalRowModified
                      ? 'Modifications detected. Click submit to save updates and register the chosen statuses.'
                      : 'Set status to Approved or Rejected for each outlet below.'
                    : isViewOnly
                      ? 'View material properties and supplier associations'
                      : editData
                        ? 'Update material properties and supplier associations'
                        : 'Configure material properties and supplier associations'}
                </p>
              </div>
            </div>
          </div>

          <div className="py-6 flex-1 overflow-y-auto space-y-6">
            {/* Section 1: Basic Information */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#00376C] border-b border-gray-100 pb-2.5">
                Basic Information
              </h3>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Raw Material Name <span className="text-red-500">*</span>
                </label>
                <Input
                  disabled={isApprovalMode || isViewOnly}
                  placeholder="e.g. High-Grade Aluminum Ingots"
                  className="h-10 text-sm border-[#C3C6D1] rounded-lg focus-visible:ring-1 focus-visible:ring-[#00376C] disabled:bg-gray-100"
                  value={form.nameEnglish}
                  onChange={(e) => set('nameEnglish', e.target.value)}
                />
                {errors.nameEnglish && (
                  <p className="text-red-500 text-xs mt-1">{errors.nameEnglish}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        disabled={isApprovalMode || isViewOnly}
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
                        placeholder="Select Category"
                        error={!!errors.rawMaterialCatId}
                      />
                    </div>
                    {!isApprovalMode && !isViewOnly && (
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
                        disabled={isApprovalMode || isViewOnly || !form.rawMaterialCatId || loadingSubCategories}
                      />
                    </div>
                    {!isApprovalMode && !isViewOnly && (
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
                        disabled={isApprovalMode || isViewOnly}
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
                    {!isApprovalMode && !isViewOnly && (
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
                        disabled={isApprovalMode || isViewOnly}
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
                    {!isApprovalMode && !isViewOnly && (
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
                    disabled={isApprovalMode || isViewOnly}
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
                    disabled={isApprovalMode || isViewOnly}
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
                    disabled={isApprovalMode || isViewOnly}
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
                    disabled={isApprovalMode || isViewOnly}
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
                      disabled={isApprovalMode || isViewOnly}
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
                      disabled={isApprovalMode || isViewOnly}
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
                  if (!isApprovalMode && !isViewOnly) imageRef.current?.click();
                }}
                className={`border-2 border-dashed border-[#C3C6D1] bg-gray-50/60 rounded-xl h-44 flex flex-col items-center justify-center transition ${
                  isApprovalMode || isViewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100/70'
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
                disabled={isApprovalMode || isViewOnly}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Supplier Section */}
            <div className="mt-8">
              <h3 className="font-semibold text-[#00376C] mb-4">
                Vendor Association
              </h3>

              {isApprovalMode && (
                <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-lg border border-[#C3C6D1] bg-[#EEF4FF] px-4 py-3 text-sm text-[#00376C]">
                  <div>
                    Reviewing price for{' '}
                    <span className="font-semibold">
                      {approvalTargetRows[0]?.name || approvalVendorName || 'this vendor'}
                    </span>{' '}
                    at{' '}
                    <span className="font-semibold">
                      {approvalOutletName || 'the selected outlet(s)'}
                    </span>
                    . {isApprovalRowModified
                      ? 'You have modified fields in this row. Click submit to save updates and apply status.'
                      : 'Set status to Approved or Rejected for each outlet and submit.'}
                  </div>

                  {approvalTargetRows.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-gray-600">All ({approvalTargetRows.length}):</span>
                      <button
                        type="button"
                        onClick={() => handleApplyAllStatus('APPROVED')}
                        className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition cursor-pointer"
                      >
                        Approve All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyAllStatus('REJECTED')}
                        className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition cursor-pointer"
                      >
                        Reject All
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!isApprovalMode && !isViewOnly && (
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
                            className="flex-1 bg-transparent px-3 py-2 outline-none text-sm"
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
                            const assignedOutlets = new Set();
                            supplierRows.forEach((row) => {
                              if (String(row.supplierId) === String(item.id)) {
                                (row.outletIds || []).forEach((outId) => assignedOutlets.add(String(outId)));
                              }
                            });

                            const isFullyAssigned = isOutletUser
                              ? assignedOutlets.has(String(outletUserOutletId))
                              : outletList.length > 0 && assignedOutlets.size >= outletList.length;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                disabled={isFullyAssigned}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => toggleSupplierSelection(item.id)}
                                className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                                  isChecked ? 'bg-blue-50 text-primary font-medium' : 'text-gray-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked || isFullyAssigned}
                                  readOnly
                                  className="pointer-events-none accent-[#00376C]"
                                />
                                <span className="flex-1 min-w-0 truncate">
                                  {item.fullName || item.name}
                                </span>
                                {isFullyAssigned && (
                                  <span className="text-xs text-gray-400 shrink-0">
                                    All outlets assigned
                                  </span>
                                )}
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
                    type="button"
                    onClick={handleAddSupplier}
                    disabled={selectedSupplierIds.length === 0}
                    className="bg-[#00376C] text-white px-5 py-3 text-sm rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Users size={16} />
                    Add Vendor
                  </button>
                </div>
              )}

              <div className="border rounded-xl min-h-40 mt-4 overflow-hidden">
                {supplierRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#EEF4FF] text-[#00376C]">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium">Vendor Name</th>
                          <th className="text-left px-4 py-2.5 font-medium">Outlets</th>
                          <th className="text-left px-4 py-2.5 font-medium">From</th>
                          <th className="text-left px-4 py-2.5 font-medium">To</th>
                          <th className="text-left px-4 py-2.5 font-medium">Price</th>
                          <th className="text-left px-4 py-2.5 font-medium">Status</th>
                          {!isApprovalMode && !isViewOnly && <th className="px-4 py-2.5" />}
                        </tr>
                      </thead>
                      <tbody>
                        {supplierRows.map((row) => {
                          const isTargetRow = isApprovalMode && approvalTargetRowIds.has(row.rowId);
                          const isRowPermitted = isRowWithinUserScope(row);
                          const isRowEditable = !isViewOnly && isRowPermitted && (!isApprovalMode || isTargetRow);

                          return (
                            <tr
                              key={row.rowId}
                              className={`border-t hover:bg-gray-50/50 ${
                                isTargetRow ? 'bg-blue-50/30' : ''
                              } ${!isRowPermitted ? 'opacity-80 bg-gray-50/40' : ''}`}
                            >
                              <td className="px-4 py-2 font-medium">{row.name}</td>

                              <td className="px-4 py-2 min-w-55">
                                {isOutletUser || isApprovalMode || isViewOnly || !isRowPermitted ? (
                                  <div className="w-full border rounded-md px-3 py-1.5 bg-gray-100 text-gray-600 text-xs cursor-not-allowed">
                                    {(row.outletIds || [])
                                      .map((oid, index) => {
                                        const fromList = outletList.find((o) => String(o.id) === String(oid))?.name;
                                        if (fromList) return fromList;

                                        const fromRow = row.outletNames?.[index];
                                        if (fromRow) return fromRow;

                                        return `Outlet #${oid}`;
                                      })
                                      .join(', ') || '—'}
                                  </div>
                                ) : (
                                  <TableOutletMultiSelect
                                    options={getOutletOptionsForRow(row)}
                                    selected={row.outletIds || []}
                                    onChange={(newOutlets) => updateSupplierOutlets(row.rowId, newOutlets)}
                                    disabled={outletsLoading}
                                    error={Boolean(supplierErrors[row.rowId])}
                                  />
                                )}

                                {supplierErrors[row.rowId] && !supplierErrors[row.rowId]?.includes('Price') && (
                                  <p className="mt-1 text-xs text-red-500 font-medium">
                                    {supplierErrors[row.rowId]}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  disabled={!isRowEditable}
                                  value={row.from}
                                  onChange={(e) => updateSupplierRow(row.rowId, 'from', e.target.value)}
                                  className="w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100"
                                />
                              </td>

                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  disabled={!isRowEditable}
                                  value={row.to}
                                  onChange={(e) => updateSupplierRow(row.rowId, 'to', e.target.value)}
                                  className="w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100"
                                />
                              </td>

                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  disabled={!isRowEditable}
                                  value={row.price}
                                  onWheel={blurOnWheel}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) {
                                      updateSupplierRow(row.rowId, 'price', val);
                                    }
                                  }}
                                  placeholder="₹ 0.00"
                                  className={`w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100 ${
                                    Number(row.price) < 0 || supplierErrors[row.rowId]?.includes('Price')
                                      ? 'border-red-500 bg-red-50/20'
                                      : 'border-[#C3C6D1]'
                                  }`}
                                />
                                {supplierErrors[row.rowId]?.includes('Price') && (
                                  <p className="text-[10px] text-red-500 font-medium mt-0.5">
                                    {supplierErrors[row.rowId]}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-2">
                                {isTargetRow && isRowPermitted ? (
                                  <StatusSelect
                                    status={row.status}
                                    onChange={(value) => updateSupplierRow(row.rowId, 'status', value)}
                                  />
                                ) : (
                                  <StatusBadge status={row.status} />
                                )}
                              </td>

                              {!isApprovalMode && !isViewOnly && (
                                <td className="px-4 py-2 text-right">
                                  {isRowPermitted && (
                                    <button
                                      type="button"
                                      onClick={() => removeSupplierRow(row.rowId)}
                                      className="text-gray-400 hover:text-red-500 cursor-pointer"
                                      title="Remove vendor"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col justify-center items-center p-4">
                    <h4 className="font-semibold text-[#00376C]">No vendors linked yet</h4>
                    <p className="text-sm text-gray-500 text-center">
                      {isVendorPriceApprovalView
                        ? `No ${approvalViewStatus ? approvalViewStatus.toLowerCase() : ''} vendors found for this raw material item.`
                        : 'Link vendors to this material to automate procurement workflows.'}
                    </p>
                  </div>
                )}
              </div>
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
                  disabled={isApprovalMode && !canApproveOrReject}
                  className={`px-5 py-2 rounded-lg transition ${
                    isApprovalMode && !canApproveOrReject
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#00376C] text-white cursor-pointer hover:bg-[#002750]'
                  }`}
                >
                  {isApprovalMode
                    ? [
                        approvedCount > 0 ? `Approve (${approvedCount})` : null,
                        rejectedCount > 0 ? `Reject (${rejectedCount})` : null,
                      ]
                        .filter(Boolean)
                        .join(' & ') || 'Submit'
                    : editData
                      ? 'Update Material'
                      : 'Save Material'}
                </button>
              )}
            </div>
          </div>
        </div>

        {isCategoryModalOpen && (
          <AddRawMaterialCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            onSaved={async (newCat) => {
              const norm = normalizeCategory(newCat) || newCat;
              await fetchCategories(norm || null);
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