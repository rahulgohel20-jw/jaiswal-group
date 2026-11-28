import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Trash2,
  Scale,
  Plus,
  Save,
  Check,
  Info,
  Loader2,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { QtyInput } from '@/components/production/QtyInput';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken, getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  SavePreWaste,
  getAllMealTypes,
  getAllProductionExecutions,
  getAllRawMaterialItems,
} from '@/services/apiServices';
import { extractPlanCatalog } from '../costing/productionCostingData';

const WASTE_TYPES = [
  { value: 'PEELING', label: 'Peeling' },
  { value: 'TRIMMING', label: 'Trimming' },
  { value: 'SPOILED', label: 'Spoiled' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'CUTTING', label: 'Cutting' },
  { value: 'EXCESS', label: 'Excess' },
  { value: 'OTHER', label: 'Other' },
];

const normalizeIncomingEntry = (item, idx) => {
  const issued = Number(item.issuedQuantity ?? item.totalQty ?? 0);
  const waste = Number(item.wasteQuantity ?? item.wasteQty ?? 0);
  const actual =
    item.actualUsedQuantity !== undefined && item.actualUsedQuantity !== null
      ? Number(item.actualUsedQuantity)
      : Math.max(0, Number((issued - waste).toFixed(3)));
  const wastePct =
    item.wastePercentage !== undefined && item.wastePercentage !== null
      ? Number(item.wastePercentage)
      : issued > 0
        ? Number(((waste / issued) * 100).toFixed(2))
        : 0;
  const rawType = String(item.wasteType || 'PEELING').toUpperCase();
  const validType = WASTE_TYPES.some((w) => w.value === rawType) ? rawType : 'PEELING';

  return {
    localKey: `entry-${item.id || idx}-${Date.now()}`,
    id: Number(item.id) || 0,
    rawMaterialId: Number(item.rawMaterialId) || 0,
    rawMaterialName:
      item.rawMaterialName || item.ingredient || (item.rawMaterialId ? `Material #${item.rawMaterialId}` : ''),
    uom: item.uomSymbol || item.uomName || item.uom || 'kg',
    issuedQuantity: issued,
    wasteQuantity: waste,
    actualUsedQuantity: actual,
    wastePercentage: wastePct,
    wasteType: validType,
    remarks: item.remarks || '',
  };
};

