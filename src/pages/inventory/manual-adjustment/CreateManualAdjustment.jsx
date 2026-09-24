import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info,
  LayoutList,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Loader2,
  AlertTriangle,
  FileText,
  Layers,
  Send,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import { useNavigate, Link } from 'react-router';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  getAllRawMaterialCategory,
  getAllRawMaterialItems,
  getAllSubOutlets,
  getOrganizationByType,
  saveAdjustment,
  postAdjustment,
  postBulkAdjustment,
  getCurrentStockListGet,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getOrgIdFromToken, getUserIdFromToken } from '@/utils/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const extractStockInfo = (item) => {
  const stockObj = item?.currentStock;
  let currentStock = 0;
  let unitName = item?.unit?.nameEnglish || item?.unitName || item?.unit || 'Units';
  let unitId = item?.unitId ?? item?.unit?.id ?? 0;

  if (typeof stockObj === 'object' && stockObj !== null) {
    currentStock = Number(stockObj.currentStock ?? 0);
    if (stockObj.unitName) unitName = stockObj.unitName;
    else if (stockObj.unitSymbol) unitName = stockObj.unitSymbol;
    if (stockObj.unitId != null) unitId = stockObj.unitId;
  } else if (typeof stockObj === 'number') {
    currentStock = stockObj;
  } else {
    currentStock = Number(item?.closingStock ?? item?.opbStock ?? item?.stock ?? item?.availableStock ?? item?.actualStock ?? 0);
  }

  return { currentStock, unitName, unitId };
};

const extractRateInfo = (item) => {
  const rate =
    item?.unitRate ??
    item?.supplierRate ??
    item?.rate ??
    item?.price ??
    item?.currentStock?.unitRate ??
    item?.currentStock?.rate ??
    '';
  return rate !== '' && rate !== null && rate !== undefined ? Number(rate) : '';
};

const mapCategory = (item) => ({
  value: String(item.id),
  label: item.nameEnglish || item.categoryName || item.name || item.label,
});

const normalizeUnit = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || item.name || `Outlet #${item.id}`,
  code: item.companyCode || item.code || '',
  originalData: item,
});

const normalizeSubUnit = (item) => ({
  id: item.id,
  name: item.subOutletName || item.name || `Sub-Outlet #${item.id}`,
  code: item.subOutletCode || item.companyCode || item.code || '',
  organizationId: item.organizationId ?? item.outletId ?? item.outlet?.id,
  status: item.status || (item.isActive !== false ? 'active' : 'inactive'),
  originalData: item,
});

