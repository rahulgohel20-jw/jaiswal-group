import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import {
  FileText,
  Calendar,
  Clock,
  User,
  Flag,
  Store,
  ChefHat,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import { MOCK_MENU_PLANS, MOCK_DESTINATION_OUTLETS } from '../mockData/productionMockData';
import {
  GetAllMenuPlanByDay,
  prefillProductionPlanFromMenu,
  GetAllStoreByOrg,
  getProductionPlanById,
  saveProductionPlan,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import { AddDestinationModal } from './components/AddDestinationModal';

const formatDateDot = (d) => {
  if (!d) return '—';
  const str = String(d).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return str;
};

const getPlanKey = (p) => {
  if (!p) return '';
  return String(p.id ?? p.menuPlanDayId ?? p.menuPlanId ?? '');
};

const getPlanLabel = (mp) => {
  const code =
    mp.planCode ||
    mp.menuPlanCode ||
    mp.code ||
    (mp.menuPlanId ? `Plan #${mp.menuPlanId}` : mp.name || 'Menu Plan');
  const outlet = mp.organizationName || mp.outlet || mp.unitName || '';
  const date = mp.planDate
    ? formatDateDot(mp.planDate)
    : mp.productionDate
      ? formatDateDot(mp.productionDate)
      : mp.duration || mp.dayOfWeekName || '';
  const parts = [code];
  if (outlet) parts.push(outlet);
  if (date) parts.push(date);
  return parts.join(' — ');
};

export const CreateProductionPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId: routePlanId } = useParams();

  const navState = location.state || {};
  const editPlanId = routePlanId || navState.planId || new URLSearchParams(location.search).get('id');
  const isEditMode = Boolean(editPlanId);
  const incomingPlan =
    navState.dayPlan || (navState.menuPlanId || navState.dayId ? navState : null);

  // Planning Source
  const [selectedPlanObj, setSelectedPlanObj] = useState(incomingPlan || null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillError, setPrefillError] = useState(null);
  const [rawPrefillData, setRawPrefillData] = useState(null);

  // Menu Plan Summary state
  const [summaryData, setSummaryData] = useState({
    outlet: incomingPlan?.organizationName || incomingPlan?.outlet || '—',
    duration: incomingPlan?.planDate ? formatDateDot(incomingPlan.planDate) : '—',
    totalMenuItems: Number(incomingPlan?.totalItems ?? 0),
    plannedDemand:
      incomingPlan?.plannedDemand ||
      (incomingPlan?.plannedPax ? `${incomingPlan.plannedPax} Pax` : '—'),
    status: incomingPlan?.status || incomingPlan?.planStatus || 'Approved',
  });

  // Production Details
  const [planCode, setPlanCode] = useState(
    incomingPlan?.planCode || `PP-${new Date().getFullYear()}-001`
  );
  const [productionDate, setProductionDate] = useState(
    incomingPlan?.planDate
      ? String(incomingPlan.planDate).split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('08:00');
  const [expectedCompletion, setExpectedCompletion] = useState('14:00');
  const [supervisor, setSupervisor] = useState('Rahul Sharma');
  const [priority, setPriority] = useState('High');
  const [issueStore, setIssueStore] = useState('Main Store');
  const [producingKitchen, setProducingKitchen] = useState('Maruti Main Kitchen');
  const [productionLocationId, setProductionLocationId] = useState(
    incomingPlan?.productionLocationId || incomingPlan?.kitchenId || 0
  );
  const [notes, setNotes] = useState('');

  // Stores and Kitchens from GetAllStoreByOrg
  const [storeOptions, setStoreOptions] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [kitchenOptions, setKitchenOptions] = useState([]);
  const [loadingKitchens, setLoadingKitchens] = useState(false);

  // Destination Outlets List
  const [destinations, setDestinations] = useState(MOCK_DESTINATION_OUTLETS);

  // Org Scope for Add Destination Modal
  const {
    units: scopeUnits,
    outlets: scopeOutlets,
    subOutlets: scopeSubOutlets,
  } = useOrgScope();

  const modalUnits = useMemo(() => {
    return scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || [];
  }, [scopeOutlets, scopeUnits]);

  const modalSubUnits = useMemo(() => {
    return scopeSubOutlets || [];
  }, [scopeSubOutlets]);

  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);

  // Fetch stores using GetAllStoreByOrg with type 'STORE'
  const fetchStoresForPlan = useCallback(async (orgId, subOutletId) => {
    if (!orgId) return;
    setLoadingStores(true);
    try {
      const promises = [
        GetAllStoreByOrg({ orgId: Number(orgId), type: 'STORE' }).catch((err) => {
          console.warn('Failed to load unit stores:', err);
          return null;
        }),
      ];

      if (subOutletId && Number(subOutletId) > 0) {
        promises.push(
          GetAllStoreByOrg({
            orgId: Number(orgId),
            subOutletId: Number(subOutletId),
            type: 'STORE',
          }).catch((err) => {
            console.warn('Failed to load subunit stores:', err);
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      const mergedList = [];
      const seenIds = new Set();

      results.forEach((res, idx) => {
        if (!res) return;
        const rawContainer = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(rawContainer)
          ? rawContainer
          : Array.isArray(rawContainer?.content)
            ? rawContainer.content
            : Array.isArray(rawContainer?.items)
              ? rawContainer.items
              : Array.isArray(rawContainer?.stores)
                ? rawContainer.stores
                : Array.isArray(rawContainer?.subOutlets)
                  ? rawContainer.subOutlets
                  : Array.isArray(rawContainer?.subLocations)
                    ? rawContainer.subLocations
                    : [];

        const isSubUnit = idx === 1;
        list.forEach((st) => {
          const rawId = isSubUnit
            ? (st.subLocationId ?? st.id ?? st.storeId ?? st.subOutletId)
            : (st.subOutletId ?? st.id ?? st.storeId ?? st.subLocationId);
          const name = isSubUnit
            ? (st.subLocationName || st.name || st.storeName || st.subOutletName)
            : (st.subOutletName || st.name || st.storeName || st.subLocationName);
          const code = st.code || st.storeCode || st.subOutletCode || st.subLocationCode || '';

          if (!name) return;
          const key = String(rawId || name);
          if (seenIds.has(key)) return;
          seenIds.add(key);

          const storeSubOutletId = Number(st.subOutletId ?? (!isSubUnit ? (st.id ?? st.storeId) : 0)) || 0;
          const storeSubLocationId = Number(st.subLocationId ?? (isSubUnit ? (st.id ?? st.storeId) : 0)) || 0;

          mergedList.push({
            id: rawId || key,
            name,
            code,
            isSubUnit,
            subOutletId: storeSubOutletId,
            subLocationId: storeSubLocationId,
            storeId: Number(rawId || 0),
          });
        });
      });

      setStoreOptions(mergedList);

      if (mergedList.length > 0) {
        setIssueStore((prev) => {
          const exists = mergedList.some((s) => s.name === prev || String(s.id) === String(prev));
          return exists ? prev : mergedList[0].name;
        });
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  // Fetch kitchens using GetAllStoreByOrg with type 'KITCHEN'
  const fetchKitchensForPlan = useCallback(async (orgId, subOutletId) => {
    if (!orgId) return;
    setLoadingKitchens(true);
    try {
      const promises = [
        GetAllStoreByOrg({ orgId: Number(orgId), type: 'KITCHEN' }).catch((err) => {
          console.warn('Failed to load unit kitchens:', err);
          return null;
        }),
      ];

      if (subOutletId && Number(subOutletId) > 0) {
        promises.push(
          GetAllStoreByOrg({
            orgId: Number(orgId),
            subOutletId: Number(subOutletId),
            type: 'KITCHEN',
          }).catch((err) => {
            console.warn('Failed to load subunit kitchens:', err);
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      const mergedList = [];
      const seenIds = new Set();

      results.forEach((res, idx) => {
        if (!res) return;
        const rawContainer = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(rawContainer)
          ? rawContainer
          : Array.isArray(rawContainer?.content)
            ? rawContainer.content
            : Array.isArray(rawContainer?.items)
              ? rawContainer.items
              : Array.isArray(rawContainer?.stores)
                ? rawContainer.stores
                : Array.isArray(rawContainer?.subOutlets)
                  ? rawContainer.subOutlets
                  : Array.isArray(rawContainer?.subLocations)
                    ? rawContainer.subLocations
                    : [];

        const isSubUnit = idx === 1;
        list.forEach((kt) => {
          const rawId = isSubUnit
            ? (kt.subLocationId ?? kt.id ?? kt.storeId ?? kt.subOutletId)
            : (kt.subOutletId ?? kt.id ?? kt.storeId ?? kt.subLocationId);
          const name = isSubUnit
            ? (kt.subLocationName || kt.name || kt.storeName || kt.subOutletName)
            : (kt.subOutletName || kt.name || kt.storeName || kt.subLocationName);
          const code = kt.code || kt.storeCode || kt.subOutletCode || kt.subLocationCode || '';

          const ktSubOutletId = Number(kt.subOutletId ?? (!isSubUnit ? (kt.id ?? kt.storeId) : 0)) || 0;
          const ktSubLocationId = Number(kt.subLocationId ?? (isSubUnit ? (kt.id ?? kt.storeId) : 0)) || 0;

          if (!name) return;
          const key = String(rawId || name);
          if (seenIds.has(key)) return;
          seenIds.add(key);

          mergedList.push({
            id: rawId || key,
            name,
            code,
            isSubUnit,
            subOutletId: ktSubOutletId,
            subLocationId: ktSubLocationId,
          });
        });
      });

      setKitchenOptions(mergedList);

      if (mergedList.length > 0) {
        setProducingKitchen((prev) => {
          const match = mergedList.find((k) => k.name === prev || String(k.id) === String(prev)) || mergedList[0];
          setProductionLocationId(Number(match.id) || 0);
          return match.name;
        });
      }
    } catch (err) {
      console.error('Error fetching kitchens:', err);
    } finally {
      setLoadingKitchens(false);
    }
  }, []);

  // Prefill executor function
  const executePrefill = useCallback(
    async (targetPlan) => {
      if (!targetPlan) return;
      setPrefillLoading(true);
      setPrefillError(null);

      const targetOrgId = Number(targetPlan.organizationId || targetPlan.orgId || 0);
      const targetSubOutletId = Number(targetPlan.subOutletId || 0);

      // Trigger store (type STORE) and kitchen (type KITCHEN) fetch in parallel
      if (targetOrgId > 0) {
        fetchStoresForPlan(targetOrgId, targetSubOutletId);
        fetchKitchensForPlan(targetOrgId, targetSubOutletId);
      }

      const payload = {
        mealTypeId: Number(targetPlan.mealTypeId || 0),
        menuPlanDayId: Number(
          targetPlan.menuPlanDayId || targetPlan.dayId || targetPlan.id || 0
        ),
        menuPlanDayShiftId: Number(
          targetPlan.menuPlanDayShiftId || targetPlan.shiftId || 0
        ),
        menuPlanId: Number(targetPlan.menuPlanId || targetPlan.planId || 0),
        organizationId: targetOrgId,
        planDate: targetPlan.planDate
          ? String(targetPlan.planDate).split('T')[0]
          : productionDate || '',
        productionLocationId: Number(
          targetPlan.productionLocationId || targetPlan.kitchenId || 0
        ),
        storeSubLocationIds:
          Array.isArray(targetPlan.storeSubLocationIds) &&
            targetPlan.storeSubLocationIds.length > 0
            ? targetPlan.storeSubLocationIds.map(Number)
            : targetPlan.storeSubLocationId != null
              ? [Number(targetPlan.storeSubLocationId)]
              : [0],
        storeSubOutletIds:
          Array.isArray(targetPlan.storeSubOutletIds) &&
            targetPlan.storeSubOutletIds.length > 0
            ? targetPlan.storeSubOutletIds.map(Number)
            : targetPlan.storeSubOutletId != null
              ? [Number(targetPlan.storeSubOutletId)]
              : [0],
        subOutletId: targetSubOutletId,
      };

      try {
        const res = await prefillProductionPlanFromMenu(payload);
        const data = res?.data?.data ?? res?.data ?? {};
        setRawPrefillData(data);

        const resOrgId = data.organizationId || targetOrgId;
        const resSubOutletId = data.subOutletId || targetSubOutletId;
        if (resOrgId && (resOrgId !== targetOrgId || resSubOutletId !== targetSubOutletId)) {
          fetchStoresForPlan(resOrgId, resSubOutletId);
          fetchKitchensForPlan(resOrgId, resSubOutletId);
        }

        // 1. Menu Plan Summary
        setSummaryData({
          outlet:
            data.organizationName ||
            data.outlet ||
            data.outletName ||
            targetPlan.organizationName ||
            targetPlan.outlet ||
            '—',
          duration:
            data.duration ||
            data.dateRange ||
            (data.productionDate ? formatDateDot(data.productionDate) : null) ||
            (data.startDate && data.endDate
              ? `${formatDateDot(data.startDate)} - ${formatDateDot(data.endDate)}`
              : targetPlan.duration ||
              (targetPlan.planDate ? formatDateDot(targetPlan.planDate) : '—')),
          totalMenuItems: Number(
            data.totalItemsCount ??
            data.totalMenuItems ??
            data.menuItems ??
            data.items?.length ??
            targetPlan.totalItems ??
            0
          ),
          plannedDemand:
            data.totalPlannedPax != null
              ? `${data.totalPlannedPax} Pax`
              : data.plannedDemand != null
                ? data.plannedDemand
                : targetPlan.plannedDemand ||
                (targetPlan.plannedPax ? `${targetPlan.plannedPax} Pax` : '—'),
          status:
            data.status ||
            data.planStatus ||
            targetPlan.planStatus ||
            targetPlan.status ||
            'Approved',
        });

        // 2. Production Details
        const resolvedPlanCode =
          data.planCode ||
          data.productionPlanCode ||
          (data.menuPlanCode
            ? data.menuPlanCode.replace('MPL-', 'PP-')
            : `PP-${new Date().getFullYear()}-${String(data.menuPlanId || '001').padStart(3, '0')}`);
        setPlanCode(resolvedPlanCode);

        if (data.productionDate || data.planDate || targetPlan.planDate) {
          const pDate =
            data.productionDate || data.planDate || targetPlan.planDate;
          setProductionDate(String(pDate).split('T')[0]);
        }
        if (data.startTime || data.productionStartTime) {
          setStartTime(data.startTime || data.productionStartTime);
        }
        if (data.expectedCompletion || data.expectedCompletionTime) {
          setExpectedCompletion(
            data.expectedCompletion || data.expectedCompletionTime
          );
        }
        if (data.supervisor || data.supervisorName) {
          setSupervisor(data.supervisor || data.supervisorName);
        }
        if (data.priority) {
          setPriority(data.priority);
        }
        if (data.issueStore || data.defaultRawMaterialIssueStore || data.storeName) {
          setIssueStore(
            data.issueStore ||
            data.defaultRawMaterialIssueStore ||
            data.storeName
          );
        }
        if (
          data.productionLocationName ||
          data.producingKitchen ||
          data.kitchenName ||
          data.producingKitchenFacility
        ) {
          setProducingKitchen(
            data.productionLocationName ||
            data.producingKitchen ||
            data.kitchenName ||
            data.producingKitchenFacility
          );
        }
        if (data.productionLocationId || targetPlan.productionLocationId || targetPlan.kitchenId) {
          setProductionLocationId(Number(data.productionLocationId || targetPlan.productionLocationId || targetPlan.kitchenId || 0));
        }
        if (data.remarks || data.notes) {
          setNotes(data.remarks || data.notes);
        }

        // 3. Destination Outlets Table (no checkbox selection, no planned pax, no delivery time)
        const extractedDestinations = [];
        const seenDestKeys = new Set();

        if (Array.isArray(data.items)) {
          data.items.forEach((item) => {
            if (Array.isArray(item.allocations)) {
              item.allocations.forEach((alloc, allocIdx) => {
                const orgId = alloc.destinationOrganizationId || data.organizationId || 0;
                const subId = alloc.destinationSubOutletId || 0;
                const locId = alloc.destinationLocationId || 0;
                const key = `${orgId}_${subId}_${locId}`;

                if (!seenDestKeys.has(key)) {
                  seenDestKeys.add(key);
                  extractedDestinations.push({
                    id: alloc.id || `${key}-${allocIdx}`,
                    destinationOrganizationId: orgId,
                    destinationSubOutletId: subId,
                    destinationLocationId: locId,
                    outlet:
                      alloc.destinationSubOutletName ||
                      alloc.destinationOrganizationName ||
                      data.organizationName ||
                      'Outlet',
                    subLocation:
                      alloc.destinationLocationName ||
                      (alloc.destinationSubOutletName ? 'Sub-Unit' : 'Main Kitchen'),
                    transferRequired:
                      alloc.requiresTransfer !== undefined
                        ? Boolean(alloc.requiresTransfer)
                        : true,
                    notes: alloc.remarks || '',
                  });
                }
              });
            }
          });
        }

        // Fallback to top-level destination properties if items.allocations had none
        const fallbackRawDests =
          data.destinationOutlets ||
          data.destinations ||
          data.destinationDetails ||
          data.outlets;

        if (extractedDestinations.length > 0) {
          setDestinations(extractedDestinations);
        } else if (Array.isArray(fallbackRawDests) && fallbackRawDests.length > 0) {
          setDestinations(
            fallbackRawDests.map((d, idx) => ({
              id: d.id ?? d.destinationOutletId ?? idx + 1,
              outlet:
                d.outlet ||
                d.destinationOutletName ||
                d.outletName ||
                d.organizationName ||
                `Outlet ${idx + 1}`,
              subLocation:
                d.subLocation ||
                d.subLocationName ||
                d.storeSubLocationName ||
                'Main Kitchen',
              transferRequired:
                d.transferRequired !== undefined
                  ? Boolean(d.transferRequired)
                  : d.isTransferRequired !== undefined
                    ? Boolean(d.isTransferRequired)
                    : true,
              notes: d.notes || d.remarks || '',
              destinationOutletId: d.destinationOutletId || d.organizationId,
              subLocationId: d.subLocationId || d.storeSubLocationId,
            }))
          );
        } else if (data.organizationName || data.organizationId) {
          setDestinations([
            {
              id: 1,
              destinationOrganizationId: data.organizationId,
              destinationSubOutletId: data.subOutletId || null,
              destinationLocationId: null,
              outlet: data.subOutletName || data.organizationName || 'Outlet',
              subLocation: 'Main Kitchen',
              transferRequired: true,
              notes: '',
            },
          ]);
        }

        notify.success('Loaded production plan prefill details');
      } catch (err) {
        console.error('Failed to prefill from menu:', err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to prefill plan details from menu.';
        setPrefillError(msg);
        notify.error(msg);
      } finally {
        setPrefillLoading(false);
      }
    },
    [productionDate, fetchStoresForPlan, fetchKitchensForPlan]
  );

  // Populate state from full Production Plan (for Edit mode)
  const populateFromPlan = useCallback(
    (plan) => {
      if (!plan) return;
      setRawPrefillData(plan);
      const targetOrgId = Number(plan.organizationId || plan.orgId || 0);
      const targetSubOutletId = Number(plan.subOutletId || 0);

      if (targetOrgId > 0) {
        fetchStoresForPlan(targetOrgId, targetSubOutletId);
        fetchKitchensForPlan(targetOrgId, targetSubOutletId);
      }

      // 1. Menu Plan Summary
      setSummaryData({
        outlet:
          plan.organizationName ||
          plan.outlet ||
          plan.outletName ||
          plan.subOutletName ||
          '—',
        duration: plan.productionDate
          ? formatDateDot(plan.productionDate)
          : plan.servingDate
            ? formatDateDot(plan.servingDate)
            : '—',
        totalMenuItems: Number(
          plan.items?.length ??
          plan.totalItemsCount ??
          plan.totalMenuItems ??
          0
        ),
        plannedDemand:
          plan.plannedPax != null
            ? `${plan.plannedPax} Pax`
            : plan.items?.[0]?.plannedPax != null
              ? `${plan.items[0].plannedPax} Pax`
              : plan.plannedDemand || '—',
        status: plan.status || 'DRAFT',
      });

      // 2. Production Details
      if (plan.planCode) {
        setPlanCode(plan.planCode);
      }
      if (plan.productionDate || plan.servingDate) {
        setProductionDate(String(plan.productionDate || plan.servingDate).split('T')[0]);
      }
      if (plan.productionStartTime || plan.startTime) {
        setStartTime(plan.productionStartTime || plan.startTime);
      }
      if (plan.productionCompletionTime || plan.expectedCompletion) {
        setExpectedCompletion(plan.productionCompletionTime || plan.expectedCompletion);
      }
      if (plan.supervisorName || plan.supervisor) {
        setSupervisor(plan.supervisorName || plan.supervisor);
      }
      if (plan.priority) {
        setPriority(plan.priority);
      }
      if (plan.rawMaterialIssueStoreName || plan.issueStoreName || plan.issueStore) {
        setIssueStore(
          plan.rawMaterialIssueStoreName ||
          plan.issueStoreName ||
          plan.issueStore
        );
      }
      if (plan.productionLocationName || plan.producingKitchen || plan.kitchenName) {
        setProducingKitchen(
          plan.productionLocationName ||
          plan.producingKitchen ||
          plan.kitchenName
        );
      }
      if (plan.productionLocationId || plan.productionKitchenId || plan.producingKitchenId) {
        setProductionLocationId(
          Number(plan.productionLocationId || plan.productionKitchenId || plan.producingKitchenId || 0)
        );
      }
      if (plan.productionNotes || plan.remarks || plan.notes) {
        setNotes(plan.productionNotes || plan.remarks || plan.notes);
      }

      // 3. Destinations from items allocations or destinationOutlets
      const extractedDestinations = [];
      const seenDestKeys = new Set();

      if (Array.isArray(plan.items)) {
        plan.items.forEach((item) => {
          if (Array.isArray(item.allocations)) {
            item.allocations.forEach((alloc, allocIdx) => {
              const orgId = alloc.destinationOrganizationId || plan.organizationId || 0;
              const subId = alloc.destinationSubOutletId || 0;
              const locId = alloc.destinationLocationId || 0;
              const key = `${orgId}_${subId}_${locId}`;

              if (!seenDestKeys.has(key)) {
                seenDestKeys.add(key);
                extractedDestinations.push({
                  id: alloc.id || `${key}-${allocIdx}`,
                  destinationOrganizationId: orgId,
                  destinationSubOutletId: subId,
                  destinationLocationId: locId,
                  outlet:
                    alloc.destinationSubOutletName ||
                    alloc.destinationOrganizationName ||
                    plan.organizationName ||
                    'Outlet',
                  subLocation:
                    alloc.destinationLocationName ||
                    (alloc.destinationSubOutletName ? 'Sub-Unit' : 'Main Kitchen'),
                  transferRequired:
                    alloc.requiresTransfer !== undefined
                      ? Boolean(alloc.requiresTransfer)
                      : true,
                  notes: alloc.remarks || '',
                });
              }
            });
          }
        });
      }

      if (extractedDestinations.length > 0) {
        setDestinations(extractedDestinations);
      } else if (Array.isArray(plan.destinationOutlets) && plan.destinationOutlets.length > 0) {
        setDestinations(
          plan.destinationOutlets.map((d, idx) => ({
            id: d.id ?? idx + 1,
            destinationOrganizationId: d.destinationOrganizationId || d.organizationId || plan.organizationId || 0,
            destinationSubOutletId: d.destinationSubOutletId || 0,
            destinationLocationId: d.destinationLocationId || 0,
            outlet: d.outlet || d.destinationOutletName || d.outletName || 'Outlet',
            subLocation: d.subLocation || d.subLocationName || 'Main Kitchen',
            transferRequired: d.transferRequired !== undefined ? Boolean(d.transferRequired) : true,
            notes: d.notes || d.remarks || '',
          }))
        );
      }
    },
    [fetchStoresForPlan, fetchKitchensForPlan]
  );

  // Load Plan on mount: If editing an existing plan, call /production-plan/get/{id}
  useEffect(() => {
    let isMounted = true;
    const initPlan = async () => {
      if (editPlanId) {
        setPrefillLoading(true);
        setPrefillError(null);
        try {
          const res = await getProductionPlanById(editPlanId);
          const planData = res?.data?.data ?? res?.data;
          if (planData && (planData.id || planData.planCode)) {
            if (!isMounted) return;
            setSelectedPlanObj(planData);
            populateFromPlan(planData);
            notify.success(`Loaded Production Plan ${planData.planCode || editPlanId}`);
            return;
          }
        } catch (err) {
          console.error('Failed to load production plan for edit:', err);
          if (isMounted) {
            const msg = err?.response?.data?.message || 'Failed to fetch production plan for editing.';
            notify.error(msg);
            setPrefillError(msg);
          }
        } finally {
          if (isMounted) setPrefillLoading(false);
        }
      }

      if (incomingPlan) {
        setSelectedPlanObj(incomingPlan);
        executePrefill(incomingPlan);
        return;
      }

      // If directly accessed without state, fetch the first approved day plan
      try {
        const payload = {
          isActive: true,
          page: 0,
          pageSize: 20,
          status: 'APPROVED',
        };
        const res = await GetAllMenuPlanByDay(payload);
        const data = res?.data?.data ?? res?.data ?? {};
        const list = Array.isArray(data.content)
          ? data.content
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];

        if (!isMounted) return;

        const target = list[0] || MOCK_MENU_PLANS[0];
        if (target) {
          setSelectedPlanObj(target);
          executePrefill(target);
        }
      } catch (err) {
        console.error('Failed to load day plan:', err);
        if (!isMounted) return;
        const target = MOCK_MENU_PLANS[0];
        setSelectedPlanObj(target);
        executePrefill(target);
      }
    };

    initPlan();
    return () => {
      isMounted = false;
    };
  }, [editPlanId, incomingPlan, executePrefill, populateFromPlan]);

  const toggleTransferRequired = (id) => {
    setDestinations((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, transferRequired: !d.transferRequired } : d
      )
    );
  };

  const handleNotesChange = (id, val) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, notes: val } : d))
    );
  };

  const handleDeleteDestination = (id) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    notify.info('Destination removed');
  };

  const handleAddDestination = () => {
    setIsDestinationModalOpen(true);
  };

  const handleAddDestinationConfirm = (destData) => {
    const newId = `dest-${Date.now()}-${destinations.length + 1}`;
    setDestinations((prev) => [
      ...prev,
      {
        id: newId,
        ...destData,
      },
    ]);
    setIsDestinationModalOpen(false);
    notify.success('Destination outlet added successfully');
  };

  const handleSaveDraft = async () => {
    const activePlanId = Number(editPlanId || rawPrefillData?.id || 0);
    if (activePlanId > 0) {
      try {
        const matchedKitchen = kitchenOptions.find((kt) => kt.name === producingKitchen);
        const matchedStore = storeOptions.find(
          (st) => st.name === issueStore || String(st.id) === String(issueStore)
        );
        const draftPayload = {
          ...rawPrefillData,
          id: activePlanId,
          planCode,
          productionDate,
          productionStartTime: startTime,
          productionCompletionTime: expectedCompletion,
          priority,
          productionNotes: notes,
          remarks: notes,
          status: 'DRAFT',
          rawMaterialIssueStoreName: issueStore,
          rawMaterialIssueStoreId: Number(matchedStore?.id || matchedStore?.storeId || rawPrefillData?.rawMaterialIssueStoreId || 0),
          producingKitchenId: Number(matchedKitchen?.id || productionLocationId || 0),
          productionLocationName: producingKitchen,
        };
        await saveProductionPlan(draftPayload);
        notify.success(`Production plan ${planCode} saved as draft.`);
      } catch (e) {
        console.error('Failed to update draft in step 1:', e);
        notify.info('Plan setup saved as draft.');
      }
    } else {
      notify.success('Plan setup saved as draft.');
    }
  };

  const handleContinue = () => {
    if (destinations.length === 0) {
      notify.error('Please configure at least one destination outlet.');
      return;
    }

    notify.success('Step 1 saved. Proceeding to Recipe Allocation.');
    const matchedKitchen = kitchenOptions.find((kt) => kt.name === producingKitchen);
    const matchedStore = storeOptions.find(
      (st) => st.name === issueStore || String(st.id) === String(issueStore)
    );
    const targetSubOutletId = Number(rawPrefillData?.subOutletId || selectedPlanObj?.subOutletId || 0);
    const isSubOutletMenuPlan = targetSubOutletId > 0;

    let resolvedProductionSubOutletId = 0;
    let resolvedProductionLocationId = 0;

    if (isSubOutletMenuPlan) {
      // Suboutlet menu plan: kitchen id passed in productionLocationId (from subLocationId)
      resolvedProductionLocationId = Number(
        matchedKitchen?.subLocationId ||
        matchedKitchen?.id ||
        productionLocationId ||
        0
      );
      resolvedProductionSubOutletId = 0;
    } else {
      // Outlet menu plan: kitchen id passed in productionsuboutletId (from subOutletId)
      resolvedProductionSubOutletId = Number(
        matchedKitchen?.subOutletId ||
        matchedKitchen?.id ||
        productionLocationId ||
        0
      );
      resolvedProductionLocationId = 0;
    }

    // Store Resolution according to rule:
    // - Menu plan at unit level: pass stockInSubOutletId as store id, stockInLocationId = 0
    // - Menu plan at subunit level: pass stockInLocationId as store id, stockInSubOutletId = 0
    // - stockInOrganizationId: organizationId
    let resolvedStockInSubOutletId = 0;
    let resolvedStockInLocationId = 0;
    const resolvedStockInOrganizationId = Number(
      rawPrefillData?.organizationId || selectedPlanObj?.organizationId || organizationId || 40
    );

    if (isSubOutletMenuPlan) {
      resolvedStockInLocationId = Number(
        matchedStore?.subLocationId ||
        (matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
        matchedStore?.id ||
        0
      );
      resolvedStockInSubOutletId = 0;
    } else {
      resolvedStockInSubOutletId = Number(
        matchedStore?.subOutletId ||
        (!matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
        matchedStore?.id ||
        0
      );
      resolvedStockInLocationId = 0;
    }

    const activePlanId = Number(editPlanId || rawPrefillData?.id || 0);

    navigate(`/production/plans/${activePlanId || 1}/allocation`, {
      state: {
        planCode,
        productionDate,
        startTime,
        expectedCompletion,
        supervisor,
        priority,
        issueStore,
        issueStoreId: Number(matchedStore?.id || matchedStore?.storeId || rawPrefillData?.rawMaterialIssueStoreId || 0),
        stockInOrganizationId: resolvedStockInOrganizationId,
        stockInSubOutletId: resolvedStockInSubOutletId,
        stockInLocationId: resolvedStockInLocationId,
        storeOptions,
        storeSubLocationIds: resolvedStockInLocationId > 0 ? [resolvedStockInLocationId] : [0],
        storeSubOutletIds: resolvedStockInSubOutletId > 0 ? [resolvedStockInSubOutletId] : [0],
        producingKitchen,
        productionLocationId: resolvedProductionLocationId,
        productionsuboutletId: resolvedProductionSubOutletId,
        productionKitchenId: Number(matchedKitchen?.id || productionLocationId || rawPrefillData?.productionKitchenId || 0),
        notes,
        destinations,
        selectedPlan: selectedPlanObj,
        productionPlanId: activePlanId,
        isEdit: Boolean(activePlanId),
        savedPlan: {
          ...rawPrefillData,
          id: activePlanId,
        },
        prefillData: {
          ...rawPrefillData,
          id: activePlanId,
          productionLocationId: resolvedProductionLocationId,
          productionsuboutletId: resolvedProductionSubOutletId,
          productionLocationName: producingKitchen,
          stockInOrganizationId: resolvedStockInOrganizationId,
          stockInSubOutletId: resolvedStockInSubOutletId,
          stockInLocationId: resolvedStockInLocationId,
          issueStoreName: issueStore,
          issueStoreId: Number(matchedStore?.id || matchedStore?.storeId || rawPrefillData?.rawMaterialIssueStoreId || 0),
        },
        organizationId: rawPrefillData?.organizationId || selectedPlanObj?.organizationId || 40,
        subOutletId: rawPrefillData?.subOutletId || selectedPlanObj?.subOutletId || 0,
        items: rawPrefillData?.items || [],
        additionalMaterials: rawPrefillData?.additionalMaterials || [],
        storeIndents: rawPrefillData?.storeIndents || [],
      },
    });
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title={isEditMode ? `Edit Production Plan: ${planCode}` : 'Create Production Plan'}
          description={
            isEditMode
              ? 'Update production plan details, recipes, allocations, and material sourcing.'
              : 'Set production scope, recipes, destinations and operational preferences.'
          }
          backTo="/production/plans"
          actions={
            <HeaderActionButton
              onClick={handleSaveDraft}
              icon={Save}
              label="Save Draft"
              variant="outline"
            />
          }
        />

        {/* Stepper */}
        <PlanStepper
          currentStep={1}
          onStepClick={(num) => {
            const activePlanId = Number(editPlanId || rawPrefillData?.id || 0);
            if (num === 2)
              navigate(`/production/plans/${activePlanId || 1}/allocation`, {
                state: {
                  destinations,
                  selectedPlan: selectedPlanObj,
                  prefillData: rawPrefillData,
                  items: rawPrefillData?.items || [],
                  productionPlanId: activePlanId,
                  isEdit: Boolean(activePlanId),
                },
              });
            if (num === 3)
              navigate(`/production/plans/${activePlanId || 1}/sourcing`, {
                state: { productionPlanId: activePlanId },
              });
          }}
        />

        {prefillError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{prefillError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedPlanObj) executePrefill(selectedPlanObj);
              }}
              className="text-xs font-semibold text-rose-800 underline hover:no-underline cursor-pointer"
            >
              Retry Prefill
            </button>
          </div>
        )}

        {/* Section 1: Planning Source (Read-only Approved Menu Plan) */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Planning Source
                </h3>
                <p className="text-xs text-gray-500">
                  Sourced automatically from day-wise approved menu plan schedule.
                </p>
              </div>
            </div>

            {prefillLoading && (
              <div className="flex items-center gap-1.5 text-xs text-[#084E92] font-semibold">
                <Loader2 size={14} className="animate-spin" />
                <span>Prefilling data...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Approved Menu Plan
              </label>
              <div className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs font-semibold text-gray-800 cursor-not-allowed">
                <span className="truncate">
                  {selectedPlanObj ? getPlanLabel(selectedPlanObj) : 'Approved Day Plan'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md ml-2 shrink-0">
                  Approved
                </span>
              </div>
            </div>

            {/* Read-only Menu Plan Summary Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#084E92]" />
                  Menu Plan Summary
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={11} />
                  {summaryData.status}
                </span>
              </div>

              {prefillLoading ? (
                <div className="flex items-center justify-center py-4 text-xs text-[#084E92] gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading summary...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Outlet
                    </span>
                    <span className="font-semibold text-gray-800">
                      {summaryData.outlet}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Duration
                    </span>
                    <span className="font-semibold text-gray-800">
                      {summaryData.duration}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Menu Items
                    </span>
                    <span className="font-semibold text-gray-800">
                      {summaryData.totalMenuItems} Items
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Planned Demand
                    </span>
                    <span className="font-semibold text-[#084E92]">
                      {summaryData.plannedDemand}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Production Details */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Production Details
              </h3>
              <p className="text-xs text-gray-500">
                Define the basic details for this production plan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Expected Completion <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Production Supervisor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={supervisor}
                placeholder="Enter supervisor name"
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Raw Material Issue Store <span className="text-rose-500">*</span>
              </label>
              <select
                value={issueStore}
                onChange={(e) => setIssueStore(e.target.value)}
                disabled={loadingStores}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none disabled:bg-gray-100"
              >
                {loadingStores && <option value="">Loading stores...</option>}
                {storeOptions.length > 0 ? (
                  storeOptions.map((st) => (
                    <option key={`issue-${st.id}`} value={st.name}>
                      {st.name} {st.code ? `(${st.code})` : ''} {st.isSubUnit ? '— Sub-Unit' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Main Store">Main Store</option>
                    <option value="Central Cold Storage">Central Cold Storage</option>
                    <option value="Dry Provision Store">Dry Provision Store</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Producing Kitchen <span className="text-rose-500">*</span>
              </label>
              <select
                value={producingKitchen}
                onChange={(e) => {
                  const val = e.target.value;
                  setProducingKitchen(val);
                  const matched = kitchenOptions.find((kt) => kt.name === val || String(kt.id) === String(val));
                  if (matched) {
                    setProductionLocationId(Number(matched.id) || 0);
                  }
                }}
                disabled={loadingKitchens}
                className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none disabled:bg-gray-100"
              >
                {loadingKitchens && <option value="">Loading kitchens...</option>}
                {kitchenOptions.length > 0 ? (
                  kitchenOptions.map((kt) => (
                    <option key={`kitchen-${kt.id}`} value={kt.name}>
                      {kt.name} {kt.code ? `(${kt.code})` : ''} {kt.isSubUnit ? '— Sub-Unit' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Maruti Main Kitchen">Maruti Main Kitchen</option>
                    <option value="Central Kitchen">Central Kitchen</option>
                    <option value="City Center Kitchen">City Center Kitchen</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Notes (Optional)
            </label>
            <div className="relative">
              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional notes..."
                className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none"
              />
              <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
                {notes.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Destination Outlets (Stock-in location, dispatch mode & temp check removed as requested) */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Destination Outlets
                </h3>
                <p className="text-xs text-gray-500">
                  Configured destination distribution and stock transfers.
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Showing {destinations.length} active locations
            </span>
          </div>

          {/* Destination Outlets Table (no checkbox selection, no planned pax, no delivery time) */}
          <div className="space-y-3 pt-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Destination Outlet</th>
                    <th className="py-3 px-4">Sub-Location</th>
                    <th className="py-3 px-4 text-center">Transfer Required</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {destinations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-400 text-xs"
                      >
                        No destination outlets configured. Click &quot;Add Destination&quot; below to add one.
                      </td>
                    </tr>
                  ) : (
                    destinations.map((dest) => (
                      <tr key={dest.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {dest.outlet}
                          {dest.deliveryTime && (
                            <span className="block text-[11px] text-gray-400 font-normal mt-0.5">
                              Delivery: {dest.deliveryTime}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {dest.subLocation}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dest.transferRequired}
                              onChange={() => toggleTransferRequired(dest.id)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#084E92]" />
                          </label>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          <input
                            type="text"
                            value={dest.notes || ''}
                            placeholder="Optional notes..."
                            onChange={(e) => handleNotesChange(dest.id, e.target.value)}
                            className="w-full h-8 px-2.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-[#084E92] bg-transparent focus:bg-white text-xs text-gray-700 focus:outline-none transition"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDestination(dest.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Destination"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Destination summary & add button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                <span>Total Destinations:</span>
                <span className="text-[#084E92] font-extrabold">{destinations.length}</span>
              </div>
              <button
                type="button"
                onClick={handleAddDestination}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                Add Destination
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/plans')}
            className="px-4 py-2.5 rounded-xl border border-rose-300 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              Continue to Recipes and Allocation
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Add Destination Modal */}
        <AddDestinationModal
          isOpen={isDestinationModalOpen}
          onClose={() => setIsDestinationModalOpen(false)}
          onConfirm={handleAddDestinationConfirm}
          units={modalUnits}
          subUnits={modalSubUnits}
        />
      </div>
    </Container>
  );
};

export default CreateProductionPlan;