export const PreparationWasteEntry = () => {
  const navigate = useNavigate();
  const { planId } = useParams();
  const location = useLocation();
  const navState = location.state || {};
  const existingRecord = navState.prepWasteRecord || null;

  const { effectiveOutletId, selectedUnitId, selfOrg } = useOrgScope();
  const resolvedOrgId =
    Number(selectedUnitId || effectiveOutletId || selfOrg?.id || getOrgIdFromToken() || 0) || '';

  const initialPlanId =
    Number(navState.productionPlanId ?? existingRecord?.productionPlanId ?? planId ?? 0) || '';
  const [productionPlanId, setProductionPlanId] = useState(() =>
    initialPlanId ? String(initialPlanId) : ''
  );
  const [planCode, setPlanCode] = useState(
    navState.planCode || existingRecord?.planCode || ''
  );
  const [productionDate, setProductionDate] = useState(
    navState.productionDate || existingRecord?.productionDate || new Date().toISOString().split('T')[0]
  );
  const [kitchenName, setKitchenName] = useState(
    navState.kitchenLocationName || existingRecord?.kitchenLocationName || existingRecord?.kitchenName || ''
  );

  const [productionPlans, setProductionPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [mealTypes, setMealTypes] = useState([]);
  const [mealTypeId, setMealTypeId] = useState(() =>
    String(navState.mealTypeId ?? existingRecord?.mealTypeId ?? '')
  );

  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');

  const [entries, setEntries] = useState(() => {
    const incoming = Array.isArray(navState.entries)
      ? navState.entries
      : Array.isArray(existingRecord?.entries)
        ? existingRecord.entries
        : [];
    return incoming.map(normalizeIncomingEntry);
  });

  const [notes, setNotes] = useState(navState.notes || existingRecord?.notes || '');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Load Production Plans and Meal Types
  useEffect(() => {
    let isMounted = true;
    const loadDropdowns = async () => {
      setLoadingPlans(true);
      try {
        const [mtRes, execRes] = await Promise.all([
          getAllMealTypes(),
          getAllProductionExecutions({
            page: 0,
            size: 100,
            sortBy: 'createdAt',
            sortDirection: 'DESC',
          }).catch(() => null),
        ]);

        if (!isMounted) return;

        const mtData = mtRes?.data?.data ?? mtRes?.data ?? [];
        const mtList = Array.isArray(mtData) ? mtData : mtData?.items || [];
        setMealTypes(mtList);
        setMealTypeId((prev) => {
          if (prev) return prev;
          return mtList[0]?.id ? String(mtList[0].id) : '';
        });

        const execData = execRes?.data?.data ?? execRes?.data ?? {};
        const execRows = Array.isArray(execData.content)
          ? execData.content
          : Array.isArray(execData.items)
            ? execData.items
            : Array.isArray(execData)
              ? execData
              : [];

        const catalog = extractPlanCatalog(execRows, mtList);

        // Ensure navigated/editing plan remains selectable even if outside first page
        const initialIdNum = Number(initialPlanId || 0);
        if (initialIdNum > 0 && !catalog.some((p) => Number(p.id) === initialIdNum)) {
          catalog.unshift({
            id: initialIdNum,
            planCode: navState.planCode || existingRecord?.planCode || `PP-${initialIdNum}`,
            productionDate: navState.productionDate || existingRecord?.productionDate || '',
            kitchenName:
              navState.kitchenLocationName ||
              existingRecord?.kitchenLocationName ||
              existingRecord?.kitchenName ||
              '—',
            meals: [],
            hasSpecificMeals: false,
          });
        }

        setProductionPlans(catalog);

        // Sync metadata if opening via /plans/:planId/prep-waste without full navState
        if (initialIdNum > 0) {
          const matched = catalog.find((p) => Number(p.id) === initialIdNum);
          if (matched) {
            setPlanCode((prev) => prev || matched.planCode);
            setProductionDate((prev) =>
              navState.productionDate || existingRecord?.productionDate
                ? prev
                : matched.productionDate || prev
            );
            setKitchenName((prev) =>
              prev || (matched.kitchenName !== '—' ? matched.kitchenName : '')
            );
          }
        }
      } catch (err) {
        console.error('Failed to load production plans or meal types:', err);
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    };
    loadDropdowns();
    return () => {
      isMounted = false;
    };
  }, [initialPlanId, navState.planCode, navState.productionDate, navState.kitchenLocationName, existingRecord]);

  // Load Raw Materials for dropdown addition
  useEffect(() => {
    let isMounted = true;
    const loadRawMaterials = async () => {
      setLoadingRawMaterials(true);
      try {
        const res = await getAllRawMaterialItems(
          null,
          0,
          true,
          '',
          '',
          '',
          resolvedOrgId,
          ''
        );
        const list =
          res?.data?.data?.['Raw Material Details'] ||
          res?.data?.['Raw Material Details'] ||
          [];
        if (isMounted && Array.isArray(list)) {
          setRawMaterials(list);
        }
      } catch (err) {
        console.error('Failed to load raw materials:', err);
      } finally {
        if (isMounted) setLoadingRawMaterials(false);
      }
    };
    loadRawMaterials();
    return () => {
      isMounted = false;
    };
  }, [resolvedOrgId]);

  const rawMaterialOptions = useMemo(() => {
    const addedIds = new Set(entries.map((e) => Number(e.rawMaterialId)));
    return rawMaterials
      .filter((rm) => !addedIds.has(Number(rm.id)))
      .map((rm) => {
        const uom =
          rm.currentStock?.unitSymbol ||
          rm.currentStock?.unitName ||
          rm.unit?.symbolEnglish ||
          rm.unit?.nameEnglish ||
          rm.unitSymbol ||
          rm.unitName ||
          'kg';
        return {
          value: String(rm.id),
          label: `${rm.nameEnglish || rm.name || `Material #${rm.id}`} (${uom})`,
        };
      });
  }, [rawMaterials, entries]);

  const productionPlanOptions = useMemo(
    () =>
      productionPlans.map((plan) => {
        const parts = [plan.planCode];
        if (plan.productionDate) parts.push(`(${plan.productionDate})`);
        if (plan.kitchenName && plan.kitchenName !== '—') parts.push(`- ${plan.kitchenName}`);
        return {
          value: String(plan.id),
          label: parts.join(' '),
        };
      }),
    [productionPlans]
  );

  const handleProductionPlanChange = (e) => {
    const nextId = String(e?.target?.value ?? e?.value ?? '');
    setProductionPlanId(nextId);
    const selectedPlan = productionPlans.find((p) => String(p.id) === nextId);
    if (selectedPlan) {
      setPlanCode(selectedPlan.planCode || '');
      if (selectedPlan.productionDate) {
        setProductionDate(selectedPlan.productionDate);
      }
      setKitchenName(selectedPlan.kitchenName && selectedPlan.kitchenName !== '—' ? selectedPlan.kitchenName : '');
      if (selectedPlan.hasSpecificMeals && selectedPlan.meals?.length > 0) {
        const currentMealValid = selectedPlan.meals.some(
          (m) => String(m.mealTypeId) === String(mealTypeId)
        );
        if (!currentMealValid) {
          setMealTypeId(String(selectedPlan.meals[0].mealTypeId));
        }
      }
    } else if (!nextId) {
      setPlanCode('');
      setKitchenName('');
    }
  };

  const mealTypeOptions = useMemo(
    () =>
      mealTypes.map((mt) => ({
        value: String(mt.id),
        label: mt.name || mt.mealTypeName || `Meal #${mt.id}`,
      })),
    [mealTypes]
  );

  const handleAddEntry = () => {
    if (!selectedRawMaterialId) {
      notify.error('Please select a raw material to add.');
      return;
    }
    const rm = rawMaterials.find((r) => String(r.id) === String(selectedRawMaterialId));
    if (!rm) return;

    const uom =
      rm.currentStock?.unitSymbol ||
      rm.currentStock?.unitName ||
      rm.unit?.symbolEnglish ||
      rm.unit?.nameEnglish ||
      rm.unitSymbol ||
      rm.unitName ||
      'kg';

    setEntries((prev) => [
      ...prev,
      {
        localKey: `entry-${rm.id}-${Date.now()}`,
        id: 0,
        rawMaterialId: Number(rm.id),
        rawMaterialName: rm.nameEnglish || rm.name || `Material #${rm.id}`,
        uom,
        issuedQuantity: 0,
        wasteQuantity: 0,
        actualUsedQuantity: 0,
        wastePercentage: 0,
        wasteType: 'PEELING',
        remarks: '',
      },
    ]);
    setSelectedRawMaterialId('');
  };

  const handleIssuedChange = (localKey, newIssued) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.localKey !== localKey) return item;
        const issued = newIssued === '' ? 0 : Math.max(0, Number(newIssued) || 0);
        const waste = Number(item.wasteQuantity) || 0;
        const actual = Math.max(0, Number((issued - waste).toFixed(3)));
        const wastePct = issued > 0 ? Number(((waste / issued) * 100).toFixed(2)) : 0;
        return {
          ...item,
          issuedQuantity: newIssued === '' ? '' : issued,
          actualUsedQuantity: actual,
          wastePercentage: wastePct,
        };
      })
    );
  };

  const handleWasteChange = (localKey, newWaste) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.localKey !== localKey) return item;
        const waste = newWaste === '' ? 0 : Math.max(0, Number(newWaste) || 0);
        const issued = Number(item.issuedQuantity) || 0;
        const actual = Math.max(0, Number((issued - waste).toFixed(3)));
        const wastePct = issued > 0 ? Number(((waste / issued) * 100).toFixed(2)) : 0;
        return {
          ...item,
          wasteQuantity: newWaste === '' ? '' : waste,
          actualUsedQuantity: actual,
          wastePercentage: wastePct,
        };
      })
    );
  };

  const handleWasteTypeChange = (localKey, newType) => {
    setEntries((prev) =>
      prev.map((item) => (item.localKey === localKey ? { ...item, wasteType: newType } : item))
    );
  };

  const handleRemarksChange = (localKey, value) => {
    setEntries((prev) =>
      prev.map((item) => (item.localKey === localKey ? { ...item, remarks: value } : item))
    );
  };

  const handleDelete = (localKey) => {
    setEntries((prev) => prev.filter((item) => item.localKey !== localKey));
    notify.info('Entry removed');
  };

  const totalIssuedRecorded = entries
    .reduce((sum, item) => sum + (Number(item.issuedQuantity) || 0), 0)
    .toFixed(2)
    .replace(/\.00$/, '');
  const totalWasteRecorded = entries
    .reduce((sum, item) => sum + (Number(item.wasteQuantity) || 0), 0)
    .toFixed(2)
    .replace(/\.00$/, '');
  const totalActualUsedRecorded = entries
    .reduce((sum, item) => sum + (Number(item.actualUsedQuantity) || 0), 0)
    .toFixed(2)
    .replace(/\.00$/, '');

  const validateEntries = () => {
    setValidationAttempted(true);
    if (!productionPlanId || Number(productionPlanId) <= 0) {
      notify.error('Please select a Production Plan.');
      return false;
    }
    if (!mealTypeId || Number(mealTypeId) <= 0) {
      notify.error('Please select a Meal Type.');
      return false;
    }
    if (entries.length === 0) {
      notify.error('Please add at least one ingredient entry.');
      return false;
    }

    const missingOtherRemarks = entries.find(
      (item) => item.wasteType === 'OTHER' && !String(item.remarks || '').trim()
    );
    if (missingOtherRemarks) {
      notify.error(
        `Remarks is compulsory when Waste Type is "Other" (${missingOtherRemarks.rawMaterialName}).`
      );
      return false;
    }

    const invalidQty = entries.find(
      (item) =>
        (Number(item.issuedQuantity) || 0) <= 0 &&
        (Number(item.wasteQuantity) || 0) <= 0
    );
    if (invalidQty) {
      notify.error(
        `Please enter Issued Quantity or Waste Quantity for "${invalidQty.rawMaterialName}".`
      );
      return false;
    }

    return true;
  };

  const handleSavePrepWaste = async (isDraft) => {
    if (!validateEntries()) return;

    const payload = {
      entries: entries.map((item) => {
        const issued = Number(item.issuedQuantity) || 0;
        const waste = Number(item.wasteQuantity) || 0;
        const actual = Math.max(0, Number((issued - waste).toFixed(3)));
        const wastePct = issued > 0 ? Number(((waste / issued) * 100).toFixed(2)) : 0;

        return {
          actualUsedQuantity: actual,
          id: Number(item.id) || 0,
          issuedQuantity: issued,
          rawMaterialId: Number(item.rawMaterialId) || 0,
          remarks: String(item.remarks || '').trim(),
          wastePercentage: wastePct,
          wasteQuantity: waste,
          wasteType: item.wasteType,
        };
      }),
      isDraft: Boolean(isDraft),
      mealTypeId: Number(mealTypeId),
      notes: String(notes || '').trim(),
      productionPlanId: Number(productionPlanId),
      userId: Number(getUserIdFromToken()) || 1,
    };

    if (isDraft) {
      setSavingDraft(true);
    } else {
      setSubmitting(true);
    }

    try {
      await SavePreWaste(payload);
      notify.success(
        isDraft
          ? 'Preparation waste draft saved successfully!'
          : 'Preparation waste records submitted successfully!'
      );
      navigate('/production/prep-waste');
    } catch (err) {
      console.error('Failed to save preparation waste:', err);
      notify.error(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          'Failed to save preparation waste records.'
      );
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  const busy = savingDraft || submitting;

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Preparation Waste Entry"
          description="Record ingredient waste generated during cleaning, peeling, cutting, trimming and preparation."
          backTo="/production/prep-waste"
          actions={
            <div className="flex items-center gap-2">
              <HeaderActionButton
                onClick={() => handleSavePrepWaste(true)}
                icon={savingDraft ? Loader2 : Save}
                label={savingDraft ? 'Saving Draft...' : 'Save as Draft'}
                variant="outline"
                disabled={busy}
              />
              <HeaderActionButton
                onClick={() => handleSavePrepWaste(false)}
                icon={submitting ? Loader2 : Check}
                label={submitting ? 'Submitting...' : 'Submit Waste Records'}
                disabled={busy}
              />
            </div>
          }
        />

        {/* Production Context */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#084E92]" />
              Production Context
            </span>
            <span className="text-[11px] text-gray-400">Reference active operational scope</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Production Plan <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                name="productionPlanId"
                value={productionPlanId}
                onChange={handleProductionPlanChange}
                options={productionPlanOptions}
                placeholder={loadingPlans ? 'Loading plans...' : 'Select Production Plan'}
                loading={loadingPlans}
                hasError={validationAttempted && (!productionPlanId || Number(productionPlanId) <= 0)}
              />
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Production Date
              </span>
              <span className="text-xs font-bold text-gray-800 mt-1.5 block">
                {productionDate}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Meal Type <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                name="mealTypeId"
                value={mealTypeId}
                onChange={(e) => setMealTypeId(String(e?.target?.value ?? e?.value ?? ''))}
                options={mealTypeOptions}
                placeholder="Select Meal Type"
              />
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Kitchen
              </span>
              <span className="text-xs font-bold text-gray-800 mt-1.5 block">
                {kitchenName || 'Central Kitchen'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#084E92]" />
            Quick Summary
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard icon={Layers} label="Total Issued Qty" value={`${totalIssuedRecorded} kg`} tone="default" />
            <KpiCard icon={Trash2} label="Waste Entries" value={entries.length} tone="amber" />
            <KpiCard icon={Scale} label="Total Prep Waste" value={`${totalWasteRecorded} kg`} tone="emerald" />
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                <h3 className="text-sm font-bold text-gray-900">Preparation Waste Entries</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {entries.length} Records
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Add raw materials and record issued vs waste quantities. Remarks are mandatory when &quot;Other&quot; is selected.
              </p>
            </div>

            {/* Add Raw Material Control */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-64">
                <SearchableSelect
                  name="addRawMaterial"
                  value={selectedRawMaterialId}
                  onChange={(e) =>
                    setSelectedRawMaterialId(String(e?.target?.value ?? e?.value ?? ''))
                  }
                  options={rawMaterialOptions}
                  placeholder={loadingRawMaterials ? 'Loading materials...' : 'Select ingredient...'}
                  disabled={loadingRawMaterials}
                />
              </div>
              <button
                type="button"
                onClick={handleAddEntry}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold transition cursor-pointer shrink-0"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Waste Type</th>
                  <th className="py-3 px-4 text-center">Issued Qty</th>
                  <th className="py-3 px-4 text-center">Waste Qty</th>
                  <th className="py-3 px-4 text-right">Waste %</th>
                  <th className="py-3 px-4 text-right">Actual Used Qty</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                      No ingredients added yet. Select an ingredient above and click &quot;Add Item&quot;.
                    </td>
                  </tr>
                ) : (
                  entries.map((row) => {
                    const isOther = row.wasteType === 'OTHER';
                    const remarksMissing =
                      validationAttempted && isOther && !String(row.remarks || '').trim();

                    return (
                      <tr key={row.localKey} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {row.rawMaterialName}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={row.wasteType}
                            onChange={(e) => handleWasteTypeChange(row.localKey, e.target.value)}
                            className="h-8 px-2.5 rounded-lg border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none cursor-pointer"
                          >
                            {WASTE_TYPES.map((wt) => (
                              <option key={wt.value} value={wt.value}>
                                {wt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <QtyInput
                            value={row.issuedQuantity}
                            unit={row.uom}
                            onChange={(val) => handleIssuedChange(row.localKey, val)}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <QtyInput
                            value={row.wasteQuantity}
                            unit={row.uom}
                            onChange={(val) => handleWasteChange(row.localKey, val)}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-amber-700">
                          {Number(row.wastePercentage || 0).toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          {row.actualUsedQuantity} {row.uom}
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => handleRemarksChange(row.localKey, e.target.value)}
                            placeholder={isOther ? 'Remarks required *' : 'Optional remarks'}
                            className={`w-48 h-8 px-2.5 rounded-lg border text-xs outline-none transition ${
                              remarksMissing
                                ? 'border-rose-500 ring-1 ring-rose-300 bg-rose-50/30'
                                : isOther
                                  ? 'border-amber-300 focus:border-[#084E92] bg-white'
                                  : 'border-[#C3C6D1] focus:border-[#084E92] bg-white'
                            }`}
                          />
                          {isOther && (
                            <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                              * Required for Other
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(row.localKey)}
                            className="p-1.5 rounded text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Totals Row */}
                {entries.length > 0 && (
                  <tr className="bg-slate-50 font-bold border-t-2 border-gray-200 text-xs">
                    <td colSpan={2} className="py-3.5 px-4 text-gray-900 uppercase tracking-wider">
                      Total Prep Waste Recorded
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#084E92]">
                      {totalIssuedRecorded} kg
                    </td>
                    <td className="py-3.5 px-4 text-center text-rose-600">
                      {totalWasteRecorded} kg
                    </td>
                    <td className="py-3.5 px-4" />
                    <td className="py-3.5 px-4 text-right text-emerald-700">
                      {totalActualUsedRecorded} kg
                    </td>
                    <td colSpan={2} className="py-3.5 px-4" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#084E92]" />
              Notes
            </span>
            <span className="text-[11px] text-gray-400">Optional notes</span>
          </div>
          <p className="text-xs text-gray-400">
            Add any notes about preparation waste, observations or issues.
          </p>
          <div className="relative pt-1">
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your notes here..."
              className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
            />
            <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
              {notes.length}/500
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-xs text-[#084E92]">
          <Info size={16} className="shrink-0" />
          <span>Submitted records will be used in actual production costing.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/prep-waste')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Prep Waste List
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSavePrepWaste(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
            >
              {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save as Draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSavePrepWaste(false)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Submit Waste Records
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default PreparationWasteEntry;