const UNIT_BADGE_STYLES = {
  MT: 'bg-gray-100 text-gray-700 border-gray-200',
  PCS: 'bg-blue-50 text-[#084E92] border-blue-200',
  PIECES: 'bg-blue-50 text-[#084E92] border-blue-200',
  BOX: 'bg-amber-50 text-amber-700 border-amber-200',
  KG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KILOGRAM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KILOGRAMS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LTR: 'bg-purple-50 text-purple-700 border-purple-200',
  LITRE: 'bg-purple-50 text-purple-700 border-purple-200',
  LITRES: 'bg-purple-50 text-purple-700 border-purple-200',
  MTR: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  METER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  METERS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  GRAM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GRAMS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  G: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const UnitBadge = ({ unit }) => {
  const label = unit || 'Units';
  const key = String(label).toUpperCase().trim();
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-mono font-medium uppercase border whitespace-nowrap ${
        UNIT_BADGE_STYLES[key] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {label}
    </span>
  );
};

const formatQty = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CreateManualAdjustment = () => {
  const navigate = useNavigate();

  // Role Scoping & Permissions
  const { canAdd, canView } = usePagePermissions('Manual Adjustment');
  const {
    loading: scopeLoading,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units: scopeUnits,
    effectiveOutletId,
  } = useOrgScope();

  /* Header fields */
  const [manageDate, setManageDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [outlet, setOutlet] = useState('');
  const [subOutlet, setSubOutlet] = useState('');
  const [category, setCategory] = useState('');

  /* Auxiliary data */
  const [allOutlets, setAllOutlets] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [subUnitsLoading, setSubUnitsLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  /* Raw Material Items for category */
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  /* Adjustment rows in manifest */
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  /* Pending Location Change Confirmation Modal */
  const [pendingOrgChange, setPendingOrgChange] = useState(null);

  // Auto-set Outlet for Outlet User once scope is resolved
  useEffect(() => {
    if (!scopeLoading) {
      if (isOutletUser && effectiveOutletId) {
        setOutlet(String(effectiveOutletId));
      } else if (!isOutletUser) {
        setOutlet('');
      }
    }
  }, [isOutletUser, effectiveOutletId, scopeLoading]);

  /* 1. Fetch Outlets */
  useEffect(() => {
    const fetchOutlets = async () => {
      setUnitsLoading(true);
      try {
        const res = await getOrganizationByType(OrgTypes.OUTLET);
        const list = res?.data?.data || res?.data?.content || res?.data || [];
        setAllOutlets((Array.isArray(list) ? list : []).map(normalizeUnit));
      } catch (err) {
        console.error('Failed to load outlets:', err);
        setAllOutlets([]);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  /* 2. Fetch Sub-Outlets */
  useEffect(() => {
    const fetchSubUnits = async () => {
      setSubUnitsLoading(true);
      try {
        const res = await getAllSubOutlets();
        const list = res?.data?.data || res?.data?.content || res?.data || [];
        setSubUnits((Array.isArray(list) ? list : []).map(normalizeSubUnit));
      } catch (err) {
        console.error('Failed to load sub outlets:', err);
        setSubUnits([]);
      } finally {
        setSubUnitsLoading(false);
      }
    };
    fetchSubUnits();
  }, []);

  /* Outlet Options based on Role Scope */
  const outletOptions = useMemo(() => {
    if (isCompanyUser) {
      return (scopeUnits || []).map((u) => ({
        value: String(u.id),
        label: `${u.name}${u.code ? ` (${u.code})` : ''}`,
      }));
    }
    if (scopeUnits && scopeUnits.length > 0) {
      return scopeUnits.map((u) => ({
        value: String(u.id),
        label: `${u.name}${u.code ? ` (${u.code})` : ''}`,
      }));
    }
    return allOutlets.map((unit) => ({
      value: String(unit.id),
      label: `${unit.name}${unit.code ? ` (${unit.code})` : ''}`,
    }));
  }, [isCompanyUser, scopeUnits, allOutlets]);

  /* Sub-Outlet Options based on selected Outlet / Logged-in Outlet */
  const subOutletOptions = useMemo(() => {
    const targetOutletId = outlet || (isOutletUser ? effectiveOutletId : null);
    if (!targetOutletId) return [];
    return subUnits
      .filter(
        (sub) =>
          sub.status === 'active' &&
          String(sub.organizationId) === String(targetOutletId)
      )
      .map((sub) => ({
        value: String(sub.id),
        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
      }));
  }, [subUnits, outlet, isOutletUser, effectiveOutletId]);

  /* 3. Fetch Raw Material Categories only when Outlet is selected/resolved */
  const fetchCategories = useCallback(async () => {
    const activeOutlet = outlet || (isOutletUser ? effectiveOutletId : '');
    if (!isOutletUser && !activeOutlet) {
      setCategories([]);
      return;
    }

    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const res = await getAllRawMaterialCategory(0);
      const raw = res?.data?.data?.['Raw Material Category Details'] || res?.data?.data || res?.data || [];
      const list = Array.isArray(raw) ? raw : [];
      setCategories(list.map(mapCategory));
    } catch (err) {
      console.error('Failed to load raw material categories:', err);
      setCategoriesError('Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [outlet, isOutletUser, effectiveOutletId]);

  useEffect(() => {
    const activeOutlet = outlet || (isOutletUser ? effectiveOutletId : '');
    if (activeOutlet) {
      fetchCategories();
    } else {
      setCategories([]);
      setCategory('');
      setItems([]);
    }
  }, [outlet, isOutletUser, effectiveOutletId, fetchCategories]);

  /* 4. Fetch Raw Material Items when Category or Outlet changes */
  const fetchItems = useCallback(async () => {
    if (!category) {
      setItems([]);
      return;
    }

    setItemsLoading(true);
    try {
      const targetOrg = outlet || (isOutletUser ? effectiveOutletId : '') || getOrgIdFromToken() || '';
      const targetSub = subOutlet || '';
      const res = await getAllRawMaterialItems(Number(category), 0, '', '', '', '', targetOrg, targetSub);
      const raw = res?.data?.data?.['Raw Material Details'] || res?.data?.data || res?.data || [];
      const rawList = Array.isArray(raw) ? raw : [];

      const mapped = rawList.map((item) => {
        const { currentStock, unitName, unitId } = extractStockInfo(item);
        const rate = extractRateInfo(item);
        return {
          id: item.id,
          sku: item.sku || item.itemCode || item.code || `RM-${String(item.id).padStart(4, '0')}`,
          itemName: item.nameEnglish || item.name || `Item #${item.id}`,
          category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
          unit: unitName,
          unitId: unitId,
          unitRate: rate,
          actualStock: currentStock,
          originalData: item,
        };
      });

      setItems(mapped);

      // If rows are already added in manifest, update their actualStock & unitRate for the new organization
      setRows((prevRows) => {
        if (prevRows.length === 0) return prevRows;
        return prevRows.map((r) => {
          const matching = mapped.find((m) => Number(m.id) === Number(r.id));
          if (matching) {
            return {
              ...r,
              actualStock: matching.actualStock,
              unit: matching.unit || r.unit,
              unitId: matching.unitId || r.unitId,
              unitRate: r.unitRate !== '' && r.unitRate !== undefined ? r.unitRate : matching.unitRate,
            };
          }
          return r;
        });
      });
    } catch (err) {
      console.error('Failed to load raw material items:', err);
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, [category, outlet, subOutlet, isOutletUser, effectiveOutletId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* Dynamic stock recalculation when source organization or sub-outlet changes */
  const handleSourceOrgChange = async (targetOrgId, targetSubOutletId) => {
    if (!category) return;
    setItemsLoading(true);
    try {
      const res = await getAllRawMaterialItems(
        Number(category),
        0,
        '',
        '',
        '',
        '',
        targetOrgId || '',
        targetSubOutletId || ''
      );
      const raw = res?.data?.data?.['Raw Material Details'] || res?.data?.data || res?.data || [];
      const rawList = Array.isArray(raw) ? raw : [];

      const mapped = rawList.map((item) => {
        const { currentStock, unitName, unitId } = extractStockInfo(item);
        const rate = extractRateInfo(item);
        return {
          id: item.id,
          sku: item.sku || item.itemCode || item.code || `RM-${String(item.id).padStart(4, '0')}`,
          itemName: item.nameEnglish || item.name || `Item #${item.id}`,
          category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
          unit: unitName,
          unitId: unitId,
          unitRate: rate,
          actualStock: currentStock,
          originalData: item,
        };
      });

      setItems(mapped);

      if (rows.length > 0 && targetOrgId) {
        const itemIds = rows.map((r) => r.id).filter(Boolean);
        try {
          const params = {
            itemIds,
            itemType: 'RAW_MATERIAL',
            organizationId: Number(targetOrgId),
          };
          if (targetSubOutletId) {
            params.subOutletId = Number(targetSubOutletId);
          }
          const stockRes = await getCurrentStockListGet(params);
          const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
          const stockList = Array.isArray(stockData)
            ? stockData
            : Array.isArray(stockData?.content)
            ? stockData.content
            : Array.isArray(stockData?.list)
            ? stockData.list
            : [];

          setRows((prevRows) =>
            prevRows.map((r) => {
              const matchedStock = stockList.find(
                (s) => Number(s.itemId || s.id) === Number(r.id)
              );
              if (matchedStock) {
                return {
                  ...r,
                  actualStock: Number(matchedStock.currentStock ?? 0),
                  unit: matchedStock.unitName || matchedStock.unitSymbol || r.unit,
                  unitId: matchedStock.unitId || r.unitId,
                };
              }
              const matchedRaw = mapped.find((m) => Number(m.id) === Number(r.id));
              if (matchedRaw) {
                return {
                  ...r,
                  actualStock: matchedRaw.actualStock,
                  unit: matchedRaw.unit || r.unit,
                  unitId: matchedRaw.unitId || r.unitId,
                  unitRate: r.unitRate !== '' && r.unitRate !== undefined ? r.unitRate : matchedRaw.unitRate,
                };
              }
              return r;
            })
          );
        } catch (stockErr) {
          console.error('Failed to fetch current stock list:', stockErr);
          setRows((prevRows) =>
            prevRows.map((r) => {
              const matchedRaw = mapped.find((m) => Number(m.id) === Number(r.id));
              return matchedRaw ? { ...r, actualStock: matchedRaw.actualStock } : r;
            })
          );
        }
      }
    } catch (err) {
      console.error('Failed to update items and stock for new location:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleOutletChange = (newOutlet) => {
    if (String(newOutlet) === String(outlet)) return;
    const unitObj = allOutlets.find((u) => String(u.id) === String(newOutlet));
    const targetName = unitObj?.name || 'selected outlet';

    if (rows.length > 0) {
      setPendingOrgChange({
        type: 'outlet',
        targetOrgId: newOutlet,
        targetSubOutletId: '',
        targetName,
      });
    } else {
      setOutlet(newOutlet);
      setSubOutlet('');
      handleSourceOrgChange(newOutlet, '');
    }
  };

  const handleSubOutletChange = (newSub) => {
    if (String(newSub) === String(subOutlet)) return;
    const subObj = subUnits.find((s) => String(s.id) === String(newSub));
    const parentOrg = outlet || (isOutletUser ? effectiveOutletId : '');
    const targetName = subObj?.name || (newSub ? 'selected sub-outlet' : 'main store');

    if (rows.length > 0) {
      setPendingOrgChange({
        type: 'subOutlet',
        targetOrgId: parentOrg,
        targetSubOutletId: newSub,
        targetName,
      });
    } else {
      setSubOutlet(newSub);
      handleSourceOrgChange(parentOrg, newSub);
    }
  };

  const handleConfirmOrgChange = async () => {
    if (!pendingOrgChange) return;
    const { type, targetOrgId, targetSubOutletId } = pendingOrgChange;
    if (type === 'outlet') {
      setOutlet(targetOrgId);
      setSubOutlet('');
    } else if (type === 'subOutlet') {
      setSubOutlet(targetSubOutletId);
    }
    setPendingOrgChange(null);
    await handleSourceOrgChange(targetOrgId, targetSubOutletId);
  };

  const handleCancelOrgChange = () => {
    setPendingOrgChange(null);
  };

  /* Options for Search / Select Item dropdown */
  const itemOptions = useMemo(() => {
    return items
      .filter((item) => !rows.some((row) => Number(row.id) === Number(item.id)))
      .map((item) => ({
        value: String(item.id),
        label: `${item.itemName} (${item.sku}) — Stock: ${formatQty(item.actualStock)} ${item.unit}${
          item.unitRate ? ` | ₹${Number(item.unitRate).toFixed(2)}` : ''
        }`,
        item,
      }));
  }, [items, rows]);

  /* Add an item to adjustment manifest */
  const handleAddItem = (item) => {
    if (!item) return;
    const newRow = {
      id: item.id,
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      unitId: item.unitId,
      actualStock: item.actualStock,
      unitRate: item.unitRate !== undefined && item.unitRate !== null ? item.unitRate : '',
      physicalStock: '',
      remarks: '',
    };

    setRows((prev) => {
      if (prev.some((row) => Number(row.id) === Number(item.id))) return prev;
      return [...prev, newRow];
    });
  };

  /* Remove an item from adjustment manifest */
  const handleRemoveItem = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  /* Update physicalStock, unitRate, or remarks in a row */
  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'physicalStock' && value !== '') {
          const actual = Number(row.actualStock || 0);
          const numVal = Number(value);
          if (actual <= 0 && numVal < actual) {
            toast.error(`Cannot decrease stock for ${row.itemName} when current stock is 0`);
            return row;
          }
        }
        return { ...row, [field]: value };
      })
    );
  };

  /* Single Adjustment Delta Calculation: Physical Stock - Actual Stock */
  const getAdjustmentDelta = (row) => {
    if (row.physicalStock === '' || row.physicalStock === null || row.physicalStock === undefined) {
      return null;
    }
    const physical = Number(row.physicalStock);
    const actual = Number(row.actualStock || 0);
    return physical - actual;
  };

  /* Cancel Action */
  const handleCancel = () => {
    navigate('/inventory/manual-adjustment-listing');
  };

  /* Save / Post Directly Action */
  const handleSave = async (postDirectly = false) => {
    const targetOutletId = outlet || (isOutletUser ? effectiveOutletId : null);
    if (!targetOutletId) {
      toast.error('Please select an Outlet');
      return;
    }

    if (rows.length === 0) {
      toast.error('Please add at least one item to adjust');
      return;
    }

    const adjustedRows = rows.filter(
      (row) => row.physicalStock !== '' && row.physicalStock !== null && row.physicalStock !== undefined
    );

    if (adjustedRows.length === 0) {
      toast.error('Please enter physical stock quantity for at least one item');
      return;
    }

    // Validate non-negative quantities, decrease on zero stock, and rates
    for (const r of adjustedRows) {
      const actual = Number(r.actualStock || 0);
      const physical = Number(r.physicalStock);
      const delta = physical - actual;

      if (actual <= 0 && delta < 0) {
        toast.error(`Cannot decrease stock for ${r.itemName} as current stock is 0`);
        return;
      }
      if (physical < 0) {
        toast.error(`Physical stock quantity cannot be negative for ${r.itemName}`);
        return;
      }
      if (r.unitRate !== '' && r.unitRate !== null && Number(r.unitRate) < 0) {
        toast.error(`Unit rate cannot be negative for ${r.itemName}`);
        return;
      }
    }

    setSaving(true);
    try {
      const currentUserId = Number(getUserIdFromToken() || localStorage.getItem('userId') || 0);

      const payload = {
        organizationId: Number(targetOutletId),
        subOutletId: subOutlet ? Number(subOutlet) : null,
        adjustmentDate: manageDate,
        remarks: 'Manual Stock Adjustment',
        postDirectly: Boolean(postDirectly),
        userId: currentUserId || undefined,
        createdBy: currentUserId || undefined,
        items: adjustedRows.map((row) => {
          const actualStockVal = Number(row.actualStock ?? row.currentStock ?? 0);
          const physicalStockVal = Number(row.physicalStock ?? 0);
          const delta = physicalStockVal - actualStockVal;
          const absDelta = Math.abs(delta);
          return {
            adjustmentType: delta >= 0 ? 'ADDITION' : 'DEDUCTION',
            rawMaterialId: Number(row.id),
            itemId: Number(row.id),
            itemType: 'RAW_MATERIAL',
            unitId: Number(row.unitId || 0),
            unitRate: Number(row.unitRate || 0),
            currentStock: actualStockVal,
            afterAdjustmentStock: physicalStockVal,
            adjustmentQuantity: absDelta,
            remarks: row.remarks || '',
          };
        }),
      };

      await saveAdjustment(payload);
      if (postDirectly) {
        toast.success('Manual stock adjustment created and stock updated directly');
      } else {
        toast.success('Manual stock adjustment saved successfully as draft');
      }

      navigate('/inventory/manual-adjustment-listing');
    } catch (err) {
      console.error('Failed to save manual adjustment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to save manual stock adjustment';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!canAdd) {
    return <AccessDenied pageTitle="Manual Adjustment" />;
  }

  return (
    <Container>
      <div className="p-4 md:p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Inventory</span>
          <ChevronRight size={12} />
          <Link
            to="/inventory/manual-adjustment-listing"
            className="hover:text-[#084E92] transition-colors cursor-pointer"
          >
            Manual Adjustment
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-semibold">Create</span>
        </div>

        {/* Page Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Manual Adjustment Creation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Reconcile physical inventory discrepancies with audit ledger entries
            </p>
          </div>
        </div>

        {/* Adjustment Details Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0]">
            <div className="w-9 h-9 rounded-lg bg-[#EFF4FF] flex items-center justify-center shrink-0">
              <SlidersHorizontal size={16} className="text-[#084E92]" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] text-sm">Adjustment Details</p>
              <p className="text-xs text-gray-400">Warehouse location and category routing parameters</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Row 1: Date, Outlet, Sub-Outlet */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                isOutletUser ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
              } gap-4`}
            >
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  MANAGE DATE <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={manageDate}
                    onChange={(e) => setManageDate(e.target.value)}
                    className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 outline-none text-xs font-medium text-[#0F172A] focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                  />
                </div>
              </div>

              {/* Outlet: Only rendered for non-outlet users */}
              {!isOutletUser && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    OUTLET <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={outletOptions}
                    value={outlet}
                    onChange={(e) => handleOutletChange(e.target.value)}
                    placeholder={unitsLoading ? 'Loading outlets...' : 'Select Outlet'}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  SUB-OUTLET <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                </label>
                <SearchableSelect
                  options={subOutletOptions}
                  value={subOutlet}
                  onChange={(e) => handleSubOutletChange(e.target.value)}
                  disabled={(!isOutletUser && !outlet) || subUnitsLoading}
                  placeholder={
                    !isOutletUser && !outlet
                      ? 'Select Outlet first'
                      : subUnitsLoading
                      ? 'Loading sub outlets...'
                      : 'Select Sub-Outlet'
                  }
                />
              </div>
            </div>

            {/* Row 2: Category & Search/Add Item */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  CATEGORY <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={categories}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                  }}
                  disabled={(!isOutletUser && !outlet) || categoriesLoading}
                  placeholder={
                    !isOutletUser && !outlet
                      ? 'Select Outlet first'
                      : categoriesLoading
                      ? 'Loading categories...'
                      : 'Select Category'
                  }
                />
                {categoriesError && <p className="text-xs text-red-500 mt-1">{categoriesError}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  SEARCH & ADD ITEM
                </label>
                <SearchableSelect
                  options={itemOptions}
                  value=""
                  onChange={(e) => {
                    const selectedItem = items.find(
                      (item) => String(item.id) === String(e.target.value)
                    );
                    if (selectedItem) {
                      handleAddItem(selectedItem);
                    }
                  }}
                  disabled={(!isOutletUser && !outlet) || !category || itemsLoading}
                  placeholder={
                    !isOutletUser && !outlet
                      ? 'Select Outlet first'
                      : !category
                      ? 'Select Category first'
                      : itemsLoading
                      ? 'Loading items...'
                      : 'Search item by SKU or name...'
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manual Adjustment Details Table Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EFF4FF] flex items-center justify-center shrink-0">
                <LayoutList size={16} className="text-[#084E92]" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] text-sm">Manual Adjustment Details</p>
                <p className="text-xs text-gray-400">
                  Reconcile physical stock against actual recorded inventory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-3 py-1 rounded-full bg-gray-100 font-medium text-gray-700">
                Items loaded: <span className="font-bold text-[#084E92]">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
              </span> 
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">ITEM NAME</th>
                  <th className="px-4 py-3.5">CATEGORY</th>
                  <th className="px-4 py-3.5">UNIT</th>
                  <th className="px-4 py-3.5">ACTUAL STOCK</th>
                  <th className="px-4 py-3.5 min-w-[120px]">UNIT RATE (₹)</th>
                  <th className="px-4 py-3.5 min-w-[140px]">PHYSICAL STOCK</th>
                  <th className="px-4 py-3.5 min-w-[120px] text-center">ADJUSTMENT</th>
                  <th className="px-4 py-3.5 min-w-[180px]">REMARKS</th>
                  <th className="px-4 py-3.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      {!category
                        ? 'Select a category above and search items to start adjusting stock.'
                        : 'No items added to adjustment manifest yet. Use "SEARCH ITEM" above to add items.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const delta = getAdjustmentDelta(row);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-[#0F172A] text-xs">{row.itemName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 font-medium">{row.category || '—'}</td>
                        <td className="px-4 py-3.5">
                          <UnitBadge unit={row.unit} />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-gray-800 font-mono text-xs">
                          {formatQty(row.actualStock)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={row.unitRate ?? ''}
                              onChange={(e) => updateRow(row.id, 'unitRate', e.target.value)}
                              className="w-full h-9 border border-[#C3C6D1] rounded-lg pl-6 pr-2 outline-none text-xs font-mono font-medium focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Enter phy"
                            value={row.physicalStock}
                            onChange={(e) => updateRow(row.id, 'physicalStock', e.target.value)}
                            className="w-32 h-9 border border-[#C3C6D1] rounded-lg px-3 outline-none text-xs font-mono font-medium focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {delta === null ? (
                            <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-gray-50 text-gray-300 border border-gray-100">
                              —
                            </span>
                          ) : delta > 0 ? (
                            <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              + {formatQty(delta)}
                            </span>
                          ) : delta < 0 ? (
                            <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              - {formatQty(Math.abs(delta))}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                              0.00
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            type="text"
                            placeholder="Enter remarks..."
                            value={row.remarks}
                            onChange={(e) => updateRow(row.id, 'remarks', e.target.value)}
                            className="w-full h-9 border border-[#C3C6D1] rounded-lg px-3 outline-none text-xs text-gray-700 focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(row.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 flex-wrap">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#084E92] text-[#084E92] bg-white hover:bg-blue-50 text-xs font-semibold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold shadow-md hover:bg-[#073e77] transition disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Update Stock Directly
          </button>
        </div>

        {/* Confirmation Dialog for Location Change */}
        <Dialog open={Boolean(pendingOrgChange)} onOpenChange={(open) => !open && handleCancelOrgChange()}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">Change Warehouse Location?</DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Updating stock levels for manifest items
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="py-2 text-xs text-gray-600 leading-relaxed">
              Changing the location to <strong className="text-gray-900">{pendingOrgChange?.targetName}</strong> will recalculate and update the current available stock for the <strong className="text-gray-900">{rows.length} item{rows.length > 1 ? 's' : ''}</strong> in your adjustment manifest. Do you want to proceed?
            </div>
            <DialogFooter className="flex items-center justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={handleCancelOrgChange}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOrgChange}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] rounded-xl transition shadow-sm cursor-pointer"
              >
                Proceed & Update Stock
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
};

export default CreateManualAdjustment;
